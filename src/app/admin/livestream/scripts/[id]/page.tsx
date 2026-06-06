import { notFound } from "next/navigation";
import { getScriptDetail, getHostsForSelect, getProductsForSelect } from "@/lib/actions/livestream";
import ScriptDetailClient from "@/components/admin/livestream/script-detail-client";

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [scriptResult, hosts, products] = await Promise.all([
    getScriptDetail(id),
    getHostsForSelect(),
    getProductsForSelect(),
  ]);

  if (!scriptResult.success) notFound();

  return (
    <ScriptDetailClient
      script={scriptResult.data}
      hosts={hosts}
      products={products}
    />
  );
}
