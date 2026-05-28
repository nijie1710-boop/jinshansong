"use server";

import { revalidatePath } from "next/cache";
import { operateAdminOrder, retryDelivery } from "../../lib/api";

export async function retryDeliveryAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    return;
  }

  await retryDelivery(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function adminOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const action = String(formData.get("action") ?? "") as "cancel" | "refund" | "force-complete";
  const reason = String(formData.get("reason") ?? "");

  if (!orderId || !["cancel", "refund", "force-complete"].includes(action)) {
    return;
  }

  await operateAdminOrder(orderId, action, reason);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
