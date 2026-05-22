"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  Plus, Trash2, MoreHorizontal, ExternalLink, RefreshCw,
  Search, Send, Copy, Check, CheckCheck, MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  addKocsToCampaign,
  removeKocFromCampaign,
  updateCampaignKocStatus,
  renewMagicLink,
  markAsReminded,
  adminUpdateAddress,
} from "@/lib/actions/campaigns";
import type { CampaignDetail, CampaignKocRow } from "@/lib/actions/campaigns";
import type { NotificationType, OperationStatus, SampleStatus } from "@/lib/types/enums";

function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Statuses where KOC needs to submit video via the magic link
const LINK_ACTIONABLE: ReadonlySet<OperationStatus> = new Set([
  "waiting_video",
  "need_revision",
]);

// After admin changes to these statuses, auto-prompt to send link
const AUTO_PROMPT_STATUSES: ReadonlySet<OperationStatus> = new Set([
  "waiting_video",
  "need_revision",
]);

function buildZaloMessage(
  kocName: string,
  campaignName: string,
  status: OperationStatus,
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

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── Status display maps ───────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const OP_STATUS: Record<OperationStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Nháp", variant: "secondary" },
  sent_to_client: { label: "Gửi client", variant: "info" },
  client_approved: { label: "Client duyệt", variant: "success" },
  client_rejected: { label: "Client từ chối", variant: "destructive" },
  waiting_address: { label: "Chờ địa chỉ", variant: "warning" },
  address_submitted: { label: "Có địa chỉ", variant: "info" },
  waiting_sample_sent: { label: "Chờ gửi hàng", variant: "warning" },
  sample_sent: { label: "Đã gửi hàng", variant: "info" },
  sample_received: { label: "Nhận hàng", variant: "success" },
  waiting_video: { label: "Chờ video", variant: "warning" },
  video_submitted: { label: "Nộp video", variant: "info" },
  need_revision: { label: "Cần sửa", variant: "warning" },
  video_approved: { label: "Video OK", variant: "success" },
  completed: { label: "Hoàn thành", variant: "success" },
  failed: { label: "Thất bại", variant: "destructive" },
};

const ADDR_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting: { label: "Chờ", variant: "secondary" },
  submitted: { label: "Đã điền", variant: "success" },
  issue: { label: "Vấn đề", variant: "destructive" },
};

const SAMPLE_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting: { label: "Chờ", variant: "secondary" },
  sent: { label: "Đã gửi", variant: "info" },
  received: { label: "Đã nhận", variant: "success" },
  not_received: { label: "Chưa nhận", variant: "warning" },
  issue: { label: "Vấn đề", variant: "destructive" },
};

const CONTENT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting: { label: "Chờ", variant: "secondary" },
  submitted: { label: "Đã nộp", variant: "info" },
  need_revision: { label: "Cần sửa", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  invalid_link: { label: "Link lỗi", variant: "destructive" },
  late: { label: "Trễ hạn", variant: "destructive" },
};

const CLIENT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Từ chối", variant: "destructive" },
};

// ─── Send Link Dialog ─────────────────────────────────────────────────────────

type SendLinkTarget = {
  koc: CampaignKocRow;
  effectiveStatus: OperationStatus;
};

function SendLinkDialog({
  target,
  campaignName,
  campaignId,
  onClose,
}: {
  target: SendLinkTarget | null;
  campaignName: string;
  campaignId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  // Rebuild message whenever target changes
  useEffect(() => {
    if (!target) return;
    setSent(false);
    setCopied(false);
    setRenewed(false);
    const { message } = buildZaloMessage(
      target.koc.koc_name,
      campaignName,
      target.effectiveStatus,
      target.koc.magic_link_token,
      target.koc.deadline_date,
      target.koc.revision_note
    );
    setEditedMessage(message);
  }, [target, campaignName]);

  const STATUS_LABEL: Partial<Record<OperationStatus, string>> = {
    waiting_video: "Nộp video",
    need_revision: "Nộp lại video",
  };

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenZalo() {
    if (!target) return;
    const id = target.koc.koc_zalo || target.koc.koc_phone;
    window.open(id ? `https://zalo.me/${id}` : "https://chat.zalo.me/", "_blank");
  }

  function handleRenewLink() {
    if (!target) return;
    startTransition(async () => {
      const result = await renewMagicLink(target.koc.campaign_koc_id, campaignId);
      if (result.success) setRenewed(true);
    });
  }

  function handleMarkSent() {
    if (!target) return;
    const { type } = buildZaloMessage(
      target.koc.koc_name,
      campaignName,
      target.effectiveStatus,
      target.koc.magic_link_token,
      target.koc.deadline_date,
      target.koc.revision_note
    );
    startTransition(async () => {
      const result = await markAsReminded(
        target!.koc.campaign_koc_id,
        campaignId,
        editedMessage,
        type
      );
      if (result.success) setSent(true);
    });
  }

  if (!target) return null;

  const isExpired = new Date(target.koc.magic_link_expires_at) < new Date();
  const link = `${getAppUrl()}/koc/${target.koc.magic_link_token}`;

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-zinc-500" />
            Gửi link Zalo — {target.koc.koc_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Yêu cầu:{" "}
              <span className="font-medium text-zinc-700">
                {STATUS_LABEL[target.effectiveStatus] ?? target.effectiveStatus}
              </span>
            </span>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Xem link
            </a>
          </div>

          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rows={7}
            className="text-sm font-mono resize-none"
          />

          {isExpired && !renewed && (
            <div className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-xs text-orange-700">
                Link đã hết hạn — KOC sẽ không mở được.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRenewLink}
                disabled={isPending}
                className="gap-1.5 border-orange-300 text-orange-700 flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Gia hạn 7 ngày
              </Button>
            </div>
          )}
          {renewed && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1.5">
              Link đã được gia hạn 7 ngày. Hãy copy lại message ở trên để gửi link mới.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? (
              <><Check className="h-3.5 w-3.5 text-green-600" />Đã copy</>
            ) : (
              <><Copy className="h-3.5 w-3.5" />Copy</>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenZalo} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Mở Zalo
          </Button>
          <Button
            size="sm"
            variant={sent ? "secondary" : "default"}
            onClick={handleMarkSent}
            disabled={isPending || sent}
            className="gap-1.5 ml-auto"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {sent ? "Đã ghi nhận" : "Đánh dấu đã gửi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({
  map,
  value,
}: {
  map: Record<string, { label: string; variant: BadgeVariant }>;
  value: string;
}) {
  const s = map[value] ?? { label: value, variant: "secondary" as BadgeVariant };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─── KOC Actions dropdown ─────────────────────────────────────────────────────

function KocActionMenu({
  koc,
  campaignId,
  onAction,
  onNeedRevision,
  onRenewLink,
  onSendLink,
  onEditAddress,
}: {
  koc: CampaignKocRow;
  campaignId: string;
  onAction: (id: string, updates: { operation_status?: OperationStatus; sample_status?: SampleStatus }) => void;
  onNeedRevision: (id: string) => void;
  onRenewLink: (id: string) => void;
  onSendLink: (koc: CampaignKocRow, status: OperationStatus) => void;
  onEditAddress: (koc: CampaignKocRow) => void;
}) {
  const isExpired = new Date(koc.magic_link_expires_at) < new Date();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {LINK_ACTIONABLE.has(koc.operation_status) && (
          <>
            <DropdownMenuItem
              onClick={() => onSendLink(koc, koc.operation_status)}
              className="text-blue-700 font-medium"
            >
              <Send className="h-3.5 w-3.5 mr-2" />
              Gửi link Zalo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Cập nhật trạng thái</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {koc.operation_status === "draft" && (
          <DropdownMenuItem
            onClick={() => onAction(koc.campaign_koc_id, { operation_status: "sent_to_client" })}
          >
            Gửi cho client
          </DropdownMenuItem>
        )}
        {koc.operation_status === "sent_to_client" && (
          <>
            <DropdownMenuItem
              onClick={() =>
                onAction(koc.campaign_koc_id, { operation_status: "client_approved" })
              }
            >
              Client duyệt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAction(koc.campaign_koc_id, { operation_status: "client_rejected" })
              }
            >
              Client từ chối
            </DropdownMenuItem>
          </>
        )}
        {(koc.operation_status === "client_approved" ||
          koc.operation_status === "waiting_address" ||
          koc.operation_status === "address_submitted" ||
          koc.operation_status === "waiting_sample_sent") && (
          <DropdownMenuItem onClick={() => onEditAddress(koc)}>
            <MapPin className="h-3.5 w-3.5 mr-2" />
            {koc.address_status === "submitted" ? "Sửa địa chỉ" : "Nhập địa chỉ"}
          </DropdownMenuItem>
        )}
        {koc.operation_status === "address_submitted" && (
          <DropdownMenuItem
            onClick={() =>
              onAction(koc.campaign_koc_id, {
                operation_status: "sample_sent",
                sample_status: "sent",
              })
            }
          >
            Đánh dấu gửi hàng mẫu
          </DropdownMenuItem>
        )}
        {koc.operation_status === "sample_sent" && (
          <DropdownMenuItem
            onClick={() =>
              onAction(koc.campaign_koc_id, {
                operation_status: "sample_received",
                sample_status: "received",
              })
            }
          >
            Xác nhận nhận hàng
          </DropdownMenuItem>
        )}
        {(koc.operation_status === "sample_received" ||
          koc.operation_status === "video_submitted") && (
          <DropdownMenuItem
            onClick={() =>
              onAction(koc.campaign_koc_id, { operation_status: "waiting_video" })
            }
          >
            Chờ nộp video
          </DropdownMenuItem>
        )}
        {koc.operation_status === "video_submitted" && (
          <>
            <DropdownMenuItem
              onClick={() =>
                onAction(koc.campaign_koc_id, { operation_status: "video_approved" })
              }
            >
              Duyệt video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNeedRevision(koc.campaign_koc_id)}>
              Cần sửa video
            </DropdownMenuItem>
          </>
        )}
        {koc.operation_status === "video_approved" && (
          <DropdownMenuItem
            onClick={() => onAction(koc.campaign_koc_id, { operation_status: "completed" })}
          >
            Hoàn thành
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRenewLink(koc.campaign_koc_id)}
          className={isExpired ? "text-orange-600" : ""}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          {isExpired ? "Gia hạn link (đã hết hạn)" : "Gia hạn magic link"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => onAction(koc.campaign_koc_id, { operation_status: "failed" })}
        >
          Đánh dấu thất bại
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main KocBoard ─────────────────────────────────────────────────────────────

type KocItem = {
  koc_id: string;
  name: string;
  category: string[] | null;
  follower: number | null;
  location: string | null;
};

// ─── Add KOCs Dialog ──────────────────────────────────────────────────────────

function AddKocsDialog({
  open,
  availableKocs,
  onClose,
  onAdd,
  isPending,
}: {
  open: boolean;
  availableKocs: KocItem[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSearch("");
      setCatFilter("all");
      setSelected(new Set());
    }
  }, [open]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const k of availableKocs) {
      for (const c of k.category ?? []) set.add(c);
    }
    return Array.from(set).sort();
  }, [availableKocs]);

  const filtered = useMemo(
    () =>
      availableKocs.filter((k) => {
        const matchSearch =
          !search || k.name.toLowerCase().includes(search.toLowerCase());
        const matchCat =
          catFilter === "all" || (k.category ?? []).includes(catFilter);
        return matchSearch && matchCat;
      }),
    [availableKocs, search, catFilter]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((k) => selected.has(k.koc_id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((k) => next.delete(k.koc_id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((k) => next.add(k.koc_id));
        return next;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm KOC vào campaign</DialogTitle>
        </DialogHeader>

        {availableKocs.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 text-center">
            Tất cả KOC hiện tại đã có trong campaign này.
          </p>
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  placeholder="Tìm theo tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="Ngành hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngành</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checklist */}
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              {/* Header row */}
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center gap-2.5">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs text-zinc-500">
                  {filtered.length} KOC
                  {search || catFilter !== "all" ? " phù hợp" : " khả dụng"}
                </span>
                {selected.size > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selected.size} đã chọn
                  </Badge>
                )}
              </div>

              {/* Scrollable list */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-10">
                    Không tìm thấy KOC phù hợp
                  </p>
                ) : (
                  filtered.map((k) => {
                    const isSelected = selected.has(k.koc_id);
                    return (
                      <label
                        key={k.koc_id}
                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/60" : "hover:bg-zinc-50"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggle(k.koc_id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-zinc-900 text-sm truncate">
                              {k.name}
                            </span>
                            {k.follower != null && k.follower > 0 && (
                              <span className="text-xs text-zinc-400 flex-shrink-0">
                                {formatFollower(k.follower)} followers
                              </span>
                            )}
                          </div>
                          {k.category && k.category.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {k.category.map((c) => (
                                <span
                                  key={c}
                                  className={`text-[10px] rounded px-1.5 py-0.5 ${
                                    c === catFilter
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-zinc-100 text-zinc-600"
                                  }`}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                          {k.location && (
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {k.location}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            onClick={() => onAdd(Array.from(selected))}
            disabled={selected.size === 0 || isPending}
          >
            {isPending
              ? "Đang thêm..."
              : selected.size > 0
              ? `Thêm ${selected.size} KOC`
              : "Thêm KOC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Address Dialog ────────────────────────────────────────────────────────────

function AddressDialog({
  target,
  campaignId,
  onClose,
}: {
  target: CampaignKocRow | null;
  campaignId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");

  useEffect(() => {
    if (target) {
      setName(target.receiver_name ?? "");
      setPhone(target.receiver_phone ?? "");
      setAddress(target.receiver_address ?? "");
      setProvince(target.receiver_province ?? "");
      setFormError(null);
    }
  }, [target]);

  function handleSave() {
    if (!target) return;
    if (!name.trim()) { setFormError("Tên người nhận không được trống"); return; }
    setFormError(null);
    startTransition(async () => {
      const result = await adminUpdateAddress(target.campaign_koc_id, campaignId, {
        receiver_name: name.trim(),
        receiver_phone: phone.trim() || null,
        receiver_address: address.trim() || null,
        receiver_province: province.trim() || null,
      });
      if (result.success) {
        onClose();
      } else {
        setFormError(result.error);
      }
    });
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-500" />
            {target?.address_status === "submitted" ? "Sửa địa chỉ" : "Nhập địa chỉ"}{target ? ` — ${target.koc_name}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="addr-name">Tên người nhận *</Label>
            <Input
              id="addr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <Label htmlFor="addr-phone">Số điện thoại</Label>
            <Input
              id="addr-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              placeholder="0901234567"
            />
          </div>
          <div>
            <Label htmlFor="addr-address">Địa chỉ</Label>
            <Textarea
              id="addr-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="123 Đường ABC, Phường XYZ, Quận 1"
            />
          </div>
          <div>
            <Label htmlFor="addr-province">Tỉnh/Thành phố</Label>
            <Input
              id="addr-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="mt-1"
              placeholder="Hồ Chí Minh"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu địa chỉ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main KocBoard ─────────────────────────────────────────────────────────────

export default function KocBoard({
  campaign,
  allKocs,
}: {
  campaign: CampaignDetail;
  allKocs: KocItem[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Revision note dialog
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  // Send link dialog
  const [sendLinkTarget, setSendLinkTarget] = useState<SendLinkTarget | null>(null);

  // Address dialog
  const [addressTarget, setAddressTarget] = useState<CampaignKocRow | null>(null);

  const assignedKocIds = new Set(campaign.kocs.map((k) => k.koc_id));
  const availableKocs = allKocs.filter((k) => !assignedKocIds.has(k.koc_id));

  const filteredKocs =
    filter === "all"
      ? campaign.kocs
      : campaign.kocs.filter((k) => k.operation_status === filter);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === filteredKocs.length
        ? new Set()
        : new Set(filteredKocs.map((k) => k.campaign_koc_id))
    );
  }

  function handleStatusUpdate(
    campaignKocId: string,
    updates: { operation_status?: OperationStatus; sample_status?: SampleStatus }
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignKocStatus(
        campaignKocId,
        campaign.campaign_id,
        updates
      );
      if (result.success) {
        // Auto-open send link dialog when KOC needs to take action
        const newStatus = updates.operation_status;
        if (newStatus && AUTO_PROMPT_STATUSES.has(newStatus)) {
          const koc = campaign.kocs.find((k) => k.campaign_koc_id === campaignKocId);
          if (koc) setSendLinkTarget({ koc, effectiveStatus: newStatus });
        }
      } else {
        setError(result.error);
      }
    });
  }

  function handleSendLink(koc: CampaignKocRow, status: OperationStatus) {
    setSendLinkTarget({ koc, effectiveStatus: status });
  }

  function handleConfirmRevision() {
    if (!revisionTargetId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignKocStatus(
        revisionTargetId,
        campaign.campaign_id,
        {
          operation_status: "need_revision",
          revision_note: revisionNote.trim() || null,
        }
      );
      if (result.success) {
        setRevisionTargetId(null);
        setRevisionNote("");
      } else {
        setError(result.error);
      }
    });
  }

  function handleRenewLink(campaignKocId: string) {
    setError(null);
    startTransition(async () => {
      const result = await renewMagicLink(campaignKocId, campaign.campaign_id);
      if (!result.success) setError(result.error);
    });
  }

  function handleAddKocs(kocIds: string[]) {
    if (kocIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await addKocsToCampaign(campaign.campaign_id, kocIds);
      if (result.success) {
        setAddOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemove(campaignKocId: string) {
    if (!confirm("Xóa KOC này khỏi campaign?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeKocFromCampaign(campaignKocId, campaign.campaign_id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(OP_STATUS).map(([v, { label }]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <span className="text-xs text-zinc-500">{selectedIds.size} được chọn</span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={availableKocs.length === 0 || isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          Thêm KOC
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {filteredKocs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">
              {campaign.kocs.length === 0
                ? "Chưa có KOC nào trong campaign này."
                : "Không có KOC nào ở trạng thái này."}
            </p>
            {campaign.kocs.length === 0 && availableKocs.length > 0 && (
              <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Thêm KOC đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <Checkbox
                      checked={
                        filteredKocs.length > 0 &&
                        selectedIds.size === filteredKocs.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    KOC
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Tiến độ
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Địa chỉ
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Hàng mẫu
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Content
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Duyệt
                  </th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredKocs.map((koc) => {
                  const isExpired = new Date(koc.magic_link_expires_at) < new Date();
                  return (
                    <tr
                      key={koc.campaign_koc_id}
                      className={`border-b border-zinc-100 last:border-0 transition-colors ${
                        selectedIds.has(koc.campaign_koc_id) ? "bg-blue-50/50" : "hover:bg-zinc-50"
                      } ${isPending ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={selectedIds.has(koc.campaign_koc_id)}
                          onCheckedChange={() => toggleSelect(koc.campaign_koc_id)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-zinc-900 leading-tight">
                          {koc.koc_name}
                        </div>
                        {koc.koc_category && koc.koc_category.length > 0 && (
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {koc.koc_category.join(", ")}
                          </div>
                        )}
                        {isExpired && (
                          <div className="text-xs text-orange-500 mt-0.5">Link hết hạn</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge map={OP_STATUS} value={koc.operation_status} />
                          {koc.operation_status === "need_revision" && koc.revision_note && (
                            <span
                              className="text-xs text-zinc-400 leading-tight max-w-[160px] truncate"
                              title={koc.revision_note}
                            >
                              {koc.revision_note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge map={ADDR_STATUS} value={koc.address_status} />
                          {koc.address_status === "submitted" && koc.receiver_name && (
                            <div className="text-xs text-zinc-500 leading-tight space-y-0.5">
                              <div className="font-medium text-zinc-700">{koc.receiver_name}</div>
                              {koc.receiver_phone && <div>{koc.receiver_phone}</div>}
                              {koc.receiver_address && (
                                <div className="max-w-[180px] break-words">{koc.receiver_address}</div>
                              )}
                              {koc.receiver_province && <div className="text-zinc-400">{koc.receiver_province}</div>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge map={SAMPLE_STATUS} value={koc.sample_status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge map={CONTENT_STATUS} value={koc.content_status} />
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
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge map={CLIENT_STATUS} value={koc.client_approval_status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {LINK_ACTIONABLE.has(koc.operation_status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleSendLink(koc, koc.operation_status)}
                              title="Gửi link Zalo"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <KocActionMenu
                            koc={koc}
                            campaignId={campaign.campaign_id}
                            onAction={handleStatusUpdate}
                            onNeedRevision={setRevisionTargetId}
                            onRenewLink={handleRenewLink}
                            onSendLink={handleSendLink}
                            onEditAddress={setAddressTarget}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-red-600"
                            onClick={() => handleRemove(koc.campaign_koc_id)}
                            title="Xóa khỏi campaign"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revision Note Dialog */}
      <Dialog
        open={revisionTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevisionTargetId(null);
            setRevisionNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yêu cầu chỉnh sửa video</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="revision-note">Nội dung yêu cầu chỉnh sửa</Label>
            <Textarea
              id="revision-note"
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Mô tả cụ thể những gì cần chỉnh sửa (ánh sáng, caption, hashtag, v.v.)..."
              rows={4}
            />
            <p className="text-xs text-zinc-400">
              Nội dung này sẽ được hiển thị cho KOC khi họ mở link nộp lại video.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevisionTargetId(null);
                setRevisionNote("");
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmRevision} disabled={isPending}>
              {isPending ? "Đang lưu..." : "Xác nhận yêu cầu sửa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add KOCs Dialog */}
      <AddKocsDialog
        open={addOpen}
        availableKocs={availableKocs}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddKocs}
        isPending={isPending}
      />

      {/* Send Link Dialog */}
      <SendLinkDialog
        target={sendLinkTarget}
        campaignName={campaign.campaign_name}
        campaignId={campaign.campaign_id}
        onClose={() => setSendLinkTarget(null)}
      />

      {/* Address Dialog */}
      <AddressDialog
        target={addressTarget}
        campaignId={campaign.campaign_id}
        onClose={() => setAddressTarget(null)}
      />
    </div>
  );
}
