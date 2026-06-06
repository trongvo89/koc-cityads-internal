import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/actions/livestream";
import SessionDetailClient from "@/components/admin/livestream/session-detail-client";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSessionDetail(id);

  if (!result.success) notFound();

  return <SessionDetailClient session={result.data} />;
}
