"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteReference } from "@/lib/actions/references";
import { KNOWLEDGE_TYPE_LABEL } from "@/lib/actions/references";
import type { ReferenceDetail, ReferenceInsightData } from "@/lib/actions/references";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Chờ xử lý",
  processing: "Đang transcribe...",
  transcribed: "Đã transcribe — Sẵn sàng phân tích",
  analyzed: "Đã phân tích",
  failed: "Lỗi xử lý",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  uploaded: "secondary",
  processing: "warning",
  transcribed: "default",
  analyzed: "success",
  failed: "destructive",
};

function InsightSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-zinc-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  );
}

function InsightDisplay({ data }: { data: ReferenceInsightData }) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Tóm tắt</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-blue-600">Chất lượng:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < data.quality_score ? "bg-blue-500" : "bg-blue-200"}`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-blue-900">{data.summary}</p>
      </div>

      <InsightSection title="Câu hook mở đầu">
        <ul className="space-y-1.5">
          {data.opening_hooks.map((h, i) => (
            <li key={i} className="text-sm text-zinc-700 bg-zinc-50 rounded px-3 py-1.5 border-l-2 border-amber-400">
              "{h}"
            </li>
          ))}
        </ul>
      </InsightSection>

      <InsightSection title="Kỹ thuật bán hàng">
        <div className="space-y-2">
          {data.selling_techniques.map((t, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-zinc-800">{t.technique}</p>
              <p className="text-zinc-600 text-xs mt-0.5">Ví dụ: {t.example}</p>
              {t.effectiveness && (
                <p className="text-emerald-600 text-xs mt-0.5">→ {t.effectiveness}</p>
              )}
            </div>
          ))}
        </div>
      </InsightSection>

      <InsightSection title="Kêu gọi mua hàng (CTA)">
        <div className="space-y-2">
          {data.cta_styles.map((c, i) => (
            <div key={i} className="text-sm">
              <span className="inline-block bg-rose-100 text-rose-700 text-xs font-medium px-2 py-0.5 rounded mr-2">
                {c.style}
              </span>
              <span className="text-zinc-700">"{c.example}"</span>
            </div>
          ))}
        </div>
      </InsightSection>

      <InsightSection title="Tương tác với khán giả">
        <div className="space-y-2">
          {data.engagement_patterns.map((e, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-zinc-800">{e.pattern}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{e.example}</p>
            </div>
          ))}
        </div>
      </InsightSection>

      <InsightSection title="Chiến thuật tạo sự cấp bách">
        <ul className="space-y-1">
          {data.urgency_tactics.map((u, i) => (
            <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚡</span>
              {u}
            </li>
          ))}
        </ul>
      </InsightSection>

      <InsightSection title="Giọng điệu & năng lượng">
        <div className="space-y-2 text-sm">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Giọng điệu</p>
              <p className="text-zinc-800">{data.tone_and_energy.overall_tone}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Năng lượng</p>
              <p className="text-zinc-800">{data.tone_and_energy.energy_level}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Phong cách ngôn ngữ</p>
              <p className="text-zinc-800">{data.tone_and_energy.language_register}</p>
            </div>
          </div>
          {data.tone_and_energy.notable_phrases.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Câu đặc trưng</p>
              <div className="flex flex-wrap gap-1.5">
                {data.tone_and_energy.notable_phrases.map((p, i) => (
                  <span key={i} className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </InsightSection>

      {data.objection_handling.length > 0 && (
        <InsightSection title="Xử lý phản đối">
          <div className="space-y-2">
            {data.objection_handling.map((o, i) => (
              <div key={i} className="text-sm">
                <p className="text-zinc-600 italic">"{o.objection}"</p>
                <p className="text-zinc-800 mt-0.5">→ {o.response}</p>
              </div>
            ))}
          </div>
        </InsightSection>
      )}
    </div>
  );
}

export default function ReferenceDetailClient({ reference }: { reference: ReferenceDetail }) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(reference.status);

  // Poll for status changes when processing
  const poll = useCallback(() => {
    if (pollingStatus === "uploaded" || pollingStatus === "processing") {
      router.refresh();
    }
  }, [pollingStatus, router]);

  useEffect(() => {
    if (pollingStatus !== "uploaded" && pollingStatus !== "processing") return;
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [pollingStatus, poll]);

  useEffect(() => {
    setPollingStatus(reference.status);
  }, [reference.status]);

  async function triggerTranscribe() {
    setPollingStatus("processing");
    await fetch("/api/references/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_id: reference.id }),
    });
    router.refresh();
  }

  async function triggerAnalyze() {
    setIsAnalyzing(true);
    await fetch("/api/references/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_id: reference.id }),
    });
    setIsAnalyzing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Xóa tư liệu "${reference.title}"?`)) return;
    setIsDeleting(true);
    await deleteReference(reference.id);
    router.push("/admin/livestream/references");
  }

  const isProcessing = pollingStatus === "uploaded" || pollingStatus === "processing";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 truncate">{reference.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={STATUS_VARIANT[reference.status] ?? "secondary"}>
              {STATUS_LABEL[reference.status] ?? reference.status}
            </Badge>
            <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              {KNOWLEDGE_TYPE_LABEL[reference.knowledge_type] ?? reference.knowledge_type}
            </span>
            {reference.source_platform && (
              <span className="text-xs text-zinc-400">{reference.source_platform}</span>
            )}
            {reference.category && (
              <span className="text-xs text-zinc-400">· {reference.category}</span>
            )}
            {reference.product_name && (
              <span className="text-xs text-zinc-400">· {reference.product_name}</span>
            )}
          </div>
          {reference.error_message && (
            <p className="text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded">
              {reference.error_message}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {reference.knowledge_type === "koc_insight" && reference.status === "transcribed" && !reference.insight && (
            <div className="flex flex-col items-end gap-0.5">
              <Button size="sm" onClick={triggerAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-1.5" />
                )}
                Phân tích AI
              </Button>
              <p className="text-[10px] text-zinc-400">~₫500–2,000 · Sonnet</p>
            </div>
          )}
          {reference.knowledge_type === "koc_insight" &&
            (reference.status === "uploaded" || reference.status === "failed") &&
            reference.source_type !== "text" && (
              <Button size="sm" variant="outline" onClick={triggerTranscribe} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Transcribe lại
              </Button>
            )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-amber-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Đang xử lý...</p>
            <p className="text-xs text-amber-600">Trang sẽ tự động cập nhật khi hoàn thành</p>
          </div>
        </div>
      )}

      {/* Pipeline status steps — koc_insight only (others go straight to analyzed) */}
      {reference.knowledge_type === "koc_insight" && (
      <div className="bg-white border border-zinc-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Tiến trình xử lý</p>
        <div className="flex items-center gap-2">
          {[
            { key: "uploaded", label: "Upload" },
            { key: "transcribed", label: "Transcribe" },
            { key: "analyzed", label: "Phân tích AI" },
          ].map((step, idx, arr) => {
            const statusOrder = ["uploaded", "processing", "transcribed", "analyzed"];
            const currentIdx = statusOrder.indexOf(reference.status);
            const stepIdx = statusOrder.indexOf(step.key === "uploaded" ? "uploaded" : step.key);
            const done = currentIdx >= stepIdx || reference.status === "analyzed";
            const active = step.key === "transcribed"
              ? reference.status === "processing" || reference.status === "transcribed"
              : step.key === "analyzed"
              ? reference.status === "analyzed"
              : true;

            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 text-xs ${done ? "text-emerald-600" : active ? "text-amber-600" : "text-zinc-400"}`}>
                  {reference.status === "failed" && idx > 0 ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : done && reference.status !== "processing" || (step.key === "uploaded") ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {step.label}
                </div>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-px ${done ? "bg-emerald-300" : "bg-zinc-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Transcript / Content */}
      {reference.transcript && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <span>
              {reference.knowledge_type === "koc_insight" ? "Transcript" : "Nội dung"} · {reference.transcript.word_count?.toLocaleString() ?? "?"} từ ·{" "}
              <span className="text-zinc-400 font-normal">{reference.transcript.transcription_provider}</span>
            </span>
            {transcriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {transcriptOpen && (
            <div className="px-4 pb-4">
              <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto bg-zinc-50 rounded p-3">
                {reference.transcript.full_text}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {reference.insight ? (
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Insight bán hàng từ AI</h2>
          <InsightDisplay data={reference.insight.insight_data} />
        </div>
      ) : reference.status === "analyzed" ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg py-8 text-center">
          <p className="text-sm text-zinc-500">Chưa có insight — thử phân tích lại</p>
          <Button size="sm" className="mt-3" onClick={triggerAnalyze} disabled={isAnalyzing}>
            <Zap className="h-4 w-4 mr-1.5" />
            Phân tích lại
          </Button>
        </div>
      ) : null}
    </div>
  );
}
