import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Clock,
  Package,
  Video,
  AlertCircle,
  XCircle,
  Users,
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
        <p className="text-zinc-500 text-sm mt-1">Tổng quan hoạt động KOC CityAds</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricsCard
          title="Campaigns đang chạy"
          value={m.activeCampaigns}
          icon={Activity}
          color="blue"
          href="/admin/campaigns"
        />
        <MetricsCard
          title="Chờ duyệt (Client)"
          value={m.pendingClientApproval}
          icon={Clock}
          color="yellow"
        />
        <MetricsCard
          title="Chờ địa chỉ"
          value={m.addressWaiting}
          icon={Users}
          color="orange"
        />
        <MetricsCard
          title="Đã gửi hàng mẫu"
          value={m.sampleSent}
          icon={Package}
          color="purple"
        />
        <MetricsCard
          title="Video đã submit"
          value={m.videoSubmitted}
          icon={Video}
          color="green"
        />
        <MetricsCard
          title="Cần sửa video"
          value={m.needRevision}
          icon={AlertCircle}
          color="red"
        />
        <MetricsCard
          title="Thất bại / Drop"
          value={m.failed}
          icon={XCircle}
          color="zinc"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/campaigns", label: "Campaigns", desc: "Quản lý tất cả campaigns" },
          { href: "/admin/kocs", label: "KOCs", desc: "Quản lý danh sách KOC" },
          { href: "/admin/clients", label: "Clients", desc: "Quản lý clients / nhãn hàng" },
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
