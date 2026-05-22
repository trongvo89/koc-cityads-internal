"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Copy, Check, ExternalLink, Star, Plus, Trash2,
  RefreshCw, Search, Rocket, MessageSquare, ChevronDown, ChevronUp, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  updateProposal,
  addKocsToProposal,
  removeKocFromProposal,
  updateProposalKocNotes,
  regenerateShareToken,
  convertProposalToCampaign,
} from "@/lib/actions/proposals";
import { createClientRecord } from "@/lib/actions/clients";
import type { ProposalDetail, ProposalKocCard } from "@/lib/actions/proposals";
import type { KocListItem } from "@/lib/actions/kocs";
import ClientPicker, { type ClientPickerValue, type ClientOption } from "@/components/admin/client-picker";

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getTierLabel(avg_rating: number | null, total_campaigns: number): string | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3) return "Platinum";
  if (avg_rating >= 3.5) return "Gold";
  if (avg_rating >= 2.5) return "Silver";
  return "Bronze";
}

function getTierClass(label: string): string {
  if (label === "Platinum") return "bg-purple-100 text-purple-700";
  if (label === "Gold") return "bg-yellow-100 text-yellow-700";
  if (label === "Silver") return "bg-zinc-100 text-zinc-600";
  return "bg-orange-100 text-orange-700";
}

function formatFollower(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const STATUS_OPTS = [
  { value: "draft", label: "Nháp" },
  { value: "sent", label: "Đã gửi" },
  { value: "accepted", label: "Đồng ý" },
  { value: "rejected", label: "Từ chối" },
];

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  sent: "warning",
  accepted: "success",
  rejected: "destructive",
};

// ─── KOC Card ─────────────────────────────────────────────────────────────────

function KocCard({
  pkoc,
  proposalId,
  onRemove,
}: {
  pkoc: ProposalKocCard;
  proposalId: string;
  onRemove: (id: string) => void;
}) {
  const [notes, setNotes] = useState(pkoc.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const tierLabel = getTierLabel(pkoc.avg_rating, pkoc.total_campaigns);

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateProposalKocNotes(pkoc.proposal_koc_id, proposalId, notes);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  const clientStatusBadge =
    pkoc.client_status === "approved"
      ? { label: "✓ Client duyệt", cls: "bg-green-100 text-green-700 border border-green-200" }
      : pkoc.client_status === "rejected"
      ? { label: "✗ Client từ chối", cls: "bg-red-100 text-red-700 border border-red-200" }
      : null;

  return (
    <div className={`bg-white rounded-lg border p-4 ${
      pkoc.client_status === "approved"
        ? "border-green-200"
        : pkoc.client_status === "rejected"
        ? "border-red-200"
        : "border-zinc-200"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/kocs/${pkoc.koc_id}`}
              className="font-semibold text-zinc-900 hover:text-blue-600 hover:underline text-sm">
              {pkoc.koc_name}
            </Link>
            {tierLabel && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getTierClass(tierLabel)}`}>
                {tierLabel}
              </span>
            )}
            {clientStatusBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${clientStatusBadge.cls}`}>
                {clientStatusBadge.label}
              </span>
            )}
          </div>

          {pkoc.koc_category && pkoc.koc_category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pkoc.koc_category.map((c) => (
                <span key={c} className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
            {pkoc.follower != null && <span>{formatFollower(pkoc.follower)} followers</span>}
            {pkoc.avg_rating != null && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {pkoc.avg_rating}/5 ({pkoc.total_campaigns} campaigns)
              </span>
            )}
            {pkoc.video_count > 0 && <span>{pkoc.video_count} videos</span>}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {pkoc.tiktok_url && (
              <a href={pkoc.tiktok_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                <ExternalLink className="h-3 w-3" />TikTok
              </a>
            )}
            {pkoc.instagram_url && (
              <a href={pkoc.instagram_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                <ExternalLink className="h-3 w-3" />Instagram
              </a>
            )}
          </div>
        </div>

        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-600 flex-shrink-0"
          onClick={() => onRemove(pkoc.proposal_koc_id)}
          title="Xóa khỏi proposal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 space-y-1.5">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lý do đề xuất KOC này..."
          rows={2}
          className="text-xs resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1"
            onClick={handleSaveNotes} disabled={isPending}>
            {saved ? <><Check className="h-3 w-3 text-green-600" />Đã lưu</> : "Lưu ghi chú"}
          </Button>
        </div>
      </div>

      {pkoc.client_comment && (
        <div className="mt-2 flex items-start gap-1.5 bg-zinc-50 rounded-md px-2.5 py-2 border border-zinc-100">
          <MessageSquare className="h-3 w-3 text-zinc-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-600 leading-relaxed">{pkoc.client_comment}</p>
        </div>
      )}

      <PastVideosSection videos={pkoc.past_videos} />
    </div>
  );
}

function PastVideosSection({ videos }: { videos: import("@/lib/actions/proposals").KocVideoEntry[] }) {
  const [open, setOpen] = useState(false);
  if (videos.length === 0) return null;

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors w-full"
      >
        <Video className="h-3 w-3" />
        <span className="font-medium">{videos.length} video case stud{videos.length > 1 ? "ies" : "y"}</span>
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {videos.map((v) => (
            <div key={v.campaign_koc_id} className="flex items-start gap-2 bg-zinc-50 rounded px-2.5 py-2">
              <Video className="h-3 w-3 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-500 truncate">
                  {v.campaign_name} · {v.client_name}
                </div>
                <a
                  href={v.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 truncate"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{v.video_url}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add KOCs Dialog ──────────────────────────────────────────────────────────

function AddKocsDialog({
  open,
  availableKocs,
  onClose,
  onAdd,
  isPending,
}: {
  open: boolean;
  availableKocs: KocListItem[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setSearch(""); setSelected(new Set()); }
  }, [open]);

  const filtered = useMemo(
    () => availableKocs.filter((k) =>
      !search || k.name.toLowerCase().includes(search.toLowerCase()) ||
      (k.category ?? []).some((c) => c.toLowerCase().includes(search.toLowerCase()))
    ),
    [availableKocs, search]
  );

  const allSelected = filtered.length > 0 && filtered.every((k) => selected.has(k.koc_id));

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((k) => n.delete(k.koc_id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((k) => n.add(k.koc_id)); return n; });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm KOC vào Proposal</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input placeholder="Tìm theo tên, ngành hàng..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="border border-zinc-200 rounded-md overflow-hidden">
          <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center gap-2.5">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-xs text-zinc-500">{filtered.length} KOC</span>
            {selected.size > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">{selected.size} đã chọn</Badge>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Không tìm thấy KOC</p>
            ) : filtered.map((k) => (
              <label key={k.koc_id}
                className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected.has(k.koc_id) ? "bg-blue-50/60" : "hover:bg-zinc-50"}`}>
                <Checkbox checked={selected.has(k.koc_id)} onCheckedChange={() => toggle(k.koc_id)} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-900 text-sm truncate">{k.name}</span>
                    {k.avg_rating != null && (
                      <span className="text-xs text-zinc-400 flex-shrink-0 flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{k.avg_rating}
                      </span>
                    )}
                  </div>
                  {k.category && k.category.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {k.category.map((c) => (
                        <span key={c} className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={() => onAdd(Array.from(selected))}
            disabled={selected.size === 0 || isPending}>
            {isPending ? "Đang thêm..." : selected.size > 0 ? `Thêm ${selected.size} KOC` : "Thêm KOC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convert to Campaign Dialog ───────────────────────────────────────────────

function ConvertToCampaignDialog({
  open,
  proposal,
  allClients,
  onClose,
  onConvert,
  isPending,
}: {
  open: boolean;
  proposal: ProposalDetail;
  allClients: ClientOption[];
  onClose: () => void;
  onConvert: (campaignName: string, clientOverride?: ClientPickerValue) => void;
  isPending: boolean;
}) {
  const [campaignName, setCampaignName] = useState(proposal.title);
  const [clientOverride, setClientOverride] = useState<ClientPickerValue>(
    proposal.client_id && proposal.client_name
      ? { type: "existing", client_id: proposal.client_id, company_name: proposal.client_name }
      : null
  );
  const approvedKocs = proposal.kocs.filter((k) => k.client_status === "approved");
  const canConvert = !!clientOverride && !!campaignName.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển sang Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Client *</label>
            <ClientPicker
              clients={allClients}
              value={clientOverride}
              onChange={setClientOverride}
              disabled={isPending}
              placeholder="Chọn hoặc tạo client..."
            />
            {clientOverride?.type === "new" && (
              <p className="text-[11px] text-blue-600 mt-1">
                ✦ Client mới &quot;{clientOverride.company_name}&quot; sẽ được tạo.
              </p>
            )}
            {!clientOverride && (
              <p className="text-[11px] text-zinc-400 mt-1">
                Cần có client để tạo campaign.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Tên campaign *</label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Tên campaign..."
              className="h-9 text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">
              {approvedKocs.length} KOC client đã duyệt sẽ được thêm vào:
            </p>
            {approvedKocs.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Chưa có KOC nào được client duyệt.</p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {approvedKocs.map((k) => (
                  <div key={k.koc_id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>{k.koc_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button
            onClick={() => onConvert(campaignName, clientOverride ?? undefined)}
            disabled={!canConvert || isPending}
          >
            <Rocket className="h-3.5 w-3.5 mr-1.5" />
            {isPending ? "Đang tạo..." : "Tạo Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProposalDetailClient({
  proposal: initialProposal,
  allKocs,
  allClients,
}: {
  proposal: ProposalDetail;
  allKocs: KocListItem[];
  allClients: ClientOption[];
}) {
  const [proposal, setProposal] = useState(initialProposal);
  const [addOpen, setAddOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClientValue, setEditClientValue] = useState<ClientPickerValue>(null);
  const [copied, setCopied] = useState(false);
  const [tokenRenewing, setTokenRenewing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const assignedIds = new Set(proposal.kocs.map((k) => k.koc_id));
  const availableKocs = allKocs.filter((k) => !assignedIds.has(k.koc_id));

  function copyShareLink() {
    const url = `${window.location.origin}/p/${proposal.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateProposal(proposal.proposal_id, { status });
      setProposal((prev) => ({ ...prev, status }));
    });
  }

  function handleAddKocs(kocIds: string[]) {
    if (kocIds.length === 0) return;
    startTransition(async () => {
      const result = await addKocsToProposal(proposal.proposal_id, kocIds);
      if (result.success) {
        setAddOpen(false);
        // Reload to get full koc data
        window.location.reload();
      }
    });
  }

  function handleRemoveKoc(proposalKocId: string) {
    startTransition(async () => {
      await removeKocFromProposal(proposalKocId, proposal.proposal_id);
      setProposal((prev) => ({
        ...prev,
        kocs: prev.kocs.filter((k) => k.proposal_koc_id !== proposalKocId),
      }));
    });
  }

  function handleConvertToCampaign(campaignName: string, clientOverride?: ClientPickerValue) {
    startTransition(async () => {
      let clientId = proposal.client_id;

      if (clientOverride?.type === "existing") {
        clientId = clientOverride.client_id;
      } else if (clientOverride?.type === "new") {
        const r = await createClientRecord({ company_name: clientOverride.company_name, status: "active" });
        if (!r.success) return;
        clientId = r.data.client_id;
        // Also update the proposal's client_id so it persists
        await updateProposal(proposal.proposal_id, { client_id: clientId, prospect_name: null });
      }

      if (!clientId) return;

      const result = await convertProposalToCampaign(proposal.proposal_id, {
        campaign_name: campaignName,
        client_id: clientId,
      });
      if (result.success) {
        setConvertOpen(false);
        window.location.href = `/admin/campaigns`;
      }
    });
  }

  function handleOpenEditClient() {
    setEditClientValue(
      proposal.client_id && proposal.client_name
        ? { type: "existing", client_id: proposal.client_id, company_name: proposal.client_name }
        : null
    );
    setEditClientOpen(true);
  }

  function handleSaveClient() {
    if (!editClientValue) return;
    startTransition(async () => {
      let clientId: string;
      if (editClientValue.type === "existing") {
        clientId = editClientValue.client_id;
      } else {
        const r = await createClientRecord({ company_name: editClientValue.company_name, status: "active" });
        if (!r.success) return;
        clientId = r.data.client_id;
      }
      const r = await updateProposal(proposal.proposal_id, {
        client_id: clientId,
        prospect_name: null,
      });
      if (r.success) {
        setProposal((prev) => ({
          ...prev,
          client_id: clientId,
          client_name: editClientValue.company_name,
          prospect_name: null,
        }));
        setEditClientOpen(false);
      }
    });
  }

  function handleRegenerateToken() {
    setTokenRenewing(true);
    startTransition(async () => {
      const result = await regenerateShareToken(proposal.proposal_id);
      if (result.success) {
        setProposal((prev) => ({ ...prev, share_token: result.data.share_token }));
      }
      setTokenRenewing(false);
    });
  }

  const statusInfo = STATUS_VARIANT[proposal.status] ?? "secondary";

  return (
    <div>
      <Link href="/admin/proposals"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft className="h-3.5 w-3.5" />
        Danh sách Proposals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zinc-900">{proposal.title}</h1>

            {/* Client row */}
            {!editClientOpen ? (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {proposal.client_id ? (
                  <span className="text-sm text-zinc-600">{proposal.client_name}</span>
                ) : proposal.prospect_name ? (
                  <span className="text-sm text-zinc-500 italic">{proposal.prospect_name} <span className="text-[10px] text-zinc-400">(prospect)</span></span>
                ) : (
                  <span className="text-sm text-zinc-400 italic">Chưa có client</span>
                )}
                <button
                  onClick={handleOpenEditClient}
                  className="text-xs text-blue-600 hover:underline hover:text-blue-700"
                  disabled={isPending}
                >
                  {proposal.client_id ? "Đổi client" : "Gán client"}
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2 max-w-sm">
                <ClientPicker
                  clients={allClients}
                  value={editClientValue}
                  onChange={setEditClientValue}
                  disabled={isPending}
                  placeholder="Tìm hoặc tạo client..."
                />
                {editClientValue?.type === "new" && (
                  <p className="text-[11px] text-blue-600">
                    ✦ Client mới &quot;{editClientValue.company_name}&quot; sẽ được tạo khi lưu.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveClient}
                    disabled={!editClientValue || isPending}>
                    {isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => setEditClientOpen(false)} disabled={isPending}>
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {proposal.notes && (
              <p className="text-sm text-zinc-600 mt-1.5 max-w-xl">{proposal.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={statusInfo}>{STATUS_OPTS.find((s) => s.value === proposal.status)?.label ?? proposal.status}</Badge>
            <Select value={proposal.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Share link */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Link chia sẻ:</span>
          <code className="text-xs bg-zinc-100 px-2 py-1 rounded text-zinc-700 max-w-xs truncate">
            {typeof window !== "undefined" ? `${window.location.origin}/p/${proposal.share_token}` : `/p/${proposal.share_token}`}
          </code>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={copyShareLink}>
            {copied ? <><Check className="h-3 w-3 text-green-600" />Đã copy</> : <><Copy className="h-3 w-3" />Copy</>}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" asChild>
            <a href={`/p/${proposal.share_token}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />Xem
            </a>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-zinc-400 hover:text-zinc-700"
            onClick={handleRegenerateToken} disabled={tokenRenewing} title="Tạo link mới (vô hiệu hóa link cũ)">
            <RefreshCw className={`h-3 w-3 ${tokenRenewing ? "animate-spin" : ""}`} />
            Tạo link mới
          </Button>
        </div>
      </div>

      {/* Client overall comment */}
      {proposal.client_overall_comment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex gap-3">
          <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Ghi chú tổng quát từ client</p>
            <p className="text-sm text-blue-800 leading-relaxed">{proposal.client_overall_comment}</p>
          </div>
        </div>
      )}

      {/* KOC Grid */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-semibold text-zinc-700">{proposal.kocs.length} KOC trong proposal</h2>
        <div className="flex items-center gap-2">
          {!proposal.linked_campaign_id && proposal.kocs.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => setConvertOpen(true)} disabled={isPending}>
              <Rocket className="h-3.5 w-3.5" />
              Chuyển sang Campaign
            </Button>
          )}
          {proposal.linked_campaign_id && (
            <a href={`/admin/campaigns`}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />
              Đã tạo campaign
            </a>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm KOC
          </Button>
        </div>
      </div>

      {proposal.kocs.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 py-12 text-center">
          <p className="text-zinc-500 text-sm">Chưa có KOC nào.</p>
          <Button className="mt-3" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm KOC đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {proposal.kocs.map((pkoc) => (
            <KocCard
              key={pkoc.proposal_koc_id}
              pkoc={pkoc}
              proposalId={proposal.proposal_id}
              onRemove={handleRemoveKoc}
            />
          ))}
        </div>
      )}

      <AddKocsDialog
        open={addOpen}
        availableKocs={availableKocs}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddKocs}
        isPending={isPending}
      />

      <ConvertToCampaignDialog
        open={convertOpen}
        proposal={proposal}
        allClients={allClients}
        onClose={() => setConvertOpen(false)}
        onConvert={handleConvertToCampaign}
        isPending={isPending}
      />
    </div>
  );
}
