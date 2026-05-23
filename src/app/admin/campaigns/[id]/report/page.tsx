import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignReport } from "@/lib/actions/reports";
import CampaignReportEditor from "@/components/admin/campaign-report-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCampaignReport(id);
  if (!result.success) return { title: "Báo cáo — KOC CityAds" };
  return { title: `Báo cáo: ${result.data.campaign_name} — KOC CityAds` };
}

export default async function CampaignReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCampaignReport(id);
  if (!result.success) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/campaigns/${id}`}
          className="text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Báo cáo nghiệm thu</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{result.data.campaign_name}</p>
        </div>
      </div>

      <CampaignReportEditor report={result.data} />
    </div>
  );
}
