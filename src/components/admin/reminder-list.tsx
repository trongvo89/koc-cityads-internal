"use client";

import { useState, useTransition } from "react";
import { Copy, Check, MessageSquare, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { markAsReminded } from "@/lib/actions/campaigns";
import type { ReminderKoc } from "@/lib/actions/campaigns";
import type { NotificationType } from "@/lib/types/enums";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function buildMessage(
  kocName: string,
  campaignName: string,
  status: string,
  token: string,
  expiresAt: string,
  deadlineDate: string | null,
  revisionNote: string | null
): { message: string; type: NotificationType } {
  const link = `${APP_URL}/koc/${token}`;
  const expiry = new Date(expiresAt).toLocaleDateString("vi-VN");

  if (status === "waiting_address" || status === "client_approved") {
    return {
      type: "address_request",
      message: `Chào ${kocName} 😊\n\nBạn đã được CityAds chọn tham gia campaign "${campaignName}".\n\nĐể gửi hàng mẫu, mình cần bạn điền thông tin địa chỉ nhận hàng tại đây:\n👉 ${link}\n(Link có hiệu lực đến ${expiry})\n\nCảm ơn bạn! 🙏`,
    };
  }
  if (status === "sample_sent") {
    return {
      type: "sample_check",
      message: `Chào ${kocName} 😊\n\nHàng mẫu của campaign "${campaignName}" đã được gửi đến bạn rồi nhé!\n\nVui lòng xác nhận đã nhận hàng tại đây:\n👉 ${link}\n\nCảm ơn bạn! 🙏`,
    };
  }
  if (status === "waiting_video" || status === "sample_received") {
    const deadline = deadlineDate
      ? `\n(Deadline: ${new Date(deadlineDate).toLocaleDateString("vi-VN")})`
      : "";
    return {
      type: "video_brief",
      message: `Chào ${kocName} 😊\n\nCảm ơn bạn đã nhận hàng mẫu từ campaign "${campaignName}"!\n\nSau khi quay video, vui lòng submit link tại đây:\n👉 ${link}${deadline}\n\nCảm ơn bạn! 🙏`,
    };
  }
  if (status === "need_revision") {
    const note = revisionNote ? `\n📝 ${revisionNote}\n` : "";
    return {
      type: "revision_request",
      message: `Chào ${kocName} 😊\n\nVideo của bạn trong campaign "${campaignName}" cần được chỉnh sửa:${note}\nVui lòng submit lại tại đây:\n👉 ${link}\n\nCảm ơn bạn! 🙏`,
    };
  }
  return {
    type: "custom",
    message: `Chào ${kocName} 😊\n\nLink của bạn trong campaign "${campaignName}":\n👉 ${link}\n\nCảm ơn! 🙏`,
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
    koc.magic_link_expires_at,
    koc.deadline_date,
    koc.revision_note
  );

  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const link = `${APP_URL}/koc/${koc.magic_link_token}`;
  const isExpired = new Date(koc.magic_link_expires_at) < new Date();

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenZalo() {
    if (link) {
      window.open(`https://zalo.me/?message=${encodeURIComponent(editedMessage)}`, "_blank");
    }
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
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Link hết hạn
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
  const active = kocs.filter(
    (k) => !["completed", "failed", "client_rejected"].includes(k.operation_status)
  );
  const done = kocs.filter((k) =>
    ["completed", "failed", "client_rejected"].includes(k.operation_status)
  );

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
