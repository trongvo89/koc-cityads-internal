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

  const approved  = applications.filter((a) => a.status === "approved").length;
  const rejected  = applications.filter((a) => a.status === "rejected").length;
  const pending   = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen" style={{ background: "#08080f" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #0f0520 0%, #08080f 50%, #1a0510 100%)",
      }}>
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #7928ca, transparent)" }} />
        <div className="absolute -top-16 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #ff0050, transparent)" }} />

        <div className="relative max-w-5xl mx-auto px-4 pt-6 pb-16">
          {/* Logo */}
          <div className="mb-10">
            <CityAdsLogo subtitle="Review Portal" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {campaign.campaign_name}
          </h1>
          <p className="text-white/40 text-sm mb-6">
            Duyệt KOC đăng ký tham gia campaign
          </p>

          {/* Stats chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full text-white/70 border border-white/10"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {applications.length} đơn đăng ký
            </span>
            <span className="px-3 py-1.5 rounded-full text-green-400 border border-green-500/20"
              style={{ background: "rgba(34,197,94,0.07)" }}>
              {approved} đã duyệt
            </span>
            <span className="px-3 py-1.5 rounded-full text-red-400 border border-red-500/20"
              style={{ background: "rgba(239,68,68,0.07)" }}>
              {rejected} từ chối
            </span>
            {pending > 0 && (
              <span className="px-3 py-1.5 rounded-full text-amber-400 border border-amber-500/20"
                style={{ background: "rgba(245,158,11,0.07)" }}>
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

      <footer className="py-8 text-center border-t mt-8" style={{ borderColor: "#1e1e30" }}>
        <CityAdsLogo subtitle="Powered by CityAds Vietnam" />
      </footer>
    </div>
  );
}
