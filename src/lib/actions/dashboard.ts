"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

export type DashboardMetrics = {
  totalKocs: number;
  activeCampaigns: number;
  topRatedKocs: number;
  draftProposals: number;
  sentProposals: number;
  pendingApprovals: number;
  videosThisMonth: number;
};

export async function getDashboardMetrics(): Promise<ActionResult<DashboardMetrics>> {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: kocs, error: ke },
    { data: campaigns, error: ce },
    { data: proposals, error: prope },
    { data: campaignKocs, error: cke },
    { data: perfRows, error: pe },
  ] = await Promise.all([
    supabase.from("kocs").select("status"),
    supabase.from("campaigns").select("status"),
    supabase.from("proposals").select("status"),
    supabase
      .from("campaign_kocs")
      .select("operation_status, video_url, video_submitted_at"),
    supabase
      .from("koc_performance_summary")
      .select("avg_rating, rating_count"),
  ]);

  if (ke) return { success: false, error: ke.message };
  if (ce) return { success: false, error: ce.message };
  if (prope) return { success: false, error: prope.message };
  if (cke) return { success: false, error: cke.message };
  if (pe) return { success: false, error: pe.message };

  const ck = campaignKocs ?? [];

  return {
    success: true,
    data: {
      totalKocs: (kocs ?? []).filter((k) => k.status === "active").length,
      activeCampaigns: (campaigns ?? []).filter((c) => c.status === "active").length,
      topRatedKocs: (perfRows ?? []).filter(
        (p) => Number(p.avg_rating ?? 0) >= 4 && Number(p.rating_count ?? 0) >= 2
      ).length,
      draftProposals: (proposals ?? []).filter((p) => p.status === "draft").length,
      sentProposals: (proposals ?? []).filter((p) => p.status === "sent").length,
      pendingApprovals: ck.filter((r) => r.operation_status === "sent_to_client").length,
      videosThisMonth: ck.filter(
        (r) => r.video_url && r.video_submitted_at && new Date(r.video_submitted_at) >= monthStart
      ).length,
    },
  };
}
