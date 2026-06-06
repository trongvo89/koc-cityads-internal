"use client";

import Link from "next/link";
import { Users, FileText, Radio, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LivestreamOverview, SessionListItem } from "@/lib/actions/livestream";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Khác",
};

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

function formatGmv(gmv: number): string {
  if (gmv >= 1_000_000_000) return `${(gmv / 1_000_000_000).toFixed(1)}B`;
  if (gmv >= 1_000_000) return `${(gmv / 1_000_000).toFixed(1)}M`;
  if (gmv >= 1_000) return `${(gmv / 1_000).toFixed(0)}K`;
  return gmv.toLocaleString("vi-VN");
}

function SessionRow({ session }: { session: SessionListItem }) {
  return (
    <Link
      href={`/admin/livestream/sessions/${session.session_id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 rounded-md transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{session.title}</p>
          <p className="text-xs text-zinc-500">
            {PLATFORM_LABEL[session.platform] ?? session.platform}
            {session.host_name ? ` · ${session.host_name}` : ""}
            {session.scheduled_at
              ? ` · ${new Date(session.scheduled_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
      </div>
      <Badge variant={STATUS_VARIANT[session.status] ?? "secondary"} className="ml-3 shrink-0">
        {STATUS_LABEL[session.status] ?? session.status}
      </Badge>
    </Link>
  );
}

export default function LivestreamOverviewClient({
  overview,
}: {
  overview: LivestreamOverview | null;
}) {
  const data = overview ?? {
    total_hosts: 0,
    approved_scripts: 0,
    sessions_this_week: 0,
    total_gmv: 0,
    upcoming_sessions: [],
  };

  const stats = [
    {
      label: "AI Hosts",
      value: data.total_hosts,
      icon: Users,
      href: "/admin/livestream/hosts",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Kịch bản đã duyệt",
      value: data.approved_scripts,
      icon: FileText,
      href: "/admin/livestream/scripts",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Live tuần này",
      value: data.sessions_this_week,
      icon: Radio,
      href: "/admin/livestream/sessions",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "Tổng GMV",
      value: `₫${formatGmv(data.total_gmv)}`,
      icon: TrendingUp,
      href: "/admin/livestream/sessions",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">AI Livestream</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Quản lý host AI, kịch bản và lịch live</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/livestream/scripts">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" />
              Kịch bản
            </Button>
          </Link>
          <Link href="/admin/livestream/sessions">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Đặt lịch live
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/admin/livestream/hosts", label: "Quản lý AI Hosts", desc: "Tạo và chỉnh sửa host" },
          { href: "/admin/livestream/products", label: "Kiến thức sản phẩm", desc: "Thêm thông tin sản phẩm" },
          { href: "/admin/livestream/scripts", label: "Kịch bản live", desc: "Generate script bằng AI" },
          { href: "/admin/livestream/sessions", label: "Lịch live", desc: "Quản lý phiên streaming" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-300 transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900">{item.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Upcoming sessions */}
      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Live sắp diễn ra</h2>
          <Link href="/admin/livestream/sessions" className="text-xs text-zinc-500 hover:text-zinc-700">
            Xem tất cả
          </Link>
        </div>
        {data.upcoming_sessions.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Chưa có lịch live nào</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {data.upcoming_sessions.map((s) => (
              <SessionRow key={s.session_id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
