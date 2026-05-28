"use server";

import { revalidatePath } from "next/cache";
import { createCategory, updateCategory } from "../lib/api";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readSort(formData: FormData) {
  const sort = Number(formData.get("sort") ?? 0);
  return Number.isFinite(sort) ? sort : 0;
}

function readStatus(formData: FormData) {
  return readString(formData, "status") === "DISABLED" ? "DISABLED" : "ENABLED";
}

export async function createCategoryAction(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) return;

  await createCategory({
    name,
    icon: readString(formData, "icon"),
    sort: readSort(formData),
    status: readStatus(formData)
  });
  revalidatePath("/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const id = readString(formData, "id");
  if (!id) return;

  await updateCategory(id, {
    name: readString(formData, "name"),
    icon: readString(formData, "icon"),
    sort: readSort(formData),
    status: readStatus(formData)
  });
  revalidatePath("/categories");
}
