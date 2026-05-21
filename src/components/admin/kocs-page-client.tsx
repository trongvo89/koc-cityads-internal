"use client";

import { useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import KocFormDialog from "@/components/admin/koc-form-dialog";
import type { KocListItem } from "@/lib/actions/kocs";

const STATUS_VARIANT: Record<
  string,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
};

export default function KocsPageClient({ kocs }: { kocs: KocListItem[] }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKoc, setEditingKoc] = useState<KocListItem | undefined>();

  const filtered = kocs.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      (k.phone ?? "").includes(search) ||
      (k.category ?? []).some((c) =>
        c.toLowerCase().includes(search.toLowerCase())
      )
  );

  function openEdit(koc: KocListItem) {
    setEditingKoc(koc);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingKoc(undefined);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">KOCs</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{kocs.length} KOCs trong hệ thống</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm KOC
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tìm kiếm KOC..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            {search ? "Không tìm thấy KOC nào." : "Chưa có KOC nào."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
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
                  Đang chạy
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr
                  key={k.koc_id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{k.name}</div>
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
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(k)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <KocFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        koc={editingKoc}
      />
    </>
  );
}
