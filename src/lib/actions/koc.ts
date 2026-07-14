"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type OperationStatus = Database["public"]["Enums"]["operation_status"];
type AddressStatus = Database["public"]["Enums"]["address_status"];
type SampleStatus = Database["public"]["Enums"]["sample_status"];
type ContentStatus = Database["public"]["Enums"]["content_status"];

export type KocTokenData = {
  campaign_koc_id: string;
  campaign_name: string;
  koc_name: string;
  operation_status: OperationStatus;
  address_status: AddressStatus;
  sample_status: SampleStatus;
  content_status: ContentStatus;
  deadline_date: string | null;
  revision_note: string | null;
  operation_mode: "tiktok_seller" | "external";
  shipping_code: string | null;
  shipping_provider: string | null;
  receiver_name: string | null;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getKocByToken(
  token: string
): Promise<ActionResult<KocTokenData>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_campaign_koc_by_token", {
    p_token: token,
  });

  if (error || !data || data.length === 0) {
    return { success: false, error: "Token not found or expired" };
  }

  return { success: true, data: data[0] as KocTokenData };
}

export async function submitAddress(
  token: string,
  formData: {
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    receiver_province: string;
    address_note?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koc_submit_address", {
    p_token: token,
    p_receiver_name: formData.receiver_name,
    p_receiver_phone: formData.receiver_phone,
    p_receiver_address: formData.receiver_address,
    p_receiver_province: formData.receiver_province,
    p_address_note: formData.address_note || undefined,
  });

  if (error) {
    return { success: false, error: "Không thể lưu địa chỉ. Vui lòng thử lại." };
  }
  return { success: true, data: undefined };
}

export async function confirmSample(
  token: string,
  status: "received" | "not_received"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koc_confirm_sample", {
    p_token: token,
    p_status: status,
  });

  if (error) {
    return { success: false, error: "Không thể xác nhận. Vui lòng thử lại." };
  }
  return { success: true, data: undefined };
}

export async function submitVideo(
  token: string,
  videoUrl: string,
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koc_submit_video", {
    p_token: token,
    p_video_url: videoUrl,
    p_note: note || undefined,
  });

  if (error) {
    return { success: false, error: "Không thể nộp video. Vui lòng thử lại." };
  }
  return { success: true, data: undefined };
}
