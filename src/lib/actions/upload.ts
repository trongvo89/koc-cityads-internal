"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

export async function uploadCampaignImage(
  campaignId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "Không có file" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `campaigns/${campaignId}/${Date.now()}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("campaign-images")
    .upload(path, file, { upsert: false });

  if (error) return { success: false, error: error.message };

  const { data: urlData } = supabase.storage
    .from("campaign-images")
    .getPublicUrl(path);

  return { success: true, data: { url: urlData.publicUrl } };
}
