import { notFound } from "next/navigation";
import { getScriptDetail, getHosts, getProducts } from "@/lib/actions/livestream";
import { getElevenLabsVoices } from "@/lib/actions/audio";
import { getHeyGenAvatars } from "@/lib/actions/video";
import { getReferences } from "@/lib/actions/references";
import ScriptDetailClient from "@/components/admin/livestream/script-detail-client";

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [scriptResult, hostsResult, productsResult, voicesResult, avatarsResult, referencesResult] = await Promise.all([
    getScriptDetail(id),
    getHosts(),
    getProducts(),
    getElevenLabsVoices(),
    getHeyGenAvatars(),
    getReferences(),
  ]);

  if (!scriptResult.success) notFound();

  const hosts = hostsResult.success
    ? hostsResult.data.filter((h) => h.status === "active")
    : [];
  const products = productsResult.success ? productsResult.data : [];
  const voices = voicesResult.success ? voicesResult.data : [];
  const avatars = avatarsResult.success ? avatarsResult.data : [];
  const references = referencesResult.success ? referencesResult.data : [];

  return (
    <ScriptDetailClient
      script={scriptResult.data}
      hosts={hosts}
      products={products}
      voices={voices}
      avatars={avatars}
      references={references}
    />
  );
}
