import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsers } from "@/lib/actions/users";
import { getClients } from "@/lib/actions/clients";
import UsersPageClient from "@/components/admin/users-page-client";

export const metadata: Metadata = {
  title: "Users — KOC CityAds",
};

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  const [usersResult, clientsResult] = await Promise.all([
    getUsers(),
    getClients(),
  ]);

  const users = usersResult.success ? usersResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      <UsersPageClient users={users} clients={clients} />
    </div>
  );
}
