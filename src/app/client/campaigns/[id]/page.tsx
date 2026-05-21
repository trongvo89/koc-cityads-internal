import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClientCampaignDetail } from "@/lib/actions/client-campaigns";
import { Badge } from "@/components/ui/badge";
import KocApprovalBoard from "@/components/client/koc-approval-board";

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
  const result = await getClientCampaignDetail(id);
  if (!result.success) return { title: "Campaign — KOC CityAds" };
  return { title: `${result.data.campaign_name} — KOC CityAds` };
}

export default async function ClientCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getClientCampaignDetail(id);

  if (!result.success) notFound();

  const campaign = result.data;

  const pending = campaign.kocs.filter(
    (k) => k.client_approval_status === "pending"
  ).length;
  const approved = campaign.kocs.filter(
    (k) => k.client_approval_status === "approved"
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/client/campaigns"
          className="text-zinc-500 hover:text-zinc-900 transition-colors mt-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900">
              {campaign.campaign_name}
            </h1>
            <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"}>
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-1.5 text-sm text-zinc-500 flex-wrap">
            <span>
              {campaign.kocs.length}/{campaign.package_size} KOCs
            </span>
            {approved > 0 && (
              <span className="text-green-600">{approved} đã duyệt</span>
            )}
            {pending > 0 && (
              <span className="text-yellow-700 font-medium">
                {pending} chờ duyệt
              </span>
            )}
            {campaign.start_date && (
              <span>
                {new Date(campaign.start_date).toLocaleDateString("vi-VN")}
                {campaign.end_date &&
                  ` → ${new Date(campaign.end_date).toLocaleDateString("vi-VN")}`}
              </span>
            )}
          </div>

          {campaign.brief && (
            <p className="text-sm text-zinc-600 mt-2 max-w-2xl leading-relaxed">
              {campaign.brief}
            </p>
          )}
        </div>
      </div>

      {/* Instructions for pending */}
      {pending > 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Có {pending} KOC đang chờ duyệt.</span>{" "}
            Vui lòng xem xét hồ sơ và duyệt hoặc từ chối từng KOC.
          </p>
        </div>
      )}

      {/* KOC Board */}
      <KocApprovalBoard kocs={campaign.kocs} campaignId={id} />
    </div>
  );
}
