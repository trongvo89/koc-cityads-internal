import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, client_id")
    .eq("id", user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect("/client/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="border-b border-zinc-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-zinc-900">KOC CityAds</span>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span>{profile.full_name}</span>
          <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded-full capitalize">
            {profile.role.replace("_", " ")}
          </span>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
