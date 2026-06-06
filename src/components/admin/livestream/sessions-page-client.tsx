"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SessionFormDialog from "./session-form-dialog";
import type { SessionListItem } from "@/lib/actions/livestream";

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

type Props = {
  sessions: SessionListItem[];
  hosts: { host_id: string; name: string }[];
  scripts: { script_id: string; title: string }[];
  campaigns: { campaign_id: string; campaign_name: string }[];
};

function SessionTable({ sessions }: { sessions: SessionListItem[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <Radio className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Không có phiên live nào</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">Tiêu đề</th>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">Nền tảng</th>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">Thời gian</th>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">Host</th>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">GMV</th>
            <th className="text-left px-4 py-3 font-medium text-zinc-600">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sessions.map((s) => (
            <tr key={s.session_id} className="hover:bg-zinc-50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/livestream/sessions/${s.session_id}`}
                  className="font-medium text-zinc-900 hover:text-zinc-600"
                >
                  {s.title}
                </Link>
                {s.campaign_name && (
                  <p className="text-xs text-zinc-400">{s.campaign_name}</p>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {PLATFORM_LABEL[s.platform] ?? s.platform}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {s.scheduled_at
                  ? new Date(s.scheduled_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600">{s.host_name ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-600">
                {s.gmv != null ? `₫${Number(s.gmv).toLocaleString("vi-VN")}` : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SessionsPageClient({ sessions, hosts, scripts, campaigns }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const upcoming = sessions.filter((s) => s.status === "scheduled" || s.status === "live");
  const past = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Lịch live</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{sessions.length} phiên</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Đặt lịch live
        </Button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "upcoming"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Sắp diễn ra ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "past"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Đã xong ({past.length})
        </button>
      </div>

      {activeTab === "upcoming" ? (
        <SessionTable sessions={upcoming} />
      ) : (
        <SessionTable sessions={past} />
      )}

      <SessionFormDialog
        open={createOpen}
        hosts={hosts}
        scripts={scripts}
        campaigns={campaigns}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
