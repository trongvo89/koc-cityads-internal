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

async function getCallerRole(): Promise<UserRole | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return (data?.role ?? null) as UserRole | null;
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
  const callerRole = await getCallerRole();
  if (callerRole !== "super_admin" && callerRole !== "admin") {
    return { success: false, error: "Không có quyền truy cập" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("admin_list_users");

  if (error) return { success: false, error: error.message };

  const users: UserListItem[] = (data ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: u.full_name ?? "?",
    role: (u.role ?? "operator") as UserRole,
    client_id: u.client_id ?? null,
    client_name: u.client_name ?? null,
    created_at: u.created_at,
    banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
  }));

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
  const callerRole = await getCallerRole();
  if (!callerRole || (callerRole !== "super_admin" && callerRole !== "admin")) {
    return { success: false, error: "Không có quyền thực hiện" };
  }

  const parsed = CreateUserSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const { email, password, full_name, role, client_id } = parsed.data;

  // Admin cannot create super_admin accounts
  if (callerRole === "admin" && role === "super_admin") {
    return { success: false, error: "Admin không thể tạo tài khoản Super Admin" };
  }

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
  const callerRole = await getCallerRole();
  if (!callerRole || (callerRole !== "super_admin" && callerRole !== "admin")) {
    return { success: false, error: "Không có quyền thực hiện" };
  }

  if (callerRole === "admin") {
    if (newRole === "super_admin") {
      return { success: false, error: "Admin không thể cấp quyền Super Admin" };
    }
    const supabase = await createServerClient();
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (targetProfile?.role === "super_admin") {
      return { success: false, error: "Admin không thể chỉnh sửa tài khoản Super Admin" };
    }
  }

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
  const callerRole = await getCallerRole();
  if (!callerRole || (callerRole !== "super_admin" && callerRole !== "admin")) {
    return { success: false, error: "Không có quyền thực hiện" };
  }

  if (callerRole === "admin") {
    const supabase = await createServerClient();
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (targetProfile?.role === "super_admin") {
      return { success: false, error: "Admin không thể khoá tài khoản Super Admin" };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: ban ? "87600h" : "none",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}
