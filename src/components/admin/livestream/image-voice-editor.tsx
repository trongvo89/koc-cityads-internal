"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ImagePlus, Mic, Loader2, CheckCircle, AlertTriangle, Save, RefreshCw,
  Play, Pause, X, SkipBack, SkipForward, Repeat, MonitorPlay,
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
  // TTS model — Flash v2.5 supports Vietnamese (multilingual_v2 does not).
  const [modelId, setModelId] = useState("eleven_flash_v2_5");
  // Voice the current audio was generated with (audio on load = script.voice_id).
  const [generatedVoiceId, setGeneratedVoiceId] = useState(script.voice_id ?? "");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [failList, setFailList] = useState<string[]>([]);
  const [isSaving, startSave] = useTransition();
  const [isVoicing, startVoice] = useTransition();
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const selectedVoice = voices.find((v) => v.voice_id === voiceId);
  const voiceChanged =
    !!voiceId && voiceId !== generatedVoiceId && sections.some((s) => s.audio_url);

  function togglePreview() {
    const url = selectedVoice?.preview_url;
    if (!url || !previewRef.current) return;
    if (previewing) {
      previewRef.current.pause();
      setPreviewing(false);
      return;
    }
    previewRef.current.src = url;
    previewRef.current.play().then(() => setPreviewing(true)).catch(() => setPreviewing(false));
  }

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
      const res = await generateAllSectionsAudio(script.script_id, sections, voiceId, modelId);
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

  // ─── Preview player (browser-side "what the live will look like") ──────────
  // Plays each product's image + voice in order, exactly like the broadcast.
  const playable = sections.filter((s) => s.image_url && s.audio_url);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewLoop, setPreviewLoop] = useState(true);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const cur = playable[previewIdx];

  function openPreview() {
    if (playable.length === 0) return;
    setPreviewIdx(0);
    setPreviewOpen(true);
  }
  function closePreview() {
    previewAudioRef.current?.pause();
    setPreviewOpen(false);
    setPreviewPlaying(false);
  }
  function previewGoto(i: number) {
    if (i < 0) i = playable.length - 1;
    if (i >= playable.length) i = 0;
    setPreviewIdx(i);
  }
  function previewOnEnded() {
    if (previewIdx + 1 < playable.length) setPreviewIdx(previewIdx + 1);
    else if (previewLoop) setPreviewIdx(0);
    else setPreviewPlaying(false);
  }
  function previewTogglePlay() {
    const a = previewAudioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={openPreview}
            disabled={playable.length === 0}
            title={playable.length === 0 ? "Cần ít nhất 1 SP có đủ ảnh + giọng" : "Xem trước buổi live ngay trên web"}
          >
            <MonitorPlay className="h-4 w-4 mr-1.5" /> Xem trước buổi live
          </Button>
          <Button size="sm" variant="outline" onClick={handleSaveScripts} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1.5" /> {isSaving ? "Đang lưu..." : "Lưu kịch bản"}
          </Button>
        </div>
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
                  <Select
                    value={voiceId}
                    onValueChange={(v) => {
                      if (previewRef.current) { previewRef.current.pause(); setPreviewing(false); }
                      setVoiceId(v);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Chọn giọng đọc" /></SelectTrigger>
                    <SelectContent>
                      {voices.map((v) => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline" size="sm" onClick={togglePreview}
                  disabled={!selectedVoice?.preview_url}
                  title={selectedVoice?.preview_url ? "Nghe thử giọng đang chọn" : "Giọng này không có mẫu nghe thử"}
                >
                  {previewing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  Nghe thử
                </Button>
                <Button variant="ghost" size="sm" onClick={refreshVoices} title="Kéo lại danh sách giọng mới thêm ở ElevenLabs">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <audio ref={previewRef} onEnded={() => setPreviewing(false)} className="hidden" />
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

        <div className="mt-3 flex items-center gap-2">
          <Label className="text-xs text-zinc-500 whitespace-nowrap">Model đọc</Label>
          <div className="w-80">
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eleven_flash_v2_5">Flash v2.5 — tiếng Việt (khuyến nghị)</SelectItem>
                <SelectItem value="eleven_v3">v3 — chất lượng cao nhất (cần tài khoản hỗ trợ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                // key on the URL forces the element to remount & load the new
                // file when audio is regenerated (else the browser keeps the old one).
                <audio key={s.audio_url} src={s.audio_url} controls className="mt-2 h-8 w-full" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 mt-4">
        Sau khi mỗi sản phẩm có đủ ảnh + giọng đọc: tạo/mở một buổi live (Session), gắn kịch bản này,
        dán RTMP key và bấm chạy — worker sẽ ghép ảnh + voice thành video và phát tuần tự rồi lặp lại.
      </p>

      {/* Preview overlay — plays image + voice per product, like the live will look */}
      {previewOpen && cur && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={closePreview}>
          <div
            className="bg-black rounded-xl overflow-hidden max-h-[92vh] w-full max-w-[430px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 9:16 stage */}
            <div className="relative bg-zinc-900" style={{ aspectRatio: "9 / 16" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur.image_url ?? ""} alt={cur.product_name ?? ""} className="w-full h-full object-cover" />
              <button
                onClick={closePreview}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Product caption */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <p className="text-white text-sm font-medium line-clamp-2">{cur.product_name ?? "Sản phẩm"}</p>
                <p className="text-white/60 text-xs mt-0.5">Sản phẩm {previewIdx + 1}/{playable.length}</p>
              </div>
              {/* The audio that drives the sequence. key remounts + autoplays on index change. */}
              <audio
                key={previewIdx}
                ref={previewAudioRef}
                src={cur.audio_url ?? ""}
                autoPlay
                onEnded={previewOnEnded}
                onPlay={() => setPreviewPlaying(true)}
                onPause={() => setPreviewPlaying(false)}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 p-3 bg-zinc-950">
              <button onClick={() => previewGoto(previewIdx - 1)} className="text-white/80 hover:text-white p-1" aria-label="Trước">
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={previewTogglePlay}
                className="h-11 w-11 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200"
                aria-label={previewPlaying ? "Tạm dừng" : "Phát"}
              >
                {previewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button onClick={() => previewGoto(previewIdx + 1)} className="text-white/80 hover:text-white p-1" aria-label="Sau">
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPreviewLoop((v) => !v)}
                className={`p-1.5 rounded ${previewLoop ? "text-emerald-400" : "text-white/40"} hover:text-white`}
                title={previewLoop ? "Đang bật lặp lại" : "Lặp lại tắt"}
                aria-label="Lặp lại"
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-[11px] text-white/40 pb-3 px-3">
              Đây là bản xem trước trên web. Buổi live thật sẽ phát đúng chuỗi ảnh + giọng này lên phòng live.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
