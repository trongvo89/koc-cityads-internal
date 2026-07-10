"use client";

import { useState, useTransition } from "react";
import { Copy, Check, MessageSquare, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { markAsReminded, renewMagicLink } from "@/lib/actions/campaigns";
import type { ReminderKoc } from "@/lib/actions/campaigns";
import type { NotificationType } from "@/lib/types/enums";

function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function buildMessage(
  kocName: string,
  campaignName: string,
  status: string,
  token: string,
  deadlineDate: string | null,
  revisionNote: string | null
): { message: string; type: NotificationType } {
  const link = `${getAppUrl()}/koc/${token}`;

  if (status === "need_revision") {
    const note = revisionNote ? `\n📝 ${revisionNote}\n` : "";
    return {
      type: "revision_request",
      message: `Chào ${kocName} 😊\n\nVideo của bạn trong campaign "${campaignName}" cần được chỉnh sửa:${note}\nVui lòng submit lại tại đây:\n👉 ${link}\n\nCảm ơn bạn! 🙏`,
    };
  }

  // Default: video submission request (waiting_video)
  const deadline = deadlineDate
    ? `\n(Deadline: ${new Date(deadlineDate).toLocaleDateString("vi-VN")})`
    : "";
  return {
    type: "video_brief",
    message: `Chào ${kocName} 😊\n\nCảm ơn bạn đã nhận hàng mẫu từ campaign "${campaignName}"!\n\nSau khi quay video, vui lòng submit link tại đây:\n👉 ${link}${deadline}\n\nCảm ơn bạn! 🙏`,
  };
}

function ReminderCard({
  koc,
  campaignId,
  campaignName,
}: {
  koc: ReminderKoc;
  campaignId: string;
  campaignName: string;
}) {
  const { message, type } = buildMessage(
    koc.koc_name,
    campaignName,
    koc.operation_status,
    koc.magic_link_token,
    koc.deadline_date,
    koc.revision_note
  );

  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const link = `${getAppUrl()}/koc/${koc.magic_link_token}`;
  const isExpired = new Date(koc.magic_link_expires_at) < new Date();

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenZalo() {
    const id = koc.koc_zalo || koc.koc_phone;
    window.open(id ? `https://zalo.me/${id}` : "https://chat.zalo.me/", "_blank");
  }

  function handleRenewLink() {
    startTransition(async () => {
      const result = await renewMagicLink(koc.campaign_koc_id, campaignId);
      if (result.success) setRenewed(true);
    });
  }

  function handleMarkReminded() {
    startTransition(async () => {
      const result = await markAsReminded(koc.campaign_koc_id, campaignId, editedMessage, type);
      if (result.success) setReminded(true);
    });
  }

  const statusMap: Record<string, string> = {
    draft: "Nháp",
    sent_to_client: "Gửi client",
    client_approved: "Client duyệt",
    client_rejected: "Client từ chối",
    waiting_address: "Chờ địa chỉ",
    address_submitted: "Có địa chỉ",
    waiting_sample_sent: "Chờ gửi hàng",
    sample_sent: "Đã gửi hàng",
    sample_received: "Nhận hàng",
    waiting_video: "Chờ video",
    video_submitted: "Nộp video",
    need_revision: "Cần sửa",
    video_approved: "Video OK",
    completed: "Hoàn thành",
    failed: "Thất bại",
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${reminded ? "border-green-200 bg-green-50/30" : "border-zinc-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">{koc.koc_name}</span>
            {reminded && (
              <Badge variant="success" className="text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />
                Đã nhắc
              </Badge>
            )}
            {isExpired && !renewed && (
              <Badge variant="destructive" className="text-xs">
                Link hết hạn
              </Badge>
            )}
            {renewed && (
              <Badge variant="success" className="text-xs">
                Đã gia hạn
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {statusMap[koc.operation_status] ?? koc.operation_status}
            {koc.reminder_count > 0 && ` · Đã nhắc ${koc.reminder_count} lần`}
          </p>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Xem link
        </a>
      </div>

      <Textarea
        value={editedMessage}
        onChange={(e) => setEditedMessage(e.target.value)}
        rows={6}
        className="text-sm font-mono resize-none"
      />

      {isExpired && !renewed && (
        <div className="mt-3 rounded-md bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-orange-700">Link đã hết hạn — KOC sẽ không mở được.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRenewLink}
            disabled={isPending}
            className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 flex-shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Gia hạn 7 ngày
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-600" />
              Đã copy
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={handleOpenZalo} className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Mở Zalo
        </Button>
        <Button
          size="sm"
          variant={reminded ? "secondary" : "default"}
          onClick={handleMarkReminded}
          disabled={isPending || reminded}
          className="gap-1.5 ml-auto"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {reminded ? "Đã ghi nhận" : "Đã nhắc"}
        </Button>
      </div>
    </div>
  );
}

export default function ReminderList({
  campaignId,
  campaignName,
  kocs,
}: {
  campaignId: string;
  campaignName: string;
  kocs: ReminderKoc[];
}) {
  // Terminal statuses post-simplify: completed / cancelled.
  const TERMINAL = ["completed", "cancelled"];
  const active = kocs.filter((k) => !TERMINAL.includes(k.operation_status));
  const done = kocs.filter((k) => TERMINAL.includes(k.operation_status));

  if (kocs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm">Campaign này chưa có KOC nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">
            Đang hoạt động ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((koc) => (
              <ReminderCard
                key={koc.campaign_koc_id}
                koc={koc}
                campaignId={campaignId}
                campaignName={campaignName}
              />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Đã kết thúc ({done.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {done.map((koc) => (
              <ReminderCard
                key={koc.campaign_koc_id}
                koc={koc}
                campaignId={campaignId}
                campaignName={campaignName}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
