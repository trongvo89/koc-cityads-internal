"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import {
  Link2, Copy, Check, ChevronDown, ChevronUp, Users, ExternalLink,
  ToggleLeft, ToggleRight, RefreshCw, Pencil, ShieldCheck, X, Clock,
  Plus, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import RichTextEditor from "@/components/ui/rich-text-editor";
import FormConfigEditor from "@/components/admin/form-config-editor";
import { getFormConfig, BUILTIN_KEYS, type FormFieldConfig } from "@/lib/types/form-config";
import {
  getApplicationsByCampaign,
  getCampaignRegistrationData,
  updateCampaignRegistration,
  addApplicationToCampaign,
  bulkAddApprovedToCampaign,
  updateApplicationInfo,
  submitAgencyReview,
  resetAgencyReview,
  updateApplicationRowColor,
  adminAddKocApplication,
  type KocApplication,
  type CampaignRegistrationData,
} from "@/lib/actions/applications";
import { searchKocsForApplication, type KocSearchItem } from "@/lib/actions/kocs";

function formatFollower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatVnd(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
      title="Copy link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const STATUS_LABEL = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
} as const;

const STATUS_VARIANT = {
  pending: "secondary",
  approved: "success",
  rejected: "destructive",
} as const;

const STYLE_LABEL = {
  show_face_voice: "Show mặt & giọng",
  ugc_style: "UGC & Style",
} as const;

// ─── Row color palette ──────────────────────────────────────────────────────

const ROW_COLORS: { value: string | null; label: string; bg: string; ring: string }[] = [
  { value: null,     label: "Không màu",  bg: "bg-white border border-zinc-200",  ring: "ring-zinc-300" },
  { value: "red",    label: "Đỏ",         bg: "bg-red-200",       ring: "ring-red-400" },
  { value: "orange", label: "Cam",         bg: "bg-orange-200",    ring: "ring-orange-400" },
  { value: "yellow", label: "Vàng",        bg: "bg-yellow-200",    ring: "ring-yellow-400" },
  { value: "green",  label: "Xanh lá",     bg: "bg-green-200",     ring: "ring-green-400" },
  { value: "cyan",   label: "Xanh ngọc",   bg: "bg-cyan-200",      ring: "ring-cyan-400" },
  { value: "blue",   label: "Xanh dương",  bg: "bg-blue-200",      ring: "ring-blue-400" },
  { value: "purple", label: "Tím",         bg: "bg-purple-200",    ring: "ring-purple-400" },
  { value: "pink",   label: "Hồng",        bg: "bg-pink-200",      ring: "ring-pink-400" },
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

function AppRowColorPicker({
  current,
  applicationId,
  campaignId,
}: {
  current: string | null;
  applicationId: string;
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
      await updateApplicationRowColor(applicationId, campaignId, color);
    });
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tô màu hàng"
        className={`h-4 w-4 rounded-full border border-zinc-300 transition-all hover:scale-110 ${current ? ROW_COLOR_BG[current]?.replace("50", "300") ?? "bg-white" : "bg-white"} ${isPending ? "opacity-50" : ""}`}
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

// ─── Filter tabs ────────────────────────────────────────────────────────────

type FilterKey = "all" | "pending" | "client_approved" | "client_rejected" | "agency_approved" | "shortlisted";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all",              label: "Tất cả" },
  { key: "pending",          label: "Chờ duyệt" },
  { key: "client_approved",  label: "Client duyệt" },
  { key: "client_rejected",  label: "Client từ chối" },
  { key: "agency_approved",  label: "Agency duyệt" },
  { key: "shortlisted",      label: "Cân nhắc" },
];

function filterApps(apps: KocApplication[], filter: FilterKey): KocApplication[] {
  switch (filter) {
    case "all":              return apps;
    case "pending":          return apps.filter((a) => a.status === "pending");
    case "client_approved":  return apps.filter((a) => a.status === "approved");
    case "client_rejected":  return apps.filter((a) => a.status === "rejected" && a.agency_status !== "approved");
    case "agency_approved":  return apps.filter((a) => a.agency_status === "approved");
    case "shortlisted":      return apps.filter((a) => a.agency_status === "shortlisted");
  }
}

// ─── Edit Application Dialog ─────────────────────────────────────────────────

function EditApplicationDialog({
  app,
  campaignId,
  onClose,
  onSaved,
}: {
  app: KocApplication | null;
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [gmv, setGmv] = useState("");
  const [zalo, setZalo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!app) return;
    setHandle(app.tiktok_handle ?? "");
    setName(app.tiktok_name ?? "");
    setUrl(app.tiktok_url ?? "");
    setFollowers(String(app.follower_count ?? 0));
    setGmv(String(app.gmv_30d ?? 0));
    setZalo(app.zalo_phone ?? "");
    setErr(null);
  }, [app]);

  function handleSave() {
    if (!app) return;
    if (!handle.trim()) { setErr("TikTok Handle không được trống"); return; }
    setErr(null);
    startTransition(async () => {
      const result = await updateApplicationInfo(app.id, campaignId, {
        tiktok_handle: handle.trim(),
        tiktok_name: name.trim(),
        tiktok_url: url.trim(),
        follower_count: Number(followers) || 0,
        gmv_30d: Number(gmv) || 0,
        zalo_phone: zalo.trim(),
      });
      if (result.success) {
        onSaved();
        onClose();
      } else {
        setErr(result.error);
      }
    });
  }

  if (!app) return null;

  return (
    <Dialog open={!!app} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-zinc-500" />
            Chỉnh sửa đơn đăng ký
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">TikTok Handle <span className="text-red-500">*</span></Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tên TikTok</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">TikTok URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tiktok.com/@..." className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Followers</Label>
              <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="10000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GMV 30 ngày</Label>
              <Input type="number" value={gmv} onChange={(e) => setGmv(e.target.value)} placeholder="100000000" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">SĐT Zalo</Label>
            <Input value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="0901234567" className="h-9 text-sm" />
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

// ─── Add KOC Application Dialog ─────────────────────────────────────────────

function AddKocApplicationDialog({
  open,
  campaignId,
  onClose,
  onSaved,
}: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [kocList, setKocList] = useState<KocSearchItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKoc, setSelectedKoc] = useState<KocSearchItem | null>(null);

  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [gmv, setGmv] = useState("");
  const [zalo, setZalo] = useState("");
  const [videoStyle, setVideoStyle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      searchKocsForApplication().then((r) => {
        if (r.success) setKocList(r.data);
      });
      setSearch("");
      setSelectedKoc(null);
      setHandle("");
      setName("");
      setUrl("");
      setFollowers("");
      setGmv("");
      setZalo("");
      setVideoStyle("");
      setErr(null);
    }
  }, [open]);

  function selectKoc(koc: KocSearchItem) {
    setSelectedKoc(koc);
    setHandle(koc.tiktok_handle || koc.name || "");
    setName(koc.name || "");
    setUrl(koc.tiktok_url || "");
    setZalo(koc.zalo || koc.phone || "");
    setFollowers(String(koc.follower ?? 0));
    setGmv("");
    setErr(null);
  }

  function clearSelection() {
    setSelectedKoc(null);
    setHandle("");
    setName("");
    setUrl("");
    setZalo("");
    setFollowers("");
    setGmv("");
    setErr(null);
  }

  function handleSubmit() {
    if (!handle.trim() || !name.trim() || !url.trim()) {
      setErr("TikTok Handle, Tên và URL không được trống");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const result = await adminAddKocApplication(campaignId, {
        tiktok_handle: handle.trim(),
        tiktok_name: name.trim(),
        tiktok_url: url.trim(),
        follower_count: Number(followers) || 0,
        gmv_30d: Number(gmv) || 0,
        zalo_phone: zalo.trim(),
        video_style: videoStyle,
        koc_id: selectedKoc?.koc_id ?? null,
      });
      if (result.success) {
        onSaved();
        onClose();
      } else {
        setErr(result.error);
      }
    });
  }

  const filtered = search.trim()
    ? kocList.filter((k) => {
        const q = search.toLowerCase();
        return (
          k.name?.toLowerCase().includes(q) ||
          k.tiktok_handle?.toLowerCase().includes(q) ||
          k.tiktok_url?.toLowerCase().includes(q)
        );
      })
    : kocList;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-zinc-500" />
            Thêm KOC thủ công
          </DialogTitle>
        </DialogHeader>

        {/* KOC search section */}
        {!selectedKoc && (
          <div className="space-y-2">
            <Label className="text-xs text-zinc-600">Tìm KOC có sẵn trong hệ thống</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, TikTok handle..."
                className="h-9 text-sm pl-8"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-zinc-400 text-center">
                  {kocList.length === 0 ? "Đang tải..." : "Không tìm thấy KOC nào"}
                </p>
              ) : (
                filtered.slice(0, 50).map((koc) => (
                  <button
                    key={koc.koc_id}
                    type="button"
                    onClick={() => selectKoc(koc)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{koc.name}</p>
                      <p className="text-xs text-zinc-400">
                        {koc.tiktok_handle || koc.tiktok_url || "—"}
                      </p>
                    </div>
                    {koc.follower != null && koc.follower > 0 && (
                      <span className="text-xs text-zinc-400">{formatFollower(koc.follower)}</span>
                    )}
                  </button>
                ))
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Hoặc điền form bên dưới để nhập thủ công
            </p>
          </div>
        )}

        {selectedKoc && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            <div>
              <p className="text-sm font-medium text-blue-800">{selectedKoc.name}</p>
              <p className="text-xs text-blue-500">{selectedKoc.tiktok_handle || selectedKoc.tiktok_url}</p>
            </div>
            <button onClick={clearSelection} className="text-blue-400 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">TikTok Handle <span className="text-red-500">*</span></Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tên TikTok <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">TikTok URL <span className="text-red-500">*</span></Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tiktok.com/@..." className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Followers</Label>
              <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="10000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GMV 30 ngày</Label>
              <Input type="number" value={gmv} onChange={(e) => setGmv(e.target.value)} placeholder="100000000" className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">SĐT Zalo</Label>
              <Input value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="0901234567" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phong cách video</Label>
              <Select value={videoStyle} onValueChange={setVideoStyle}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Chọn..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="show_face_voice">Show mặt & giọng</SelectItem>
                  <SelectItem value="ugc_style">UGC & Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Đang thêm..." : "Thêm KOC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  campaignId: string;
}

export default function CampaignRegistrationPanel({ campaignId }: Props) {
  const [open, setOpen] = useState(false);
  const [regData, setRegData] = useState<CampaignRegistrationData | null>(null);
  const [applications, setApplications] = useState<KocApplication[]>([]);
  const [brief, setBrief] = useState("");
  const [instructions, setInstructions] = useState("");
  const [thankYou, setThankYou] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [editApp, setEditApp] = useState<KocApplication | null>(null);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [formDirty, setFormDirty] = useState(false);
  const [formSaveMsg, setFormSaveMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(() => {
    getCampaignRegistrationData(campaignId).then((r) => {
      if (r.success) {
        setRegData(r.data);
        setBrief(r.data.registration_brief ?? "");
        setInstructions(r.data.registration_instructions ?? "");
        setThankYou(r.data.registration_thank_you || "");
        setFormFields(getFormConfig(r.data.registration_form_config));
        setFormDirty(false);
        setIsDirty(false);
      }
    });
    getApplicationsByCampaign(campaignId).then((r) => {
      if (r.success) setApplications(r.data);
    });
  }, [campaignId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function handleToggleOpen() {
    if (!regData) return;
    startTransition(async () => {
      await updateCampaignRegistration(campaignId, {
        registration_open: !regData.registration_open,
      });
      setRegData((prev) => prev ? { ...prev, registration_open: !prev.registration_open } : prev);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCampaignRegistration(campaignId, {
        registration_brief: brief || null,
        registration_instructions: instructions || null,
        registration_thank_you: thankYou || null,
      });
      if (result.success) {
        setSaveMsg("Đã lưu");
        setIsDirty(false);
        setTimeout(() => setSaveMsg(null), 2000);
      }
    });
  }

  function handleAddOne(appId: string) {
    setAddingId(appId);
    startTransition(async () => {
      const result = await addApplicationToCampaign(appId, campaignId);
      if (result.success) {
        setAddedIds((prev) => new Set([...prev, appId]));
      } else {
        alert(result.error);
      }
      setAddingId(null);
    });
  }

  function handleBulkAdd() {
    setBulkMsg(null);
    startTransition(async () => {
      const result = await bulkAddApprovedToCampaign(campaignId);
      if (result.success) {
        setBulkMsg(`Đã thêm ${result.data.added} KOC${result.data.skipped > 0 ? `, bỏ qua ${result.data.skipped} (đã có)` : ""}`);
        setTimeout(() => setBulkMsg(null), 4000);
      } else {
        setBulkMsg(result.error);
      }
    });
  }

  function handleAgencyApprove(appId: string) {
    startTransition(async () => {
      const result = await submitAgencyReview(appId, campaignId, "approved");
      if (result.success) load();
      else alert(result.error);
    });
  }

  function handleAgencyShortlist(appId: string) {
    startTransition(async () => {
      const result = await submitAgencyReview(appId, campaignId, "shortlisted");
      if (result.success) load();
      else alert(result.error);
    });
  }

  function handleAgencyReset(appId: string) {
    startTransition(async () => {
      const result = await resetAgencyReview(appId, campaignId);
      if (result.success) load();
      else alert(result.error);
    });
  }

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter(
    (a) => a.status === "approved" || (a.status === "rejected" && a.agency_status === "approved")
  ).length;

  const filteredApps = filterApps(applications, filter);

  const filterCounts: Record<FilterKey, number> = {
    all:              applications.length,
    pending:          applications.filter((a) => a.status === "pending").length,
    client_approved:  applications.filter((a) => a.status === "approved").length,
    client_rejected:  applications.filter((a) => a.status === "rejected" && a.agency_status !== "approved").length,
    agency_approved:  applications.filter((a) => a.agency_status === "approved").length,
    shortlisted:      applications.filter((a) => a.agency_status === "shortlisted").length,
  };

  const customFieldKeys = (() => {
    const keys = new Set<string>();
    for (const app of applications) {
      if (app.custom_data) {
        for (const k of Object.keys(app.custom_data)) keys.add(k);
      }
    }
    return [...keys];
  })();
  const customFieldLabels: Record<string, string> = {};
  for (const f of formFields) {
    if (!BUILTIN_KEYS.has(f.key)) customFieldLabels[f.key] = f.label || f.key;
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="font-semibold text-sm text-zinc-800">Đăng ký KOC</span>
          {applications.length > 0 && (
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
              {applications.length} đơn
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pendingCount} chờ duyệt
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && regData && (
        <div className="border-t border-zinc-100">
          {/* Toggle + Links */}
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Mở đăng ký</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {regData.registration_open ? "KOC có thể đăng ký qua link" : "Link đang bị đóng"}
                </p>
              </div>
              <button
                onClick={handleToggleOpen}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
              >
                {regData.registration_open
                  ? <ToggleRight className="h-8 w-8 text-green-500" />
                  : <ToggleLeft className="h-8 w-8" />}
              </button>
            </div>

            {/* Links */}
            {regData.registration_token && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
                  <Link2 className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-500 flex-1 truncate">
                    Link đăng ký (cho KOC):&nbsp;
                    <a
                      href={`${baseUrl}/apply/${regData.registration_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /apply/{regData.registration_token?.slice(0, 8)}…
                    </a>
                  </span>
                  <CopyButton text={`${baseUrl}/apply/${regData.registration_token}`} />
                  <a
                    href={`${baseUrl}/apply/${regData.registration_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {regData.review_token && (
                  <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
                    <Link2 className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                    <span className="text-xs text-zinc-500 flex-1 truncate">
                      Link xem đơn (cho client):&nbsp;
                      <a
                        href={`${baseUrl}/review/${regData.review_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        /review/{regData.review_token?.slice(0, 8)}…
                      </a>
                    </span>
                    <CopyButton text={`${baseUrl}/review/${regData.review_token}`} />
                    <a
                      href={`${baseUrl}/review/${regData.review_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Brief + Instructions */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-600">Brief cho KOC (hiển thị trên trang đăng ký)</Label>
                <RichTextEditor
                  campaignId={campaignId}
                  value={brief}
                  onChange={(html) => { setBrief(html); setIsDirty(true); }}
                  placeholder="Mô tả sản phẩm, yêu cầu nội dung, hashtag, mention..."
                  minHeight={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-600">Hướng dẫn (cách nhận hàng, thao tác TikTok)</Label>
                <RichTextEditor
                  campaignId={campaignId}
                  value={instructions}
                  onChange={(html) => { setInstructions(html); setIsDirty(true); }}
                  placeholder={"Bước 1: Nhận sản phẩm...\nBước 2: Đăng video TikTok...\nBước 3: Submit link..."}
                  minHeight={130}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-zinc-700">
                  Nội dung sau đăng ký (trang cảm ơn)
                </Label>
                <p className="text-xs text-zinc-400 mb-2">
                  Tuỳ chỉnh nội dung hiển thị sau khi KOC đăng ký thành công. Để trống để dùng mặc định.
                </p>
                <RichTextEditor
                  value={thankYou}
                  onChange={setThankYou}
                  placeholder="Cảm ơn bạn đã đăng ký! Chúng tôi sẽ liên hệ sớm..."
                  campaignId={campaignId}
                  minHeight={80}
                />
              </div>
              {isDirty && (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    {isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                  {saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
                </div>
              )}
              {!isDirty && saveMsg && (
                <span className="text-xs text-green-600">{saveMsg}</span>
              )}
            </div>
          </div>

          {/* Form Config Editor */}
          <div className="border-t border-zinc-100 px-5 py-4">
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              {formOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Tuỳ chỉnh form đăng ký
            </button>
            {formOpen && (
              <div className="mt-3 space-y-3">
                <FormConfigEditor
                  config={formFields}
                  onChange={(cfg) => { setFormFields(cfg); setFormDirty(true); }}
                />
                {formDirty && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await updateCampaignRegistration(campaignId, {
                            registration_form_config: formFields,
                          });
                          if (result.success) {
                            setFormDirty(false);
                            setFormSaveMsg("Đã lưu form config");
                            setTimeout(() => setFormSaveMsg(null), 2000);
                          }
                        });
                      }}
                      disabled={isPending}
                    >
                      {isPending ? "Đang lưu..." : "Lưu cấu hình form"}
                    </Button>
                    {formSaveMsg && <span className="text-xs text-green-600">{formSaveMsg}</span>}
                  </div>
                )}
                {!formDirty && formSaveMsg && (
                  <span className="text-xs text-green-600">{formSaveMsg}</span>
                )}
              </div>
            )}
          </div>

          {/* Applications Table */}
          <div className="border-t border-zinc-100">
            <div className="px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">
                Danh sách đơn đăng ký
                {applications.length > 0 && (
                  <span className="ml-1.5 text-zinc-400 font-normal">({applications.length})</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                {bulkMsg && <span className="text-xs text-zinc-600">{bulkMsg}</span>}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddAppOpen(true)}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm KOC
                </Button>
                {approvedCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkAdd}
                    disabled={isPending}
                    className="text-xs h-7"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Thêm {approvedCount} đã duyệt vào campaign
                  </Button>
                )}
                <button
                  onClick={load}
                  disabled={isPending}
                  className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            {applications.length > 0 && (
              <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filter === tab.key
                        ? "bg-zinc-800 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {tab.label}
                    {filterCounts[tab.key] > 0 && (
                      <span className={`ml-1 ${filter === tab.key ? "text-zinc-300" : "text-zinc-400"}`}>
                        {filterCounts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {applications.length === 0 ? (
              <div className="px-5 pb-4 text-sm text-zinc-400 italic">
                Chưa có đơn đăng ký nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-t border-zinc-100">
                      <th className="px-2 py-2 text-xs text-zinc-500 font-medium w-8"></th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">TikTok</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Followers</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">GMV 30d</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Zalo</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Phong cách</th>
                      {customFieldKeys.map((k) => (
                        <th key={k} className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">
                          {customFieldLabels[k] || k}
                        </th>
                      ))}
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Client duyệt</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Agency duyệt</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Ngày</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredApps.map((app) => (
                      <tr key={app.id} className={`hover:bg-zinc-50 transition-colors ${app.row_color ? ROW_COLOR_BG[app.row_color] ?? "" : ""}`}>
                        <td className="px-2 py-2.5 text-center">
                          <AppRowColorPicker
                            current={app.row_color}
                            applicationId={app.id}
                            campaignId={campaignId}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div>
                            <a
                              href={app.tiktok_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-zinc-800 hover:text-blue-600 flex items-center gap-1"
                            >
                              {app.tiktok_handle}
                              <ExternalLink className="h-3 w-3 text-zinc-400" />
                            </a>
                            <p className="text-xs text-zinc-400">{app.tiktok_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-zinc-600">
                          {formatFollower(app.follower_count)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-zinc-600">
                          {formatVnd(app.gmv_30d)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-zinc-600">{app.zalo_phone}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-600">
                          {STYLE_LABEL[app.video_style as keyof typeof STYLE_LABEL] ?? app.video_style}
                        </td>
                        {customFieldKeys.map((k) => (
                          <td key={k} className="px-4 py-2.5 text-xs text-zinc-600 max-w-[150px] truncate">
                            {app.custom_data?.[k] != null ? String(app.custom_data[k]) : "—"}
                          </td>
                        ))}
                        <td className="px-4 py-2.5">
                          <Badge variant={STATUS_VARIANT[app.status] as any} className="text-xs">
                            {STATUS_LABEL[app.status]}
                          </Badge>
                          {app.review_note && (
                            <p className="text-xs text-zinc-400 mt-0.5 max-w-[120px] truncate">
                              {app.review_note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {app.status === "rejected" && !app.agency_status && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                disabled={isPending}
                                onClick={() => handleAgencyApprove(app.id)}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                disabled={isPending}
                                onClick={() => handleAgencyShortlist(app.id)}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Cân nhắc
                              </Button>
                            </div>
                          )}
                          {app.agency_status === "approved" && (
                            <div className="flex items-center gap-1">
                              <Badge variant="info" className="text-xs">
                                <ShieldCheck className="h-3 w-3 mr-0.5" />
                                Agency duyệt
                              </Badge>
                              <button
                                onClick={() => handleAgencyReset(app.id)}
                                disabled={isPending}
                                className="p-0.5 text-zinc-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                                title="Hủy duyệt"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {app.agency_status === "shortlisted" && (
                            <div className="flex items-center gap-1">
                              <Badge variant="warning" className="text-xs">
                                <Clock className="h-3 w-3 mr-0.5" />
                                Cân nhắc
                              </Badge>
                              <button
                                onClick={() => handleAgencyReset(app.id)}
                                disabled={isPending}
                                className="p-0.5 text-zinc-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                                title="Hủy cân nhắc"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {app.status !== "rejected" && !app.agency_status && (
                            <span className="text-xs text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-400">
                          {new Date(app.applied_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditApp(app)}
                              className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors rounded hover:bg-zinc-100"
                              title="Chỉnh sửa thông tin"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isPending || addingId === app.id || !app.koc_id || addedIds.has(app.id)}
                              onClick={() => handleAddOne(app.id)}
                            >
                              {addingId === app.id ? "..." : addedIds.has(app.id) ? "Đã thêm" : "Thêm vào campaign"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Application Dialog */}
      <EditApplicationDialog
        app={editApp}
        campaignId={campaignId}
        onClose={() => setEditApp(null)}
        onSaved={load}
      />

      {/* Add KOC Application Dialog */}
      <AddKocApplicationDialog
        open={addAppOpen}
        campaignId={campaignId}
        onClose={() => setAddAppOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
