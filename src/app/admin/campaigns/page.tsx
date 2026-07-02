import type { Metadata } from "next";
import { getCampaigns } from "@/lib/actions/campaigns";
import { getInternalStaff } from "@/lib/actions/kpi";
import CampaignsPageClient from "@/components/admin/campaigns-page-client";

export const metadata: Metadata = {
  title: "Campaigns — KOC CityAds",
};

export default async function CampaignsPage() {
  const [result, staffResult] = await Promise.all([
    getCampaigns(),
    getInternalStaff(),
  ]);

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Campaigns</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  const staff = staffResult.success ? staffResult.data : [];

  return <CampaignsPageClient campaigns={result.data} staff={staff} />;
}
