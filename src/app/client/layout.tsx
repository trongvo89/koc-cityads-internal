import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientSignOutButton from "@/components/client/sign-out-button";

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
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-zinc-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-zinc-200">
          <h1 className="font-bold text-zinc-900">KOC CityAds</h1>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">{companyName}</p>
        </div>

        <nav className="flex-1 p-3">
          <Link
            href="/client/campaigns"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
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
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Campaigns
          </Link>
        </nav>

        <div className="px-3 py-3 border-t border-zinc-200 mt-auto">
          <div className="px-2 mb-2">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-zinc-400">Client</p>
          </div>
          <ClientSignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-lg">{children}</div>
      </main>
    </div>
  );
}
