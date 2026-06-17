import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { getCampaignForRegistration } from "@/lib/actions/applications";
import KocRegistrationForm from "./registration-form";
import CityAdsLogo from "@/components/ui/cityads-logo";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3", "h4",
  "ul", "ol", "li",
  "a", "img",
  "hr", "blockquote",
];

const ALLOWED_ATTR: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "class"],
  "*": ["class", "style"],
};

function SafeHtml({ html }: { html: string }) {
  // Detect plain text (no HTML tags) → wrap in <p> so it renders nicely
  const isPlain = !/<[a-z][\s\S]*>/i.test(html);
  const clean = isPlain
    ? html
        .split("\n")
        .map((l) => (l.trim() ? `<p>${l}</p>` : ""))
        .join("")
    : sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: ALLOWED_ATTR });

  return (
    <div
      className="prose-sm text-zinc-600 [&_p]:mb-2 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_h2]:font-bold [&_h2]:text-zinc-800 [&_h3]:font-semibold [&_h3]:text-zinc-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

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
    <div className="min-h-screen bg-zinc-50">
      {/* Hero — CityAds navy-to-blue */}
      <div style={{ background: "linear-gradient(135deg, #0c1a2e 0%, #0369a1 100%)" }}>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
          <div className="mb-8">
            <CityAdsLogo subtitle="KOC Platform" variant="dark" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {campaign.campaign_name}
          </h1>
          <p className="text-sky-200/70 text-sm">
            Đăng ký tham gia campaign
            {campaign.application_count > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/15 text-white/80">
                {campaign.application_count} KOC đã đăng ký
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">
        {(campaign.registration_brief || campaign.registration_instructions) && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-5 space-y-4 shadow-sm">
            {campaign.registration_brief && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-2">Thông tin campaign</h2>
                <SafeHtml html={campaign.registration_brief} />
              </div>
            )}
            {campaign.registration_instructions && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-2">Hướng dẫn tham gia</h2>
                <SafeHtml html={campaign.registration_instructions} />
              </div>
            )}
          </div>
        )}

        {campaign.registration_open ? (
          <KocRegistrationForm registrationToken={token} thankYouMessage={campaign.registration_thank_you} />
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center shadow-sm">
            <p className="text-zinc-500 text-sm">Đăng ký cho campaign này đã đóng.</p>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-200">
        <div className="flex items-center justify-center">
          <CityAdsLogo size={20} subtitle="Powered by CityAds Vietnam" variant="light" />
        </div>
      </footer>
    </div>
  );
}
