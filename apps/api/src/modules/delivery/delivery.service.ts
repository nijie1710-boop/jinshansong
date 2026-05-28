import { BadRequestException, Injectable } from "@nestjs/common";
import { DeliveryTaskStatus, OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  createDeliveryProvider,
  defaultProviderConfigs,
  normalizeDeliveryCallback,
  normalizeProviderConfigs,
  verifyDeliveryCallbackSignature
} from "./delivery.providers";
import {
  DeliveryCallbackPayload,
  DeliveryConfig,
  DeliveryProviderConfig,
  DeliveryQuoteOption,
  DeliveryQuoteRequest,
  DeliveryStrategy
} from "./delivery.types";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function money(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringConfig(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function numberConfig(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}

function boolConfig(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

function strategyConfig(config: Record<string, unknown>, fallback: DeliveryStrategy) {
  const value = stringConfig(config, "strategy", fallback);
  return value === "HIGH_VALUE_PRIORITY" ? "HIGH_VALUE_PRIORITY" : "LOWEST_COST";
}

function statusFromProvider(status?: string) {
  const normalized = (status || "").trim().toUpperCase();
  const map: Record<string, DeliveryTaskStatus> = {
    PENDING: DeliveryTaskStatus.PENDING,
    DISPATCHING: DeliveryTaskStatus.DISPATCHING,
    ACCEPTED: DeliveryTaskStatus.ACCEPTED,
    ASSIGNED: DeliveryTaskStatus.ACCEPTED,
    READY_FOR_PICKUP: DeliveryTaskStatus.READY_FOR_PICKUP,
    PICKED_UP: DeliveryTaskStatus.PICKED_UP,
    DELIVERING: DeliveryTaskStatus.DELIVERING,
    COMPLETED: DeliveryTaskStatus.COMPLETED,
    CANCELLED: DeliveryTaskStatus.CANCELLED,
    FAILED: DeliveryTaskStatus.FAILED
  };
  return map[normalized] ?? DeliveryTaskStatus.DISPATCHING;
}

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async quoteDelivery(request: DeliveryQuoteRequest) {
    const config = await this.deliveryConfig();
    if (!config.enabled) {
      return {
        selected: null,
        options: []
      };
    }

    const providerConfigs = (
      await Promise.all(
        config.providers
          .filter((provider) => provider.enabled)
          .map((provider) => this.providerConfigForStore(config, provider.code, request.storeId))
      )
    ).filter((provider): provider is DeliveryProviderConfig => Boolean(provider?.enabled));

    const options = await Promise.all(
      providerConfigs.map(async (providerConfig) => {
        const provider = createDeliveryProvider(providerConfig);
        try {
          return await provider.quote(request);
        } catch (error) {
          return {
            provider: providerConfig.code,
            providerName: providerConfig.name,
            serviceCode: providerConfig.serviceCode,
            mode: providerConfig.mode,
            available: false,
            feeCost: 0,
            userFee: 0,
            estimatedMinutes: providerConfig.mockEtaMinutes ?? 40,
            distanceKm: 0,
            reason: error instanceof Error ? error.message : "配送平台报价失败"
          } satisfies DeliveryQuoteOption;
        }
      })
    );

    return {
      selected: this.selectDeliveryOption(options, request.goodsAmount, config),
      options: options.sort((left, right) => {
        if (left.available !== right.available) return left.available ? -1 : 1;
        return left.feeCost - right.feeCost;
      })
    };
  }

  async dispatchOrder(orderId: string, operatorId?: string) {
    const existing = await this.prisma.deliveryTask.findUnique({ where: { orderId } });
    if (existing && existing.status !== DeliveryTaskStatus.FAILED) {
      return this.formatTask(existing);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        currentStore: true,
        store: true,
        items: true
      }
    });

    if (!order) {
      throw new BadRequestException("订单不存在，无法创建配送任务");
    }
    if (order.orderStatus !== OrderStatus.STORE_ACCEPTED) {
      throw new BadRequestException("订单未接单，暂不能呼叫第三方配送");
    }

    const config = await this.deliveryConfig();
    if (!config.enabled) {
      return null;
    }

    const requestPayload = this.buildDispatchPayload(order);
    const quote = await this.quoteDelivery(requestPayload);
    const selected = quote.selected;
    if (!selected) {
      return this.saveFailedTask(
        order.id,
        config.providers[0],
        requestPayload,
        "没有可用配送平台",
        operatorId
      );
    }

    const providerConfig = await this.providerConfigForStore(
      config,
      selected.provider,
      requestPayload.storeId
    );
    if (!providerConfig?.enabled) {
      return this.saveFailedTask(
        order.id,
        config.providers[0],
        requestPayload,
        `配送平台 ${selected.provider} 未配置`,
        operatorId
      );
    }

    try {
      const provider = createDeliveryProvider(providerConfig);
      const result = await provider.dispatch(requestPayload);
      const task = await this.prisma.deliveryTask.upsert({
        where: { orderId },
        update: {
          provider: providerConfig.code,
          providerOrderNo: result.providerOrderNo,
          status: result.status,
          riderNo: result.riderNo || order.riderNo,
          riderName: result.riderName || `${providerConfig.name}骑手`,
          riderPhone: result.riderPhone || "13800000086",
          fee: money(result.feeCost),
          distanceKm: money(result.distanceKm),
          requestPayload: requestPayload as Prisma.InputJsonObject,
          responsePayload: result.responsePayload as Prisma.InputJsonObject,
          failReason: null,
          dispatchedAt: new Date(),
          acceptedAt:
            result.status === DeliveryTaskStatus.ACCEPTED ||
            result.status === DeliveryTaskStatus.READY_FOR_PICKUP
              ? new Date()
              : null
        },
        create: {
          orderId,
          provider: providerConfig.code,
          providerOrderNo: result.providerOrderNo,
          status: result.status,
          riderNo: result.riderNo || order.riderNo,
          riderName: result.riderName || `${providerConfig.name}骑手`,
          riderPhone: result.riderPhone || "13800000086",
          fee: money(result.feeCost),
          distanceKm: money(result.distanceKm),
          requestPayload: requestPayload as Prisma.InputJsonObject,
          responsePayload: result.responsePayload as Prisma.InputJsonObject,
          dispatchedAt: new Date(),
          acceptedAt:
            result.status === DeliveryTaskStatus.ACCEPTED ||
            result.status === DeliveryTaskStatus.READY_FOR_PICKUP
              ? new Date()
              : null
        }
      });

      await this.logDeliveryDispatch(orderId, operatorId, {
        provider: providerConfig.code,
        providerName: providerConfig.name,
        providerOrderNo: result.providerOrderNo,
        status: result.status,
        feeCost: result.feeCost,
        selectedFrom: quote.options.map((option) => ({
          provider: option.provider,
          available: option.available,
          feeCost: option.feeCost,
          estimatedMinutes: option.estimatedMinutes,
          reason: option.reason
        }))
      });

      return this.formatTask(task);
    } catch (error) {
      return this.saveFailedTask(
        order.id,
        providerConfig,
        requestPayload,
        error instanceof Error ? error.message : "配送平台发单失败",
        operatorId
      );
    }
  }

  async retryDispatch(orderId: string, operatorId?: string) {
    return this.dispatchOrder(orderId, operatorId);
  }

  async notifyReady(orderId: string) {
    const task = await this.prisma.deliveryTask.findUnique({
      where: { orderId },
      include: { order: true }
    });
    if (!task) {
      return null;
    }

    const config = await this.deliveryConfig();
    const providerConfig = this.providerConfig(config, task.provider);
    if (!providerConfig || !task.providerOrderNo) {
      return this.updateTaskFailure(task.id, "配送平台或配送单号缺失，无法通知取货");
    }

    try {
      const provider = createDeliveryProvider(providerConfig);
      const responsePayload = await provider.notifyReady(task.providerOrderNo, task.order.orderNo);
      const updated = await this.prisma.deliveryTask.update({
        where: { id: task.id },
        data: {
          status: DeliveryTaskStatus.READY_FOR_PICKUP,
          responsePayload: responsePayload as Prisma.InputJsonObject,
          failReason: null,
          readyNotifiedAt: new Date()
        }
      });

      return this.formatTask(updated);
    } catch (error) {
      return this.updateTaskFailure(
        task.id,
        error instanceof Error ? error.message : "通知配送平台可取货失败"
      );
    }
  }

  async markPickedUp(orderId: string) {
    return this.updateTaskStatus(orderId, DeliveryTaskStatus.PICKED_UP, {
      pickedUpAt: new Date()
    });
  }

  async markCompleted(orderId: string) {
    return this.updateTaskStatus(orderId, DeliveryTaskStatus.COMPLETED, {
      completedAt: new Date()
    });
  }

  async cancelOrder(orderId: string, reason: string) {
    const task = await this.prisma.deliveryTask.findUnique({
      where: { orderId },
      include: { order: true }
    });
    if (
      !task ||
      task.status === DeliveryTaskStatus.COMPLETED ||
      task.status === DeliveryTaskStatus.CANCELLED
    ) {
      return null;
    }

    const config = await this.deliveryConfig();
    const providerConfig = this.providerConfig(config, task.provider);
    if (providerConfig && task.providerOrderNo) {
      await createDeliveryProvider(providerConfig)
        .cancel(task.providerOrderNo, task.order.orderNo, reason)
        .catch(() => undefined);
    }

    const updated = await this.prisma.deliveryTask.update({
      where: { id: task.id },
      data: {
        status: DeliveryTaskStatus.CANCELLED,
        failReason: reason,
        cancelledAt: new Date()
      }
    });

    return this.formatTask(updated);
  }

  async handleProviderCallback(provider: string, body: DeliveryCallbackPayload) {
    const providerCode = provider.trim().toUpperCase();
    const config = await this.deliveryConfig();
    const providerConfig = this.providerConfig(config, providerCode);
    if (!verifyDeliveryCallbackSignature(providerConfig, body)) {
      throw new BadRequestException("配送平台回调签名校验失败");
    }

    const normalizedBody = normalizeDeliveryCallback(providerCode, body);
    const providerOrderNo = normalizedBody.providerOrderNo?.trim();
    const orderNo = normalizedBody.orderNo?.trim();
    if (!providerOrderNo && !orderNo) {
      throw new BadRequestException("缺少第三方配送单号或金闪送订单号");
    }

    const task = await this.prisma.deliveryTask.findFirst({
      where: {
        provider: providerCode,
        OR: [
          ...(providerOrderNo ? [{ providerOrderNo }] : []),
          ...(orderNo ? [{ order: { is: { orderNo } } }] : [])
        ]
      },
      include: { order: true }
    });
    if (!task) {
      throw new BadRequestException("配送任务不存在");
    }

    const status = statusFromProvider(normalizedBody.status);
    const updateData: Prisma.DeliveryTaskUpdateInput = {
      status,
      callbackPayload: body as Prisma.InputJsonValue,
      riderNo: normalizedBody.riderNo ?? task.riderNo,
      riderName: normalizedBody.riderName ?? task.riderName,
      riderPhone: normalizedBody.riderPhone ?? task.riderPhone,
      fee: normalizedBody.fee === undefined ? task.fee : money(normalizedBody.fee),
      distanceKm:
        normalizedBody.distanceKm === undefined
          ? task.distanceKm
          : money(normalizedBody.distanceKm),
      failReason: normalizedBody.message ?? task.failReason
    };

    if (status === DeliveryTaskStatus.PICKED_UP || status === DeliveryTaskStatus.DELIVERING) {
      updateData.pickedUpAt = task.pickedUpAt ?? new Date();
    }
    if (status === DeliveryTaskStatus.COMPLETED) {
      updateData.completedAt = task.completedAt ?? new Date();
    }
    if (status === DeliveryTaskStatus.CANCELLED || status === DeliveryTaskStatus.FAILED) {
      updateData.cancelledAt = task.cancelledAt ?? new Date();
    }

    const updated = await this.prisma.deliveryTask.update({
      where: { id: task.id },
      data: updateData
    });

    return this.formatTask(updated);
  }

  private async updateTaskStatus(
    orderId: string,
    status: DeliveryTaskStatus,
    data: Prisma.DeliveryTaskUpdateInput
  ) {
    const task = await this.prisma.deliveryTask.findUnique({ where: { orderId } });
    if (!task) {
      return null;
    }

    const updated = await this.prisma.deliveryTask.update({
      where: { id: task.id },
      data: {
        status,
        ...data
      }
    });

    return this.formatTask(updated);
  }

  private async updateTaskFailure(taskId: string, failReason: string) {
    const updated = await this.prisma.deliveryTask.update({
      where: { id: taskId },
      data: {
        status: DeliveryTaskStatus.FAILED,
        failReason
      }
    });

    return this.formatTask(updated);
  }

  private async saveFailedTask(
    orderId: string,
    providerConfig: DeliveryProviderConfig | undefined,
    requestPayload: DeliveryQuoteRequest,
    failReason: string,
    operatorId?: string
  ) {
    const provider = providerConfig?.code || "UNCONFIGURED";
    const task = await this.prisma.deliveryTask.upsert({
      where: { orderId },
      update: {
        provider,
        status: DeliveryTaskStatus.FAILED,
        requestPayload: requestPayload as Prisma.InputJsonObject,
        responsePayload: { ok: false, message: failReason },
        failReason,
        dispatchedAt: new Date()
      },
      create: {
        orderId,
        provider,
        status: DeliveryTaskStatus.FAILED,
        fee: money(0),
        requestPayload: requestPayload as Prisma.InputJsonObject,
        responsePayload: { ok: false, message: failReason },
        failReason,
        dispatchedAt: new Date()
      }
    });

    await this.logDeliveryDispatch(orderId, operatorId, {
      provider,
      status: DeliveryTaskStatus.FAILED,
      failReason
    });

    return this.formatTask(task);
  }

  private async logDeliveryDispatch(
    orderId: string,
    operatorId: string | undefined,
    metadata: Prisma.InputJsonObject
  ) {
    await this.prisma.orderActionLog.create({
      data: {
        orderId,
        action: "DELIVERY_DISPATCH",
        fromStatus: OrderStatus.STORE_ACCEPTED,
        toStatus: OrderStatus.STORE_ACCEPTED,
        operatorType: "SYSTEM",
        operatorId,
        message:
          metadata.status === DeliveryTaskStatus.FAILED
            ? "聚合配送发单失败，等待重试"
            : "已创建第三方配送任务",
        metadata
      }
    });
  }

  private async deliveryConfig(): Promise<DeliveryConfig> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: "delivery_aggregation" }
    });
    const value = {
      enabled: true,
      strategy: "LOWEST_COST",
      highValueThreshold: 99,
      highValuePreferredProvider: "SF_INTRA_CITY",
      providers: defaultProviderConfigs(),
      ...jsonRecord(config?.value)
    };

    return {
      enabled: boolConfig(value, "enabled", true),
      strategy: strategyConfig(value, "LOWEST_COST"),
      highValueThreshold: numberConfig(value, "highValueThreshold", 99),
      highValuePreferredProvider: stringConfig(
        value,
        "highValuePreferredProvider",
        "SF_INTRA_CITY"
      ),
      providers: normalizeProviderConfigs(value)
    };
  }

  private providerConfig(config: DeliveryConfig, provider: string) {
    return config.providers.find((item) => item.code === provider);
  }

  private async providerConfigForStore(config: DeliveryConfig, provider: string, storeId?: string) {
    const baseConfig = this.providerConfig(config, provider);
    if (!baseConfig || !storeId) {
      return baseConfig;
    }

    const storeConfig = await this.prisma.storeDeliveryProviderConfig.findUnique({
      where: {
        storeId_provider: {
          storeId,
          provider
        }
      }
    });

    if (!storeConfig) {
      return {
        ...baseConfig,
        enabled: false,
        shopId: ""
      } satisfies DeliveryProviderConfig;
    }

    return {
      ...baseConfig,
      enabled: baseConfig.enabled && storeConfig.enabled,
      shopId: storeConfig.providerShopId ?? "",
      serviceCode: storeConfig.serviceCode || baseConfig.serviceCode,
      contactName: storeConfig.contactName ?? baseConfig.contactName,
      contactPhone: storeConfig.contactPhone ?? baseConfig.contactPhone
    } satisfies DeliveryProviderConfig;
  }

  private selectDeliveryOption(
    options: DeliveryQuoteOption[],
    goodsAmount: number,
    config: DeliveryConfig
  ) {
    const available = options.filter((option) => option.available);
    if (available.length === 0) {
      return null;
    }

    if (config.strategy === "HIGH_VALUE_PRIORITY" && goodsAmount >= config.highValueThreshold) {
      const preferred = available.find(
        (option) => option.provider === config.highValuePreferredProvider
      );
      if (preferred) {
        return preferred;
      }
    }

    return [...available].sort((left, right) => left.feeCost - right.feeCost)[0];
  }

  private buildDispatchPayload(order: {
    orderNo: string;
    goodsAmount: Prisma.Decimal;
    receiverName: string;
    receiverPhone: string;
    receiverCity: string;
    receiverDistrict: string;
    receiverAddress: string;
    receiverLatitude: Prisma.Decimal | null;
    receiverLongitude: Prisma.Decimal | null;
    riderNo: string | null;
    deliveryFeeCost: Prisma.Decimal;
    currentStore: {
      id: string;
      name: string;
      phone: string | null;
      address: string;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
    } | null;
    store: {
      id: string;
      name: string;
      phone: string | null;
      address: string;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
    } | null;
    items: { productName: string; skuName: string; quantity: number }[];
  }): DeliveryQuoteRequest {
    const store = order.currentStore ?? order.store;
    return {
      orderNo: order.orderNo,
      storeId: order.currentStore?.id ?? order.store?.id,
      goodsAmount: toNumber(order.goodsAmount),
      pickup: {
        name: store?.name ?? "金闪送门店",
        phone: store?.phone ?? "",
        address: store?.address ?? "",
        latitude: store?.latitude ? toNumber(store.latitude) : null,
        longitude: store?.longitude ? toNumber(store.longitude) : null
      },
      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        city: order.receiverCity,
        district: order.receiverDistrict,
        address: `${order.receiverCity}${order.receiverDistrict}${order.receiverAddress}`,
        latitude: order.receiverLatitude ? toNumber(order.receiverLatitude) : null,
        longitude: order.receiverLongitude ? toNumber(order.receiverLongitude) : null
      },
      items: order.items.map((item) => ({
        name: item.productName,
        skuName: item.skuName,
        quantity: item.quantity
      })),
      expectedFee: toNumber(order.deliveryFeeCost),
      riderNo: order.riderNo
    };
  }

  private formatTask(task: {
    id: string;
    provider: string;
    providerOrderNo: string | null;
    status: DeliveryTaskStatus;
    riderNo: string | null;
    riderName: string | null;
    riderPhone: string | null;
    fee: Prisma.Decimal;
    distanceKm: Prisma.Decimal | null;
    failReason: string | null;
    dispatchedAt: Date | null;
    acceptedAt: Date | null;
    readyNotifiedAt: Date | null;
    pickedUpAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  }) {
    return {
      id: task.id,
      provider: task.provider,
      providerName: this.providerName(task.provider),
      providerOrderNo: task.providerOrderNo,
      status: task.status,
      statusText: this.statusText(task.status),
      riderNo: task.riderNo,
      riderName: task.riderName,
      riderPhone: task.riderPhone,
      fee: toNumber(task.fee),
      distanceKm: task.distanceKm ? toNumber(task.distanceKm) : null,
      failReason: task.failReason,
      dispatchedAt: task.dispatchedAt?.toISOString() ?? null,
      acceptedAt: task.acceptedAt?.toISOString() ?? null,
      readyNotifiedAt: task.readyNotifiedAt?.toISOString() ?? null,
      pickedUpAt: task.pickedUpAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      cancelledAt: task.cancelledAt?.toISOString() ?? null
    };
  }

  private providerName(provider: string) {
    const labels: Record<string, string> = {
      MEITUAN: "美团配送",
      FENGNIAO: "蜂鸟即配",
      UU: "UU跑腿",
      SF_INTRA_CITY: "顺丰同城",
      MOCK_AGGREGATOR: "Mock聚合配送"
    };
    return labels[provider] ?? provider;
  }

  private statusText(status: DeliveryTaskStatus) {
    const labels: Record<DeliveryTaskStatus, string> = {
      PENDING: "待发单",
      DISPATCHING: "呼叫中",
      ACCEPTED: "骑手已接单",
      READY_FOR_PICKUP: "已通知取货",
      PICKED_UP: "已取货",
      DELIVERING: "配送中",
      COMPLETED: "已送达",
      CANCELLED: "已取消",
      FAILED: "呼叫失败"
    };
    return labels[status];
  }
}
