"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReferenceFromFile, createReferenceFromText } from "@/lib/actions/references";

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Khác" },
];

type Props = {
  open: boolean;
  products: { product_id: string; name: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
};

export default function ReferenceUploadDialog({ open, products, onClose, onCreated }: Props) {
  const [sourceMode, setSourceMode] = useState<"file" | "text">("file");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("__none__");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [productId, setProductId] = useState("__none__");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle("");
    setPlatform("__none__");
    setCategory("");
    setTags("");
    setProductId("__none__");
    setFile(null);
    setPastedText("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSave() {
    setError(null);
    if (!title.trim()) { setError("Tiêu đề không được để trống"); return; }

    if (sourceMode === "file") {
      if (!file) { setError("Vui lòng chọn file video hoặc audio"); return; }
      startSave(async () => {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("file", file);
        if (platform !== "__none__") fd.append("source_platform", platform);
        if (category.trim()) fd.append("category", category.trim());
        if (tags.trim()) fd.append("tags", tags.trim());
        if (productId !== "__none__") fd.append("product_id", productId);

        const result = await createReferenceFromFile(fd);
        if (result.success) {
          onCreated(result.data.id);
          handleClose();
        } else {
          setError(result.error);
        }
      });
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 50) {
        setError("Nội dung cần ít nhất 50 ký tự");
        return;
      }
      startSave(async () => {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("text", pastedText.trim());
        if (platform !== "__none__") fd.append("source_platform", platform);
        if (category.trim()) fd.append("category", category.trim());
        if (tags.trim()) fd.append("tags", tags.trim());
        if (productId !== "__none__") fd.append("product_id", productId);

        const result = await createReferenceFromText(fd);
        if (result.success) {
          onCreated(result.data.id);
          handleClose();
        } else {
          setError(result.error);
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm tư liệu tham khảo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source mode toggle */}
          <div className="flex rounded-md border border-zinc-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSourceMode("file")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                sourceMode === "file"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                sourceMode === "text"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Paste transcript
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-title">Tiêu đề *</Label>
            <Input
              id="ref-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: TikTok Live kem dưỡng da 15/5 – Lan Anh"
            />
          </div>

          {sourceMode === "file" ? (
            <div className="space-y-2">
              <Label>File video/audio *</Label>
              <input
                ref={fileRef}
                type="file"
                accept="video/*,audio/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
              />
              {file && (
                <p className="text-xs text-zinc-500">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
              <p className="text-xs text-zinc-400">
                Hỗ trợ MP4, MP3, M4A, WAV, WebM — tối đa 500MB. AI sẽ tự transcribe tiếng Việt.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Nội dung transcript *</Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Dán nội dung transcript của buổi livestream vào đây..."
                rows={8}
                className="text-sm"
              />
              <p className="text-xs text-zinc-400">
                Paste nội dung đã transcribe sẵn — AI sẽ phân tích ngay không cần upload file.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nền tảng</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nền tảng..." />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngành hàng</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="VD: Mỹ phẩm, Thời trang..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sản phẩm liên quan</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sản phẩm (tùy chọn)..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.product_id} value={p.product_id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="flash_sale, skincare, viral (phân cách bằng dấu phẩy)"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {sourceMode === "file" ? "Upload & Transcribe" : "Lưu & Phân tích"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
