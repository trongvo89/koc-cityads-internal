"use client";

import { useState, useTransition } from "react";
import { Star, ExternalLink, Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitKocReview, submitProposalComment } from "@/lib/actions/proposals";
import type { ProposalDetail, ProposalKocCard } from "@/lib/actions/proposals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tier = { label: string; borderClass: string; badgeClass: string };

function getTier(avg_rating: number | null, total_campaigns: number): Tier | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3)
    return { label: "Platinum", borderClass: "border-t-purple-500", badgeClass: "bg-purple-100 text-purple-700" };
  if (avg_rating >= 3.5)
    return { label: "Gold", borderClass: "border-t-yellow-400", badgeClass: "bg-yellow-100 text-yellow-700" };
  if (avg_rating >= 2.5)
    return { label: "Silver", borderClass: "border-t-zinc-400", badgeClass: "bg-zinc-100 text-zinc-600" };
  return { label: "Bronze", borderClass: "border-t-orange-400", badgeClass: "bg-orange-100 text-orange-700" };
}

function formatFollower(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type ReviewStatus = "pending" | "approved" | "rejected";

type KocLocalState = {
  client_status: ReviewStatus;
  client_comment: string;
  saving: boolean;
  commentSaved: boolean;
};

// ─── KOC Review Card ──────────────────────────────────────────────────────────

function KocReviewCard({
  pkoc,
  token,
  state,
  onStatusChange,
  onCommentChange,
  onCommentSave,
}: {
  pkoc: ProposalKocCard;
  token: string;
  state: KocLocalState;
  onStatusChange: (status: ReviewStatus) => void;
  onCommentChange: (comment: string) => void;
  onCommentSave: () => void;
}) {
  const [showComment, setShowComment] = useState(
    state.client_status !== "pending" || !!state.client_comment
  );
  const tier = getTier(pkoc.avg_rating, pkoc.total_campaigns);
  const dicebear = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(pkoc.koc_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50&fontFamily=Arial&fontSize=38`;

  const statusBorderClass =
    state.client_status === "approved"
      ? "border-t-green-500"
      : state.client_status === "rejected"
      ? "border-t-red-500"
      : tier?.borderClass ?? "border-t-zinc-200";

  function handleToggle(newStatus: ReviewStatus) {
    const next = state.client_status === newStatus ? "pending" : newStatus;
    onStatusChange(next);
    if (next !== "pending") setShowComment(true);
  }

  return (
    <div
      className={`bg-white rounded-xl border border-zinc-200 border-t-4 ${statusBorderClass} shadow-sm hover:shadow-md transition-all flex flex-col`}
    >
      {/* Header: avatar + name */}
      <div className="p-5 pb-3 flex items-start gap-3">
        <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-100 shadow-sm bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pkoc.avatar_url ?? dicebear}
            alt={pkoc.koc_name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-zinc-900 text-base leading-tight">{pkoc.koc_name}</h3>
            {tier && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tier.badgeClass}`}>
                {tier.label}
              </span>
            )}
          </div>
          {pkoc.koc_category && pkoc.koc_category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {pkoc.koc_category.map((c) => (
                <span key={c} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-md">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-px bg-zinc-100 rounded-xl overflow-hidden text-center">
          <div className="bg-white py-3 px-2">
            <div className="text-sm font-bold text-zinc-800">{formatFollower(pkoc.follower)}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Followers</div>
          </div>
          <div className="bg-white py-3 px-2">
            {pkoc.avg_rating != null ? (
              <>
                <div className="text-sm font-bold text-zinc-800 flex items-center justify-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {pkoc.avg_rating}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Đánh giá</div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-zinc-400">—</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Đánh giá</div>
              </>
            )}
          </div>
          <div className="bg-white py-3 px-2">
            <div className="text-sm font-bold text-zinc-800">{pkoc.video_count}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Videos</div>
          </div>
        </div>
      </div>

      {/* Social links */}
      {(pkoc.tiktok_url || pkoc.instagram_url || pkoc.facebook_url) && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          {pkoc.tiktok_url && (
            <a href={pkoc.tiktok_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-colors">
              <ExternalLink className="h-3 w-3" />TikTok
            </a>
          )}
          {pkoc.instagram_url && (
            <a href={pkoc.instagram_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
              <ExternalLink className="h-3 w-3" />Instagram
            </a>
          )}
          {pkoc.facebook_url && (
            <a href={pkoc.facebook_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-500 transition-colors">
              <ExternalLink className="h-3 w-3" />Facebook
            </a>
          )}
        </div>
      )}

      {/* Proposal notes */}
      {pkoc.notes && (
        <div className="px-5 pb-3">
          <div className="bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
            <p className="text-[10px] text-blue-500 font-semibold mb-1 uppercase tracking-wide">Lý do đề xuất</p>
            <p className="text-xs text-blue-800 leading-relaxed">{pkoc.notes}</p>
          </div>
        </div>
      )}

      {/* Review controls */}
      <div className="px-5 pb-5 mt-auto pt-2 border-t border-zinc-100">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-2 font-medium">Phản hồi của bạn</p>

        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleToggle("approved")}
            disabled={state.saving}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              state.client_status === "approved"
                ? "bg-green-500 text-white shadow-sm"
                : "border border-zinc-200 text-zinc-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Duyệt
          </button>
          <button
            onClick={() => handleToggle("rejected")}
            disabled={state.saving}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              state.client_status === "rejected"
                ? "bg-red-500 text-white shadow-sm"
                : "border border-zinc-200 text-zinc-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <X className="h-3.5 w-3.5" />
            Từ chối
          </button>

          {state.client_status === "pending" && !showComment && (
            <button
              onClick={() => setShowComment(true)}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
              title="Thêm ghi chú"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {(showComment || state.client_status !== "pending") && (
          <div className="space-y-1.5">
            <Textarea
              value={state.client_comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder={
                state.client_status === "rejected"
                  ? "Lý do từ chối (không bắt buộc)..."
                  : "Ghi chú thêm (không bắt buộc)..."
              }
              rows={2}
              className="text-xs resize-none"
            />
            {state.client_status !== "pending" && (
              <div className="flex justify-end">
                <button
                  onClick={onCommentSave}
                  disabled={state.saving}
                  className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors px-2 py-1 rounded hover:bg-zinc-100"
                >
                  {state.commentSaved ? "✓ Đã lưu" : state.saving ? "Đang lưu..." : "Lưu ghi chú"}
                </button>
              </div>
            )}
          </div>
        )}

        {state.saving && (
          <div className="mt-1.5 text-center">
            <span className="text-[10px] text-zinc-400">Đang lưu...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ProposalReviewClient({
  proposal,
  token,
}: {
  proposal: ProposalDetail;
  token: string;
}) {
  const [reviewState, setReviewState] = useState<Record<string, KocLocalState>>(
    () =>
      Object.fromEntries(
        proposal.kocs.map((k) => [
          k.proposal_koc_id,
          {
            client_status: k.client_status,
            client_comment: k.client_comment ?? "",
            saving: false,
            commentSaved: false,
          },
        ])
      )
  );

  const [overallComment, setOverallComment] = useState(proposal.client_overall_comment ?? "");
  const [overallSaving, startOverallTransition] = useTransition();
  const [overallSaved, setOverallSaved] = useState(false);

  async function handleStatusChange(proposalKocId: string, status: ReviewStatus) {
    setReviewState((prev) => ({
      ...prev,
      [proposalKocId]: { ...prev[proposalKocId], client_status: status, saving: true },
    }));

    const comment = reviewState[proposalKocId]?.client_comment || null;
    await submitKocReview(token, proposalKocId, status, comment);

    setReviewState((prev) => ({
      ...prev,
      [proposalKocId]: { ...prev[proposalKocId], saving: false },
    }));
  }

  function handleCommentChange(proposalKocId: string, comment: string) {
    setReviewState((prev) => ({
      ...prev,
      [proposalKocId]: { ...prev[proposalKocId], client_comment: comment, commentSaved: false },
    }));
  }

  async function handleCommentSave(proposalKocId: string) {
    const state = reviewState[proposalKocId];
    if (!state || state.client_status === "pending") return;

    setReviewState((prev) => ({
      ...prev,
      [proposalKocId]: { ...prev[proposalKocId], saving: true },
    }));

    await submitKocReview(token, proposalKocId, state.client_status, state.client_comment || null);

    setReviewState((prev) => ({
      ...prev,
      [proposalKocId]: { ...prev[proposalKocId], saving: false, commentSaved: true },
    }));
    setTimeout(() => {
      setReviewState((prev) => ({
        ...prev,
        [proposalKocId]: { ...prev[proposalKocId], commentSaved: false },
      }));
    }, 2000);
  }

  function handleOverallComment() {
    startOverallTransition(async () => {
      await submitProposalComment(token, overallComment);
      setOverallSaved(true);
      setTimeout(() => setOverallSaved(false), 2500);
    });
  }

  const approved = Object.values(reviewState).filter((r) => r.client_status === "approved").length;
  const rejected = Object.values(reviewState).filter((r) => r.client_status === "rejected").length;
  const pending = proposal.kocs.length - approved - rejected;
  const total = proposal.kocs.length;

  return (
    <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12">
      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-3 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-800">{total}</span> KOC được đề xuất
            </span>
            {(approved > 0 || rejected > 0) && (
              <div className="flex items-center gap-3">
                {approved > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3" />{approved} Duyệt
                  </span>
                )}
                {rejected > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                    <X className="h-3 w-3" />{rejected} Từ chối
                  </span>
                )}
                {pending > 0 && (
                  <span className="text-xs text-zinc-400">{pending} chờ phản hồi</span>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-zinc-400">KOC CityAds Vietnam</span>
        </div>

        {total > 0 && (approved > 0 || rejected > 0) && (
          <div className="mt-2.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full flex transition-all">
              <div className="bg-green-500 transition-all duration-500" style={{ width: `${(approved / total) * 100}%` }} />
              <div className="bg-red-400 transition-all duration-500" style={{ width: `${(rejected / total) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* KOC Grid */}
      {total === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-500 text-sm">Chưa có KOC nào trong proposal này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposal.kocs.map((pkoc) => (
            <KocReviewCard
              key={pkoc.proposal_koc_id}
              pkoc={pkoc}
              token={token}
              state={reviewState[pkoc.proposal_koc_id] ?? {
                client_status: pkoc.client_status,
                client_comment: pkoc.client_comment ?? "",
                saving: false,
                commentSaved: false,
              }}
              onStatusChange={(status) => handleStatusChange(pkoc.proposal_koc_id, status)}
              onCommentChange={(comment) => handleCommentChange(pkoc.proposal_koc_id, comment)}
              onCommentSave={() => handleCommentSave(pkoc.proposal_koc_id)}
            />
          ))}
        </div>
      )}

      {/* Overall comment */}
      <div className="mt-8 bg-white rounded-xl border border-zinc-200 p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Ghi chú tổng quát</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Nhận xét chung, yêu cầu bổ sung KOC, hoặc điều chỉnh đề xuất...
        </p>
        <Textarea
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
          placeholder="Ví dụ: Cần thêm KOC chuyên mảng beauty, bớt KOC gaming..."
          rows={3}
          className="text-sm"
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleOverallComment}
            disabled={overallSaving}
            variant={overallSaved ? "outline" : "default"}
            className={overallSaved ? "text-green-600 border-green-300" : ""}
          >
            {overallSaved ? (
              <><Check className="h-3.5 w-3.5 mr-1.5" />Đã gửi</>
            ) : overallSaving ? (
              "Đang gửi..."
            ) : (
              "Gửi ghi chú"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
