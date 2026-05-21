"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { approveKoc } from "@/lib/actions/client-campaigns";
import type { ClientKocRow } from "@/lib/actions/client-campaigns";

// ─── Status badges ────────────────────────────────────────────────────────────

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

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-colors ${
        isPending_ ? "border-zinc-200" : isApproved ? "border-green-200 bg-green-50/20" : "border-red-200 bg-red-50/20"
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
            {koc.tiktok_url && (
              <a
                href={koc.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="h-3 w-3" />
                TikTok
              </a>
            )}
            {koc.instagram_url && (
              <a
                href={koc.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="h-3 w-3" />
                Instagram
              </a>
            )}
            {koc.facebook_url && (
              <a
                href={koc.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="h-3 w-3" />
                Facebook
              </a>
            )}
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
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
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

export default function KocApprovalBoard({
  kocs,
  campaignId,
}: {
  kocs: ClientKocRow[];
  campaignId: string;
}) {
  const pending = kocs.filter((k) => k.client_approval_status === "pending");
  const approved = kocs.filter((k) => k.client_approval_status === "approved");
  const rejected = kocs.filter((k) => k.client_approval_status === "rejected");

  if (kocs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 py-16 text-center">
        <p className="text-zinc-500 text-sm">
          Chưa có KOC nào được thêm vào campaign này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
}
