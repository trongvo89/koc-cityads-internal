"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import CampaignFormDialog from "@/components/admin/campaign-form-dialog";
import { deleteCampaign } from "@/lib/actions/campaigns";
import type { CampaignListItem } from "@/lib/actions/campaigns";
import type { StaffMember } from "@/lib/actions/kpi";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  active: "success",
  completed: "default",
  paused: "warning",
  cancelled: "destructive",
};

export default function CampaignsPageClient({
  campaigns: initial,
  staff,
}: {
  campaigns: CampaignListItem[];
  staff: StaffMember[];
}) {
  const [campaigns, setCampaigns] = useState(initial);
  const [editTarget, setEditTarget] = useState<CampaignListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEditClose() {
    setEditTarget(null);
    // Remove campaign from local state optimistically won't work here
    // — revalidatePath in the action refreshes server data; the page re-renders.
  }

  function openDelete(c: CampaignListItem) {
    setDeleteTarget(c);
    setDeleteError(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.campaign_id;
    startTransition(async () => {
      const result = await deleteCampaign(id);
      if (result.success) {
        setCampaigns((prev) => prev.filter((c) => c.campaign_id !== id));
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
          <h1 className="text-2xl font-bold text-zinc-900">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            Tạo campaign
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm mb-3">Chưa có campaign nào.</p>
            <Button asChild size="sm">
              <Link href="/admin/campaigns/new">Tạo campaign đầu tiên</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Package
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  KOCs
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Thời gian
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Thanh toán
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.campaign_id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/campaigns/${c.campaign_id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {c.campaign_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{c.client_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {c.package_size}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        c.koc_count >= c.package_size
                          ? "font-medium text-green-600"
                          : "text-zinc-600"
                      }
                    >
                      {c.koc_count}/{c.package_size}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {c.start_date
                      ? new Date(c.start_date).toLocaleDateString("vi-VN")
                      : "—"}
                    {c.end_date
                      ? ` → ${new Date(c.end_date).toLocaleDateString("vi-VN")}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    {c.contract_value > 0 ? (
                      <div className="flex items-center gap-1">
                        <span
                          title={c.deposit_paid_at ? `Cọc: ${new Date(c.deposit_paid_at).toLocaleDateString("vi-VN")}` : "Chưa nhận cọc"}
                          className={`w-2 h-2 rounded-full ${c.deposit_paid_at ? "bg-emerald-500" : "bg-zinc-200"}`}
                        />
                        <span
                          title={c.final_paid_at ? `Quyết toán: ${new Date(c.final_paid_at).toLocaleDateString("vi-VN")}` : "Chưa quyết toán"}
                          className={`w-2 h-2 rounded-full ${c.final_paid_at ? "bg-emerald-500" : "bg-zinc-200"}`}
                        />
                        {!c.deposit_paid_at && (
                          <Link
                            href={`/admin/campaigns/${c.campaign_id}`}
                            className="ml-1 text-xs text-amber-600 hover:underline"
                          >
                            Nhập tiền
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setEditTarget(c)}
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600"
                        onClick={() => openDelete(c)}
                        title="Xóa campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit dialog */}
      <CampaignFormDialog
        open={!!editTarget}
        campaign={editTarget}
        staff={staff}
        onClose={handleEditClose}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa campaign?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-zinc-600 space-y-2">
            <p>
              Bạn sắp xóa campaign{" "}
              <span className="font-semibold text-zinc-900">
                {deleteTarget?.campaign_name}
              </span>
              .
            </p>
            {deleteTarget && deleteTarget.koc_count > 0 && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Campaign này có {deleteTarget.koc_count} KOC đang được gán. Toàn bộ dữ liệu KOC trong campaign sẽ bị xóa.
              </p>
            )}
            <p className="text-red-600">Hành động này không thể hoàn tác.</p>
          </div>
          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
