import { createHash } from "node:crypto";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { DeliveryTaskStatus } from "@prisma/client";
import {
  DeliveryCallbackPayload,
  DeliveryDispatchResult,
  DeliveryProvider,
  DeliveryProviderConfig,
  DeliveryProviderMode,
  DeliveryQuoteOption,
  DeliveryQuoteRequest
} from "./delivery.types";

type ProviderPreset = {
  name: string;
  serviceCode: string;
  mockBaseFee: number;
  mockEtaMinutes: number;
  priority: number;
};

const providerPresets: Record<string, ProviderPreset> = {
  MEITUAN: {
    name: "美团配送",
    serviceCode: "4031",
    mockBaseFee: 5.8,
    mockEtaMinutes: 38,
    priority: 10
  },
  FENGNIAO: {
    name: "蜂鸟即配",
    serviceCode: "即时配送",
    mockBaseFee: 5.5,
    mockEtaMinutes: 42,
    priority: 20
  },
  UU: {
    name: "UU跑腿",
    serviceCode: "帮送",
    mockBaseFee: 7,
    mockEtaMinutes: 45,
    priority: 30
  },
  SF_INTRA_CITY: {
    name: "顺丰同城",
    serviceCode: "同城急送",
    mockBaseFee: 9,
    mockEtaMinutes: 35,
    priority: 40
  },
  MOCK_AGGREGATOR: {
    name: "Mock聚合配送",
    serviceCode: "模拟配送",
    mockBaseFee: 4,
    mockEtaMinutes: 40,
    priority: 99
  }
};

export function defaultProviderConfigs(): DeliveryProviderConfig[] {
  return ["MEITUAN", "FENGNIAO", "UU", "SF_INTRA_CITY"].map((code) => {
    const preset = providerPresets[code];
    return {
      code,
      name: preset.name,
      enabled: code === "MEITUAN" || code === "FENGNIAO",
      mode: "mock",
      endpoint: "",
      appKey: "",
      token: "",
      secret: "",
      shopId: "",
      serviceCode: preset.serviceCode,
      priority: preset.priority,
      mockBaseFee: preset.mockBaseFee,
      mockEtaMinutes: preset.mockEtaMinutes
    };
  });
}

export function normalizeProviderConfigs(value: Record<string, unknown>) {
  const rawProviders = Array.isArray(value.providers) ? value.providers : [];
  if (rawProviders.length > 0) {
    return rawProviders.map((item) => normalizeProviderConfig(item));
  }

  const provider = typeof value.provider === "string" ? value.provider : "MOCK_AGGREGATOR";
  return [
    normalizeProviderConfig({
      code: provider,
      name: providerPresets[provider]?.name ?? provider,
      enabled: true,
      mode: value.mode,
      endpoint: value.endpoint,
      appKey: value.appKey,
      token: value.token
    })
  ];
}

export function createDeliveryProvider(config: DeliveryProviderConfig): DeliveryProvider {
  if (config.code === "MEITUAN") {
    return new MeituanDeliveryProvider(config);
  }
  return new ConfiguredDeliveryProvider(config);
}

export function normalizeDeliveryCallback(provider: string, body: DeliveryCallbackPayload) {
  if (provider === "MEITUAN") {
    const status = String(body.status ?? "");
    const statusMap: Record<string, string> = {
      "0": "DISPATCHING",
      "20": "ACCEPTED",
      "30": "PICKED_UP",
      "50": "COMPLETED",
      "99": "CANCELLED"
    };
    const distanceMeters = Number(body.delivery_distance ?? 0);
    return {
      providerOrderNo: stringCallback(body, "mt_peisong_id"),
      orderNo: stringCallback(body, "order_id"),
      status: statusMap[status] ?? status,
      riderName: stringCallback(body, "courier_name"),
      riderPhone: stringCallback(body, "courier_phone"),
      fee: numberCallback(body, "delivery_fee"),
      distanceKm: distanceMeters ? roundDistance(distanceMeters / 1000) : undefined,
      message: stringCallback(body, "cancel_reason") || stringCallback(body, "message")
    } satisfies DeliveryCallbackPayload;
  }

  return body;
}

export function verifyDeliveryCallbackSignature(
  providerConfig: DeliveryProviderConfig | undefined,
  body: DeliveryCallbackPayload
) {
  if (!providerConfig || providerConfig.code !== "MEITUAN" || !providerConfig.secret) {
    return true;
  }
  const sign = stringCallback(body, "sign");
  if (!sign) {
    return false;
  }

  const params = Object.entries(body).reduce<Record<string, string>>((result, [key, value]) => {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
    return result;
  }, {});
  return meituanSign(params, providerConfig.secret) === sign;
}

function normalizeProviderConfig(raw: unknown): DeliveryProviderConfig {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const code = stringValue(value, "code", "MOCK_AGGREGATOR").trim() || "MOCK_AGGREGATOR";
  const preset = providerPresets[code] ?? providerPresets.MOCK_AGGREGATOR;

  return {
    code,
    name: stringValue(value, "name", preset.name),
    enabled: boolValue(value, "enabled", true),
    mode: modeValue(value, "mode", "mock"),
    endpoint: stringValue(value, "endpoint"),
    appKey: stringValue(value, "appKey"),
    token: stringValue(value, "token"),
    secret: stringValue(value, "secret"),
    shopId: stringValue(value, "shopId"),
    serviceCode: stringValue(value, "serviceCode", preset.serviceCode),
    contactName: stringValue(value, "contactName"),
    contactPhone: stringValue(value, "contactPhone"),
    payTypeCode: numberValue(value, "payTypeCode", 0),
    goodsWeightKg: numberValue(value, "goodsWeightKg", 1),
    coordinateType: numberValue(value, "coordinateType", 0),
    cancelReasonId: numberValue(value, "cancelReasonId", 199),
    priority: numberValue(value, "priority", preset.priority),
    mockBaseFee: numberValue(value, "mockBaseFee", preset.mockBaseFee),
    mockEtaMinutes: numberValue(value, "mockEtaMinutes", preset.mockEtaMinutes)
  };
}

class ConfiguredDeliveryProvider implements DeliveryProvider {
  constructor(readonly config: DeliveryProviderConfig) {}

  async quote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteOption> {
    const fallback = this.mockQuote(request);
    if (this.config.mode !== "http") {
      return fallback;
    }

    try {
      const response = await this.callProvider("/quote", this.buildProviderPayload(request));
      return {
        ...fallback,
        available: boolFromResponse(response, "available", fallback.available),
        feeCost: numberFromResponse(response, "feeCost", fallback.feeCost),
        estimatedMinutes: numberFromResponse(
          response,
          "estimatedMinutes",
          fallback.estimatedMinutes
        ),
        distanceKm: numberFromResponse(response, "distanceKm", fallback.distanceKm),
        reason: stringFromResponse(response, "reason", fallback.reason)
      };
    } catch (error) {
      return {
        ...fallback,
        available: false,
        reason: error instanceof Error ? error.message : "配送平台报价失败"
      };
    }
  }

  async dispatch(request: DeliveryQuoteRequest): Promise<DeliveryDispatchResult> {
    const quote = this.mockQuote(request);
    if (this.config.mode !== "http") {
      return this.mockDispatch(request, quote);
    }

    const response = await this.callProvider("/orders", this.buildProviderPayload(request));
    return {
      providerOrderNo:
        stringFromResponse(response, "providerOrderNo") ||
        `${this.config.code}-${request.orderNo || Date.now()}`,
      status: statusFromResponse(response, DeliveryTaskStatus.DISPATCHING),
      riderNo: stringFromResponse(response, "riderNo", request.riderNo || ""),
      riderName: stringFromResponse(response, "riderName", ""),
      riderPhone: stringFromResponse(response, "riderPhone", ""),
      feeCost: numberFromResponse(response, "feeCost", quote.feeCost),
      distanceKm: numberFromResponse(response, "distanceKm", quote.distanceKm),
      responsePayload: response
    };
  }

  async notifyReady(providerOrderNo: string, orderNo: string) {
    if (this.config.mode !== "http") {
      return { ok: true, status: "READY_FOR_PICKUP", providerOrderNo, orderNo };
    }

    return this.callProvider(`/orders/${providerOrderNo}/ready`, {
      providerOrderNo,
      orderNo
    });
  }

  async cancel(providerOrderNo: string, orderNo: string, reason: string) {
    if (this.config.mode !== "http") {
      return { ok: true, status: "CANCELLED", providerOrderNo, orderNo, reason };
    }

    return this.callProvider(`/orders/${providerOrderNo}/cancel`, {
      providerOrderNo,
      orderNo,
      reason
    });
  }

  protected mockQuote(request: DeliveryQuoteRequest): DeliveryQuoteOption {
    const distanceKm = estimateDistanceKm(request);
    const baseFee = this.config.mockBaseFee ?? providerPresets.MOCK_AGGREGATOR.mockBaseFee;
    const distanceSurcharge = Math.max(0, distanceKm - 3) * 1.5;
    const feeCost = roundMoney(baseFee + distanceSurcharge);
    const inFuzhou = request.receiver.city.includes("福州");

    return {
      provider: this.config.code,
      providerName: this.config.name,
      serviceCode: this.config.serviceCode,
      mode: this.config.mode,
      available: inFuzhou,
      feeCost,
      userFee: 0,
      estimatedMinutes: this.config.mockEtaMinutes ?? 40,
      distanceKm,
      reason: inFuzhou ? undefined : "当前仅开放福州同城配送"
    };
  }

  protected mockDispatch(
    request: DeliveryQuoteRequest,
    quote: DeliveryQuoteOption
  ): DeliveryDispatchResult {
    if (!quote.available) {
      throw new BadRequestException(quote.reason || "当前配送平台不可用");
    }

    const riderNo = request.riderNo || this.config.code.slice(0, 4);
    return {
      providerOrderNo: `${this.config.code}-${request.orderNo || Date.now()}`,
      status: DeliveryTaskStatus.ACCEPTED,
      riderNo,
      riderName: `${this.config.name}骑手${riderNo}`,
      riderPhone: "13800000086",
      feeCost: quote.feeCost,
      distanceKm: quote.distanceKm,
      responsePayload: {
        providerOrderNo: `${this.config.code}-${request.orderNo || Date.now()}`,
        status: "ACCEPTED",
        mock: true,
        provider: this.config.code
      }
    };
  }

  protected buildProviderPayload(request: DeliveryQuoteRequest) {
    return {
      provider: this.config.code,
      appKey: this.config.appKey,
      shopId: this.config.shopId,
      serviceCode: this.config.serviceCode,
      orderNo: request.orderNo,
      goodsAmount: request.goodsAmount,
      pickup: request.pickup,
      receiver: request.receiver,
      items: request.items,
      expectedFee: request.expectedFee,
      riderNo: request.riderNo
    };
  }

  private async callProvider(path: string, payload: Record<string, unknown>) {
    if (!this.config.endpoint) {
      throw new BadRequestException(`${this.config.name} endpoint 未配置`);
    }

    const response = await fetch(`${this.config.endpoint.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.appKey ? { "x-app-key": this.config.appKey } : {}),
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
        ...(this.config.secret ? { "x-signature-placeholder": this.config.secret } : {})
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new UnauthorizedException(`${this.config.name} 请求失败：${response.status}`);
    }

    return body as Record<string, unknown>;
  }
}

class MeituanDeliveryProvider extends ConfiguredDeliveryProvider {
  async quote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteOption> {
    const fallback = this.mockQuote(request);
    if (this.config.mode !== "http") {
      return fallback;
    }

    try {
      const response = await this.callMeituan(
        "order/preCreateByShop",
        this.meituanPayload(request)
      );
      const data = dataRecord(response);
      const feeCost = fenToYuan(numberFromResponse(data, "delivery_fee", fallback.feeCost * 100));
      const distanceMeters = numberFromResponse(
        data,
        "delivery_distance",
        fallback.distanceKm * 1000
      );

      return {
        ...fallback,
        available: true,
        feeCost,
        estimatedMinutes: fallback.estimatedMinutes,
        distanceKm: roundDistance(distanceMeters / 1000),
        reason: undefined
      };
    } catch (error) {
      return {
        ...fallback,
        available: false,
        reason: error instanceof Error ? error.message : "美团配送预发单失败"
      };
    }
  }

  async dispatch(request: DeliveryQuoteRequest): Promise<DeliveryDispatchResult> {
    const fallbackQuote = await this.quote(request);
    if (this.config.mode !== "http") {
      return this.mockDispatch(request, fallbackQuote);
    }
    if (!fallbackQuote.available) {
      throw new BadRequestException(fallbackQuote.reason || "美团配送当前不可发单");
    }

    const response = await this.callMeituan("order/createByShop", this.meituanPayload(request));
    const data = dataRecord(response);
    const deliveryId = meituanDeliveryId(request.orderNo);
    return {
      providerOrderNo:
        stringFromResponse(data, "mt_peisong_id") ||
        stringFromResponse(data, "mt_delivery_id") ||
        String(deliveryId),
      status: DeliveryTaskStatus.DISPATCHING,
      riderNo: request.riderNo || "MEITUAN",
      riderName: "",
      riderPhone: "",
      feeCost: fallbackQuote.feeCost,
      distanceKm: fallbackQuote.distanceKm,
      responsePayload: {
        ...response,
        delivery_id: deliveryId,
        order_id: request.orderNo
      }
    };
  }

  async notifyReady(providerOrderNo: string, orderNo: string) {
    return {
      ok: true,
      provider: this.config.code,
      providerOrderNo,
      orderNo,
      message: "美团配送发单后由平台调度骑手，无独立备货完成接口"
    };
  }

  async cancel(providerOrderNo: string, orderNo: string, reason: string) {
    if (this.config.mode !== "http") {
      return super.cancel(providerOrderNo, orderNo, reason);
    }

    return this.callMeituan("order/delete", {
      delivery_id: meituanDeliveryId(orderNo),
      mt_peisong_id: providerOrderNo,
      cancel_reason_id: this.config.cancelReasonId ?? 199,
      cancel_reason: reason
    });
  }

  private meituanPayload(request: DeliveryQuoteRequest) {
    if (!this.config.shopId) {
      throw new BadRequestException("美团配送 shopId 未配置");
    }
    if (!request.receiver.latitude || !request.receiver.longitude) {
      throw new BadRequestException("美团配送需要收货地址经纬度");
    }

    const goodsDetail = {
      goods: request.items.map((item) => ({
        goodName: item.name,
        goodCount: item.quantity,
        goodUnit: "件",
        goodPrice: Math.max(
          1,
          Math.round((request.goodsAmount / totalQuantity(request.items)) * 100)
        )
      }))
    };

    return {
      delivery_id: meituanDeliveryId(request.orderNo),
      order_id: request.orderNo || String(Date.now()),
      shop_id: this.config.shopId,
      delivery_service_code: Number(this.config.serviceCode) || 4031,
      receiver_name: request.receiver.name,
      receiver_address: request.receiver.address,
      receiver_phone: request.receiver.phone,
      receiver_lng: coordinateToMeituan(request.receiver.longitude),
      receiver_lat: coordinateToMeituan(request.receiver.latitude),
      coordinate_type: this.config.coordinateType ?? 0,
      goods_value: yuanToFen(request.goodsAmount),
      goods_weight: Math.max(1, Math.round((this.config.goodsWeightKg ?? 1) * 1000)),
      goods_detail: JSON.stringify(goodsDetail),
      pay_type_code: this.config.payTypeCode ?? 0,
      outer_order_source_desc: "金闪送",
      note: "金闪送数码配件即时配送",
      poi_seq: request.orderNo || ""
    };
  }

  private async callMeituan(method: string, params: Record<string, unknown>) {
    const endpoint = (this.config.endpoint || "https://peisongopen.meituan.com/api").replace(
      /\/$/,
      ""
    );
    if (!this.config.appKey || !this.config.secret) {
      throw new BadRequestException("美团配送 appKey / secret 未配置");
    }

    const systemParams: Record<string, unknown> = {
      appkey: this.config.appKey,
      timestamp: Math.floor(Date.now() / 1000),
      version: "1.0",
      ...params
    };
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(systemParams)) {
      if (value !== undefined && value !== null && value !== "") {
        form.set(key, String(value));
      }
    }
    form.set("sign", meituanSign(Object.fromEntries(form.entries()), this.config.secret));

    const response = await fetch(`${endpoint}/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: form.toString()
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    const code = numberFromResponse(body, "code", response.ok ? 0 : response.status);
    if (!response.ok || code !== 0) {
      throw new UnauthorizedException(
        stringFromResponse(body, "message", `美团配送请求失败：${response.status}`)
      );
    }

    return body;
  }
}

function estimateDistanceKm(request: DeliveryQuoteRequest) {
  if (
    typeof request.pickup.latitude === "number" &&
    typeof request.pickup.longitude === "number" &&
    typeof request.receiver.latitude === "number" &&
    typeof request.receiver.longitude === "number"
  ) {
    return roundDistance(
      haversineKm(
        request.pickup.latitude,
        request.pickup.longitude,
        request.receiver.latitude,
        request.receiver.longitude
      )
    );
  }

  if (request.receiver.district.includes("仓山")) return 2.4;
  if (request.receiver.district.includes("马尾")) return 6.8;
  if (request.receiver.district.includes("晋安")) return 3.2;
  return 1.8;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function statusFromResponse(response: Record<string, unknown>, fallback: DeliveryTaskStatus) {
  const raw = stringFromResponse(response, "status").toUpperCase();
  const map: Partial<Record<string, DeliveryTaskStatus>> = {
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
  return map[raw] ?? fallback;
}

function stringValue(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function boolValue(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

function modeValue(
  config: Record<string, unknown>,
  key: string,
  fallback: DeliveryProviderMode
): DeliveryProviderMode {
  return stringValue(config, key, fallback) === "http" ? "http" : "mock";
}

function numberValue(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}

function stringFromResponse(response: Record<string, unknown>, key: string, fallback = "") {
  const value = response[key];
  return typeof value === "string" ? value : fallback;
}

function numberFromResponse(response: Record<string, unknown>, key: string, fallback: number) {
  const value = response[key];
  return typeof value === "number" ? value : fallback;
}

function boolFromResponse(response: Record<string, unknown>, key: string, fallback: boolean) {
  const value = response[key];
  return typeof value === "boolean" ? value : fallback;
}

function stringCallback(body: DeliveryCallbackPayload, key: string) {
  const value = body[key];
  return value === undefined || value === null ? "" : String(value);
}

function numberCallback(body: DeliveryCallbackPayload, key: string) {
  const value = body[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dataRecord(response: Record<string, unknown>) {
  const data = response.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function yuanToFen(value: number) {
  return Math.max(1, Math.round(value * 100));
}

function fenToYuan(value: number) {
  return roundMoney(value / 100);
}

function coordinateToMeituan(value: number) {
  return Math.round(value * 1_000_000);
}

function totalQuantity(items: { quantity: number }[]) {
  return Math.max(
    1,
    items.reduce((sum, item) => sum + item.quantity, 0)
  );
}

function meituanDeliveryId(orderNo?: string) {
  const source = orderNo || String(Date.now());
  const digits = source.replace(/\D/g, "");
  if (digits) {
    return Number(digits.slice(-15));
  }

  const hash = createHash("sha1").update(source).digest("hex");
  return Number.parseInt(hash.slice(0, 12), 16);
}

function meituanSign(params: Record<string, string>, secret: string) {
  const raw = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHash("sha1").update(`${secret}${raw}`).digest("hex");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}
