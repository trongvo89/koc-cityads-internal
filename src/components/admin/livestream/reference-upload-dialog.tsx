"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Upload, FileText, Info } from "lucide-react";
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
import {
  createReferenceFromFile,
  createReferenceFromText,
  type ReferenceKnowledgeType,
  KNOWLEDGE_TYPE_LABEL,
  KNOWLEDGE_TYPE_DESC,
} from "@/lib/actions/references";

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Khác" },
];

const KNOWLEDGE_TYPES: { value: ReferenceKnowledgeType; emoji: string }[] = [
  { value: "product_info", emoji: "📦" },
  { value: "koc_insight", emoji: "🎥" },
  { value: "faq_objection", emoji: "💬" },
  { value: "allowed_claims", emoji: "✅" },
  { value: "script_template", emoji: "📝" },
];

const TEXTAREA_PLACEHOLDER: Record<ReferenceKnowledgeType, string> = {
  product_info: "Dán thông số kỹ thuật, mô tả sản phẩm, chứng nhận, thành phần...",
  koc_insight: "Dán transcript buổi livestream vào đây để AI học phong cách bán hàng...",
  faq_objection: "VD:\nH: Sản phẩm có dùng được cho da nhạy cảm không?\nT: Có, đã được kiểm định...\nH: Giá hơi cao?\nT: So sánh với...",
  allowed_claims: "VD:\n✅ ĐƯỢC PHÉP: 'giúp dưỡng ẩm', 'làm mềm da'\n❌ KHÔNG ĐƯỢC: 'chữa bệnh', 'trị mụn triệt để'\n...",
  script_template: "Dán kịch bản mẫu, template hoặc mô tả tone & style mong muốn...",
};

type Props = {
  open: boolean;
  products: { product_id: string; name: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
};

export default function ReferenceUploadDialog({ open, products, onClose, onCreated }: Props) {
  const [knowledgeType, setKnowledgeType] = useState<ReferenceKnowledgeType>("koc_insight");
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

  // Non-koc_insight types only support text paste
  const isKocInsight = knowledgeType === "koc_insight";
  const effectiveMode = isKocInsight ? sourceMode : "text";

  function handleKnowledgeTypeChange(kt: ReferenceKnowledgeType) {
    setKnowledgeType(kt);
    if (kt !== "koc_insight") setSourceMode("text");
  }

  function resetForm() {
    setKnowledgeType("koc_insight");
    setSourceMode("file");
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

    if (effectiveMode === "file") {
      if (!file) { setError("Vui lòng chọn file video hoặc audio"); return; }
      startSave(async () => {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("knowledge_type", knowledgeType);
        fd.append("file", file);
        if (platform !== "__none__") fd.append("source_platform", platform);
        if (category.trim()) fd.append("category", category.trim());
        if (tags.trim()) fd.append("tags", tags.trim());
        if (productId !== "__none__") fd.append("product_id", productId);

        const result = await createReferenceFromFile(fd);
        if (result.success) { onCreated(result.data.id); handleClose(); }
        else setError(result.error);
      });
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setError("Nội dung cần ít nhất 20 ký tự");
        return;
      }
      startSave(async () => {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("knowledge_type", knowledgeType);
        fd.append("text", pastedText.trim());
        if (platform !== "__none__") fd.append("source_platform", platform);
        if (category.trim()) fd.append("category", category.trim());
        if (tags.trim()) fd.append("tags", tags.trim());
        if (productId !== "__none__") fd.append("product_id", productId);

        const result = await createReferenceFromText(fd);
        if (result.success) { onCreated(result.data.id); handleClose(); }
        else setError(result.error);
      });
    }
  }

  const saveLabel = effectiveMode === "file"
    ? "Upload & Transcribe"
    : isKocInsight
      ? "Lưu → Phân tích AI"
      : "Lưu vào knowledge base";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm tư liệu tham khảo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Knowledge type */}
          <div className="space-y-2">
            <Label>Nhóm tư liệu *</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {KNOWLEDGE_TYPES.map(({ value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleKnowledgeTypeChange(value)}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    knowledgeType === value
                      ? "bg-violet-50 border-violet-400 text-violet-900"
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <span className="text-base mt-0.5 shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{KNOWLEDGE_TYPE_LABEL[value]}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{KNOWLEDGE_TYPE_DESC[value]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Source mode (only for koc_insight) */}
          {isKocInsight && (
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
                Upload video/audio
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
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ref-title">Tiêu đề *</Label>
            <Input
              id="ref-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                knowledgeType === "koc_insight" ? "VD: TikTok Live kem dưỡng da 15/5 – Lan Anh" :
                knowledgeType === "product_info" ? "VD: Thông số kem chống nắng SPF50+ La Roche" :
                knowledgeType === "faq_objection" ? "VD: FAQ sản phẩm kem dưỡng Q1/2026" :
                knowledgeType === "allowed_claims" ? "VD: Claims policy – kem chống nắng" :
                "VD: Template kịch bản skincare flash sale"
              }
            />
          </div>

          {/* Content input */}
          {effectiveMode === "file" ? (
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
              <Label>Nội dung *</Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={TEXTAREA_PLACEHOLDER[knowledgeType]}
                rows={7}
                className="text-sm"
              />
              {!isKocInsight && (
                <p className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2.5 py-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Nội dung sẽ được lưu trực tiếp vào knowledge base — không cần xử lý AI thêm.
                </p>
              )}
            </div>
          )}

          {/* Platform — only for koc_insight */}
          {isKocInsight && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nền tảng</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nền tảng..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không rõ</SelectItem>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngành hàng</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="VD: Mỹ phẩm..."
                />
              </div>
            </div>
          )}

          {/* Product link */}
          <div className="space-y-2">
            <Label>Sản phẩm liên quan</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sản phẩm (tùy chọn)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không gắn sản phẩm</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.product_id} value={p.product_id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
