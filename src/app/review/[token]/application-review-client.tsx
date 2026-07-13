"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { ExternalLink, Check, X, MessageSquare, ChevronDown, ChevronUp, ShieldCheck, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { submitApplicationReview, type PublicReviewData } from "@/lib/actions/applications";
import { tiktokChannelUrl } from "@/lib/utils/url";

type Application = PublicReviewData["applications"][number];
type Campaign    = PublicReviewData["campaign"];
type Status      = "pending" | "approved" | "rejected";

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start: number | undefined;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fFollower(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fVnd(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const STYLE_LABEL: Record<string, string> = {
  show_face_voice: "Show mặt & giọng",
  ugc_style:       "UGC & Style",
};

// ─── KOC Card ─────────────────────────────────────────────────────────────────

interface KocCardProps {
  app: Application;
  reviewToken: string;
  onStatusChange: (id: string, status: Status, note?: string) => void;
  index: number;
}

function KocCard({ app, reviewToken, onStatusChange, index }: KocCardProps) {
  const [status, setStatus]           = useState<Status>(app.status as Status);
  const [showComment, setShowComment] = useState(false);
  const [note, setNote]               = useState(app.review_note ?? "");
  const [isPending, startTransition]  = useTransition();
  const [error, setError]             = useState<string | null>(null);

  const isAgencyApproved = app.agency_status === "approved";
  // The RPC blocks any client review once the agency has acted (approved OR
  // rejected), so the card must be locked in both cases — not just approved.
  const isAgencyLocked = app.agency_status != null;

  const animFollower = useCountUp(app.follower_count ?? 0);
  const animGmv      = useCountUp(app.gmv_30d ?? 0);

  function handleReview(newStatus: "approved" | "rejected") {
    if (isAgencyLocked) return;
    setError(null);
    startTransition(async () => {
      const result = await submitApplicationReview(reviewToken, app.id, newStatus, note || undefined);
      if (result.success) {
        setStatus(newStatus);
        onStatusChange(app.id, newStatus, note);
      } else {
        setError(result.error);
      }
    });
  }

  /* Top accent bar color */
  const accentBar =
    isAgencyApproved     ? "bg-blue-500"     :
    status === "approved" ? "bg-emerald-500" :
    status === "rejected" ? "bg-red-500"     :
    "brand-gradient";

  /* Card border */
  const cardBorder =
    isAgencyApproved     ? "border-blue-200"     :
    status === "approved" ? "border-emerald-200" :
    status === "rejected" ? "border-red-200"     :
    "border-zinc-200";

  return (
    <div
      className={`animate-slide-up bg-white rounded-2xl border ${cardBorder} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
    >
      {/* Accent bar */}
      <div className={`h-1 w-full ${accentBar}`} />

      {/* Content */}
      <div className="px-4 pt-3.5 pb-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {(() => {
              const url = tiktokChannelUrl(app);
              return url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zinc-900 hover:text-sky-600 flex items-center gap-1.5 text-sm transition-colors group"
                >
                  {app.tiktok_handle}
                  <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-sky-500 flex-shrink-0" />
                </a>
              ) : (
                <span className="font-semibold text-zinc-900 text-sm">{app.tiktok_handle}</span>
              );
            })()}
            <p className="text-xs text-zinc-400 mt-0.5">{app.tiktok_name}</p>
            {isAgencyApproved && app.agency_review_note && (
              <p className="text-[10px] text-blue-500 mt-0.5 truncate max-w-[180px]">{app.agency_review_note}</p>
            )}
          </div>
          {isAgencyApproved && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border text-blue-700 bg-blue-50 border-blue-200 flex items-center gap-0.5">
              <ShieldCheck className="h-3 w-3" />
              Agency duyệt
            </span>
          )}
          {isAgencyLocked && !isAgencyApproved && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border text-red-600 bg-red-50 border-red-200 flex items-center gap-0.5">
              <ShieldCheck className="h-3 w-3" />
              Agency từ chối
            </span>
          )}
          {!isAgencyLocked && status !== "pending" && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border ${
              status === "approved"
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-red-600 bg-red-50 border-red-200"
            }`}>
              {status === "approved" ? "Đã duyệt" : "Từ chối"}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-100">
            <p className="text-[10px] text-zinc-400 mb-0.5 uppercase tracking-wider font-medium">Followers</p>
            <p className="text-sm font-bold text-zinc-800">{fFollower(animFollower)}</p>
          </div>
          <div className="bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-100">
            <p className="text-[10px] text-zinc-400 mb-0.5 uppercase tracking-wider font-medium">GMV 30d</p>
            <p className="text-sm font-bold text-zinc-800">{fVnd(animGmv)}đ</p>
          </div>
        </div>

        {/* Style tag */}
        {app.video_style && (
          <div className="mt-2.5">
            <span className="text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
              {STYLE_LABEL[app.video_style] ?? app.video_style}
            </span>
          </div>
        )}
      </div>

      {/* Comment */}
      {!isAgencyLocked && (showComment || status === "rejected") && (
        <div className="px-4 pb-3">
          <Textarea
            rows={2}
            placeholder="Ghi chú (tùy chọn)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-xs resize-none bg-zinc-50 border-zinc-200"
          />
        </div>
      )}

      {/* Action bar */}
      {isAgencyLocked ? (
        <div className="px-4 py-2.5 flex items-center justify-center gap-2 border-t border-zinc-100 bg-blue-50/30">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">
            Agency đã xử lý — không thể thay đổi
          </span>
        </div>
      ) : (
        <div className="px-4 py-2.5 flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50/50">
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setShowComment((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            {showComment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              disabled={isPending}
              onClick={() => handleReview("rejected")}
              className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50 border ${
                status === "rejected"
                  ? "bg-red-600 text-white border-red-600"
                  : "text-zinc-600 border-zinc-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <X className="h-3 w-3" />
              Từ chối
            </button>
            <button
              disabled={isPending}
              onClick={() => handleReview("approved")}
              className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50 border ${
                status === "approved"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "text-zinc-600 border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              <Check className="h-3 w-3" />
              Duyệt
            </button>
          </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-zinc-300 text-right px-4 pb-2.5">
        {new Date(app.applied_at).toLocaleDateString("vi-VN")}
      </p>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

interface Props {
  reviewToken: string;
  initialApplications: Application[];
  campaign: Campaign;
}

type SortKey = "follower" | "gmv" | null;
type SortDir = "desc" | "asc";

export default function ApplicationReviewClient({ reviewToken, initialApplications, campaign }: Props) {
  const [apps, setApps] = useState(initialApplications);

  // Filter / sort state (affects the grid only, not the totals)
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minFollower, setMinFollower] = useState("");
  const [minGmv, setMinGmv] = useState("");

  function toggleSort(key: "follower" | "gmv") {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const hasActiveFilters = !!minFollower || !!minGmv || sortKey !== null;

  function clearFilters() {
    setMinFollower("");
    setMinGmv("");
    setSortKey(null);
    setSortDir("desc");
  }

  const visibleApps = useMemo(() => {
    let list = [...apps];

    const minF = Number(minFollower);
    if (minFollower && !isNaN(minF)) {
      list = list.filter((a) => a.follower_count >= minF);
    }
    const minG = Number(minGmv);
    if (minGmv && !isNaN(minG)) {
      list = list.filter((a) => a.gmv_30d >= minG);
    }

    if (sortKey) {
      const dir = sortDir === "desc" ? -1 : 1;
      list.sort((a, b) => {
        const av = sortKey === "follower" ? a.follower_count : a.gmv_30d;
        const bv = sortKey === "follower" ? b.follower_count : b.gmv_30d;
        return (av - bv) * dir;
      });
    }

    return list;
  }, [apps, minFollower, minGmv, sortKey, sortDir]);

  function handleStatusChange(id: string, status: Status, note?: string) {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status, review_note: note ?? a.review_note } : a))
    );
  }

  const agencyApprovedCount = apps.filter((a) => a.status === "rejected" && a.agency_status === "approved").length;
  const approved    = apps.filter((a) => a.status === "approved").length + agencyApprovedCount;
  const packageSize = campaign.package_size;
  const pct         = Math.min((approved / Math.max(packageSize, 1)) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12">
      {/* Progress bar */}
      {apps.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-xs font-semibold text-zinc-700">
              {approved}/{packageSize} KOC đã duyệt
            </span>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 font-semibold">{approved} duyệt</span>
              <span className="text-red-500 font-semibold">
                {apps.filter((a) => a.status === "rejected" && a.agency_status !== "approved").length} từ chối
              </span>
              {agencyApprovedCount > 0 && (
                <span className="text-blue-500 font-semibold">
                  {agencyApprovedCount} agency duyệt
                </span>
              )}
              <span className="text-zinc-400">
                {apps.filter((a) => a.status === "pending").length} chờ
              </span>
            </div>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 brand-gradient"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter / sort toolbar */}
      {apps.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-700">Lọc &amp; sắp xếp</span>
            <span className="text-xs text-zinc-400 ml-auto">
              Hiển thị {visibleApps.length}/{apps.length} KOC
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Sort chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 mr-0.5">Sắp xếp:</span>
              {(["follower", "gmv"] as const).map((key) => {
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                      active
                        ? "bg-sky-600 text-white border-sky-600"
                        : "text-zinc-600 border-zinc-200 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {key === "follower" ? "Followers" : "GMV"}
                    {active &&
                      (sortDir === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      ))}
                  </button>
                );
              })}
            </div>

            {/* Min followers */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">Followers tối thiểu</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minFollower}
                onChange={(e) => setMinFollower(e.target.value)}
                placeholder="VD: 10000"
                className="h-8 w-28 rounded-lg border border-zinc-200 px-2.5 text-xs focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              />
            </div>

            {/* Min GMV */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">GMV tối thiểu</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minGmv}
                onChange={(e) => setMinGmv(e.target.value)}
                placeholder="VD: 5000000"
                className="h-8 w-32 rounded-lg border border-zinc-200 px-2.5 text-xs focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-500 border border-zinc-200 hover:bg-zinc-50 flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center shadow-sm">
          <p className="text-zinc-400 text-sm">Chưa có KOC nào đăng ký.</p>
        </div>
      ) : visibleApps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center shadow-sm">
          <p className="text-zinc-400 text-sm mb-3">Không có KOC nào khớp bộ lọc.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-sky-600 hover:text-sky-800 inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Xóa lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {visibleApps.map((app, i) => (
            <KocCard
              key={app.id}
              app={app}
              reviewToken={reviewToken}
              onStatusChange={handleStatusChange}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
