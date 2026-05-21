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
import { createKoc, updateKoc } from "@/lib/actions/kocs";
import type { KocListItem } from "@/lib/actions/kocs";

const schema = z.object({
  name: z.string().min(1, "Tên không được trống"),
  phone: z.string().nullable().optional(),
  zalo: z.string().nullable().optional(),
  email: z.string().email("Email không hợp lệ").nullable().optional().or(z.literal("")),
  tiktok_url: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  follower: z.number().int().nullable().optional(),
  default_address: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]),
  category_raw: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function KocFormDialog({
  open,
  onClose,
  koc,
}: {
  open: boolean;
  onClose: () => void;
  koc?: KocListItem;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!koc;

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
    if (koc) {
      reset({
        name: koc.name,
        phone: koc.phone ?? "",
        zalo: koc.zalo ?? "",
        email: "",
        tiktok_url: koc.tiktok_url ?? "",
        instagram_url: koc.instagram_url ?? "",
        location: koc.location ?? "",
        follower: koc.follower ?? undefined,
        status: koc.status,
        category_raw: koc.category?.join(", ") ?? "",
      });
    } else {
      reset({ status: "active" });
    }
    setServerError(null);
  }, [koc, reset, open]);

  function onSubmit(data: FormValues) {
    const category = data.category_raw
      ? data.category_raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const payload = {
      name: data.name,
      phone: data.phone || null,
      zalo: data.zalo || null,
      email: data.email || null,
      tiktok_url: data.tiktok_url || null,
      instagram_url: data.instagram_url || null,
      facebook_url: data.facebook_url || null,
      location: data.location || null,
      follower: data.follower ?? null,
      default_address: data.default_address || null,
      note: data.note || null,
      status: data.status,
      category,
    };

    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateKoc(koc!.koc_id, payload)
        : await createKoc(payload);

      if (result.success) {
        onClose();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa: ${koc?.name}` : "Thêm KOC mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Tên KOC *</Label>
              <Input placeholder="Nguyễn Văn A" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input placeholder="09xxxxxxxx" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Zalo</Label>
              <Input placeholder="09xxxxxxxx hoặc username" {...register("zalo")} />
            </div>

            <div className="space-y-1.5">
              <Label>TikTok URL</Label>
              <Input placeholder="https://tiktok.com/@..." {...register("tiktok_url")} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input placeholder="https://instagram.com/..." {...register("instagram_url")} />
            </div>

            <div className="space-y-1.5">
              <Label>Followers (ước tính)</Label>
              <Input
                type="number"
                min={0}
                placeholder="50000"
                {...register("follower", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Khu vực</Label>
              <Input placeholder="Hà Nội, TP.HCM..." {...register("location")} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Danh mục (phân cách bằng dấu phẩy)</Label>
              <Input
                placeholder="Beauty, Lifestyle, Food"
                {...register("category_raw")}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={selectedStatus}
                onValueChange={(v) =>
                  setValue("status", v as FormValues["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Ghi chú nội bộ</Label>
              <Textarea rows={2} {...register("note")} />
            </div>
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
              {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm KOC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
