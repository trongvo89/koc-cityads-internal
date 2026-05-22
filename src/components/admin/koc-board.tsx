"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, MoreHorizontal, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  addKocToCampaign,
  removeKocFromCampaign,
  updateCampaignKocStatus,
  renewMagicLink,
} from "@/lib/actions/campaigns";
import type { CampaignDetail, CampaignKocRow } from "@/lib/actions/campaigns";
import type { OperationStatus, SampleStatus } from "@/lib/types/enums";

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
}: {
  koc: CampaignKocRow;
  campaignId: string;
  onAction: (id: string, updates: { operation_status?: OperationStatus; sample_status?: SampleStatus }) => void;
  onNeedRevision: (id: string) => void;
  onRenewLink: (id: string) => void;
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
          koc.operation_status === "address_submitted") && (
          <DropdownMenuItem
            onClick={() =>
              onAction(koc.campaign_koc_id, { operation_status: "waiting_address" })
            }
          >
            Gửi link địa chỉ
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

export default function KocBoard({
  campaign,
  allKocs,
}: {
  campaign: CampaignDetail;
  allKocs: { koc_id: string; name: string; category: string[] | null }[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [selectedKocId, setSelectedKocId] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Revision note dialog
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

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
      if (!result.success) setError(result.error);
    });
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

  function handleAddKoc() {
    if (!selectedKocId) return;
    setError(null);
    startTransition(async () => {
      const result = await addKocToCampaign(campaign.campaign_id, selectedKocId);
      if (result.success) {
        setAddOpen(false);
        setSelectedKocId("");
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
                          <KocActionMenu
                            koc={koc}
                            campaignId={campaign.campaign_id}
                            onAction={handleStatusUpdate}
                            onNeedRevision={setRevisionTargetId}
                            onRenewLink={handleRenewLink}
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

      {/* Add KOC Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm KOC vào campaign</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {availableKocs.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Tất cả KOCs hiện tại đã có trong campaign này.
              </p>
            ) : (
              <Select value={selectedKocId} onValueChange={setSelectedKocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn KOC..." />
                </SelectTrigger>
                <SelectContent>
                  {availableKocs.map((k) => (
                    <SelectItem key={k.koc_id} value={k.koc_id}>
                      {k.name}
                      {k.category && k.category.length > 0
                        ? ` — ${k.category.join(", ")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleAddKoc}
              disabled={!selectedKocId || isPending}
            >
              {isPending ? "Đang thêm..." : "Thêm KOC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
