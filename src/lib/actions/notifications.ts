"use server";

import { createClient } from "@/lib/supabase/server";

export type NotifItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  time: string | null;
};

export type NotifGroup = {
  type: "proposal_review" | "video_submitted";
  label: string;
  emoji: string;
  items: NotifItem[];
};

export type AdminNotifications = {
  groups: NotifGroup[];
  total: number;
};

export async function getAdminNotifications(): Promise<AdminNotifications> {
  const supabase = await createClient();

  const [pkocResult, videoResult] = await Promise.all([
    // Proposal KOCs where client has reviewed (not pending)
    supabase
      .from("proposal_kocs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("proposal_id, client_status, client_reviewed_at") as any,
    // Campaign KOCs with video submitted, awaiting review. Post the simplify
    // migration operation_status no longer holds "video_submitted" — a submitted
    // video is signalled by content_status='submitted'.
    supabase
      .from("campaign_kocs")
      .select("campaign_koc_id, campaign_id, video_submitted_at, campaigns!inner(campaign_name)")
      .eq("content_status", "submitted")
      .order("video_submitted_at", { ascending: false }),
  ]);

  const groups: NotifGroup[] = [];

  // ── Proposal review notifications ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPkocs: any[] = pkocResult?.data ?? [];
  const reviewedPkocs = allPkocs.filter((k: any) => k.client_status !== "pending");

  if (reviewedPkocs.length > 0) {
    const proposalIds = [...new Set(reviewedPkocs.map((k: any) => k.proposal_id as string))];

    // Fetch proposals not yet converted — new columns need any cast
    const { data: rawProposals } = await supabase
      .from("proposals")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("proposal_id, title, prospect_name, linked_campaign_id, clients(company_name)") as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proposals: any[] = (rawProposals ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => proposalIds.includes(p.proposal_id) && !p.linked_campaign_id
    );

    if (proposals.length > 0) {
      const items: NotifItem[] = proposals.map((p: any) => {
        const pkocs = reviewedPkocs.filter((k: any) => k.proposal_id === p.proposal_id);
        const approved = pkocs.filter((k: any) => k.client_status === "approved").length;
        const rejected = pkocs.filter((k: any) => k.client_status === "rejected").length;
        const clientName = p.clients?.company_name ?? p.prospect_name ?? "Client";

        const parts: string[] = [];
        if (approved > 0) parts.push(`${approved} duyệt`);
        if (rejected > 0) parts.push(`${rejected} từ chối`);

        const latestTime = pkocs
          .map((k: any) => k.client_reviewed_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

        return {
          id: p.proposal_id,
          href: `/admin/proposals/${p.proposal_id}`,
          title: p.title,
          detail: `${clientName}: ${parts.join(", ")}`,
          time: latestTime,
        };
      });

      if (items.length > 0) {
        groups.push({
          type: "proposal_review",
          label: "Client đã duyệt KOC",
          emoji: "✅",
          items,
        });
      }
    }
  }

  // ── Video submission notifications ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoKocs: any[] = videoResult.data ?? [];
  if (videoKocs.length > 0) {
    const byCampaign = new Map<string, { name: string; count: number; latestTime: string | null }>();
    for (const vk of videoKocs) {
      const campaignId = vk.campaign_id as string;
      const campaignName = (vk.campaigns as { campaign_name: string } | null)?.campaign_name ?? "Campaign";
      const existing = byCampaign.get(campaignId);
      if (!existing) {
        byCampaign.set(campaignId, { name: campaignName, count: 1, latestTime: vk.video_submitted_at ?? null });
      } else {
        existing.count++;
        if (vk.video_submitted_at && (!existing.latestTime || vk.video_submitted_at > existing.latestTime)) {
          existing.latestTime = vk.video_submitted_at;
        }
      }
    }

    const items: NotifItem[] = Array.from(byCampaign.entries()).map(([id, info]) => ({
      id,
      href: `/admin/campaigns/${id}`,
      title: info.name,
      detail: `${info.count} KOC đã nộp video, chờ duyệt`,
      time: info.latestTime,
    }));

    groups.push({
      type: "video_submitted",
      label: "Video chờ duyệt",
      emoji: "🎬",
      items,
    });
  }

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  return { groups, total };
}
