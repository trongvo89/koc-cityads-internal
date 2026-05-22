"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Copy, Check, ExternalLink, Star, Plus, Trash2,
  RefreshCw, Search,
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
} from "@/lib/actions/proposals";
import type { ProposalDetail, ProposalKocCard } from "@/lib/actions/proposals";
import type { KocListItem } from "@/lib/actions/kocs";

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

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProposalDetailClient({
  proposal: initialProposal,
  allKocs,
}: {
  proposal: ProposalDetail;
  allKocs: KocListItem[];
}) {
  const [proposal, setProposal] = useState(initialProposal);
  const [addOpen, setAddOpen] = useState(false);
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
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{proposal.title}</h1>
            {(proposal.client_name || proposal.prospect_name) && (
              <p className="text-sm text-zinc-500 mt-0.5">
                {proposal.client_name ?? proposal.prospect_name}
              </p>
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

      {/* KOC Grid */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-zinc-700">{proposal.kocs.length} KOC trong proposal</h2>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={isPending}>
          <Plus className="h-4 w-4 mr-1" />
          Thêm KOC
        </Button>
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
    </div>
  );
}
