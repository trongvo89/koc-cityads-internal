"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitVideo } from "@/lib/actions/koc";

export default function VideoForm({
  token,
  isRevision,
  revisionNote,
}: {
  token: string;
  isRevision: boolean;
  revisionNote: string | null;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const videoUrl = (fd.get("video_url") as string).trim();
    const note = ((fd.get("note") as string) || "").trim() || undefined;

    if (!videoUrl) {
      setError("Vui lòng nhập link video.");
      return;
    }

    startTransition(async () => {
      const result = await submitVideo(token, videoUrl, note);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Video đã được nộp!</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Cảm ơn bạn! Team CityAds sẽ xem xét video và phản hồi sớm.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-900 mb-1">
        {isRevision ? "Nộp lại video" : "Nộp video"}
      </h2>
      <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
        {isRevision
          ? "Vui lòng xem yêu cầu chỉnh sửa bên dưới và nộp lại link video mới."
          : "Nhập link video bạn đã đăng lên TikTok / Instagram / Facebook."}
      </p>

      {isRevision && revisionNote && (
        <div className="mb-5 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
          <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-1">
            Yêu cầu chỉnh sửa
          </p>
          <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">
            {revisionNote}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="video_url" className="text-sm font-medium text-zinc-700">
            Link video <span className="text-red-500">*</span>
          </Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            placeholder="https://www.tiktok.com/@..."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="note" className="text-sm font-medium text-zinc-700">
            Ghi chú (không bắt buộc)
          </Label>
          <Textarea
            id="note"
            name="note"
            placeholder="Thêm ghi chú nếu cần..."
            rows={3}
            className="mt-1.5 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          className="w-full h-11 text-base"
          disabled={isPending}
        >
          {isPending
            ? "Đang nộp..."
            : isRevision
            ? "Nộp lại video"
            : "Nộp video"}
        </Button>
      </form>
    </div>
  );
}
