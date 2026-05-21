import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarNav from "@/components/admin/sidebar-nav";
import SignOutButton from "@/components/admin/sign-out-button";
import type { UserRole } from "@/lib/types/enums";

const ALLOWED_ROLES: UserRole[] = ["super_admin", "admin", "operator"];

export default async function AdminLayout({
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect("/client/dashboard");
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-zinc-200">
          <h1 className="font-bold text-zinc-900">KOC CityAds</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Admin Portal</p>
        </div>

        <SidebarNav role={profile.role} />

        <div className="px-3 py-3 border-t border-zinc-200 mt-auto">
          <div className="px-2 mb-2">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-zinc-500 capitalize">
              {profile.role.replace("_", " ")}
            </p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-xl">{children}</div>
      </main>
    </div>
  );
}
