import { notFound } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { getProposalByToken } from "@/lib/actions/proposals";
import type { ProposalKocCard } from "@/lib/actions/proposals";

function getTierLabel(avg_rating: number | null, total_campaigns: number): string | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3) return "Platinum";
  if (avg_rating >= 3.5) return "Gold";
  if (avg_rating >= 2.5) return "Silver";
  return "Bronze";
}

function getTierClass(label: string): string {
  if (label === "Platinum") return "bg-purple-100 text-purple-700";
  if (label === "Gold") return "bg-yellow-100 text-yellow-700";
  if (label === "Silver") return "bg-zinc-100 text-zinc-600";
  return "bg-orange-100 text-orange-700";
}

function formatFollower(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function KocCard({ pkoc }: { pkoc: ProposalKocCard }) {
  const tierLabel = getTierLabel(pkoc.avg_rating, pkoc.total_campaigns);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-xl font-bold text-zinc-400 flex-shrink-0">
          {pkoc.koc_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-zinc-900">{pkoc.koc_name}</h3>
            {tierLabel && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getTierClass(tierLabel)}`}>
                {tierLabel}
              </span>
            )}
          </div>
          {pkoc.koc_category && pkoc.koc_category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pkoc.koc_category.map((c) => (
                <span key={c} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap mb-3">
        {pkoc.follower != null && <span>{formatFollower(pkoc.follower)} followers</span>}
        {pkoc.avg_rating != null && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {pkoc.avg_rating}/5
          </span>
        )}
        {pkoc.total_campaigns > 0 && <span>{pkoc.total_campaigns} campaigns</span>}
      </div>

      {/* Social links */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {pkoc.tiktok_url && (
          <a href={pkoc.tiktok_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            <ExternalLink className="h-3 w-3" />TikTok
          </a>
        )}
        {pkoc.instagram_url && (
          <a href={pkoc.instagram_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            <ExternalLink className="h-3 w-3" />Instagram
          </a>
        )}
      </div>

      {/* Admin notes shown as "Lý do đề xuất" */}
      {pkoc.notes && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
          <p className="text-[10px] text-blue-500 font-medium mb-0.5 uppercase tracking-wide">Lý do đề xuất</p>
          <p className="text-xs text-blue-800">{pkoc.notes}</p>
        </div>
      )}
    </div>
  );
}

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
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <span className="font-semibold text-zinc-900 text-sm">KOC CityAds</span>
          </div>
          {(proposal.client_name || proposal.prospect_name) && (
            <span className="text-sm text-zinc-500">
              Dành cho: <span className="font-medium text-zinc-700">{proposal.client_name ?? proposal.prospect_name}</span>
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Proposal title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">{proposal.title}</h1>
          {proposal.notes && (
            <p className="text-zinc-500 mt-2 max-w-2xl">{proposal.notes}</p>
          )}
          <p className="text-xs text-zinc-400 mt-2">
            {proposal.kocs.length} KOC được đề xuất
          </p>
        </div>

        {/* KOC Grid */}
        {proposal.kocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 py-12 text-center">
            <p className="text-zinc-500">Chưa có KOC nào trong proposal này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposal.kocs.map((pkoc) => (
              <KocCard key={pkoc.proposal_koc_id} pkoc={pkoc} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-xs text-zinc-400 border-t border-zinc-200">
        KOC CityAds — Powered by CityAds Vietnam
      </footer>
    </div>
  );
}
