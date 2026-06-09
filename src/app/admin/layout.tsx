import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarNav from "@/components/admin/sidebar-nav";
import SignOutButton from "@/components/admin/sign-out-button";
import NotificationBell from "@/components/admin/notification-bell";
import CityAdsLogo from "@/components/ui/cityads-logo";
import { getAdminNotifications } from "@/lib/actions/notifications";
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

  const notifications = await getAdminNotifications();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar — deep navy for strong contrast with light content */}
      <aside
        className="w-60 flex flex-col flex-shrink-0"
        style={{ background: "#0c1a2e", borderRight: "1px solid #162032" }}
      >
        {/* Logo */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #162032" }}
        >
          <CityAdsLogo subtitle="Admin Portal" variant="dark" />
          <NotificationBell notifications={notifications} />
        </div>

        <SidebarNav role={profile.role} />

        {/* User footer */}
        <div
          className="px-3 py-3 mt-auto"
          style={{ borderTop: "1px solid #162032" }}
        >
          <div className="px-2 mb-2">
            <p className="text-sm font-medium text-slate-200 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {profile.role.replace("_", " ")}
            </p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-50">
        <div className="p-6 max-w-screen-xl">{children}</div>
      </main>
    </div>
  );
}
