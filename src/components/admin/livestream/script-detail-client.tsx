"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, Save, CheckCircle, Clock, Loader2, Grip,
  Volume2, VolumeX, Play, Pause, Mic, MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateLiveScript } from "@/lib/actions/ai-generation";
import { updateScript, saveScriptSections } from "@/lib/actions/livestream";
import { generateSectionAudio, generateAllSectionsAudio, updateScriptVoice } from "@/lib/actions/audio";
import type { ScriptDetail, AiHostListItem, ProductListItem } from "@/lib/actions/livestream";
import type { ScriptSection } from "@/lib/actions/ai-generation";
import type { ElevenLabsVoice } from "@/lib/actions/audio";

const SECTION_LABEL: Record<string, string> = {
  intro: "Mở đầu", hook: "Hook", product_intro: "Giới thiệu SP",
  demo: "Demo", usp: "Điểm nổi bật", social_proof: "Chứng minh",
  cta: "Kêu gọi mua", outro: "Kết thúc",
};

const SECTION_COLOR: Record<string, string> = {
  intro: "bg-blue-100 text-blue-700", hook: "bg-purple-100 text-purple-700",
  product_intro: "bg-cyan-100 text-cyan-700", demo: "bg-emerald-100 text-emerald-700",
  usp: "bg-amber-100 text-amber-700", social_proof: "bg-orange-100 text-orange-700",
  cta: "bg-rose-100 text-rose-700", outro: "bg-zinc-100 text-zinc-700",
};

type Props = {
  script: ScriptDetail;
  hosts: AiHostListItem[];
  products: ProductListItem[];
  voices: ElevenLabsVoice[];
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}p${s}s` : `${m}p`;
}

function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {playing ? "Dừng" : "Nghe thử"}
      </button>
      <audio
        ref={ref}
        src={url}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

export default function ScriptDetailClient({ script: initial, hosts, products, voices }: Props) {
  const [sections, setSections] = useState<ScriptSection[]>(initial.script_sections);
  const [status, setStatus] = useState(initial.status);
  const [productId, setProductId] = useState(initial.product_id ?? "");
  const [hostId, setHostId] = useState(initial.host_id ?? "");
  const [brief, setBrief] = useState(initial.brief ?? "");
  const [duration, setDuration] = useState<string>(String(initial.duration_minutes ?? 30));
  const [voiceId, setVoiceId] = useState(initial.voice_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState<Set<number>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isApproving, startApprove] = useTransition();

  const totalSeconds = sections.reduce((s, sec) => s + (sec.duration_seconds ?? 0), 0);
  const audioCount = sections.filter((s) => s.audio_url).length;

  function updateSectionContent(index: number, content: string) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], content };
      return next;
    });
  }

  function setSectionAudio(index: number, audio_url: string) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], audio_url };
      return next;
    });
  }

  function handleGenerate() {
    if (!productId) { setError("Chọn sản phẩm trước khi generate kịch bản"); return; }
    setError(null);
    const selectedProduct = products.find((p) => p.product_id === productId);
    const selectedHost = hosts.find((h) => h.host_id === hostId);

    startGenerate(async () => {
      const result = await generateLiveScript({
        product: {
          name: selectedProduct?.name ?? "Sản phẩm",
          description: selectedProduct?.description ?? null,
          key_features: selectedProduct?.key_features ?? null,
          usp: selectedProduct?.usp ?? null,
          target_audience: selectedProduct?.target_audience ?? null,
          price_range: selectedProduct?.price_range ?? null,
        },
        host: {
          name: selectedHost?.name ?? "Host",
          personality: selectedHost?.personality ?? null,
          voice_style: selectedHost?.voice_style ?? null,
          selling_style: selectedHost?.selling_style ?? null,
        },
        brief,
        duration_minutes: parseInt(duration) || 30,
      });
      if (result.success) setSections(result.data);
      else setError(result.error);
    });
  }

  function handleSave() {
    setError(null);
    setSaveSuccess(false);
    startSave(async () => {
      const [r1, r2] = await Promise.all([
        saveScriptSections(initial.script_id, sections),
        updateScript(initial.script_id, {
          product_id: productId || null,
          host_id: hostId || null,
          brief: brief || undefined,
          duration_minutes: parseInt(duration) || undefined,
        }),
      ]);
      if (!r1.success) { setError(r1.error); return; }
      if (!r2.success) { setError(r2.error); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    });
  }

  function handleApprove() {
    startApprove(async () => {
      const result = await updateScript(initial.script_id, { status: "approved" });
      if (result.success) setStatus("approved");
      else setError(result.error);
    });
  }

  function handleArchive() {
    startApprove(async () => {
      const result = await updateScript(initial.script_id, { status: "archived" });
      if (result.success) setStatus("archived");
      else setError(result.error);
    });
  }

  async function handleVoiceChange(newVoiceId: string) {
    setVoiceId(newVoiceId);
    await updateScriptVoice(initial.script_id, newVoiceId);
  }

  async function handleGenerateAudio(index: number) {
    if (!voiceId) { setError("Chọn giọng nói trước"); return; }
    setError(null);
    setGeneratingAudio((prev) => new Set(prev).add(index));
    const result = await generateSectionAudio(
      initial.script_id, index, sections[index].content, voiceId
    );
    setGeneratingAudio((prev) => { const s = new Set(prev); s.delete(index); return s; });
    if (result.success) setSectionAudio(index, result.data.audio_url);
    else setError(result.error);
  }

  async function handleGenerateAllAudio() {
    if (!voiceId) { setError("Chọn giọng nói trước"); return; }
    setError(null);
    setGeneratingAll(true);
    const result = await generateAllSectionsAudio(initial.script_id, sections, voiceId);
    setGeneratingAll(false);
    if (result.success) {
      for (const r of result.data.results) {
        if (r.success && r.audio_url) setSectionAudio(r.index, r.audio_url);
      }
      const failed = result.data.results.filter((r) => !r.success);
      if (failed.length > 0) setError(`${failed.length} section bị lỗi khi tạo audio`);
    } else {
      setError(result.error);
    }
  }

  const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
    draft: { label: "Nháp", variant: "secondary" },
    approved: { label: "Đã duyệt", variant: "success" },
    archived: { label: "Lưu trữ", variant: "warning" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/livestream/scripts">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">{initial.title}</h1>
            <Badge variant={STATUS_BADGE[status]?.variant ?? "secondary"}>
              {STATUS_BADGE[status]?.label ?? status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {status === "draft" && (
            <Button variant="outline" size="sm" onClick={handleApprove}
              disabled={isApproving || sections.length === 0}>
              <CheckCircle className="h-4 w-4 mr-1.5" />Duyệt kịch bản
            </Button>
          )}
          {status === "approved" && (
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={isApproving}>
              Lưu trữ
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> :
              saveSuccess ? <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" /> :
              <Save className="h-4 w-4 mr-1.5" />}
            {saveSuccess ? "Đã lưu" : "Lưu"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Script info */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Thông tin kịch bản</h2>

            <div className="space-y-2">
              <Label>Sản phẩm *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Chọn sản phẩm..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.product_id} value={p.product_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>AI Host</Label>
              <Select value={hostId || "__none__"} onValueChange={(v) => setHostId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Chọn host..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Không chọn</SelectItem>
                  {hosts.map((h) => (
                    <SelectItem key={h.host_id} value={h.host_id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Thời lượng (phút)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} phút</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brief thêm (tuỳ chọn)</Label>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Yêu cầu đặc biệt, tone của buổi live, sản phẩm đang sale..."
                rows={3}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !productId}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> :
                <Sparkles className="h-4 w-4 mr-1.5" />}
              {isGenerating ? "Đang tạo kịch bản..." : "Tạo kịch bản AI"}
            </Button>
          </div>

          {/* Voice / Audio panel */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">Giọng nói AI</h2>
              {audioCount > 0 && (
                <span className="text-xs text-emerald-600 font-medium">
                  {audioCount}/{sections.length} section có audio
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Chọn giọng ElevenLabs</Label>
              {voices.length === 0 ? (
                <p className="text-xs text-zinc-400">Chưa cấu hình ELEVENLABS_API_KEY</p>
              ) : (
                <Select value={voiceId || "__none__"} onValueChange={(v) => handleVoiceChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn giọng nói..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa chọn</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name}
                        {v.labels?.accent ? ` · ${v.labels.accent}` : ""}
                        {v.category === "cloned" ? " (cloned)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {voiceId && sections.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateAllAudio}
                disabled={generatingAll || !voiceId}
              >
                {generatingAll ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4 mr-1.5" />
                )}
                {generatingAll ? "Đang tạo audio..." : "Tạo audio toàn bộ kịch bản"}
              </Button>
            )}

            {generatingAll && (
              <p className="text-xs text-zinc-500 text-center">
                Đang xử lý từng section, vui lòng đợi...
              </p>
            )}
          </div>

          {sections.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Clock className="h-4 w-4" />
                <span>
                  Tổng: <strong>{formatDuration(totalSeconds)}</strong>
                  {" "}· {sections.length} phần
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: sections */}
        <div className="lg:col-span-3 space-y-3">
          {sections.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-zinc-400">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Chọn sản phẩm và nhấn &quot;Tạo kịch bản AI&quot;</p>
            </div>
          ) : (
            sections.map((sec, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Grip className="h-4 w-4 text-zinc-300" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SECTION_COLOR[sec.section_type] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {SECTION_LABEL[sec.section_type] ?? sec.section_type}
                  </span>
                  <span className="text-xs text-zinc-400 ml-auto">{formatDuration(sec.duration_seconds)}</span>
                </div>

                <Textarea
                  value={sec.content}
                  onChange={(e) => updateSectionContent(i, e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />

                {/* Audio row */}
                <div className="flex items-center gap-2 pt-1">
                  {sec.audio_url ? (
                    <>
                      <AudioPlayer url={sec.audio_url} />
                      <button
                        onClick={() => handleGenerateAudio(i)}
                        disabled={generatingAudio.has(i) || !voiceId || generatingAll}
                        className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-40 transition-colors"
                      >
                        {generatingAudio.has(i) ? (
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        ) : (
                          <Volume2 className="h-3 w-3 inline mr-1" />
                        )}
                        {generatingAudio.has(i) ? "Đang tạo..." : "Tạo lại"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGenerateAudio(i)}
                      disabled={generatingAudio.has(i) || !voiceId || generatingAll}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-40 transition-colors"
                    >
                      {generatingAudio.has(i) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MicOff className="h-3 w-3" />
                      )}
                      {generatingAudio.has(i) ? "Đang tạo audio..." : "Chưa có audio · Tạo ngay"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
