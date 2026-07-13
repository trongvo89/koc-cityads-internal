"use client";

import { useState, useTransition, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  Truck,
  PackageCheck,
  Film,
  Award,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  approveKoc,
  rateKoc,
} from "@/lib/actions/client-campaigns";
import type { ClientKocRow } from "@/lib/actions/client-campaigns";
import { normalizeUrl } from "@/lib/utils/url";

// ─── Status helpers ───────────────────────────────────────────────────────────

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info";

const CONTENT_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting: { label: "Chờ video", variant: "secondary" },
  submitted: { label: "Đã nộp video", variant: "info" },
  need_revision: { label: "Cần sửa", variant: "warning" },
  approved: { label: "Video OK", variant: "success" },
  invalid_link: { label: "Link lỗi", variant: "destructive" },
  late: { label: "Trễ hạn", variant: "destructive" },
};

// Progress timeline steps — order matters
type Step = {
  key: string;
  label: string;
  icon: typeof Check;
  // Returns the reached state given the current operation status + timestamps
  reached: (koc: ClientKocRow) => "done" | "current" | "pending";
};

// Post-simplify, operation_status only holds in_progress/completed/cancelled, so
// the timeline is derived from real signals that still exist: milestone
// timestamps, content_status, and video links.
function hasVideo(k: ClientKocRow): boolean {
  return (
    !!k.video_url ||
    (Array.isArray(k.final_link) && k.final_link.length > 0) ||
    k.content_status === "submitted" ||
    k.content_status === "approved" ||
    !!k.video_submitted_at
  );
}
function isCompleted(k: ClientKocRow): boolean {
  return k.operation_status === "completed" || !!k.completed_at;
}

const STEPS: Step[] = [
  {
    key: "approved",
    label: "Duyệt KOC",
    icon: Check,
    reached: (k) => (k.client_approval_status === "pending" ? "current" : "done"),
  },
  {
    key: "sample_sent",
    label: "Đã gửi sản phẩm",
    icon: Truck,
    reached: (k) => {
      if (k.sample_sent_at || k.sample_received_at || hasVideo(k) || isCompleted(k)) return "done";
      return k.client_approval_status === "approved" ? "current" : "pending";
    },
  },
  {
    key: "sample_received",
    label: "KOC nhận sản phẩm",
    icon: PackageCheck,
    reached: (k) => {
      if (k.sample_received_at || hasVideo(k) || isCompleted(k)) return "done";
      return k.sample_sent_at ? "current" : "pending";
    },
  },
  {
    key: "video_submitted",
    label: "KOC nộp video",
    icon: Film,
    reached: (k) => {
      if (hasVideo(k) || isCompleted(k)) return "done";
      return k.sample_received_at ? "current" : "pending";
    },
  },
  {
    key: "completed",
    label: "Hoàn thành",
    icon: Award,
    reached: (k) => {
      if (isCompleted(k)) return "done";
      return hasVideo(k) ? "current" : "pending";
    },
  },
];

function ProgressTimeline({ koc }: { koc: ClientKocRow }) {
  if (koc.client_approval_status === "rejected") return null;

  const rejected = false; // (only approved KOCs reach here)
  const states = STEPS.map((s) => s.reached(koc));

  return (
    <div className="mt-3 pt-3 border-t border-zinc-100">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, idx) => {
          const state = states[idx];
          const Icon = step.icon;
          const isDone = state === "done";
          const isCurrent = state === "current";
          const dotClass = rejected
            ? "bg-zinc-100 text-zinc-300"
            : isDone
            ? "bg-green-500 text-white"
            : isCurrent
            ? "bg-blue-500 text-white ring-4 ring-blue-100"
            : "bg-zinc-100 text-zinc-400";
          const labelClass = isDone
            ? "text-zinc-700"
            : isCurrent
            ? "text-blue-700 font-medium"
            : "text-zinc-400";

          return (
            <div
              key={step.key}
              className="flex flex-col items-center text-center flex-1 min-w-0"
            >
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      states[idx - 1] === "done" ? "bg-green-500" : "bg-zinc-200"
                    }`}
                  />
                )}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${dotClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isDone ? "bg-green-500" : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
              <span className={`text-[10px] mt-1.5 leading-tight ${labelClass}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Metrics helpers ─────────────────────────────────────────────────────────

function formatMetric(value: number) {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(value);
}

function MetricsSummaryBar({ kocs }: { kocs: ClientKocRow[] }) {
  const totals = kocs.reduce(
    (acc, k) => ({
      views: acc.views + (k.video_views ?? 0),
      likes: acc.likes + (k.video_likes ?? 0),
      comments: acc.comments + (k.video_comments ?? 0),
      shares: acc.shares + (k.video_shares ?? 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  if (totals.views === 0 && totals.likes === 0) return null;

  const items = [
    { icon: Eye, label: "Views", value: totals.views },
    { icon: Heart, label: "Likes", value: totals.likes },
    { icon: MessageCircle, label: "Comments", value: totals.comments },
    { icon: Share2, label: "Shares", value: totals.shares },
  ].filter((i) => i.value > 0);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p className="text-xs font-semibold text-blue-700 mb-2">Tổng hợp hiệu quả</p>
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <item.icon className="h-4 w-4 text-blue-500" />
            <span className="text-lg font-bold text-zinc-900">{formatMetric(item.value)}</span>
            <span className="text-xs text-zinc-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KocMetricsInline({ koc }: { koc: ClientKocRow }) {
  if (!koc.video_views && !koc.video_likes && !koc.video_comments) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
      {koc.video_views != null && koc.video_views > 0 && (
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" /> {formatMetric(koc.video_views)}
        </span>
      )}
      {koc.video_likes != null && koc.video_likes > 0 && (
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3" /> {formatMetric(koc.video_likes)}
        </span>
      )}
      {koc.video_comments != null && koc.video_comments > 0 && (
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" /> {formatMetric(koc.video_comments)}
        </span>
      )}
      {koc.video_shares != null && koc.video_shares > 0 && (
        <span className="flex items-center gap-1">
          <Share2 className="h-3 w-3" /> {formatMetric(koc.video_shares)}
        </span>
      )}
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 5,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: size }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= display;
        return (
          <button
            key={idx}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(idx)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(idx)}
            className={`${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } transition-transform`}
            aria-label={`${idx} sao`}
          >
            <Star
              className={`h-5 w-5 ${
                filled ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Rating section ───────────────────────────────────────────────────────────

function RatingSection({
  koc,
  campaignId,
}: {
  koc: ClientKocRow;
  campaignId: string;
}) {
  const [rating, setRating] = useState(koc.client_quality_rating ?? 0);
  const [review, setReview] = useState(koc.client_quality_review ?? "");
  const [editing, setEditing] = useState(!koc.client_quality_rating);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    koc.client_quality_rated_at
  );

  function handleSave() {
    if (rating < 1) {
      setError("Vui lòng chọn số sao trước khi gửi.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rateKoc(
        koc.campaign_koc_id,
        campaignId,
        rating,
        review || undefined
      );
      if (result.success) {
        setSavedAt(new Date().toISOString());
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-100">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-2">
        <Award className="h-3.5 w-3.5" />
        Đánh giá chất lượng KOC
      </div>

      {!editing && koc.client_quality_rating ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StarRating value={koc.client_quality_rating} readOnly />
            <span className="text-sm text-zinc-600 font-medium">
              {koc.client_quality_rating}/5
            </span>
          </div>
          {koc.client_quality_review && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-700 whitespace-pre-wrap">
              {koc.client_quality_review}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            {savedAt && (
              <span>
                Đã đánh giá {new Date(savedAt).toLocaleString("vi-VN")}
              </span>
            )}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => setEditing(true)}
            >
              Chỉnh sửa
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <span className="text-sm text-zinc-500">{rating}/5</span>
            )}
          </div>
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Nhận xét về chất lượng KOC (không bắt buộc)..."
            rows={2}
            className="text-sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || rating < 1}
              className="gap-1.5"
            >
              <Award className="h-3.5 w-3.5" />
              {isPending ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
            {koc.client_quality_rating && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRating(koc.client_quality_rating ?? 0);
                  setReview(koc.client_quality_review ?? "");
                  setEditing(false);
                  setError(null);
                }}
                disabled={isPending}
              >
                Hủy
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single KOC card ──────────────────────────────────────────────────────────

function KocCard({
  koc,
  campaignId,
}: {
  koc: ClientKocRow;
  campaignId: string;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(koc.client_approval_status);
  const [error, setError] = useState<string | null>(null);

  const isPending_ = localStatus === "pending";
  const isApproved = localStatus === "approved";
  const isRejected = localStatus === "rejected";

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveKoc(koc.campaign_koc_id, campaignId, "approved");
      if (result.success) {
        setLocalStatus("approved");
        setShowRejectForm(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleReject() {
    if (!showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await approveKoc(
        koc.campaign_koc_id,
        campaignId,
        "rejected",
        rejectNote || undefined
      );
      if (result.success) {
        setLocalStatus("rejected");
        setShowRejectForm(false);
      } else {
        setError(result.error);
      }
    });
  }

  const contentStatus = koc.content_status
    ? CONTENT_STATUS_MAP[koc.content_status]
    : null;

  // Rating opens once the KOC has delivered a video (or the campaign completed).
  const canRate = isApproved && (hasVideo(koc) || isCompleted(koc));

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-colors ${
        isPending_
          ? "border-zinc-200"
          : isApproved
          ? "border-green-200 bg-green-50/20"
          : "border-red-200 bg-red-50/20"
      }`}
    >
      {/* KOC Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900">{koc.koc_name}</span>
            {isApproved && (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Đã duyệt
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Từ chối
              </Badge>
            )}
            {isPending_ && (
              <Badge variant="warning" className="text-xs">
                Chờ duyệt
              </Badge>
            )}
          </div>

          {/* Category + Followers + Location */}
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
            {koc.category && koc.category.length > 0 && (
              <span>{koc.category.join(", ")}</span>
            )}
            {koc.follower != null && (
              <span className="flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                {koc.follower >= 1000
                  ? `${(koc.follower / 1000).toFixed(0)}K`
                  : koc.follower}{" "}
                followers
              </span>
            )}
            {koc.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {koc.location}
              </span>
            )}
          </div>

          {/* Social links */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {[
              { url: normalizeUrl(koc.tiktok_url), label: "TikTok" },
              { url: normalizeUrl(koc.instagram_url), label: "Instagram" },
              { url: normalizeUrl(koc.facebook_url), label: "Facebook" },
            ]
              .filter((s) => s.url)
              .map((s) => (
                <a
                  key={s.label}
                  href={s.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <ExternalLink className="h-3 w-3" />
                  {s.label}
                </a>
              ))}
          </div>
        </div>

        {/* Content status + video */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {contentStatus && (
            <Badge variant={contentStatus.variant} className="text-xs">
              {contentStatus.label}
            </Badge>
          )}
          {koc.video_url && (
            <a
              href={koc.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <ExternalLink className="h-3 w-3" />
              Xem video
            </a>
          )}
          {koc.deadline_date && (
            <span className="text-xs text-zinc-400">
              Deadline:{" "}
              {new Date(koc.deadline_date).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>
      </div>

      {/* Rejection note (if rejected) */}
      {isRejected && (koc.client_note || rejectNote) && (
        <div className="mt-3 text-xs text-zinc-500 bg-zinc-50 rounded px-3 py-2">
          <span className="font-medium">Lý do: </span>
          {koc.client_note ?? rejectNote}
        </div>
      )}

      {/* Progress timeline for approved KOCs */}
      {isApproved && <ProgressTimeline koc={koc} />}

      {/* Final video links */}
      {isApproved && koc.final_link && koc.final_link.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-2">
            <Film className="h-3.5 w-3.5" />
            Video đã đăng ({koc.final_link.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {koc.final_link.map((link, idx) => (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md px-2 py-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Video {idx + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Video metrics inline */}
      {isApproved && <KocMetricsInline koc={koc} />}

      {/* Rating (once video approved or completed) */}
      {canRate && <RatingSection koc={koc} campaignId={campaignId} />}

      {/* Approval actions (only if pending) */}
      {isPending_ && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          {showRejectForm && (
            <div className="mb-3">
              <Textarea
                placeholder="Lý do từ chối (không bắt buộc)..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex items-center gap-2">
            {!showRejectForm ? (
              <>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Duyệt KOC
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isPending}
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Từ chối
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectNote("");
                  }}
                  disabled={isPending}
                >
                  Hủy
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section with collapse ────────────────────────────────────────────────────

function KocSection({
  title,
  kocs,
  campaignId,
  defaultOpen = true,
}: {
  title: string;
  kocs: ClientKocRow[];
  campaignId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (kocs.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <span className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">
          {kocs.length}
        </span>
        <span className="ml-auto text-zinc-400 group-hover:text-zinc-600">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="space-y-3">
          {kocs.map((koc) => (
            <KocCard key={koc.campaign_koc_id} koc={koc} campaignId={campaignId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

type BoardSortKey = "follower" | "views" | "gmv" | "rating" | null;
type BoardSortDir = "desc" | "asc";

export default function KocApprovalBoard({
  kocs,
  campaignId,
}: {
  kocs: ClientKocRow[];
  campaignId: string;
}) {
  const [sortKey, setSortKey] = useState<BoardSortKey>(null);
  const [sortDir, setSortDir] = useState<BoardSortDir>("desc");
  const [minFollower, setMinFollower] = useState("");
  const [minViews, setMinViews] = useState("");

  function toggleSort(key: Exclude<BoardSortKey, null>) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const hasActiveFilters = !!minFollower || !!minViews || sortKey !== null;

  function clearFilters() {
    setMinFollower("");
    setMinViews("");
    setSortKey(null);
    setSortDir("desc");
  }

  const filteredKocs = useMemo(() => {
    let list = [...kocs];

    const minF = Number(minFollower);
    if (minFollower && !isNaN(minF)) {
      list = list.filter((k) => (k.follower ?? 0) >= minF);
    }
    const minV = Number(minViews);
    if (minViews && !isNaN(minV)) {
      list = list.filter((k) => (k.video_views ?? 0) >= minV);
    }

    if (sortKey) {
      const dir = sortDir === "desc" ? -1 : 1;
      const pick = (k: ClientKocRow) =>
        sortKey === "follower"
          ? k.follower ?? 0
          : sortKey === "views"
          ? k.video_views ?? 0
          : sortKey === "gmv"
          ? k.video_gmv ?? 0
          : k.client_quality_rating ?? 0;
      list.sort((a, b) => (pick(a) - pick(b)) * dir);
    }

    return list;
  }, [kocs, minFollower, minViews, sortKey, sortDir]);

  const pending = filteredKocs.filter((k) => k.client_approval_status === "pending");
  const approved = filteredKocs.filter((k) => k.client_approval_status === "approved");
  const rejected = filteredKocs.filter((k) => k.client_approval_status === "rejected");

  if (kocs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 py-16 text-center">
        <p className="text-zinc-500 text-sm">
          Chưa có KOC nào được thêm vào campaign này.
        </p>
      </div>
    );
  }

  const SORT_CHIPS: { key: Exclude<BoardSortKey, null>; label: string }[] = [
    { key: "follower", label: "Followers" },
    { key: "views", label: "Views" },
    { key: "gmv", label: "GMV" },
    { key: "rating", label: "Đánh giá" },
  ];

  return (
    <div className="space-y-6">
      <MetricsSummaryBar kocs={kocs} />

      {/* Filter / sort toolbar */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-700">Lọc &amp; sắp xếp</span>
          <span className="text-xs text-zinc-400 ml-auto">
            Hiển thị {filteredKocs.length}/{kocs.length} KOC
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-400 mr-0.5">Sắp xếp:</span>
            {SORT_CHIPS.map(({ key, label }) => {
              const active = sortKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSort(key)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-zinc-600 border-zinc-200 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {label}
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

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">Follower tối thiểu</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minFollower}
              onChange={(e) => setMinFollower(e.target.value)}
              placeholder="VD: 10000"
              className="h-8 w-28 rounded-lg border border-zinc-200 px-2.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">Views tối thiểu</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minViews}
              onChange={(e) => setMinViews(e.target.value)}
              placeholder="VD: 50000"
              className="h-8 w-28 rounded-lg border border-zinc-200 px-2.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-500 border border-zinc-200 hover:bg-zinc-50 flex items-center gap-1 transition-colors"
            >
              <XCircle className="h-3 w-3" />
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {filteredKocs.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 py-12 text-center">
          <p className="text-zinc-500 text-sm mb-3">Không có KOC nào khớp bộ lọc.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            <XCircle className="h-3 w-3" />
            Xóa lọc
          </button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1">
              <div className="p-3">
                <KocSection
                  title="Chờ duyệt"
                  kocs={pending}
                  campaignId={campaignId}
                  defaultOpen={true}
                />
              </div>
            </div>
          )}

          <KocSection
            title="Đã duyệt"
            kocs={approved}
            campaignId={campaignId}
            defaultOpen={true}
          />

          <KocSection
            title="Đã từ chối"
            kocs={rejected}
            campaignId={campaignId}
            defaultOpen={false}
          />
        </>
      )}
    </div>
  );
}
