"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBonusSplit } from "@/lib/actions/kpi";

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

type Props = {
  campaignId: string;
  tierMonth: string | null;
  tierPercent: number | null;
  depositAmount: number | null;
  finalAmount: number | null;
  bonusSalePct: number;
  bonusOpsPct: number;
};

export default function CampaignBonusPanel({
  campaignId,
  tierMonth,
  tierPercent,
  depositAmount,
  finalAmount,
  bonusSalePct,
  bonusOpsPct,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [salePct, setSalePct] = useState(bonusSalePct);
  const [editing, setEditing] = useState(false);

  const bonusDeposit =
    tierPercent != null && depositAmount != null
      ? Math.round((tierPercent / 100) * depositAmount)
      : null;
  const bonusFinal =
    tierPercent != null && finalAmount != null
      ? Math.round((tierPercent / 100) * finalAmount)
      : null;
  const totalBonus =
    bonusDeposit != null || bonusFinal != null
      ? (bonusDeposit ?? 0) + (bonusFinal ?? 0)
      : null;

  function handleSave() {
    const opsPct = 100 - salePct;
    if (salePct < 0 || salePct > 100) {
      setError("Tỷ lệ không hợp lệ");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateBonusSplit(campaignId, salePct, opsPct);
      if (!result.success) setError(result.error);
      else setEditing(false);
    });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-700">Bonus</h2>

      {tierPercent == null ? (
        <p className="text-sm text-amber-600">Tier chưa khóa</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Tháng chốt</p>
              <p className="font-medium text-zinc-900">{tierMonth ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tier</p>
              <p className="font-medium text-zinc-900">{tierPercent}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-zinc-100 pt-3">
            <div>
              <p className="text-xs text-zinc-500">Bonus cọc</p>
              <p className="font-medium text-amber-700">
                {bonusDeposit != null ? formatVND(bonusDeposit) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Bonus quyết toán</p>
              <p className="font-medium text-amber-700">
                {bonusFinal != null ? formatVND(bonusFinal) : "—"}
              </p>
            </div>
          </div>

          {totalBonus != null && (
            <div className="border-t border-zinc-100 pt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Tổng bonus</span>
              <span className="text-sm font-bold text-amber-700">
                {formatVND(totalBonus)}
              </span>
            </div>
          )}
        </>
      )}

      <div className="border-t border-zinc-100 pt-3">
        <p className="text-xs text-zinc-500 mb-1">Tỷ lệ chia</p>
        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 w-12">Sale</label>
              <input
                type="number"
                min={0}
                max={100}
                value={salePct}
                onChange={(e) => setSalePct(Number(e.target.value))}
                className="w-20 text-sm border border-zinc-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <span className="text-xs text-zinc-500">%</span>
              <span className="text-xs text-zinc-400 mx-1">|</span>
              <label className="text-xs text-zinc-600 w-8">VH</label>
              <span className="text-sm text-zinc-700">{100 - salePct}%</span>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Lưu
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(false); setSalePct(bonusSalePct); setError(null); }}
                disabled={isPending}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-700">
              Sale {bonusSalePct}% / VH {bonusOpsPct}%
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Sửa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
