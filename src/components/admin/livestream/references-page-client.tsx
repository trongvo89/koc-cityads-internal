"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteReference } from "@/lib/actions/references";
import type { ReferenceMaterial } from "@/lib/actions/references";
import ReferenceUploadDialog from "./reference-upload-dialog";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Đã upload",
  processing: "Đang transcribe",
  transcribed: "Đã transcribe",
  analyzed: "Đã phân tích",
  failed: "Lỗi",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  uploaded: "secondary",
  processing: "warning",
  transcribed: "default",
  analyzed: "success",
  failed: "destructive",
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Khác",
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  text: "Văn bản",
};

export default function ReferencesPageClient({
  references,
  products,
}: {
  references: ReferenceMaterial[];
  products: { product_id: string; name: string }[];
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Xóa tư liệu "${title}"?`)) return;
    setDeletingId(id);
    await deleteReference(id);
    setDeletingId(null);
    router.refresh();
  }

  function handleCreated(id: string) {
    router.refresh();
    // Navigate to detail page so user can see processing status
    router.push(`/admin/livestream/references/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tư liệu tham khảo</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Upload livestream thực tế để AI học và tạo kịch bản độc đáo hơn
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm tư liệu
        </Button>
      </div>

      {references.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg py-16 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10 text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Chưa có tư liệu nào</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Upload video/audio từ TikTok Live, Shopee Live... hoặc paste transcript để AI học phong cách bán hàng thực tế
            </p>
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm tư liệu đầu tiên
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600">Tiêu đề</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 hidden md:table-cell">Loại</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 hidden md:table-cell">Nền tảng</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 hidden lg:table-cell">Ngành hàng</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600">Trạng thái</th>
                <th className="text-right px-4 py-2.5 font-medium text-zinc-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {references.map((ref) => (
                <tr key={ref.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-zinc-900 truncate max-w-[200px]">{ref.title}</p>
                      {ref.product_name && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{ref.product_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                    {SOURCE_TYPE_LABEL[ref.source_type] ?? ref.source_type}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                    {ref.source_platform ? PLATFORM_LABEL[ref.source_platform] ?? ref.source_platform : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-500">
                    {ref.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[ref.status] ?? "secondary"}>
                      {STATUS_LABEL[ref.status] ?? ref.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/livestream/references/${ref.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingId === ref.id}
                        onClick={() => handleDelete(ref.id, ref.title)}
                      >
                        {deletingId === ref.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReferenceUploadDialog
        open={uploadOpen}
        products={products}
        onClose={() => setUploadOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
