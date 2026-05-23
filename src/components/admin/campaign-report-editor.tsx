"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import {
  Copy, Check, ExternalLink, Star, Eye, ThumbsUp, MessageCircle,
  Share2, TrendingUp, Users, Video, Globe, EyeOff, RefreshCw, Zap,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateKocVideoMetrics,
  updateReportNotes,
  publishReport,
  unpublishReport,
} from "@/lib/actions/reports";
import type { CampaignReport, ReportKocRow, MetricsUpdate } from "@/lib/actions/reports";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCurrency(n: number | null): string {
  if (n == null) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"}`}
        />
      ))}
    </div>
  );
}

function SummaryCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 mt-0.5 truncate">{value}</p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Row state ────────────────────────────────────────────────────────────────

type RowState = {
  video_url: string;
  video_views: string;
  video_likes: string;
  video_comments: string;
  video_shares: string;
  video_gmv: string;
};

function rowToState(k: ReportKocRow): RowState {
  return {
    video_url: k.video_url ?? "",
    video_views: k.video_views != null ? String(k.video_views) : "",
    video_likes: k.video_likes != null ? String(k.video_likes) : "",
    video_comments: k.video_comments != null ? String(k.video_comments) : "",
    video_shares: k.video_shares != null ? String(k.video_shares) : "",
    video_gmv: k.video_gmv != null ? String(k.video_gmv) : "",
  };
}

// ─── Fetch result type ────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "ok" | "err";

// ─── KOC Row ──────────────────────────────────────────────────────────────────

function KocMetricRow({
  koc, state, fetchStatus, fetchErr, onChange, onFetch,
}: {
  koc: ReportKocRow;
  state: RowState;
  fetchStatus: FetchStatus;
  fetchErr: string;
  onChange: (field: keyof RowState, value: string) => void;
  onFetch: () => void;
}) {
  const inputClass = "h-7 text-xs px-2 w-full";
  const hasUrl = !!state.video_url;

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      {/* KOC info */}
      <td className="py-3 px-3 align-top min-w-[130px]">
        <div className="font-medium text-sm text-zinc-900 leading-tight">{koc.koc_name}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{koc.koc_category?.join(", ") ?? "—"}</div>
        <Stars rating={koc.client_quality_rating} />
      </td>

      {/* Video URL + fetch button */}
      <td className="py-3 pr-2 align-top min-w-[200px]">
        <div className="flex items-center gap-1">
          <Input
            className={inputClass}
            placeholder="https://www.tiktok.com/..."
            value={state.video_url}
            onChange={(e) => onChange("video_url", e.target.value)}
          />
          {/* Open link */}
          {hasUrl && (
            <a
              href={state.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-700 flex-shrink-0"
              title="Mở video"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {/* Fetch metrics button */}
          <button
            onClick={onFetch}
            disabled={!hasUrl || fetchStatus === "loading"}
            title={hasUrl ? "Lấy số liệu tự động từ TikTok" : "Nhập link video trước"}
            className={`flex-shrink-0 transition-colors ${
              !hasUrl
                ? "text-zinc-200 cursor-not-allowed"
                : fetchStatus === "loading"
                ? "text-blue-400 cursor-wait"
                : fetchStatus === "ok"
                ? "text-green-500 hover:text-green-600"
                : fetchStatus === "err"
                ? "text-red-400 hover:text-red-500"
                : "text-zinc-400 hover:text-blue-500"
            }`}
          >
            {fetchStatus === "loading" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : fetchStatus === "ok" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : fetchStatus === "err" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {fetchStatus === "err" && (
          <p className="text-[10px] text-red-400 mt-0.5 truncate" title={fetchErr}>{fetchErr}</p>
        )}
      </td>

      {/* Numeric metric inputs */}
      {(["video_views", "video_likes", "video_comments", "video_shares", "video_gmv"] as const).map(
        (field) => (
          <td key={field} className="py-3 pr-2 align-top w-20 last:w-28 last:pr-0">
            <Input
              className={inputClass}
              type="number"
              min="0"
              placeholder="0"
              value={state[field]}
              onChange={(e) => onChange(field, e.target.value)}
            />
          </td>
        )
      )}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampaignReportEditor({ report }: { report: CampaignReport }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const k of report.kocs) {
      init[k.campaign_koc_id] = rowToState(k);
    }
    return init;
  });

  const [fetchStatuses, setFetchStatuses] = useState<Record<string, FetchStatus>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const [notes, setNotes] = useState(report.report_notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const originRef = useRef<string>("");

  useEffect(() => {
    originRef.current = window.location.origin;
    if (report.report_published_at) {
      setShareUrl(`${window.location.origin}/r/${report.report_share_token}`);
    }
  }, [report.report_published_at, report.report_share_token]);

  function updateRow(id: string, field: keyof RowState, value: string) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function parseNum(s: string): number | null {
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }

  // ─── Fetch metrics for a single row ───────────────────────────────────────

  const fetchMetrics = useCallback(async (campaignKocId: string, videoUrl: string) => {
    if (!videoUrl) return;

    setFetchStatuses((p) => ({ ...p, [campaignKocId]: "loading" }));
    setFetchErrors((p) => ({ ...p, [campaignKocId]: "" }));

    try {
      const res = await fetch(`/api/video-metrics?url=${encodeURIComponent(videoUrl)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setRows((prev) => {
        const existing = prev[campaignKocId];
        return {
          ...prev,
          [campaignKocId]: {
            ...existing,
            video_views: data.video_views != null ? String(data.video_views) : existing.video_views,
            video_likes: data.video_likes != null ? String(data.video_likes) : existing.video_likes,
            video_comments: data.video_comments != null ? String(data.video_comments) : existing.video_comments,
            video_shares: data.video_shares != null ? String(data.video_shares) : existing.video_shares,
          },
        };
      });

      setFetchStatuses((p) => ({ ...p, [campaignKocId]: "ok" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      setFetchStatuses((p) => ({ ...p, [campaignKocId]: "err" }));
      setFetchErrors((p) => ({ ...p, [campaignKocId]: msg }));
    }
  }, []);

  // ─── Batch fetch all KOCs with video URLs ─────────────────────────────────

  async function fetchAll() {
    const targets = report.kocs.filter((k) => rows[k.campaign_koc_id]?.video_url);
    if (targets.length === 0) return;

    setBatchProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const koc = targets[i];
      await fetchMetrics(koc.campaign_koc_id, rows[koc.campaign_koc_id].video_url);
      setBatchProgress({ done: i + 1, total: targets.length });
      // 600 ms between requests to avoid rate limiting on tikwm.com
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setBatchProgress(null);
  }

  const isBatchRunning = batchProgress !== null;
  const kocsWithUrl = report.kocs.filter((k) => rows[k.campaign_koc_id]?.video_url).length;

  // ─── Save ─────────────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      const updates: MetricsUpdate[] = report.kocs.map((k) => {
        const r = rows[k.campaign_koc_id];
        return {
          campaign_koc_id: k.campaign_koc_id,
          video_url: r.video_url || null,
          video_views: parseNum(r.video_views),
          video_likes: parseNum(r.video_likes),
          video_comments: parseNum(r.video_comments),
          video_shares: parseNum(r.video_shares),
          video_gmv: parseNum(r.video_gmv),
        };
      });

      const [metricsResult, notesResult] = await Promise.all([
        updateKocVideoMetrics(report.campaign_id, updates),
        updateReportNotes(report.campaign_id, notes),
      ]);

      if (!metricsResult.success || !notesResult.success) {
        const err =
          (!metricsResult.success ? metricsResult.error : undefined) ??
          (!notesResult.success ? notesResult.error : undefined);
        setSaveMsg("Lỗi: " + err);
      } else {
        setSaveMsg("Đã lưu!");
        setTimeout(() => setSaveMsg(null), 2000);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishReport(report.campaign_id);
      if (result.success) {
        setShareUrl(`${originRef.current}/r/${result.data.share_token}`);
      } else {
        setSaveMsg("Lỗi xuất bản: " + result.error);
      }
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishReport(report.campaign_id);
      if (result.success) setShareUrl(null);
      else setSaveMsg("Lỗi: " + result.error);
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ─── Live summary totals ───────────────────────────────────────────────────

  const totalViews = report.kocs.reduce(
    (s, k) => s + (parseNum(rows[k.campaign_koc_id]?.video_views ?? "") ?? k.video_views ?? 0), 0
  );
  const totalGmv = report.kocs.reduce(
    (s, k) => s + (parseNum(rows[k.campaign_koc_id]?.video_gmv ?? "") ?? k.video_gmv ?? 0), 0
  );
  const videoCount = report.kocs.filter(
    (k) => rows[k.campaign_koc_id]?.video_url || k.video_url
  ).length;
  const ratedKocs = report.kocs.filter((k) => k.client_quality_rating != null);
  const avgRating =
    ratedKocs.length > 0
      ? ratedKocs.reduce((s, k) => s + (k.client_quality_rating ?? 0), 0) / ratedKocs.length
      : null;
  const durationDays =
    report.start_date && report.end_date
      ? Math.round(
          (new Date(report.end_date).getTime() - new Date(report.start_date).getTime()) /
            86_400_000
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="KOC tham gia" value={String(report.kocs.length)} icon={Users} color="bg-blue-50 text-blue-500" />
        <SummaryCard label="Videos" value={String(videoCount)} sub={`/ ${report.kocs.length} KOC`} icon={Video} color="bg-purple-50 text-purple-500" />
        <SummaryCard label="Tổng lượt xem" value={fmt(totalViews) || "—"} icon={Eye} color="bg-green-50 text-green-600" />
        <SummaryCard label="Tổng GMV" value={totalGmv > 0 ? fmtCurrency(totalGmv) : "—"} icon={TrendingUp} color="bg-yellow-50 text-yellow-600" />
        <SummaryCard
          label="Đánh giá TB"
          value={avgRating != null ? `${avgRating.toFixed(1)}/5` : "—"}
          sub={durationDays != null ? `${durationDays} ngày` : undefined}
          icon={Star}
          color="bg-orange-50 text-orange-500"
        />
      </div>

      {/* Metrics table */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Số liệu từng KOC</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Link video tự điền nếu KOC đã nộp qua magic link.{" "}
              <span className="text-blue-500">
                Bấm <RefreshCw className="h-2.5 w-2.5 inline" /> để lấy metrics từ TikTok tự động.
              </span>
            </p>
          </div>

          {/* Batch fetch button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={isBatchRunning || kocsWithUrl === 0}
            className="flex-shrink-0 text-xs"
            title={kocsWithUrl === 0 ? "Chưa có KOC nào có link video" : ""}
          >
            {isBatchRunning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                {batchProgress!.done}/{batchProgress!.total}
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Lấy tất cả tự động
                {kocsWithUrl > 0 && (
                  <span className="ml-1 text-zinc-400">({kocsWithUrl})</span>
                )}
              </>
            )}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="text-left py-2 px-3 font-medium">KOC</th>
                <th className="text-left py-2 pr-2 font-medium">Link video</th>
                <th className="text-left py-2 pr-2 font-medium">
                  <Eye className="h-3 w-3 inline mr-1" />Xem
                </th>
                <th className="text-left py-2 pr-2 font-medium">
                  <ThumbsUp className="h-3 w-3 inline mr-1" />Like
                </th>
                <th className="text-left py-2 pr-2 font-medium">
                  <MessageCircle className="h-3 w-3 inline mr-1" />Cmt
                </th>
                <th className="text-left py-2 pr-2 font-medium">
                  <Share2 className="h-3 w-3 inline mr-1" />Share
                </th>
                <th className="text-left py-2 font-medium">
                  <TrendingUp className="h-3 w-3 inline mr-1" />GMV (₫)
                </th>
              </tr>
            </thead>
            <tbody>
              {report.kocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 text-sm">
                    Chưa có KOC nào trong campaign này
                  </td>
                </tr>
              ) : (
                report.kocs.map((koc) => (
                  <KocMetricRow
                    key={koc.campaign_koc_id}
                    koc={koc}
                    state={rows[koc.campaign_koc_id]}
                    fetchStatus={fetchStatuses[koc.campaign_koc_id] ?? "idle"}
                    fetchErr={fetchErrors[koc.campaign_koc_id] ?? ""}
                    onChange={(field, val) => updateRow(koc.campaign_koc_id, field, val)}
                    onFetch={() => fetchMetrics(koc.campaign_koc_id, rows[koc.campaign_koc_id].video_url)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report notes */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-2">
        <label className="text-sm font-semibold text-zinc-900">
          Nhận xét tổng quan (gửi kèm cho client)
        </label>
        <Textarea
          className="text-sm min-h-[100px]"
          placeholder="Mô tả kết quả chiến dịch, điểm nổi bật, đề xuất cho lần hợp tác tiếp theo..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Actions bar */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? "Đang lưu..." : "Lưu số liệu"}
            </Button>

            {!shareUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={isPending || report.kocs.length === 0}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Xuất báo cáo
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleUnpublish} disabled={isPending}>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Hủy xuất bản
              </Button>
            )}

            {saveMsg && (
              <span className={`text-xs ${saveMsg.startsWith("Lỗi") ? "text-red-500" : "text-green-600"}`}>
                {saveMsg}
              </span>
            )}
          </div>

          {shareUrl && (
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 flex-1 min-w-0 max-w-md">
              <Badge variant="success" className="text-[10px] flex-shrink-0">Live</Badge>
              <span className="text-zinc-500 truncate text-xs flex-1">{shareUrl}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={handleCopy} className="text-zinc-400 hover:text-zinc-700 transition-colors" title="Sao chép link">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition-colors" title="Xem báo cáo">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
