import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Star, Eye, ThumbsUp, MessageCircle, Share2, TrendingUp, Calendar, Users } from "lucide-react";
import { getPublicReport } from "@/lib/actions/reports";
import type { PublicReportKoc } from "@/lib/actions/reports";
import { normalizeUrl } from "@/lib/utils/url";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}

function fmtCurrency(n: number | null): string {
  if (!n) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFollower(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K followers`;
  return `${n} followers`;
}

function Stars({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) {
  if (!rating) return null;
  const s = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
    </div>
  );
}

// ─── KOC Card ─────────────────────────────────────────────────────────────────

function KocCard({ koc }: { koc: PublicReportKoc }) {
  const engagement =
    (koc.video_views ?? 0) + (koc.video_likes ?? 0) + (koc.video_comments ?? 0) + (koc.video_shares ?? 0);
  const engagementRate =
    koc.video_views && koc.video_views > 0 && (koc.video_likes || koc.video_comments)
      ? (((koc.video_likes ?? 0) + (koc.video_comments ?? 0)) / koc.video_views) * 100
      : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* KOC header */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-blue-600 border-2 border-white shadow-sm">
            {koc.koc_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
              {koc.koc_name}
            </h3>
            {koc.koc_follower && (
              <p className="text-xs text-gray-400 mt-0.5">{formatFollower(koc.koc_follower)}</p>
            )}
            {koc.koc_category && koc.koc_category.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {koc.koc_category.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social links */}
          <div className="flex gap-1.5 flex-shrink-0">
            {normalizeUrl(koc.koc_tiktok_url) && (
              <a
                href={normalizeUrl(koc.koc_tiktok_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center transition-colors"
                title="TikTok"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.97a8.15 8.15 0 004.78 1.53V7.07a4.85 4.85 0 01-1.01-.38z" />
                </svg>
              </a>
            )}
            {normalizeUrl(koc.koc_instagram_url) && (
              <a
                href={normalizeUrl(koc.koc_instagram_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Video link */}
      <div className="px-5 pb-3">
        <a
          href={normalizeUrl(koc.video_url) ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium hover:from-blue-100 hover:to-indigo-100 transition-colors group"
        >
          <div className="h-6 w-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="truncate flex-1">Xem video</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 flex-shrink-0" />
        </a>
      </div>

      {/* Metrics grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
              <Eye className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Views</span>
            </div>
            <p className="font-bold text-gray-800 text-sm">{fmt(koc.video_views)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
              <ThumbsUp className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Likes</span>
            </div>
            <p className="font-bold text-gray-800 text-sm">{fmt(koc.video_likes)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
              <MessageCircle className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Bình luận</span>
            </div>
            <p className="font-bold text-gray-800 text-sm">{fmt(koc.video_comments)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
              <Share2 className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Chia sẻ</span>
            </div>
            <p className="font-bold text-gray-800 text-sm">{fmt(koc.video_shares)}</p>
          </div>
        </div>

        {koc.video_gmv != null && koc.video_gmv > 0 && (
          <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-green-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">GMV</span>
            </div>
            <span className="font-bold text-green-700 text-sm">{fmtCurrency(koc.video_gmv)}</span>
          </div>
        )}

        {engagementRate != null && (
          <div className="mt-1.5 text-right">
            <span className="text-[10px] text-gray-400">
              Tỷ lệ tương tác: <span className="font-semibold text-gray-600">{engagementRate.toFixed(1)}%</span>
            </span>
          </div>
        )}
      </div>

      {/* Rating & review */}
      {(koc.client_quality_rating != null || koc.client_quality_review) && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
          {koc.client_quality_rating != null && (
            <div className="mb-1.5">
              <Stars rating={koc.client_quality_rating} size="sm" />
            </div>
          )}
          {koc.client_quality_review && (
            <p className="text-xs text-gray-500 italic leading-relaxed">"{koc.client_quality_review}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getPublicReport(token);
  if (!result.success) return { title: "Báo cáo nghiệm thu" };
  return {
    title: `Báo cáo: ${result.data.campaign_name} — KOC CityAds`,
    description: `Báo cáo nghiệm thu chiến dịch KOC cho ${result.data.client_name}`,
  };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicReport(token);
  if (!result.success) notFound();

  const report = result.data;

  const totalViews = report.kocs.reduce((s, k) => s + (k.video_views ?? 0), 0);
  const totalLikes = report.kocs.reduce((s, k) => s + (k.video_likes ?? 0), 0);
  const totalGmv = report.kocs.reduce((s, k) => s + (k.video_gmv ?? 0), 0);
  const ratedKocs = report.kocs.filter((k) => k.client_quality_rating != null);
  const avgRating =
    ratedKocs.length > 0
      ? ratedKocs.reduce((s, k) => s + (k.client_quality_rating ?? 0), 0) / ratedKocs.length
      : null;

  const durationDays =
    report.start_date && report.end_date
      ? Math.round(
          (new Date(report.end_date).getTime() - new Date(report.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
          {/* Branding */}
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <span className="font-semibold text-white/70 text-sm tracking-wide">KOC CityAds</span>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-blue-300/80 text-sm font-medium uppercase tracking-widest">
              Báo cáo nghiệm thu
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {report.campaign_name}
            </h1>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
            <span className="font-semibold text-white/80">{report.client_name}</span>
            {report.start_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(report.start_date).toLocaleDateString("vi-VN")}
                {report.end_date && ` — ${new Date(report.end_date).toLocaleDateString("vi-VN")}`}
                {durationDays != null && ` (${durationDays} ngày)`}
              </span>
            )}
            {report.contract_value > 0 && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }).format(report.contract_value)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats — overlaps hero */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "KOC tham gia", value: String(report.kocs.length), icon: Users, bg: "bg-blue-50", icon_color: "text-blue-500" },
            { label: "Tổng lượt xem", value: fmt(totalViews), icon: Eye, bg: "bg-emerald-50", icon_color: "text-emerald-500" },
            { label: "Tổng lượt thích", value: fmt(totalLikes), icon: ThumbsUp, bg: "bg-rose-50", icon_color: "text-rose-500" },
            { label: "Đánh giá TB", value: avgRating != null ? `${avgRating.toFixed(1)}/5` : "—", icon: Star, bg: "bg-yellow-50", icon_color: "text-yellow-500" },
          ].map(({ label, value, icon: Icon, bg, icon_color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${icon_color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {totalGmv > 0 && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 flex items-center justify-between mb-6 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide">Tổng doanh thu (GMV)</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0,
                  }).format(totalGmv)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report notes */}
        {report.report_notes && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Nhận xét từ agency</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{report.report_notes}</p>
          </div>
        )}

        {/* Brief */}
        {report.brief && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Campaign Brief</p>
            <p className="text-sm text-blue-800 leading-relaxed">{report.brief}</p>
          </div>
        )}

        {/* KOC cards */}
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-400" />
          Chi tiết từng KOC
          <span className="text-sm font-normal text-gray-400">({report.kocs.length} KOC)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {report.kocs.map((koc) => (
            <KocCard key={koc.campaign_koc_id} koc={koc} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">K</span>
          </div>
          <span className="font-semibold text-gray-600 text-sm">KOC CityAds</span>
        </div>
        <p className="text-xs text-gray-400">
          Báo cáo được tạo ngày{" "}
          {new Date(report.report_published_at).toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </footer>
    </div>
  );
}
