"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import HostFormDialog from "./host-form-dialog";
import { deleteHost } from "@/lib/actions/livestream";
import type { AiHostListItem } from "@/lib/actions/livestream";

const VOICE_LABEL: Record<string, string> = {
  calm: "Nhẹ nhàng",
  enthusiastic: "Năng động",
  humorous: "Hài hước",
  professional: "Chuyên nghiệp",
};

const SELLING_LABEL: Record<string, string> = {
  soft_sell: "Mềm mỏng",
  hard_sell: "Mạnh mẽ",
  educational: "Giáo dục",
  storytelling: "Kể chuyện",
};

export default function HostsPageClient({ hosts: initial }: { hosts: AiHostListItem[] }) {
  const [hosts, setHosts] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AiHostListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiHostListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.host_id;
    startTransition(async () => {
      const result = await deleteHost(id);
      if (result.success) {
        setHosts((prev) => prev.filter((h) => h.host_id !== id));
        setDeleteTarget(null);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">AI Hosts</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{hosts.length} host</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo Host AI
        </Button>
      </div>

      {hosts.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Chưa có host nào. Tạo host đầu tiên!</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Tên host</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Tính cách</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Phong cách</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {hosts.map((host) => (
                <tr key={host.host_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{host.name}</td>
                  <td className="px-4 py-3 text-zinc-600 max-w-xs">
                    <p className="truncate">{host.personality ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {host.voice_style && (
                        <Badge variant="secondary" className="text-xs">
                          {VOICE_LABEL[host.voice_style] ?? host.voice_style}
                        </Badge>
                      )}
                      {host.selling_style && (
                        <Badge variant="secondary" className="text-xs">
                          {SELLING_LABEL[host.selling_style] ?? host.selling_style}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={host.status === "active" ? "success" : "secondary"}>
                      {host.status === "active" ? "Hoạt động" : "Tắt"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(host)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeleteTarget(host); setDeleteError(null); }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HostFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <HostFormDialog
        open={!!editTarget}
        host={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa host</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Bạn có chắc muốn xóa host <strong>{deleteTarget?.name}</strong>?
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
