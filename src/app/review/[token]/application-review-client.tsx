"use client";

import { useState, useTransition, useEffect } from "react";
import { ExternalLink, Check, X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { submitApplicationReview, type PublicReviewData } from "@/lib/actions/applications";

type Application = PublicReviewData["applications"][number];
type Campaign    = PublicReviewData["campaign"];
type Status      = "pending" | "approved" | "rejected";

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start: number | undefined;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatVnd(n: number): string {
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

  const animFollower = useCountUp(app.follower_count);
  const animGmv      = useCountUp(app.gmv_30d);

  function handleReview(newStatus: "approved" | "rejected") {
    startTransition(async () => {
      const result = await submitApplicationReview(reviewToken, app.id, newStatus, note || undefined);
      if (result.success) {
        setStatus(newStatus);
        onStatusChange(app.id, newStatus, note);
      }
    });
  }

  const cardBg: React.CSSProperties =
    status === "approved" ? { background: "rgba(34,197,94,0.04)",  borderColor: "rgba(34,197,94,0.18)"  } :
    status === "rejected" ? { background: "rgba(239,68,68,0.04)",  borderColor: "rgba(239,68,68,0.18)"  } :
                            { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" };

  const topBar: React.CSSProperties =
    status === "approved" ? { background: "linear-gradient(90deg,#22c55e,#16a34a)" } :
    status === "rejected" ? { background: "linear-gradient(90deg,#ef4444,#dc2626)" } :
                            { background: "linear-gradient(90deg,#ff0050,#7928ca)"  };

  return (
    <div
      className="animate-slide-up rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        ...cardBg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        animationDelay: `${index * 55}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Gradient top accent bar */}
      <div className="h-0.5" style={topBar} />

      {/* Content */}
      <div className="px-4 pt-3.5 pb-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <a
              href={app.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-900 hover:text-white flex items-center gap-1.5 text-sm transition-colors group"
            >
              {app.tiktok_handle}
              <ExternalLink className="h-3 w-3 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0" />
            </a>
            <p className="text-xs text-zinc-500 mt-0.5">{app.tiktok_name}</p>
          </div>
          {status !== "pending" && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                status === "approved"
                  ? "text-green-400 border border-green-500/20"
                  : "text-red-400 border border-red-500/20"
              }`}
              style={{
                background: status === "approved"
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(239,68,68,0.1)",
              }}
            >
              {status === "approved" ? "Đã duyệt" : "Từ chối"}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Followers</p>
            <p className="text-sm font-bold text-zinc-900">{formatFollower(animFollower)}</p>
          </div>
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">GMV 30d</p>
            <p className="text-sm font-bold text-zinc-900">{formatVnd(animGmv)}đ</p>
          </div>
        </div>

        {/* Style tag */}
        <div className="mt-2.5">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: "linear-gradient(135deg,rgba(255,0,80,0.1),rgba(121,40,202,0.1))",
              border: "1px solid rgba(255,0,80,0.15)",
              color: "#c084fc",
            }}
          >
            {STYLE_LABEL[app.video_style] ?? app.video_style}
          </span>
        </div>
      </div>

      {/* Comment */}
      {(showComment || status === "rejected") && (
        <div className="px-4 pb-3">
          <Textarea
            rows={2}
            placeholder="Ghi chú (tùy chọn)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-xs resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#c2c2e0",
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setShowComment((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1 transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          {showComment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className="flex items-center gap-2">
          <button
            disabled={isPending}
            onClick={() => handleReview("rejected")}
            className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1 transition-all duration-150 disabled:opacity-50 ${
              status === "rejected"
                ? "text-red-400 border border-red-500/30"
                : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent"
            }`}
            style={status === "rejected" ? { background: "rgba(239,68,68,0.12)" } : undefined}
          >
            <X className="h-3 w-3" />
            Từ chối
          </button>
          <button
            disabled={isPending}
            onClick={() => handleReview("approved")}
            className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1 transition-all duration-150 disabled:opacity-50 ${
              status === "approved"
                ? "text-green-400 border border-green-500/30"
                : "text-zinc-500 hover:text-green-400 hover:bg-green-500/10 border border-transparent"
            }`}
            style={status === "approved" ? { background: "rgba(34,197,94,0.12)" } : undefined}
          >
            <Check className="h-3 w-3" />
            Duyệt
          </button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 text-right px-4 pb-2.5">
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

  const approved    = apps.filter((a) => a.status === "approved").length;
  const packageSize = campaign.package_size;
  const pct         = Math.min((approved / Math.max(packageSize, 1)) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto px-4 -mt-8 pb-16">
      {/* Progress summary */}
      {apps.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <span className="text-xs font-medium text-zinc-600">
              {approved}/{packageSize} KOC đã duyệt
            </span>
            <div className="flex gap-4 text-xs">
              <span className="text-green-400 font-semibold">{approved} duyệt</span>
              <span className="text-red-400 font-semibold">
                {apps.filter((a) => a.status === "rejected").length} từ chối
              </span>
              <span className="text-zinc-500">
                {apps.filter((a) => a.status === "pending").length} chờ
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ff0050,#7928ca)" }}
            />
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-zinc-500 text-sm">Chưa có KOC nào đăng ký.</p>
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
