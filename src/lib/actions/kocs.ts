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
  active_campaign_count: number;
};

export async function getKocs(): Promise<ActionResult<KocListItem[]>> {
  const supabase = await createClient();

  const [{ data: kocs, error: ke }, { data: counts, error: cnte }] = await Promise.all([
    supabase
      .from("kocs")
      .select(
        "koc_id, name, category, phone, zalo, status, follower, location, tiktok_url, instagram_url"
      )
      .order("name"),
    supabase.from("koc_active_campaign_counts").select("koc_id, active_campaign_count"),
  ]);

  if (ke) return { success: false, error: ke.message };
  if (cnte) return { success: false, error: cnte.message };

  const countMap = new Map((counts ?? []).map((c) => [c.koc_id, c.active_campaign_count ?? 0]));

  return {
    success: true,
    data: (kocs ?? []).map((k) => ({
      ...k,
      active_campaign_count: countMap.get(k.koc_id) ?? 0,
    })),
  };
}

export async function getKocById(kocId: string): Promise<ActionResult<KocListItem>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kocs")
    .select(
      "koc_id, name, category, phone, zalo, status, follower, location, tiktok_url, instagram_url"
    )
    .eq("koc_id", kocId)
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Not found" };

  return {
    success: true,
    data: { ...data, active_campaign_count: 0 },
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
  const { error } = await supabase.from("kocs").update(data).eq("koc_id", kocId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/kocs");
  return { success: true, data: undefined };
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
): Promise<ActionResult<{ created: number; skipped: string[] }>> {
  if (rows.length === 0) return { success: false, error: "Không có dữ liệu để import." };
  if (rows.length > 500) return { success: false, error: "Tối đa 500 KOC mỗi lần import." };

  const valid = rows.filter((r) => r.name?.trim());
  if (valid.length === 0) return { success: false, error: "Không có hàng nào có tên hợp lệ." };

  const supabase = await createClient();
  const inserts = valid.map((r) => ({
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

  const skipped = rows
    .filter((r) => !r.name?.trim())
    .map((_, i) => `Hàng ${i + 1}`);

  revalidatePath("/admin/kocs");
  return { success: true, data: { created: inserts.length, skipped } };
}
