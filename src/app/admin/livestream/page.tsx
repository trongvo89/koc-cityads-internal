import { getLivestreamOverview } from "@/lib/actions/livestream";
import LivestreamOverviewClient from "@/components/admin/livestream/overview-client";

export default async function LivestreamPage() {
  const result = await getLivestreamOverview();
  const overview = result.success ? result.data : null;

  return <LivestreamOverviewClient overview={overview} />;
}
