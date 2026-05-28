import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CommissionStatus,
  CommissionType,
  DeliveryTaskStatus,
  FirstOrderStatus,
  OrderStatus,
  PayStatus,
  PaymentRecordStatus,
  PaymentRecordType,
  PickStatus,
  Prisma,
  ProductReviewStatus,
  ProductStatus,
  StoreStatus
} from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { DeliveryService } from "../delivery/delivery.service";
import { RiskService } from "../risk/risk.service";
import { UserService } from "../user/user.service";

interface OrderLineInput {
  skuId: string;
  quantity?: number;
}

interface QuoteRequest {
  addressId?: string;
  items: OrderLineInput[];
  riderNo?: string;
  promoterCode?: string;
}

type CreateOrderRequest = QuoteRequest;

type ConfigRecord = Record<string, unknown>;

const orderInclude = {
  user: true,
  currentStore: true,
  store: true,
  items: true,
  transferLogs: {
    include: {
      fromStore: true,
      toStore: true
    },
    orderBy: { createdAt: "desc" as const }
  },
  actionLogs: {
    orderBy: { createdAt: "desc" as const }
  },
  paymentRecords: {
    orderBy: { createdAt: "desc" as const }
  },
  deliveryTask: true
};

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type MerchantStore = NonNullable<OrderWithRelations["currentStore"]>;

const DEFAULT_MERCHANT_STORE_CODE = "FZ-TAIJIANG-001";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function decimal(value: number) {
  return money(value).toFixed(2);
}

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function endOfWeek(date = new Date()) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function dateLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function currentWeekPeriod() {
  return `${dateLabel(startOfWeek())} 至 ${dateLabel(endOfWeek())}`;
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): ConfigRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ConfigRecord;
  }
  return {};
}

function numberFromConfig(config: ConfigRecord, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}

function statusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    CREATED: "待支付",
    PAID: "已支付",
    WAITING_STORE_ACCEPT: "待接单",
    TRANSFERRED: "已转单",
    STORE_ACCEPTED: "已接单",
    READY_FOR_PICKUP: "待取货",
    RIDER_PICKED_UP: "配送中",
    DELIVERING: "配送中",
    COMPLETED: "已完成",
    EXCEPTION: "异常",
    CANCELLED: "已取消",
    REFUNDED: "已退款"
  };
  return labels[status];
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly riskService: RiskService,
    private readonly deliveryService: DeliveryService
  ) {}

  async quote(dto: QuoteRequest, userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    return this.calculateQuote(user.id, dto);
  }

  async createOrder(dto: CreateOrderRequest, userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const quote = await this.calculateQuote(user.id, dto);
    const address = await this.resolveAddress(user.id, dto.addressId);
    const orderNo = await this.generateOrderNo();

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId: user.id,
        currentStoreId: quote.store.id,
        receiverName: address.name,
        receiverPhone: address.phone,
        receiverCity: address.city,
        receiverDistrict: address.district,
        receiverAddress: address.detail,
        receiverLatitude: address.latitude,
        receiverLongitude: address.longitude,
        riderNo: dto.riderNo?.trim() || "0086",
        promoterCode: dto.promoterCode?.trim() || null,
        goodsAmount: decimal(quote.goodsAmount),
        storeSettleAmount: decimal(quote.storeSettleAmount),
        deliveryFeeCost: decimal(quote.deliveryFeeCost),
        deliveryFeeCharged: decimal(quote.deliveryFeeCharged),
        userDiscountAmount: decimal(quote.userDiscountAmount),
        storeCommission: decimal(quote.storeCommission),
        riderBonus: decimal(quote.riderBonus),
        promoterCommission: decimal(quote.promoterCommission),
        payableAmount: decimal(quote.payableAmount),
        platformIncome: decimal(quote.platformIncome),
        netProfit: decimal(quote.netProfit),
        items: {
          create: quote.items.map((item) => ({
            productId: item.productId,
            skuId: item.skuId,
            productName: item.productName,
            skuName: item.skuName,
            quantity: item.quantity,
            salePrice: decimal(item.salePrice),
            settlePrice: decimal(item.settlePrice)
          }))
        },
        actionLogs: {
          create: {
            action: "CREATE",
            fromStatus: null,
            toStatus: OrderStatus.CREATED,
            operatorType: "USER",
            operatorId: user.id,
            message: "用户提交订单",
            metadata: {
              selectedDelivery: quote.selectedDelivery,
              deliveryOptions: quote.deliveryOptions
            }
          }
        }
      },
      include: orderInclude
    });

    await this.riskService.evaluateOrder(order);

    return this.formatOrder(order);
  }

  async mockPay(orderId: string, userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const existing = await this.getOrderEntity(orderId);
    this.assertUserOwnsOrder(existing, user.id);

    if (existing.payStatus === PayStatus.PAID) {
      return this.formatOrder(existing);
    }

    if (!existing.currentStoreId) {
      throw new BadRequestException("订单未匹配到可履约门店");
    }

    const paidOrder = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: existing.id },
        include: orderInclude
      });
      if (!current) {
        throw new NotFoundException("订单不存在");
      }
      if (current.payStatus === PayStatus.PAID) {
        return current;
      }
      if (current.payStatus !== PayStatus.UNPAID || current.orderStatus !== OrderStatus.CREATED) {
        throw new BadRequestException("当前订单状态不可支付");
      }
      if (!current.currentStoreId) {
        throw new BadRequestException("订单未匹配到可履约门店");
      }

      await this.reserveStoreStock(tx, current.currentStoreId, current.items);

      const deadlineAt = new Date(Date.now() + 3 * 60 * 1000);
      await tx.storeTransferLog.create({
        data: {
          orderId: current.id,
          fromStoreId: null,
          toStoreId: current.currentStoreId,
          reason: "INITIAL_MATCH",
          transferNo: 1,
          deadlineAt
        }
      });

      if (toNumber(current.userDiscountAmount) > 0) {
        if (current.user.firstOrderStatus === FirstOrderStatus.NOT_USED) {
          await tx.user.update({
            where: { id: current.userId },
            data: { firstOrderStatus: FirstOrderStatus.USED, isNewUser: false }
          });
        } else {
          await this.markAutoUsedCoupon(tx, current.userId);
        }
      }

      const result = await tx.order.updateMany({
        where: {
          id: current.id,
          payStatus: PayStatus.UNPAID,
          orderStatus: OrderStatus.CREATED
        },
        data: {
          payStatus: PayStatus.PAID,
          orderStatus: OrderStatus.WAITING_STORE_ACCEPT,
          paidAt: new Date(),
          inventoryReservedAt: new Date()
        }
      });

      if (result.count !== 1) {
        throw new BadRequestException("订单状态已变化，请刷新后重试");
      }

      await tx.paymentRecord.create({
        data: {
          orderId: current.id,
          type: PaymentRecordType.PAYMENT,
          channel: "MOCK",
          outTradeNo: `MOCKPAY-${current.orderNo}`,
          transactionNo: `MOCKTX-${current.orderNo}`,
          amount: current.payableAmount,
          status: PaymentRecordStatus.SUCCESS,
          requestPayload: {
            mode: "mock",
            source: "miniapp"
          },
          notifyPayload: {
            paidAt: new Date().toISOString()
          },
          completedAt: new Date()
        }
      });
      await this.createCommissionRecords(tx, current);
      await this.logOrderAction(tx, {
        orderId: current.id,
        action: "MOCK_PAY",
        fromStatus: current.orderStatus,
        toStatus: OrderStatus.WAITING_STORE_ACCEPT,
        operatorType: "USER",
        operatorId: user.id,
        message: "模拟支付成功，已预占门店库存"
      });

      return tx.order.findUniqueOrThrow({
        where: { id: current.id },
        include: orderInclude
      });
    });

    return this.formatOrder(paidOrder);
  }

  async listUserOrders(userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" }
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async getOrder(id: string) {
    const order = await this.getOrderEntity(id);
    return this.formatOrder(order);
  }

  async getUserOrder(id: string, userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const order = await this.getOrderEntity(id);
    this.assertUserOwnsOrder(order, user.id);
    return this.formatOrder(order);
  }

  async listMerchantPendingOrders(storeCode?: string) {
    await this.processStoreAcceptTimeouts();
    const store = await this.resolveMerchantStore(storeCode);
    const orders = await this.prisma.order.findMany({
      where: {
        currentStoreId: store.id,
        payStatus: PayStatus.PAID,
        orderStatus: { in: [OrderStatus.WAITING_STORE_ACCEPT, OrderStatus.TRANSFERRED] }
      },
      include: orderInclude,
      orderBy: { paidAt: "desc" }
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async listMerchantOrders(storeCode?: string) {
    await this.processStoreAcceptTimeouts();
    const store = await this.resolveMerchantStore(storeCode);
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ currentStoreId: store.id }, { storeId: store.id }],
        payStatus: PayStatus.PAID
      },
      include: orderInclude,
      orderBy: { updatedAt: "desc" }
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async merchantStats(storeCode?: string) {
    const orders = await this.listMerchantOrders(storeCode);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const pendingStatuses: OrderStatus[] = [
      OrderStatus.WAITING_STORE_ACCEPT,
      OrderStatus.TRANSFERRED
    ];
    const pending = orders.filter((order) =>
      pendingStatuses.includes(order.statusCode as OrderStatus)
    ).length;
    const activeStatuses: OrderStatus[] = [
      OrderStatus.STORE_ACCEPTED,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.RIDER_PICKED_UP
    ];
    const accepted = orders.filter((order) =>
      activeStatuses.includes(order.statusCode as OrderStatus)
    ).length;
    const completed = orders.filter((order) => order.statusCode === OrderStatus.COMPLETED);
    const todayOrders = orders.filter((order) => new Date(order.createdAt) >= todayStart).length;
    const pendingSettlement = completed.reduce(
      (sum, order) => sum + order.storeSettleAmount + order.storeCommission,
      0
    );

    return {
      pending,
      todayOrders,
      waitingShipment: accepted,
      pendingSettlement: money(pendingSettlement)
    };
  }

  async getMerchantOrder(id: string, storeCode?: string) {
    const [order, store] = await Promise.all([
      this.getOrderEntity(id),
      this.resolveMerchantStore(storeCode)
    ]);
    this.assertMerchantOwnsOrder(order, store);
    return this.formatOrder(order);
  }

  async merchantAction(
    orderId: string,
    action: "accept" | "reject" | "ready" | "pickup" | "complete",
    storeCode?: string
  ) {
    const store = await this.resolveMerchantStore(storeCode);
    const order = await this.getOrderEntity(orderId);
    this.assertMerchantOwnsOrder(order, store);

    if (action === "accept") {
      return this.acceptOrder(order, store.id);
    }
    if (action === "reject") {
      return this.rejectOrder(order);
    }
    if (action === "ready") {
      this.assertOrderStatus(order, [OrderStatus.STORE_ACCEPTED], "备货完成");
      await this.transitionOrderStatus(
        order,
        [OrderStatus.STORE_ACCEPTED],
        {
          orderStatus: OrderStatus.READY_FOR_PICKUP,
          pickStatus: PickStatus.READY,
          readyAt: new Date()
        },
        {
          action: "MERCHANT_READY",
          operatorType: "MERCHANT",
          operatorId: store.id,
          message: "商家备货完成"
        }
      );
      await this.deliveryService.notifyReady(order.id);
      return this.getMerchantOrder(order.id, store.code);
    }
    if (action === "pickup") {
      this.assertOrderStatus(order, [OrderStatus.READY_FOR_PICKUP], "骑手取货");
      await this.transitionOrderStatus(
        order,
        [OrderStatus.READY_FOR_PICKUP],
        {
          orderStatus: OrderStatus.RIDER_PICKED_UP,
          pickStatus: PickStatus.PICKED_UP,
          pickedUpAt: new Date()
        },
        {
          action: "RIDER_PICKUP",
          operatorType: "MERCHANT",
          operatorId: store.id,
          message: "模拟骑手取货"
        }
      );
      await this.deliveryService.markPickedUp(order.id);
      return this.getMerchantOrder(order.id, store.code);
    }
    if (action === "complete") {
      this.assertOrderStatus(order, [OrderStatus.RIDER_PICKED_UP], "完成订单");
      await this.transitionOrderStatus(
        order,
        [OrderStatus.RIDER_PICKED_UP],
        {
          orderStatus: OrderStatus.COMPLETED,
          completedAt: new Date()
        },
        {
          action: "ORDER_COMPLETE",
          operatorType: "MERCHANT",
          operatorId: store.id,
          message: "模拟配送完成，库存预占转为消耗"
        }
      );
      await this.deliveryService.markCompleted(order.id);
      return this.getMerchantOrder(order.id, store.code);
    }

    throw new BadRequestException("未知订单操作");
  }

  async retryMerchantDelivery(orderId: string, storeCode?: string) {
    const store = await this.resolveMerchantStore(storeCode);
    const order = await this.getOrderEntity(orderId);
    this.assertMerchantOwnsOrder(order, store);

    if (order.orderStatus === OrderStatus.CREATED || order.payStatus !== PayStatus.PAID) {
      throw new BadRequestException("订单未支付，不能重发配送单");
    }
    if (!order.storeId && order.orderStatus !== OrderStatus.STORE_ACCEPTED) {
      throw new BadRequestException("订单尚未接单，不能重发配送单");
    }

    await this.deliveryService.retryDispatch(order.id, store.id);
    return this.getMerchantOrder(order.id, store.code);
  }

  async listAdminOrders() {
    await this.processStoreAcceptTimeouts();
    return this.findAdminOrders();
  }

  private async findAdminOrders() {
    const orders = await this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" }
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async financeSummary() {
    const orders = await this.prisma.order.findMany({
      where: { payStatus: PayStatus.PAID },
      include: orderInclude,
      orderBy: { createdAt: "asc" }
    });

    const totals = orders.reduce(
      (sum, order) => {
        sum.platformIncome += toNumber(order.platformIncome);
        sum.storeSettle += toNumber(order.storeSettleAmount);
        sum.deliveryCost += toNumber(order.deliveryFeeCost);
        sum.storeCommission += toNumber(order.storeCommission);
        sum.riderBonus += toNumber(order.riderBonus);
        sum.promoterCommission += toNumber(order.promoterCommission);
        sum.userDiscount += toNumber(order.userDiscountAmount);
        sum.netProfit += toNumber(order.netProfit);
        return sum;
      },
      {
        platformIncome: 0,
        storeSettle: 0,
        deliveryCost: 0,
        storeCommission: 0,
        riderBonus: 0,
        promoterCommission: 0,
        userDiscount: 0,
        netProfit: 0
      }
    );

    const totalCost =
      totals.storeSettle +
      totals.deliveryCost +
      totals.storeCommission +
      totals.riderBonus +
      totals.promoterCommission +
      totals.userDiscount;

    return {
      totalIncome: money(totals.platformIncome),
      totalCost: money(totalCost),
      totalProfit: money(totals.netProfit),
      orderCount: orders.length,
      negativeOrders: orders.filter((order) => toNumber(order.netProfit) < 0).length,
      roleCosts: [
        { role: "门店结算", amount: money(totals.storeSettle) },
        { role: "配送成本", amount: money(totals.deliveryCost) },
        { role: "门店佣金", amount: money(totals.storeCommission) },
        { role: "骑手奖励", amount: money(totals.riderBonus) },
        { role: "推广员佣金", amount: money(totals.promoterCommission) },
        { role: "用户优惠", amount: money(totals.userDiscount) }
      ],
      daily: this.buildDailyProfit(orders)
    };
  }

  async merchantReconciliation(storeCode?: string) {
    const store = await this.resolveMerchantStore(storeCode);
    const weekStart = startOfWeek();
    const orders = await this.prisma.order.findMany({
      where: {
        payStatus: PayStatus.PAID,
        orderStatus: OrderStatus.COMPLETED,
        OR: [{ storeId: store.id }, { currentStoreId: store.id }],
        completedAt: { gte: weekStart }
      },
      include: orderInclude,
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }]
    });

    const items = orders.map((order) => ({
      orderId: order.id,
      orderNo: order.orderNo,
      date: dateLabel(order.completedAt ?? order.updatedAt),
      productName: order.items[0]?.productName ?? "订单商品",
      goodsAmount: toNumber(order.goodsAmount),
      storeSettleAmount: toNumber(order.storeSettleAmount),
      storeCommission: toNumber(order.storeCommission),
      amount: money(toNumber(order.storeSettleAmount) + toNumber(order.storeCommission)),
      status: "待结算"
    }));

    const pendingAmount = money(items.reduce((sum, item) => sum + item.amount, 0));
    const goodsAmount = money(items.reduce((sum, item) => sum + item.storeSettleAmount, 0));
    const weeklyCommission = money(items.reduce((sum, item) => sum + item.storeCommission, 0));

    return {
      period: currentWeekPeriod(),
      store: {
        id: store.id,
        code: store.code,
        name: store.name
      },
      pendingAmount,
      settledAmount: 0,
      weeklyOrderCount: orders.length,
      goodsAmount,
      weeklyCommission,
      items
    };
  }

  async settlementPreview() {
    const orders = await this.prisma.order.findMany({
      where: {
        payStatus: PayStatus.PAID,
        orderStatus: OrderStatus.COMPLETED
      },
      include: orderInclude,
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }]
    });

    const period = currentWeekPeriod();
    const storeMap = new Map<string, { target: string; amount: number; orderCount: number }>();
    const riderMap = new Map<string, { target: string; amount: number; orderCount: number }>();
    const promoterMap = new Map<string, { target: string; amount: number; orderCount: number }>();

    for (const order of orders) {
      const store = order.store ?? order.currentStore;
      if (store) {
        const item = storeMap.get(store.id) ?? { target: store.name, amount: 0, orderCount: 0 };
        item.amount += toNumber(order.storeSettleAmount) + toNumber(order.storeCommission);
        item.orderCount += 1;
        storeMap.set(store.id, item);
      }

      const riderNo = order.riderNo ?? "";
      if (riderNo && toNumber(order.riderBonus) > 0) {
        const item = riderMap.get(riderNo) ?? {
          target: `骑手 ${riderNo}`,
          amount: 0,
          orderCount: 0
        };
        item.amount += toNumber(order.riderBonus);
        item.orderCount += 1;
        riderMap.set(riderNo, item);
      }

      const promoterCode = order.promoterCode ?? "";
      if (promoterCode && toNumber(order.promoterCommission) > 0) {
        const item = promoterMap.get(promoterCode) ?? {
          target: promoterCode,
          amount: 0,
          orderCount: 0
        };
        item.amount += toNumber(order.promoterCommission);
        item.orderCount += 1;
        promoterMap.set(promoterCode, item);
      }
    }

    const settlements = [
      ...Array.from(storeMap.values()).map((item) => ({
        type: "门店周结",
        target: item.target,
        period,
        amount: money(item.amount),
        orderCount: item.orderCount,
        status: "待确认"
      })),
      ...Array.from(riderMap.values()).map((item) => ({
        type: "骑手月结",
        target: item.target,
        period: dateLabel(new Date()).slice(0, 7),
        amount: money(item.amount),
        orderCount: item.orderCount,
        status: "待确认"
      })),
      ...Array.from(promoterMap.values()).map((item) => ({
        type: "推广员月结",
        target: item.target,
        period: dateLabel(new Date()).slice(0, 7),
        amount: money(item.amount),
        orderCount: item.orderCount,
        status: "待确认"
      }))
    ].sort((left, right) => right.amount - left.amount);

    const storePendingAmount = money(
      Array.from(storeMap.values()).reduce((sum, item) => sum + item.amount, 0)
    );
    const riderPendingAmount = money(
      Array.from(riderMap.values()).reduce((sum, item) => sum + item.amount, 0)
    );
    const promoterPendingAmount = money(
      Array.from(promoterMap.values()).reduce((sum, item) => sum + item.amount, 0)
    );

    return {
      period,
      storePendingAmount,
      riderPendingAmount,
      promoterPendingAmount,
      totalPendingAmount: money(storePendingAmount + riderPendingAmount + promoterPendingAmount),
      completedOrderCount: orders.length,
      settlements
    };
  }

  async processStoreAcceptTimeouts(now = new Date()) {
    const candidates = await this.prisma.order.findMany({
      where: {
        currentStoreId: { not: null },
        payStatus: PayStatus.PAID,
        orderStatus: { in: [OrderStatus.WAITING_STORE_ACCEPT, OrderStatus.TRANSFERRED] }
      },
      include: orderInclude,
      orderBy: { paidAt: "asc" }
    });

    const processed = [];
    for (const order of candidates) {
      const latestTransfer = order.transferLogs[0];
      if (!latestTransfer?.deadlineAt || latestTransfer.deadlineAt > now) {
        continue;
      }
      processed.push(await this.transferTimedOutOrder(order));
    }

    return {
      processed: processed.length,
      orders: processed
    };
  }

  async dashboard() {
    await this.processStoreAcceptTimeouts();
    const [orders, finance] = await Promise.all([this.findAdminOrders(), this.financeSummary()]);
    const stores = await this.prisma.store.findMany({ orderBy: { code: "asc" } });
    const productSales = await this.prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    });

    return {
      todayOrders: orders.length,
      todaySales: finance.totalIncome,
      todayProfit: finance.totalProfit,
      negativeOrders: finance.negativeOrders,
      pendingOrders: orders.filter((order) => order.statusCode === OrderStatus.WAITING_STORE_ACCEPT)
        .length,
      orderTrend: this.trendFromOrders(orders),
      profitTrend: finance.daily.map((item) => item.profit),
      productRanks: productSales.map((item, index) => ({
        rank: index + 1,
        name: item.productName,
        sales: item._sum.quantity ?? 0
      })),
      recentOrders: orders.slice(0, 5),
      storeRanks: stores.map((store) => ({
        name: store.name,
        orders: orders.filter(
          (order) => order.currentStoreId === store.id || order.storeId === store.id
        ).length,
        acceptRate: "100%"
      }))
    };
  }

  private async calculateQuote(userId: string, dto: QuoteRequest) {
    const items = this.normalizeItems(dto.items);
    const matchedStore = await this.findMatchedStore(items, []);
    const address = await this.resolveAddress(userId, dto.addressId);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const deliveryConfig = await this.systemConfig("delivery", {
      userDeliveryFee: 4,
      platformDeliveryCost: 4,
      freeDeliveryThreshold: 19
    });
    const commissionConfig = await this.systemConfig("commission", {
      storeFixedCommission: 1,
      riderBaseBonus: 1.5,
      promoterCommission: 2
    });
    const orderDiscount = await this.promotionConfig("ORDER_DISCOUNT");
    const newUserDiscount = await this.promotionConfig("NEW_USER_FIRST_ORDER");
    const firstOrderDiscountAmount = this.firstOrderDiscount(user, newUserDiscount);
    const couponDiscount =
      firstOrderDiscountAmount > 0 ? 0 : await this.bestUserCouponDiscount(userId);

    const quoteItems = matchedStore.items.map((item) => ({
      ...item,
      lineAmount: money(item.salePrice * item.quantity),
      lineSettleAmount: money(item.settlePrice * item.quantity)
    }));
    const goodsAmount = money(quoteItems.reduce((sum, item) => sum + item.lineAmount, 0));
    const storeSettleAmount = money(
      quoteItems.reduce((sum, item) => sum + item.lineSettleAmount, 0)
    );
    const userDeliveryFee = numberFromConfig(deliveryConfig, "userDeliveryFee", 4);
    const freeDeliveryThreshold = numberFromConfig(deliveryConfig, "freeDeliveryThreshold", 19);
    const deliveryFeeCharged = goodsAmount >= freeDeliveryThreshold ? 0 : userDeliveryFee;
    const fallbackDeliveryFeeCost = numberFromConfig(deliveryConfig, "platformDeliveryCost", 4);
    const deliveryQuote = await this.deliveryService.quoteDelivery({
      storeId: matchedStore.store.id,
      goodsAmount,
      pickup: {
        name: matchedStore.store.name,
        phone: matchedStore.store.phone ?? "",
        address: matchedStore.store.address,
        latitude: matchedStore.store.latitude ? toNumber(matchedStore.store.latitude) : null,
        longitude: matchedStore.store.longitude ? toNumber(matchedStore.store.longitude) : null
      },
      receiver: {
        name: address.name,
        phone: address.phone,
        city: address.city,
        district: address.district,
        address: `${address.city}${address.district}${address.detail}`,
        latitude: address.latitude ? toNumber(address.latitude) : null,
        longitude: address.longitude ? toNumber(address.longitude) : null
      },
      items: quoteItems.map((item) => ({
        name: item.productName,
        skuName: item.skuName,
        quantity: item.quantity
      })),
      expectedFee: fallbackDeliveryFeeCost,
      riderNo: dto.riderNo?.trim() || "0086"
    });
    const deliveryFeeCost = deliveryQuote.selected?.feeCost ?? fallbackDeliveryFeeCost;
    const storeCommission = numberFromConfig(commissionConfig, "storeFixedCommission", 1);
    const riderBonus = numberFromConfig(commissionConfig, "riderBaseBonus", 1.5);
    const promoterCommission = dto.promoterCode
      ? numberFromConfig(commissionConfig, "promoterCommission", 2)
      : 0;
    const userDiscountAmount = money(
      firstOrderDiscountAmount + this.fullReduction(goodsAmount, orderDiscount) + couponDiscount
    );
    const payableAmount = money(Math.max(0, goodsAmount + deliveryFeeCharged - userDiscountAmount));
    const platformIncome = money(goodsAmount + deliveryFeeCharged);
    const netProfit = money(
      platformIncome -
        storeSettleAmount -
        deliveryFeeCost -
        storeCommission -
        riderBonus -
        promoterCommission -
        userDiscountAmount
    );

    return {
      store: matchedStore.store,
      items: quoteItems,
      goodsAmount,
      storeSettleAmount,
      deliveryFeeCost,
      deliveryFeeCharged,
      userDiscountAmount,
      couponDiscount,
      storeCommission,
      riderBonus,
      promoterCommission,
      payableAmount,
      platformIncome,
      netProfit,
      selectedDelivery: deliveryQuote.selected
        ? {
            ...deliveryQuote.selected,
            userFee: deliveryFeeCharged
          }
        : null,
      deliveryOptions: deliveryQuote.options.map((option) => ({
        ...option,
        userFee: option.available ? deliveryFeeCharged : 0
      }))
    };
  }

  private normalizeItems(items: OrderLineInput[] | undefined) {
    if (!items?.length) {
      throw new BadRequestException("订单商品不能为空");
    }

    return items.map((item) => ({
      skuId: item.skuId,
      quantity: Math.max(1, Number(item.quantity ?? 1))
    }));
  }

  private async findMatchedStore(
    items: { skuId: string; quantity: number }[],
    excludedStoreIds: string[]
  ) {
    const stores = await this.prisma.store.findMany({
      where: {
        id: { notIn: excludedStoreIds },
        status: StoreStatus.OPEN,
        acceptOrderSwitch: true
      },
      include: {
        storeSkus: {
          where: {
            skuId: { in: items.map((item) => item.skuId) },
            sku: {
              status: ProductStatus.ON_SALE,
              product: {
                status: ProductStatus.ON_SALE,
                reviewStatus: ProductReviewStatus.APPROVED
              }
            }
          },
          include: {
            sku: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { code: "desc" }
    });

    for (const store of stores) {
      const matchedItems = items.map((item) => {
        const storeSku = store.storeSkus.find((candidate) => candidate.skuId === item.skuId);
        if (!storeSku || storeSku.stock < item.quantity) {
          return null;
        }
        return {
          skuId: storeSku.skuId,
          productId: storeSku.sku.productId,
          productName: storeSku.sku.product.name,
          skuName: storeSku.sku.name,
          quantity: item.quantity,
          salePrice: toNumber(storeSku.sku.salePrice),
          settlePrice: toNumber(storeSku.settlePrice)
        };
      });

      if (matchedItems.every(Boolean)) {
        return {
          store,
          items: matchedItems.filter((item): item is NonNullable<typeof item> => Boolean(item))
        };
      }
    }

    throw new BadRequestException("暂无可履约门店，请稍后重试");
  }

  private async resolveAddress(userId: string, addressId?: string) {
    const address = addressId
      ? await this.prisma.address.findFirst({ where: { id: addressId, userId } })
      : await this.prisma.address.findFirst({
          where: { userId },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
        });

    if (!address) {
      throw new BadRequestException("请先添加收货地址");
    }

    if (address.city !== "福州市") {
      throw new BadRequestException("金闪送 MVP 仅支持福州同城订单");
    }

    return address;
  }

  private async resolveMerchantStore(storeCode?: string) {
    const requestedCode = (storeCode || DEFAULT_MERCHANT_STORE_CODE).trim();
    const requestedStore = await this.prisma.store.findUnique({
      where: { code: requestedCode }
    });

    if (requestedStore) {
      return requestedStore;
    }

    const store = await this.prisma.store.findFirst({
      where: { status: StoreStatus.OPEN },
      orderBy: { code: "desc" }
    });

    if (!store) {
      throw new BadRequestException("暂无可用商家门店");
    }

    return store;
  }

  private assertMerchantOwnsOrder(order: OrderWithRelations, store: MerchantStore) {
    if (order.currentStoreId === store.id || order.storeId === store.id) {
      return;
    }

    throw new ForbiddenException("无权查看或操作非本门店订单");
  }

  private assertUserOwnsOrder(order: OrderWithRelations, userId: string) {
    if (order.userId === userId) {
      return;
    }

    throw new ForbiddenException("无权查看或操作非本人订单");
  }

  private async getOrderEntity(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderNo: id }] },
      include: orderInclude
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    return order;
  }

  private async acceptOrder(order: OrderWithRelations, storeId: string) {
    const acceptableStatuses: OrderStatus[] = [
      OrderStatus.WAITING_STORE_ACCEPT,
      OrderStatus.TRANSFERRED
    ];
    if (!acceptableStatuses.includes(order.orderStatus)) {
      throw new BadRequestException("当前订单状态不可接单");
    }

    if (!order.currentStoreId) {
      throw new BadRequestException("订单未匹配到门店");
    }

    if (order.currentStoreId !== storeId) {
      throw new ForbiddenException("当前订单不属于本门店待接单");
    }

    const accepted = await this.prisma.$transaction(async (tx) => {
      if (!order.inventoryReservedAt) {
        await this.reserveStoreStock(tx, order.currentStoreId!, order.items);
      }

      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          currentStoreId: storeId,
          orderStatus: { in: acceptableStatuses }
        },
        data: {
          storeId: order.currentStoreId,
          orderStatus: OrderStatus.STORE_ACCEPTED,
          acceptedAt: new Date(),
          inventoryReservedAt: order.inventoryReservedAt ?? new Date()
        }
      });

      if (result.count !== 1) {
        throw new BadRequestException("订单状态已变化，请刷新后重试");
      }

      await tx.commissionRecord.updateMany({
        where: { orderId: order.id, type: CommissionType.STORE },
        data: { targetId: storeId }
      });
      await this.logOrderAction(tx, {
        orderId: order.id,
        action: "MERCHANT_ACCEPT",
        fromStatus: order.orderStatus,
        toStatus: OrderStatus.STORE_ACCEPTED,
        operatorType: "MERCHANT",
        operatorId: storeId,
        message: order.inventoryReservedAt ? "商家接单" : "商家接单并补预占库存"
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude
      });
    });

    await this.deliveryService.dispatchOrder(accepted.id, storeId);

    const refreshed = await this.getOrderEntity(accepted.id);
    return this.formatOrder(refreshed);
  }

  private async rejectOrder(order: OrderWithRelations) {
    const rejectableStatuses: OrderStatus[] = [
      OrderStatus.WAITING_STORE_ACCEPT,
      OrderStatus.TRANSFERRED
    ];
    if (!rejectableStatuses.includes(order.orderStatus)) {
      throw new BadRequestException("当前订单状态不可拒单");
    }

    const flowConfig = await this.systemConfig("order_flow", {
      rejectRefundThreshold: 2,
      storeAcceptTimeoutMinutes: 3
    });
    const nextRejectCount = order.rejectCount + 1;
    const rejectRefundThreshold = numberFromConfig(flowConfig, "rejectRefundThreshold", 2);
    const timeoutMinutes = numberFromConfig(flowConfig, "storeAcceptTimeoutMinutes", 3);

    if (nextRejectCount >= rejectRefundThreshold) {
      return this.refundOrder(
        order,
        {
          rejectCount: nextRejectCount,
          currentStoreId: null
        },
        {
          action: "STORE_REJECT_REFUND",
          operatorType: "MERCHANT",
          operatorId: order.currentStoreId ?? undefined,
          message: "连续拒单达到阈值，系统模拟退款"
        }
      );
    }

    const excludedStoreIds = [
      ...new Set(
        [order.currentStoreId, ...order.transferLogs.map((log) => log.toStoreId)].filter(
          (id): id is string => Boolean(id)
        )
      )
    ];

    try {
      const nextStore = await this.findMatchedStore(
        order.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
        excludedStoreIds
      );
      const storeSettleAmount = money(
        nextStore.items.reduce((sum, item) => sum + item.settlePrice * item.quantity, 0)
      );
      const netProfit = money(
        toNumber(order.platformIncome) -
          storeSettleAmount -
          toNumber(order.deliveryFeeCost) -
          toNumber(order.storeCommission) -
          toNumber(order.riderBonus) -
          toNumber(order.promoterCommission) -
          toNumber(order.userDiscountAmount)
      );

      const transferred = await this.prisma.$transaction(async (tx) => {
        if (order.inventoryReservedAt && order.currentStoreId) {
          await this.releaseStoreStock(tx, order.currentStoreId, order.items);
        }
        await this.reserveStoreStock(tx, nextStore.store.id, order.items);

        await tx.storeTransferLog.create({
          data: {
            orderId: order.id,
            fromStoreId: order.currentStoreId,
            toStoreId: nextStore.store.id,
            reason: "STORE_REJECTED",
            transferNo: order.transferCount + 2,
            deadlineAt: new Date(Date.now() + timeoutMinutes * 60 * 1000)
          }
        });

        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            currentStoreId: order.currentStoreId,
            orderStatus: { in: rejectableStatuses }
          },
          data: {
            currentStoreId: nextStore.store.id,
            orderStatus: OrderStatus.TRANSFERRED,
            transferCount: order.transferCount + 1,
            rejectCount: nextRejectCount,
            storeSettleAmount: decimal(storeSettleAmount),
            netProfit: decimal(netProfit),
            inventoryReservedAt: new Date()
          }
        });

        if (result.count !== 1) {
          throw new BadRequestException("订单状态已变化，请刷新后重试");
        }

        await tx.commissionRecord.updateMany({
          where: { orderId: order.id, type: CommissionType.STORE },
          data: { targetId: nextStore.store.id }
        });
        await this.logOrderAction(tx, {
          orderId: order.id,
          action: "STORE_REJECT_TRANSFER",
          fromStatus: order.orderStatus,
          toStatus: OrderStatus.TRANSFERRED,
          operatorType: "MERCHANT",
          operatorId: order.currentStoreId ?? undefined,
          message: "商家拒单，系统释放原门店库存并转给下一家门店",
          metadata: { toStoreId: nextStore.store.id, rejectCount: nextRejectCount }
        });

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: orderInclude
        });
      });

      return this.formatOrder(transferred);
    } catch {
      return this.refundOrder(
        order,
        {
          rejectCount: nextRejectCount,
          currentStoreId: null
        },
        {
          action: "STORE_REJECT_NO_STORE_REFUND",
          operatorType: "MERCHANT",
          operatorId: order.currentStoreId ?? undefined,
          message: "商家拒单后无可接门店，系统模拟退款"
        }
      );
    }
  }

  private async transitionOrderStatus(
    order: OrderWithRelations,
    expectedStatuses: OrderStatus[],
    data: Prisma.OrderUncheckedUpdateInput,
    log: {
      action: string;
      operatorType: string;
      operatorId?: string;
      message?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    const toStatus =
      typeof data.orderStatus === "string" ? (data.orderStatus as OrderStatus) : order.orderStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          orderStatus: { in: expectedStatuses }
        },
        data
      });

      if (result.count !== 1) {
        throw new BadRequestException("订单状态已变化，请刷新后重试");
      }

      await this.logOrderAction(tx, {
        orderId: order.id,
        action: log.action,
        fromStatus: order.orderStatus,
        toStatus,
        operatorType: log.operatorType,
        operatorId: log.operatorId,
        message: log.message,
        metadata: log.metadata
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude
      });
    });

    return this.formatOrder(updated);
  }

  private async refundOrder(
    order: OrderWithRelations,
    data: Prisma.OrderUncheckedUpdateInput,
    log: {
      action: string;
      operatorType: string;
      operatorId?: string;
      message?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    const refunded = await this.prisma.$transaction(async (tx) => {
      if (order.inventoryReservedAt && order.currentStoreId) {
        await this.releaseStoreStock(tx, order.currentStoreId, order.items);
      }

      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          payStatus: PayStatus.PAID,
          orderStatus: {
            in: [OrderStatus.WAITING_STORE_ACCEPT, OrderStatus.TRANSFERRED]
          }
        },
        data: {
          ...data,
          orderStatus: OrderStatus.REFUNDED,
          payStatus: PayStatus.REFUNDED,
          refundedAt: new Date(),
          inventoryReservedAt: null
        }
      });

      if (result.count !== 1) {
        throw new BadRequestException("订单状态已变化，请刷新后重试");
      }

      await tx.paymentRecord.create({
        data: {
          orderId: order.id,
          type: PaymentRecordType.REFUND,
          channel: "MOCK",
          outTradeNo: `MOCKREFUND-${order.orderNo}`,
          transactionNo: `MOCKRFTX-${order.orderNo}`,
          amount: order.payableAmount,
          status: PaymentRecordStatus.SUCCESS,
          requestPayload: {
            mode: "mock",
            reason: log.action
          },
          notifyPayload: {
            refundedAt: new Date().toISOString()
          },
          completedAt: new Date()
        }
      });
      await tx.commissionRecord.updateMany({
        where: { orderId: order.id },
        data: { status: CommissionStatus.CANCELLED }
      });
      await this.logOrderAction(tx, {
        orderId: order.id,
        action: log.action,
        fromStatus: order.orderStatus,
        toStatus: OrderStatus.REFUNDED,
        operatorType: log.operatorType,
        operatorId: log.operatorId,
        message: log.message,
        metadata: log.metadata
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude
      });
    });

    return this.formatOrder(refunded);
  }

  private async transferTimedOutOrder(order: OrderWithRelations) {
    const flowConfig = await this.systemConfig("order_flow", {
      storeAcceptTimeoutMinutes: 3
    });
    const timeoutMinutes = numberFromConfig(flowConfig, "storeAcceptTimeoutMinutes", 3);
    const excludedStoreIds = [
      ...new Set(
        [order.currentStoreId, ...order.transferLogs.map((log) => log.toStoreId)].filter(
          (id): id is string => Boolean(id)
        )
      )
    ];

    try {
      const nextStore = await this.findMatchedStore(
        order.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
        excludedStoreIds
      );
      const storeSettleAmount = money(
        nextStore.items.reduce((sum, item) => sum + item.settlePrice * item.quantity, 0)
      );
      const netProfit = money(
        toNumber(order.platformIncome) -
          storeSettleAmount -
          toNumber(order.deliveryFeeCost) -
          toNumber(order.storeCommission) -
          toNumber(order.riderBonus) -
          toNumber(order.promoterCommission) -
          toNumber(order.userDiscountAmount)
      );

      const transferred = await this.prisma.$transaction(async (tx) => {
        if (order.inventoryReservedAt && order.currentStoreId) {
          await this.releaseStoreStock(tx, order.currentStoreId, order.items);
        }
        await this.reserveStoreStock(tx, nextStore.store.id, order.items);

        await tx.storeTransferLog.create({
          data: {
            orderId: order.id,
            fromStoreId: order.currentStoreId,
            toStoreId: nextStore.store.id,
            reason: "STORE_ACCEPT_TIMEOUT",
            transferNo: order.transferCount + 2,
            deadlineAt: new Date(Date.now() + timeoutMinutes * 60 * 1000)
          }
        });

        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            currentStoreId: order.currentStoreId,
            orderStatus: { in: [OrderStatus.WAITING_STORE_ACCEPT, OrderStatus.TRANSFERRED] }
          },
          data: {
            currentStoreId: nextStore.store.id,
            orderStatus: OrderStatus.TRANSFERRED,
            transferCount: order.transferCount + 1,
            storeSettleAmount: decimal(storeSettleAmount),
            netProfit: decimal(netProfit),
            inventoryReservedAt: new Date()
          }
        });

        if (result.count !== 1) {
          throw new BadRequestException("订单状态已变化，请刷新后重试");
        }

        await tx.commissionRecord.updateMany({
          where: { orderId: order.id, type: CommissionType.STORE },
          data: { targetId: nextStore.store.id }
        });
        await this.logOrderAction(tx, {
          orderId: order.id,
          action: "STORE_TIMEOUT_TRANSFER",
          fromStatus: order.orderStatus,
          toStatus: OrderStatus.TRANSFERRED,
          operatorType: "SYSTEM",
          operatorId: order.currentStoreId ?? undefined,
          message: "门店超时未接单，系统释放原门店库存并自动转单",
          metadata: { toStoreId: nextStore.store.id }
        });

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: orderInclude
        });
      });

      return this.formatOrder(transferred);
    } catch {
      return this.refundOrder(
        order,
        {
          currentStoreId: null
        },
        {
          action: "STORE_TIMEOUT_NO_STORE_REFUND",
          operatorType: "SYSTEM",
          operatorId: order.currentStoreId ?? undefined,
          message: "门店超时且无可接门店，系统模拟退款"
        }
      );
    }
  }

  private async reserveStoreStock(
    tx: Prisma.TransactionClient,
    storeId: string,
    items: OrderWithRelations["items"]
  ) {
    for (const item of items) {
      const result = await tx.storeSku.updateMany({
        where: {
          storeId,
          skuId: item.skuId,
          stock: { gte: item.quantity }
        },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });

      if (result.count !== 1) {
        throw new BadRequestException("门店库存不足，请重新下单");
      }
    }
  }

  private async releaseStoreStock(
    tx: Prisma.TransactionClient,
    storeId: string,
    items: OrderWithRelations["items"]
  ) {
    for (const item of items) {
      await tx.storeSku.updateMany({
        where: {
          storeId,
          skuId: item.skuId
        },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      });
    }
  }

  private async logOrderAction(
    tx: Prisma.TransactionClient,
    data: {
      orderId: string;
      action: string;
      fromStatus?: OrderStatus | null;
      toStatus?: OrderStatus | null;
      operatorType: string;
      operatorId?: string;
      message?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    await tx.orderActionLog.create({
      data: {
        orderId: data.orderId,
        action: data.action,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus ?? null,
        operatorType: data.operatorType,
        operatorId: data.operatorId ?? null,
        message: data.message ?? null,
        metadata: data.metadata ?? undefined
      }
    });
  }

  private assertOrderStatus(
    order: OrderWithRelations,
    expected: OrderStatus[],
    actionLabel: string
  ) {
    if (!expected.includes(order.orderStatus)) {
      throw new BadRequestException(`当前订单状态不可${actionLabel}`);
    }
  }

  private async bestUserCouponDiscount(userId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        userId,
        status: "UNUSED",
        expiredAt: {
          gt: new Date()
        }
      },
      orderBy: [{ amount: "desc" }, { expiredAt: "asc" }]
    });

    return coupon ? toNumber(coupon.amount) : 0;
  }

  private async markAutoUsedCoupon(tx: Prisma.TransactionClient, userId: string) {
    const coupon = await tx.coupon.findFirst({
      where: {
        userId,
        status: "UNUSED",
        expiredAt: {
          gt: new Date()
        }
      },
      orderBy: [{ amount: "desc" }, { expiredAt: "asc" }]
    });

    if (!coupon) {
      return;
    }

    await tx.coupon.update({
      where: { id: coupon.id },
      data: {
        status: "USED",
        usedAt: new Date()
      }
    });
  }

  private async createCommissionRecords(tx: Prisma.TransactionClient, order: OrderWithRelations) {
    const records: Prisma.CommissionRecordCreateManyInput[] = [];
    if (order.currentStoreId && toNumber(order.storeCommission) > 0) {
      records.push({
        orderId: order.id,
        type: CommissionType.STORE,
        targetId: order.currentStoreId,
        amount: order.storeCommission,
        status: CommissionStatus.PENDING,
        triggerNode: "PAID"
      });
    }
    if (order.riderNo && toNumber(order.riderBonus) > 0) {
      records.push({
        orderId: order.id,
        type: CommissionType.RIDER,
        targetId: order.riderNo,
        amount: order.riderBonus,
        status: CommissionStatus.PENDING,
        triggerNode: "PAID"
      });
    }
    if (order.promoterCode && toNumber(order.promoterCommission) > 0) {
      records.push({
        orderId: order.id,
        type: CommissionType.PROMOTER,
        targetId: order.promoterCode,
        amount: order.promoterCommission,
        status: CommissionStatus.PENDING,
        triggerNode: "PAID"
      });
    }

    if (records.length > 0) {
      await tx.commissionRecord.createMany({ data: records });
    }
  }

  private async systemConfig(key: string, fallback: ConfigRecord) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return { ...fallback, ...jsonRecord(config?.value) };
  }

  private async promotionConfig(code: string) {
    const config = await this.prisma.promotionConfig.findUnique({ where: { code } });
    if (!config?.enabled) {
      return {};
    }
    return jsonRecord(config.config);
  }

  private firstOrderDiscount(
    user: { isNewUser: boolean; firstOrderStatus: FirstOrderStatus },
    config: ConfigRecord
  ) {
    if (!user.isNewUser || user.firstOrderStatus !== FirstOrderStatus.NOT_USED) {
      return 0;
    }
    return numberFromConfig(config, "amount", 5);
  }

  private fullReduction(goodsAmount: number, config: ConfigRecord) {
    const tiers = Array.isArray(config.tiers) ? config.tiers : [];
    return tiers.reduce((maxDiscount, tier) => {
      if (!tier || typeof tier !== "object") {
        return maxDiscount;
      }
      const record = tier as ConfigRecord;
      const threshold = numberFromConfig(record, "threshold", 0);
      const discount = numberFromConfig(record, "discount", 0);
      return goodsAmount >= threshold ? Math.max(maxDiscount, discount) : maxDiscount;
    }, 0);
  }

  private async generateOrderNo() {
    const now = new Date();
    const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;

    for (let index = 0; index < 5; index += 1) {
      const orderNo = `JS${day}${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
      const exists = await this.prisma.order.findUnique({ where: { orderNo } });
      if (!exists) {
        return orderNo;
      }
    }

    throw new BadRequestException("订单号生成失败，请重试");
  }

  private buildDailyProfit(orders: OrderWithRelations[]) {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(5, 10);
      return { date: key, income: 0, profit: 0 };
    });

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(5, 10);
      const day = days.find((item) => item.date === key);
      if (day) {
        day.income = money(day.income + toNumber(order.platformIncome));
        day.profit = money(day.profit + toNumber(order.netProfit));
      }
    }

    return days;
  }

  private trendFromOrders(orders: Awaited<ReturnType<OrderService["listAdminOrders"]>>) {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return { key: date.toISOString().slice(5, 10), count: 0 };
    });

    for (const order of orders) {
      const key = new Date(order.createdAt).toISOString().slice(5, 10);
      const day = days.find((item) => item.key === key);
      if (day) {
        day.count += 1;
      }
    }

    return days.map((day) => day.count);
  }

  private formatOrder(order: OrderWithRelations) {
    const firstItem = order.items[0];
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const store = order.currentStore ?? order.store;
    const latestTransfer = order.transferLogs[0];
    const countdownSeconds = latestTransfer?.deadlineAt
      ? Math.max(0, Math.floor((latestTransfer.deadlineAt.getTime() - Date.now()) / 1000))
      : 0;

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: statusLabel(order.orderStatus),
      statusCode: order.orderStatus,
      payStatus: order.payStatus,
      pickStatus: order.pickStatus,
      customer: order.receiverName,
      user: order.receiverName,
      phone: maskPhone(order.receiverPhone),
      receiverPhone: order.receiverPhone,
      receiver: `${order.receiverName} ${maskPhone(order.receiverPhone)}`,
      address: `${order.receiverCity}${order.receiverDistrict}${order.receiverAddress}`,
      productName: firstItem?.productName ?? "订单商品",
      skuName: firstItem?.skuName ?? "",
      quantity,
      goodsAmount: toNumber(order.goodsAmount),
      deliveryFeeCharged: toNumber(order.deliveryFeeCharged),
      deliveryFeeCost: toNumber(order.deliveryFeeCost),
      userDiscountAmount: toNumber(order.userDiscountAmount),
      storeSettleAmount: toNumber(order.storeSettleAmount),
      storeCommission: toNumber(order.storeCommission),
      riderBonus: toNumber(order.riderBonus),
      promoterCommission: toNumber(order.promoterCommission),
      platformIncome: toNumber(order.platformIncome),
      payableAmount: toNumber(order.payableAmount),
      amount: toNumber(order.payableAmount),
      netProfit: toNumber(order.netProfit),
      transferCount: order.transferCount,
      rejectCount: order.rejectCount,
      storeId: order.storeId,
      currentStoreId: order.currentStoreId,
      storeName: store?.name ?? "待匹配门店",
      storePhone: store?.phone ?? "",
      storeAddress: store?.address ?? "",
      riderNo: order.riderNo ?? "0086",
      deliveryTask: order.deliveryTask
        ? {
            id: order.deliveryTask.id,
            provider: order.deliveryTask.provider,
            providerName: this.deliveryProviderLabel(order.deliveryTask.provider),
            providerOrderNo: order.deliveryTask.providerOrderNo,
            status: order.deliveryTask.status,
            statusText: this.deliveryStatusLabel(order.deliveryTask.status),
            riderNo: order.deliveryTask.riderNo,
            riderName: order.deliveryTask.riderName,
            riderPhone: order.deliveryTask.riderPhone,
            fee: toNumber(order.deliveryTask.fee),
            distanceKm: order.deliveryTask.distanceKm
              ? toNumber(order.deliveryTask.distanceKm)
              : null,
            failReason: order.deliveryTask.failReason,
            dispatchedAt: order.deliveryTask.dispatchedAt?.toISOString() ?? null,
            acceptedAt: order.deliveryTask.acceptedAt?.toISOString() ?? null,
            readyNotifiedAt: order.deliveryTask.readyNotifiedAt?.toISOString() ?? null,
            pickedUpAt: order.deliveryTask.pickedUpAt?.toISOString() ?? null,
            completedAt: order.deliveryTask.completedAt?.toISOString() ?? null,
            cancelledAt: order.deliveryTask.cancelledAt?.toISOString() ?? null
          }
        : null,
      promoterCode: order.promoterCode,
      distance: order.receiverDistrict.includes("仓山") ? "2.4km" : "1.2km",
      countdownSeconds,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      acceptedAt: order.acceptedAt?.toISOString() ?? null,
      readyAt: order.readyAt?.toISOString() ?? null,
      pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      refundedAt: order.refundedAt?.toISOString() ?? null,
      inventoryReservedAt: order.inventoryReservedAt?.toISOString() ?? null,
      eta: order.orderStatus === OrderStatus.COMPLETED ? "已送达" : "15:30前",
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        skuId: item.skuId,
        productName: item.productName,
        skuName: item.skuName,
        quantity: item.quantity,
        salePrice: toNumber(item.salePrice),
        settlePrice: toNumber(item.settlePrice)
      })),
      logs: order.actionLogs.map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        operatorType: log.operatorType,
        operatorId: log.operatorId,
        message: log.message,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString()
      })),
      paymentRecords: order.paymentRecords.map((record) => ({
        id: record.id,
        type: record.type,
        channel: record.channel,
        outTradeNo: record.outTradeNo,
        transactionNo: record.transactionNo,
        amount: toNumber(record.amount),
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        completedAt: record.completedAt?.toISOString() ?? null
      }))
    };
  }

  private deliveryStatusLabel(status: DeliveryTaskStatus) {
    const labels = {
      PENDING: "待发单",
      DISPATCHING: "呼叫中",
      ACCEPTED: "骑手已接单",
      READY_FOR_PICKUP: "已通知取货",
      PICKED_UP: "已取货",
      DELIVERING: "配送中",
      COMPLETED: "已送达",
      CANCELLED: "已取消",
      FAILED: "呼叫失败"
    } as const;
    return labels[status];
  }

  private deliveryProviderLabel(provider: string) {
    const labels: Record<string, string> = {
      MEITUAN: "美团配送",
      FENGNIAO: "蜂鸟即配",
      UU: "UU跑腿",
      SF_INTRA_CITY: "顺丰同城",
      MOCK_AGGREGATOR: "Mock聚合配送"
    };
    return labels[provider] ?? provider;
  }
}
