import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProposalDetail } from "@/lib/actions/proposals";
import { getKocs } from "@/lib/actions/kocs";
import ProposalDetailClient from "@/components/admin/proposal-detail-client";

export const metadata: Metadata = {
  title: "Proposal — KOC CityAds",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [proposalResult, kocsResult] = await Promise.all([
    getProposalDetail(id),
    getKocs(),
  ]);

  if (!proposalResult.success) notFound();

  return (
    <ProposalDetailClient
      proposal={proposalResult.data}
      allKocs={kocsResult.success ? kocsResult.data : []}
    />
  );
}
