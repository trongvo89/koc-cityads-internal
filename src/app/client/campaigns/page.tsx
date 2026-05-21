import type { Metadata } from "next";
import Link from "next/link";
import { getClientCampaigns } from "@/lib/actions/client-campaigns";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Campaigns — KOC CityAds",
};

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

export default async function ClientCampaignsPage() {
  const result = await getClientCampaigns();

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Campaigns</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  const campaigns = result.data;
  const totalPending = campaigns.reduce((s, c) => s + c.pending_approval, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Campaigns của bạn</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {campaigns.length} campaign
          {totalPending > 0 && (
            <span className="ml-2 text-yellow-700 font-medium">
              · {totalPending} KOC chờ duyệt
            </span>
          )}
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 py-16 text-center">
          <p className="text-zinc-500 text-sm">
            Chưa có campaign nào. Liên hệ team CityAds để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.campaign_id}
              href={`/client/campaigns/${c.campaign_id}`}
              className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-zinc-900">{c.campaign_name}</h2>
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                    {c.pending_approval > 0 && (
                      <Badge variant="warning">
                        {c.pending_approval} chờ duyệt
                      </Badge>
                    )}
                  </div>
                  {(c.start_date || c.end_date) && (
                    <p className="text-sm text-zinc-500 mt-1">
                      {c.start_date
                        ? new Date(c.start_date).toLocaleDateString("vi-VN")
                        : "—"}
                      {c.end_date
                        ? ` → ${new Date(c.end_date).toLocaleDateString("vi-VN")}`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-zinc-900">
                    {c.koc_count}
                    <span className="text-base font-normal text-zinc-400">
                      /{c.package_size}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">KOCs</div>
                  {c.approved_count > 0 && (
                    <div className="text-xs text-green-600 mt-0.5">
                      {c.approved_count} đã duyệt
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
