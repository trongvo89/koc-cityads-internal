import type { Metadata } from "next";
import { getProposals } from "@/lib/actions/proposals";
import { getClients } from "@/lib/actions/clients";
import ProposalsPageClient from "@/components/admin/proposals-page-client";

export const metadata: Metadata = {
  title: "Proposals — KOC CityAds",
};

export default async function ProposalsPage() {
  const [proposalsResult, clientsResult] = await Promise.all([
    getProposals(),
    getClients(),
  ]);

  return (
    <div>
      <ProposalsPageClient
        proposals={proposalsResult.success ? proposalsResult.data : []}
        clients={clientsResult.success ? clientsResult.data.map((c) => ({ client_id: c.client_id, company_name: c.company_name })) : []}
      />
    </div>
  );
}
