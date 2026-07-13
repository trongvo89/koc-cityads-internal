import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientSignOutButton from "@/components/client/sign-out-button";
import CityAdsLogo from "@/components/ui/cityads-logo";
import ClientNav from "@/components/client/client-nav";
import { getClientMetrics } from "@/lib/actions/client-campaigns";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, client_id, clients(company_name)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    redirect("/admin/dashboard");
  }

  const companyName =
    (profile.clients as { company_name: string } | null)?.company_name ?? "";

  const metrics = await getClientMetrics();
  const pendingCount = metrics.success ? metrics.data.pending_approval : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar — deep navy */}
      <aside
        className="w-56 flex flex-col flex-shrink-0"
        style={{ background: "#0c1a2e", borderRight: "1px solid #162032" }}
      >
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid #162032" }}>
          <CityAdsLogo subtitle={companyName || "Client Portal"} variant="dark" />
        </div>

        <ClientNav pendingCount={pendingCount} />

        {/* User footer */}
        <div className="px-3 py-3 mt-auto" style={{ borderTop: "1px solid #162032" }}>
          <div className="px-2 mb-2">
            <p className="text-sm font-medium text-slate-200 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-slate-500">Client</p>
          </div>
          <ClientSignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-50">
        <div className="p-6 max-w-screen-lg">{children}</div>
      </main>
    </div>
  );
}
