import { notFound } from "next/navigation";
import { getReferenceDetail } from "@/lib/actions/references";
import ReferenceDetailClient from "@/components/admin/livestream/reference-detail-client";

export default async function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getReferenceDetail(id);
  if (!result.success) notFound();

  return <ReferenceDetailClient reference={result.data} />;
}
