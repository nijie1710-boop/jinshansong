"use server";

import { revalidatePath } from "next/cache";
import { updateSystemConfig } from "../lib/api";

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = formData.get(key);
  return value === null || value === "" ? fallback : Number(value);
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function saveDeliveryConfig(formData: FormData) {
  await updateSystemConfig(
    "delivery",
    {
      userDeliveryFee: numberValue(formData, "userDeliveryFee"),
      platformDeliveryCost: numberValue(formData, "platformDeliveryCost"),
      freeDeliveryThreshold: numberValue(formData, "freeDeliveryThreshold")
    },
    "配送费和平台配送成本配置"
  );
  revalidatePath("/configs");
}

export async function saveCommissionConfig(formData: FormData) {
  await updateSystemConfig(
    "commission",
    {
      storeFixedCommission: numberValue(formData, "storeFixedCommission"),
      generalAgentRate: numberValue(formData, "generalAgentRate"),
      riderBaseBonus: numberValue(formData, "riderBaseBonus"),
      riderStepCount: numberValue(formData, "riderStepCount"),
      riderStepBonus: numberValue(formData, "riderStepBonus"),
      promoterCommission: numberValue(formData, "promoterCommission")
    },
    "门店、骑手、推广员佣金配置"
  );
  revalidatePath("/configs");
}

export async function saveOrderFlowConfig(formData: FormData) {
  await updateSystemConfig(
    "order_flow",
    {
      storeAcceptTimeoutMinutes: numberValue(formData, "storeAcceptTimeoutMinutes"),
      rejectRefundThreshold: numberValue(formData, "rejectRefundThreshold")
    },
    "订单转单和拒单退款配置"
  );
  revalidatePath("/configs");
}

export async function saveFinanceConfig(formData: FormData) {
  await updateSystemConfig(
    "finance",
    {
      lossWarningThreshold: numberValue(formData, "lossWarningThreshold")
    },
    "财务预警配置，净利润低于阈值时标记"
  );
  revalidatePath("/configs");
}

export async function saveDeliveryAggregationConfig(formData: FormData) {
  const providerCodes = [
    ["MEITUAN", "美团配送", "4031", 1, 0, 199],
    ["FENGNIAO", "蜂鸟即配", "即时配送", 1, 0, 199],
    ["UU", "UU跑腿", "帮送", 1, 0, 199],
    ["SF_INTRA_CITY", "顺丰同城", "同城急送", 1, 0, 199]
  ] as const;

  await updateSystemConfig(
    "delivery_aggregation",
    {
      enabled: boolValue(formData, "enabled"),
      strategy:
        stringValue(formData, "strategy") === "HIGH_VALUE_PRIORITY"
          ? "HIGH_VALUE_PRIORITY"
          : "LOWEST_COST",
      highValueThreshold: numberValue(formData, "highValueThreshold"),
      highValuePreferredProvider: stringValue(formData, "highValuePreferredProvider"),
      providers: providerCodes.map(
        ([code, name, serviceCode, goodsWeightKg, coordinateType, cancelReasonId]) => ({
          code,
          name,
          serviceCode,
          enabled: boolValue(formData, `${code}_enabled`),
          mode: stringValue(formData, `${code}_mode`) === "http" ? "http" : "mock",
          endpoint: stringValue(formData, `${code}_endpoint`),
          appKey: stringValue(formData, `${code}_appKey`),
          token: stringValue(formData, `${code}_token`),
          secret: stringValue(formData, `${code}_secret`),
          shopId: stringValue(formData, `${code}_shopId`),
          payTypeCode: numberValue(formData, `${code}_payTypeCode`, 0),
          goodsWeightKg: numberValue(formData, `${code}_goodsWeightKg`, goodsWeightKg),
          coordinateType: numberValue(formData, `${code}_coordinateType`, coordinateType),
          cancelReasonId: numberValue(formData, `${code}_cancelReasonId`, cancelReasonId),
          mockBaseFee: numberValue(formData, `${code}_mockBaseFee`),
          mockEtaMinutes: numberValue(formData, `${code}_mockEtaMinutes`)
        })
      )
    },
    "多平台即时配送配置；美团/蜂鸟优先，真实密钥接入前使用 mock 适配器"
  );
  revalidatePath("/configs");
}
