"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type {
  CampaignStatus,
  ClientApprovalStatus,
  ContentStatus,
  OperationStatus,
} from "@/lib/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientCampaignListItem = {
  campaign_id: string;
  campaign_name: string;
  status: CampaignStatus;
  package_size: number;
  koc_count: number;
  pending_approval: number;
  approved_count: number;
  video_done: number;
  completed_count: number;
  total_views: number;
  total_likes: number;
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
  operation_status: OperationStatus | null;
  client_approval_status: ClientApprovalStatus;
  client_note: string | null;
  video_url: string | null;
  final_link: string[] | null;
  deadline_date: string | null;
  sample_sent_at: string | null;
  sample_received_at: string | null;
  video_submitted_at: string | null;
  completed_at: string | null;
  client_video_feedback: string | null;
  client_video_feedback_at: string | null;
  client_quality_rating: number | null;
  client_quality_review: string | null;
  client_quality_rated_at: string | null;
  video_views: number | null;
  video_likes: number | null;
  video_comments: number | null;
  video_shares: number | null;
  video_gmv: number | null;
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

export type ClientDashboardData = {
  campaigns: ClientCampaignListItem[];
  summary: {
    total_campaigns: number;
    active_campaigns: number;
    total_koc_slots: number;
    total_completed: number;
    total_pending: number;
    total_views: number;
    total_likes: number;
  };
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
  const videoDoneMap = new Map<string, number>();
  const completedMap = new Map<string, number>();
  const viewsMap = new Map<string, number>();
  const likesMap = new Map<string, number>();

  const VIDEO_DONE_STATUSES = [
    "video_submitted", "need_revision", "video_approved", "completed",
  ];
  const VISIBLE_STATUSES = [
    "sent_to_client", "client_approved", "client_rejected",
    "waiting_address", "address_submitted", "waiting_sample_sent",
    "sample_sent", "sample_received", "waiting_video",
    ...VIDEO_DONE_STATUSES,
  ];

  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: kocs } = await (supabase as any)
      .from("campaign_kocs")
      .select("campaign_id, client_approval_status, operation_status, video_views, video_likes")
      .in("campaign_id", ids)
      .in("operation_status", VISIBLE_STATUSES);

    for (const k of kocs ?? []) {
      const cid = k.campaign_id as string;
      kocCountMap.set(cid, (kocCountMap.get(cid) ?? 0) + 1);
      if (k.client_approval_status === "pending") {
        pendingMap.set(cid, (pendingMap.get(cid) ?? 0) + 1);
      }
      if (k.client_approval_status === "approved") {
        approvedMap.set(cid, (approvedMap.get(cid) ?? 0) + 1);
      }
      if (VIDEO_DONE_STATUSES.includes(k.operation_status)) {
        videoDoneMap.set(cid, (videoDoneMap.get(cid) ?? 0) + 1);
      }
      if (k.operation_status === "completed") {
        completedMap.set(cid, (completedMap.get(cid) ?? 0) + 1);
      }
      if (k.video_views) {
        viewsMap.set(cid, (viewsMap.get(cid) ?? 0) + Number(k.video_views));
      }
      if (k.video_likes) {
        likesMap.set(cid, (likesMap.get(cid) ?? 0) + Number(k.video_likes));
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
      video_done: videoDoneMap.get(c.campaign_id) ?? 0,
      completed_count: completedMap.get(c.campaign_id) ?? 0,
      total_views: viewsMap.get(c.campaign_id) ?? 0,
      total_likes: likesMap.get(c.campaign_id) ?? 0,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kocs: (viewRows ?? []).map((r: any) => ({
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
        operation_status: r.operation_status as OperationStatus | null,
        client_approval_status: (r.client_approval_status ?? "pending") as ClientApprovalStatus,
        client_note: r.client_note,
        video_url: r.video_url,
        final_link: Array.isArray(r.final_link)
          ? r.final_link
          : r.final_link
          ? [r.final_link]
          : null,
        deadline_date: r.deadline_date,
        sample_sent_at: r.sample_sent_at,
        sample_received_at: r.sample_received_at,
        video_submitted_at: r.video_submitted_at,
        completed_at: r.completed_at,
        client_video_feedback: r.client_video_feedback,
        client_video_feedback_at: r.client_video_feedback_at,
        client_quality_rating: r.client_quality_rating,
        client_quality_review: r.client_quality_review,
        client_quality_rated_at: r.client_quality_rated_at,
        video_views: r.video_views ? Number(r.video_views) : null,
        video_likes: r.video_likes ? Number(r.video_likes) : null,
        video_comments: r.video_comments ? Number(r.video_comments) : null,
        video_shares: r.video_shares ? Number(r.video_shares) : null,
        video_gmv: r.video_gmv ? Number(r.video_gmv) : null,
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

export async function getClientDashboardData(): Promise<
  ActionResult<ClientDashboardData>
> {
  const result = await getClientCampaigns();
  if (!result.success) return result;

  const campaigns = result.data;
  const summary = {
    total_campaigns: campaigns.length,
    active_campaigns: campaigns.filter((c) => c.status === "active").length,
    total_koc_slots: campaigns.reduce((s, c) => s + c.package_size, 0),
    total_completed: campaigns.reduce((s, c) => s + c.completed_count, 0),
    total_pending: campaigns.reduce((s, c) => s + c.pending_approval, 0),
    total_views: campaigns.reduce((s, c) => s + c.total_views, 0),
    total_likes: campaigns.reduce((s, c) => s + c.total_likes, 0),
  };

  return { success: true, data: { campaigns, summary } };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

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

export async function submitVideoFeedback(
  campaignKocId: string,
  campaignId: string,
  feedback: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("client_submit_video_feedback", {
    p_campaign_koc_id: campaignKocId,
    p_feedback: feedback,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/client/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function rateKoc(
  campaignKocId: string,
  campaignId: string,
  rating: number,
  review?: string
): Promise<ActionResult> {
  if (rating < 1 || rating > 5) {
    return { success: false, error: "Rating phải từ 1 đến 5 sao." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("client_rate_koc", {
    p_campaign_koc_id: campaignKocId,
    p_rating: rating,
    ...(review ? { p_review: review } : {}),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/client/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
