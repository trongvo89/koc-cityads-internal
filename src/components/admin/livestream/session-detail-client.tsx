"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle,
  Radio,
  ChevronDown,
  ChevronUp,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSession, updateSessionReport } from "@/lib/actions/livestream";
import type { SessionDetail } from "@/lib/actions/livestream";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Đã lên lịch",
  live: "Đang live",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  scheduled: "secondary",
  live: "destructive",
  completed: "success",
  cancelled: "secondary",
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Khác",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export default function SessionDetailClient({ session }: { session: SessionDetail }) {
  const [status, setStatus] = useState(session.status);
  const [showObs, setShowObs] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [peakViewers, setPeakViewers] = useState(String(session.peak_viewers ?? ""));
  const [totalOrders, setTotalOrders] = useState(String(session.total_orders ?? ""));
  const [gmv, setGmv] = useState(String(session.gmv ?? ""));
  const [reportNotes, setReportNotes] = useState(session.report_notes ?? "");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, startUpdate] = useTransition();
  const [isSavingReport, startSaveReport] = useTransition();

  function advanceStatus(next: "live" | "completed" | "cancelled") {
    startUpdate(async () => {
      const extra: Record<string, string | null> = {};
      if (next === "live") extra.started_at = new Date().toISOString();
      if (next === "completed" || next === "cancelled") extra.ended_at = new Date().toISOString();
      const result = await updateSession(session.session_id, { status: next, ...extra });
      if (result.success) setStatus(next);
      else setError(result.error);
    });
  }

  function handleSaveReport() {
    setError(null);
    setReportSuccess(false);
    startSaveReport(async () => {
      const result = await updateSessionReport(session.session_id, {
        peak_viewers: peakViewers ? parseInt(peakViewers) : null,
        total_orders: totalOrders ? parseInt(totalOrders) : null,
        gmv: gmv ? parseFloat(gmv) : null,
        report_notes: reportNotes || null,
      });
      if (result.success) {
        setReportSuccess(true);
        setTimeout(() => setReportSuccess(false), 2000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/livestream/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900">{session.title}</h1>
            <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
              {STATUS_LABEL[status] ?? status}
            </Badge>
            <Badge variant="secondary">{PLATFORM_LABEL[session.platform] ?? session.platform}</Badge>
          </div>
        </div>
        {session.script_id && (
          <Link href={`/live/${session.session_id}`} target="_blank">
            <Button variant="outline" size="sm">
              <MonitorPlay className="h-4 w-4 mr-1.5" />
              Teleprompter
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Status actions */}
      {status !== "completed" && status !== "cancelled" && (
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Cập nhật trạng thái</h2>
          <div className="flex gap-2 flex-wrap">
            {status === "scheduled" && (
              <>
                <Button
                  size="sm"
                  onClick={() => advanceStatus("live")}
                  disabled={isUpdating}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  <Radio className="h-4 w-4 mr-1.5" />
                  Bắt đầu live
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => advanceStatus("cancelled")}
                  disabled={isUpdating}
                >
                  Hủy phiên
                </Button>
              </>
            )}
            {status === "live" && (
              <>
                <Button
                  size="sm"
                  onClick={() => advanceStatus("completed")}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Kết thúc live
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Session info */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Thông tin phiên</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {session.scheduled_at && (
            <>
              <span className="text-zinc-500">Thời gian</span>
              <span className="text-zinc-900">
                {new Date(session.scheduled_at).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          )}
          {session.host_name && (
            <>
              <span className="text-zinc-500">Host</span>
              <span className="text-zinc-900">{session.host_name}</span>
            </>
          )}
          {session.script_title && (
            <>
              <span className="text-zinc-500">Kịch bản</span>
              <Link
                href={`/admin/livestream/scripts/${session.script_id}`}
                className="text-zinc-900 hover:text-zinc-600 underline"
              >
                {session.script_title}
              </Link>
            </>
          )}
          {session.campaign_name && (
            <>
              <span className="text-zinc-500">Campaign</span>
              <Link
                href={`/admin/campaigns/${session.campaign_id}`}
                className="text-zinc-900 hover:text-zinc-600 underline"
              >
                {session.campaign_name}
              </Link>
            </>
          )}
          {session.notes && (
            <>
              <span className="text-zinc-500">Ghi chú</span>
              <span className="text-zinc-900">{session.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* OBS / Streaming credentials */}
      {(session.rtmp_url || session.stream_key || session.stream_link) && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowObs(!showObs)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Kết nối OBS / Streaming
            {showObs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showObs && (
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
              {session.rtmp_url && (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">RTMP URL</Label>
                  <div className="flex gap-2">
                    <Input value={session.rtmp_url} readOnly className="font-mono text-xs" />
                    <CopyButton value={session.rtmp_url} />
                  </div>
                </div>
              )}
              {session.stream_key && (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">Stream Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={session.stream_key}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <CopyButton value={session.stream_key} />
                  </div>
                </div>
              )}
              {session.stream_link && (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">Link xem live</Label>
                  <div className="flex gap-2">
                    <Input value={session.stream_link} readOnly className="text-xs" />
                    <CopyButton value={session.stream_link} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post-live report */}
      {status === "completed" && (
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Báo cáo sau live</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Peak viewers</Label>
              <Input
                type="number"
                value={peakViewers}
                onChange={(e) => setPeakViewers(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Đơn hàng</Label>
              <Input
                type="number"
                value={totalOrders}
                onChange={(e) => setTotalOrders(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GMV (₫)</Label>
              <Input
                type="number"
                value={gmv}
                onChange={(e) => setGmv(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú báo cáo</Label>
            <Textarea
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              rows={2}
              placeholder="Tóm tắt buổi live..."
            />
          </div>
          <Button size="sm" onClick={handleSaveReport} disabled={isSavingReport}>
            {isSavingReport ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : reportSuccess ? (
              <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {reportSuccess ? "Đã lưu" : "Lưu báo cáo"}
          </Button>
        </div>
      )}

      {/* Completed summary */}
      {status === "completed" && (session.peak_viewers || session.total_orders || session.gmv) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Peak viewers", value: session.peak_viewers?.toLocaleString("vi-VN") ?? "—" },
            { label: "Đơn hàng", value: session.total_orders?.toLocaleString("vi-VN") ?? "—" },
            { label: "GMV", value: session.gmv ? `₫${Number(session.gmv).toLocaleString("vi-VN")}` : "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-zinc-200 rounded-lg p-3">
              <p className="text-xl font-bold text-zinc-900">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
