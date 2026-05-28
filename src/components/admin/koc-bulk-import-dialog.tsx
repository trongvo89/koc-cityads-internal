"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { bulkCreateKocs } from "@/lib/actions/kocs";
import type { BulkKocRow } from "@/lib/actions/kocs";

// ─── CSV / TSV parser ─────────────────────────────────────────────────────────

function detectSeparator(text: string): string {
  // Scan first 500 chars outside of quotes to detect separator
  let inQuote = false;
  let tabs = 0, commas = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    if (ch === '\n') break;
    if (ch === '\t') tabs++;
    else if (ch === ',') commas++;
  }
  return tabs > commas ? "\t" : ",";
}

// Tokenize entire CSV/TSV respecting RFC 4180 multi-line quoted fields.
// Returns array of rows, each row is array of cell strings (with embedded \n preserved).
function tokenizeRows(raw: string, sep: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuote) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; } // escaped ""
        else inQuote = false;
      } else {
        cell += ch; // preserves embedded newlines inside quotes
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === sep) {
        cells.push(cell.trim()); cell = "";
      } else if (ch === '\n') {
        cells.push(cell.trim()); cell = "";
        if (cells.some((c) => c.length > 0)) rows.push(cells);
        cells = [];
      } else if (ch !== '\r') {
        cell += ch;
      }
    }
  }
  cells.push(cell.trim());
  if (cells.some((c) => c.length > 0)) rows.push(cells);
  return rows;
}

// Parse follower counts including "1,6K" / "61,2K" / "1.2M" formats.
function parseFollowerCount(val: string): number | null {
  const s = val.trim().toUpperCase().replace(/\s/g, "");
  if (!s) return null;

  const kMatch = s.match(/^([\d]+[,.][\d]+)K$|^([\d]+)K$/);
  if (kMatch) {
    const n = parseFloat((kMatch[1] ?? kMatch[2]).replace(",", "."));
    return isNaN(n) ? null : Math.round(n * 1000);
  }
  const mMatch = s.match(/^([\d]+[,.][\d]+)M$|^([\d]+)M$/);
  if (mMatch) {
    const n = parseFloat((mMatch[1] ?? mMatch[2]).replace(",", "."));
    return isNaN(n) ? null : Math.round(n * 1_000_000);
  }
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? null : n;
}

// Column name aliases → canonical field
const COL_MAP: Record<string, keyof BulkKocRow> = {
  tên: "name", name: "name", "tên koc": "name", koc: "name", "tài khoản": "name", "tai khoan": "name",
  tiktok: "tiktok_url", tiktok_url: "tiktok_url", "tiktok url": "tiktok_url",
  "link kênh tiktok": "tiktok_url", "link tiktok": "tiktok_url", "link kênh": "tiktok_url",
  instagram: "instagram_url", instagram_url: "instagram_url", ig: "instagram_url", "instagram url": "instagram_url",
  facebook: "facebook_url", facebook_url: "facebook_url", fb: "facebook_url", "facebook url": "facebook_url",
  follower: "follower", followers: "follower", "theo dõi": "follower", subscriber: "follower",
  "lượt theo dõi": "follower", "người theo dõi": "follower", "nguoi theo doi": "follower",
  phone: "phone", sdt: "phone", "điện thoại": "phone", "số điện thoại": "phone",
  zalo: "zalo",
  location: "location", "khu vực": "location", "địa điểm": "location", "tỉnh thành": "location",
  category: "category", "danh mục": "category", "lĩnh vực": "category", "ngành hàng": "category", "nganh hang": "category",
};

function parseText(raw: string): { rows: BulkKocRow[]; errors: string[] } {
  const sep = detectSeparator(raw);
  const allRows = tokenizeRows(raw, sep);

  if (allRows.length < 2) return { rows: [], errors: ["Cần ít nhất 1 hàng tiêu đề và 1 hàng dữ liệu."] };

  const headers = allRows[0].map((h) => h.toLowerCase().trim());
  const fieldMap: (keyof BulkKocRow | null)[] = headers.map((h) => COL_MAP[h] ?? null);

  if (!fieldMap.includes("name")) {
    return { rows: [], errors: [`Không tìm thấy cột "Tên" trong file. Headers: ${headers.join(", ")}`] };
  }

  const rows: BulkKocRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const cells = allRows[i];

    // First pass: collect all raw values by field
    const rawVals: Partial<Record<keyof BulkKocRow, string>> = {};
    fieldMap.forEach((field, idx) => {
      if (!field) return;
      const existing = rawVals[field];
      const val = cells[idx]?.trim() ?? "";
      // prefer non-empty value; explicit column beats derived
      if (!existing || val) rawVals[field] = val;
    });

    const row: Partial<BulkKocRow> = {};

    // Process each field
    for (const [field, val] of Object.entries(rawVals) as [keyof BulkKocRow, string][]) {
      if (field === "follower") {
        row.follower = parseFollowerCount(val);
      } else if (field === "category") {
        row.category = val ? val.split(",").map((s) => s.trim()).filter(Boolean) : null;
      } else {
        (row as Record<string, string | null>)[field] = val || null;
      }
    }

    // Post-process: handle multi-line name cells like "@handle\nDisplay Name"
    // (happens when TikTok account name cells contain both handle and channel name)
    if (row.name?.includes("\n")) {
      const parts = row.name.split("\n").map((p) => p.trim()).filter(Boolean);
      const handle = parts.find((p) => p.startsWith("@"));
      const displayName = parts.find((p) => !p.startsWith("@"));
      row.name = displayName ?? handle ?? row.name;
      // auto-fill tiktok_url from handle if no explicit tiktok_url column was provided
      if (handle && !row.tiktok_url) {
        row.tiktok_url = `https://www.tiktok.com/${handle}`;
      }
    }

    if (!row.name?.trim()) {
      errors.push(`Hàng ${i + 1}: thiếu tên KOC — bỏ qua`);
      continue;
    }
    rows.push(row as BulkKocRow);
  }

  // Deduplicate within batch: same name (case-insensitive) or same tiktok_url
  const seenNames = new Set<string>();
  const seenUrls = new Set<string>();
  const deduped: BulkKocRow[] = [];
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    const urlKey = row.tiktok_url?.trim() ?? "";
    if (seenNames.has(key) || (urlKey && seenUrls.has(urlKey))) {
      errors.push(`"${row.name}" trùng trong file — giữ dòng đầu tiên`);
      continue;
    }
    seenNames.add(key);
    if (urlKey) seenUrls.add(urlKey);
    deduped.push(row);
  }

  return { rows: deduped, errors };
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const csv = [
    "Tài khoản,Người theo dõi,Link kênh TikTok,Ngành hàng,Phone,Khu vực",
    'Nguyen Van A,50000,https://tiktok.com/@nguyenvana,"Beauty,Lifestyle",0901234567,TP.HCM',
    "Tran Thi B,120000,https://tiktok.com/@tranthib,Food,0912345678,Hà Nội",
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "koc_import_template.csv";
  a.click();
}

// ─── Component ────────────────────────────────────────────────────────────────

type ParsedRow = BulkKocRow & { _index: number; _error?: string };

export default function KocBulkImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; skipped: string[]; duplicates: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleParse(text: string) {
    setRawText(text);
    if (!text.trim()) {
      setPreview([]);
      setParseErrors([]);
      return;
    }
    const { rows, errors } = parseText(text);
    setPreview(rows.map((r, i) => ({ ...r, _index: i + 1 })));
    setParseErrors(errors);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleParse((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function handleImport() {
    if (preview.length === 0) return;
    setResult(null);
    startTransition(async () => {
      const res = await bulkCreateKocs(preview);
      if (res.success) {
        setResult(res.data);
        setPreview([]);
        setRawText("");
        setParseErrors([]);
      } else {
        setParseErrors([res.error]);
      }
    });
  }

  function handleClose() {
    setRawText("");
    setPreview([]);
    setParseErrors([]);
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import KOC hàng loạt</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-zinc-900 text-lg">
              Đã import {result.created} KOC thành công!
            </p>
            {(result.skipped.length > 0 || result.duplicates > 0) && (
              <p className="text-sm text-zinc-500">
                {[
                  result.skipped.length > 0 && `${result.skipped.length} hàng không hợp lệ`,
                  result.duplicates > 0 && `${result.duplicates} KOC đã tồn tại trong hệ thống`,
                ]
                  .filter(Boolean)
                  .join(" · ")} — đã bỏ qua.
              </p>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={handleClose}>Đóng</Button>
              <Button
                variant="outline"
                onClick={() => setResult(null)}
              >
                Import thêm
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Instructions */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
              <p className="font-medium">Hướng dẫn:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Tải template CSV, điền dữ liệu rồi upload lên — hoặc copy từ Excel và dán vào ô bên dưới.</li>
                <li>Hàng đầu tiên phải là tiêu đề cột. Cột bắt buộc: <strong>Tài khoản</strong>.</li>
                <li>Các cột chính: <strong>Tài khoản, Người theo dõi, Link kênh TikTok, Ngành hàng</strong>.</li>
                <li>Ngành hàng nhiều giá trị phân cách bằng dấu phẩy, ví dụ: <code>Beauty,Lifestyle</code>.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Tải template CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload file CSV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Paste area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Hoặc paste dữ liệu từ Excel / Google Sheets:
              </label>
              <Textarea
                value={rawText}
                onChange={(e) => handleParse(e.target.value)}
                placeholder={"Tài khoản\tNgười theo dõi\tLink kênh TikTok\tNgành hàng\nNguyen Van A\t50000\thttps://tiktok.com/@...\tBeauty,Lifestyle"}
                rows={5}
                className="font-mono text-xs"
              />
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 space-y-0.5">
                {parseErrors.map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            {preview.length > 0 && (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-2">
                  Xem trước — {preview.length} KOC sẽ được thêm:
                </p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Tài khoản</th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-500">Người theo dõi</th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Link kênh TikTok</th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Ngành hàng</th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Phone</th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Khu vực</th>
                        <th className="px-3 py-2 w-7" />
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                          <td className="px-3 py-2 text-zinc-400">{row._index}</td>
                          <td className="px-3 py-2 font-medium text-zinc-900">{row.name}</td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {row.follower != null
                              ? row.follower >= 1000
                                ? `${(row.follower / 1000).toFixed(0)}K`
                                : row.follower
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-zinc-500 max-w-[150px] truncate">
                            {row.tiktok_url ? (
                              <span title={row.tiktok_url ?? ""} className="truncate block">{row.tiktok_url}</span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">
                            {row.category?.join(", ") ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">{row.phone ?? "—"}</td>
                          <td className="px-3 py-2 text-zinc-500">{row.location ?? "—"}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-zinc-300 hover:text-red-500 transition-colors"
                              onClick={() =>
                                setPreview((prev) => prev.filter((_, j) => j !== i))
                              }
                              title="Xóa hàng này"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview.length === 0 || isPending}
              >
                {isPending
                  ? "Đang import..."
                  : preview.length > 0
                  ? `Import ${preview.length} KOC`
                  : "Import"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
