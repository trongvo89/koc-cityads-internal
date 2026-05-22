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

export type KocVideoEntry = {
  campaign_koc_id: string;
  campaign_name: string;
  client_name: string;
  video_url: string;
  video_submitted_at: string | null;
};

export type ProposalKocCard = {
  proposal_koc_id: string;
  koc_id: string;
  koc_name: string;
  koc_category: string[] | null;
  avatar_url: string | null;
  follower: number | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  avg_rating: number | null;
  total_campaigns: number;
  video_count: number;
  notes: string | null;
  ordering: number;
  client_status: "pending" | "approved" | "rejected";
  client_comment: string | null;
  client_reviewed_at: string | null;
  past_videos: KocVideoEntry[];
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
  client_overall_comment: string | null;
  linked_campaign_id: string | null;
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
      "proposal_id, title, notes, status, share_token, client_id, prospect_name, created_at, client_overall_comment, linked_campaign_id, clients(company_name), proposal_kocs(proposal_koc_id, koc_id, notes, ordering, client_status, client_comment, client_reviewed_at, kocs(name, category, follower, tiktok_url, instagram_url, facebook_url, avatar_url))"
    )
    .eq("proposal_id", proposalId)
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Not found" };

  // Fetch performance stats + past videos in parallel for the KOCs in this proposal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kocIds = ((raw.proposal_kocs ?? []) as any[]).map((pk: any) => pk.koc_id as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfMap = new Map<string, { avg_rating: number | null; total_campaigns: number; video_count: number }>();
  let videosMap = new Map<string, KocVideoEntry[]>();

  if (kocIds.length > 0) {
    const [{ data: perf }, { data: videos }] = await Promise.all([
      supabase
        .from("koc_performance_summary")
        .select("koc_id, avg_rating, total_campaigns, video_count")
        .in("koc_id", kocIds),
      supabase
        .from("campaign_kocs")
        .select("campaign_koc_id, koc_id, video_url, video_submitted_at, campaigns(campaign_name, clients(company_name))")
        .in("koc_id", kocIds)
        .not("video_url", "is", null)
        .order("video_submitted_at", { ascending: false }),
    ]);

    if (perf) {
      perfMap = new Map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (perf as any[]).map((p) => [
          p.koc_id as string,
          { avg_rating: p.avg_rating, total_campaigns: Number(p.total_campaigns ?? 0), video_count: Number(p.video_count ?? 0) },
        ])
      );
    }

    if (videos) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const v of videos as any[]) {
        const entry: KocVideoEntry = {
          campaign_koc_id: v.campaign_koc_id,
          campaign_name: v.campaigns?.campaign_name ?? "—",
          client_name: v.campaigns?.clients?.company_name ?? "—",
          video_url: v.video_url,
          video_submitted_at: v.video_submitted_at ?? null,
        };
        const existing = videosMap.get(v.koc_id) ?? [];
        existing.push(entry);
        videosMap.set(v.koc_id, existing);
      }
    }
  }

  return {
    success: true,
    data: buildProposalDetail(raw, perfMap, videosMap),
  };
}

export async function getProposalByToken(token: string): Promise<ActionResult<ProposalDetail>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_proposal_by_token", {
    p_token: token,
  });

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Proposal not found" };

  // RPC returns { proposal: {...}, kocs: [...] } — flatten into ProposalDetail shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as { proposal: any; kocs: any[] };
  const kocs: ProposalKocCard[] = (raw.kocs ?? []).map((k: any) => ({
    proposal_koc_id: k.proposal_koc_id,
    koc_id: k.koc_id,
    koc_name: k.koc_name ?? "—",
    koc_category: k.koc_category ?? null,
    avatar_url: k.avatar_url ?? null,
    follower: k.follower ?? null,
    tiktok_url: k.tiktok_url ?? null,
    instagram_url: k.instagram_url ?? null,
    facebook_url: k.facebook_url ?? null,
    avg_rating: k.avg_rating ?? null,
    total_campaigns: Number(k.total_campaigns ?? 0),
    video_count: Number(k.video_count ?? 0),
    notes: k.notes ?? null,
    ordering: k.ordering ?? 0,
    client_status: k.client_status ?? "pending",
    client_comment: k.client_comment ?? null,
    client_reviewed_at: k.client_reviewed_at ?? null,
    past_videos: Array.isArray(k.past_videos)
      ? k.past_videos.map((v: any) => ({
          campaign_koc_id: v.campaign_koc_id,
          campaign_name: v.campaign_name ?? "—",
          client_name: v.client_name ?? "—",
          video_url: v.video_url,
          video_submitted_at: v.video_submitted_at ?? null,
        }))
      : [],
  }));

  return {
    success: true,
    data: {
      proposal_id: raw.proposal.proposal_id,
      title: raw.proposal.title,
      notes: raw.proposal.notes ?? null,
      status: raw.proposal.status,
      share_token: token,
      client_id: raw.proposal.client_id ?? null,
      client_name: raw.proposal.client_name ?? null,
      prospect_name: raw.proposal.prospect_name ?? null,
      created_at: raw.proposal.created_at,
      client_overall_comment: raw.proposal.client_overall_comment ?? null,
      linked_campaign_id: raw.proposal.linked_campaign_id ?? null,
      kocs,
    },
  };
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

// ─── Public client actions (called via share_token, no auth) ──────────────────

export async function submitKocReview(
  token: string,
  proposalKocId: string,
  status: "approved" | "rejected" | "pending",
  comment?: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("submit_koc_review" as any, {
    p_token: token,
    p_koc_entry: proposalKocId,
    p_status: status,
    p_comment: comment ?? null,
  });
  if (error) return { success: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = data as any;
  if (!res?.success) return { success: false, error: res?.error ?? "Lỗi không xác định" };

  // RPC returns campaign_id when it auto-added the KOC to an existing campaign
  if (res.campaign_id) {
    revalidatePath(`/admin/campaigns/${res.campaign_id}`);
    revalidatePath("/admin/campaigns");
  }

  return { success: true, data: undefined };
}

export async function submitProposalComment(
  token: string,
  comment: string
): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("submit_proposal_comment" as any, {
    p_token: token,
    p_comment: comment,
  });
  if (error) return { success: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = data as any;
  if (!res?.success) return { success: false, error: res?.error ?? "Lỗi không xác định" };
  return { success: true, data: undefined };
}

export async function convertProposalToCampaign(
  proposalId: string,
  opts: { campaign_name: string; client_id: string }
): Promise<ActionResult<{ campaign_id: string }>> {
  const supabase = await createClient();

  // Fetch approved KOC ids for this proposal
  const { data: pkocs, error: pkErr } = await supabase
    .from("proposal_kocs")
    .select("koc_id, client_status")
    .eq("proposal_id", proposalId);

  if (pkErr) return { success: false, error: pkErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvedKocIds = (pkocs ?? []).filter((pk: any) => pk.client_status === "approved").map((pk: any) => pk.koc_id as string);

  // Create campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      campaign_name: opts.campaign_name,
      client_id: opts.client_id,
      package_size: approvedKocIds.length,
      source: "from_proposal",
    } as any)
    .select("campaign_id")
    .single();

  if (campErr || !campaign) return { success: false, error: campErr?.message ?? "Không tạo được campaign" };

  // Add approved KOCs with pre-filled address if available
  if (approvedKocIds.length > 0) {
    const { data: kocProfiles } = await supabase
      .from("kocs")
      .select("koc_id, name, phone, default_address, location")
      .in("koc_id", approvedKocIds);

    const kocMap = new Map((kocProfiles ?? []).map((k) => [k.koc_id, k]));
    const inserts = approvedKocIds.map((koc_id) => {
      const koc = kocMap.get(koc_id);
      return {
        campaign_id: campaign.campaign_id,
        koc_id,
        operation_status: "waiting_video" as const,
        receiver_name: koc?.name ?? null,
        receiver_phone: koc?.phone ?? null,
        receiver_address: koc?.default_address ?? null,
        receiver_province: koc?.location ?? null,
        address_status: (koc?.default_address ? "submitted" : "waiting") as "submitted" | "waiting",
      };
    });

    const { error: insertErr } = await supabase.from("campaign_kocs").insert(inserts);
    if (insertErr) return { success: false, error: insertErr.message };
  }

  // Mark proposal accepted and link campaign
  await supabase
    .from("proposals")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ status: "accepted", linked_campaign_id: campaign.campaign_id } as any)
    .eq("proposal_id", proposalId);

  revalidatePath("/admin/proposals");
  revalidatePath(`/admin/proposals/${proposalId}`);
  revalidatePath("/admin/campaigns");
  return { success: true, data: { campaign_id: campaign.campaign_id } };
}

// ─── Internal helper ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProposalDetail(data: any, perfMap?: Map<string, { avg_rating: number | null; total_campaigns: number; video_count: number }>, videosMap?: Map<string, KocVideoEntry[]>): ProposalDetail {
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
        avatar_url: koc.avatar_url ?? null,
        follower: koc.follower ?? null,
        tiktok_url: koc.tiktok_url ?? null,
        instagram_url: koc.instagram_url ?? null,
        facebook_url: koc.facebook_url ?? null,
        avg_rating: perf.avg_rating,
        total_campaigns: perf.total_campaigns,
        video_count: perf.video_count,
        notes: pk.notes ?? null,
        ordering: pk.ordering ?? 0,
        client_status: pk.client_status ?? "pending",
        client_comment: pk.client_comment ?? null,
        client_reviewed_at: pk.client_reviewed_at ?? null,
        past_videos: videosMap?.get(pk.koc_id) ?? [],
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
    client_overall_comment: data.client_overall_comment ?? null,
    linked_campaign_id: data.linked_campaign_id ?? null,
    kocs,
  };
}
