"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markPaymentReceived, clearPaymentDate } from "@/lib/actions/campaigns";

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = {
  campaignId: string;
  contractValue: number;
  depositPaidAt: string | null;
  finalPaidAt: string | null;
};

export default function CampaignPaymentPanel({
  campaignId,
  contractValue,
  depositPaidAt,
  finalPaidAt,
}: Props) {
  const half = Math.floor(contractValue / 2);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleMark(type: "deposit" | "final") {
    setError(null);
    setPendingAction(`mark-${type}`);
    startTransition(async () => {
      const result = await markPaymentReceived(campaignId, type);
      if (!result.success) setError(result.error);
      setPendingAction(null);
    });
  }

  function handleClear(type: "deposit" | "final") {
    if (!confirm(`Hủy đánh dấu ${type === "deposit" ? "đặt cọc" : "quyết toán"}?`)) return;
    setError(null);
    setPendingAction(`clear-${type}`);
    startTransition(async () => {
      const result = await clearPaymentDate(campaignId, type);
      if (!result.success) setError(result.error);
      setPendingAction(null);
    });
  }

  const totalReceived = (depositPaidAt ? half : 0) + (finalPaidAt ? half : 0);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Thanh toán</h2>
        <span className="text-xs text-zinc-500">
          GTHD: <span className="font-medium text-zinc-700">{formatVND(contractValue)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Deposit */}
        <div className={`rounded-lg border p-3 ${depositPaidAt ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {depositPaidAt ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Circle className="h-4 w-4 text-zinc-300" />
            )}
            <p className="text-xs font-semibold text-zinc-700">Đặt cọc 50%</p>
          </div>
          <p className="text-lg font-bold text-zinc-900 mb-2">{formatVND(half)}</p>
          {depositPaidAt ? (
            <div className="flex items-center justify-between">
              <Badge variant="success">Đã nhận {formatDate(depositPaidAt)}</Badge>
              <button
                onClick={() => handleClear("deposit")}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {pendingAction === "clear-deposit" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleMark("deposit")}
              disabled={isPending}
            >
              {pendingAction === "mark-deposit" && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Đánh dấu đã nhận
            </Button>
          )}
        </div>

        {/* Final */}
        <div className={`rounded-lg border p-3 ${finalPaidAt ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {finalPaidAt ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Circle className="h-4 w-4 text-zinc-300" />
            )}
            <p className="text-xs font-semibold text-zinc-700">Quyết toán 50%</p>
          </div>
          <p className="text-lg font-bold text-zinc-900 mb-2">{formatVND(half)}</p>
          {finalPaidAt ? (
            <div className="flex items-center justify-between">
              <Badge variant="success">Đã nhận {formatDate(finalPaidAt)}</Badge>
              <button
                onClick={() => handleClear("final")}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {pendingAction === "clear-final" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleMark("final")}
              disabled={isPending}
            >
              {pendingAction === "mark-final" && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Đánh dấu đã nhận
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        <span className="text-xs text-zinc-500">Thực nhận</span>
        <span className={`text-sm font-bold ${totalReceived > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
          {formatVND(totalReceived)} / {formatVND(contractValue)}
        </span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
