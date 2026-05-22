"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProposalListItem = {
  proposal_id: string;
  title: string;
  status: string;
  client_name: string | null;
  prospect_name: string | null;
  koc_count: number;
  created_at: string;
  share_token: string;
};

export type ProposalKocCard = {
  proposal_koc_id: string;
  koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  follower: number | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  avg_rating: number | null;
  total_campaigns: number;
  video_count: number;
  notes: string | null;
  ordering: number;
};

export type ProposalDetail = {
  proposal_id: string;
  title: string;
  notes: string | null;
  status: string;
  share_token: string;
  client_id: string | null;
  client_name: string | null;
  prospect_name: string | null;
  created_at: string;
  kocs: ProposalKocCard[];
};

export type ProposalFormData = {
  title: string;
  notes?: string | null;
  client_id?: string | null;
  prospect_name?: string | null;
};

// ─── Read Actions ─────────────────────────────────────────────────────────────

export async function getProposals(): Promise<ActionResult<ProposalListItem[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select(
      "proposal_id, title, status, share_token, created_at, prospect_name, clients(company_name), proposal_kocs(proposal_koc_id)"
    )
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data ?? []).map((p) => ({
      proposal_id: p.proposal_id,
      title: p.title,
      status: p.status,
      share_token: p.share_token,
      created_at: p.created_at,
      prospect_name: p.prospect_name,
      client_name: (p.clients as { company_name: string } | null)?.company_name ?? null,
      koc_count: Array.isArray(p.proposal_kocs) ? p.proposal_kocs.length : 0,
    })),
  };
}

export async function getProposalDetail(proposalId: string): Promise<ActionResult<ProposalDetail>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select(
      "proposal_id, title, notes, status, share_token, client_id, prospect_name, created_at, clients(company_name), proposal_kocs(proposal_koc_id, koc_id, notes, ordering, kocs(name, category, follower, tiktok_url, instagram_url))"
    )
    .eq("proposal_id", proposalId)
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Not found" };

  // Fetch performance stats for KOCs in this proposal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kocIds = (data.proposal_kocs as any[] ?? []).map((pk: any) => pk.koc_id as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfMap = new Map<string, { avg_rating: number | null; total_campaigns: number; video_count: number }>();
  if (kocIds.length > 0) {
    const { data: perf } = await supabase
      .from("koc_performance_summary")
      .select("koc_id, avg_rating, total_campaigns, video_count")
      .in("koc_id", kocIds);
    if (perf) {
      perfMap = new Map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (perf as any[]).map((p) => [
          p.koc_id as string,
          { avg_rating: p.avg_rating, total_campaigns: Number(p.total_campaigns ?? 0), video_count: Number(p.video_count ?? 0) },
        ])
      );
    }
  }

  return {
    success: true,
    data: buildProposalDetail(data, perfMap),
  };
}

export async function getProposalByToken(token: string): Promise<ActionResult<ProposalDetail>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_proposal_by_token", {
    p_token: token,
  });

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Proposal not found" };

  return { success: true, data: data as ProposalDetail };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProposal(
  formData: ProposalFormData
): Promise<ActionResult<{ proposal_id: string; share_token: string }>> {
  if (!formData.title?.trim()) return { success: false, error: "Tiêu đề không được trống" };

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      title: formData.title.trim(),
      notes: formData.notes || null,
      client_id: formData.client_id || null,
      prospect_name: formData.prospect_name || null,
      created_by: user.user?.id ?? null,
    })
    .select("proposal_id, share_token")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/proposals");
  return { success: true, data: { proposal_id: data.proposal_id, share_token: data.share_token } };
}

export async function updateProposal(
  proposalId: string,
  formData: Partial<ProposalFormData> & { status?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({
      ...formData,
      title: formData.title?.trim(),
      notes: formData.notes || null,
      client_id: formData.client_id || null,
      prospect_name: formData.prospect_name || null,
    })
    .eq("proposal_id", proposalId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/proposals");
  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: undefined };
}

export async function deleteProposal(proposalId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("proposals").delete().eq("proposal_id", proposalId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/proposals");
  return { success: true, data: undefined };
}

export async function addKocToProposal(
  proposalId: string,
  kocId: string,
  notes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current max ordering
  const { data: existing } = await supabase
    .from("proposal_kocs")
    .select("ordering")
    .eq("proposal_id", proposalId)
    .order("ordering", { ascending: false })
    .limit(1);

  const nextOrdering = existing && existing.length > 0 ? (existing[0].ordering ?? 0) + 1 : 0;

  const { error } = await supabase.from("proposal_kocs").insert({
    proposal_id: proposalId,
    koc_id: kocId,
    notes: notes || null,
    ordering: nextOrdering,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: undefined };
}

export async function addKocsToProposal(
  proposalId: string,
  kocIds: string[]
): Promise<ActionResult<{ added: number }>> {
  if (kocIds.length === 0) return { success: false, error: "Không có KOC nào được chọn." };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("proposal_kocs")
    .select("ordering")
    .eq("proposal_id", proposalId)
    .order("ordering", { ascending: false })
    .limit(1);

  let nextOrdering = existing && existing.length > 0 ? (existing[0].ordering ?? 0) + 1 : 0;

  const inserts = kocIds.map((koc_id) => ({
    proposal_id: proposalId,
    koc_id,
    ordering: nextOrdering++,
  }));

  const { error } = await supabase.from("proposal_kocs").insert(inserts);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: { added: inserts.length } };
}

export async function removeKocFromProposal(
  proposalKocId: string,
  proposalId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposal_kocs")
    .delete()
    .eq("proposal_koc_id", proposalKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: undefined };
}

export async function updateProposalKocNotes(
  proposalKocId: string,
  proposalId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposal_kocs")
    .update({ notes: notes || null })
    .eq("proposal_koc_id", proposalKocId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: undefined };
}

export async function regenerateShareToken(
  proposalId: string
): Promise<ActionResult<{ share_token: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .update({ share_token: crypto.randomUUID() })
    .eq("proposal_id", proposalId)
    .select("share_token")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/proposals/${proposalId}`);
  return { success: true, data: { share_token: data.share_token } };
}

// ─── Internal helper ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProposalDetail(data: any, perfMap?: Map<string, { avg_rating: number | null; total_campaigns: number; video_count: number }>): ProposalDetail {
  const kocs: ProposalKocCard[] = (data.proposal_kocs ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pk: any) => {
      const koc = pk.kocs ?? {};
      const perf = perfMap?.get(pk.koc_id) ?? { avg_rating: null, total_campaigns: 0, video_count: 0 };
      return {
        proposal_koc_id: pk.proposal_koc_id,
        koc_id: pk.koc_id,
        koc_name: koc.name ?? "—",
        koc_category: koc.category ?? null,
        follower: koc.follower ?? null,
        tiktok_url: koc.tiktok_url ?? null,
        instagram_url: koc.instagram_url ?? null,
        avg_rating: perf.avg_rating,
        total_campaigns: perf.total_campaigns,
        video_count: perf.video_count,
        notes: pk.notes ?? null,
        ordering: pk.ordering ?? 0,
      };
    }
  );

  kocs.sort((a, b) => a.ordering - b.ordering);

  return {
    proposal_id: data.proposal_id,
    title: data.title,
    notes: data.notes ?? null,
    status: data.status,
    share_token: data.share_token,
    client_id: data.client_id ?? null,
    client_name: data.clients?.company_name ?? null,
    prospect_name: data.prospect_name ?? null,
    created_at: data.created_at,
    kocs,
  };
}
