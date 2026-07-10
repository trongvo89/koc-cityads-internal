"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { KocStatus } from "@/lib/types/enums";

export type KocListItem = {
  koc_id: string;
  name: string;
  category: string[] | null;
  phone: string | null;
  zalo: string | null;
  status: KocStatus;
  follower: number | null;
  location: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  avatar_url: string | null;
  default_address: string | null;
  active_campaign_count: number;
  avg_rating: number | null;
  total_campaigns: number;
};

export type KocCampaignHistory = {
  campaign_koc_id: string;
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string | null;
  end_date: string | null;
  video_url: string | null;
  video_submitted_at: string | null;
  client_quality_rating: number | null;
  client_quality_review: string | null;
  client_video_feedback: string | null;
  final_status: string;
  operation_status: string;
  completed_at: string | null;
};

export type KocProfile = KocListItem & {
  email: string | null;
  facebook_url: string | null;
  note: string | null;
  completed_campaigns: number;
  video_count: number;
  rating_count: number;
  history: KocCampaignHistory[];
};

export async function getKocs(): Promise<ActionResult<KocListItem[]>> {
  const supabase = await createClient();

  const [{ data: kocs, error: ke }, { data: counts, error: cnte }, { data: perf, error: pe }] =
    await Promise.all([
      supabase
        .from("kocs")
        .select(
          "koc_id, name, category, phone, zalo, status, follower, location, tiktok_url, instagram_url, facebook_url, avatar_url, default_address"
        )
        .order("name"),
      supabase.from("koc_active_campaign_counts").select("koc_id, active_campaign_count"),
      supabase
        .from("koc_performance_summary")
        .select("koc_id, avg_rating, total_campaigns"),
    ]);

  if (ke) return { success: false, error: ke.message };
  if (cnte) return { success: false, error: cnte.message };
  if (pe) return { success: false, error: pe.message };

  const countMap = new Map((counts ?? []).map((c) => [c.koc_id, c.active_campaign_count ?? 0]));
  const perfMap = new Map(
    (perf ?? []).map((p) => [p.koc_id, { avg_rating: p.avg_rating, total_campaigns: Number(p.total_campaigns ?? 0) }])
  );

  return {
    success: true,
    data: (kocs ?? []).map((k) => ({
      ...k,
      active_campaign_count: countMap.get(k.koc_id) ?? 0,
      avg_rating: perfMap.get(k.koc_id)?.avg_rating ?? null,
      total_campaigns: perfMap.get(k.koc_id)?.total_campaigns ?? 0,
    })),
  };
}

// ─── Lightweight KOC search for application dialog ──────────────────────────

export type KocSearchItem = {
  koc_id: string;
  name: string;
  tiktok_handle: string | null;
  tiktok_url: string | null;
  phone: string | null;
  zalo: string | null;
  follower: number | null;
};

export async function searchKocsForApplication(): Promise<ActionResult<KocSearchItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kocs")
    .select("koc_id, name, tiktok_handle, tiktok_url, phone, zalo, follower")
    .eq("status", "active")
    .order("name");

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as KocSearchItem[] };
}

export async function getKocById(kocId: string): Promise<ActionResult<KocListItem>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kocs")
    .select(
      "koc_id, name, category, phone, zalo, status, follower, location, tiktok_url, instagram_url, facebook_url, avatar_url, default_address"
    )
    .eq("koc_id", kocId)
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Not found" };

  return {
    success: true,
    data: { ...data, active_campaign_count: 0, avg_rating: null, total_campaigns: 0 },
  };
}

const KocSchema = z.object({
  name: z.string().min(1, "Tên không được trống"),
  phone: z.string().nullable().optional(),
  zalo: z.string().nullable().optional(),
  email: z.string().email("Email không hợp lệ").nullable().optional().or(z.literal("")),
  tiktok_url: z.string().url("URL TikTok không hợp lệ").nullable().optional().or(z.literal("")),
  instagram_url: z
    .string()
    .url("URL Instagram không hợp lệ")
    .nullable()
    .optional()
    .or(z.literal("")),
  facebook_url: z
    .string()
    .url("URL Facebook không hợp lệ")
    .nullable()
    .optional()
    .or(z.literal("")),
  avatar_url: z.string().nullable().optional(),
  category: z.array(z.string()).nullable().optional(),
  location: z.string().nullable().optional(),
  follower: z.number().int().nullable().optional(),
  default_address: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]),
});

export type KocFormData = z.infer<typeof KocSchema>;

export async function createKoc(formData: KocFormData): Promise<ActionResult<{ koc_id: string }>> {
  const parsed = KocSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const data = {
    ...parsed.data,
    email: parsed.data.email || null,
    tiktok_url: parsed.data.tiktok_url || null,
    instagram_url: parsed.data.instagram_url || null,
    facebook_url: parsed.data.facebook_url || null,
  };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("kocs")
    .insert(data)
    .select("koc_id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/kocs");
  return { success: true, data: { koc_id: created.koc_id } };
}

export async function updateKoc(
  kocId: string,
  formData: Partial<KocFormData>
): Promise<ActionResult> {
  const data = {
    ...formData,
    email: formData.email || null,
    tiktok_url: formData.tiktok_url || null,
    instagram_url: formData.instagram_url || null,
    facebook_url: formData.facebook_url || null,
  };

  const supabase = await createClient();

  // Update koc profile
  const { data: updatedKoc, error } = await supabase
    .from("kocs")
    .update(data)
    .eq("koc_id", kocId)
    .select("name, phone, default_address, location")
    .single();

  if (error) return { success: false, error: error.message };

  // Propagate new default_address to active campaign records that have no address yet
  if (updatedKoc?.default_address) {
    await supabase
      .from("campaign_kocs")
      .update({
        receiver_name: updatedKoc.name,
        receiver_phone: updatedKoc.phone ?? null,
        receiver_address: updatedKoc.default_address,
        receiver_province: updatedKoc.location ?? null,
        address_status: "submitted",
      })
      .eq("koc_id", kocId)
      .is("receiver_address", null)
      // Active campaign rows are "in_progress" post-simplify (were granular).
      .eq("operation_status", "in_progress");
  }

  revalidatePath("/admin/kocs");
  return { success: true, data: undefined };
}

export async function deleteKoc(kocId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("kocs").delete().eq("koc_id", kocId);
  if (error) {
    const msg = error.message.includes("foreign key")
      ? "KOC đang trong campaign, không thể xóa."
      : error.message;
    return { success: false, error: msg };
  }
  revalidatePath("/admin/kocs");
  return { success: true, data: undefined };
}

export async function bulkDeleteKocs(
  kocIds: string[]
): Promise<ActionResult<{ deleted: number; failed: number }>> {
  if (kocIds.length === 0) return { success: false, error: "Không có KOC nào được chọn." };
  const supabase = await createClient();

  let deleted = 0;
  let failed = 0;
  for (const id of kocIds) {
    const { error } = await supabase.from("kocs").delete().eq("koc_id", id);
    if (error) failed++;
    else deleted++;
  }

  revalidatePath("/admin/kocs");
  return { success: true, data: { deleted, failed } };
}

export async function getKocProfile(kocId: string): Promise<ActionResult<KocProfile>> {
  const supabase = await createClient();

  const [{ data: koc, error: ke }, { data: perf, error: pe }, { data: history, error: he }] =
    await Promise.all([
      supabase
        .from("kocs")
        .select(
          "koc_id, name, category, phone, zalo, email, status, follower, location, tiktok_url, instagram_url, facebook_url, avatar_url, default_address, note"
        )
        .eq("koc_id", kocId)
        .single(),
      supabase
        .from("koc_performance_summary")
        .select("avg_rating, total_campaigns, completed_campaigns, video_count, rating_count")
        .eq("koc_id", kocId)
        .single(),
      supabase
        .from("campaign_kocs")
        .select(
          "campaign_koc_id, video_url, video_submitted_at, client_quality_rating, client_quality_review, client_video_feedback, final_status, operation_status, completed_at, campaigns(campaign_id, campaign_name, start_date, end_date, clients(company_name))"
        )
        .eq("koc_id", kocId)
        .order("created_at", { ascending: false }),
    ]);

  if (ke || !koc) return { success: false, error: ke?.message ?? "KOC not found" };
  if (pe) return { success: false, error: pe.message };
  if (he) return { success: false, error: he.message };

  const stats = perf ?? { avg_rating: null, total_campaigns: 0, completed_campaigns: 0, video_count: 0, rating_count: 0 };

  return {
    success: true,
    data: {
      ...koc,
      active_campaign_count: 0,
      avg_rating: stats.avg_rating ?? null,
      total_campaigns: Number(stats.total_campaigns ?? 0),
      completed_campaigns: Number(stats.completed_campaigns ?? 0),
      video_count: Number(stats.video_count ?? 0),
      rating_count: Number(stats.rating_count ?? 0),
      history: (history ?? []).map((h) => {
        const camp = h.campaigns as { campaign_id: string; campaign_name: string; start_date: string | null; end_date: string | null; clients: { company_name: string } | null } | null;
        return {
          campaign_koc_id: h.campaign_koc_id,
          campaign_id: camp?.campaign_id ?? "",
          campaign_name: camp?.campaign_name ?? "—",
          client_name: camp?.clients?.company_name ?? "—",
          start_date: camp?.start_date ?? null,
          end_date: camp?.end_date ?? null,
          video_url: h.video_url,
          video_submitted_at: h.video_submitted_at,
          client_quality_rating: h.client_quality_rating,
          client_quality_review: h.client_quality_review,
          client_video_feedback: h.client_video_feedback,
          final_status: h.final_status,
          operation_status: h.operation_status,
          completed_at: h.completed_at,
        };
      }),
    },
  };
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

export type BulkKocRow = {
  name: string;
  tiktok_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  phone?: string | null;
  zalo?: string | null;
  follower?: number | null;
  location?: string | null;
  category?: string[] | null;
};

export async function bulkCreateKocs(
  rows: BulkKocRow[]
): Promise<ActionResult<{ created: number; skipped: string[]; duplicates: number }>> {
  if (rows.length === 0) return { success: false, error: "Không có dữ liệu để import." };
  if (rows.length > 500) return { success: false, error: "Tối đa 500 KOC mỗi lần import." };

  const valid = rows.filter((r) => r.name?.trim());
  if (valid.length === 0) return { success: false, error: "Không có hàng nào có tên hợp lệ." };

  const supabase = await createClient();

  // ── Duplicate check against DB ───────────────────────────────────────────────
  const nameList = [...new Set(valid.map((r) => r.name.trim()))];
  const urlList = [...new Set(valid.map((r) => r.tiktok_url?.trim()).filter((u): u is string => !!u))];

  const [{ data: byName }, { data: byUrl }] = await Promise.all([
    supabase.from("kocs").select("name, tiktok_url").in("name", nameList),
    urlList.length > 0
      ? supabase.from("kocs").select("name, tiktok_url").in("tiktok_url", urlList)
      : Promise.resolve({ data: [] as { name: string; tiktok_url: string | null }[] }),
  ]);

  const existingNames = new Set([
    ...(byName ?? []).map((k) => k.name.toLowerCase()),
    ...(byUrl ?? []).map((k) => k.name.toLowerCase()),
  ]);
  const existingUrls = new Set([
    ...(byName ?? []).map((k) => k.tiktok_url).filter(Boolean),
    ...(byUrl ?? []).map((k) => k.tiktok_url).filter(Boolean),
  ]);

  const duplicateNames: string[] = [];
  const toInsert = valid.filter((r) => {
    const nameDupe = existingNames.has(r.name.trim().toLowerCase());
    const urlDupe = !!(r.tiktok_url?.trim() && existingUrls.has(r.tiktok_url.trim()));
    if (nameDupe || urlDupe) {
      duplicateNames.push(r.name.trim());
      return false;
    }
    return true;
  });
  // ─────────────────────────────────────────────────────────────────────────────

  const skipped = rows
    .filter((r) => !r.name?.trim())
    .map((_, i) => `Hàng ${i + 1}`);

  if (toInsert.length === 0) {
    revalidatePath("/admin/kocs");
    return { success: true, data: { created: 0, skipped, duplicates: duplicateNames.length } };
  }

  const inserts = toInsert.map((r) => ({
    name: r.name.trim(),
    tiktok_url: r.tiktok_url || null,
    instagram_url: r.instagram_url || null,
    facebook_url: r.facebook_url || null,
    phone: r.phone || null,
    zalo: r.zalo || null,
    follower: r.follower ?? null,
    location: r.location || null,
    category: r.category?.length ? r.category : null,
    status: "active" as const,
  }));

  const { error } = await supabase.from("kocs").insert(inserts);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/kocs");
  return { success: true, data: { created: inserts.length, skipped, duplicates: duplicateNames.length } };
}
