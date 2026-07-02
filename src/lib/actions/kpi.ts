"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiCampaignRow = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  contract_value: number;
  ngay_chot_hd: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  status: string;
};

export type KpiPreview = {
  month: string;
  campaigns: KpiCampaignRow[];
  total_contract_value: number;
  projected_tier: number;
  is_locked: boolean;
  locked_tier: number | null;
  locked_at: string | null;
};

export type BonusPaymentRow = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  contract_value: number;
  payment_type: "deposit" | "final";
  amount: number;
  invoice: string | null;
  paid_at: string;
  assigned_to: string | null;
  assigned_name: string | null;
  tier_percent: number | null;
  bonus_sale_pct: number;
  bonus_ops_pct: number;
  bonus_total: number | null;
  bonus_sale: number | null;
  bonus_ops: number | null;
  campaign_status: string;
};

export type EmployeeBonusSummary = {
  employee_id: string | null;
  employee_name: string;
  total_received: number;
  total_bonus: number | null;
  campaign_count: number;
};

export type MonthlyBonusData = {
  month: string;
  payments: BonusPaymentRow[];
  employee_summaries: EmployeeBonusSummary[];
  total_bonus: number | null;
};

export type TierProjection = {
  month: string;
  total_contract_value: number;
  projected_tier: number;
  campaign_count: number;
  is_locked: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTier(totalValue: number): number {
  if (totalValue >= 80_000_000) return 13;
  if (totalValue >= 70_000_000) return 5;
  return 0;
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function requireSuperAdmin() {
  const supabase = await createClient();
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
    return { supabase, userId: user.id, authorized: false as const };
  }
  return { supabase, userId: user.id, authorized: true as const };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQ = any;

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getKpiPreview(
  month: string
): Promise<ActionResult<KpiPreview>> {
  const { supabase, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  const [campaignRes, kpiRes] = await Promise.all([
    (supabase
      .from("campaigns")
      .select(
        "campaign_id, campaign_name, contract_value, ngay_chot_hd, assigned_to, status, clients(company_name), profiles!campaigns_assigned_to_fkey(full_name)"
      )
      .eq("tier_month" as AnyQ, month)
      .order("ngay_chot_hd" as AnyQ, { ascending: true }) as AnyQ) as Promise<{ data: AnyQ[]; error: AnyQ }>,
    (supabase
      .from("monthly_kpi" as AnyQ)
      .select("tier_percent, status, locked_at")
      .eq("month", month)
      .maybeSingle() as AnyQ) as Promise<{ data: AnyQ }>,
  ]);

  if (campaignRes.error) return { success: false, error: campaignRes.error.message };

  const rows: KpiCampaignRow[] = (campaignRes.data ?? []).map((c: AnyQ) => ({
    campaign_id: c.campaign_id,
    campaign_name: c.campaign_name,
    client_name: c.clients?.company_name ?? "—",
    contract_value: c.contract_value ?? 0,
    ngay_chot_hd: c.ngay_chot_hd,
    assigned_to: c.assigned_to,
    assigned_name: c.profiles?.full_name ?? null,
    status: c.status,
  }));

  const activeRows = rows.filter((r) => r.status !== "cancelled");
  const total = activeRows.reduce((s, r) => s + r.contract_value, 0);
  const kpiData = kpiRes.data;
  const isLocked = kpiData?.status === "locked";

  return {
    success: true,
    data: {
      month,
      campaigns: rows,
      total_contract_value: total,
      projected_tier: computeTier(total),
      is_locked: isLocked,
      locked_tier: isLocked ? Number(kpiData?.tier_percent ?? 0) : null,
      locked_at: isLocked ? kpiData?.locked_at : null,
    },
  };
}

export async function lockMonth(
  month: string
): Promise<ActionResult> {
  const { supabase, userId, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  const { data: campaigns } = await (supabase
    .from("campaigns")
    .select("contract_value")
    .eq("tier_month" as AnyQ, month)
    .neq("status", "cancelled") as AnyQ);

  const total = (campaigns ?? []).reduce(
    (s: number, c: AnyQ) => s + (c.contract_value ?? 0),
    0
  );
  const tier = computeTier(total);

  const { data: kpiRow, error: ue } = await (supabase
    .from("monthly_kpi" as AnyQ)
    .upsert(
      {
        month,
        total_contract_value: total,
        tier_percent: tier,
        status: "locked",
        locked_at: new Date().toISOString(),
        locked_by: userId,
      },
      { onConflict: "month" }
    )
    .select("id, tier_percent")
    .single() as AnyQ);

  if (ue) return { success: false, error: ue.message };

  const { error: updateErr } = await (supabase
    .from("campaigns")
    .update({ tier_percent: tier } as AnyQ)
    .eq("tier_month" as AnyQ, month) as AnyQ);

  if (updateErr) return { success: false, error: updateErr.message };

  await (supabase.from("monthly_kpi_log" as AnyQ).insert({
    monthly_kpi_id: kpiRow.id,
    action: "lock",
    new_tier_percent: tier,
    new_total: total,
    performed_by: userId,
  }) as AnyQ);

  revalidatePath("/admin/reports");
  return { success: true, data: undefined };
}

export async function unlockMonth(
  month: string,
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  if (!reason.trim()) {
    return { success: false, error: "Vui lòng nhập lý do mở khóa" };
  }

  const { data: kpiRow } = await (supabase
    .from("monthly_kpi" as AnyQ)
    .select("id, tier_percent, total_contract_value")
    .eq("month", month)
    .single() as AnyQ);

  if (!kpiRow) return { success: false, error: "Tháng chưa được khóa" };

  const { error: ue } = await (supabase
    .from("monthly_kpi" as AnyQ)
    .update({
      status: "open",
      locked_at: null,
      locked_by: null,
    })
    .eq("id", kpiRow.id) as AnyQ);

  if (ue) return { success: false, error: ue.message };

  const { error: updateErr } = await (supabase
    .from("campaigns")
    .update({ tier_percent: null } as AnyQ)
    .eq("tier_month" as AnyQ, month) as AnyQ);

  if (updateErr) return { success: false, error: updateErr.message };

  await (supabase.from("monthly_kpi_log" as AnyQ).insert({
    monthly_kpi_id: kpiRow.id,
    action: "unlock",
    old_tier_percent: kpiRow.tier_percent,
    old_total: kpiRow.total_contract_value,
    performed_by: userId,
    reason: reason.trim(),
  }) as AnyQ);

  revalidatePath("/admin/reports");
  return { success: true, data: undefined };
}

export async function getMonthlyBonusData(
  month: string
): Promise<ActionResult<MonthlyBonusData>> {
  const { supabase, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  const { start, end } = monthBounds(month);

  const [depositRes, finalRes] = await Promise.all([
    (supabase
      .from("campaigns")
      .select(
        "campaign_id, campaign_name, contract_value, deposit_paid_at, deposit_amount, deposit_invoice, assigned_to, tier_percent, bonus_sale_pct, bonus_ops_pct, status, clients(company_name), profiles!campaigns_assigned_to_fkey(full_name)"
      )
      .gte("deposit_paid_at" as AnyQ, start)
      .lt("deposit_paid_at" as AnyQ, end)
      .order("deposit_paid_at" as AnyQ, { ascending: true }) as AnyQ) as Promise<{ data: AnyQ[]; error: AnyQ }>,
    (supabase
      .from("campaigns")
      .select(
        "campaign_id, campaign_name, contract_value, final_paid_at, final_amount, final_invoice, assigned_to, tier_percent, bonus_sale_pct, bonus_ops_pct, status, clients(company_name), profiles!campaigns_assigned_to_fkey(full_name)"
      )
      .gte("final_paid_at" as AnyQ, start)
      .lt("final_paid_at" as AnyQ, end)
      .order("final_paid_at" as AnyQ, { ascending: true }) as AnyQ) as Promise<{ data: AnyQ[]; error: AnyQ }>,
  ]);

  if (depositRes.error) return { success: false, error: depositRes.error.message };
  if (finalRes.error) return { success: false, error: finalRes.error.message };

  const payments: BonusPaymentRow[] = [];

  for (const c of depositRes.data ?? []) {
    const amount = c.deposit_amount ?? Math.floor((c.contract_value ?? 0) / 2);
    const tierPct = c.tier_percent != null ? Number(c.tier_percent) : null;
    const salePct = Number(c.bonus_sale_pct ?? 100);
    const opsPct = Number(c.bonus_ops_pct ?? 0);
    const bonusTotal = tierPct != null ? Math.round((tierPct / 100) * amount) : null;

    payments.push({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      client_name: c.clients?.company_name ?? "—",
      contract_value: c.contract_value ?? 0,
      payment_type: "deposit",
      amount,
      invoice: c.deposit_invoice ?? null,
      paid_at: c.deposit_paid_at,
      assigned_to: c.assigned_to,
      assigned_name: c.profiles?.full_name ?? null,
      tier_percent: tierPct,
      bonus_sale_pct: salePct,
      bonus_ops_pct: opsPct,
      bonus_total: bonusTotal,
      bonus_sale: bonusTotal != null ? Math.round(bonusTotal * salePct / 100) : null,
      bonus_ops: bonusTotal != null ? Math.round(bonusTotal * opsPct / 100) : null,
      campaign_status: c.status,
    });
  }

  for (const c of finalRes.data ?? []) {
    const amount = c.final_amount ?? Math.floor((c.contract_value ?? 0) / 2);
    const tierPct = c.tier_percent != null ? Number(c.tier_percent) : null;
    const salePct = Number(c.bonus_sale_pct ?? 100);
    const opsPct = Number(c.bonus_ops_pct ?? 0);
    const bonusTotal = tierPct != null ? Math.round((tierPct / 100) * amount) : null;

    payments.push({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      client_name: c.clients?.company_name ?? "—",
      contract_value: c.contract_value ?? 0,
      payment_type: "final",
      amount,
      invoice: c.final_invoice ?? null,
      paid_at: c.final_paid_at,
      assigned_to: c.assigned_to,
      assigned_name: c.profiles?.full_name ?? null,
      tier_percent: tierPct,
      bonus_sale_pct: salePct,
      bonus_ops_pct: opsPct,
      bonus_total: bonusTotal,
      bonus_sale: bonusTotal != null ? Math.round(bonusTotal * salePct / 100) : null,
      bonus_ops: bonusTotal != null ? Math.round(bonusTotal * opsPct / 100) : null,
      campaign_status: c.status,
    });
  }

  payments.sort((a, b) => a.paid_at.localeCompare(b.paid_at));

  // Group by employee
  const empMap = new Map<string, EmployeeBonusSummary>();
  let totalBonus: number | null = 0;
  let hasUnlocked = false;

  for (const p of payments) {
    const key = p.assigned_to ?? "__unassigned__";
    const existing = empMap.get(key) ?? {
      employee_id: p.assigned_to,
      employee_name: p.assigned_name ?? "Chưa gán",
      total_received: 0,
      total_bonus: 0,
      campaign_count: 0,
    };
    existing.total_received += p.amount;
    if (p.bonus_total != null) {
      existing.total_bonus = (existing.total_bonus ?? 0) + p.bonus_sale!;
    } else {
      hasUnlocked = true;
      existing.total_bonus = null;
    }
    existing.campaign_count++;
    empMap.set(key, existing);
  }

  if (hasUnlocked) totalBonus = null;
  else {
    totalBonus = 0;
    for (const emp of empMap.values()) {
      totalBonus += emp.total_bonus ?? 0;
    }
  }

  return {
    success: true,
    data: {
      month,
      payments,
      employee_summaries: Array.from(empMap.values()),
      total_bonus: totalBonus,
    },
  };
}

export async function getCurrentMonthTierProjection(): Promise<
  ActionResult<TierProjection>
> {
  const { supabase, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [campaignRes, kpiRes] = await Promise.all([
    (supabase
      .from("campaigns")
      .select("contract_value, status")
      .eq("tier_month" as AnyQ, month) as AnyQ) as Promise<{ data: AnyQ[] }>,
    (supabase
      .from("monthly_kpi" as AnyQ)
      .select("status")
      .eq("month", month)
      .maybeSingle() as AnyQ) as Promise<{ data: AnyQ }>,
  ]);

  const activeRows = (campaignRes.data ?? []).filter((c: AnyQ) => c.status !== "cancelled");
  const total = activeRows.reduce((s: number, c: AnyQ) => s + (c.contract_value ?? 0), 0);

  return {
    success: true,
    data: {
      month,
      total_contract_value: total,
      projected_tier: computeTier(total),
      campaign_count: activeRows.length,
      is_locked: kpiRes.data?.status === "locked",
    },
  };
}

// ─── Internal Staff Query ─────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  full_name: string;
};

export async function getInternalStaff(): Promise<ActionResult<StaffMember[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "operator", "super_admin"])
    .order("full_name");

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as StaffMember[] };
}

// ─── Update Bonus Split ───────────────────────────────────────────────────────

export async function updateBonusSplit(
  campaignId: string,
  salePct: number,
  opsPct: number
): Promise<ActionResult> {
  const { supabase, authorized } = await requireSuperAdmin();
  if (!authorized) return { success: false, error: "Không có quyền truy cập" };

  if (salePct + opsPct !== 100) {
    return { success: false, error: "Tổng tỷ lệ phải bằng 100%" };
  }

  const { error } = await (supabase
    .from("campaigns")
    .update({ bonus_sale_pct: salePct, bonus_ops_pct: opsPct } as AnyQ)
    .eq("campaign_id", campaignId) as AnyQ);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/reports");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
