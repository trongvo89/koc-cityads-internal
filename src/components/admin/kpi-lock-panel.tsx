"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { lockMonth, unlockMonth } from "@/lib/actions/kpi";
import type { KpiPreview } from "@/lib/actions/kpi";

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function tierLabel(tier: number) {
  if (tier >= 13) return "13%";
  if (tier >= 5) return "5%";
  return "0%";
}

export default function KpiLockPanel({ data }: { data: KpiPreview }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);

  function handleLock() {
    setError(null);
    startTransition(async () => {
      const result = await lockMonth(data.month);
      if (!result.success) setError(result.error);
    });
  }

  function handleUnlock() {
    if (!unlockReason.trim()) {
      setError("Vui lòng nhập lý do mở khóa");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await unlockMonth(data.month, unlockReason);
      if (!result.success) setError(result.error);
      else {
        setShowUnlock(false);
        setUnlockReason("");
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">
          KPI Tier — Tháng {data.month}
        </h2>
        {data.is_locked ? (
          <Badge variant="info">
            <Lock className="h-3 w-3 mr-1" />
            Đã khóa
          </Badge>
        ) : (
          <Badge variant="success">Mở</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-zinc-500">Tổng GTHĐ chốt</p>
          <p className="text-lg font-bold text-zinc-900">
            {formatVND(data.total_contract_value)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Số campaigns</p>
          <p className="text-lg font-bold text-zinc-900">
            {data.campaigns.filter((c) => c.status !== "cancelled").length}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">
            {data.is_locked ? "Tier đã khóa" : "Tier dự kiến"}
          </p>
          <p className="text-lg font-bold text-zinc-900">
            {data.is_locked
              ? tierLabel(data.locked_tier ?? 0)
              : tierLabel(data.projected_tier)}
          </p>
        </div>
      </div>

      {data.is_locked && data.locked_at && (
        <p className="text-xs text-zinc-500">
          Khóa lúc:{" "}
          {new Date(data.locked_at).toLocaleString("vi-VN")}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {data.is_locked ? (
        showUnlock ? (
          <div className="space-y-2">
            <textarea
              placeholder="Lý do mở khóa..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleUnlock} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Xác nhận mở khóa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowUnlock(false); setError(null); }}
                disabled={isPending}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUnlock(true)}
          >
            <Unlock className="h-3.5 w-3.5 mr-1" />
            Mở khóa tier
          </Button>
        )
      ) : (
        <Button size="sm" onClick={handleLock} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          <Lock className="h-3.5 w-3.5 mr-1" />
          Khóa tier tháng này
        </Button>
      )}
    </div>
  );
}
