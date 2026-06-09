"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Check, X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitApplicationReview, type PublicReviewData } from "@/lib/actions/applications";

type Application = PublicReviewData["applications"][number];
type Campaign = PublicReviewData["campaign"];

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatVnd(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const STYLE_LABEL: Record<string, string> = {
  show_face_voice: "Show mặt & giọng",
  ugc_style: "UGC & Style",
};

type Status = "pending" | "approved" | "rejected";

interface KocCardProps {
  app: Application;
  reviewToken: string;
  onStatusChange: (id: string, status: Status, note?: string) => void;
}

function KocCard({ app, reviewToken, onStatusChange }: KocCardProps) {
  const [status, setStatus] = useState<Status>(app.status as Status);
  const [showComment, setShowComment] = useState(false);
  const [note, setNote] = useState(app.review_note ?? "");
  const [isPending, startTransition] = useTransition();

  function handleReview(newStatus: Status) {
    startTransition(async () => {
      const result = await submitApplicationReview(
        reviewToken,
        app.id,
        newStatus,
        note || undefined
      );
      if (result.success) {
        setStatus(newStatus);
        onStatusChange(app.id, newStatus, note);
      }
    });
  }

  const borderColor =
    status === "approved"
      ? "border-t-green-400"
      : status === "rejected"
      ? "border-t-red-400"
      : "border-t-zinc-200";

  return (
    <div
      className={`bg-white rounded-xl border border-zinc-200 border-t-4 ${borderColor} overflow-hidden shadow-sm`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <a
              href={app.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-900 hover:text-blue-600 flex items-center gap-1 text-sm"
            >
              {app.tiktok_handle}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
            <p className="text-xs text-zinc-500">{app.tiktok_name}</p>
          </div>
          {status !== "pending" && (
            <Badge
              variant={status === "approved" ? "success" : "destructive"}
              className="text-xs flex-shrink-0"
            >
              {status === "approved" ? "Đã duyệt" : "Từ chối"}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-zinc-50 rounded-lg px-3 py-2">
            <p className="text-xs text-zinc-400 mb-0.5">Followers</p>
            <p className="text-sm font-semibold text-zinc-800">
              {formatFollower(app.follower_count)}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg px-3 py-2">
            <p className="text-xs text-zinc-400 mb-0.5">GMV 30 ngày</p>
            <p className="text-sm font-semibold text-zinc-800">
              {formatVnd(app.gmv_30d)}đ
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
            {STYLE_LABEL[app.video_style] ?? app.video_style}
          </span>
          <span className="text-xs text-zinc-400">Zalo: {app.zalo_phone}</span>
        </div>
      </div>

      {/* Comment section */}
      {(showComment || status === "rejected") && (
        <div className="px-4 pb-3">
          <Textarea
            rows={2}
            placeholder="Ghi chú (tùy chọn)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-xs resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-zinc-100 px-4 py-2.5 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowComment((v) => !v)}
          className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          {showComment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={status === "rejected" ? "destructive" : "outline"}
            className="h-7 text-xs gap-1"
            disabled={isPending}
            onClick={() => handleReview("rejected")}
          >
            <X className="h-3 w-3" />
            Từ chối
          </Button>
          <Button
            size="sm"
            variant={status === "approved" ? "default" : "outline"}
            className={`h-7 text-xs gap-1 ${status === "approved" ? "bg-green-600 hover:bg-green-700" : ""}`}
            disabled={isPending}
            onClick={() => handleReview("approved")}
          >
            <Check className="h-3 w-3" />
            Duyệt
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-300 text-right px-4 pb-2">
        {new Date(app.applied_at).toLocaleDateString("vi-VN")}
      </p>
    </div>
  );
}

interface Props {
  reviewToken: string;
  initialApplications: Application[];
  campaign: Campaign;
}

export default function ApplicationReviewClient({
  reviewToken,
  initialApplications,
  campaign,
}: Props) {
  const [apps, setApps] = useState(initialApplications);

  function handleStatusChange(id: string, status: Status, note?: string) {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status, review_note: note ?? a.review_note } : a
      )
    );
  }

  const approved = apps.filter((a) => a.status === "approved").length;
  const packageSize = campaign.package_size;

  return (
    <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12">
      {/* Summary bar */}
      {apps.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-zinc-600">
                {approved}/{packageSize} KOC đã duyệt
              </span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((approved / Math.max(packageSize, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-3 text-xs text-zinc-500">
            <span className="text-green-600 font-medium">{approved} duyệt</span>
            <span className="text-red-500 font-medium">
              {apps.filter((a) => a.status === "rejected").length} từ chối
            </span>
            <span className="text-zinc-400">
              {apps.filter((a) => a.status === "pending").length} chờ
            </span>
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center">
          <p className="text-zinc-400 text-sm">Chưa có KOC nào đăng ký.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <KocCard
              key={app.id}
              app={app}
              reviewToken={reviewToken}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
