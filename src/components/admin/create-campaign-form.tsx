"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "@/lib/actions/campaigns";
import type { ClientListItem } from "@/lib/actions/clients";

const schema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  client_id: z.string().uuid("Vui lòng chọn client"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
});

type FormValues = z.infer<typeof schema>;

export default function CreateCampaignForm({
  clients,
}: {
  clients: ClientListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "draft", package_size: 10 },
  });

  const selectedClientId = watch("client_id");
  const selectedStatus = watch("status");

  function onSubmit(data: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createCampaign({
        ...data,
        package_size: Number(data.package_size),
      });
      if (result.success) {
        router.push(`/admin/campaigns/${result.data.campaign_id}`);
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="campaign_name">Tên campaign *</Label>
          <Input
            id="campaign_name"
            placeholder="Ví dụ: Mùa hè 2026 — Dưỡng da Innisfree"
            {...register("campaign_name")}
          />
          {errors.campaign_name && (
            <p className="text-xs text-red-500">{errors.campaign_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Client *</Label>
          <Select
            value={selectedClientId}
            onValueChange={(v) => setValue("client_id", v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.client_id} value={c.client_id}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.client_id && (
            <p className="text-xs text-red-500">{errors.client_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="package_size">Package size (số KOCs) *</Label>
            <Input
              id="package_size"
              type="number"
              min={1}
              {...register("package_size", { valueAsNumber: true })}
            />
            {errors.package_size && (
              <p className="text-xs text-red-500">{errors.package_size.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={selectedStatus}
              onValueChange={(v) =>
                setValue("status", v as FormValues["status"], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Nháp</SelectItem>
                <SelectItem value="active">Đang chạy</SelectItem>
                <SelectItem value="paused">Tạm dừng</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Ngày bắt đầu</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Ngày kết thúc</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brief">Brief / Mô tả</Label>
          <Textarea
            id="brief"
            placeholder="Mô tả ngắn về campaign, yêu cầu content..."
            rows={4}
            {...register("brief")}
          />
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang tạo..." : "Tạo campaign"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/campaigns")}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
