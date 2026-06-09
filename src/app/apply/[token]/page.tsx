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
  "*": ["class"],
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
      className="prose-sm text-zinc-600 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_h2]:font-bold [&_h2]:text-zinc-800 [&_h3]:font-semibold [&_h3]:text-zinc-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
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
    <div className="min-h-screen" style={{ background: "#08080f" }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0520 0%, #08080f 50%, #1a0510 100%)" }}
      >
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #7928ca, transparent)" }} />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #ff0050, transparent)" }} />

        <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-16">
          <div className="mb-10">
            <CityAdsLogo subtitle="KOC Platform" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {campaign.campaign_name}
          </h1>
          <p className="text-white/40 text-sm">
            Đăng ký tham gia campaign
            {campaign.application_count > 0 && (
              <>
                &nbsp;·&nbsp;
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: "linear-gradient(135deg,rgba(255,0,80,0.12),rgba(121,40,202,0.12))",
                    border: "1px solid rgba(255,0,80,0.2)",
                    color: "#c084fc",
                  }}
                >
                  {campaign.application_count} KOC đã đăng ký
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">
        {(campaign.registration_brief || campaign.registration_instructions) && (
          <div
            className="rounded-2xl p-5 mb-5 space-y-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
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
          <KocRegistrationForm registrationToken={token} />
        ) : (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-zinc-500 text-sm">Đăng ký cho campaign này đã đóng.</p>
          </div>
        )}
      </div>

      <footer className="py-8 text-center border-t" style={{ borderColor: "#1e1e30" }}>
        <div className="flex items-center justify-center gap-2">
          <CityAdsLogo subtitle="Powered by CityAds Vietnam" />
        </div>
      </footer>
    </div>
  );
}
