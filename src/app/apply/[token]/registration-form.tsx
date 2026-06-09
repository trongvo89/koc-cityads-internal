"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitApplication } from "@/lib/actions/applications";

const schema = z.object({
  tiktok_id_name: z.string().min(1, "Vui lòng nhập TikTok ID & Tên"),
  tiktok_url: z
    .string()
    .min(1, "Vui lòng nhập link kênh TikTok")
    .url("Link không hợp lệ, vui lòng nhập đúng dạng https://..."),
  follower_count: z
    .number()
    .int()
    .min(0, "Số follower không hợp lệ"),
  gmv_30d: z
    .number()
    .min(0, "GMV không hợp lệ"),
  zalo_phone: z.string().min(6, "Vui lòng nhập SĐT Zalo"),
  video_style: z.enum(["show_face_voice", "ugc_style"] as const, {
    message: "Vui lòng chọn phong cách",
  }),
});

type FormValues = z.infer<typeof schema>;

function parseTiktokIdName(raw: string): { handle: string; displayName: string } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const handle = lines.find((l) => l.startsWith("@")) ?? lines[0] ?? "";
  const displayName = lines.find((l) => !l.startsWith("@")) ?? "";
  return { handle, displayName };
}

interface Props {
  registrationToken: string;
}

export default function KocRegistrationForm({ registrationToken }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedStyle = watch("video_style");

  function onSubmit(values: FormValues) {
    setServerError(null);
    const { handle, displayName } = parseTiktokIdName(values.tiktok_id_name);

    startTransition(async () => {
      const result = await submitApplication(registrationToken, {
        tiktok_handle: handle,
        tiktok_name: displayName || handle,
        tiktok_url: values.tiktok_url,
        follower_count: values.follower_count,
        gmv_30d: values.gmv_30d,
        zalo_phone: values.zalo_phone,
        video_style: values.video_style,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setServerError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-zinc-800 mb-1">Đăng ký thành công!</h2>
        <p className="text-sm text-zinc-500">
          Thông tin của bạn đã được ghi nhận. CityAds sẽ liên hệ qua Zalo nếu bạn được chọn.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h2 className="text-base font-semibold text-zinc-800 mb-4">
        Thông tin đăng ký
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* TikTok ID & Name */}
        <div className="space-y-1.5">
          <Label htmlFor="tiktok_id_name">
            1. ID & Tên TikTok của bạn là gì? <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-zinc-400 italic">
            Ví dụ: @thichskincare
            <br />
            Thich Skincare
          </p>
          <Textarea
            id="tiktok_id_name"
            rows={2}
            placeholder={"@thichskincare\nThich Skincare"}
            {...register("tiktok_id_name")}
            className="resize-none"
          />
          {errors.tiktok_id_name && (
            <p className="text-xs text-red-500">{errors.tiktok_id_name.message}</p>
          )}
        </div>

        {/* TikTok URL */}
        <div className="space-y-1.5">
          <Label htmlFor="tiktok_url">
            2. Link kênh TikTok của bạn là gì? <span className="text-red-500">*</span>
          </Label>
          <Input
            id="tiktok_url"
            type="url"
            placeholder="https://www.tiktok.com/@thichskincare"
            {...register("tiktok_url")}
          />
          {errors.tiktok_url && (
            <p className="text-xs text-red-500">{errors.tiktok_url.message}</p>
          )}
        </div>

        {/* Follower count */}
        <div className="space-y-1.5">
          <Label htmlFor="follower_count">
            3. Số lượng follower trên kênh của bạn là bao nhiêu?{" "}
            <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-zinc-400 italic">
            Vui lòng chỉ điền số, không điền chữ (Ví dụ: 10.000 - không ghi 10k)
          </p>
          <Input
            id="follower_count"
            type="number"
            min={0}
            placeholder="10000"
            {...register("follower_count", { valueAsNumber: true })}
          />
          {errors.follower_count && (
            <p className="text-xs text-red-500">{errors.follower_count.message}</p>
          )}
        </div>

        {/* GMV */}
        <div className="space-y-1.5">
          <Label htmlFor="gmv_30d">
            4. GMV 30 ngày gần nhất của bạn là bao nhiêu?{" "}
            <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-zinc-400 italic">
            Vui lòng chỉ điền số, không điền chữ (Ví dụ: 100.000.000 - không ghi 100M)
          </p>
          <Input
            id="gmv_30d"
            type="number"
            min={0}
            placeholder="100000000"
            {...register("gmv_30d", { valueAsNumber: true })}
          />
          {errors.gmv_30d && (
            <p className="text-xs text-red-500">{errors.gmv_30d.message}</p>
          )}
        </div>

        {/* Zalo phone */}
        <div className="space-y-1.5">
          <Label htmlFor="zalo_phone">
            5. SĐT Zalo của bạn là gì? <span className="text-red-500">*</span>
          </Label>
          <Input
            id="zalo_phone"
            type="tel"
            placeholder="0901234567"
            {...register("zalo_phone")}
          />
          {errors.zalo_phone && (
            <p className="text-xs text-red-500">{errors.zalo_phone.message}</p>
          )}
        </div>

        {/* Video style */}
        <div className="space-y-2">
          <Label>
            6. Phong cách quay dựng video của bạn là gì?{" "}
            <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            {[
              { value: "show_face_voice", label: "Show mặt & giọng" },
              { value: "ugc_style", label: "UGC & Style" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStyle === value
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedStyle === value
                      ? "border-zinc-900"
                      : "border-zinc-300"
                  }`}
                >
                  {selectedStyle === value && (
                    <div className="h-2 w-2 rounded-full bg-zinc-900" />
                  )}
                </div>
                <span className="text-sm text-zinc-700">{label}</span>
                <input
                  type="radio"
                  className="sr-only"
                  value={value}
                  {...register("video_style")}
                  onChange={() =>
                    setValue("video_style", value as "show_face_voice" | "ugc_style", {
                      shouldValidate: true,
                    })
                  }
                />
              </label>
            ))}
          </div>
          {errors.video_style && (
            <p className="text-xs text-red-500">{errors.video_style.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Đang gửi..." : "Gửi đăng ký"}
        </Button>
      </form>
    </div>
  );
}
