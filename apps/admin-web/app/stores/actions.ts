"use server";

import { revalidatePath } from "next/cache";
import {
  approveStoreApplication,
  rejectStoreApplication,
  updateStoreDeliveryProvider
} from "../lib/api";

export async function approveApplicationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const remark = String(formData.get("remark") ?? "");

  if (!id) return;
  await approveStoreApplication(id, remark || "审核通过");
  revalidatePath("/stores");
}

export async function rejectApplicationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const remark = String(formData.get("remark") ?? "");

  if (!id) return;
  await rejectStoreApplication(id, remark || "资料不完整，请补充后重新提交");
  revalidatePath("/stores");
}

export async function saveStoreDeliveryProviderAction(formData: FormData) {
  const storeId = String(formData.get("storeId") ?? "");
  const provider = String(formData.get("provider") ?? "");
  if (!storeId || !provider) return;

  await updateStoreDeliveryProvider(storeId, provider, {
    providerShopId: String(formData.get("providerShopId") ?? ""),
    enabled: formData.get("enabled") === "on",
    serviceCode: String(formData.get("serviceCode") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    remark: String(formData.get("remark") ?? "")
  });
  revalidatePath("/stores");
}
