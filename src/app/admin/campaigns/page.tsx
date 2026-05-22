import type { Metadata } from "next";
import { getCampaigns } from "@/lib/actions/campaigns";
import CampaignsPageClient from "@/components/admin/campaigns-page-client";

export const metadata: Metadata = {
  title: "Campaigns — KOC CityAds",
};

export default async function CampaignsPage() {
  const result = await getCampaigns();

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Campaigns</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  return <CampaignsPageClient campaigns={result.data} />;
}
