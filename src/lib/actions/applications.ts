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
  video_style: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  applied_at: string;
  custom_data: Record<string, unknown> | null;
  agency_status: "approved" | "rejected" | "shortlisted" | null;
  agency_reviewed_at: string | null;
  agency_review_note: string | null;
  row_color: string | null;
};

export type CampaignRegistrationData = {
  campaign_id: string;
  campaign_name: string;
  registration_token: string | null;
  registration_open: boolean;
  registration_brief: string | null;
  registration_instructions: string | null;
  registration_thank_you: string | null;
  registration_form_config: unknown | null;
  review_token: string | null;
};

// ─── Public actions (called by public pages) ──────────────────────────────────

export type PublicCampaignInfo = {
  campaign_id: string;
  campaign_name: string;
  registration_brief: string | null;
  registration_instructions: string | null;
  registration_thank_you: string | null;
  registration_form_config: unknown | null;
  registration_open: boolean;
  start_date: string | null;
  end_date: string | null;
  application_count: number;
};

export async function getCampaignForRegistration(
  token: string
): Promise<ActionResult<PublicCampaignInfo>> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
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
    video_style: string;
    custom_data?: Record<string, unknown>;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("submit_koc_application", {
    p_token: token,
    p_handle: formData.tiktok_handle,
    p_name: formData.tiktok_name,
    p_tiktok_url: formData.tiktok_url,
    p_followers: formData.follower_count,
    p_gmv_30d: formData.gmv_30d,
    p_zalo_phone: formData.zalo_phone,
    p_video_style: formData.video_style,
    p_custom_data: formData.custom_data ?? {},
  });

  if (error) return { success: false, error: error.message };

  const result = data as { error?: string; success?: boolean };
  if (result?.error) {
    if (result.error === "invalid_token")
      return { success: false, error: "Link đăng ký không hợp lệ" };
    if (result.error === "registration_closed")
      return { success: false, error: "Đăng ký đã đóng" };
    if (result.error === "missing_handle")
      return { success: false, error: "Vui lòng nhập ID/tên TikTok của bạn" };
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
    video_style: string;
    status: "pending" | "approved" | "rejected";
    review_note: string | null;
    applied_at: string;
    agency_status: "approved" | "rejected" | null;
    agency_review_note: string | null;
  }>;
};

export async function getApplicationsForReview(
  reviewToken: string
): Promise<ActionResult<PublicReviewData>> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("submit_application_review", {
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

  // Fetch the application with koc_id and approval status
  const { data: app, error: appError } = await supabase
    .from("koc_applications" as any)
    .select("koc_id, status, agency_status, tiktok_name, tiktok_handle, tiktok_url, follower_count, zalo_phone")
    .eq("id", applicationId)
    .single();

  if (appError || !app) return { success: false, error: "Không tìm thấy đơn đăng ký" };

  // Ensure a KOC master row exists (URL-less registrations have none yet).
  let kocId = (app as any).koc_id as string | null;
  if (!kocId) {
    const a = app as any;
    const { data: kocRow, error: kocErr } = await supabase
      .from("kocs")
      .insert({
        name: (a.tiktok_name?.trim() || a.tiktok_handle) ?? "?",
        tiktok_url: a.tiktok_url?.trim() || null,
        tiktok_handle: a.tiktok_handle ?? null,
        phone: a.zalo_phone ?? null,
        zalo: a.zalo_phone ?? null,
        follower: a.follower_count ?? 0,
        status: "active",
      } as any)
      .select("koc_id")
      .single();
    if (kocErr || !kocRow) return { success: false, error: kocErr?.message ?? "Không tạo được KOC" };
    kocId = (kocRow as any).koc_id;
    await supabase.from("koc_applications" as any).update({ koc_id: kocId } as any).eq("id", applicationId);
  }

  // Check if already in campaign_kocs
  const { data: existing } = await supabase
    .from("campaign_kocs")
    .select("campaign_koc_id")
    .eq("campaign_id", campaignId)
    .eq("koc_id", kocId!)
    .maybeSingle();

  if (existing) return { success: false, error: "KOC đã có trong campaign" };

  const appStatus = (app as any).status as string;
  const agencyStatus = (app as any).agency_status as string | null;
  const alreadyApproved = appStatus === "approved" || (appStatus === "rejected" && agencyStatus === "approved");

  // Add to campaign_kocs — bypass client approval queue if already approved on /review
  const { error: insertError } = await supabase.from("campaign_kocs").insert({
    campaign_id: campaignId,
    koc_id: kocId,
    client_approval_status: alreadyApproved ? "approved" : "pending",
    operation_status: 'in_progress' as const,
  } as any);

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function bulkAddApprovedToCampaign(
  campaignId: string
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const supabase = await createClient();

  // Get all effectively-approved applications (client approved OR agency overrode)
  const { data: apps, error: appsError } = await supabase
    .from("koc_applications" as any)
    .select("koc_id")
    .eq("campaign_id", campaignId)
    .or("status.eq.approved,agency_status.eq.approved")
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

  // Bulk-add only processes approved applications → skip client approval queue entirely
  const rows = newKocIds.map((kocId) => ({
    campaign_id: campaignId,
    koc_id: kocId,
    client_approval_status: "approved" as const,
    operation_status: "in_progress" as const,
  }));

  const { error: insertError } = await supabase.from("campaign_kocs").insert(rows as any);
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return {
    success: true,
    data: { added: newKocIds.length, skipped: existingIds.size },
  };
}

export async function submitAgencyReview(
  applicationId: string,
  campaignId: string,
  agencyStatus: "approved" | "rejected" | "shortlisted",
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("koc_applications" as any)
    .update({
      agency_status: agencyStatus,
      agency_reviewed_at: new Date().toISOString(),
      agency_review_note: note ?? null,
    } as any)
    .eq("id", applicationId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function resetAgencyReview(
  applicationId: string,
  campaignId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("koc_applications" as any)
    .update({
      agency_status: null,
      agency_reviewed_at: null,
      agency_review_note: null,
    } as any)
    .eq("id", applicationId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ─── Bulk import KOCs (already approved on TikTok) into a campaign ──────────

export type BulkImportKocRow = {
  tiktok_handle: string;
  tiktok_name: string;
  tiktok_url: string;
  follower_count: number;
  gmv_30d: number;
};

export async function bulkImportKocsToCampaign(
  campaignId: string,
  rows: BulkImportKocRow[]
): Promise<ActionResult<{ added: number; skipped: number; errors: string[] }>> {
  const supabase = await createClient();

  if (rows.length === 0) return { success: false, error: "Không có dòng nào để import" };
  if (rows.length > 500) return { success: false, error: "Tối đa 500 KOC mỗi lần import" };

  // Normalize + in-batch dedupe by handle.
  const seen = new Set<string>();
  const cleaned: BulkImportKocRow[] = [];
  const errors: string[] = [];

  for (const raw of rows) {
    let handle = (raw.tiktok_handle ?? "").trim();
    const url = (raw.tiktok_url ?? "").trim();
    if (!handle && url) {
      const m = url.match(/@([\w.-]+)/);
      if (m) handle = `@${m[1]}`;
    }
    if (!handle) {
      errors.push(`Bỏ qua dòng thiếu handle/URL: "${raw.tiktok_name || url || "?"}"`);
      continue;
    }
    const key = handle.toLowerCase().replace(/^@+/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({
      tiktok_handle: handle,
      tiktok_name: (raw.tiktok_name ?? "").trim() || handle,
      tiktok_url: url,
      follower_count: raw.follower_count || 0,
      gmv_30d: raw.gmv_30d || 0,
    });
  }

  if (cleaned.length === 0) {
    return { success: true, data: { added: 0, skipped: 0, errors } };
  }

  // Existing applications in this campaign (dedupe key: campaign + normalized handle).
  const { data: existingApps } = await supabase
    .from("koc_applications" as any)
    .select("tiktok_handle")
    .eq("campaign_id", campaignId);
  const existingHandles = new Set(
    ((existingApps ?? []) as any[]).map((a) =>
      String(a.tiktok_handle ?? "").trim().toLowerCase().replace(/^@+/, "")
    )
  );

  let added = 0;
  let skipped = 0;

  for (const row of cleaned) {
    const key = row.tiktok_handle.toLowerCase().replace(/^@+/, "");
    if (existingHandles.has(key)) {
      skipped++;
      continue;
    }

    // Resolve or create the master KOC. The tiktok_url unique index is partial,
    // so ON CONFLICT can't be used — find-or-insert instead.
    let kocId: string | null = null;
    if (row.tiktok_url) {
      const { data: byUrl } = await supabase
        .from("kocs")
        .select("koc_id")
        .eq("tiktok_url", row.tiktok_url)
        .maybeSingle();
      kocId = byUrl?.koc_id ?? null;
    }
    if (!kocId) {
      const { data: byHandle } = await supabase
        .from("kocs")
        .select("koc_id")
        .ilike("tiktok_handle", row.tiktok_handle)
        .limit(1)
        .maybeSingle();
      kocId = (byHandle as any)?.koc_id ?? null;
    }
    if (!kocId) {
      const { data: kocRow, error: kocErr } = await supabase
        .from("kocs")
        .insert({
          name: row.tiktok_name,
          tiktok_handle: row.tiktok_handle,
          tiktok_url: row.tiktok_url || null,
          follower: row.follower_count || null,
          status: "active",
        } as any)
        .select("koc_id")
        .single();
      if (kocErr || !kocRow) {
        errors.push(`${row.tiktok_handle}: ${kocErr?.message ?? "không tạo được KOC"}`);
        continue;
      }
      kocId = (kocRow as any).koc_id;
    }

    // Application row — holds GMV for the client portal; already approved on TikTok.
    const { error: appErr } = await supabase.from("koc_applications" as any).insert({
      campaign_id: campaignId,
      koc_id: kocId,
      tiktok_handle: row.tiktok_handle,
      tiktok_name: row.tiktok_name,
      tiktok_url: row.tiktok_url,
      follower_count: row.follower_count,
      gmv_30d: row.gmv_30d,
      zalo_phone: "",
      video_style: "",
      status: "approved",
    } as any);
    if (appErr) {
      errors.push(`${row.tiktok_handle}: ${appErr.message}`);
      continue;
    }

    // Campaign membership — approved, visible in the client portal immediately.
    const { data: existingCk } = await supabase
      .from("campaign_kocs")
      .select("campaign_koc_id")
      .eq("campaign_id", campaignId)
      .eq("koc_id", kocId!)
      .maybeSingle();
    if (!existingCk) {
      const { error: ckErr } = await supabase.from("campaign_kocs").insert({
        campaign_id: campaignId,
        koc_id: kocId,
        client_approval_status: "approved",
        operation_status: "in_progress",
      } as any);
      if (ckErr) {
        errors.push(`${row.tiktok_handle}: ${ckErr.message}`);
        continue;
      }
    }

    existingHandles.add(key);
    added++;
  }

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: { added, skipped, errors } };
}

export async function getCampaignRegistrationData(
  campaignId: string
): Promise<ActionResult<CampaignRegistrationData>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, registration_token, registration_open, registration_brief, registration_instructions, registration_thank_you, registration_form_config, review_token")
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
      registration_thank_you: (data as any).registration_thank_you ?? null,
      registration_form_config: (data as any).registration_form_config ?? null,
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
    registration_thank_you?: string | null;
    registration_form_config?: unknown | null;
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

// ─── Update Application Info ─────────────────────────────────────────────────

export async function updateApplicationInfo(
  applicationId: string,
  campaignId: string,
  data: {
    tiktok_handle: string;
    tiktok_name: string;
    tiktok_url: string;
    follower_count: number;
    gmv_30d: number;
    zalo_phone: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  // Update koc_applications
  const { data: app, error: appErr } = await (supabase
    .from("koc_applications" as any)
    .update({
      tiktok_handle: data.tiktok_handle,
      tiktok_name: data.tiktok_name,
      tiktok_url: data.tiktok_url,
      follower_count: data.follower_count,
      gmv_30d: data.gmv_30d,
      zalo_phone: data.zalo_phone,
    })
    .eq("id", applicationId)
    .select("koc_id")
    .single() as any);

  if (appErr) return { success: false, error: appErr.message };

  // Also update the linked kocs master record
  const kocId = (app as any)?.koc_id;
  if (kocId) {
    const { error: kocErr } = await supabase
      .from("kocs")
      .update({
        name: data.tiktok_name || data.tiktok_handle,
        tiktok_handle: data.tiktok_handle || null,
        tiktok_url: data.tiktok_url || null,
        follower: data.follower_count,
        phone: data.zalo_phone || null,
        zalo: data.zalo_phone || null,
      })
      .eq("koc_id", kocId);

    if (kocErr) return { success: false, error: kocErr.message };
  }

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ─── Row Color ──────────────────────────────────────────────────────────────

export async function updateApplicationRowColor(
  applicationId: string,
  campaignId: string,
  color: string | null
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("koc_applications" as any)
    .update({ row_color: color } as any)
    .eq("id", applicationId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ─── Admin Manual KOC Application ──────────────────────────────────────────

export async function adminAddKocApplication(
  campaignId: string,
  data: {
    tiktok_handle: string;
    tiktok_name: string;
    tiktok_url: string;
    follower_count: number;
    gmv_30d: number;
    zalo_phone: string;
    video_style: string;
    koc_id?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!data.tiktok_handle.trim() || !data.tiktok_name.trim() || !data.tiktok_url.trim()) {
    return { success: false, error: "TikTok Handle, Tên và URL không được trống" };
  }

  const { data: existingUrl } = await supabase
    .from("koc_applications" as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("tiktok_url", data.tiktok_url.trim())
    .maybeSingle();

  if (existingUrl) {
    return { success: false, error: "KOC này đã đăng ký campaign (trùng TikTok URL)" };
  }

  // Identity is the handle — block duplicates by handle (case-insensitive).
  const { data: existingHandle } = await supabase
    .from("koc_applications" as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .ilike("tiktok_handle", data.tiktok_handle.trim())
    .maybeSingle();

  if (existingHandle) {
    return { success: false, error: "KOC này đã đăng ký campaign (trùng handle TikTok)" };
  }

  let kocId = data.koc_id ?? null;
  if (!kocId && data.tiktok_url.trim()) {
    const url = data.tiktok_url.trim();
    // kocs.tiktok_url has only a PARTIAL unique index (WHERE tiktok_url IS NOT
    // NULL), which PostgREST's ON CONFLICT can't infer → find-or-insert instead.
    const { data: found } = await supabase
      .from("kocs")
      .select("koc_id")
      .eq("tiktok_url", url)
      .maybeSingle();

    if (found) {
      kocId = found.koc_id;
    } else {
      const { data: kocRow, error: kocErr } = await supabase
        .from("kocs")
        .insert({
          name: data.tiktok_name.trim(),
          tiktok_handle: data.tiktok_handle.trim() || null,
          tiktok_url: url,
          phone: data.zalo_phone.trim() || null,
          zalo: data.zalo_phone.trim() || null,
          follower: data.follower_count || null,
          status: "active",
        } as any)
        .select("koc_id")
        .single();

      if (kocErr) return { success: false, error: kocErr.message };
      kocId = kocRow?.koc_id ?? null;
    }
  }

  const { error: insertErr } = await supabase
    .from("koc_applications" as any)
    .insert({
      campaign_id: campaignId,
      koc_id: kocId,
      tiktok_handle: data.tiktok_handle.trim(),
      tiktok_name: data.tiktok_name.trim(),
      tiktok_url: data.tiktok_url.trim(),
      follower_count: data.follower_count || 0,
      gmv_30d: data.gmv_30d || 0,
      zalo_phone: data.zalo_phone.trim() || "",
      video_style: data.video_style || "",
      status: "pending",
    } as any);

  if (insertErr) return { success: false, error: insertErr.message };

  // Auto-add to the campaign (pending) so it shows in the client portal, like
  // a registration does — if not already present.
  if (kocId) {
    const { data: existingCk } = await supabase
      .from("campaign_kocs")
      .select("campaign_koc_id")
      .eq("campaign_id", campaignId)
      .eq("koc_id", kocId)
      .maybeSingle();

    if (!existingCk) {
      await supabase.from("campaign_kocs").insert({
        campaign_id: campaignId,
        koc_id: kocId,
        client_approval_status: "pending",
        operation_status: "in_progress",
      } as any);
    }
  }

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
