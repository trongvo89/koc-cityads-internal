import { getHosts } from "@/lib/actions/livestream";
import HostsPageClient from "@/components/admin/livestream/hosts-page-client";

export default async function HostsPage() {
  const result = await getHosts();
  const hosts = result.success ? result.data : [];

  return <HostsPageClient hosts={hosts} />;
}
