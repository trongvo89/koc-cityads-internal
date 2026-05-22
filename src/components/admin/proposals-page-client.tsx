"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createProposal, deleteProposal } from "@/lib/actions/proposals";
import { createClientRecord } from "@/lib/actions/clients";
import type { ProposalListItem } from "@/lib/actions/proposals";
import ClientPicker, { type ClientPickerValue, type ClientOption } from "@/components/admin/client-picker";

const STATUS_MAP: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Nháp", variant: "secondary" },
  sent: { label: "Đã gửi", variant: "warning" },
  accepted: { label: "Đồng ý", variant: "success" },
  rejected: { label: "Từ chối", variant: "destructive" },
};

function getShareUrl(token: string): string {
  if (typeof window !== "undefined") return `${window.location.origin}/p/${token}`;
  return `/p/${token}`;
}

export default function ProposalsPageClient({
  proposals: initialProposals,
  clients,
}: {
  proposals: ProposalListItem[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [proposals, setProposals] = useState(initialProposals);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [clientValue, setClientValue] = useState<ClientPickerValue>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setNotes("");
    setClientValue(null);
    setFormError(null);
  }

  function handleCreate() {
    if (!title.trim()) { setFormError("Tiêu đề không được trống"); return; }
    setFormError(null);

    startTransition(async () => {
      let resolvedClientId: string | null = null;
      let resolvedProspectName: string | null = null;

      if (clientValue?.type === "existing") {
        resolvedClientId = clientValue.client_id;
      } else if (clientValue?.type === "new") {
        // Create client record first
        const clientResult = await createClientRecord({
          company_name: clientValue.company_name,
          status: "active",
        });
        if (!clientResult.success) {
          setFormError(`Lỗi tạo client: ${clientResult.error}`);
          return;
        }
        resolvedClientId = clientResult.data.client_id;
      }

      const result = await createProposal({
        title: title.trim(),
        notes: notes || null,
        client_id: resolvedClientId,
        prospect_name: resolvedProspectName,
      });

      if (result.success) {
        resetForm();
        setCreateOpen(false);
        router.push(`/admin/proposals/${result.data.proposal_id}`);
      } else {
        setFormError(result.error);
      }
    });
  }

  function handleDelete(proposalId: string) {
    startTransition(async () => {
      const result = await deleteProposal(proposalId);
      if (result.success) {
        setProposals((prev) => prev.filter((p) => p.proposal_id !== proposalId));
        setConfirmDeleteId(null);
      }
    });
  }

  function copyShareLink(token: string) {
    navigator.clipboard.writeText(getShareUrl(token)).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Proposals</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{proposals.length} proposals trong hệ thống</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo Proposal
        </Button>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 py-16 text-center">
          <p className="text-zinc-500 text-sm">Chưa có proposal nào.</p>
          <Button className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Tạo Proposal đầu tiên
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Tiêu đề</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Client / Prospect</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">KOCs</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Ngày tạo</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const s = STATUS_MAP[p.status] ?? { label: p.status, variant: "secondary" as const };
                const isConfirming = confirmDeleteId === p.proposal_id;
                return (
                  <tr key={p.proposal_id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/proposals/${p.proposal_id}`}
                        className="font-medium text-zinc-900 hover:text-blue-600 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {p.client_name ?? p.prospect_name ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700 font-medium">{p.koc_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(p.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                            onClick={() => handleDelete(p.proposal_id)} disabled={isPending}>
                            Xóa
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                            onClick={() => setConfirmDeleteId(null)}>
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="Copy link chia sẻ"
                            onClick={() => copyShareLink(p.share_token)}
                          >
                            {copiedToken === p.share_token ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`/p/${p.share_token}`} target="_blank" rel="noopener noreferrer" title="Xem bản public">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDeleteId(p.proposal_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create proposal dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo Proposal mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="p-title">Tiêu đề *</Label>
              <Input
                id="p-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="VD: KOC Pitch cho nhãn ABC - Tháng 6/2026"
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label>Client</Label>
              <p className="text-[11px] text-zinc-400 mb-1.5 mt-0.5">
                Chọn client có sẵn hoặc gõ tên để tạo mới — bắt buộc nếu muốn chuyển sang Campaign.
              </p>
              <ClientPicker
                clients={clients}
                value={clientValue}
                onChange={setClientValue}
                disabled={isPending}
              />
              {clientValue?.type === "new" && (
                <p className="text-[11px] text-blue-600 mt-1">
                  ✦ Client mới &quot;{clientValue.company_name}&quot; sẽ được tạo trong hệ thống khi bạn nhấn Tạo.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="p-notes">Ghi chú (nội bộ)</Label>
              <Textarea
                id="p-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Mô tả ngắn về proposal này..."
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={isPending}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
              {isPending ? "Đang tạo..." : "Tạo & mở"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
