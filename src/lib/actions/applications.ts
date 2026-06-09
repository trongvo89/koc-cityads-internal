"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KocApplication = {
  id: string;
  campaign_id: string;
  koc_id: string | null;
  tiktok_handle: string;
  tiktok_name: string;
  tiktok_url: string;
  follower_count: number;
  gmv_30d: number;
  zalo_phone: string;
  video_style: "show_face_voice" | "ugc_style";
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  applied_at: string;
};

export type CampaignRegistrationData = {
  campaign_id: string;
  campaign_name: string;
  registration_token: string | null;
  registration_open: boolean;
  registration_brief: string | null;
  registration_instructions: string | null;
  review_token: string | null;
};

// ─── Public actions (called by public pages) ──────────────────────────────────

export type PublicCampaignInfo = {
  campaign_id: string;
  campaign_name: string;
  registration_brief: string | null;
  registration_instructions: string | null;
  registration_open: boolean;
  start_date: string | null;
  end_date: string | null;
  application_count: number;
};

export async function getCampaignForRegistration(
  token: string
): Promise<ActionResult<PublicCampaignInfo>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_campaign_by_registration_token",
    { p_token: token }
  );

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Token không hợp lệ" };

  return { success: true, data: data as PublicCampaignInfo };
}

export async function submitApplication(
  token: string,
  formData: {
    tiktok_handle: string;
    tiktok_name: string;
    tiktok_url: string;
    follower_count: number;
    gmv_30d: number;
    zalo_phone: string;
    video_style: "show_face_voice" | "ugc_style";
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_koc_application", {
    p_token: token,
    p_handle: formData.tiktok_handle,
    p_name: formData.tiktok_name,
    p_tiktok_url: formData.tiktok_url,
    p_followers: formData.follower_count,
    p_gmv_30d: formData.gmv_30d,
    p_zalo_phone: formData.zalo_phone,
    p_video_style: formData.video_style,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { error?: string; success?: boolean };
  if (result?.error) {
    if (result.error === "invalid_token")
      return { success: false, error: "Link đăng ký không hợp lệ" };
    if (result.error === "registration_closed")
      return { success: false, error: "Đăng ký đã đóng" };
    return { success: false, error: result.error };
  }

  return { success: true, data: undefined };
}

export type PublicReviewData = {
  campaign: {
    campaign_name: string;
    package_size: number;
    start_date: string | null;
    end_date: string | null;
  };
  applications: Array<{
    id: string;
    tiktok_handle: string;
    tiktok_name: string;
    tiktok_url: string;
    follower_count: number;
    gmv_30d: number;
    zalo_phone: string;
    video_style: string;
    status: "pending" | "approved" | "rejected";
    review_note: string | null;
    applied_at: string;
  }>;
};

export async function getApplicationsForReview(
  reviewToken: string
): Promise<ActionResult<PublicReviewData>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_applications_by_review_token",
    { p_token: reviewToken }
  );

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Link không hợp lệ" };

  return { success: true, data: data as PublicReviewData };
}

export async function submitApplicationReview(
  reviewToken: string,
  applicationId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_application_review", {
    p_review_token: reviewToken,
    p_application_id: applicationId,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { error?: string; success?: boolean };
  if (result?.error) return { success: false, error: result.error };

  return { success: true, data: undefined };
}

// ─── Admin actions ────────────────────────────────────────────────────────────

export async function getApplicationsByCampaign(
  campaignId: string
): Promise<ActionResult<KocApplication[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koc_applications" as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("applied_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  return { success: true, data: (data ?? []) as unknown as KocApplication[] };
}

export async function addApplicationToCampaign(
  applicationId: string,
  campaignId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Fetch the application with koc_id
  const { data: app, error: appError } = await supabase
    .from("koc_applications" as any)
    .select("koc_id")
    .eq("id", applicationId)
    .single();

  if (appError || !app) return { success: false, error: "Không tìm thấy đơn đăng ký" };

  const kocId = (app as any).koc_id;
  if (!kocId) return { success: false, error: "KOC chưa được tạo trong hệ thống" };

  // Check if already in campaign_kocs
  const { data: existing } = await supabase
    .from("campaign_kocs")
    .select("campaign_koc_id")
    .eq("campaign_id", campaignId)
    .eq("koc_id", kocId)
    .maybeSingle();

  if (existing) return { success: false, error: "KOC đã có trong campaign" };

  // Add to campaign_kocs
  const { error: insertError } = await supabase.from("campaign_kocs").insert({
    campaign_id: campaignId,
    koc_id: kocId,
  });

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function bulkAddApprovedToCampaign(
  campaignId: string
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const supabase = await createClient();

  // Get all approved applications with koc_id
  const { data: apps, error: appsError } = await supabase
    .from("koc_applications" as any)
    .select("koc_id")
    .eq("campaign_id", campaignId)
    .eq("status", "approved")
    .not("koc_id", "is", null);

  if (appsError) return { success: false, error: appsError.message };

  const kocIds = [...new Set((apps ?? []).map((a: any) => a.koc_id as string))];
  if (kocIds.length === 0) return { success: true, data: { added: 0, skipped: 0 } };

  // Find which koc_ids are already in campaign_kocs
  const { data: existing } = await supabase
    .from("campaign_kocs")
    .select("koc_id")
    .eq("campaign_id", campaignId)
    .in("koc_id", kocIds);

  const existingIds = new Set((existing ?? []).map((e) => e.koc_id));
  const newKocIds = kocIds.filter((id) => !existingIds.has(id));

  if (newKocIds.length === 0) {
    return { success: true, data: { added: 0, skipped: kocIds.length } };
  }

  const rows = newKocIds.map((kocId) => ({
    campaign_id: campaignId,
    koc_id: kocId,
  }));

  const { error: insertError } = await supabase.from("campaign_kocs").insert(rows);
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return {
    success: true,
    data: { added: newKocIds.length, skipped: existingIds.size },
  };
}

export async function getCampaignRegistrationData(
  campaignId: string
): Promise<ActionResult<CampaignRegistrationData>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, registration_token, registration_open, registration_brief, registration_instructions, review_token")
    .eq("campaign_id", campaignId)
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Không tìm thấy" };

  return {
    success: true,
    data: {
      campaign_id: (data as any).campaign_id,
      campaign_name: (data as any).campaign_name,
      registration_token: (data as any).registration_token,
      registration_open: (data as any).registration_open ?? false,
      registration_brief: (data as any).registration_brief,
      registration_instructions: (data as any).registration_instructions,
      review_token: (data as any).review_token,
    },
  };
}

export async function updateCampaignRegistration(
  campaignId: string,
  data: {
    registration_open?: boolean;
    registration_brief?: string | null;
    registration_instructions?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await (supabase
    .from("campaigns")
    .update(data as any)
    .eq("campaign_id", campaignId) as any);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
