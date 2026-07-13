"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { bulkImportKocsToCampaign } from "@/lib/actions/applications";
import type { BulkImportKocRow } from "@/lib/actions/applications";

// ─── CSV / TSV parsing (same approach as koc-bulk-import-dialog) ─────────────

function detectSeparator(text: string): string {
  let inQuote = false;
  let tabs = 0, commas = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    if (ch === "\n") break;
    if (ch === "\t") tabs++;
    else if (ch === ",") commas++;
  }
  return tabs > commas ? "\t" : ",";
}

function tokenizeRows(raw: string, sep: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuote) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === sep) {
        cells.push(cell.trim()); cell = "";
      } else if (ch === "\n") {
        cells.push(cell.trim()); cell = "";
        if (cells.some((c) => c.length > 0)) rows.push(cells);
        cells = [];
      } else if (ch !== "\r") {
        cell += ch;
      }
    }
  }
  cells.push(cell.trim());
  if (cells.some((c) => c.length > 0)) rows.push(cells);
  return rows;
}

// Parse numbers with "50K" / "1,6K" / "1.2M" / "5,000,000" formats.
function parseHumanNumber(val: string): number {
  const s = val.trim().toUpperCase().replace(/\s/g, "");
  if (!s) return 0;

  const kMatch = s.match(/^([\d]+[,.][\d]+)K$|^([\d]+)K$/);
  if (kMatch) {
    const n = parseFloat((kMatch[1] ?? kMatch[2]).replace(",", "."));
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  const mMatch = s.match(/^([\d]+[,.][\d]+)M$|^([\d]+)M$/);
  if (mMatch) {
    const n = parseFloat((mMatch[1] ?? mMatch[2]).replace(",", "."));
    return isNaN(n) ? 0 : Math.round(n * 1_000_000);
  }
  const bMatch = s.match(/^([\d]+[,.][\d]+)B$|^([\d]+)B$/);
  if (bMatch) {
    const n = parseFloat((bMatch[1] ?? bMatch[2]).replace(",", "."));
    return isNaN(n) ? 0 : Math.round(n * 1_000_000_000);
  }
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

// Header aliases → canonical field
const COL_MAP: Record<string, "handle" | "name" | "url" | "follower" | "gmv"> = {
  handle: "handle", "tiktok handle": "handle", id: "handle",
  "tài khoản": "handle", "tai khoan": "handle", "tên koc": "handle", koc: "handle",
  "tên": "name", name: "name", "tên hiển thị": "name", "ten hien thi": "name",
  tiktok: "url", link: "url", url: "url", "link kênh": "url", "link kenh": "url",
  "tiktok url": "url", "tiktok_url": "url", "link tiktok": "url", "link kênh tiktok": "url",
  follower: "follower", followers: "follower", "theo dõi": "follower", "theo doi": "follower",
  "lượt theo dõi": "follower", "người theo dõi": "follower", "nguoi theo doi": "follower",
  gmv: "gmv", "gmv 30d": "gmv", "gmv 30 ngày": "gmv", "gmv 30 ngay": "gmv",
  "gmv30d": "gmv", "doanh số": "gmv", "doanh so": "gmv", "doanh thu": "gmv",
};

function parseInput(raw: string): { rows: BulkImportKocRow[]; errors: string[] } {
  const errors: string[] = [];
  const sep = detectSeparator(raw);
  const allRows = tokenizeRows(raw, sep);
  if (allRows.length < 2) {
    return { rows: [], errors: ["Cần ít nhất 1 dòng header + 1 dòng dữ liệu"] };
  }

  const header = allRows[0].map((h) => h.toLowerCase().trim());
  const colIdx: Partial<Record<"handle" | "name" | "url" | "follower" | "gmv", number>> = {};
  header.forEach((h, i) => {
    const field = COL_MAP[h];
    if (field && colIdx[field] === undefined) colIdx[field] = i;
  });

  if (colIdx.handle === undefined && colIdx.url === undefined) {
    return {
      rows: [],
      errors: [
        `Không tìm thấy cột handle hoặc link TikTok. Header nhận được: ${header.join(", ")}`,
      ],
    };
  }

  const rows: BulkImportKocRow[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const cells = allRows[i];
    const get = (f: keyof typeof colIdx) =>
      colIdx[f] !== undefined ? (cells[colIdx[f]!] ?? "").trim() : "";

    let handle = get("handle");
    const url = get("url");
    if (!handle && url) {
      const m = url.match(/@([\w.-]+)/);
      if (m) handle = `@${m[1]}`;
    }
    if (!handle) {
      errors.push(`Dòng ${i + 1}: thiếu handle và link TikTok — bỏ qua`);
      continue;
    }

    rows.push({
      tiktok_handle: handle,
      tiktok_name: get("name") || handle,
      tiktok_url: url,
      follower_count: parseHumanNumber(get("follower")),
      gmv_30d: parseHumanNumber(get("gmv")),
    });
  }

  return { rows, errors };
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export default function KocBulkCampaignImportDialog({
  campaignId,
  open,
  onClose,
  onImported,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<{ rows: BulkImportKocRow[]; errors: string[] } | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleParse(raw: string) {
    setText(raw);
    setResult(null);
    setServerError(null);
    setParsed(raw.trim() ? parseInput(raw) : null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleParse(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setServerError(null);
    startTransition(async () => {
      const res = await bulkImportKocsToCampaign(campaignId, parsed.rows);
      if (res.success) {
        setResult(res.data);
        if (res.data.added > 0) onImported();
      } else {
        setServerError(res.error);
      }
    });
  }

  function handleClose() {
    setText("");
    setParsed(null);
    setResult(null);
    setServerError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import KOC đã duyệt trên TikTok</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Dán bảng từ Excel/Google Sheets (có dòng tiêu đề). Các cột hỗ trợ:{" "}
            <span className="font-medium text-zinc-700">
              Tài khoản/Handle, Tên, Link kênh, Followers, GMV 30d
            </span>
            . KOC sẽ vào campaign ở trạng thái <span className="font-medium text-emerald-700">Đã duyệt</span>.
          </p>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Tải file .csv/.tsv
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <Textarea
            rows={6}
            value={text}
            onChange={(e) => handleParse(e.target.value)}
            placeholder={"Tài khoản\tLink kênh\tFollowers\tGMV 30d\n@kocdemo\thttps://www.tiktok.com/@kocdemo\t50K\t5,000,000"}
            className="font-mono text-xs"
          />

          {parsed && parsed.errors.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-0.5 max-h-28 overflow-y-auto">
              {parsed.errors.map((e, i) => (
                <p key={i} className="flex items-start gap-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                  {e}
                </p>
              ))}
            </div>
          )}

          {parsed && parsed.rows.length > 0 && !result && (
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-600">
                Xem trước: {parsed.rows.length} KOC hợp lệ
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Handle</th>
                      <th className="px-3 py-1.5 text-left font-medium">Tên</th>
                      <th className="px-3 py-1.5 text-right font-medium">Followers</th>
                      <th className="px-3 py-1.5 text-right font-medium">GMV 30d</th>
                      <th className="px-3 py-1.5 text-left font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {parsed.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-medium text-zinc-800">{r.tiktok_handle}</td>
                        <td className="px-3 py-1.5 text-zinc-600">{r.tiktok_name}</td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">{fmtNum(r.follower_count)}</td>
                        <td className="px-3 py-1.5 text-right text-zinc-600">{fmtNum(r.gmv_30d)}đ</td>
                        <td className="px-3 py-1.5 text-zinc-400 truncate max-w-[160px]">{r.tiktok_url || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {result && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 space-y-1">
              <p className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Đã thêm {result.added} KOC{result.skipped > 0 ? ` · bỏ qua ${result.skipped} (đã có)` : ""}
              </p>
              {result.errors.length > 0 && (
                <div className="text-xs text-amber-700 max-h-24 overflow-y-auto space-y-0.5">
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {result ? "Đóng" : "Hủy"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={isPending || !parsed || parsed.rows.length === 0}
            >
              {isPending
                ? "Đang import..."
                : `Import ${parsed?.rows.length ?? 0} KOC`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
