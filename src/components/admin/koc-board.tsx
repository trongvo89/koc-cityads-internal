"use client";

import { useState, useTransition, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, ExternalLink, RefreshCw,
  Search, Send, Copy, Check, CheckCheck,
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
  addKocsToCampaign,
  removeKocFromCampaign,
  updateCampaignKocStatus,
  updateCampaignKocField,
  renewMagicLink,
  markAsReminded,
} from "@/lib/actions/campaigns";
import type { CampaignDetail, CampaignKocRow } from "@/lib/actions/campaigns";
import type { NotificationType, OperationStatus } from "@/lib/types/enums";

function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Simple 3-status system ──────────────────────────────────────────────────

type SimpleStatus = "in_progress" | "completed" | "cancelled";

const SIMPLE_MAP: Record<string, SimpleStatus> = {
  draft: "in_progress",
  sent_to_client: "in_progress",
  client_approved: "in_progress",
  client_rejected: "cancelled",
  waiting_address: "in_progress",
  address_submitted: "in_progress",
  waiting_sample_sent: "in_progress",
  sample_sent: "in_progress",
  sample_received: "in_progress",
  waiting_video: "in_progress",
  video_submitted: "in_progress",
  need_revision: "in_progress",
  video_approved: "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  failed: "cancelled",
  cancelled: "cancelled",
};

const STATUS_OPTIONS: { value: SimpleStatus; label: string; bg: string; text: string }[] = [
  { value: "in_progress", label: "Đang tiến hành", bg: "bg-blue-50", text: "text-blue-700" },
  { value: "completed", label: "Hoàn thành", bg: "bg-green-50", text: "text-green-700" },
  { value: "cancelled", label: "Huỷ", bg: "bg-red-50", text: "text-red-700" },
];

const CLIENT_STATUS: Record<string, { label: string; variant: "warning" | "success" | "destructive" }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Từ chối", variant: "destructive" },
};

function getSimple(s: string): SimpleStatus {
  return SIMPLE_MAP[s] ?? "in_progress";
}

// ─── Inline editable cell ────────────────────────────────────────────────────

function EditableCell({
  value,
  field,
  campaignKocId,
  campaignId,
  type = "text",
  placeholder,
  className,
}: {
  value: string | number | null;
  field: string;
  campaignKocId: string;
  campaignId: string;
  type?: "text" | "number";
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [isPending, startTransition] = useTransition();
  const savedRef = useRef(String(value ?? ""));

  useEffect(() => {
    const v = String(value ?? "");
    setLocal(v);
    savedRef.current = v;
  }, [value]);

  function handleBlur() {
    if (local === savedRef.current) return;
    savedRef.current = local;
    startTransition(async () => {
      const parsed = type === "number" ? (local ? Number(local) : 0) : (local || null);
      await updateCampaignKocField(campaignKocId, campaignId, field, parsed);
    });
  }

  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      className={`w-full bg-transparent border-0 border-b border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:outline-none text-xs px-1 py-1 transition-colors ${isPending ? "opacity-50" : ""} ${className ?? ""}`}
    />
  );
}

// ─── Send Link Dialog ────────────────────────────────────────────────────────

function SendLinkDialog({
  target,
  campaignName,
  campaignId,
  onClose,
}: {
  target: CampaignKocRow | null;
  campaignName: string;
  campaignId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  useEffect(() => {
    if (!target) return;
    setSent(false);
    setCopied(false);
    setRenewed(false);
    const link = `${getAppUrl()}/koc/${target.magic_link_token}`;
    setEditedMessage(
      `Chào ${target.koc_name} 😊\n\nBạn đã được chọn tham gia campaign "${campaignName}"!\n\nVui lòng quay video và submit link tại đây:\n👉 ${link}\n\nCảm ơn bạn! 🙏`
    );
  }, [target, campaignName]);

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenZalo() {
    if (!target) return;
    const id = target.koc_zalo || target.koc_phone;
    window.open(id ? `https://zalo.me/${id}` : "https://chat.zalo.me/", "_blank");
  }

  function handleRenewLink() {
    if (!target) return;
    startTransition(async () => {
      const result = await renewMagicLink(target.campaign_koc_id, campaignId);
      if (result.success) setRenewed(true);
    });
  }

  function handleMarkSent() {
    if (!target) return;
    startTransition(async () => {
      const result = await markAsReminded(
        target.campaign_koc_id,
        campaignId,
        editedMessage,
        "video_brief" as NotificationType,
      );
      if (result.success) setSent(true);
    });
  }

  if (!target) return null;

  const isExpired = new Date(target.magic_link_expires_at) < new Date();
  const link = `${getAppUrl()}/koc/${target.magic_link_token}`;

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-zinc-500" />
            Gửi link Zalo — {target.koc_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Yêu cầu: <span className="font-medium text-zinc-700">Nộp video</span></span>
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Xem link
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
              <p className="text-xs text-orange-700">Link đã hết hạn.</p>
              <Button size="sm" variant="outline" onClick={handleRenewLink} disabled={isPending} className="gap-1.5 border-orange-300 text-orange-700 flex-shrink-0">
                <RefreshCw className="h-3.5 w-3.5" /> Gia hạn 7 ngày
              </Button>
            </div>
          )}
          {renewed && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1.5">
              Link đã được gia hạn 7 ngày.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Đã copy</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenZalo} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Mở Zalo
          </Button>
          <Button size="sm" variant={sent ? "secondary" : "default"} onClick={handleMarkSent} disabled={isPending || sent} className="gap-1.5 ml-auto">
            <CheckCheck className="h-3.5 w-3.5" />
            {sent ? "Đã ghi nhận" : "Đánh dấu đã gửi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add KOCs Dialog ─────────────────────────────────────────────────────────

type KocItem = {
  koc_id: string;
  name: string;
  category: string[] | null;
  follower: number | null;
  location: string | null;
};

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
    if (open) { setSearch(""); setCatFilter("all"); setSelected(new Set()); }
  }, [open]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const k of availableKocs) for (const c of k.category ?? []) set.add(c);
    return Array.from(set).sort();
  }, [availableKocs]);

  const filtered = useMemo(
    () => availableKocs.filter((k) => {
      const matchSearch = !search || k.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || (k.category ?? []).includes(catFilter);
      return matchSearch && matchCat;
    }),
    [availableKocs, search, catFilter]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((k) => selected.has(k.koc_id));

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((k) => next.delete(k.koc_id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((k) => next.add(k.koc_id)); return next; });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Thêm KOC vào campaign</DialogTitle></DialogHeader>
        {availableKocs.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 text-center">Tất cả KOC hiện tại đã có trong campaign này.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <Input placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Ngành hàng" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngành</SelectItem>
                  {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center gap-2.5">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                <span className="text-xs text-zinc-500">{filtered.length} KOC{search || catFilter !== "all" ? " phù hợp" : " khả dụng"}</span>
                {selected.size > 0 && <Badge variant="secondary" className="ml-auto text-xs">{selected.size} đã chọn</Badge>}
              </div>
              <div className="max-h-[340px] overflow-y-auto divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-10">Không tìm thấy KOC phù hợp</p>
                ) : filtered.map((k) => (
                  <label key={k.koc_id} className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected.has(k.koc_id) ? "bg-blue-50/60" : "hover:bg-zinc-50"}`}>
                    <Checkbox checked={selected.has(k.koc_id)} onCheckedChange={() => toggle(k.koc_id)} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-zinc-900 text-sm truncate">{k.name}</span>
                        {k.follower != null && k.follower > 0 && <span className="text-xs text-zinc-400 flex-shrink-0">{formatFollower(k.follower)} followers</span>}
                      </div>
                      {k.category && k.category.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {k.category.map((c) => <span key={c} className={`text-[10px] rounded px-1.5 py-0.5 ${c === catFilter ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}>{c}</span>)}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={() => onAdd(Array.from(selected))} disabled={selected.size === 0 || isPending}>
            {isPending ? "Đang thêm..." : selected.size > 0 ? `Thêm ${selected.size} KOC` : "Thêm KOC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main KocBoard ───────────────────────────────────────────────────────────

export default function KocBoard({
  campaign,
  allKocs,
}: {
  campaign: CampaignDetail;
  allKocs: KocItem[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sendLinkTarget, setSendLinkTarget] = useState<CampaignKocRow | null>(null);

  const assignedKocIds = new Set(campaign.kocs.map((k) => k.koc_id));
  const availableKocs = allKocs.filter((k) => !assignedKocIds.has(k.koc_id));

  const filteredKocs = filter === "all"
    ? campaign.kocs
    : campaign.kocs.filter((k) => getSimple(k.operation_status) === filter);

  function handleStatusChange(campaignKocId: string, newStatus: SimpleStatus) {
    setError(null);
    const dbStatus: OperationStatus = newStatus as OperationStatus;
    startTransition(async () => {
      const result = await updateCampaignKocStatus(campaignKocId, campaign.campaign_id, { operation_status: dbStatus });
      if (!result.success) setError(result.error);
    });
  }

  function handleAddKocs(kocIds: string[]) {
    if (kocIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await addKocsToCampaign(campaign.campaign_id, kocIds);
      if (result.success) setAddOpen(false);
      else setError(result.error);
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
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-400">{filteredKocs.length} KOC</span>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={availableKocs.length === 0 || isPending}>
          <Plus className="h-4 w-4 mr-1" /> Thêm KOC
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {filteredKocs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">
              {campaign.kocs.length === 0 ? "Chưa có KOC nào trong campaign này." : "Không có KOC nào ở trạng thái này."}
            </p>
            {campaign.kocs.length === 0 && availableKocs.length > 0 && (
              <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Thêm KOC đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-10">STT</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500">Tài khoản</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-20">Followers</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-24">Link Kênh</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-20">Client</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-36">Trạng thái</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500 w-14">Video</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-16">SL Video</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-32">Link Final</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-28">Note</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-28">Note 2</th>
                  <th className="px-2 py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredKocs.map((koc, idx) => {
                  const simple = getSimple(koc.operation_status);
                  const statusOpt = STATUS_OPTIONS.find((s) => s.value === simple) ?? STATUS_OPTIONS[0];
                  const hasVideo = !!koc.video_url;
                  const clientSt = CLIENT_STATUS[koc.client_approval_status];

                  return (
                    <tr
                      key={koc.campaign_koc_id}
                      className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors ${isPending ? "opacity-60" : ""}`}
                    >
                      {/* STT */}
                      <td className="px-2 py-2 text-zinc-400 font-mono">{idx + 1}</td>

                      {/* Tài khoản */}
                      <td className="px-2 py-2">
                        <div className="font-medium text-zinc-900 leading-tight">
                          {koc.koc_tiktok_handle || koc.koc_name}
                        </div>
                        {koc.koc_tiktok_handle && (
                          <div className="text-zinc-400 leading-tight">{koc.koc_name}</div>
                        )}
                      </td>

                      {/* Followers */}
                      <td className="px-2 py-2 text-zinc-700 font-medium">
                        {koc.koc_follower ? formatFollower(koc.koc_follower) : "—"}
                      </td>

                      {/* Link Kênh */}
                      <td className="px-2 py-2">
                        {koc.koc_tiktok_url ? (
                          <a href={koc.koc_tiktok_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 truncate">
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">TikTok</span>
                          </a>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>

                      {/* Client */}
                      <td className="px-2 py-2">
                        {clientSt && <Badge variant={clientSt.variant} className="text-[10px]">{clientSt.label}</Badge>}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-2 py-2">
                        <select
                          value={simple}
                          onChange={(e) => handleStatusChange(koc.campaign_koc_id, e.target.value as SimpleStatus)}
                          className={`${statusOpt.bg} ${statusOpt.text} text-xs font-medium rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-300`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Video checkbox */}
                      <td className="px-2 py-2 text-center">
                        <Checkbox
                          checked={hasVideo}
                          onCheckedChange={(checked) => {
                            if (!checked && koc.video_url) {
                              startTransition(async () => {
                                await updateCampaignKocField(koc.campaign_koc_id, campaign.campaign_id, "video_url", null);
                              });
                            }
                          }}
                          disabled={!hasVideo}
                        />
                      </td>

                      {/* Số lượng video */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.video_count}
                          field="video_count"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          type="number"
                          placeholder="0"
                          className="w-14"
                        />
                      </td>

                      {/* Link Final */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.final_link}
                          field="final_link"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          placeholder="Link..."
                        />
                      </td>

                      {/* Note */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.internal_note}
                          field="internal_note"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          placeholder="Note..."
                        />
                      </td>

                      {/* Note 2 */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.note_2}
                          field="note_2"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          placeholder="Note 2..."
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          {simple === "in_progress" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setSendLinkTarget(koc)}
                              title="Gửi link Zalo"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-red-600"
                            onClick={() => handleRemove(koc.campaign_koc_id)}
                            title="Xóa"
                          >
                            <Trash2 className="h-3 w-3" />
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
    </div>
  );
}
