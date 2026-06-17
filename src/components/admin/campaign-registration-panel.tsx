"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Link2, Copy, Check, ChevronDown, ChevronUp, Users, ExternalLink,
  ToggleLeft, ToggleRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/rich-text-editor";
import {
  getApplicationsByCampaign,
  getCampaignRegistrationData,
  updateCampaignRegistration,
  addApplicationToCampaign,
  bulkAddApprovedToCampaign,
  type KocApplication,
  type CampaignRegistrationData,
} from "@/lib/actions/applications";

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

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(() => {
    getCampaignRegistrationData(campaignId).then((r) => {
      if (r.success) {
        setRegData(r.data);
        setBrief(r.data.registration_brief ?? "");
        setInstructions(r.data.registration_instructions ?? "");
        setThankYou(r.data.registration_thank_you || "");
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

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
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

            {applications.length === 0 ? (
              <div className="px-5 pb-4 text-sm text-zinc-400 italic">
                Chưa có đơn đăng ký nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-t border-zinc-100">
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">TikTok</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Followers</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">GMV 30d</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Zalo</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Phong cách</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Client duyệt</th>
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Ngày</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-zinc-50 transition-colors">
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
                          {STYLE_LABEL[app.video_style]}
                        </td>
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
                        <td className="px-4 py-2.5 text-xs text-zinc-400">
                          {new Date(app.applied_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={isPending || addingId === app.id || !app.koc_id || addedIds.has(app.id)}
                            onClick={() => handleAddOne(app.id)}
                          >
                            {addingId === app.id ? "..." : addedIds.has(app.id) ? "Đã thêm" : "Thêm vào campaign"}
                          </Button>
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
    </div>
  );
}
