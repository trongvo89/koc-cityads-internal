"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

export type DashboardMetrics = {
  activeCampaigns: number;
  pendingClientApproval: number;
  addressWaiting: number;
  sampleSent: number;
  videoSubmitted: number;
  needRevision: number;
  failed: number;
};

export async function getDashboardMetrics(): Promise<ActionResult<DashboardMetrics>> {
  const supabase = await createClient();

  const [{ data: campaigns, error: ce }, { data: kocs, error: ke }] = await Promise.all([
    supabase.from("campaigns").select("status"),
    supabase
      .from("campaign_kocs")
      .select("operation_status, sample_status, content_status, client_approval_status"),
  ]);

  if (ce) return { success: false, error: ce.message };
  if (ke) return { success: false, error: ke.message };

  const k = kocs ?? [];

  return {
    success: true,
    data: {
      activeCampaigns: (campaigns ?? []).filter((c) => c.status === "active").length,
      pendingClientApproval: k.filter((r) => r.client_approval_status === "pending").length,
      addressWaiting: k.filter((r) => r.operation_status === "waiting_address").length,
      sampleSent: k.filter((r) => r.sample_status === "sent").length,
      videoSubmitted: k.filter(
        (r) => r.content_status === "submitted" || r.content_status === "need_revision"
      ).length,
      needRevision: k.filter((r) => r.content_status === "need_revision").length,
      failed: k.filter((r) => r.operation_status === "failed").length,
    },
  };
}
