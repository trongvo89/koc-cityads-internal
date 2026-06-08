import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyStats, getMonthlyRevenue } from "@/lib/actions/stats";
import { Badge } from "@/components/ui/badge";
import MonthPicker from "@/components/admin/month-picker";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Thống kê — KOC CityAds",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  active: "success",
  completed: "default",
  paused: "warning",
  cancelled: "destructive",
};

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function currentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isValidMonth(s: string) {
  return /^\d{4}-\d{2}$/.test(s);
}

type SearchParams = Promise<{ month?: string }>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Super admin guard (double-check beyond layout)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const params = await searchParams;
  const month =
    params.month && isValidMonth(params.month) ? params.month : currentMonth();

  const [result, revenueResult] = await Promise.all([
    getMonthlyStats(month),
    getMonthlyRevenue(month),
  ]);

  if (!result.success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Thống kê</h1>
        <p className="text-red-500 text-sm">{result.error}</p>
      </div>
    );
  }

  const s = result.data;
  const rev = revenueResult.success ? revenueResult.data : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Thống kê</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Doanh thu và hiệu quả campaign theo tháng
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthPicker month={month} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            Doanh thu
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {formatVND(s.total_contract_value)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            Campaigns
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {s.total_campaigns}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            Tổng KOC slots
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {s.total_koc_slots}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            KOC hoàn thành
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {s.total_koc_completed}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
            Tỷ lệ hoàn thành
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {s.overall_completion_rate}%
          </p>
          <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${s.overall_completion_rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Thực nhận trong tháng */}
      {rev && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">
                Cọc nhận được
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatVND(rev.total_deposit_received)}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">
                Quyết toán nhận
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatVND(rev.total_final_received)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-300 p-4">
              <p className="text-xs text-green-700 uppercase tracking-wide font-medium">
                Tổng thực nhận
              </p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatVND(rev.total_received)}
              </p>
            </div>
          </div>

          {rev.payments.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 bg-emerald-50">
                <h2 className="text-sm font-semibold text-emerald-800">
                  Chi tiết thực nhận
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Campaign
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Loại
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Giá trị HĐ
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Thực nhận
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                      Ngày nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rev.payments.map((p, i) => (
                    <tr
                      key={`${p.campaign_id}-${p.payment_type}-${i}`}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {p.campaign_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{p.client_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.payment_type === "deposit" ? "warning" : "success"}>
                          {p.payment_type === "deposit" ? "Đặt cọc" : "Quyết toán"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {formatVND(p.contract_value)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        {formatVND(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                        {new Date(p.paid_at).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-emerald-200 bg-emerald-50">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right text-sm font-semibold text-emerald-800"
                    >
                      Tổng thực nhận:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                      {formatVND(rev.total_received)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* Campaign detail table */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-sm font-semibold text-zinc-700">
            Chi tiết theo campaign
          </h2>
        </div>

        {s.campaigns.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            Không có campaign nào trong tháng này.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Package
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  KOC done
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Tỷ lệ
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Doanh thu
                </th>
              </tr>
            </thead>
            <tbody>
              {s.campaigns.map((c) => (
                <tr
                  key={c.campaign_id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {c.campaign_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{c.client_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {c.package_size}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-zinc-900">
                      {c.koc_completed}
                      <span className="text-zinc-400">/{c.koc_total}</span>
                    </span>
                    {c.koc_failed > 0 && (
                      <span className="ml-1 text-xs text-red-500">
                        ({c.koc_failed} fail)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${c.completion_rate}%` }}
                        />
                      </div>
                      <span
                        className={
                          c.completion_rate === 100
                            ? "text-green-600 font-medium"
                            : "text-zinc-600"
                        }
                      >
                        {c.completion_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {c.contract_value > 0 ? formatVND(c.contract_value) : (
                      <span className="text-zinc-400 font-normal">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-zinc-200 bg-zinc-50">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-zinc-700">
                  Tổng doanh thu:
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-zinc-900">
                  {formatVND(s.total_contract_value)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
