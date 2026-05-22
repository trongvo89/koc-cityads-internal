import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Users,
  Star,
  FileText,
  Send,
  Clock,
  Video,
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/actions/dashboard";
import MetricsCard from "@/components/admin/metrics-card";

export const metadata: Metadata = {
  title: "Dashboard — KOC CityAds",
};

export default async function AdminDashboardPage() {
  const result = await getDashboardMetrics();

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  const m = result.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Tổng quan KOC CRM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricsCard
          title="KOC đang hoạt động"
          value={m.totalKocs}
          icon={Users}
          color="blue"
          href="/admin/kocs"
        />
        <MetricsCard
          title="KOC top-rated (≥4★)"
          value={m.topRatedKocs}
          icon={Star}
          color="yellow"
          href="/admin/kocs"
        />
        <MetricsCard
          title="Campaigns đang chạy"
          value={m.activeCampaigns}
          icon={Activity}
          color="green"
          href="/admin/campaigns"
        />
        <MetricsCard
          title="Chờ duyệt (Client)"
          value={m.pendingApprovals}
          icon={Clock}
          color="orange"
        />
        <MetricsCard
          title="Proposal nháp"
          value={m.draftProposals}
          icon={FileText}
          color="purple"
          href="/admin/proposals"
        />
        <MetricsCard
          title="Proposal đã gửi"
          value={m.sentProposals}
          icon={Send}
          color="zinc"
          href="/admin/proposals"
        />
        <MetricsCard
          title="Video tháng này"
          value={m.videosThisMonth}
          icon={Video}
          color="blue"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { href: "/admin/kocs", label: "KOCs", desc: "Quản lý talent pool" },
          { href: "/admin/proposals", label: "Proposals", desc: "Pitch KOC cho client" },
          { href: "/admin/campaigns", label: "Campaigns", desc: "Quản lý campaigns" },
          { href: "/admin/clients", label: "Clients", desc: "Quản lý nhãn hàng" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block bg-white rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <p className="font-medium text-zinc-900">{item.label}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
