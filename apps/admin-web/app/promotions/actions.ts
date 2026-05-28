"use server";

import { revalidatePath } from "next/cache";
import { updatePromotionConfig } from "../lib/api";

function numberValue(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

function enabledValue(formData: FormData) {
  return formData.get("enabled") === "on";
}

export async function saveNewUserPromotion(formData: FormData) {
  await updatePromotionConfig("NEW_USER_FIRST_ORDER", {
    enabled: enabledValue(formData),
    config: {
      amount: numberValue(formData, "amount"),
      cityScope: ["福州市"],
      lifetimeLimit: 1
    }
  });
  revalidatePath("/promotions");
}

export async function saveReferralPromotion(formData: FormData) {
  await updatePromotionConfig("REFERRAL_COUPON", {
    enabled: enabledValue(formData),
    config: {
      amount: numberValue(formData, "amount"),
      validDays: numberValue(formData, "validDays"),
      weeklyLimit: numberValue(formData, "weeklyLimit")
    }
  });
  revalidatePath("/promotions");
}

export async function saveOrderDiscountPromotion(formData: FormData) {
  await updatePromotionConfig("ORDER_DISCOUNT", {
    enabled: enabledValue(formData),
    config: {
      tiers: [
        { threshold: numberValue(formData, "thresholdA"), discount: numberValue(formData, "discountA") },
        { threshold: numberValue(formData, "thresholdB"), discount: numberValue(formData, "discountB") }
      ]
    }
  });
  revalidatePath("/promotions");
}

export async function saveFreeDeliveryPromotion(formData: FormData) {
  await updatePromotionConfig("FREE_DELIVERY", {
    enabled: enabledValue(formData),
    config: {
      threshold: numberValue(formData, "threshold")
    }
  });
  revalidatePath("/promotions");
}
