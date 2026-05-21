"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Package, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmSample } from "@/lib/actions/koc";

export default function SampleConfirm({ token }: { token: string }) {
  const [done, setDone] = useState<"received" | "not_received" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(status: "received" | "not_received") {
    setError(null);
    startTransition(async () => {
      const result = await confirmSample(token, status);
      if (result.success) {
        setDone(status);
      } else {
        setError(result.error);
      }
    });
  }

  if (done === "received") {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Đã xác nhận!</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Cảm ơn bạn đã xác nhận. Team CityAds sẽ gửi brief video cho bạn sớm.
        </p>
      </div>
    );
  }

  if (done === "not_received") {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-yellow-600" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Đã ghi nhận!</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Chúng tôi đã ghi nhận bạn chưa nhận được hàng. Team CityAds sẽ kiểm tra và liên hệ bạn sớm.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-5">
        <Package className="w-7 h-7 text-blue-600" />
      </div>

      <h2 className="text-base font-semibold text-zinc-900 mb-1">
        Xác nhận nhận hàng mẫu
      </h2>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
        Hàng mẫu đã được gửi cho bạn. Bạn đã nhận được kiện hàng chưa?
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="space-y-3">
        <Button
          className="w-full h-11 text-base"
          onClick={() => handleConfirm("received")}
          disabled={isPending}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Tôi đã nhận được hàng
        </Button>
        <Button
          variant="outline"
          className="w-full h-11 text-base text-yellow-700 border-yellow-300 hover:bg-yellow-50"
          onClick={() => handleConfirm("not_received")}
          disabled={isPending}
        >
          Chưa nhận được
        </Button>
      </div>
    </div>
  );
}
