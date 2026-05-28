"use server";

import { revalidatePath } from "next/cache";
import { retryDelivery } from "../../lib/api";

export async function retryDeliveryAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    return;
  }

  await retryDelivery(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
