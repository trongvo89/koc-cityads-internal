import { notFound } from "next/navigation";
import { getApplicationsForReview } from "@/lib/actions/applications";
import ApplicationReviewClient from "./application-review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getApplicationsForReview(token);

  if (!result.success) notFound();

  const { campaign, applications } = result.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-14">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <span className="font-semibold text-white/70 text-sm tracking-wide">
              KOC CityAds
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {campaign.campaign_name}
          </h1>
          <p className="text-white/50 text-sm">
            Danh sách KOC đăng ký tham gia campaign
          </p>

          <div className="mt-4 flex items-center gap-4 text-sm text-white/40">
            <span>{applications.length} đơn đăng ký</span>
            <span>·</span>
            <span>
              {applications.filter((a) => a.status === "approved").length} đã duyệt
            </span>
            <span>·</span>
            <span>
              {applications.filter((a) => a.status === "rejected").length} từ chối
            </span>
          </div>
        </div>
      </div>

      {/* Review section */}
      <ApplicationReviewClient
        reviewToken={token}
        initialApplications={applications}
        campaign={campaign}
      />

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-200 mt-8">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">K</span>
          </div>
          <span className="font-medium text-zinc-500">KOC CityAds</span>
        </div>
        Powered by CityAds Vietnam
      </footer>
    </div>
  );
}
