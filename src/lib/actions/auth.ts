"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CLIENT_ROLES = ["client"];
const ADMIN_ROLES = ["super_admin", "admin", "operator"];

export async function loginAction(_prev: { error: string } | null, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email và mật khẩu không được trống." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile && CLIENT_ROLES.includes(profile.role)) {
    redirect("/client/dashboard");
  }
  redirect("/admin/dashboard");
}
