import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { getCampaignForRegistration } from "@/lib/actions/applications";
import KocRegistrationForm from "./registration-form";

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
        {(campaign.registration_brief || campaign.registration_instructions) && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-5 space-y-4">
            {campaign.registration_brief && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-2">
                  Thông tin campaign
                </h2>
                <SafeHtml html={campaign.registration_brief} />
              </div>
            )}
            {campaign.registration_instructions && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-2">
                  Hướng dẫn tham gia
                </h2>
                <SafeHtml html={campaign.registration_instructions} />
              </div>
            )}
          </div>
        )}

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
