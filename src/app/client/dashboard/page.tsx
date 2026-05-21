import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — KOC CityAds",
};

export default function ClientDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Campaigns của bạn</h1>
      <p className="text-zinc-500 text-sm">Phase 4 sẽ build client portal ở đây.</p>
    </div>
  );
}
