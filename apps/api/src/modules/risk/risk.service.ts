import { Injectable } from "@nestjs/common";
import {
  Order,
  Prisma,
  RiskEvent,
  RiskEventStatus,
  RiskLevel,
  RiskTargetType
} from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

type OrderRiskInput = Pick<
  Order,
  | "id"
  | "orderNo"
  | "userId"
  | "riderNo"
  | "promoterCode"
  | "receiverCity"
  | "receiverDistrict"
  | "receiverAddress"
  | "netProfit"
  | "createdAt"
>;

type ConfigRecord = Record<string, unknown>;

function toNumber(value: unknown) {
  return Number(value ?? 0);
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

function startOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateOrder(order: OrderRiskInput) {
    await Promise.all([
      this.checkLossThreshold(order),
      this.checkSameAddressFrequency(order),
      this.checkRiderFrequency(order),
      this.checkPromoterFrequency(order)
    ]);
  }

  async listAdminRiskGroups() {
    const events = await this.prisma.riskEvent.findMany({
      where: { status: RiskEventStatus.OPEN },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const groups = {
      users: [],
      orders: [],
      riders: [],
      promoters: []
    } as Record<
      "users" | "orders" | "riders" | "promoters",
      ReturnType<RiskService["formatEvent"]>[]
    >;

    for (const event of events) {
      const formatted = this.formatEvent(event);
      if (event.targetType === RiskTargetType.USER) {
        groups.users.push(formatted);
      }
      if (event.targetType === RiskTargetType.ORDER) {
        groups.orders.push(formatted);
      }
      if (event.targetType === RiskTargetType.RIDER) {
        groups.riders.push(formatted);
      }
      if (event.targetType === RiskTargetType.PROMOTER) {
        groups.promoters.push(formatted);
      }
    }

    return groups;
  }

  private async checkLossThreshold(order: OrderRiskInput) {
    const financeConfig = await this.systemConfig("finance", { lossWarningThreshold: 0 });
    const threshold = numberFromConfig(financeConfig, "lossWarningThreshold", 0);
    const netProfit = toNumber(order.netProfit);

    if (netProfit >= threshold) {
      return;
    }

    await this.createOpenEventOnce({
      targetType: RiskTargetType.ORDER,
      targetId: order.orderNo,
      userId: order.userId,
      orderId: order.id,
      type: "LOSS_THRESHOLD",
      level: RiskLevel.HIGH,
      reason: `单单净利润 ${netProfit.toFixed(2)} 元，低于阈值 ${threshold.toFixed(2)} 元`
    });
  }

  private async checkSameAddressFrequency(order: OrderRiskInput) {
    const sameAddressCount = await this.prisma.order.count({
      where: {
        userId: order.userId,
        receiverCity: order.receiverCity,
        receiverDistrict: order.receiverDistrict,
        receiverAddress: order.receiverAddress,
        createdAt: { gte: startOfDay(order.createdAt) }
      }
    });

    if (sameAddressCount < 3) {
      return;
    }

    await this.createOpenEventOnce({
      targetType: RiskTargetType.USER,
      targetId: order.userId,
      userId: order.userId,
      orderId: order.id,
      type: "SAME_ADDRESS_FREQUENCY",
      level: RiskLevel.MEDIUM,
      reason: "同一用户同地址当日高频下单"
    });
  }

  private async checkRiderFrequency(order: OrderRiskInput) {
    if (!order.riderNo) {
      return;
    }

    const count = await this.prisma.order.count({
      where: {
        riderNo: order.riderNo,
        createdAt: { gte: startOfDay(order.createdAt) }
      }
    });

    if (count < 3) {
      return;
    }

    await this.createOpenEventOnce({
      targetType: RiskTargetType.RIDER,
      targetId: order.riderNo,
      userId: order.userId,
      orderId: order.id,
      type: "RIDER_NO_FREQUENCY",
      level: RiskLevel.MEDIUM,
      reason: "同一骑手编号当日高频出现在订单备注中"
    });
  }

  private async checkPromoterFrequency(order: OrderRiskInput) {
    if (!order.promoterCode) {
      return;
    }

    const count = await this.prisma.order.count({
      where: {
        promoterCode: order.promoterCode,
        createdAt: { gte: startOfDay(order.createdAt) }
      }
    });

    if (count < 3) {
      return;
    }

    await this.createOpenEventOnce({
      targetType: RiskTargetType.PROMOTER,
      targetId: order.promoterCode,
      userId: order.userId,
      orderId: order.id,
      type: "PROMOTER_CODE_FREQUENCY",
      level: RiskLevel.MEDIUM,
      reason: "同一推广码当日高频下单"
    });
  }

  private async createOpenEventOnce(data: {
    targetType: RiskTargetType;
    targetId: string;
    userId?: string | null;
    orderId?: string | null;
    type: string;
    level: RiskLevel;
    reason: string;
  }) {
    const exists = await this.prisma.riskEvent.findFirst({
      where: {
        targetType: data.targetType,
        targetId: data.targetId,
        orderId: data.orderId,
        type: data.type,
        status: RiskEventStatus.OPEN
      }
    });

    if (exists) {
      return exists;
    }

    return this.prisma.riskEvent.create({ data });
  }

  private formatEvent(event: RiskEvent) {
    return {
      id: event.id,
      target: event.targetId,
      label: event.reason,
      level: this.levelText(event.level),
      type: event.type,
      status: event.status,
      createdAt: event.createdAt.toISOString()
    };
  }

  private levelText(level: RiskLevel) {
    const labels: Record<RiskLevel, string> = {
      LOW: "低",
      MEDIUM: "中",
      HIGH: "高"
    };
    return labels[level];
  }

  private async systemConfig(key: string, fallback: ConfigRecord) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return { ...fallback, ...jsonRecord(config?.value) };
  }
}
