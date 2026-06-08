"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, Save, CheckCircle, Clock, Loader2, Grip,
  Play, Pause, Mic, MicOff, Video, VideoOff, RefreshCw, Plus, Trash2,
  BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { generateLiveScript } from "@/lib/actions/ai-generation";
import { updateScript, saveScriptSections } from "@/lib/actions/livestream";
import { generateSectionAudio, generateAllSectionsAudio, updateScriptVoice, cloneVoice, deleteClonedVoice } from "@/lib/actions/audio";
import { generateSectionVideo, generateAllSectionVideos, checkSectionVideoStatus } from "@/lib/actions/video";
import { getInsightsForReferences, getApprovedScriptsByCategory } from "@/lib/actions/references";
import type { ScriptDetail, AiHostListItem, ProductListItem } from "@/lib/actions/livestream";
import type { ScriptSection } from "@/lib/actions/ai-generation";
import type { ElevenLabsVoice } from "@/lib/actions/audio";
import type { HeyGenAvatar } from "@/lib/actions/video";
import type { ReferenceMaterial } from "@/lib/actions/references";

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
  avatars: HeyGenAvatar[];
  references?: ReferenceMaterial[];
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
    <span className="inline-flex items-center">
      <button onClick={toggle}
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {playing ? "Dừng" : "Nghe"}
      </button>
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} className="hidden" />
    </span>
  );
}

export default function ScriptDetailClient({ script: initial, hosts, products, voices: initialVoices, avatars, references = [] }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<ScriptSection[]>(initial.script_sections);
  const [status, setStatus] = useState(initial.status);
  const [productId, setProductId] = useState(initial.product_id ?? "");
  const [hostId, setHostId] = useState(initial.host_id ?? "");
  const [brief, setBrief] = useState(initial.brief ?? "");
  const [duration, setDuration] = useState<string>(String(initial.duration_minutes ?? 30));
  const [voiceId, setVoiceId] = useState(initial.voice_id ?? "");
  const [avatarId, setAvatarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState<Set<number>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState<Set<number>>(new Set());
  const [generatingAllVideo, setGeneratingAllVideo] = useState(false);
  const [pollingVideo, setPollingVideo] = useState<Set<number>>(new Set());
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isApproving, startApprove] = useTransition();

  // Reference selector state
  const [refPanelOpen, setRefPanelOpen] = useState(false);
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());
  const [includeApprovedScripts, setIncludeApprovedScripts] = useState(false);

  // Voice cloning state
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);
  const [cloningVoice, setCloningVoice] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(initialVoices);

  const totalSeconds = sections.reduce((s, sec) => s + (sec.duration_seconds ?? 0), 0);
  const audioCount = sections.filter((s) => s.audio_url).length;
  const videoCount = sections.filter((s) => s.video_url).length;
  const pendingVideoCount = sections.filter((s) => s.heygen_video_id && !s.video_url).length;

  function updateSectionContent(index: number, content: string) {
    setSections((prev) => { const next = [...prev]; next[index] = { ...next[index], content }; return next; });
  }
  function setSectionAudio(index: number, audio_url: string) {
    setSections((prev) => { const next = [...prev]; next[index] = { ...next[index], audio_url }; return next; });
  }
  function setSectionVideo(index: number, video_url: string) {
    setSections((prev) => { const next = [...prev]; next[index] = { ...next[index], video_url }; return next; });
  }

  // Poll for pending videos
  const pollVideoStatus = useCallback(async (index: number) => {
    setPollingVideo((prev) => new Set(prev).add(index));
    const result = await checkSectionVideoStatus(initial.script_id, index);
    setPollingVideo((prev) => { const s = new Set(prev); s.delete(index); return s; });
    if (result.success) {
      if (result.data.status === "completed" && result.data.video_url) {
        setSectionVideo(index, result.data.video_url);
      } else if (result.data.status === "failed") {
        setError(`Video section ${index + 1} thất bại: ${result.data.error ?? "unknown"}`);
      }
      return result.data.status;
    }
    return null;
  }, [initial.script_id]);

  // Auto-poll pending videos every 15s
  useEffect(() => {
    const pending = sections
      .map((s, i) => (s.heygen_video_id && !s.video_url ? i : -1))
      .filter((i) => i >= 0);
    if (pending.length === 0) return;

    const interval = setInterval(() => {
      pending.forEach((i) => pollVideoStatus(i));
    }, 15000);
    return () => clearInterval(interval);
  }, [sections, pollVideoStatus]);

  function handleGenerate(mode: "draft" | "final") {
    if (!productId) { setError("Chọn sản phẩm trước khi generate kịch bản"); return; }
    setError(null);
    const selectedProduct = products.find((p) => p.product_id === productId);
    const selectedHost = hosts.find((h) => h.host_id === hostId);
    startGenerate(async () => {
      // Draft mode skips reference lookup to save cost
      const refIds = mode === "final" ? Array.from(selectedRefIds) : [];
      const [insightsResult, approvedResult] = await Promise.all([
        refIds.length > 0 ? getInsightsForReferences(refIds) : Promise.resolve({ success: true as const, data: [] }),
        mode === "final" && includeApprovedScripts
          ? getApprovedScriptsByCategory(selectedProduct?.category ?? null)
          : Promise.resolve({ success: true as const, data: [] }),
      ]);

      const result = await generateLiveScript({
        mode,
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
        references: insightsResult.success ? insightsResult.data : undefined,
        approvedScripts: approvedResult.success ? approvedResult.data : undefined,
      });
      if (result.success) setSections(result.data);
      else setError(result.error);
    });
  }

  function handleSave() {
    setError(null); setSaveSuccess(false);
    startSave(async () => {
      const [r1, r2] = await Promise.all([
        saveScriptSections(initial.script_id, sections),
        updateScript(initial.script_id, {
          product_id: productId || null, host_id: hostId || null,
          brief: brief || undefined, duration_minutes: parseInt(duration) || undefined,
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
      if (result.success) setStatus("approved"); else setError(result.error);
    });
  }

  function handleArchive() {
    startApprove(async () => {
      const result = await updateScript(initial.script_id, { status: "archived" });
      if (result.success) setStatus("archived"); else setError(result.error);
    });
  }

  async function handleVoiceChange(v: string) {
    setVoiceId(v);
    await updateScriptVoice(initial.script_id, v);
  }

  async function handleCloneVoice() {
    if (!cloneName.trim()) { setCloneError("Nhập tên giọng"); return; }
    if (!cloneFiles || cloneFiles.length === 0) { setCloneError("Chọn ít nhất 1 file âm thanh"); return; }
    setCloneError(null);
    setCloningVoice(true);

    const formData = new FormData();
    formData.append("name", cloneName.trim());
    for (let i = 0; i < cloneFiles.length; i++) {
      formData.append("files", cloneFiles[i]);
    }

    const result = await cloneVoice(formData);
    setCloningVoice(false);

    if (result.success) {
      // Add cloned voice to local list and select it
      const newVoice: ElevenLabsVoice = {
        voice_id: result.data.voice_id,
        name: result.data.name,
        category: "cloned",
        labels: {},
        preview_url: null,
      };
      setVoices((prev) => [newVoice, ...prev]);
      setVoiceId(result.data.voice_id);
      await updateScriptVoice(initial.script_id, result.data.voice_id);
      setCloneOpen(false);
      setCloneName("");
      setCloneFiles(null);
      router.refresh();
    } else {
      setCloneError(result.error);
    }
  }

  async function handleDeleteVoice(voice_id: string, voiceName: string) {
    if (!confirm(`Xoá giọng clone "${voiceName}"? Hành động này không thể hoàn tác.`)) return;
    const result = await deleteClonedVoice(voice_id);
    if (result.success) {
      setVoices((prev) => prev.filter((v) => v.voice_id !== voice_id));
      if (voiceId === voice_id) setVoiceId("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleGenerateAudio(index: number) {
    if (!voiceId) { setError("Chọn giọng nói trước"); return; }
    setError(null);
    setGeneratingAudio((prev) => new Set(prev).add(index));
    const r = await generateSectionAudio(initial.script_id, index, sections[index].content, voiceId);
    setGeneratingAudio((prev) => { const s = new Set(prev); s.delete(index); return s; });
    if (r.success) setSectionAudio(index, r.data.audio_url);
    else setError(r.error);
  }

  async function handleGenerateAllAudio() {
    if (!voiceId) { setError("Chọn giọng nói trước"); return; }
    setError(null); setGeneratingAll(true);
    const result = await generateAllSectionsAudio(initial.script_id, sections, voiceId);
    setGeneratingAll(false);
    if (result.success) {
      for (const r of result.data.results) {
        if (r.success && r.audio_url) setSectionAudio(r.index, r.audio_url);
      }
      const failed = result.data.results.filter((r) => !r.success);
      if (failed.length > 0) setError(`${failed.length} section bị lỗi audio`);
    } else setError(result.error);
  }

  async function handleGenerateVideo(index: number) {
    if (!avatarId) { setError("Chọn avatar HeyGen trước"); return; }
    setError(null);
    setGeneratingVideo((prev) => new Set(prev).add(index));
    const r = await generateSectionVideo(initial.script_id, index, avatarId);
    setGeneratingVideo((prev) => { const s = new Set(prev); s.delete(index); return s; });
    if (r.success) {
      // Mark section as having a pending video, auto-poll will pick up
      setSections((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], heygen_video_id: r.data.video_id };
        return next;
      });
    } else setError(r.error);
  }

  async function handleGenerateAllVideo() {
    if (!avatarId) { setError("Chọn avatar HeyGen trước"); return; }
    setError(null); setGeneratingAllVideo(true);
    const result = await generateAllSectionVideos(initial.script_id, avatarId);
    setGeneratingAllVideo(false);
    if (result.success) {
      if (result.data.errors.length > 0) setError(result.data.errors.join("\n"));
    } else setError(result.error);
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
              <CheckCircle className="h-4 w-4 mr-1.5" />Duyệt
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
          <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Script info */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">1. Kịch bản</h2>
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
              <Textarea value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder="Yêu cầu đặc biệt, tone, sản phẩm đang sale..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Button variant="outline" className="w-full" onClick={() => handleGenerate("draft")}
                  disabled={isGenerating || !productId}>
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> :
                    <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Nháp nhanh
                </Button>
                <p className="text-center text-[10px] text-zinc-400">~₫200–500 · Haiku</p>
              </div>
              <div className="space-y-0.5">
                <Button className="w-full" onClick={() => handleGenerate("final")}
                  disabled={isGenerating || !productId}>
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> :
                    <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Chính thức
                </Button>
                <p className="text-center text-[10px] text-zinc-400">~₫2k–5k · Sonnet</p>
              </div>
            </div>
          </div>

          {/* Reference selector panel */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setRefPanelOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-violet-500" />
                <span>1b. Tư liệu tham khảo</span>
                {selectedRefIds.size > 0 && (
                  <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {selectedRefIds.size} đã chọn
                  </span>
                )}
              </div>
              {refPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {refPanelOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
                {references.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-zinc-400">Chưa có tư liệu nào</p>
                    <Link href="/admin/livestream/references" className="text-xs text-violet-600 hover:underline">
                      + Thêm tư liệu tham khảo
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="pt-3 space-y-1.5">
                      {references
                        .filter((r) => r.status === "analyzed")
                        .map((ref) => {
                          const checked = selectedRefIds.has(ref.id);
                          return (
                            <label
                              key={ref.id}
                              className={`flex items-start gap-2.5 cursor-pointer rounded-md px-2.5 py-2 border transition-colors ${
                                checked
                                  ? "bg-violet-50 border-violet-200"
                                  : "border-zinc-100 hover:bg-zinc-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedRefIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.delete(ref.id);
                                    else next.add(ref.id);
                                    return next;
                                  });
                                }}
                                className="mt-0.5 accent-violet-600"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-800 truncate">{ref.title}</p>
                                {(ref.source_platform || ref.category) && (
                                  <p className="text-xs text-zinc-400 mt-0.5">
                                    {[ref.source_platform, ref.category].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      {references.filter((r) => r.status !== "analyzed").length > 0 && (
                        <p className="text-xs text-zinc-400 pt-1">
                          {references.filter((r) => r.status !== "analyzed").length} tư liệu chưa phân tích xong
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={includeApprovedScripts}
                        onChange={(e) => setIncludeApprovedScripts(e.target.checked)}
                        className="accent-violet-600"
                      />
                      Kèm kịch bản đã duyệt trước (cùng ngành hàng)
                    </label>
                    {selectedRefIds.size > 0 && (
                      <p className="text-xs text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded">
                        ✦ AI sẽ dùng Sonnet + học từ {selectedRefIds.size} tư liệu để tạo kịch bản độc đáo hơn
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Voice panel */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">2. Giọng nói</h2>
              {audioCount > 0 && (
                <span className="text-xs text-emerald-600 font-medium">{audioCount}/{sections.length} audio</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Giọng ElevenLabs</Label>
                {voices.length > 0 && (
                  <button onClick={() => { setCloneOpen(true); setCloneError(null); }}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                    <Plus className="h-3 w-3" />Clone giọng mới
                  </button>
                )}
              </div>
              {voices.length === 0 ? (
                <p className="text-xs text-zinc-400">Chưa cấu hình ELEVENLABS_API_KEY</p>
              ) : (
                <Select value={voiceId || "__none__"} onValueChange={(v) => handleVoiceChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn giọng..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa chọn</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name}{v.labels?.accent ? ` · ${v.labels.accent}` : ""}{v.category === "cloned" ? " ✦clone" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Cloned voices management */}
            {voices.some((v) => v.category === "cloned") && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-medium">Giọng đã clone</p>
                {voices.filter((v) => v.category === "cloned").map((v) => (
                  <div key={v.voice_id} className="flex items-center justify-between text-xs px-2 py-1 bg-violet-50 rounded border border-violet-100">
                    <span className="text-violet-800 font-medium">{v.name}</span>
                    <button onClick={() => handleDeleteVoice(v.voice_id, v.name)}
                      className="text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {voiceId && sections.length > 0 && (
              <div className="space-y-1">
                <Button variant="outline" className="w-full" onClick={handleGenerateAllAudio}
                  disabled={generatingAll || !voiceId || status !== "approved"}>
                  {generatingAll ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> :
                    <Mic className="h-4 w-4 mr-1.5" />}
                  {generatingAll ? "Đang tạo audio..." : "Tạo audio toàn bộ"}
                </Button>
                {status !== "approved" && (
                  <p className="text-[10px] text-amber-600 text-center">Duyệt kịch bản trước khi tạo audio · ~₫500–1,500/phần</p>
                )}
              </div>
            )}
          </div>

          {/* Video panel */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">3. Video Avatar</h2>
              <div className="flex items-center gap-2">
                {videoCount > 0 && (
                  <span className="text-xs text-blue-600 font-medium">{videoCount}/{sections.length} video</span>
                )}
                {pendingVideoCount > 0 && (
                  <span className="text-xs text-amber-600 font-medium animate-pulse">
                    {pendingVideoCount} đang render
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Avatar HeyGen</Label>
              {avatars.length === 0 ? (
                <p className="text-xs text-zinc-400">Chưa cấu hình HEYGEN_API_KEY</p>
              ) : (
                <Select value={avatarId || "__none__"} onValueChange={(v) => setAvatarId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn avatar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa chọn</SelectItem>
                    {avatars.map((a) => (
                      <SelectItem key={a.avatar_id} value={a.avatar_id}>
                        {a.avatar_name}{a.gender ? ` · ${a.gender}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {avatarId && sections.length > 0 && (
              <div className="space-y-1">
                <Button variant="outline" className="w-full" onClick={handleGenerateAllVideo}
                  disabled={generatingAllVideo || !avatarId || status !== "approved"}>
                  {generatingAllVideo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> :
                    <Video className="h-4 w-4 mr-1.5" />}
                  {generatingAllVideo ? "Đang submit..." : "Tạo video toàn bộ"}
                </Button>
                {status !== "approved" && (
                  <p className="text-[10px] text-amber-600 text-center">Duyệt kịch bản trước khi tạo video · ~₫5k–15k/phần</p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          {sections.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Clock className="h-4 w-4" />
                <span>
                  Tổng: <strong>{formatDuration(totalSeconds)}</strong> · {sections.length} phần
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
              <p className="text-sm">Chọn sản phẩm và nhấn &quot;Nháp nhanh&quot; hoặc &quot;Chính thức&quot;</p>
            </div>
          ) : (
            sections.map((sec, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <Grip className="h-4 w-4 text-zinc-300" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SECTION_COLOR[sec.section_type] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {SECTION_LABEL[sec.section_type] ?? sec.section_type}
                  </span>
                  <span className="text-xs text-zinc-400 ml-auto">{formatDuration(sec.duration_seconds)}</span>
                </div>

                {/* Content */}
                <Textarea value={sec.content} onChange={(e) => updateSectionContent(i, e.target.value)}
                  rows={4} className="text-sm resize-none" />

                {/* Media row */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {/* Audio */}
                  {sec.audio_url ? (
                    <div className="flex items-center gap-1.5">
                      <AudioPlayer url={sec.audio_url} />
                      <button onClick={() => handleGenerateAudio(i)}
                        disabled={generatingAudio.has(i) || !voiceId || generatingAll}
                        className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors">
                        {generatingAudio.has(i) ? <Loader2 className="h-3 w-3 animate-spin inline" /> : null}
                        {generatingAudio.has(i) ? " Đang tạo..." : "Tạo lại audio"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleGenerateAudio(i)}
                      disabled={generatingAudio.has(i) || !voiceId || generatingAll}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 transition-colors">
                      {generatingAudio.has(i) ? <Loader2 className="h-3 w-3 animate-spin" /> : <MicOff className="h-3 w-3" />}
                      {generatingAudio.has(i) ? "Đang tạo..." : "Tạo audio"}
                    </button>
                  )}

                  <span className="text-zinc-200">|</span>

                  {/* Video */}
                  {sec.video_url ? (
                    <div className="flex items-center gap-1.5">
                      <a href={sec.video_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
                        <Video className="h-3 w-3" />Xem video
                      </a>
                      <button onClick={() => handleGenerateVideo(i)}
                        disabled={generatingVideo.has(i) || !avatarId || generatingAllVideo}
                        className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors">
                        Tạo lại
                      </button>
                    </div>
                  ) : sec.heygen_video_id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-amber-600 animate-pulse flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />Đang render...
                      </span>
                      <button onClick={() => pollVideoStatus(i)}
                        disabled={pollingVideo.has(i)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-30">
                        <RefreshCw className={`h-3 w-3 inline ${pollingVideo.has(i) ? "animate-spin" : ""}`} /> Check
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleGenerateVideo(i)}
                      disabled={generatingVideo.has(i) || !avatarId || generatingAllVideo}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 transition-colors">
                      {generatingVideo.has(i) ? <Loader2 className="h-3 w-3 animate-spin" /> : <VideoOff className="h-3 w-3" />}
                      {generatingVideo.has(i) ? "Đang submit..." : "Tạo video"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Voice Clone Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clone giọng nói mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-500">
              Upload 1–5 file âm thanh tiếng Việt (30 giây – 5 phút mỗi file, MP3/WAV/M4A).
              ElevenLabs sẽ học giọng và tạo bản clone dùng được trong kịch bản.
            </p>
            <div className="space-y-2">
              <Label htmlFor="clone-name">Tên giọng *</Label>
              <Input id="clone-name" value={cloneName} onChange={(e) => setCloneName(e.target.value)}
                placeholder="VD: Lan Anh – Nữ miền Nam" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-files">File âm thanh mẫu *</Label>
              <input id="clone-files" type="file" accept="audio/*" multiple
                onChange={(e) => setCloneFiles(e.target.files)}
                className="block w-full text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-zinc-300 file:text-xs file:font-medium file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100 cursor-pointer" />
              {cloneFiles && cloneFiles.length > 0 && (
                <p className="text-xs text-zinc-500">{cloneFiles.length} file đã chọn</p>
              )}
            </div>
            {cloneError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{cloneError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)} disabled={cloningVoice}>
              Huỷ
            </Button>
            <Button onClick={handleCloneVoice} disabled={cloningVoice}>
              {cloningVoice ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mic className="h-4 w-4 mr-1.5" />}
              {cloningVoice ? "Đang clone..." : "Clone giọng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
