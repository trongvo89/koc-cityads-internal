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

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  campaignId: string;
  contractValue: number;
  depositPaidAt: string | null;
  depositAmount: number | null;
  depositInvoice: string | null;
  finalPaidAt: string | null;
  finalAmount: number | null;
  finalInvoice: string | null;
};

function PaymentCard({
  label,
  type,
  contractValue,
  paidAt,
  paidAmount,
  invoice,
  campaignId,
}: {
  label: string;
  type: "deposit" | "final";
  contractValue: number;
  paidAt: string | null;
  paidAmount: number | null;
  invoice: string | null;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"mark" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [invoiceInput, setInvoiceInput] = useState("");
  const [dateInput, setDateInput] = useState(todayLocal());
  const [showForm, setShowForm] = useState(false);

  function openForm() {
    setAmountInput("");
    setInvoiceInput("");
    setDateInput(todayLocal());
    setError(null);
    setShowForm(true);
  }

  function handleMark() {
    const amt = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0) {
      setError("Vui lòng nhập số tiền thực nhận");
      return;
    }
    if (!dateInput) {
      setError("Vui lòng chọn ngày nhận tiền");
      return;
    }
    setError(null);
    setPendingAction("mark");
    startTransition(async () => {
      const result = await markPaymentReceived(campaignId, type, amt, invoiceInput.trim() || null, dateInput);
      if (!result.success) setError(result.error);
      else setShowForm(false);
      setPendingAction(null);
    });
  }

  function handleClear() {
    if (!confirm(`Hủy đánh dấu ${type === "deposit" ? "đặt cọc" : "quyết toán"}?`)) return;
    setError(null);
    setPendingAction("clear");
    startTransition(async () => {
      const result = await clearPaymentDate(campaignId, type);
      if (!result.success) setError(result.error);
      setPendingAction(null);
    });
  }

  // Derive month label from paid date for display
  const paidMonth = paidAt
    ? new Date(paidAt).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : null;

  return (
    <div className={`rounded-lg border p-3 ${paidAt ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        {paidAt ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-zinc-300 flex-shrink-0" />
        )}
        <p className="text-xs font-semibold text-zinc-700">{label}</p>
      </div>

      {paidAt ? (
        <>
          <p className="text-lg font-bold text-zinc-900 mb-1">
            {paidAmount != null ? formatVND(paidAmount) : "—"}
          </p>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <Badge variant="success">Đã nhận {formatDate(paidAt)}</Badge>
              <p className="text-xs text-emerald-700 font-medium">Tháng: {paidMonth}</p>
              {invoice && (
                <p className="text-xs text-zinc-500">HĐ: {invoice}</p>
              )}
            </div>
            <button
              onClick={handleClear}
              disabled={isPending}
              className="text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50 mt-0.5"
              title="Hủy đánh dấu"
            >
              {pendingAction === "clear" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </>
      ) : showForm ? (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Ngày nhận tiền <span className="text-zinc-400">(xác định tháng hoa hồng)</span>
            </label>
            <input
              type="date"
              value={dateInput}
              max={todayLocal()}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
            />
            {dateInput && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Tính vào:{" "}
                <span className="font-medium text-zinc-700">
                  {new Date(`${dateInput}T12:00:00Z`).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Số tiền thực nhận</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={contractValue > 0 ? `VD: ${formatVND(Math.floor(contractValue / 2))}` : "Nhập số tiền..."}
              value={amountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmountInput(raw ? Number(raw).toLocaleString("vi-VN") : "");
              }}
              className="w-full text-sm border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Số hóa đơn (tuỳ chọn)</label>
            <input
              type="text"
              placeholder="VD: INV-2026-001"
              value={invoiceInput}
              onChange={(e) => setInvoiceInput(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-0.5">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleMark}
              disabled={isPending}
            >
              {pendingAction === "mark" && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Xác nhận
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setError(null); }}
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
          className="w-full"
          onClick={openForm}
          disabled={isPending}
        >
          Nhập tiền đã nhận
        </Button>
      )}
    </div>
  );
}

export default function CampaignPaymentPanel({
  campaignId,
  contractValue,
  depositPaidAt,
  depositAmount,
  depositInvoice,
  finalPaidAt,
  finalAmount,
  finalInvoice,
}: Props) {
  const totalReceived = (depositAmount ?? 0) + (finalAmount ?? 0);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Thanh toán</h2>
        {contractValue > 0 && (
          <span className="text-xs text-zinc-500">
            GTHD: <span className="font-medium text-zinc-700">{formatVND(contractValue)}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PaymentCard
          label="Đặt cọc"
          type="deposit"
          contractValue={contractValue}
          paidAt={depositPaidAt}
          paidAmount={depositAmount}
          invoice={depositInvoice}
          campaignId={campaignId}
        />
        <PaymentCard
          label="Quyết toán"
          type="final"
          contractValue={contractValue}
          paidAt={finalPaidAt}
          paidAmount={finalAmount}
          invoice={finalInvoice}
          campaignId={campaignId}
        />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        <span className="text-xs text-zinc-500">Thực nhận</span>
        <span className={`text-sm font-bold ${totalReceived > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
          {formatVND(totalReceived)}
          {contractValue > 0 && (
            <span className="text-zinc-400 font-normal"> / {formatVND(contractValue)}</span>
          )}
        </span>
      </div>
    </div>
  );
}
