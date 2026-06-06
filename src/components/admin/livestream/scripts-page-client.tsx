"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createScript, deleteScript } from "@/lib/actions/livestream";
import type { ScriptListItem } from "@/lib/actions/livestream";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  approved: "Đã duyệt",
  archived: "Lưu trữ",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  draft: "secondary",
  approved: "success",
  archived: "warning",
};

export default function ScriptsPageClient({ scripts: initial }: { scripts: ScriptListItem[] }) {
  const router = useRouter();
  const [scripts, setScripts] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ScriptListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleCreate() {
    if (!newTitle.trim()) {
      setCreateError("Nhập tiêu đề kịch bản");
      return;
    }
    setCreateError(null);
    startCreate(async () => {
      const result = await createScript({ title: newTitle.trim() });
      if (result.success) {
        setCreateOpen(false);
        setNewTitle("");
        router.push(`/admin/livestream/scripts/${result.data.script_id}`);
      } else {
        setCreateError(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.script_id;
    startDelete(async () => {
      const result = await deleteScript(id);
      if (result.success) {
        setScripts((prev) => prev.filter((s) => s.script_id !== id));
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
          <h1 className="text-2xl font-bold text-zinc-900">Kịch bản live</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{scripts.length} kịch bản</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo kịch bản
        </Button>
      </div>

      {scripts.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Chưa có kịch bản nào. Tạo kịch bản đầu tiên!</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Tiêu đề</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Sản phẩm</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Host</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Thời lượng</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {scripts.map((s) => (
                <tr key={s.script_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/livestream/scripts/${s.script_id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600 flex items-center gap-1"
                    >
                      {s.title}
                      <ExternalLink className="h-3 w-3 opacity-40" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.product_name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.host_name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.duration_minutes ? `${s.duration_minutes} phút` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeleteTarget(s); setDeleteError(null); }}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setNewTitle(""); setCreateError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tạo kịch bản mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Tiêu đề kịch bản</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Kịch bản live serum vitamin C"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={isCreating}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa kịch bản</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Bạn có chắc muốn xóa kịch bản <strong>{deleteTarget?.title}</strong>?
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
