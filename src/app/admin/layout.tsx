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
    <div className="app-frame flex h-screen overflow-hidden" style={{ background: "#08080f" }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col flex-shrink-0 border-r"
        style={{ background: "#0c0c18", borderColor: "#1e1e30" }}
      >
        {/* Logo area */}
        <div
          className="px-4 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "#1e1e30" }}
        >
          <CityAdsLogo subtitle="Admin Portal" />
          <NotificationBell notifications={notifications} />
        </div>

        <SidebarNav role={profile.role} />

        {/* User + sign-out */}
        <div
          className="px-3 py-3 border-t mt-auto"
          style={{ borderColor: "#1e1e30" }}
        >
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-xl">{children}</div>
      </main>
    </div>
  );
}
