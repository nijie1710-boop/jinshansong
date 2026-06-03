"use server";

import { revalidatePath } from "next/cache";
import { operateSettlementRequest } from "../../lib/api";

export async function settlementRequestAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as "confirm" | "cancel" | "mark-paid";

  if (!id || !["confirm", "cancel", "mark-paid"].includes(action)) {
    return;
  }

  await operateSettlementRequest(id, action);
  revalidatePath("/finance/settlements");
}
