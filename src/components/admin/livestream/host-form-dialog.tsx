"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { generateHostPersona } from "@/lib/actions/ai-generation";
import { createHost, updateHost } from "@/lib/actions/livestream";
import type { AiHostListItem } from "@/lib/actions/livestream";

const VOICE_STYLE_LABEL: Record<string, string> = {
  calm: "Nhẹ nhàng",
  enthusiastic: "Năng động",
  humorous: "Hài hước",
  professional: "Chuyên nghiệp",
};

const SELLING_STYLE_LABEL: Record<string, string> = {
  soft_sell: "Mềm mỏng",
  hard_sell: "Mạnh mẽ",
  educational: "Giáo dục",
  storytelling: "Kể chuyện",
};

type Props = {
  open: boolean;
  host?: AiHostListItem | null;
  onClose: () => void;
};

export default function HostFormDialog({ open, host, onClose }: Props) {
  const isEdit = !!host;
  const router = useRouter();
  const [name, setName] = useState(host?.name ?? "");
  const [personality, setPersonality] = useState(host?.personality ?? "");
  const [voiceStyle, setVoiceStyle] = useState(host?.voice_style ?? "");
  const [sellingStyle, setSellingStyle] = useState(host?.selling_style ?? "");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();

  function resetForm() {
    setName(host?.name ?? "");
    setPersonality(host?.personality ?? "");
    setVoiceStyle(host?.voice_style ?? "");
    setSellingStyle(host?.selling_style ?? "");
    setBrief("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleGenerate() {
    if (!brief.trim()) {
      setError("Nhập brief trước khi generate");
      return;
    }
    setError(null);
    startGenerate(async () => {
      const result = await generateHostPersona(brief);
      if (result.success) {
        setName(result.data.name);
        setPersonality(result.data.personality);
        setVoiceStyle(result.data.voice_style);
        setSellingStyle(result.data.selling_style);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Tên host không được để trống");
      return;
    }
    setError(null);
    const data = {
      name,
      personality: personality || undefined,
      voice_style: (voiceStyle as "calm" | "enthusiastic" | "humorous" | "professional") || undefined,
      selling_style: (sellingStyle as "soft_sell" | "hard_sell" | "educational" | "storytelling") || undefined,
      generation_brief: brief || undefined,
      status: "active" as const,
    };
    startSave(async () => {
      const result = isEdit
        ? await updateHost(host.host_id, data)
        : await createHost(data);
      if (result.success) {
        router.refresh();
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa host" : "Tạo AI Host mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Mô tả host bạn muốn tạo</Label>
              <Textarea
                placeholder="VD: Host nữ trẻ trung, năng động, chuyên bán mỹ phẩm cho gen Z, giọng vui tươi..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={3}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                Tạo bằng AI
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="host-name">Tên host *</Label>
            <Input
              id="host-name"
              placeholder="Tên host"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Tính cách</Label>
            <Textarea
              id="personality"
              placeholder="Mô tả tính cách host..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phong cách nói</Label>
              <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VOICE_STYLE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phong cách bán</Label>
              <Select value={sellingStyle} onValueChange={setSellingStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SELLING_STYLE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isGenerating}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEdit ? "Lưu" : "Tạo host"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
