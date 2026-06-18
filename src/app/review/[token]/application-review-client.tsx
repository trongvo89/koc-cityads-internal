"use client";

import { useState, useTransition, useEffect } from "react";
import { ExternalLink, Check, X, MessageSquare, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { submitApplicationReview, type PublicReviewData } from "@/lib/actions/applications";

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

  const isAgencyApproved = app.agency_status === "approved";

  const animFollower = useCountUp(app.follower_count);
  const animGmv      = useCountUp(app.gmv_30d);

  function handleReview(newStatus: "approved" | "rejected") {
    if (isAgencyApproved) return;
    startTransition(async () => {
      const result = await submitApplicationReview(reviewToken, app.id, newStatus, note || undefined);
      if (result.success) {
        setStatus(newStatus);
        onStatusChange(app.id, newStatus, note);
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
            <a
              href={app.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-900 hover:text-sky-600 flex items-center gap-1.5 text-sm transition-colors group"
            >
              {app.tiktok_handle}
              <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-sky-500 flex-shrink-0" />
            </a>
            <p className="text-xs text-zinc-400 mt-0.5">{app.tiktok_name}</p>
            {isAgencyApproved && app.agency_review_note && (
              <p className="text-[10px] text-blue-500 mt-0.5 truncate max-w-[180px]">{app.agency_review_note}</p>
            )}
          </div>
          {isAgencyApproved && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border text-blue-700 bg-blue-50 border-blue-200 flex items-center gap-0.5">
              <ShieldCheck className="h-3 w-3" />
              Xem xét
            </span>
          )}
          {!isAgencyApproved && status !== "pending" && (
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
        <div className="mt-2.5">
          <span className="text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
            {STYLE_LABEL[app.video_style] ?? app.video_style}
          </span>
        </div>
      </div>

      {/* Comment */}
      {!isAgencyApproved && (showComment || status === "rejected") && (
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
      {isAgencyApproved ? (
        <div className="px-4 py-2.5 flex items-center justify-center gap-2 border-t border-zinc-100 bg-blue-50/30">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">
            Agency đã xem xét — không thể thay đổi
          </span>
        </div>
      ) : (
        <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/50">
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

export default function ApplicationReviewClient({ reviewToken, initialApplications, campaign }: Props) {
  const [apps, setApps] = useState(initialApplications);

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
                  {agencyApprovedCount} xem xét
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

      {apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center shadow-sm">
          <p className="text-zinc-400 text-sm">Chưa có KOC nào đăng ký.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {apps.map((app, i) => (
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
