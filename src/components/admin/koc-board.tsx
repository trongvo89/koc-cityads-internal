"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import {
  Plus, Trash2, ExternalLink, RefreshCw,
  Search, Send, Copy, Check, CheckCheck,
  Pencil, ArrowUp, ArrowDown, Filter, X, Truck, FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tiktokChannelUrl } from "@/lib/utils/url";
import { exportToExcel, slugifyFilename, todayStamp } from "@/lib/utils/export-xlsx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  addKocsToCampaign,
  removeKocFromCampaign,
  updateCampaignKocStatus,
  updateCampaignKocField,
  updateCampaignKocLinks,
  updateKocProfile,
  renewMagicLink,
  markAsReminded,
  adminUpdateAddress,
} from "@/lib/actions/campaigns";
import type { CampaignDetail, CampaignKocRow } from "@/lib/actions/campaigns";
import type { NotificationType, OperationStatus } from "@/lib/types/enums";

function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Simple 3-status system ──────────────────────────────────────────────────

type SimpleStatus = "in_progress" | "completed" | "cancelled";

const SIMPLE_MAP: Record<string, SimpleStatus> = {
  draft: "in_progress",
  sent_to_client: "in_progress",
  client_approved: "in_progress",
  client_rejected: "cancelled",
  waiting_address: "in_progress",
  address_submitted: "in_progress",
  waiting_sample_sent: "in_progress",
  sample_sent: "in_progress",
  sample_received: "in_progress",
  waiting_video: "in_progress",
  video_submitted: "in_progress",
  need_revision: "in_progress",
  video_approved: "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  failed: "cancelled",
  cancelled: "cancelled",
};

const STATUS_OPTIONS: { value: SimpleStatus; label: string; bg: string; text: string; dot: string }[] = [
  { value: "in_progress", label: "Đang tiến hành", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  { value: "completed", label: "Hoàn thành", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-600" },
  { value: "cancelled", label: "Huỷ", bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
];

const CLIENT_STATUS: Record<string, { label: string; variant: "warning" | "success" | "destructive" }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Từ chối", variant: "destructive" },
};

function getSimple(s: string): SimpleStatus {
  return SIMPLE_MAP[s] ?? "in_progress";
}

function statusLabel(s: SimpleStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

// ─── Row color palette ──────────────────────────────────────────────────────

const ROW_COLORS: { value: string | null; label: string; bg: string; ring: string }[] = [
  { value: null,        label: "Không màu",  bg: "bg-white border border-zinc-200",  ring: "ring-zinc-300" },
  { value: "red",       label: "Đỏ",         bg: "bg-red-200",       ring: "ring-red-400" },
  { value: "orange",    label: "Cam",         bg: "bg-orange-200",    ring: "ring-orange-400" },
  { value: "yellow",    label: "Vàng",        bg: "bg-yellow-200",    ring: "ring-yellow-400" },
  { value: "green",     label: "Xanh lá",     bg: "bg-green-200",     ring: "ring-green-400" },
  { value: "cyan",      label: "Xanh ngọc",   bg: "bg-cyan-200",      ring: "ring-cyan-400" },
  { value: "blue",      label: "Xanh dương",  bg: "bg-blue-200",      ring: "ring-blue-400" },
  { value: "purple",    label: "Tím",         bg: "bg-purple-200",    ring: "ring-purple-400" },
  { value: "pink",      label: "Hồng",        bg: "bg-pink-200",      ring: "ring-pink-400" },
];

const ROW_COLOR_BG: Record<string, string> = {
  red:    "bg-red-50",
  orange: "bg-orange-50",
  yellow: "bg-yellow-50",
  green:  "bg-green-50",
  cyan:   "bg-cyan-50",
  blue:   "bg-blue-50",
  purple: "bg-purple-50",
  pink:   "bg-pink-50",
};

function RowColorPicker({
  current,
  campaignKocId,
  campaignId,
}: {
  current: string | null;
  campaignKocId: string;
  campaignId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handlePick(color: string | null) {
    setOpen(false);
    startTransition(async () => {
      await updateCampaignKocField(campaignKocId, campaignId, "row_color", color);
    });
  }

  const currentColor = ROW_COLORS.find((c) => c.value === current) ?? ROW_COLORS[0];

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tô màu hàng"
        className={`h-4 w-4 rounded-full border border-zinc-300 transition-all hover:scale-110 ${current ? ROW_COLOR_BG[current]?.replace("50", "300") ?? "bg-white" : "bg-white"} ${isPending ? "opacity-50" : ""}`}
        style={current ? { backgroundColor: undefined } : undefined}
      >
        <span className={`block h-full w-full rounded-full ${current ? (ROW_COLORS.find((c) => c.value === current)?.bg ?? "") : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-5 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-[130px]">
          {ROW_COLORS.map((c) => (
            <button
              key={c.value ?? "none"}
              type="button"
              onClick={() => handlePick(c.value)}
              title={c.label}
              className={`h-5 w-5 rounded-full transition-all hover:scale-110 ${c.bg} ${current === c.value ? `ring-2 ${c.ring}` : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column filter popover ──────────────────────────────────────────────────

type ColumnFilterValue =
  | { type: "text"; search: string }
  | { type: "set"; selected: Set<string> };

function ColumnFilterPopover({
  values,
  current,
  onApply,
  onClear,
}: {
  values: string[];
  current: ColumnFilterValue | null;
  onApply: (f: ColumnFilterValue) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [localSet, setLocalSet] = useState<Set<string>>(new Set());
  const isSet = values.length <= 20;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (current?.type === "text") setLocalSearch(current.search);
    else setLocalSearch("");
    if (current?.type === "set") setLocalSet(new Set(current.selected));
    else setLocalSet(new Set(values));
  }, [open, current, values]);

  const isActive = current != null;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`ml-1 p-0.5 rounded transition-colors ${isActive ? "text-blue-600" : "text-zinc-300 hover:text-zinc-500"}`}
        title="Lọc cột"
      >
        <Filter className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-5 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg p-2.5 w-52 text-xs">
          {isSet ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setLocalSet(new Set(values))}
                >Chọn tất cả</button>
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setLocalSet(new Set())}
                >Bỏ chọn</button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {values.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-zinc-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={localSet.has(v)}
                      onChange={() => {
                        const next = new Set(localSet);
                        next.has(v) ? next.delete(v) : next.add(v);
                        setLocalSet(next);
                      }}
                      className="h-3 w-3 rounded border-zinc-300"
                    />
                    <span className="truncate">{v || "(trống)"}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <input
              autoFocus
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onApply({ type: "text", search: localSearch });
                  setOpen(false);
                }
              }}
            />
          )}
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              className="flex-1 px-2 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => {
                if (isSet) {
                  if (localSet.size === values.length) onClear();
                  else onApply({ type: "set", selected: localSet });
                } else {
                  if (!localSearch) onClear();
                  else onApply({ type: "text", search: localSearch });
                }
                setOpen(false);
              }}
            >Áp dụng</button>
            <button
              type="button"
              className="flex-1 px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50"
              onClick={() => { onClear(); setOpen(false); }}
            >Xoá lọc</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable header ────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | null;

function SortableHeader({
  label,
  sortDir,
  onSort,
  className,
  children,
}: {
  label: string;
  sortDir: SortDir;
  onSort: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th className={`px-2 py-2 text-left font-medium text-zinc-500 ${className ?? ""}`}>
      <div className="flex items-center">
        <button type="button" onClick={onSort} className="flex items-center gap-0.5 hover:text-zinc-800 transition-colors">
          {label}
          {sortDir === "asc" && <ArrowUp className="h-3 w-3 text-blue-500" />}
          {sortDir === "desc" && <ArrowDown className="h-3 w-3 text-blue-500" />}
          {!sortDir && <ArrowUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />}
        </button>
        {children}
      </div>
    </th>
  );
}

// ─── Inline editable cell ────────────────────────────────────────────────────

function EditableCell({
  value,
  field,
  campaignKocId,
  campaignId,
  type = "text",
  placeholder,
  className,
}: {
  value: string | number | null;
  field: string;
  campaignKocId: string;
  campaignId: string;
  type?: "text" | "number";
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [isPending, startTransition] = useTransition();
  const savedRef = useRef(String(value ?? ""));

  useEffect(() => {
    const v = String(value ?? "");
    setLocal(v);
    savedRef.current = v;
  }, [value]);

  function handleBlur() {
    if (local === savedRef.current) return;
    savedRef.current = local;
    startTransition(async () => {
      const parsed = type === "number" ? (local ? Number(local) : 0) : (local || null);
      await updateCampaignKocField(campaignKocId, campaignId, field, parsed);
    });
  }

  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      className={`w-full bg-transparent border-0 border-b border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:outline-none text-xs px-1 py-1 transition-colors ${isPending ? "opacity-50" : ""} ${className ?? ""}`}
    />
  );
}

// ─── Final links cell (multiple video links) ──────────────────────────────────

function FinalLinksCell({
  value,
  campaignKocId,
  campaignId,
}: {
  value: string[] | null;
  campaignKocId: string;
  campaignId: string;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<string[]>(value && value.length > 0 ? value : [""]);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  const saved = value ?? [];

  useEffect(() => {
    setLinks(value && value.length > 0 ? value : [""]);
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleSave() {
    const cleaned = links.map((l) => l.trim()).filter(Boolean);
    startTransition(async () => {
      await updateCampaignKocLinks(campaignKocId, campaignId, cleaned);
      setOpen(false);
    });
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left text-xs px-1 py-1 rounded hover:bg-zinc-100 transition-colors flex items-center gap-1 min-h-[26px]"
      >
        {saved.length === 0 ? (
          <span className="text-zinc-400">Link...</span>
        ) : saved.length === 1 ? (
          <span className="truncate text-blue-600">{saved[0]}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <ExternalLink className="h-3 w-3" />
            {saved.length} link
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-72 bg-white border border-zinc-200 rounded-lg shadow-lg p-3 space-y-2">
          <p className="text-xs font-medium text-zinc-600">Link video ({links.filter((l) => l.trim()).length})</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {links.map((link, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 w-4 flex-shrink-0">{idx + 1}</span>
                <Input
                  value={link}
                  onChange={(e) => {
                    const next = [...links];
                    next[idx] = e.target.value;
                    setLinks(next);
                  }}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
                {link.trim() && (
                  <a
                    href={link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-blue-600 flex-shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = links.filter((_, i) => i !== idx);
                    setLinks(next.length > 0 ? next : [""]);
                  }}
                  className="text-zinc-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLinks([...links, ""])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm link
          </button>
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
            <Button size="sm" onClick={handleSave} disabled={isPending} className="h-7 text-xs">
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLinks(value && value.length > 0 ? value : [""]);
                setOpen(false);
              }}
              disabled={isPending}
              className="h-7 text-xs"
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── External-mode cells (address + sample shipping) ─────────────────────────

function CellPopover({
  trigger,
  children,
  open,
  setOpen,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs px-1 py-1 rounded hover:bg-zinc-100 transition-colors min-h-[26px]"
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg p-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function AddressCell({
  koc,
  campaignId,
}: {
  koc: CampaignKocRow;
  campaignId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    receiver_name: koc.receiver_name ?? "",
    receiver_phone: koc.receiver_phone ?? "",
    receiver_address: koc.receiver_address ?? "",
    receiver_province: koc.receiver_province ?? "",
  });

  const hasAddress = koc.address_status === "submitted" && !!koc.receiver_address;

  function handleSave() {
    if (!form.receiver_name.trim() || !form.receiver_address.trim()) return;
    startTransition(async () => {
      await adminUpdateAddress(koc.campaign_koc_id, campaignId, {
        receiver_name: form.receiver_name.trim(),
        receiver_phone: form.receiver_phone.trim() || null,
        receiver_address: form.receiver_address.trim(),
        receiver_province: form.receiver_province.trim() || null,
      });
      setOpen(false);
    });
  }

  return (
    <CellPopover
      open={open}
      setOpen={setOpen}
      trigger={
        hasAddress ? (
          <span className="inline-flex items-center gap-1 text-green-700">
            <Check className="h-3 w-3" />
            <span className="truncate">{koc.receiver_province || "Đã có"}</span>
          </span>
        ) : (
          <span className="text-amber-600">Chờ địa chỉ</span>
        )
      }
    >
      <p className="text-xs font-medium text-zinc-600">Địa chỉ nhận hàng</p>
      <Input
        value={form.receiver_name}
        onChange={(e) => setForm({ ...form, receiver_name: e.target.value })}
        placeholder="Tên người nhận *"
        className="h-7 text-xs"
      />
      <Input
        value={form.receiver_phone}
        onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })}
        placeholder="SĐT"
        className="h-7 text-xs"
      />
      <Input
        value={form.receiver_address}
        onChange={(e) => setForm({ ...form, receiver_address: e.target.value })}
        placeholder="Địa chỉ *"
        className="h-7 text-xs"
      />
      <Input
        value={form.receiver_province}
        onChange={(e) => setForm({ ...form, receiver_province: e.target.value })}
        placeholder="Tỉnh/Thành"
        className="h-7 text-xs"
      />
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={isPending} className="h-7 text-xs">
          {isPending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="h-7 text-xs">
          Đóng
        </Button>
      </div>
    </CellPopover>
  );
}

const SAMPLE_LABEL: Record<string, { label: string; cls: string }> = {
  waiting: { label: "Chưa gửi", cls: "text-zinc-400" },
  sent: { label: "Đã gửi", cls: "text-blue-600" },
  received: { label: "Đã nhận", cls: "text-green-700" },
  not_received: { label: "Chưa nhận được", cls: "text-amber-600" },
  issue: { label: "Sự cố", cls: "text-red-600" },
};

function SampleCell({
  koc,
  campaignId,
}: {
  koc: CampaignKocRow;
  campaignId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState(koc.shipping_code ?? "");
  const [provider, setProvider] = useState(koc.shipping_provider ?? "");

  const st = SAMPLE_LABEL[koc.sample_status] ?? SAMPLE_LABEL.waiting;

  function handleMarkSent() {
    startTransition(async () => {
      await updateCampaignKocStatus(koc.campaign_koc_id, campaignId, {
        sample_status: "sent",
        sample_sent_at: new Date().toISOString(),
        shipping_code: code.trim() || null,
        shipping_provider: provider.trim() || null,
      });
      setOpen(false);
    });
  }

  function handleMarkReceived() {
    startTransition(async () => {
      await updateCampaignKocStatus(koc.campaign_koc_id, campaignId, {
        sample_status: "received",
        sample_received_at: new Date().toISOString(),
      });
      setOpen(false);
    });
  }

  return (
    <CellPopover
      open={open}
      setOpen={setOpen}
      trigger={
        <span className={`inline-flex items-center gap-1 ${st.cls}`}>
          <Truck className="h-3 w-3" />
          <span className="truncate">{st.label}</span>
        </span>
      }
    >
      <p className="text-xs font-medium text-zinc-600">Gửi hàng mẫu</p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Mã vận đơn"
        className="h-7 text-xs"
      />
      <Input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Đơn vị vận chuyển (GHN, GHTK...)"
        className="h-7 text-xs"
      />
      <div className="flex flex-col gap-1.5 pt-1">
        <Button size="sm" onClick={handleMarkSent} disabled={isPending} className="h-7 text-xs">
          <Truck className="h-3 w-3 mr-1" />
          Đã gửi hàng
        </Button>
        {koc.sample_status !== "received" && (
          <Button size="sm" variant="outline" onClick={handleMarkReceived} disabled={isPending} className="h-7 text-xs">
            <Check className="h-3 w-3 mr-1" />
            KOC đã nhận hàng (nhập hộ)
          </Button>
        )}
      </div>
      {koc.sample_sent_at && (
        <p className="text-[10px] text-zinc-400">
          Gửi lúc: {new Date(koc.sample_sent_at).toLocaleString("vi-VN")}
        </p>
      )}
    </CellPopover>
  );
}

// ─── Edit KOC Dialog ─────────────────────────────────────────────────────────

function EditKocDialog({
  koc,
  campaignId,
  onClose,
}: {
  koc: CampaignKocRow | null;
  campaignId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [follower, setFollower] = useState("");
  const [phone, setPhone] = useState("");
  const [zalo, setZalo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!koc) return;
    setName(koc.koc_name ?? "");
    setHandle(koc.koc_tiktok_handle ?? "");
    setUrl(koc.koc_tiktok_url ?? "");
    setFollower(koc.koc_follower != null ? String(koc.koc_follower) : "");
    setPhone(koc.koc_phone ?? "");
    setZalo(koc.koc_zalo ?? "");
    setErr(null);
  }, [koc]);

  function handleSave() {
    if (!koc) return;
    if (!name.trim()) { setErr("Tên không được để trống"); return; }
    setErr(null);
    startTransition(async () => {
      const result = await updateKocProfile(koc.koc_id, campaignId, {
        name: name.trim(),
        tiktok_handle: handle.trim() || null,
        tiktok_url: url.trim() || null,
        follower: follower ? Number(follower) : null,
        phone: phone.trim() || null,
        zalo: zalo.trim() || null,
      });
      if (result.success) onClose();
      else setErr(result.error);
    });
  }

  if (!koc) return null;

  return (
    <Dialog open={!!koc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-zinc-500" />
            Chỉnh sửa KOC
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Tên KOC <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">TikTok Handle</Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Followers</Label>
              <Input type="number" value={follower} onChange={(e) => setFollower(e.target.value)} placeholder="10000" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">TikTok URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tiktok.com/@..." className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">SĐT</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zalo</Label>
              <Input value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="0901234567" className="h-9 text-sm" />
            </div>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send Link Dialog ────────────────────────────────────────────────────────

function SendLinkDialog({
  target,
  campaignName,
  campaignId,
  onClose,
}: {
  target: CampaignKocRow | null;
  campaignName: string;
  campaignId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  useEffect(() => {
    if (!target) return;
    setSent(false);
    setCopied(false);
    setRenewed(false);
    const link = `${getAppUrl()}/koc/${target.magic_link_token}`;
    setEditedMessage(
      `Chào ${target.koc_name} 😊\n\nBạn đã được chọn tham gia campaign "${campaignName}"!\n\nVui lòng quay video và submit link tại đây:\n👉 ${link}\n\nCảm ơn bạn! 🙏`
    );
  }, [target, campaignName]);

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenZalo() {
    if (!target) return;
    const id = target.koc_zalo || target.koc_phone;
    window.open(id ? `https://zalo.me/${id}` : "https://chat.zalo.me/", "_blank");
  }

  function handleRenewLink() {
    if (!target) return;
    startTransition(async () => {
      const result = await renewMagicLink(target.campaign_koc_id, campaignId);
      if (result.success) setRenewed(true);
    });
  }

  function handleMarkSent() {
    if (!target) return;
    startTransition(async () => {
      const result = await markAsReminded(
        target.campaign_koc_id,
        campaignId,
        editedMessage,
        "video_brief" as NotificationType,
      );
      if (result.success) setSent(true);
    });
  }

  if (!target) return null;

  const isExpired = new Date(target.magic_link_expires_at) < new Date();
  const link = `${getAppUrl()}/koc/${target.magic_link_token}`;

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-zinc-500" />
            Gửi link Zalo — {target.koc_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Yêu cầu: <span className="font-medium text-zinc-700">Nộp video</span></span>
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Xem link
            </a>
          </div>

          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rows={7}
            className="text-sm font-mono resize-none"
          />

          {isExpired && !renewed && (
            <div className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-xs text-orange-700">Link đã hết hạn.</p>
              <Button size="sm" variant="outline" onClick={handleRenewLink} disabled={isPending} className="gap-1.5 border-orange-300 text-orange-700 flex-shrink-0">
                <RefreshCw className="h-3.5 w-3.5" /> Gia hạn 7 ngày
              </Button>
            </div>
          )}
          {renewed && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1.5">
              Link đã được gia hạn 7 ngày.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Đã copy</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenZalo} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Mở Zalo
          </Button>
          <Button size="sm" variant={sent ? "secondary" : "default"} onClick={handleMarkSent} disabled={isPending || sent} className="gap-1.5 ml-auto">
            <CheckCheck className="h-3.5 w-3.5" />
            {sent ? "Đã ghi nhận" : "Đánh dấu đã gửi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add KOCs Dialog ─────────────────────────────────────────────────────────

type KocItem = {
  koc_id: string;
  name: string;
  category: string[] | null;
  follower: number | null;
  location: string | null;
};

function AddKocsDialog({
  open,
  availableKocs,
  onClose,
  onAdd,
  isPending,
}: {
  open: boolean;
  availableKocs: KocItem[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setSearch(""); setCatFilter("all"); setSelected(new Set()); }
  }, [open]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const k of availableKocs) for (const c of k.category ?? []) set.add(c);
    return Array.from(set).sort();
  }, [availableKocs]);

  const filtered = useMemo(
    () => availableKocs.filter((k) => {
      const matchSearch = !search || k.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || (k.category ?? []).includes(catFilter);
      return matchSearch && matchCat;
    }),
    [availableKocs, search, catFilter]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((k) => selected.has(k.koc_id));

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((k) => next.delete(k.koc_id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((k) => next.add(k.koc_id)); return next; });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Thêm KOC vào campaign</DialogTitle></DialogHeader>
        {availableKocs.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 text-center">Tất cả KOC hiện tại đã có trong campaign này.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <Input placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Ngành hàng" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngành</SelectItem>
                  {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center gap-2.5">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                <span className="text-xs text-zinc-500">{filtered.length} KOC{search || catFilter !== "all" ? " phù hợp" : " khả dụng"}</span>
                {selected.size > 0 && <Badge variant="secondary" className="ml-auto text-xs">{selected.size} đã chọn</Badge>}
              </div>
              <div className="max-h-[340px] overflow-y-auto divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-10">Không tìm thấy KOC phù hợp</p>
                ) : filtered.map((k) => (
                  <label key={k.koc_id} className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected.has(k.koc_id) ? "bg-blue-50/60" : "hover:bg-zinc-50"}`}>
                    <Checkbox checked={selected.has(k.koc_id)} onCheckedChange={() => toggle(k.koc_id)} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-zinc-900 text-sm truncate">{k.name}</span>
                        {k.follower != null && k.follower > 0 && <span className="text-xs text-zinc-400 flex-shrink-0">{formatFollower(k.follower)} followers</span>}
                      </div>
                      {k.category && k.category.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {k.category.map((c) => <span key={c} className={`text-[10px] rounded px-1.5 py-0.5 ${c === catFilter ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}>{c}</span>)}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={() => onAdd(Array.from(selected))} disabled={selected.size === 0 || isPending}>
            {isPending ? "Đang thêm..." : selected.size > 0 ? `Thêm ${selected.size} KOC` : "Thêm KOC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter row input (Google Sheets style) ─────────────────────────────────

function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Lọc..."}
      className="w-full bg-white border border-zinc-200 rounded text-[11px] px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 placeholder:text-zinc-300"
    />
  );
}

// ─── Main KocBoard ───────────────────────────────────────────────────────────

type SortKey = "account" | "follower" | "status" | "client" | "video" | "video_count" | "note" | "note2" | null;

export default function KocBoard({
  campaign,
  allKocs,
}: {
  campaign: CampaignDetail;
  allKocs: KocItem[];
}) {
  const isExternal = campaign.operation_mode === "external";
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sendLinkTarget, setSendLinkTarget] = useState<CampaignKocRow | null>(null);
  const [editTarget, setEditTarget] = useState<CampaignKocRow | null>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);

  // Filter row values
  const [fAccount, setFAccount] = useState("");
  const [fFollowerMin, setFFollowerMin] = useState("");
  const [fFollowerMax, setFFollowerMax] = useState("");
  const [fClient, setFClient] = useState<Set<string> | null>(null);
  const [fVideo, setFVideo] = useState<string>("all"); // "all" | "yes" | "no"
  const [fVideoCount, setFVideoCount] = useState("");
  const [fNote, setFNote] = useState("");
  const [fNote2, setFNote2] = useState("");
  const [fLinkFinal, setFLinkFinal] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const assignedKocIds = new Set(campaign.kocs.map((k) => k.koc_id));
  const availableKocs = allKocs.filter((k) => !assignedKocIds.has(k.koc_id));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaign.kocs.length };
    for (const s of STATUS_OPTIONS) counts[s.value] = 0;
    for (const k of campaign.kocs) {
      const simple = getSimple(k.operation_status);
      counts[simple] = (counts[simple] || 0) + 1;
    }
    return counts;
  }, [campaign.kocs]);

  // Unique values for column filters
  const clientValues = useMemo(() => {
    const set = new Set<string>();
    for (const k of campaign.kocs) set.add(k.client_approval_status);
    return Array.from(set);
  }, [campaign.kocs]);

  const hasActiveFilters = fAccount || fFollowerMin || fFollowerMax || fClient || fVideo !== "all" || fVideoCount || fNote || fNote2 || fLinkFinal;

  // Apply all filters + sort
  const processedKocs = useMemo(() => {
    let list = campaign.kocs;

    // Status tab filter
    if (statusFilter !== "all") {
      list = list.filter((k) => getSimple(k.operation_status) === statusFilter);
    }

    // Filter row filters
    if (fAccount) {
      const q = fAccount.toLowerCase();
      list = list.filter((k) =>
        (k.koc_name?.toLowerCase().includes(q)) ||
        (k.koc_tiktok_handle?.toLowerCase().includes(q))
      );
    }
    if (fFollowerMin) {
      const min = Number(fFollowerMin);
      if (!isNaN(min)) list = list.filter((k) => (k.koc_follower ?? 0) >= min);
    }
    if (fFollowerMax) {
      const max = Number(fFollowerMax);
      if (!isNaN(max)) list = list.filter((k) => (k.koc_follower ?? 0) <= max);
    }
    if (fClient) {
      list = list.filter((k) => fClient.has(k.client_approval_status));
    }
    if (fVideo === "yes") list = list.filter((k) => !!k.video_url);
    if (fVideo === "no") list = list.filter((k) => !k.video_url);
    if (fVideoCount) {
      const n = Number(fVideoCount);
      if (!isNaN(n)) list = list.filter((k) => k.video_count >= n);
    }
    if (fNote) {
      const q = fNote.toLowerCase();
      list = list.filter((k) => (k.internal_note?.toLowerCase().includes(q)));
    }
    if (fNote2) {
      const q = fNote2.toLowerCase();
      list = list.filter((k) => (k.note_2?.toLowerCase().includes(q)));
    }
    if (fLinkFinal) {
      const q = fLinkFinal.toLowerCase();
      list = list.filter((k) => k.final_link?.some((l) => l.toLowerCase().includes(q)));
    }

    // Sort
    if (sortKey && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        let va: string | number = 0;
        let vb: string | number = 0;
        switch (sortKey) {
          case "account": va = (a.koc_tiktok_handle || a.koc_name).toLowerCase(); vb = (b.koc_tiktok_handle || b.koc_name).toLowerCase(); break;
          case "follower": va = a.koc_follower ?? 0; vb = b.koc_follower ?? 0; break;
          case "status": va = statusLabel(getSimple(a.operation_status)); vb = statusLabel(getSimple(b.operation_status)); break;
          case "client": va = a.client_approval_status; vb = b.client_approval_status; break;
          case "video": va = a.video_url ? 1 : 0; vb = b.video_url ? 1 : 0; break;
          case "video_count": va = a.video_count; vb = b.video_count; break;
          case "note": va = (a.internal_note ?? "").toLowerCase(); vb = (b.internal_note ?? "").toLowerCase(); break;
          case "note2": va = (a.note_2 ?? "").toLowerCase(); vb = (b.note_2 ?? "").toLowerCase(); break;
        }
        if (va < vb) return -dir;
        if (va > vb) return dir;
        return 0;
      });
    }

    return list;
  }, [campaign.kocs, statusFilter, fAccount, fFollowerMin, fFollowerMax, fClient, fVideo, fVideoCount, fNote, fNote2, fLinkFinal, sortKey, sortDir]);

  function handleStatusChange(campaignKocId: string, newStatus: SimpleStatus) {
    setError(null);
    const dbStatus: OperationStatus = newStatus as OperationStatus;
    startTransition(async () => {
      const result = await updateCampaignKocStatus(campaignKocId, campaign.campaign_id, { operation_status: dbStatus });
      if (!result.success) setError(result.error);
    });
  }

  function handleAddKocs(kocIds: string[]) {
    if (kocIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await addKocsToCampaign(campaign.campaign_id, kocIds);
      if (result.success) setAddOpen(false);
      else setError(result.error);
    });
  }

  function handleRemove(campaignKocId: string) {
    if (!confirm("Xóa KOC này khỏi campaign?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeKocFromCampaign(campaignKocId, campaign.campaign_id);
      if (!result.success) setError(result.error);
    });
  }

  function clearAllFilters() {
    setFAccount("");
    setFFollowerMin("");
    setFFollowerMax("");
    setFClient(null);
    setFVideo("all");
    setFVideoCount("");
    setFNote("");
    setFNote2("");
    setFLinkFinal("");
  }

  function handleExport() {
    const rows = processedKocs.map((k) => {
      const row: Record<string, unknown> = {
        "Tên KOC": k.koc_name,
        "Ngành hàng": k.koc_category?.join(", ") ?? "",
        "SĐT": k.koc_phone ?? "",
        "Zalo": k.koc_zalo ?? "",
        "TikTok handle": k.koc_tiktok_handle ?? "",
        "Followers": k.koc_follower ?? "",
        "Trạng thái vận hành": statusLabel(getSimple(k.operation_status)),
      };
      if (isExternal) {
        row["Trạng thái địa chỉ"] = k.address_status === "submitted" ? "Đã có địa chỉ" : "Chờ địa chỉ";
        row["Trạng thái hàng mẫu"] = SAMPLE_LABEL[k.sample_status]?.label ?? k.sample_status;
        row["Mã vận đơn"] = k.shipping_code ?? "";
        row["Đơn vị vận chuyển"] = k.shipping_provider ?? "";
        row["Người nhận"] = k.receiver_name ?? "";
        row["SĐT người nhận"] = k.receiver_phone ?? "";
        row["Địa chỉ nhận"] = [k.receiver_address, k.receiver_province].filter(Boolean).join(", ");
      }
      row["Trạng thái duyệt KH"] = CLIENT_STATUS[k.client_approval_status]?.label ?? k.client_approval_status;
      row["Video URL"] = k.video_url ?? "";
      row["Số lượng video"] = k.video_count;
      row["Link final"] = (k.final_link ?? []).join(", ");
      row["Ghi chú"] = k.internal_note ?? "";
      row["Deadline"] = k.deadline_date ? new Date(k.deadline_date).toLocaleDateString("vi-VN") : "";
      return row;
    });
    const slug = slugifyFilename(campaign.campaign_name);
    exportToExcel(`${slug}-board-${todayStamp()}.xlsx`, "Board", rows);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "all"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Tất cả <span className="ml-1 opacity-70">{statusCounts.all}</span>
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === s.value
                  ? `${s.bg} ${s.text}`
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
              <span className="opacity-70">{statusCounts[s.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showFilterRow ? "secondary" : "outline"}
            onClick={() => setShowFilterRow((v) => !v)}
            className="gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Lọc cột
            {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearAllFilters} className="gap-1 text-zinc-500">
              <X className="h-3.5 w-3.5" /> Xoá lọc
            </Button>
          )}
          {processedKocs.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="gap-1.5"
              title="Xuất danh sách đang hiển thị ra Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Xuất Excel
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={availableKocs.length === 0 || isPending}>
            <Plus className="h-4 w-4 mr-1" /> Thêm KOC
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {campaign.kocs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">Chưa có KOC nào trong campaign này.</p>
            {availableKocs.length > 0 && (
              <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Thêm KOC đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-16">STT</th>
                  <SortableHeader label="Tài khoản" sortDir={sortKey === "account" ? sortDir : null} onSort={() => toggleSort("account")} />
                  <SortableHeader label="Followers" sortDir={sortKey === "follower" ? sortDir : null} onSort={() => toggleSort("follower")} className="w-24" />
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-24">Link Kênh</th>
                  <SortableHeader label="Client" sortDir={sortKey === "client" ? sortDir : null} onSort={() => toggleSort("client")} className="w-24" />
                  <SortableHeader label="Trạng thái" sortDir={sortKey === "status" ? sortDir : null} onSort={() => toggleSort("status")} className="w-36" />
                  {isExternal && (
                    <>
                      <th className="px-2 py-2 text-left font-medium text-zinc-500 w-28">Địa chỉ</th>
                      <th className="px-2 py-2 text-left font-medium text-zinc-500 w-28">Hàng mẫu</th>
                    </>
                  )}
                  <SortableHeader label="Video" sortDir={sortKey === "video" ? sortDir : null} onSort={() => toggleSort("video")} className="w-14" />
                  <SortableHeader label="SL Video" sortDir={sortKey === "video_count" ? sortDir : null} onSort={() => toggleSort("video_count")} className="w-16" />
                  <th className="px-2 py-2 text-left font-medium text-zinc-500 w-32">Link Final</th>
                  <SortableHeader label="Note" sortDir={sortKey === "note" ? sortDir : null} onSort={() => toggleSort("note")} className="w-28" />
                  <SortableHeader label="Note 2" sortDir={sortKey === "note2" ? sortDir : null} onSort={() => toggleSort("note2")} className="w-28" />
                  <th className="px-2 py-2 w-24" />
                </tr>
                {/* Filter row */}
                {showFilterRow && (
                  <tr className="bg-blue-50/30 border-b border-zinc-200">
                    <td className="px-2 py-1" />
                    <td className="px-2 py-1">
                      <FilterInput value={fAccount} onChange={setFAccount} placeholder="Tên / Handle" />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex gap-0.5">
                        <input
                          type="number"
                          value={fFollowerMin}
                          onChange={(e) => setFFollowerMin(e.target.value)}
                          placeholder="Min"
                          className="w-1/2 bg-white border border-zinc-200 rounded text-[11px] px-1 py-1 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-zinc-300"
                        />
                        <input
                          type="number"
                          value={fFollowerMax}
                          onChange={(e) => setFFollowerMax(e.target.value)}
                          placeholder="Max"
                          className="w-1/2 bg-white border border-zinc-200 rounded text-[11px] px-1 py-1 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-zinc-300"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1" />
                    <td className="px-2 py-1">
                      <select
                        value={fClient ? Array.from(fClient).join(",") : "all"}
                        onChange={(e) => {
                          if (e.target.value === "all") setFClient(null);
                          else setFClient(new Set([e.target.value]));
                        }}
                        className="w-full bg-white border border-zinc-200 rounded text-[11px] px-1 py-1 outline-none focus:ring-1 focus:ring-blue-300"
                      >
                        <option value="all">Tất cả</option>
                        {clientValues.map((v) => (
                          <option key={v} value={v}>{CLIENT_STATUS[v]?.label ?? v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1" />
                    {isExternal && (
                      <>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                      </>
                    )}
                    <td className="px-2 py-1">
                      <select
                        value={fVideo}
                        onChange={(e) => setFVideo(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded text-[11px] px-1 py-1 outline-none focus:ring-1 focus:ring-blue-300"
                      >
                        <option value="all">Tất cả</option>
                        <option value="yes">Có</option>
                        <option value="no">Chưa</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={fVideoCount}
                        onChange={(e) => setFVideoCount(e.target.value)}
                        placeholder="≥"
                        className="w-full bg-white border border-zinc-200 rounded text-[11px] px-1 py-1 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-zinc-300"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <FilterInput value={fLinkFinal} onChange={setFLinkFinal} placeholder="Link..." />
                    </td>
                    <td className="px-2 py-1">
                      <FilterInput value={fNote} onChange={setFNote} placeholder="Note..." />
                    </td>
                    <td className="px-2 py-1">
                      <FilterInput value={fNote2} onChange={setFNote2} placeholder="Note 2..." />
                    </td>
                    <td className="px-2 py-1" />
                  </tr>
                )}
              </thead>
              <tbody>
                {processedKocs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-zinc-400 text-sm">
                      Không có KOC nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : processedKocs.map((koc, idx) => {
                  const simple = getSimple(koc.operation_status);
                  const statusOpt = STATUS_OPTIONS.find((s) => s.value === simple) ?? STATUS_OPTIONS[0];
                  const hasVideo = !!koc.video_url;
                  const clientSt = CLIENT_STATUS[koc.client_approval_status];

                  const manualBg = koc.row_color ? ROW_COLOR_BG[koc.row_color] ?? "" : "";
                  const statusBg = !manualBg
                    ? (simple === "cancelled" ? "bg-red-50/50" : simple === "completed" ? "bg-blue-50/50" : "")
                    : "";
                  const rowBg = manualBg || statusBg;

                  return (
                    <tr
                      key={koc.campaign_koc_id}
                      className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors ${rowBg} ${isPending ? "opacity-60" : ""}`}
                    >
                      {/* STT + Color */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <RowColorPicker
                            current={koc.row_color}
                            campaignKocId={koc.campaign_koc_id}
                            campaignId={campaign.campaign_id}
                          />
                          <span className="text-zinc-400 font-mono">{idx + 1}</span>
                        </div>
                      </td>

                      {/* Tài khoản */}
                      <td className="px-2 py-2">
                        <div className="font-medium text-zinc-900 leading-tight">
                          {koc.koc_tiktok_handle || koc.koc_name}
                        </div>
                        {koc.koc_tiktok_handle && (
                          <div className="text-zinc-400 leading-tight">{koc.koc_name}</div>
                        )}
                      </td>

                      {/* Followers */}
                      <td className="px-2 py-2 text-zinc-700 font-medium">
                        {koc.koc_follower ? formatFollower(koc.koc_follower) : "—"}
                      </td>

                      {/* Link Kênh */}
                      <td className="px-2 py-2">
                        {(() => {
                          const chUrl = tiktokChannelUrl({ tiktok_url: koc.koc_tiktok_url, tiktok_handle: koc.koc_tiktok_handle });
                          return chUrl ? (
                            <a href={chUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 truncate">
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">TikTok</span>
                            </a>
                          ) : <span className="text-zinc-300">—</span>;
                        })()}
                      </td>

                      {/* Client */}
                      <td className="px-2 py-2">
                        {clientSt && <Badge variant={clientSt.variant} className="text-[10px]">{clientSt.label}</Badge>}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-2 py-2">
                        <select
                          value={simple}
                          onChange={(e) => handleStatusChange(koc.campaign_koc_id, e.target.value as SimpleStatus)}
                          className={`${statusOpt.bg} ${statusOpt.text} text-xs font-medium rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-300`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* External mode: address + sample shipping */}
                      {isExternal && (
                        <>
                          <td className="px-2 py-2">
                            <AddressCell koc={koc} campaignId={campaign.campaign_id} />
                          </td>
                          <td className="px-2 py-2">
                            <SampleCell koc={koc} campaignId={campaign.campaign_id} />
                          </td>
                        </>
                      )}

                      {/* Video checkbox */}
                      <td className="px-2 py-2 text-center">
                        <Checkbox
                          checked={hasVideo}
                          onCheckedChange={(checked) => {
                            if (!checked && koc.video_url) {
                              startTransition(async () => {
                                await updateCampaignKocField(koc.campaign_koc_id, campaign.campaign_id, "video_url", null);
                              });
                            }
                          }}
                          disabled={!hasVideo}
                        />
                      </td>

                      {/* Số lượng video */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.video_count}
                          field="video_count"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          type="number"
                          placeholder="0"
                          className="w-14"
                        />
                      </td>

                      {/* Link Final */}
                      <td className="px-2 py-2">
                        <FinalLinksCell
                          value={koc.final_link}
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                        />
                      </td>

                      {/* Note */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.internal_note}
                          field="internal_note"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          placeholder="Note..."
                        />
                      </td>

                      {/* Note 2 */}
                      <td className="px-2 py-2">
                        <EditableCell
                          value={koc.note_2}
                          field="note_2"
                          campaignKocId={koc.campaign_koc_id}
                          campaignId={campaign.campaign_id}
                          placeholder="Note 2..."
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            onClick={() => setEditTarget(koc)}
                            title="Chỉnh sửa thông tin"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {simple === "in_progress" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setSendLinkTarget(koc)}
                              title="Gửi link Zalo"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-red-600"
                            onClick={() => handleRemove(koc.campaign_koc_id)}
                            title="Xóa"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {processedKocs.length > 0 && processedKocs.length !== campaign.kocs.length && (
        <div className="mt-2 text-xs text-zinc-400">
          Hiển thị {processedKocs.length} / {campaign.kocs.length} KOC
        </div>
      )}

      {/* Edit KOC Dialog */}
      <EditKocDialog
        koc={editTarget}
        campaignId={campaign.campaign_id}
        onClose={() => setEditTarget(null)}
      />

      {/* Add KOCs Dialog */}
      <AddKocsDialog
        open={addOpen}
        availableKocs={availableKocs}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddKocs}
        isPending={isPending}
      />

      {/* Send Link Dialog */}
      <SendLinkDialog
        target={sendLinkTarget}
        campaignName={campaign.campaign_name}
        campaignId={campaign.campaign_id}
        onClose={() => setSendLinkTarget(null)}
      />
    </div>
  );
}
