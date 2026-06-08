import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, BarChart2 } from "lucide-react";
import { getCampaignDetail } from "@/lib/actions/campaigns";
import { getKocs } from "@/lib/actions/kocs";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KocBoard from "@/components/admin/koc-board";
import CampaignPaymentPanel from "@/components/admin/campaign-payment-panel";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  active: "success",
  completed: "default",
  paused: "warning",
  cancelled: "destructive",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCampaignDetail(id);
  if (!result.success) return { title: "Campaign — KOC CityAds" };
  return { title: `${result.data.campaign_name} — KOC CityAds` };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isSuperAdmin = profile?.role === "super_admin";

  const [campaignResult, kocsResult] = await Promise.all([
    getCampaignDetail(id),
    getKocs(),
  ]);

  if (!campaignResult.success) notFound();

  const campaign = campaignResult.data;
  const allKocs = kocsResult.success
    ? kocsResult.data.map((k) => ({
        koc_id: k.koc_id,
        name: k.name,
        category: k.category,
        follower: k.follower,
        location: k.location,
      }))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/campaigns"
            className="text-zinc-500 hover:text-zinc-900 transition-colors mt-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">
                {campaign.campaign_name}
              </h1>
              <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"}>
                {STATUS_LABEL[campaign.status] ?? campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {campaign.client_name} · {campaign.kocs.length}/{campaign.package_size} KOCs
              {campaign.start_date &&
                ` · ${new Date(campaign.start_date).toLocaleDateString("vi-VN")}`}
              {campaign.end_date &&
                ` — ${new Date(campaign.end_date).toLocaleDateString("vi-VN")}`}
            </p>
            {campaign.brief && (
              <p className="text-sm text-zinc-600 mt-1.5 max-w-2xl">{campaign.brief}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/campaigns/${id}/report`}>
              <BarChart2 className="h-4 w-4 mr-1.5" />
              Báo cáo
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/campaigns/${id}/reminders`}>
              <Bell className="h-4 w-4 mr-1.5" />
              Nhắc nhở
            </Link>
          </Button>
        </div>
      </div>

      {/* Payment tracking — super admin only */}
      {isSuperAdmin && campaign.contract_value > 0 && (
        <div className="mb-6">
          <CampaignPaymentPanel
            campaignId={campaign.campaign_id}
            contractValue={campaign.contract_value}
            depositPaidAt={campaign.deposit_paid_at}
            finalPaidAt={campaign.final_paid_at}
          />
        </div>
      )}

      {/* KOC Board */}
      <KocBoard campaign={campaign} allKocs={allKocs} />
    </div>
  );
}
