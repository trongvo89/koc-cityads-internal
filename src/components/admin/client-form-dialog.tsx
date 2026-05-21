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
import { createClientRecord, updateClientRecord } from "@/lib/actions/clients";
import type { ClientListItem } from "@/lib/actions/clients";

const schema = z.object({
  company_name: z.string().min(1, "Tên công ty không được trống"),
  contact_name: z.string().nullable().optional(),
  email: z.string().email("Email không hợp lệ").nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  status: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function ClientFormDialog({
  open,
  onClose,
  client,
}: {
  open: boolean;
  onClose: () => void;
  client?: ClientListItem;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "active" },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (client) {
      reset({
        company_name: client.company_name,
        contact_name: client.contact_name ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        status: client.status,
      });
    } else {
      reset({ status: "active" });
    }
    setServerError(null);
  }, [client, reset, open]);

  function onSubmit(data: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateClientRecord(client!.client_id, data)
        : await createClientRecord(data);

      if (result.success) {
        onClose();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Sửa: ${client?.company_name}` : "Thêm client mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Tên công ty *</Label>
            <Input placeholder="Công ty TNHH ABC" {...register("company_name")} />
            {errors.company_name && (
              <p className="text-xs text-red-500">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Người liên hệ</Label>
            <Input placeholder="Nguyễn Thị B" {...register("contact_name")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="contact@company.vn" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input placeholder="09xxxxxxxx" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={selectedStatus}
              onValueChange={(v) => setValue("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
