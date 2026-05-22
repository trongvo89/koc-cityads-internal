"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { CampaignStatus } from "@/lib/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignStatRow = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  status: CampaignStatus;
  package_size: number;
  contract_value: number;
  created_at: string;
  koc_total: number;
  koc_completed: number;
  koc_failed: number;
  koc_in_progress: number;
  completion_rate: number;
};

export type MonthlyStats = {
  month: string;
  total_campaigns: number;
  total_contract_value: number;
  total_koc_slots: number;
  total_koc_completed: number;
  overall_completion_rate: number;
  campaigns: CampaignStatRow[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

// Returns ISO strings for the first second of the month and first second of
// the following month — used for half-open interval [start, end).
function monthBounds(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function getMonthlyStats(
  month: string // "YYYY-MM"
): Promise<ActionResult<MonthlyStats>> {
  const supabase = await createClient();

  // Guard: super_admin only
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { success: false, error: "Không có quyền truy cập" };
  }

  const { start, end } = monthBounds(month);

  const [{ data: campaigns, error: ce }, { data: allKocs, error: ke }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select(
          "campaign_id, campaign_name, status, package_size, contract_value, created_at, clients(company_name)"
        )
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_kocs")
        .select("campaign_id, operation_status")
        .gte("created_at", start)
        .lt("created_at", end),
    ]);

  if (ce) return { success: false, error: ce.message };
  if (ke) return { success: false, error: ke.message };

  // Build per-campaign KOC stat maps
  type KocBucket = { total: number; completed: number; failed: number };
  const kocMap = new Map<string, KocBucket>();

  for (const k of allKocs ?? []) {
    const bucket = kocMap.get(k.campaign_id) ?? { total: 0, completed: 0, failed: 0 };
    bucket.total++;
    if (k.operation_status === "completed") bucket.completed++;
    if (k.operation_status === "failed") bucket.failed++;
    kocMap.set(k.campaign_id, bucket);
  }

  const rows: CampaignStatRow[] = (campaigns ?? []).map((c) => {
    const bucket = kocMap.get(c.campaign_id) ?? { total: 0, completed: 0, failed: 0 };
    const inProgress = bucket.total - bucket.completed - bucket.failed;
    const rate = bucket.total > 0 ? Math.round((bucket.completed / bucket.total) * 100) : 0;
    return {
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      client_name:
        (c.clients as { company_name: string } | null)?.company_name ?? "—",
      status: c.status,
      package_size: c.package_size,
      contract_value: c.contract_value,
      created_at: c.created_at,
      koc_total: bucket.total,
      koc_completed: bucket.completed,
      koc_failed: bucket.failed,
      koc_in_progress: inProgress,
      completion_rate: rate,
    };
  });

  const totalSlots = rows.reduce((s, r) => s + r.koc_total, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.koc_completed, 0);

  return {
    success: true,
    data: {
      month,
      total_campaigns: rows.length,
      total_contract_value: rows.reduce((s, r) => s + r.contract_value, 0),
      total_koc_slots: totalSlots,
      total_koc_completed: totalCompleted,
      overall_completion_rate:
        totalSlots > 0 ? Math.round((totalCompleted / totalSlots) * 100) : 0,
      campaigns: rows,
    },
  };
}
