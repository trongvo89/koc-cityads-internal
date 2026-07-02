import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClients } from "@/lib/actions/clients";
import { getInternalStaff } from "@/lib/actions/kpi";
import CreateCampaignForm from "@/components/admin/create-campaign-form";

export const metadata: Metadata = {
  title: "Tạo Campaign — KOC CityAds",
};

export default async function NewCampaignPage() {
  const [result, staffResult] = await Promise.all([
    getClients(),
    getInternalStaff(),
  ]);
  const clients = result.success ? result.data : [];
  const staff = staffResult.success ? staffResult.data : [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/campaigns"
          className="text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Tạo campaign mới</h1>
      </div>
      <CreateCampaignForm clients={clients} staff={staff} />
    </div>
  );
}
