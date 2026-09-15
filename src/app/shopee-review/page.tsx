import type { Metadata } from "next";
import {
  BadgeCheck,
  Database,
  KeyRound,
  Radio,
  Server,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import CityAdsLogo from "@/components/ui/cityads-logo";

export const metadata: Metadata = {
  title: "Shopee Review - KOC CityAds",
  description:
    "Public review page for Shopee Open Platform Live Management application.",
};

const workflow = [
  {
    title: "Seller authorization",
    text: "Sellers authorize KOC CityAds through Shopee Open Platform OAuth. Tokens are scoped per seller and stored server-side.",
    icon: KeyRound,
  },
  {
    title: "Live session setup",
    text: "The dashboard prepares livestream title, product list, cover image, and calls Shopee Live Management APIs.",
    icon: ShoppingBag,
  },
  {
    title: "RTMP stream handoff",
    text: "A separate media worker receives the Shopee push-stream URL and sends the livestream via RTMP.",
    icon: Radio,
  },
  {
    title: "Monitoring and logs",
    text: "Operators monitor session status, product focus, comments, metrics, and emergency stop actions.",
    icon: Server,
  },
];

const boundaries = [
  "This page uses demo information only and does not expose the internal admin portal.",
  "No buyer PII, seller private data, access tokens, API keys, KOC records, or campaign operations are shown here.",
  "The review scope is limited to Shopee Live Management workflow, API integration design, and security controls.",
  "The production portal remains restricted because it contains KOC management and internal business data.",
];

const controls = [
  ["Authentication", "Internal portal routes require authenticated operator access. This review page is public and read-only."],
  ["Authorization", "Each seller account will be isolated by shop/user authorization and tenant-aware access control."],
  ["Token handling", "Shopee partner keys and seller tokens must remain server-side and encrypted at rest."],
  ["Data minimization", "The livestream MVP is designed to avoid buyer PII unless Shopee explicitly approves related permissions."],
  ["AI safeguards", "AI scripts and responses should be constrained by product knowledge, policy rules, and operator override."],
  ["Stream safety", "RTMP keys are handled by an isolated media worker with health checks and emergency stop support."],
];

export default function ShopeeReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <CityAdsLogo variant="light" subtitle="Shopee Review" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              Public read-only page
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-700">
              No login required
            </span>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">
              Shopee Open Platform application review
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                KOC CityAds Live Management Review
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                KOC CityAds is building a livestream AI and marketing management
                workflow for Shopee sellers. This page demonstrates only the
                relevant Shopee Live Management integration scope for review.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-l-4 border-sky-500 bg-sky-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-sky-700">Service</p>
                <p className="mt-1 text-sm font-medium text-slate-900">Marketing, Livestream AI</p>
              </div>
              <div className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">Data mode</p>
                <p className="mt-1 text-sm font-medium text-slate-900">Demo data only</p>
              </div>
              <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-amber-700">Access</p>
                <p className="mt-1 text-sm font-medium text-slate-900">No internal portal login</p>
              </div>
            </div>
          </div>

          <aside className="border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 text-emerald-600" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Reviewer boundary</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The main portal contains KOC management, campaign operations,
                  and internal business workflows. This public page keeps
                  Shopee&apos;s review focused on the Live Management integration.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <BadgeCheck className="h-6 w-6 text-sky-600" aria-hidden="true" />
          <h2 className="text-2xl font-semibold text-slate-950">Review Scope</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {boundaries.map((item) => (
            <div key={item} className="border border-slate-200 bg-white p-5">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <Radio className="h-6 w-6 text-rose-600" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-slate-950">
              Shopee Live Management Workflow
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <Icon className="h-5 w-5 text-sky-700" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Database className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-slate-950">Security Controls</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            The production implementation is designed around API-only Shopee
            integration, tenant isolation, server-side token handling, and
            operational logs. The RTMP media layer is separated from the Vercel
            dashboard runtime.
          </p>
        </div>
        <div className="overflow-hidden border border-slate-200 bg-white">
          {controls.map(([label, value]) => (
            <div key={label} className="grid gap-2 border-b border-slate-200 p-4 last:border-b-0 sm:grid-cols-[160px_1fr]">
              <p className="text-sm font-semibold text-slate-950">{label}</p>
              <p className="text-sm leading-6 text-slate-600">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-sky-300" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">Reviewer Notes</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">
              If Shopee requires interactive testing, KOC CityAds can provide a
              separate limited review account or staging environment containing
              demo records only. The internal portal will remain restricted to
              protect unrelated KOC, campaign, and operational data.
            </p>
          </div>
          <div className="border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm font-semibold text-slate-200">Contact</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              KOC CityAds Team
              <br />
              Review URL: https://koc.cityads.vn/shopee-review
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
