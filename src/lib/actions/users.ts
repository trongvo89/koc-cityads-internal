"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import type { ActionResult } from "@/lib/types/app.types";
import type { UserRole } from "@/lib/types/enums";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type UserListItem = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  client_id: string | null;
  client_name: string | null;
  created_at: string;
  banned: boolean;
};

export async function getUsers(): Promise<ActionResult<UserListItem[]>> {
  const admin = createAdminClient();
  const supabase = await createServerClient();

  const [{ data: authData, error: authErr }, { data: profiles, error: profErr }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from("profiles")
        .select("id, full_name, role, client_id, clients(company_name)"),
    ]);

  if (authErr) return { success: false, error: authErr.message };
  if (profErr) return { success: false, error: profErr.message };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users: UserListItem[] = (authData.users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      full_name: profile?.full_name ?? u.email?.split("@")[0] ?? "?",
      role: (profile?.role ?? "operator") as UserRole,
      client_id: profile?.client_id ?? null,
      client_name:
        (profile?.clients as { company_name: string } | null)?.company_name ?? null,
      created_at: u.created_at,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    };
  });

  return { success: true, data: users };
}

const CreateUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  full_name: z.string().min(1, "Tên không được trống"),
  role: z.enum(["super_admin", "admin", "operator", "client"]),
  client_id: z.string().uuid().nullable().optional(),
});

export type CreateUserData = z.infer<typeof CreateUserSchema>;

export async function createUser(
  formData: CreateUserData
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateUserSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const { email, password, full_name, role, client_id } = parsed.data;

  if (role === "client" && !client_id) {
    return { success: false, error: "Role 'client' cần chọn công ty" };
  }

  const admin = createAdminClient();

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) return { success: false, error: authErr.message };

  const { error: profileErr } = await admin.from("profiles").insert({
    id: authUser.user.id,
    full_name,
    role,
    client_id: client_id ?? null,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { success: false, error: profileErr.message };
  }

  revalidatePath("/admin/users");
  return { success: true, data: { id: authUser.user.id } };
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  clientId?: string | null
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("admin_update_user_role", {
    p_user_id: userId,
    p_new_role: newRole,
    ...(clientId != null ? { p_client_id: clientId } : {}),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function toggleUserBan(userId: string, ban: boolean): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: ban ? "87600h" : "none",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}
