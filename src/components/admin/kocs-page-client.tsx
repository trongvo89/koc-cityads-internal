"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Search, Upload, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import KocFormDialog from "@/components/admin/koc-form-dialog";
import KocBulkImportDialog from "@/components/admin/koc-bulk-import-dialog";
import { deleteKoc, bulkDeleteKocs } from "@/lib/actions/kocs";
import type { KocListItem } from "@/lib/actions/kocs";

type Tier = { label: string; className: string };

function getTier(avg_rating: number | null, total_campaigns: number): Tier | null {
  if (avg_rating === null) return null;
  if (avg_rating >= 4.5 && total_campaigns >= 3)
    return { label: "Platinum", className: "bg-purple-100 text-purple-700" };
  if (avg_rating >= 3.5)
    return { label: "Gold", className: "bg-yellow-100 text-yellow-700" };
  if (avg_rating >= 2.5)
    return { label: "Silver", className: "bg-zinc-100 text-zinc-600" };
  return { label: "Bronze", className: "bg-orange-100 text-orange-700" };
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
};

export default function KocsPageClient({ kocs: initialKocs }: { kocs: KocListItem[] }) {
  const [kocs, setKocs] = useState(initialKocs);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingKoc, setEditingKoc] = useState<KocListItem | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = kocs
    .filter(
      (k) =>
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        (k.phone ?? "").includes(search) ||
        (k.category ?? []).some((c) => c.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.avg_rating == null && b.avg_rating == null) return 0;
      if (a.avg_rating == null) return 1;
      if (b.avg_rating == null) return -1;
      return b.avg_rating - a.avg_rating;
    });

  const filteredIds = new Set(filtered.map((k) => k.koc_id));
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((k) => selectedIds.has(k.koc_id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((k) => next.delete(k.koc_id));
      } else {
        filtered.forEach((k) => next.add(k.koc_id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEdit(koc: KocListItem) {
    setEditingKoc(koc);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingKoc(undefined);
    setDialogOpen(true);
  }

  function handleDeleteSingle(kocId: string) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteKoc(kocId);
      if (result.success) {
        setKocs((prev) => prev.filter((k) => k.koc_id !== kocId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(kocId);
          return next;
        });
        setConfirmDeleteId(null);
      } else {
        setDeleteError(result.error);
        setConfirmDeleteId(null);
      }
    });
  }

  function handleBulkDelete() {
    const ids = [...selectedIds].filter((id) => filteredIds.has(id));
    setDeleteError(null);
    startTransition(async () => {
      const result = await bulkDeleteKocs(ids);
      if (result.success) {
        const deletedSet = new Set(ids);
        setKocs((prev) => prev.filter((k) => !deletedSet.has(k.koc_id)));
        setSelectedIds(new Set());
        setConfirmBulkDelete(false);
        if (result.data.failed > 0) {
          setDeleteError(
            `Xóa được ${result.data.deleted} KOC. ${result.data.failed} KOC không thể xóa (đang trong campaign).`
          );
        }
      } else {
        setDeleteError(result.error);
        setConfirmBulkDelete(false);
      }
    });
  }

  const selectedInView = [...selectedIds].filter((id) => filteredIds.has(id)).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">KOCs</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{kocs.length} KOCs trong hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm KOC
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tìm kiếm KOC..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setConfirmDeleteId(null);
              setConfirmBulkDelete(false);
            }}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedInView > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-zinc-900 text-white rounded-lg px-4 py-2.5 text-sm">
          <span className="font-medium">{selectedInView} KOC đã chọn</span>
          <span className="text-zinc-500">·</span>
          {confirmBulkDelete ? (
            <>
              <span className="text-red-400">Xóa {selectedInView} KOC? Không thể hoàn tác.</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs ml-1"
                onClick={handleBulkDelete}
                disabled={isPending}
              >
                {isPending ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isPending}
              >
                Hủy
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-800 gap-1.5"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa đã chọn
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 ml-auto"
            onClick={() => {
              setSelectedIds(new Set());
              setConfirmBulkDelete(false);
            }}
          >
            Bỏ chọn tất cả
          </Button>
        </div>
      )}

      {deleteError && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {deleteError}
          <button
            className="ml-2 text-red-400 hover:text-red-600 text-xs underline"
            onClick={() => setDeleteError(null)}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            {search ? "Không tìm thấy KOC nào." : "Chưa có KOC nào."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Tên KOC
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Danh mục
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Liên hệ
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Followers
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Đánh giá
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Đang chạy
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => {
                const isSelected = selectedIds.has(k.koc_id);
                const isConfirming = confirmDeleteId === k.koc_id;
                return (
                  <tr
                    key={k.koc_id}
                    className={`border-b border-zinc-100 last:border-0 transition-colors ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-zinc-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(k.koc_id)}
                        aria-label={`Chọn ${k.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/kocs/${k.koc_id}`}
                          className="font-medium text-zinc-900 hover:text-blue-600 hover:underline"
                        >
                          {k.name}
                        </Link>
                        {(() => {
                          const tier = getTier(k.avg_rating, k.total_campaigns);
                          return tier ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tier.className}`}>
                              {tier.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {k.location && (
                        <div className="text-xs text-zinc-400">{k.location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {k.category && k.category.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {k.category.map((c) => (
                            <span
                              key={c}
                              className="text-xs bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <div>{k.phone ?? "—"}</div>
                      {k.zalo && (
                        <div className="text-xs text-zinc-400">Zalo: {k.zalo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {k.follower != null
                        ? k.follower >= 1000
                          ? `${(k.follower / 1000).toFixed(0)}K`
                          : k.follower.toString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.avg_rating != null ? (
                        <div className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-zinc-700">{k.avg_rating}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          k.active_campaign_count > 0
                            ? "font-medium text-blue-600"
                            : "text-zinc-400"
                        }
                      >
                        {k.active_campaign_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[k.status] ?? "secondary"}>
                        {STATUS_LABEL[k.status] ?? k.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            onClick={() => handleDeleteSingle(k.koc_id)}
                            disabled={isPending}
                          >
                            Xóa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isPending}
                          >
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(k)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setConfirmDeleteId(k.koc_id);
                              setConfirmBulkDelete(false);
                            }}
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
        )}
      </div>

      <KocFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        koc={editingKoc}
      />

      <KocBulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </>
  );
}
