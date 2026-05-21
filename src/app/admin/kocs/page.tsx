import type { Metadata } from "next";
import { getKocs } from "@/lib/actions/kocs";
import KocsPageClient from "@/components/admin/kocs-page-client";

export const metadata: Metadata = {
  title: "KOCs — KOC CityAds",
};

export default async function KocsPage() {
  const result = await getKocs();
  const kocs = result.success ? result.data : [];

  return (
    <div>
      <KocsPageClient kocs={kocs} />
    </div>
  );
}
