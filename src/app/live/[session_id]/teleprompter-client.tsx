"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Maximize } from "lucide-react";
import type { TeleprompterData } from "@/lib/actions/livestream";

const SECTION_LABEL: Record<string, string> = {
  intro: "Mở đầu",
  hook: "Hook",
  product_intro: "Giới thiệu SP",
  demo: "Demo",
  usp: "Điểm nổi bật",
  social_proof: "Chứng minh",
  cta: "Kêu gọi mua",
  outro: "Kết thúc",
};

const SECTION_COLOR: Record<string, string> = {
  intro: "bg-blue-900/60 text-blue-200 border-blue-700",
  hook: "bg-purple-900/60 text-purple-200 border-purple-700",
  product_intro: "bg-cyan-900/60 text-cyan-200 border-cyan-700",
  demo: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
  usp: "bg-amber-900/60 text-amber-200 border-amber-700",
  social_proof: "bg-orange-900/60 text-orange-200 border-orange-700",
  cta: "bg-rose-900/60 text-rose-200 border-rose-700",
  outro: "bg-zinc-800/60 text-zinc-300 border-zinc-600",
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Khác",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TeleprompterClient({ data }: { data: TeleprompterData }) {
  const { sections } = data;
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(sections[0]?.duration_seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const current = sections[index];
  const isFirst = index === 0;
  const isLast = index === sections.length - 1;
  const progress = sections.length > 0 ? ((index) / sections.length) * 100 : 0;

  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      setTimeLeft(sections[i]?.duration_seconds ?? 0);
      setRunning(false);
    },
    [sections]
  );

  const next = useCallback(() => {
    if (index < sections.length - 1) goTo(index + 1);
  }, [index, sections.length, goTo]);

  const prev = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  // Timer countdown
  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          if (autoAdvance && index < sections.length - 1) {
            setTimeout(() => goTo(index + 1), 500);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, timeLeft, autoAdvance, index, sections.length, goTo]);

  // Keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "p" || e.key === "P") setRunning((r) => !r);
      if (e.key === "r" || e.key === "R") setTimeLeft(sections[index]?.duration_seconds ?? 0);
      if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, index, sections]);

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center space-y-2">
          <p className="text-xl">Kịch bản chưa có nội dung</p>
          <p className="text-sm">Tạo kịch bản AI trong phần quản lý trước khi sử dụng teleprompter.</p>
        </div>
      </div>
    );
  }

  const timerColor =
    timeLeft === 0
      ? "text-red-400"
      : timeLeft <= 10
      ? "text-yellow-400"
      : "text-zinc-300";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white truncate max-w-xs">{data.title}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {PLATFORM_LABEL[data.platform] ?? data.platform}
          </span>
          {data.host_name && (
            <span className="text-xs text-zinc-500">Host: {data.host_name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="accent-blue-500"
            />
            Tự động chuyển
          </label>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Toàn màn hình (F)"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800 shrink-0">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-hidden">
        {/* Section type + timer */}
        <div className="flex items-center gap-4 mb-8">
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full border ${SECTION_COLOR[current.section_type] ?? "bg-zinc-800 text-zinc-300 border-zinc-600"}`}
          >
            {SECTION_LABEL[current.section_type] ?? current.section_type}
          </span>
          <span className={`text-2xl font-mono font-bold tabular-nums ${timerColor}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Script content */}
        <div className="max-w-4xl w-full text-center overflow-y-auto max-h-[55vh] px-4">
          <p className="text-3xl leading-relaxed font-medium text-white whitespace-pre-wrap">
            {current.content}
          </p>
        </div>

        {/* Next section preview */}
        {!isLast && (
          <p className="mt-8 text-sm text-zinc-600 italic">
            Tiếp theo:{" "}
            <span className="text-zinc-500">
              {SECTION_LABEL[sections[index + 1].section_type]} — {sections[index + 1].content.slice(0, 60)}…
            </span>
          </p>
        )}
        {isLast && (
          <p className="mt-8 text-sm text-zinc-600 italic">Đây là phần cuối cùng</p>
        )}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Prev */}
          <button
            onClick={prev}
            disabled={isFirst}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ChevronLeft className="h-5 w-5" />
            Trước
          </button>

          {/* Center controls */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 tabular-nums">
              {index + 1} / {sections.length}
            </span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors text-sm"
              title="P"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Dừng" : "Chạy"} hẹn giờ
            </button>
            <button
              onClick={() => setTimeLeft(sections[index]?.duration_seconds ?? 0)}
              className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors"
              title="R"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Next */}
          <button
            onClick={next}
            disabled={isLast}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Tiếp
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-zinc-700 mt-2">
          ← → hoặc Space: chuyển phần · P: hẹn giờ · R: reset · F: toàn màn hình
        </p>

        {/* Section dots */}
        <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
          {sections.map((sec, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-blue-500" : "bg-zinc-700 hover:bg-zinc-500"
              }`}
              title={SECTION_LABEL[sec.section_type] ?? sec.section_type}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
