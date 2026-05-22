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
  const firstLine = text.split("\n")[0] ?? "";
  return firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";
}

function parseCSVLine(line: string, sep: string): string[] {
  if (sep === "\t") return line.split("\t").map((c) => c.trim());
  // Handle quoted CSV fields
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === sep && !inQuote) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
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
  const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["Cần ít nhất 1 hàng tiêu đề và 1 hàng dữ liệu."] };

  const sep = detectSeparator(raw);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());
  const fieldMap: (keyof BulkKocRow | null)[] = headers.map((h) => COL_MAP[h] ?? null);

  if (!fieldMap.includes("name")) {
    return { rows: [], errors: [`Không tìm thấy cột "Tên" trong file. Headers: ${headers.join(", ")}`] };
  }

  const rows: BulkKocRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], sep);
    const row: Partial<BulkKocRow> = {};

    fieldMap.forEach((field, idx) => {
      if (!field) return;
      const val = cells[idx]?.trim() ?? "";
      if (field === "follower") {
        const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
        row.follower = isNaN(n) ? null : n;
      } else if (field === "category") {
        row.category = val ? val.split(",").map((s) => s.trim()).filter(Boolean) : null;
      } else {
        (row as Record<string, string | null>)[field] = val || null;
      }
    });

    if (!row.name?.trim()) {
      errors.push(`Hàng ${i + 1}: thiếu tên KOC — bỏ qua`);
      continue;
    }
    rows.push(row as BulkKocRow);
  }

  return { rows, errors };
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
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null);
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
            {result.skipped.length > 0 && (
              <p className="text-sm text-zinc-500">
                Bỏ qua {result.skipped.length} hàng không hợp lệ.
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
