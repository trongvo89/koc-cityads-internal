import { notFound } from "next/navigation";
import { getCampaignForRegistration } from "@/lib/actions/applications";
import KocRegistrationForm from "./registration-form";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getCampaignForRegistration(token);

  if (!result.success) notFound();

  const campaign = result.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-900">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-14">
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
            Đăng ký tham gia campaign
            {campaign.application_count > 0 && (
              <> · {campaign.application_count} KOC đã đăng ký</>
            )}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">
        {/* Campaign info */}
        {(campaign.registration_brief || campaign.registration_instructions) && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-5 space-y-4">
            {campaign.registration_brief && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-1.5">
                  Thông tin campaign
                </h2>
                <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                  {campaign.registration_brief}
                </p>
              </div>
            )}
            {campaign.registration_instructions && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-1.5">
                  Hướng dẫn tham gia
                </h2>
                <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                  {campaign.registration_instructions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Registration form or closed message */}
        {campaign.registration_open ? (
          <KocRegistrationForm registrationToken={token} />
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <p className="text-zinc-500 text-sm">
              Đăng ký cho campaign này đã đóng.
            </p>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-200">
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
