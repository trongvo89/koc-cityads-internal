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
import type { StaffMember } from "@/lib/actions/kpi";

const schema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  client_id: z.string().uuid("Vui lòng chọn client"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  contract_value: z.number().int().min(0, "Giá trị hợp đồng không được âm"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
  operation_mode: z.enum(["tiktok_seller", "external"]),
  ngay_chot_hd: z.string().min(1, "Ngày chốt HĐ không được trống").nullable().optional(),
  assigned_to: z.string().uuid("Vui lòng chọn nhân viên").nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateCampaignForm({
  clients,
  staff,
}: {
  clients: ClientListItem[];
  staff: StaffMember[];
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
    defaultValues: { status: "draft", operation_mode: "tiktok_seller", package_size: 10, contract_value: 0 },
  });

  const selectedClientId = watch("client_id");
  const selectedStatus = watch("status");
  const selectedAssignedTo = watch("assigned_to");
  const selectedMode = watch("operation_mode");

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

        <div className="space-y-1.5">
          <Label>Hình thức vận hành *</Label>
          <Select
            value={selectedMode}
            onValueChange={(v) =>
              setValue("operation_mode", v as "tiktok_seller" | "external", { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiktok_seller">Qua TikTok Seller</SelectItem>
              <SelectItem value="external">Ngoài TikTok (gửi hàng mẫu)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-400">
            Ngoài TikTok: theo dõi địa chỉ, gửi hàng mẫu, KOC xác nhận nhận hàng.
          </p>
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
            <Label htmlFor="contract_value">Giá trị hợp đồng (VNĐ)</Label>
            <Input
              id="contract_value"
              type="number"
              min={0}
              step={1000000}
              placeholder="0"
              {...register("contract_value", { valueAsNumber: true })}
            />
            {errors.contract_value && (
              <p className="text-xs text-red-500">{errors.contract_value.message}</p>
            )}
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ngay_chot_hd">Ngày chốt HĐ</Label>
            <Input id="ngay_chot_hd" type="date" {...register("ngay_chot_hd")} />
            {errors.ngay_chot_hd && (
              <p className="text-xs text-red-500">{errors.ngay_chot_hd.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Nhân viên phụ trách</Label>
            <Select
              value={selectedAssignedTo ?? ""}
              onValueChange={(v) =>
                setValue("assigned_to", v, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhân viên..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigned_to && (
              <p className="text-xs text-red-500">{errors.assigned_to.message}</p>
            )}
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
