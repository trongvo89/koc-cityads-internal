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

const schema = z.object({
  campaign_name: z.string().min(1, "Tên campaign không được trống"),
  brief: z.string().optional().nullable(),
  package_size: z.number().int().min(1, "Package size tối thiểu 1"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "completed", "paused", "cancelled"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  campaign: CampaignListItem | null;
  onClose: () => void;
}

export default function CampaignFormDialog({ open, campaign, onClose }: Props) {
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
    defaultValues: { status: "draft", package_size: 10 },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (campaign) {
      reset({
        campaign_name: campaign.campaign_name,
        brief: campaign.brief ?? undefined,
        package_size: campaign.package_size,
        start_date: campaign.start_date ?? undefined,
        end_date: campaign.end_date ?? undefined,
        status: campaign.status,
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
              <Label htmlFor="edit_start_date">Ngày bắt đầu</Label>
              <Input id="edit_start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_end_date">Ngày kết thúc</Label>
              <Input id="edit_end_date" type="date" {...register("end_date")} />
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
