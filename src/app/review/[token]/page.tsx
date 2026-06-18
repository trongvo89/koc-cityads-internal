import { notFound } from "next/navigation";
import { getApplicationsForReview } from "@/lib/actions/applications";
import ApplicationReviewClient from "./application-review-client";
import CityAdsLogo from "@/components/ui/cityads-logo";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getApplicationsForReview(token);

  if (!result.success) notFound();

  const { campaign, applications } = result.data;
  const agencyApproved = applications.filter((a) => a.status === "rejected" && a.agency_status === "approved").length;
  const approved = applications.filter((a) => a.status === "approved").length + agencyApproved;
  const rejected = applications.filter((a) => a.status === "rejected" && a.agency_status !== "approved").length;
  const pending  = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero — CityAds navy-to-blue gradient */}
      <div style={{ background: "linear-gradient(135deg, #0c1a2e 0%, #0369a1 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
          <div className="mb-8">
            <CityAdsLogo subtitle="Review Portal" variant="dark" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {campaign.campaign_name}
          </h1>
          <p className="text-sky-200/70 text-sm mb-5">
            Duyệt KOC đăng ký tham gia campaign
          </p>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 border border-white/15">
              {applications.length} đơn đăng ký
            </span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
              {approved} đã duyệt
            </span>
            <span className="px-3 py-1.5 rounded-full bg-red-500/15 text-red-300 border border-red-400/20">
              {rejected} từ chối
            </span>
            {agencyApproved > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/20">
                {agencyApproved} xem xét
              </span>
            )}
            {pending > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/20">
                {pending} chờ duyệt
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <ApplicationReviewClient
        reviewToken={token}
        initialApplications={applications}
        campaign={campaign}
      />

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-200 mt-8">
        <div className="flex items-center justify-center">
          <CityAdsLogo size={20} subtitle="Powered by CityAds Vietnam" variant="light" />
        </div>
      </footer>
    </div>
  );
}
