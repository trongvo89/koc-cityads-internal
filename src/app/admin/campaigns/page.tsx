import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCampaigns } from "@/lib/actions/campaigns";
import { Button } from "@/components/ui/button";
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

  const campaigns = result.data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            Tạo campaign
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm mb-3">Chưa có campaign nào.</p>
            <Button asChild size="sm">
              <Link href="/admin/campaigns/new">Tạo campaign đầu tiên</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Package
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  KOCs
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Thời gian
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.campaign_id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/campaigns/${c.campaign_id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {c.campaign_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{c.client_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {c.package_size}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        c.koc_count >= c.package_size
                          ? "font-medium text-green-600"
                          : "text-zinc-600"
                      }
                    >
                      {c.koc_count}/{c.package_size}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {c.start_date
                      ? new Date(c.start_date).toLocaleDateString("vi-VN")
                      : "—"}
                    {c.end_date
                      ? ` → ${new Date(c.end_date).toLocaleDateString("vi-VN")}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
