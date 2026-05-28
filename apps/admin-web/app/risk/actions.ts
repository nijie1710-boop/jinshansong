"use server";

import { revalidatePath } from "next/cache";
import { ignoreRiskEvent, resolveRiskEvent } from "../lib/api";

export async function resolveRiskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await resolveRiskEvent(id);
  revalidatePath("/risk");
}

export async function ignoreRiskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await ignoreRiskEvent(id);
  revalidatePath("/risk");
}
