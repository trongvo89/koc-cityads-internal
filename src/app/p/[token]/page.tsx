import { notFound } from "next/navigation";
import { Star, ExternalLink } from "lucide-react";
import { getProposalByToken } from "@/lib/actions/proposals";
import type { ProposalKocCard } from "@/lib/actions/proposals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tier = { label: string; borderClass: string; badgeClass: string };

function getTier(avg_rating: number | null, total_campaigns: number): Tier | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3)
    return { label: "Platinum", borderClass: "border-t-purple-500", badgeClass: "bg-purple-100 text-purple-700" };
  if (avg_rating >= 3.5)
    return { label: "Gold", borderClass: "border-t-yellow-400", badgeClass: "bg-yellow-100 text-yellow-700" };
  if (avg_rating >= 2.5)
    return { label: "Silver", borderClass: "border-t-zinc-400", badgeClass: "bg-zinc-100 text-zinc-600" };
  return { label: "Bronze", borderClass: "border-t-orange-400", badgeClass: "bg-orange-100 text-orange-700" };
}

function formatFollower(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── KOC Card ─────────────────────────────────────────────────────────────────

function KocCard({ pkoc }: { pkoc: ProposalKocCard }) {
  const tier = getTier(pkoc.avg_rating, pkoc.total_campaigns);
  const dicebear = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(pkoc.koc_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50&fontFamily=Arial&fontSize=38`;

  return (
    <div className={`bg-white rounded-xl border border-zinc-200 border-t-4 ${tier?.borderClass ?? "border-t-zinc-200"} shadow-sm hover:shadow-md transition-all flex flex-col`}>
      {/* Header: avatar + name */}
      <div className="p-5 pb-3 flex items-start gap-3">
        <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-100 shadow-sm bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pkoc.avatar_url ?? dicebear}
            alt={pkoc.koc_name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-zinc-900 text-base leading-tight">{pkoc.koc_name}</h3>
            {tier && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tier.badgeClass}`}>
                {tier.label}
              </span>
            )}
          </div>
          {pkoc.koc_category && pkoc.koc_category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {pkoc.koc_category.map((c) => (
                <span key={c} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-md">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-px bg-zinc-100 rounded-xl overflow-hidden text-center">
          <div className="bg-white py-3 px-2">
            <div className="text-sm font-bold text-zinc-800">{formatFollower(pkoc.follower)}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Followers</div>
          </div>
          <div className="bg-white py-3 px-2">
            {pkoc.avg_rating != null ? (
              <>
                <div className="text-sm font-bold text-zinc-800 flex items-center justify-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {pkoc.avg_rating}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Đánh giá</div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-zinc-400">—</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Đánh giá</div>
              </>
            )}
          </div>
          <div className="bg-white py-3 px-2">
            <div className="text-sm font-bold text-zinc-800">{pkoc.video_count}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Videos</div>
          </div>
        </div>
      </div>

      {/* Social links */}
      {(pkoc.tiktok_url || pkoc.instagram_url || pkoc.facebook_url) && (
        <div className="px-5 pb-4 flex gap-2 flex-wrap">
          {pkoc.tiktok_url && (
            <a
              href={pkoc.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />TikTok
            </a>
          )}
          {pkoc.instagram_url && (
            <a
              href={pkoc.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" />Instagram
            </a>
          )}
          {pkoc.facebook_url && (
            <a
              href={pkoc.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-500 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />Facebook
            </a>
          )}
        </div>
      )}

      {/* Admin notes shown as "Lý do đề xuất" */}
      {pkoc.notes && (
        <div className="px-5 pb-5 mt-auto">
          <div className="bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
            <p className="text-[10px] text-blue-500 font-semibold mb-1 uppercase tracking-wide">Lý do đề xuất</p>
            <p className="text-xs text-blue-800 leading-relaxed">{pkoc.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getProposalByToken(token);

  if (!result.success) notFound();

  const proposal = result.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dark gradient hero */}
      <div className="bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-14">
          {/* Branding bar */}
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <span className="font-semibold text-white/70 text-sm tracking-wide">KOC CityAds</span>
          </div>

          {/* Proposal title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            {proposal.title || "Đề xuất KOC"}
          </h1>
          {proposal.notes && (
            <p className="text-white/60 text-sm max-w-2xl leading-relaxed">{proposal.notes}</p>
          )}

          {/* Client badge */}
          {(proposal.client_name || proposal.prospect_name) && (
            <div className="mt-5 inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-1.5">
              <span className="text-xs text-white/50">Dành cho</span>
              <span className="text-sm font-semibold text-white">
                {proposal.client_name ?? proposal.prospect_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content area — overlaps hero */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12">
        {/* Summary bar */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-800">{proposal.kocs.length}</span> KOC được đề xuất
          </span>
          <span className="text-xs text-zinc-400">KOC CityAds Vietnam</span>
        </div>

        {/* KOC Grid */}
        {proposal.kocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
            <p className="text-zinc-500 text-sm">Chưa có KOC nào trong proposal này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposal.kocs.map((pkoc) => (
              <KocCard key={pkoc.proposal_koc_id} pkoc={pkoc} />
            ))}
          </div>
        )}
      </div>

      <footer className="py-8 text-center text-xs text-zinc-400 border-t border-zinc-200">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">K</span>
          </div>
          <span className="font-medium text-zinc-500">KOC CityAds</span>
        </div>
        Powered by CityAds Vietnam
      </footer>
    </div>
  );
}
