import { DeliveryTaskStatus } from "@prisma/client";

export type DeliveryProviderMode = "mock" | "http";
export type DeliveryStrategy = "LOWEST_COST" | "HIGH_VALUE_PRIORITY";

export type DeliveryProviderConfig = {
  code: string;
  name: string;
  enabled: boolean;
  mode: DeliveryProviderMode;
  endpoint?: string;
  appKey?: string;
  token?: string;
  secret?: string;
  shopId?: string;
  serviceCode?: string;
  contactName?: string;
  contactPhone?: string;
  payTypeCode?: number;
  goodsWeightKg?: number;
  coordinateType?: number;
  cancelReasonId?: number;
  priority?: number;
  mockBaseFee?: number;
  mockEtaMinutes?: number;
};

export type DeliveryConfig = {
  enabled: boolean;
  strategy: DeliveryStrategy;
  highValueThreshold: number;
  highValuePreferredProvider: string;
  providers: DeliveryProviderConfig[];
};

export type DeliveryAddress = {
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type DeliveryPickup = {
  name: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type DeliveryItem = {
  name: string;
  skuName: string;
  quantity: number;
};

export type DeliveryQuoteRequest = {
  orderNo?: string;
  storeId?: string;
  goodsAmount: number;
  pickup: DeliveryPickup;
  receiver: DeliveryAddress;
  items: DeliveryItem[];
  expectedFee?: number;
  riderNo?: string | null;
};

export type DeliveryQuoteOption = {
  provider: string;
  providerName: string;
  serviceCode?: string;
  mode: DeliveryProviderMode;
  available: boolean;
  feeCost: number;
  userFee: number;
  estimatedMinutes: number;
  distanceKm: number;
  reason?: string;
};

export type DeliveryDispatchResult = {
  providerOrderNo: string;
  status: DeliveryTaskStatus;
  riderNo?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  feeCost: number;
  distanceKm: number;
  responsePayload: Record<string, unknown>;
};

export type DeliveryCallbackPayload = {
  [key: string]: unknown;
  providerOrderNo?: string;
  orderNo?: string;
  status?: string;
  riderNo?: string;
  riderName?: string;
  riderPhone?: string;
  fee?: number;
  distanceKm?: number;
  message?: string;
};

export interface DeliveryProvider {
  config: DeliveryProviderConfig;
  quote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteOption>;
  dispatch(request: DeliveryQuoteRequest): Promise<DeliveryDispatchResult>;
  notifyReady(providerOrderNo: string, orderNo: string): Promise<Record<string, unknown>>;
  cancel(
    providerOrderNo: string,
    orderNo: string,
    reason: string
  ): Promise<Record<string, unknown>>;
}
