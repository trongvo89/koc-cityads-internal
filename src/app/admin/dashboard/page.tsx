import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — KOC CityAds Admin",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>
      <p className="text-zinc-500 text-sm">Phase 3 sẽ build dashboard metrics ở đây.</p>
    </div>
  );
}
