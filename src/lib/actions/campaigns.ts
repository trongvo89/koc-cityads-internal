"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types/app.types";
import type { CampaignStatus, OperationStatus, SampleStatus } from "@/lib/types/enums";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CampaignListItem = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  status: CampaignStatus;
  package_size: number;
  koc_count: number;
  start_date: string | null;
  end_date: string | null;
  brief: string | null;
  contract_value: number;
  deposit_paid_at: string | null;
  final_paid_at: string | null;
  created_at: string;
  ngay_chot_hd: string | null;
  assigned_to: string | null;
};

export type CampaignKocRow = {
  campaign_koc_id: string;
  koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  koc_phone: string | null;
  koc_zalo: string | null;
  operation_status: OperationStatus;
  address_status: string;
  sample_status: SampleStatus;
  content_status: string;
  client_approval_status: string;
  magic_link_token: string;
  magic_link_expires_at: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  receiver_province: string | null;
  video_url: string | null;
  internal_note: string | null;
  revision_note: string | null;
  deadline_date: string | null;
  client_video_feedback: string | null;
  client_video_feedback_at: string | null;
  client_quality_rating: number | null;
  koc_tiktok_handle: string | null;
  koc_tiktok_url: string | null;
  koc_follower: number | null;
  video_count: number;
  final_link: string[] | null;
  note_2: string | null;
  row_color: string | null;
};

export type CampaignDetail = {
  campaign_id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  brief: string | null;
  status: CampaignStatus;
  source: "manual" | "from_proposal";
  package_size: number;
  contract_value: number;
  deposit_paid_at: string | null;
  deposit_amount: number | null;
  deposit_invoice: string | null;
  final_paid_at: string | null;
  final_amount: number | null;
  final_invoice: string | null;
  start_date: string | null;
  end_date: string | null;
  kocs: CampaignKocRow[];
};

// Bonus/tier is super_admin-only — fetched separately via getCampaignBonus(),
// never returned by getCampaignDetail (which any internal user can call).
export type CampaignBonus = {
  tier_month: string | null;
  tier_percent: number | null;
  bonus_sale_pct: number;
  bonus_ops_pct: number;
};

export type ReminderKoc = {
  campaign_koc_id: string;
  koc_name: string;
  koc_phone: string | null;
  koc_zalo: string | null;
  operation_status: OperationStatus;
  magic_link_token: string;
  magic_link_expires_at: string;
  deadline_date: string | null;
  revision_note: string | null;
  reminder_count: number;
};

// ─── Read Actions ─────────────────────────────────────────────────────────────

export async function getCampaigns(): Promise<ActionResult<CampaignListItem[]>> {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, brief, status, package_size, contract_value, deposit_paid_at, final_paid_at, start_date, end_date, created_at, ngay_chot_hd, assigned_to, clients(company_name), campaign_kocs(count)")
    .order("created_at", { ascending: false }) as any) as { data: any[]; error: any };

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data ?? []).map((c) => ({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      client_name: (c.clients as { company_name: string } | null)?.company_name ?? "—",
      status: c.status,
      package_size: c.package_size,
      koc_count: Number((c.campaign_kocs as unknown as [{ count: number }])[0]?.count ?? 0),
      start_date: c.start_date,
      end_date: c.end_date,
      brief: c.brief,
      contract_value: c.contract_value,
      deposit_paid_at: c.deposit_paid_at ?? null,
      final_paid_at: c.final_paid_at ?? null,
      created_at: c.created_at,
      ngay_chot_hd: c.ngay_chot_hd ?? null,
      assigned_to: c.assigned_to ?? null,
    })),
  };
}

export async function getCampaignDetail(id: string): Promise<ActionResult<CampaignDetail>> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error: ce } = await (supabase
    .from("campaigns")
    .select(
      "campaign_id, campaign_name, client_id, brief, status, source, package_size, contract_value, deposit_paid_at, deposit_amount, deposit_invoice, final_paid_at, final_amount, final_invoice, start_date, end_date, clients(company_name)"
    )
    .eq("campaign_id", id)
    .single() as any) as { data: any; error: any };

  if (ce || !campaign) return { success: false, error: ce?.message ?? "Campaign not found" };

  const { data: kocs, error: ke } = await supabase
    .from("campaign_kocs")
    .select(
      "campaign_koc_id, koc_id, operation_status, address_status, sample_status, content_status, client_approval_status, magic_link_token, magic_link_expires_at, receiver_name, receiver_phone, receiver_address, receiver_province, video_url, internal_note, revision_note, deadline_date, client_video_feedback, client_video_feedback_at, client_quality_rating, video_count, final_link, note_2, row_color, kocs(name, category, phone, zalo, tiktok_handle, tiktok_url, follower)"
    )
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });

  if (ke) return { success: false, error: ke.message };

  return {
    success: true,
    data: {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      client_id: campaign.client_id,
      client_name: (campaign.clients as { company_name: string } | null)?.company_name ?? "—",
      brief: campaign.brief,
      status: campaign.status,
      source: (campaign.source as "manual" | "from_proposal") ?? "manual",
      package_size: campaign.package_size,
      contract_value: campaign.contract_value ?? 0,
      deposit_paid_at: campaign.deposit_paid_at ?? null,
      deposit_amount: campaign.deposit_amount ?? null,
      deposit_invoice: campaign.deposit_invoice ?? null,
      final_paid_at: campaign.final_paid_at ?? null,
      final_amount: campaign.final_amount ?? null,
      final_invoice: campaign.final_invoice ?? null,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      kocs: (kocs ?? []).map((k) => {
        const kocData = k.kocs as { name: string; category: string[] | null; phone: string | null; zalo: string | null; tiktok_handle: string | null; tiktok_url: string | null; follower: number | null } | null;
        return {
        campaign_koc_id: k.campaign_koc_id,
        koc_id: k.koc_id,
        koc_name: kocData?.name ?? "?",
        koc_category: kocData?.category ?? null,
        koc_phone: kocData?.phone ?? null,
        koc_zalo: kocData?.zalo ?? null,
        koc_tiktok_handle: kocData?.tiktok_handle ?? null,
        koc_tiktok_url: kocData?.tiktok_url ?? null,
        koc_follower: kocData?.follower ?? null,
        operation_status: k.operation_status,
        address_status: k.address_status,
        sample_status: k.sample_status,
        content_status: k.content_status,
        client_approval_status: k.client_approval_status,
        magic_link_token: k.magic_link_token,
        magic_link_expires_at: k.magic_link_expires_at,
        receiver_name: k.receiver_name,
        receiver_phone: k.receiver_phone,
        receiver_address: k.receiver_address,
        receiver_province: k.receiver_province,
        video_url: k.video_url,
        internal_note: k.internal_note,
        revision_note: k.revision_note,
        deadline_date: k.deadline_date,
        client_video_feedback: k.client_video_feedback,
        client_video_feedback_at: k.client_video_feedback_at,
        client_quality_rating: k.client_quality_rating,
        video_count: k.video_count ?? 0,
        final_link: Array.isArray(k.final_link)
          ? k.final_link
          : k.final_link
          ? [k.final_link]
          : null,
        note_2: k.note_2 ?? null,
        row_color: k.row_color ?? null,
        };
      }),
    },
  };
}

export async function getCampaignReminders(
  campaignId: string
): Promise<ActionResult<{ campaign_name: string; kocs: ReminderKoc[] }>> {
  const supabase = await createClient();

  const { data: campaign, error: ce } = await supabase
    .from("campaigns")
    .select("campaign_name")
    .eq("campaign_id", campaignId)
    .single();

  if (ce || !campaign) return { success: false, error: ce?.message ?? "Not found" };

  const { data: kocs, error: ke } = await supabase
    .from("campaign_kocs")
    .select(
      "campaign_koc_id, operation_status, magic_link_token, magic_link_expires_at, deadline_date, revision_note, kocs(name, phone, zalo)"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (ke) return { success: false, error: ke.message };

  const kocIds = (kocs ?? []).map((k) => k.campaign_koc_id);
  const notifCountMap = new Map<string, number>();

  if (kocIds.length > 0) {
    const { data: notifs } = await supabase
      .from("notifications")
      .select("campaign_koc_id")
      .in("campaign_koc_id", kocIds);

    for (const n of notifs ?? []) {
      notifCountMap.set(n.campaign_koc_id, (notifCountMap.get(n.campaign_koc_id) ?? 0) + 1);
    }
  }

  return {
    success: true,
    data: {
      campaign_name: campaign.campaign_name,
      kocs: (kocs ?? []).map((k) => {
        const kocData = k.kocs as { name: string; phone: string | null; zalo: string | null } | null;
        return {
          campaign_koc_id: k.campaign_koc_id,
          koc_name: kocData?.name ?? "?",
          koc_phone: kocData?.phone ?? null,
          koc_zalo: kocData?.zalo ?? null,
          operation_status: k.operation_status,
          magic_link_token: k.magic_link_token,
          magic_link_expires_at: k.magic_link_expires_at,
          deadline_date: k.deadline_date,
          revision_note: k.revision_note,
          reminder_count: notifCountMap.get(k.campaign_koc_id) ?? 0,
        };
      }),
    },
  };
}

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

const CampaignSchema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  client_id: z.string().uuid("Vui lòng chọn client"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  contract_value: z.number().int().min(0, "Giá trị hợp đồng không được âm"),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
  ngay_chot_hd: z.string().min(1, "Ngày chốt HĐ không được trống").nullable().optional(),
  assigned_to: z.string().uuid("Vui lòng chọn nhân viên").nullable().optional(),
});

export type CampaignFormData = z.infer<typeof CampaignSchema>;

export async function createCampaign(
  formData: CampaignFormData
): Promise<ActionResult<{ campaign_id: string }>> {
  const parsed = CampaignSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const insertData = {
    ...parsed.data,
    tier_month: parsed.data.ngay_chot_hd
      ? parsed.data.ngay_chot_hd.substring(0, 7)
      : null,
  };

  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("campaigns")
    .insert(insertData as any)
    .select("campaign_id")
    .single() as any);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  return { success: true, data: { campaign_id: data.campaign_id } };
}

export async function updateCampaign(
  campaignId: string,
  formData: Partial<CampaignFormData>
): Promise<ActionResult> {
  const supabase = await createClient();

  // Whitelist: only fields defined on CampaignSchema are writable. This strips
  // any injected keys (e.g. tier_percent/bonus_*) so operators can't tamper with
  // super_admin-only bonus/tier via a crafted request. (bonus/tier are also
  // REVOKEd at the DB layer.)
  const parsed = CampaignSchema.partial().safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Guard: if campaign's tier is locked, don't allow changing ngay_chot_hd to a
  // different month. Bonus/tier lives in the super_admin-only campaign_bonus
  // table; read lock state via the service-role client (server-side only, exposes
  // nothing to the caller) so the guard also applies to operator/admin editors.
  if (parsed.data.ngay_chot_hd) {
    const admin = createAdminClient() as any;
    const [{ data: camp }, { data: bonus }] = await Promise.all([
      admin.from("campaigns").select("tier_month").eq("campaign_id", campaignId).single(),
      admin.from("campaign_bonus").select("tier_percent").eq("campaign_id", campaignId).maybeSingle(),
    ]);

    const newTierMonth = parsed.data.ngay_chot_hd.substring(0, 7);
    if (bonus?.tier_percent != null && camp?.tier_month !== newTierMonth) {
      return {
        success: false,
        error: "Không thể đổi tháng chốt HĐ khi tier đã được khóa",
      };
    }
  }

  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.ngay_chot_hd !== undefined) {
    updateData.tier_month = parsed.data.ngay_chot_hd
      ? parsed.data.ngay_chot_hd.substring(0, 7)
      : null;
  }

  const { error } = await (supabase
    .from("campaigns")
    .update(updateData as any)
    .eq("campaign_id", campaignId) as any);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/client/campaigns");
  revalidatePath("/client/dashboard");
  return { success: true, data: undefined };
}

export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // campaign_kocs uses ON DELETE RESTRICT — delete children first
  const { error: kocError } = await supabase
    .from("campaign_kocs")
    .delete()
    .eq("campaign_id", campaignId);

  if (kocError) return { success: false, error: kocError.message };

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  revalidatePath("/admin/dashboard");
  revalidatePath("/client/campaigns");
  revalidatePath("/client/dashboard");
  return { success: true, data: undefined };
}

// ─── Campaign KOC Actions ─────────────────────────────────────────────────────

export async function addKocToCampaign(
  campaignId: string,
  kocId: string
): Promise<ActionResult> {
  return addKocsToCampaign(campaignId, [kocId]);
}

export async function addKocsToCampaign(
  campaignId: string,
  kocIds: string[]
): Promise<ActionResult> {
  if (kocIds.length === 0) return { success: true, data: undefined };

  const supabase = await createClient();

  const rows = kocIds.map((kocId) => ({
    campaign_id: campaignId,
    koc_id: kocId,
    operation_status: 'in_progress' as const,
  }));

  const { error } = await supabase.from("campaign_kocs").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function removeKocFromCampaign(
  campaignKocId: string,
  campaignId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_kocs")
    .delete()
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function updateCampaignKocStatus(
  campaignKocId: string,
  campaignId: string,
  updates: {
    operation_status?: OperationStatus;
    sample_status?: SampleStatus;
    internal_note?: string;
    revision_note?: string | null;
    deadline_date?: string | null;
    shipping_code?: string | null;
    shipping_provider?: string | null;
    sample_sent_at?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_kocs")
    .update(updates)
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function updateCampaignKocField(
  campaignKocId: string,
  campaignId: string,
  field: string,
  value: string | number | null
): Promise<ActionResult> {
  const allowed = new Set(["video_count", "internal_note", "note_2", "video_url", "row_color"]);
  if (!allowed.has(field)) return { success: false, error: "Invalid field" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_kocs")
    .update({ [field]: value } as any)
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function updateCampaignKocLinks(
  campaignKocId: string,
  campaignId: string,
  links: string[]
): Promise<ActionResult> {
  const cleaned = links.map((l) => l.trim()).filter(Boolean);
  const value = cleaned.length > 0 ? cleaned : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_kocs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ final_link: value } as any)
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function adminUpdateAddress(
  campaignKocId: string,
  campaignId: string,
  data: {
    receiver_name: string;
    receiver_phone: string | null;
    receiver_address: string | null;
    receiver_province: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("campaign_kocs")
    .select("operation_status")
    .eq("campaign_koc_id", campaignKocId)
    .single();

  const preAddressStatuses = new Set(["client_approved", "waiting_address"]);
  const shouldAdvance = current && preAddressStatuses.has(current.operation_status);

  const { error } = await supabase
    .from("campaign_kocs")
    .update({
      receiver_name: data.receiver_name,
      receiver_phone: data.receiver_phone,
      receiver_address: data.receiver_address,
      receiver_province: data.receiver_province,
      address_status: "submitted",
      ...(shouldAdvance && { operation_status: "address_submitted" }),
    })
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ─── Reminder Actions ─────────────────────────────────────────────────────────

export async function renewMagicLink(
  campaignKocId: string,
  campaignId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const newToken = crypto.randomUUID();
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("campaign_kocs")
    .update({ magic_link_token: newToken, magic_link_expires_at: newExpiry })
    .eq("campaign_koc_id", campaignKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath(`/admin/campaigns/${campaignId}/reminders`);
  return { success: true, data: undefined };
}

export async function markAsReminded(
  campaignKocId: string,
  campaignId: string,
  message: string,
  type: "address_request" | "address_reminder" | "sample_check" | "sample_reminder" | "video_brief" | "video_reminder" | "revision_request" | "custom"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    campaign_koc_id: campaignKocId,
    channel: "zalo_manual",
    type,
    status: "copied",
    message,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}/reminders`);
  return { success: true, data: undefined };
}

// ─── Payment Tracking ────────────────────────────────────────────────────────

export async function markPaymentReceived(
  campaignId: string,
  paymentType: "deposit" | "final",
  amount: number,
  invoice: string | null,
  paidDate: string // "YYYY-MM-DD" — ngày thực nhận tiền
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Chưa đăng nhập" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["super_admin", "admin", "operator"].includes(profile?.role ?? "")) {
    return { success: false, error: "Không có quyền thực hiện" };
  }

  // Guard: block payment on cancelled campaigns
  const { data: campaignCheck } = await supabase
    .from("campaigns")
    .select("status")
    .eq("campaign_id", campaignId)
    .single();
  if (campaignCheck?.status === "cancelled") {
    return { success: false, error: "Campaign đã bị hủy, không thể nhập thanh toán" };
  }

  // Store noon UTC on the given date so month attribution is unambiguous
  const paidAt = new Date(`${paidDate}T12:00:00Z`).toISOString();

  const isDeposit = paymentType === "deposit";
  const patch = isDeposit
    ? { deposit_paid_at: paidAt, deposit_amount: amount, deposit_invoice: invoice || null }
    : { final_paid_at: paidAt, final_amount: amount, final_invoice: invoice || null };

  const { error } = await (supabase
    .from("campaigns")
    .update(patch as any)
    .eq("campaign_id", campaignId) as any);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/reports");
  return { success: true, data: undefined };
}

export async function clearPaymentDate(
  campaignId: string,
  paymentType: "deposit" | "final"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Chưa đăng nhập" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["super_admin", "admin", "operator"].includes(profile?.role ?? "")) {
    return { success: false, error: "Không có quyền thực hiện" };
  }

  const patch = paymentType === "deposit"
    ? { deposit_paid_at: null, deposit_amount: null, deposit_invoice: null }
    : { final_paid_at: null, final_amount: null, final_invoice: null };

  const { error } = await (supabase
    .from("campaigns")
    .update(patch as any)
    .eq("campaign_id", campaignId) as any);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/reports");
  return { success: true, data: undefined };
}

// ─── Update KOC Profile (master data) ───────────────────────────────────────

export async function updateKocProfile(
  kocId: string,
  campaignId: string,
  data: {
    name: string;
    tiktok_handle: string | null;
    tiktok_url: string | null;
    follower: number | null;
    phone: string | null;
    zalo: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("kocs")
    .update({
      name: data.name,
      tiktok_handle: data.tiktok_handle || null,
      tiktok_url: data.tiktok_url || null,
      follower: data.follower,
      phone: data.phone || null,
      zalo: data.zalo || null,
    })
    .eq("koc_id", kocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
