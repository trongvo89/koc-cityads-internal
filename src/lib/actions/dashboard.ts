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
    { count: totalKocs, error: ke },
    { count: activeCampaigns, error: ce },
    { count: draftProposals, error: dpe },
    { count: sentProposals, error: spe },
    { count: pendingApprovals, error: pae },
    { count: videosThisMonth, error: vme },
    { count: topRatedKocs, error: tpe },
  ] = await Promise.all([
    supabase.from("kocs").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("proposals").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("proposals").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase
      .from("campaign_kocs")
      .select("*", { count: "exact", head: true })
      .eq("operation_status", "sent_to_client"),
    supabase
      .from("campaign_kocs")
      .select("*", { count: "exact", head: true })
      .not("video_url", "is", null)
      .gte("video_submitted_at", monthStart.toISOString()),
    supabase
      .from("koc_performance_summary")
      .select("*", { count: "exact", head: true })
      .gte("avg_rating", 4)
      .gte("rating_count", 2),
  ]);

  if (ke) return { success: false, error: ke.message };
  if (ce) return { success: false, error: ce.message };
  if (dpe) return { success: false, error: dpe.message };
  if (spe) return { success: false, error: spe.message };
  if (pae) return { success: false, error: pae.message };
  if (vme) return { success: false, error: vme.message };
  if (tpe) return { success: false, error: tpe.message };

  return {
    success: true,
    data: {
      totalKocs: totalKocs ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      topRatedKocs: topRatedKocs ?? 0,
      draftProposals: draftProposals ?? 0,
      sentProposals: sentProposals ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      videosThisMonth: videosThisMonth ?? 0,
    },
  };
}
