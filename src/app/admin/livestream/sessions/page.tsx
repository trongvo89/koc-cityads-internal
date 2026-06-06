import { getSessions, getHostsForSelect, getScriptsForSelect } from "@/lib/actions/livestream";
import { createClient } from "@/lib/supabase/server";
import SessionsPageClient from "@/components/admin/livestream/sessions-page-client";

export default async function SessionsPage() {
  const supabase = await createClient();

  const [sessionsResult, hosts, scripts, { data: campaigns }] = await Promise.all([
    getSessions(),
    getHostsForSelect(),
    getScriptsForSelect(),
    supabase.from("campaigns").select("campaign_id, campaign_name").order("campaign_name"),
  ]);

  const sessions = sessionsResult.success ? sessionsResult.data : [];

  return (
    <SessionsPageClient
      sessions={sessions}
      hosts={hosts}
      scripts={scripts}
      campaigns={(campaigns ?? []) as { campaign_id: string; campaign_name: string }[]}
    />
  );
}
