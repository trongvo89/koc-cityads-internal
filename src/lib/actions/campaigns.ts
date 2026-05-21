"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
  created_at: string;
};

export type CampaignKocRow = {
  campaign_koc_id: string;
  koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  operation_status: OperationStatus;
  address_status: string;
  sample_status: SampleStatus;
  content_status: string;
  client_approval_status: string;
  magic_link_token: string;
  magic_link_expires_at: string;
  receiver_name: string | null;
  receiver_address: string | null;
  video_url: string | null;
  internal_note: string | null;
  deadline_date: string | null;
};

export type CampaignDetail = {
  campaign_id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  brief: string | null;
  status: CampaignStatus;
  package_size: number;
  start_date: string | null;
  end_date: string | null;
  kocs: CampaignKocRow[];
};

export type ReminderKoc = {
  campaign_koc_id: string;
  koc_name: string;
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

  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, status, package_size, start_date, end_date, created_at, clients(company_name)")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const ids = (data ?? []).map((c) => c.campaign_id);
  const countMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: kocRows } = await supabase
      .from("campaign_kocs")
      .select("campaign_id")
      .in("campaign_id", ids);

    for (const k of kocRows ?? []) {
      countMap.set(k.campaign_id, (countMap.get(k.campaign_id) ?? 0) + 1);
    }
  }

  return {
    success: true,
    data: (data ?? []).map((c) => ({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      client_name: (c.clients as { company_name: string } | null)?.company_name ?? "—",
      status: c.status,
      package_size: c.package_size,
      koc_count: countMap.get(c.campaign_id) ?? 0,
      start_date: c.start_date,
      end_date: c.end_date,
      created_at: c.created_at,
    })),
  };
}

export async function getCampaignDetail(id: string): Promise<ActionResult<CampaignDetail>> {
  const supabase = await createClient();

  const { data: campaign, error: ce } = await supabase
    .from("campaigns")
    .select(
      "campaign_id, campaign_name, client_id, brief, status, package_size, start_date, end_date, clients(company_name)"
    )
    .eq("campaign_id", id)
    .single();

  if (ce || !campaign) return { success: false, error: ce?.message ?? "Campaign not found" };

  const { data: kocs, error: ke } = await supabase
    .from("campaign_kocs")
    .select(
      "campaign_koc_id, koc_id, operation_status, address_status, sample_status, content_status, client_approval_status, magic_link_token, magic_link_expires_at, receiver_name, receiver_address, video_url, internal_note, deadline_date, kocs(name, category)"
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
      package_size: campaign.package_size,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      kocs: (kocs ?? []).map((k) => ({
        campaign_koc_id: k.campaign_koc_id,
        koc_id: k.koc_id,
        koc_name: (k.kocs as { name: string; category: string[] | null } | null)?.name ?? "?",
        koc_category:
          (k.kocs as { name: string; category: string[] | null } | null)?.category ?? null,
        operation_status: k.operation_status,
        address_status: k.address_status,
        sample_status: k.sample_status,
        content_status: k.content_status,
        client_approval_status: k.client_approval_status,
        magic_link_token: k.magic_link_token,
        magic_link_expires_at: k.magic_link_expires_at,
        receiver_name: k.receiver_name,
        receiver_address: k.receiver_address,
        video_url: k.video_url,
        internal_note: k.internal_note,
        deadline_date: k.deadline_date,
      })),
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
      "campaign_koc_id, operation_status, magic_link_token, magic_link_expires_at, deadline_date, revision_note, kocs(name)"
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
      kocs: (kocs ?? []).map((k) => ({
        campaign_koc_id: k.campaign_koc_id,
        koc_name: (k.kocs as { name: string } | null)?.name ?? "?",
        operation_status: k.operation_status,
        magic_link_token: k.magic_link_token,
        magic_link_expires_at: k.magic_link_expires_at,
        deadline_date: k.deadline_date,
        revision_note: k.revision_note,
        reminder_count: notifCountMap.get(k.campaign_koc_id) ?? 0,
      })),
    },
  };
}

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

const CampaignSchema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  client_id: z.string().uuid("Vui lòng chọn client"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
});

export type CampaignFormData = z.infer<typeof CampaignSchema>;

export async function createCampaign(
  formData: CampaignFormData
): Promise<ActionResult<{ campaign_id: string }>> {
  const parsed = CampaignSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(parsed.data)
    .select("campaign_id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  return { success: true, data: { campaign_id: data.campaign_id } };
}

export async function updateCampaign(
  campaignId: string,
  formData: Partial<CampaignFormData>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update(formData)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

// ─── Campaign KOC Actions ─────────────────────────────────────────────────────

export async function addKocToCampaign(
  campaignId: string,
  kocId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("campaign_kocs").insert({
    campaign_id: campaignId,
    koc_id: kocId,
  });

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

// ─── Reminder Actions ─────────────────────────────────────────────────────────

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
