"use client";

import { useState, useTransition } from "react";
import { Plus, Download, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ProductFormDialog from "./product-form-dialog";
import { deleteProduct } from "@/lib/actions/livestream";
import type { ProductListItem } from "@/lib/actions/livestream";

type Props = {
  products: ProductListItem[];
  campaigns: { campaign_id: string; campaign_name: string }[];
};

type DialogMode = "create" | "edit" | "import" | null;

export default function ProductsPageClient({ products: initial, campaigns }: Props) {
  const [products, setProducts] = useState(initial);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<ProductListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEdit(p: ProductListItem) {
    setEditTarget(p);
    setDialogMode("edit");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.product_id;
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.product_id !== id));
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
          <h1 className="text-2xl font-bold text-zinc-900">Kiến thức sản phẩm</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{products.length} sản phẩm</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialogMode("import")}>
            <Download className="h-4 w-4 mr-1.5" />
            Import từ Campaign
          </Button>
          <Button size="sm" onClick={() => setDialogMode("create")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Chưa có sản phẩm nào.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Tên sản phẩm</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Ngành</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Mức giá</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Nguồn</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => (
                <tr key={p.product_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{p.name}</p>
                    {p.usp && <p className="text-xs text-zinc-500 truncate max-w-xs">{p.usp}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.price_range ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.sourced_from === "campaign" ? (
                      <Badge variant="secondary" className="text-xs">
                        {p.campaign_name ?? "Campaign"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-400">Thủ công</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeleteTarget(p); setDeleteError(null); }}
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

      <ProductFormDialog
        open={dialogMode === "create"}
        campaigns={campaigns}
        mode="create"
        onClose={() => setDialogMode(null)}
      />

      <ProductFormDialog
        open={dialogMode === "edit" && !!editTarget}
        product={editTarget}
        campaigns={campaigns}
        mode="edit"
        onClose={() => { setDialogMode(null); setEditTarget(null); }}
      />

      <ProductFormDialog
        open={dialogMode === "import"}
        campaigns={campaigns}
        mode="import"
        onClose={() => setDialogMode(null)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sản phẩm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Bạn có chắc muốn xóa <strong>{deleteTarget?.name}</strong>?
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
