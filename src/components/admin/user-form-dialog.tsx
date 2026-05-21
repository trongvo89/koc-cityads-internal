"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUserRole } from "@/lib/actions/users";
import type { UserListItem } from "@/lib/actions/users";
import type { ClientListItem } from "@/lib/actions/clients";
import type { UserRole } from "@/lib/types/enums";

const createSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  full_name: z.string().min(1, "Tên không được trống"),
  role: z.enum(["super_admin", "admin", "operator", "client"]),
  client_id: z.string().uuid().nullable().optional(),
});

const editSchema = z.object({
  role: z.enum(["super_admin", "admin", "operator", "client"]),
  client_id: z.string().uuid().nullable().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

export default function UserFormDialog({
  open,
  onClose,
  user,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  user?: UserListItem;
  clients: ClientListItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!user;

  // Create form
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "operator" },
  });

  // Edit form
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { role: "operator" },
  });

  const createRole = createForm.watch("role");
  const editRole = editForm.watch("role");
  const currentRole = isEdit ? editRole : createRole;

  useEffect(() => {
    if (isEdit && user) {
      editForm.reset({
        role: user.role,
        client_id: user.client_id ?? undefined,
      });
    } else {
      createForm.reset({ role: "operator" });
    }
    setServerError(null);
  }, [user, open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  function onCreateSubmit(data: CreateFormValues) {
    if (data.role === "client" && !data.client_id) {
      createForm.setError("client_id", { message: "Vui lòng chọn công ty" });
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const result = await createUser({
        ...data,
        client_id: data.client_id ?? null,
      });
      if (result.success) onClose();
      else setServerError(result.error);
    });
  }

  function onEditSubmit(data: EditFormValues) {
    if (data.role === "client" && !data.client_id) {
      editForm.setError("client_id", { message: "Vui lòng chọn công ty" });
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const result = await updateUserRole(
        user!.id,
        data.role as UserRole,
        data.client_id ?? null
      );
      if (result.success) onClose();
      else setServerError(result.error);
    });
  }

  const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    operator: "Operator",
    client: "Client (Brand)",
  };

  function RoleClientFields({
    role,
    onRoleChange,
    clientIdValue,
    onClientChange,
    clientIdError,
  }: {
    role: UserRole;
    onRoleChange: (v: UserRole) => void;
    clientIdValue: string | undefined;
    onClientChange: (v: string) => void;
    clientIdError?: string;
  }) {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Role *</Label>
          <Select value={role} onValueChange={(v) => onRoleChange(v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {role === "client" && (
          <div className="space-y-1.5">
            <Label>Công ty *</Label>
            <Select value={clientIdValue ?? ""} onValueChange={onClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn công ty..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.client_id} value={c.client_id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientIdError && (
              <p className="text-xs text-red-500">{clientIdError}</p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Đổi role: ${user?.full_name}` : "Tạo user mới"}
          </DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            className="space-y-4 py-1"
          >
            <div className="rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-600">
              {user?.email}
            </div>
            <RoleClientFields
              role={editRole as UserRole}
              onRoleChange={(v) => editForm.setValue("role", v)}
              clientIdValue={editForm.watch("client_id") ?? undefined}
              onClientChange={(v) => editForm.setValue("client_id", v)}
              clientIdError={editForm.formState.errors.client_id?.message}
            />
            {serverError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {serverError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu role"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={createForm.handleSubmit(onCreateSubmit)}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>Tên đầy đủ *</Label>
              <Input placeholder="Nguyễn Văn A" {...createForm.register("full_name")} />
              {createForm.formState.errors.full_name && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="user@company.vn" {...createForm.register("email")} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu *</Label>
              <Input type="password" placeholder="Tối thiểu 8 ký tự" {...createForm.register("password")} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <RoleClientFields
              role={createRole as UserRole}
              onRoleChange={(v) => createForm.setValue("role", v)}
              clientIdValue={createForm.watch("client_id") ?? undefined}
              onClientChange={(v) => createForm.setValue("client_id", v)}
              clientIdError={createForm.formState.errors.client_id?.message}
            />
            {serverError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {serverError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang tạo..." : "Tạo user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
