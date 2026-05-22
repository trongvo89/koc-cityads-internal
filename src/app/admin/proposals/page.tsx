import type { Metadata } from "next";
import { getProposals } from "@/lib/actions/proposals";
import ProposalsPageClient from "@/components/admin/proposals-page-client";

export const metadata: Metadata = {
  title: "Proposals — KOC CityAds",
};

export default async function ProposalsPage() {
  const result = await getProposals();
  const proposals = result.success ? result.data : [];

  return (
    <div>
      <ProposalsPageClient proposals={proposals} />
    </div>
  );
}
