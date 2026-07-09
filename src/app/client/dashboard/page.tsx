import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Users, Film, Eye, ArrowRight } from "lucide-react";
import { getClientDashboardData } from "@/lib/actions/client-campaigns";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tổng quan — KOC CityAds",
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

function formatNum(value: number) {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export default async function ClientDashboardPage() {
  const result = await getClientDashboardData();

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Tổng quan</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  const { campaigns, summary } = result.data;

  const cards = [
    {
      label: "Chiến dịch đang chạy",
      value: summary.active_campaigns,
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "KOC đang thực hiện",
      value: summary.total_koc_slots - summary.total_completed,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Video hoàn thành",
      value: summary.total_completed,
      icon: Film,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Tổng lượt xem",
      value: summary.total_views,
      icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-50",
      formatted: true,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Tổng quan</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Theo dõi tiến độ chiến dịch của bạn
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bg} rounded-lg p-2.5`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">
                  {card.formatted ? formatNum(card.value) : card.value}
                </p>
                <p className="text-xs text-zinc-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign progress list */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Tiến độ chiến dịch</h2>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-500 text-sm">
            Chưa có chiến dịch nào. Liên hệ team CityAds để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const progressPct =
              c.package_size > 0
                ? Math.round((c.completed_count / c.package_size) * 100)
                : 0;
            const inProduction =
              c.approved_count - c.video_done - c.completed_count;

            return (
              <div
                key={c.campaign_id}
                className="bg-white rounded-xl border border-zinc-200 p-5"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-zinc-900">
                        {c.campaign_name}
                      </h3>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </div>
                    {(c.start_date || c.end_date) && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {c.start_date
                          ? new Date(c.start_date).toLocaleDateString("vi-VN")
                          : "—"}
                        {c.end_date
                          ? ` → ${new Date(c.end_date).toLocaleDateString("vi-VN")}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/client/campaigns/${c.campaign_id}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                  >
                    Chi tiết
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Tiến độ hoàn thành</span>
                    <span className="text-xs font-medium text-zinc-700">
                      {c.completed_count}/{c.package_size} KOC ({progressPct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pipeline mini-stats */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {c.pending_approval > 0 && (
                    <span className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 font-medium">
                      Chờ duyệt: {c.pending_approval}
                    </span>
                  )}
                  {inProduction > 0 && (
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">
                      Sản xuất: {inProduction}
                    </span>
                  )}
                  {c.video_done > 0 && (
                    <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                      Video nộp: {c.video_done}
                    </span>
                  )}
                  {c.completed_count > 0 && (
                    <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 font-medium">
                      Hoàn thành: {c.completed_count}
                    </span>
                  )}
                </div>

                {/* Metrics row */}
                {(c.total_views > 0 || c.total_likes > 0) && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
                    {c.total_views > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {formatNum(c.total_views)} views
                      </span>
                    )}
                    {c.total_likes > 0 && (
                      <span>
                        {formatNum(c.total_likes)} likes
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
