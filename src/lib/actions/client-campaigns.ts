"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { CampaignStatus, ClientApprovalStatus, ContentStatus } from "@/lib/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientCampaignListItem = {
  campaign_id: string;
  campaign_name: string;
  status: CampaignStatus;
  package_size: number;
  koc_count: number;
  pending_approval: number;
  approved_count: number;
  start_date: string | null;
  end_date: string | null;
};

export type ClientKocRow = {
  campaign_koc_id: string;
  koc_id: string;
  koc_name: string;
  category: string[] | null;
  follower: number | null;
  location: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  content_status: ContentStatus | null;
  client_approval_status: ClientApprovalStatus;
  client_note: string | null;
  video_url: string | null;
  deadline_date: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  receiver_province: string | null;
};

export type ClientCampaignDetail = {
  campaign_id: string;
  campaign_name: string;
  client_id: string;
  status: CampaignStatus;
  package_size: number;
  start_date: string | null;
  end_date: string | null;
  brief: string | null;
  kocs: ClientKocRow[];
};

export type ClientMetrics = {
  total_campaigns: number;
  active_campaigns: number;
  pending_approval: number;
};

// ─── Read Actions ─────────────────────────────────────────────────────────────

export async function getClientCampaigns(): Promise<
  ActionResult<ClientCampaignListItem[]>
> {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, status, package_size, start_date, end_date")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const ids = (campaigns ?? []).map((c) => c.campaign_id);
  const kocCountMap = new Map<string, number>();
  const pendingMap = new Map<string, number>();
  const approvedMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: kocs } = await supabase
      .from("campaign_kocs")
      .select("campaign_id, client_approval_status")
      .in("campaign_id", ids)
      // Only sent_to_client or beyond are visible to client
      .in("operation_status", [
        "sent_to_client", "client_approved", "client_rejected",
        "waiting_address", "address_submitted", "waiting_sample_sent",
        "sample_sent", "sample_received", "waiting_video",
        "video_submitted", "need_revision", "video_approved", "completed",
      ]);

    for (const k of kocs ?? []) {
      kocCountMap.set(k.campaign_id, (kocCountMap.get(k.campaign_id) ?? 0) + 1);
      if (k.client_approval_status === "pending") {
        pendingMap.set(k.campaign_id, (pendingMap.get(k.campaign_id) ?? 0) + 1);
      }
      if (k.client_approval_status === "approved") {
        approvedMap.set(k.campaign_id, (approvedMap.get(k.campaign_id) ?? 0) + 1);
      }
    }
  }

  return {
    success: true,
    data: (campaigns ?? []).map((c) => ({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      status: c.status,
      package_size: c.package_size,
      koc_count: kocCountMap.get(c.campaign_id) ?? 0,
      pending_approval: pendingMap.get(c.campaign_id) ?? 0,
      approved_count: approvedMap.get(c.campaign_id) ?? 0,
      start_date: c.start_date,
      end_date: c.end_date,
    })),
  };
}

export async function getClientCampaignDetail(
  campaignId: string
): Promise<ActionResult<ClientCampaignDetail>> {
  const supabase = await createClient();

  const [{ data: campaign, error: ce }, { data: viewRows, error: ve }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select(
          "campaign_id, campaign_name, client_id, status, package_size, start_date, end_date, brief"
        )
        .eq("campaign_id", campaignId)
        .single(),
      supabase
        .from("client_campaign_kocs_view")
        .select("*")
        .eq("campaign_id", campaignId),
    ]);

  if (ce || !campaign) return { success: false, error: ce?.message ?? "Campaign not found" };
  if (ve) return { success: false, error: ve.message };

  return {
    success: true,
    data: {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      client_id: campaign.client_id,
      status: campaign.status,
      package_size: campaign.package_size,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      brief: campaign.brief,
      kocs: (viewRows ?? []).map((r) => ({
        campaign_koc_id: r.campaign_koc_id!,
        koc_id: r.koc_id!,
        koc_name: r.name ?? "?",
        category: r.category,
        follower: r.follower,
        location: r.location,
        tiktok_url: r.tiktok_url,
        instagram_url: r.instagram_url,
        facebook_url: r.facebook_url,
        content_status: r.content_status as ContentStatus | null,
        client_approval_status: (r.client_approval_status ?? "pending") as ClientApprovalStatus,
        client_note: r.client_note,
        video_url: r.video_url,
        deadline_date: r.deadline_date,
        receiver_name: r.receiver_name,
        receiver_phone: r.receiver_phone,
        receiver_address: r.receiver_address,
        receiver_province: r.receiver_province,
      })),
    },
  };
}

export async function getClientMetrics(): Promise<ActionResult<ClientMetrics>> {
  const supabase = await createClient();

  const { data: campaigns, error: ce } = await supabase
    .from("campaigns")
    .select("campaign_id, status");

  if (ce) return { success: false, error: ce.message };

  const ids = (campaigns ?? []).map((c) => c.campaign_id);
  let pendingApproval = 0;

  if (ids.length > 0) {
    const { data: kocs } = await supabase
      .from("campaign_kocs")
      .select("client_approval_status")
      .in("campaign_id", ids)
      .eq("operation_status", "sent_to_client");

    pendingApproval = (kocs ?? []).filter(
      (k) => k.client_approval_status === "pending"
    ).length;
  }

  return {
    success: true,
    data: {
      total_campaigns: (campaigns ?? []).length,
      active_campaigns: (campaigns ?? []).filter((c) => c.status === "active").length,
      pending_approval: pendingApproval,
    },
  };
}

// ─── Approval Action ──────────────────────────────────────────────────────────

export async function approveKoc(
  campaignKocId: string,
  campaignId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("client_approve_koc", {
    p_campaign_koc_id: campaignKocId,
    p_status: status,
    ...(note ? { p_note: note } : {}),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/client/campaigns/${campaignId}`);
  revalidatePath("/client/dashboard");
  return { success: true, data: undefined };
}
