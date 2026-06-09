import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientSignOutButton from "@/components/client/sign-out-button";
import CityAdsLogo from "@/components/ui/cityads-logo";

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

  return (
    <div className="app-frame flex h-screen overflow-hidden" style={{ background: "#08080f" }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col flex-shrink-0 border-r"
        style={{ background: "#0c0c18", borderColor: "#1e1e30" }}
      >
        {/* Logo area */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "#1e1e30" }}>
          <CityAdsLogo subtitle={companyName || "Client Portal"} />
        </div>

        <nav className="flex-1 p-3">
          <Link
            href="/client/campaigns"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-all duration-150"
          >
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Campaigns
          </Link>
        </nav>

        <div
          className="px-3 py-3 border-t mt-auto"
          style={{ borderColor: "#1e1e30" }}
        >
          <div className="px-2 mb-2">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-zinc-500">Client</p>
          </div>
          <ClientSignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-lg">{children}</div>
      </main>
    </div>
  );
}
