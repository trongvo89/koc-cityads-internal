import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getKocProfile } from "@/lib/actions/kocs";
import KocProfileClient from "@/components/admin/koc-profile";

export const metadata: Metadata = {
  title: "KOC Profile — KOC CityAds",
};

export default async function KocProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getKocProfile(id);

  if (!result.success) notFound();

  return <KocProfileClient koc={result.data} />;
}
