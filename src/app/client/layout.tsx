import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientLayout({
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

  if (!profile || profile.role !== "client") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="border-b border-zinc-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-zinc-900">KOC CityAds</span>
        <span className="text-sm text-zinc-600">{profile.full_name}</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
