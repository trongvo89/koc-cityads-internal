"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportKocRow = {
  campaign_koc_id: string;
  koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  koc_follower: number | null;
  koc_tiktok_url: string | null;
  koc_instagram_url: string | null;
  koc_avatar_url: string | null;
  video_url: string | null;
  video_submitted_at: string | null;
  completed_at: string | null;
  client_quality_rating: number | null;
  client_quality_review: string | null;
  client_approval_status: string;
  final_status: string;
  video_views: number | null;
  video_likes: number | null;
  video_comments: number | null;
  video_shares: number | null;
  video_gmv: number | null;
  metrics_updated_at: string | null;
};

export type CampaignReport = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  brief: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number;
  status: string;
  report_notes: string | null;
  report_published_at: string | null;
  report_share_token: string;
  kocs: ReportKocRow[];
};

export type PublicReportKoc = {
  campaign_koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  koc_follower: number | null;
  koc_tiktok_url: string | null;
  koc_instagram_url: string | null;
  koc_avatar_url: string | null;
  video_url: string;
  video_submitted_at: string | null;
  completed_at: string | null;
  client_quality_rating: number | null;
  client_quality_review: string | null;
  video_views: number | null;
  video_likes: number | null;
  video_comments: number | null;
  video_shares: number | null;
  video_gmv: number | null;
};

export type PublicReport = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number;
  brief: string | null;
  report_notes: string | null;
  report_published_at: string;
  kocs: PublicReportKoc[];
};

export type MetricsUpdate = {
  campaign_koc_id: string;
  video_url: string | null;
  video_views: number | null;
  video_likes: number | null;
  video_comments: number | null;
  video_shares: number | null;
  video_gmv: number | null;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCampaignReport(
  campaignId: string
): Promise<ActionResult<CampaignReport>> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error: ce } = await (supabase
    .from("campaigns")
    .select(
      "campaign_id, campaign_name, brief, status, start_date, end_date, contract_value, report_notes, report_published_at, report_share_token, clients(company_name)"
    )
    .eq("campaign_id", campaignId)
    .single() as any) as { data: any; error: any };

  if (ce || !campaign)
    return { success: false, error: ce?.message ?? "Không tìm thấy campaign" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kocs, error: ke } = await (supabase
    .from("campaign_kocs")
    .select(
      "campaign_koc_id, koc_id, video_url, video_submitted_at, completed_at, client_quality_rating, client_quality_review, client_approval_status, final_status, video_views, video_likes, video_comments, video_shares, video_gmv, metrics_updated_at, kocs(name, category, follower, tiktok_url, instagram_url, avatar_url)"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true }) as any) as { data: any[]; error: any };

  if (ke) return { success: false, error: ke.message };

  return {
    success: true,
    data: {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      client_name:
        (campaign.clients as { company_name: string } | null)?.company_name ?? "—",
      brief: campaign.brief,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      contract_value: Number(campaign.contract_value ?? 0),
      status: campaign.status,
      report_notes: campaign.report_notes ?? null,
      report_published_at: campaign.report_published_at ?? null,
      report_share_token: campaign.report_share_token,
      kocs: (kocs ?? []).map((k) => {
        const kocData = k.kocs as {
          name: string;
          category: string[] | null;
          follower: number | null;
          tiktok_url: string | null;
          instagram_url: string | null;
          avatar_url: string | null;
        } | null;
        return {
          campaign_koc_id: k.campaign_koc_id,
          koc_id: k.koc_id,
          koc_name: kocData?.name ?? "?",
          koc_category: kocData?.category ?? null,
          koc_follower: kocData?.follower ?? null,
          koc_tiktok_url: kocData?.tiktok_url ?? null,
          koc_instagram_url: kocData?.instagram_url ?? null,
          koc_avatar_url: kocData?.avatar_url ?? null,
          video_url: k.video_url ?? null,
          video_submitted_at: k.video_submitted_at ?? null,
          completed_at: k.completed_at ?? null,
          client_quality_rating: k.client_quality_rating ?? null,
          client_quality_review: k.client_quality_review ?? null,
          client_approval_status: k.client_approval_status ?? "pending",
          final_status: k.final_status ?? "active",
          video_views: k.video_views ?? null,
          video_likes: k.video_likes ?? null,
          video_comments: k.video_comments ?? null,
          video_shares: k.video_shares ?? null,
          video_gmv: k.video_gmv ?? null,
          metrics_updated_at: k.metrics_updated_at ?? null,
        };
      }),
    },
  };
}

export async function getPublicReport(
  token: string
): Promise<ActionResult<PublicReport>> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_report_by_token", {
    p_token: token,
  });

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Báo cáo không tồn tại hoặc chưa được xuất bản" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  return {
    success: true,
    data: {
      campaign_id: raw.campaign_id,
      campaign_name: raw.campaign_name ?? "—",
      client_name: raw.client_name ?? "—",
      start_date: raw.start_date ?? null,
      end_date: raw.end_date ?? null,
      contract_value: Number(raw.contract_value ?? 0),
      brief: raw.brief ?? null,
      report_notes: raw.report_notes ?? null,
      report_published_at: raw.report_published_at,
      kocs: (raw.kocs ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (k: any): PublicReportKoc => ({
          campaign_koc_id: k.campaign_koc_id,
          koc_name: k.koc_name ?? "—",
          koc_category: k.koc_category ?? null,
          koc_follower: k.koc_follower ?? null,
          koc_tiktok_url: k.koc_tiktok_url ?? null,
          koc_instagram_url: k.koc_instagram_url ?? null,
          koc_avatar_url: k.koc_avatar_url ?? null,
          video_url: k.video_url,
          video_submitted_at: k.video_submitted_at ?? null,
          completed_at: k.completed_at ?? null,
          client_quality_rating: k.client_quality_rating ?? null,
          client_quality_review: k.client_quality_review ?? null,
          video_views: k.video_views ?? null,
          video_likes: k.video_likes ?? null,
          video_comments: k.video_comments ?? null,
          video_shares: k.video_shares ?? null,
          video_gmv: k.video_gmv ?? null,
        })
      ),
    },
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function updateKocVideoMetrics(
  campaignId: string,
  updates: MetricsUpdate[]
): Promise<ActionResult> {
  if (updates.length === 0) return { success: true, data: undefined };
  const supabase = await createClient();

  const results = await Promise.all(
    updates.map((u) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("campaign_kocs")
        .update({
          video_url: u.video_url || null,
          video_views: u.video_views,
          video_likes: u.video_likes,
          video_comments: u.video_comments,
          video_shares: u.video_shares,
          video_gmv: u.video_gmv,
          metrics_updated_at: new Date().toISOString(),
        })
        .eq("campaign_koc_id", u.campaign_koc_id)
    )
  );

  const firstError = results.find((r: { error: unknown }) => r.error);
  if (firstError?.error) {
    const e = firstError.error as { message: string };
    return { success: false, error: e.message };
  }

  revalidatePath(`/admin/campaigns/${campaignId}/report`);
  return { success: true, data: undefined };
}

export async function updateReportNotes(
  campaignId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("campaigns")
    .update({ report_notes: notes || null })
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: (error as { message: string }).message };

  revalidatePath(`/admin/campaigns/${campaignId}/report`);
  return { success: true, data: undefined };
}

export async function publishReport(
  campaignId: string
): Promise<ActionResult<{ share_token: string }>> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("campaigns")
    .update({ report_published_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .select("report_share_token")
    .single();

  if (error) return { success: false, error: (error as { message: string }).message };

  revalidatePath(`/admin/campaigns/${campaignId}/report`);
  return { success: true, data: { share_token: data.report_share_token } };
}

export async function unpublishReport(campaignId: string): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("campaigns")
    .update({ report_published_at: null })
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: (error as { message: string }).message };

  revalidatePath(`/admin/campaigns/${campaignId}/report`);
  return { success: true, data: undefined };
}
