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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCampaign } from "@/lib/actions/campaigns";
import type { CampaignListItem } from "@/lib/actions/campaigns";
import type { StaffMember } from "@/lib/actions/kpi";

const schema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  contract_value: z.number().int().min(0, "Giá trị hợp đồng không được âm"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
  operation_mode: z.enum(["tiktok_seller", "external"]),
  ngay_chot_hd: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  campaign: (CampaignListItem & { ngay_chot_hd?: string | null; assigned_to?: string | null }) | null;
  staff: StaffMember[];
  onClose: () => void;
}

export default function CampaignFormDialog({ open, campaign, staff, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "draft", operation_mode: "tiktok_seller", package_size: 10 },
  });

  const selectedStatus = watch("status");
  const selectedAssignedTo = watch("assigned_to");
  const selectedMode = watch("operation_mode");

  useEffect(() => {
    if (campaign) {
      reset({
        campaign_name: campaign.campaign_name,
        brief: campaign.brief ?? undefined,
        package_size: campaign.package_size,
        contract_value: campaign.contract_value,
        start_date: campaign.start_date ?? undefined,
        end_date: campaign.end_date ?? undefined,
        status: campaign.status,
        operation_mode: campaign.operation_mode ?? "tiktok_seller",
        ngay_chot_hd: campaign.ngay_chot_hd ?? undefined,
        assigned_to: campaign.assigned_to ?? undefined,
      });
    }
    setServerError(null);
  }, [campaign, reset]);

  function onSubmit(data: FormValues) {
    if (!campaign) return;
    setServerError(null);
    startTransition(async () => {
      const result = await updateCampaign(campaign.campaign_id, {
        ...data,
        package_size: Number(data.package_size),
      });
      if (result.success) {
        onClose();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
              {campaign?.client_name ?? "—"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_campaign_name">Tên campaign *</Label>
            <Input id="edit_campaign_name" {...register("campaign_name")} />
            {errors.campaign_name && (
              <p className="text-xs text-red-500">{errors.campaign_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_package_size">Package size (KOCs) *</Label>
              <Input
                id="edit_package_size"
                type="number"
                min={1}
                {...register("package_size", { valueAsNumber: true })}
              />
              {errors.package_size && (
                <p className="text-xs text-red-500">{errors.package_size.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_contract_value">Giá trị HĐ (VNĐ)</Label>
              <Input
                id="edit_contract_value"
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

          <div className="space-y-1.5">
            <Label>Hình thức vận hành</Label>
            <Select
              value={selectedMode}
              onValueChange={(v) =>
                setValue("operation_mode", v as FormValues["operation_mode"], { shouldValidate: true })
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_start_date">Ngày bắt đầu</Label>
              <Input id="edit_start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_end_date">Ngày kết thúc</Label>
              <Input id="edit_end_date" type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_ngay_chot_hd">Ngày chốt HĐ</Label>
              <Input id="edit_ngay_chot_hd" type="date" {...register("ngay_chot_hd")} />
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_brief">Brief / Mô tả</Label>
            <Textarea
              id="edit_brief"
              placeholder="Mô tả ngắn về campaign, yêu cầu content..."
              rows={3}
              {...register("brief")}
            />
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
