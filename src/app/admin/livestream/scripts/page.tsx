import { getScripts } from "@/lib/actions/livestream";
import ScriptsPageClient from "@/components/admin/livestream/scripts-page-client";

export default async function ScriptsPage() {
  const result = await getScripts();
  const scripts = result.success ? result.data : [];

  return <ScriptsPageClient scripts={scripts} />;
}
