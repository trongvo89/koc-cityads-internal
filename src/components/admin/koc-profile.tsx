"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Star, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import KocFormDialog from "@/components/admin/koc-form-dialog";
import type { KocProfile } from "@/lib/actions/kocs";

// ─── Tier helpers ─────────────────────────────────────────────────────────────

type Tier = { label: string; className: string };

function getTier(avg_rating: number | null, total_campaigns: number): Tier | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3)
    return { label: "Platinum", className: "bg-purple-100 text-purple-700 border border-purple-200" };
  if (avg_rating >= 3.5)
    return { label: "Gold", className: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
  if (avg_rating >= 2.5)
    return { label: "Silver", className: "bg-zinc-100 text-zinc-600 border border-zinc-200" };
  return { label: "Bronze", className: "bg-orange-100 text-orange-700 border border-orange-200" };
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}`}
        />
      ))}
    </div>
  );
}

function formatFollower(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
};

const FINAL_STATUS_LABEL: Record<string, string> = {
  completed: "Hoàn thành",
  failed: "Thất bại",
  ongoing: "Đang chạy",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "history" | "info";

export default function KocProfileClient({ koc }: { koc: KocProfile }) {
  const [tab, setTab] = useState<Tab>("history");
  const [editOpen, setEditOpen] = useState(false);

  const tier = getTier(koc.avg_rating, koc.total_campaigns);
  const completionRate =
    koc.total_campaigns > 0
      ? Math.round((koc.completed_campaigns / koc.total_campaigns) * 100)
      : 0;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/kocs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Danh sách KOC
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center text-2xl font-bold text-zinc-400 flex-shrink-0">
              {koc.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-900">{koc.name}</h1>
                {tier && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.className}`}>
                    {tier.label}
                  </span>
                )}
                <Badge variant={STATUS_VARIANT[koc.status] ?? "secondary"}>
                  {STATUS_LABEL[koc.status] ?? koc.status}
                </Badge>
              </div>

              {/* Category tags */}
              {koc.category && koc.category.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {koc.category.map((c) => (
                    <span key={c} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta: location + follower */}
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 flex-wrap">
                {koc.location && <span>{koc.location}</span>}
                {koc.follower != null && (
                  <span>{formatFollower(koc.follower)} followers</span>
                )}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {koc.tiktok_url && (
                  <a href={koc.tiktok_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" />TikTok
                  </a>
                )}
                {koc.instagram_url && (
                  <a href={koc.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" />Instagram
                  </a>
                )}
                {koc.facebook_url && (
                  <a href={koc.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" />Facebook
                  </a>
                )}
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-zinc-100">
          <div>
            <div className="text-xs text-zinc-400 mb-1">Đánh giá trung bình</div>
            {koc.avg_rating != null ? (
              <div className="flex items-center gap-1.5">
                <Stars value={Math.round(koc.avg_rating)} />
                <span className="text-sm font-semibold text-zinc-800">{koc.avg_rating}/5</span>
                <span className="text-xs text-zinc-400">({koc.rating_count})</span>
              </div>
            ) : (
              <span className="text-sm text-zinc-400">Chưa có đánh giá</span>
            )}
          </div>
          <div>
            <div className="text-xs text-zinc-400 mb-1">Tổng campaigns</div>
            <div className="text-lg font-semibold text-zinc-800">{koc.total_campaigns}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 mb-1">Video đã làm</div>
            <div className="text-lg font-semibold text-zinc-800">{koc.video_count}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 mb-1">Tỉ lệ hoàn thành</div>
            <div className="text-lg font-semibold text-zinc-800">{completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 mb-4">
        <div className="flex gap-0">
          {(["history", "info"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t === "history" ? "Lịch sử" : "Thông tin"}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          {koc.history.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Chưa tham gia campaign nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Campaign</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Thời gian</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Trạng thái</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Video</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {koc.history.map((h) => (
                    <tr key={h.campaign_koc_id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/campaigns/${h.campaign_id}`}
                          className="font-medium text-zinc-900 hover:text-blue-600 hover:underline"
                        >
                          {h.campaign_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{h.client_name}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {formatDate(h.start_date)}
                        {h.end_date && ` – ${formatDate(h.end_date)}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.final_status === "completed"
                            ? "bg-green-100 text-green-700"
                            : h.final_status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {FINAL_STATUS_LABEL[h.final_status] ?? h.final_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {h.video_url ? (
                          <a href={h.video_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="h-3 w-3" />Xem video
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {h.client_quality_rating != null ? (
                          <div className="flex items-center gap-1">
                            <Stars value={h.client_quality_rating} />
                            <span className="text-xs text-zinc-500">{h.client_quality_rating}/5</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "info" && (
        <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Điện thoại" value={koc.phone} />
            <InfoField label="Zalo" value={koc.zalo} />
            <InfoField label="Email" value={koc.email} />
            <InfoField label="Khu vực" value={koc.location} />
            <InfoField label="Địa chỉ mặc định" value={koc.default_address} className="sm:col-span-2" />
          </div>
          {koc.note && (
            <div>
              <div className="text-xs text-zinc-400 mb-1">Ghi chú nội bộ</div>
              <div className="text-sm text-zinc-700 bg-zinc-50 rounded px-3 py-2 whitespace-pre-wrap">
                {koc.note}
              </div>
            </div>
          )}
        </div>
      )}

      <KocFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        koc={koc}
      />
    </div>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-zinc-400 mb-0.5">{label}</div>
      <div className="text-sm text-zinc-700">{value || <span className="text-zinc-400">—</span>}</div>
    </div>
  );
}
