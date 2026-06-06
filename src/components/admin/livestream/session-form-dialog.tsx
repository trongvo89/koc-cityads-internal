"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSession } from "@/lib/actions/livestream";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Khác",
};

type Props = {
  open: boolean;
  hosts: { host_id: string; name: string }[];
  scripts: { script_id: string; title: string; status: string }[];
  campaigns: { campaign_id: string; campaign_name: string }[];
  onClose: () => void;
};

export default function SessionFormDialog({ open, hosts, scripts, campaigns, onClose }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [scheduledAt, setScheduledAt] = useState("");
  const [hostId, setHostId] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [streamLink, setStreamLink] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  function resetForm() {
    setTitle(""); setPlatform("tiktok"); setScheduledAt(""); setHostId("");
    setScriptId(""); setCampaignId(""); setRtmpUrl(""); setStreamKey("");
    setStreamLink(""); setNotes(""); setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Tiêu đề không được để trống");
      return;
    }
    setError(null);
    startSave(async () => {
      const result = await createSession({
        title,
        platform: platform as "tiktok" | "shopee" | "lazada" | "facebook" | "youtube" | "other",
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        host_id: hostId || null,
        script_id: scriptId || null,
        campaign_id: campaignId || null,
        rtmp_url: rtmpUrl || null,
        stream_key: streamKey || null,
        stream_link: streamLink || null,
        notes: notes || null,
      });
      if (result.success) {
        handleClose();
        router.push(`/admin/livestream/sessions/${result.data.session_id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Đặt lịch live</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="session-title">Tiêu đề *</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: TikTok Live Serum ban đêm - Thứ 6"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nền tảng</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thời gian bắt đầu</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>AI Host</Label>
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn host..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không có</SelectItem>
                  {hosts.map((h) => (
                    <SelectItem key={h.host_id} value={h.host_id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kịch bản</Label>
              <Select value={scriptId} onValueChange={setScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kịch bản..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không có</SelectItem>
                  {scripts.map((s) => (
                    <SelectItem key={s.script_id} value={s.script_id}>
                      {s.title}{s.status !== "approved" ? " (nháp)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Campaign (tuỳ chọn)</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Liên kết campaign..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Không có</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>RTMP URL</Label>
            <Input
              value={rtmpUrl}
              onChange={(e) => setRtmpUrl(e.target.value)}
              placeholder="rtmp://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Stream Key</Label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Stream key"
              />
            </div>
            <div className="space-y-2">
              <Label>Link xem live</Label>
              <Input
                value={streamLink}
                onChange={(e) => setStreamLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ghi chú nội bộ..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Đặt lịch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
