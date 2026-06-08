import { notFound } from "next/navigation";
import { getScriptDetail, getHosts, getProducts } from "@/lib/actions/livestream";
import { getElevenLabsVoices } from "@/lib/actions/audio";
import { getHeyGenAvatars } from "@/lib/actions/video";
import { getReferences } from "@/lib/actions/references";
import ScriptDetailClient from "@/components/admin/livestream/script-detail-client";

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use allSettled so one failing call doesn't crash the whole page
  const [scriptResult, hostsResult, productsResult, voicesResult, avatarsResult, referencesResult] =
    await Promise.allSettled([
      getScriptDetail(id),
      getHosts(),
      getProducts(),
      getElevenLabsVoices(),
      getHeyGenAvatars(),
      getReferences(),
    ]);

  const script =
    scriptResult.status === "fulfilled" && scriptResult.value.success
      ? scriptResult.value.data
      : null;

  if (!script) notFound();

  const hosts =
    hostsResult.status === "fulfilled" && hostsResult.value.success
      ? hostsResult.value.data.filter((h) => h.status === "active")
      : [];
  const products =
    productsResult.status === "fulfilled" && productsResult.value.success
      ? productsResult.value.data
      : [];
  const voices =
    voicesResult.status === "fulfilled" && voicesResult.value.success
      ? voicesResult.value.data
      : [];
  const avatars =
    avatarsResult.status === "fulfilled" && avatarsResult.value.success
      ? avatarsResult.value.data
      : [];
  const references =
    referencesResult.status === "fulfilled" && referencesResult.value.success
      ? referencesResult.value.data
      : [];

  return (
    <ScriptDetailClient
      script={script}
      hosts={hosts}
      products={products}
      voices={voices}
      avatars={avatars}
      references={references}
    />
  );
}
