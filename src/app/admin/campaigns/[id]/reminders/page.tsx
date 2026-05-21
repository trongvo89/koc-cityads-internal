import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignReminders } from "@/lib/actions/campaigns";
import ReminderList from "@/components/admin/reminder-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCampaignReminders(id);
  if (!result.success) return { title: "Nhắc nhở — KOC CityAds" };
  return { title: `Nhắc nhở: ${result.data.campaign_name} — KOC CityAds` };
}

export default async function RemindersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCampaignReminders(id);

  if (!result.success) notFound();

  const { campaign_name, kocs } = result.data;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/campaigns/${id}`}
          className="text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Nhắc nhở KOC</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{campaign_name}</p>
        </div>
      </div>

      <ReminderList
        campaignId={id}
        campaignName={campaign_name}
        kocs={kocs}
      />
    </div>
  );
}
