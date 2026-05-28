"use server";

import { revalidatePath } from "next/cache";
import { approveProduct, rejectProduct } from "../lib/api";

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function approveProductAction(formData: FormData) {
  const productId = readFormString(formData, "productId");
  if (!productId) return;

  await approveProduct(productId, readFormString(formData, "remark"));
  revalidatePath("/products");
}

export async function rejectProductAction(formData: FormData) {
  const productId = readFormString(formData, "productId");
  if (!productId) return;

  await rejectProduct(productId, readFormString(formData, "remark"));
  revalidatePath("/products");
}
