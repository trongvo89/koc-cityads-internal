"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ImagePlus, Mic, Loader2, CheckCircle, AlertTriangle, Save, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  prepareImageUpload, setSectionImageUrl, saveScriptSections,
} from "@/lib/actions/livestream";
import { generateAllSectionsAudio, updateScriptVoice } from "@/lib/actions/audio";
import type { ScriptDetail } from "@/lib/actions/livestream";
import type { ScriptSection } from "@/lib/actions/ai-generation";
import type { ElevenLabsVoice } from "@/lib/actions/audio";

// Direct-to-storage PUT (bypasses the Next.js server body-size limit).
function putToSignedUrl(signedUrl: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload lỗi HTTP ${xhr.status}`))
    );
    xhr.addEventListener("error", () => reject(new Error("Lỗi mạng khi upload")));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

export default function ImageVoiceEditor({
  script,
  voices,
  voicesError = null,
}: {
  script: ScriptDetail;
  voices: ElevenLabsVoice[];
  voicesError?: string | null;
}) {
  const router = useRouter();
  const [sections, setSections] = useState<ScriptSection[]>(script.script_sections);
  const [voiceId, setVoiceId] = useState(script.voice_id ?? "");
  // Voice the current audio was generated with (audio on load = script.voice_id).
  const [generatedVoiceId, setGeneratedVoiceId] = useState(script.voice_id ?? "");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [failList, setFailList] = useState<string[]>([]);
  const [isSaving, startSave] = useTransition();
  const [isVoicing, startVoice] = useTransition();
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);

  const voiceChanged =
    !!voiceId && voiceId !== generatedVoiceId && sections.some((s) => s.audio_url);

  const withImage = sections.filter((s) => s.image_url).length;
  const withAudio = sections.filter((s) => s.audio_url).length;

  function updateSection(idx: number, patch: Partial<ScriptSection>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleImageSelected(idx: number, file: File) {
    setErr(null);
    setUploadingIdx(idx);
    try {
      const prep = await prepareImageUpload(file.name);
      if (!prep.success) throw new Error(prep.error);
      await putToSignedUrl(prep.data.signedUrl, file);
      const res = await setSectionImageUrl(script.script_id, idx, prep.data.publicUrl);
      if (!res.success) throw new Error(res.error);
      updateSection(idx, { image_url: prep.data.publicUrl });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload ảnh thất bại");
    } finally {
      setUploadingIdx(null);
    }
  }

  function handleSaveScripts() {
    setErr(null); setMsg(null);
    startSave(async () => {
      const res = await saveScriptSections(script.script_id, sections);
      if (res.success) { setMsg("Đã lưu kịch bản"); setTimeout(() => setMsg(null), 2500); }
      else setErr(res.error);
    });
  }

  function handleGenerateAllAudio() {
    if (!voiceId) { setErr("Chọn hoặc dán Voice ID trước"); return; }
    setErr(null); setMsg(null); setFailList([]);
    startVoice(async () => {
      // Persist any script edits first so TTS reads the latest text.
      await saveScriptSections(script.script_id, sections);
      await updateScriptVoice(script.script_id, voiceId);
      const res = await generateAllSectionsAudio(script.script_id, sections, voiceId);
      if (!res.success) { setErr(res.error); return; }
      const results = res.data.results;
      const ok = results.filter((r) => r.success);
      setSections((prev) =>
        prev.map((s, i) => {
          const r = results.find((x) => x.index === i);
          return r?.success && r.audio_url ? { ...s, audio_url: r.audio_url } : s;
        })
      );
      // Surface distinct failure reasons (e.g. "429 hết quota", voice lỗi).
      const fails = results.filter((r) => !r.success);
      setFailList([...new Set(fails.map((r) => r.error ?? "lỗi không rõ"))]);
      if (ok.length === results.length && ok.length > 0) setGeneratedVoiceId(voiceId);
      setMsg(`Đã tạo giọng đọc ${ok.length}/${results.length} sản phẩm${ok.length && fails.length === 0 ? " ✓ (giọng mới)" : ""}`);
    });
  }

  function refreshVoices() {
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/livestream/scripts" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4">
        <ArrowLeft className="h-4 w-4" /> Kịch bản live
      </Link>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">{script.title}</h1>
            <Badge variant="secondary">Ảnh + Voice</Badge>
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">
            {sections.length} sản phẩm · {withImage} có ảnh · {withAudio} có giọng đọc
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleSaveScripts} disabled={isSaving}>
          <Save className="h-4 w-4 mr-1.5" /> {isSaving ? "Đang lưu..." : "Lưu kịch bản"}
        </Button>
      </div>

      {/* Compliance warning */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Live ảnh tĩnh + voice phát lặp bị Shopee xem là nội dung ghi sẵn/không tương tác —
          có thể bị trừ điểm hoặc cấm live. Nên xen kẽ live người thật, đừng để chạy 24/7 câm.
        </span>
      </div>

      {/* Voice controls */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Giọng đọc (ElevenLabs)</Label>
            {voices.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger><SelectValue placeholder="Chọn giọng đọc" /></SelectTrigger>
                    <SelectContent>
                      {voices.map((v) => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={refreshVoices} title="Kéo lại danh sách giọng mới thêm ở ElevenLabs">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // Fallback: no voice list loaded → let the user paste a voice_id.
              <Input
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="Dán Voice ID của ElevenLabs (vd: 21m00Tcm4TlvDq8ikWAM)"
              />
            )}
          </div>
          <Button onClick={handleGenerateAllAudio} disabled={isVoicing || sections.length === 0}>
            {isVoicing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mic className="h-4 w-4 mr-1.5" />}
            Tạo giọng đọc tất cả
          </Button>
        </div>
        {voices.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Không tải được danh sách giọng ElevenLabs
            {voicesError ? <> — <span className="font-mono">{voicesError}</span></> : null}.
            Kiểm tra biến <span className="font-mono">ELEVENLABS_API_KEY</span> (đúng tên, scope Production, key còn quota),
            hoặc dán trực tiếp Voice ID để dùng tạm.
          </p>
        )}
        {voiceChanged && (
          <p className="text-xs text-blue-700 mt-2">
            Bạn vừa đổi giọng — audio hiện tại vẫn là giọng cũ. Bấm <strong>&quot;Tạo giọng đọc tất cả&quot;</strong> để áp dụng giọng mới.
          </p>
        )}
      </div>

      {msg && <p className="text-sm text-emerald-700 mb-3">{msg}</p>}
      {failList.length > 0 && (
        <div className="text-sm text-red-600 mb-3 space-y-0.5">
          <p className="font-medium">Một số sản phẩm tạo giọng lỗi:</p>
          {failList.map((f, i) => (
            <p key={i} className="font-mono text-xs">• {f}</p>
          ))}
          <p className="text-xs text-red-500">Nếu là lỗi 401/quota → kiểm tra key/gói ElevenLabs. Sau khi xử lý, bấm tạo lại.</p>
        </div>
      )}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {/* Product sections */}
      <div className="space-y-3">
        {sections.map((s, idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-lg p-4 flex gap-4">
            {/* Image */}
            <div className="w-28 flex-shrink-0">
              <div className="aspect-[9/16] rounded-md border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
                {s.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.image_url} alt={s.product_name ?? ""} className="w-full h-full object-cover" />
                  : <span className="text-xs text-zinc-400 text-center px-2">Chưa có ảnh</span>}
              </div>
              <input
                ref={(el) => { fileInputs.current[idx] = el; }}
                type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelected(idx, f); e.target.value = ""; }}
              />
              <Button
                variant="outline" size="sm" className="w-full mt-2 text-xs"
                onClick={() => fileInputs.current[idx]?.click()}
                disabled={uploadingIdx === idx}
              >
                {uploadingIdx === idx
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <ImagePlus className="h-3 w-3 mr-1" />}
                {s.image_url ? "Đổi ảnh" : "Up ảnh"}
              </Button>
            </div>

            {/* Script + status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-medium text-sm text-zinc-900 truncate">
                  {idx + 1}. {s.product_name ?? "Sản phẩm"}
                </span>
                {s.audio_url
                  ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle className="h-3 w-3" /> có giọng</span>
                  : <span className="text-xs text-zinc-400">chưa có giọng</span>}
              </div>
              {s.shopee_item_id && (
                <p className="text-xs text-zinc-400 mb-1.5">ID Shopee: {s.shopee_item_id}</p>
              )}
              <Textarea
                value={s.content}
                onChange={(e) => updateSection(idx, { content: e.target.value })}
                className="h-24 text-xs"
              />
              {s.audio_url && (
                <audio src={s.audio_url} controls className="mt-2 h-8 w-full" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 mt-4">
        Sau khi mỗi sản phẩm có đủ ảnh + giọng đọc: tạo/mở một buổi live (Session), gắn kịch bản này,
        dán RTMP key và bấm chạy — worker sẽ ghép ảnh + voice thành video và phát tuần tự rồi lặp lại.
      </p>
    </div>
  );
}
