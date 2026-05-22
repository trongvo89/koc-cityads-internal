import { notFound } from "next/navigation";
import { getProposalByToken } from "@/lib/actions/proposals";
import ProposalReviewClient from "@/components/public/proposal-review";

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

      {/* Interactive review section — overlaps hero */}
      <ProposalReviewClient proposal={proposal} token={token} />

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
