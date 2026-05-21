"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserFormDialog from "@/components/admin/user-form-dialog";
import { toggleUserBan } from "@/lib/actions/users";
import type { UserListItem } from "@/lib/actions/users";
import type { ClientListItem } from "@/lib/actions/clients";
import type { UserRole } from "@/lib/types/enums";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  operator: "Operator",
  client: "Client",
};

const ROLE_VARIANT: Record<
  UserRole,
  "default" | "secondary" | "info" | "warning" | "success"
> = {
  super_admin: "default",
  admin: "info",
  operator: "secondary",
  client: "warning",
};

export default function UsersPageClient({
  users,
  clients,
}: {
  users: UserListItem[];
  clients: ClientListItem[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | undefined>();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openEdit(user: UserListItem) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingUser(undefined);
    setDialogOpen(true);
  }

  function handleToggleBan(user: UserListItem) {
    const action = user.banned ? "Bỏ khoá" : "Khoá";
    if (!confirm(`${action} tài khoản ${user.email}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleUserBan(user.id, !user.banned);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {users.length} tài khoản trong hệ thống
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo user
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            Chưa có user nào.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Công ty (nếu có)
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-100 last:border-0 transition-colors ${
                    u.banned ? "opacity-50" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{u.full_name}</div>
                    <div className="text-xs text-zinc-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {u.client_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <Badge variant="destructive">Bị khoá</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(u)}
                        title="Đổi role"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${
                          u.banned
                            ? "text-green-600 hover:text-green-700"
                            : "text-red-500 hover:text-red-600"
                        }`}
                        onClick={() => handleToggleBan(u)}
                        disabled={isPending}
                        title={u.banned ? "Bỏ khoá" : "Khoá tài khoản"}
                      >
                        {u.banned ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        user={editingUser}
        clients={clients}
      />
    </>
  );
}
