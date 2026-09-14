"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importProductsFromSheet } from "@/lib/actions/livestream";
import type { SheetProductRow } from "@/lib/actions/livestream";

// ─── TSV/CSV parser (RFC 4180 — handles multi-line quoted cells like scripts) ──

function detectSeparator(text: string): string {
  let inQuote = false, tabs = 0, commas = 0;
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
      } else cell += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === sep) { cells.push(cell.trim()); cell = ""; }
      else if (ch === "\n") {
        cells.push(cell.trim()); cell = "";
        if (cells.some((c) => c.length > 0)) rows.push(cells);
        cells = [];
      } else if (ch !== "\r") cell += ch;
    }
  }
  cells.push(cell.trim());
  if (cells.some((c) => c.length > 0)) rows.push(cells);
  return rows;
}

// Header alias → field. Matches the brand's Google Sheet columns.
const COL_MAP: Record<string, keyof SheetProductRow> = {
  "tên sản phẩm": "product_name", "tên": "product_name", "ten san pham": "product_name",
  "sản phẩm": "product_name", "product": "product_name", "product name": "product_name",
  "kịch bản": "script", "kich ban": "script", "script": "script", "nội dung": "script", "voice": "script",
  "id sản phẩm": "shopee_item_id", "id": "shopee_item_id", "id san pham": "shopee_item_id",
  "item id": "shopee_item_id", "product id": "shopee_item_id",
  "link sản phẩm": "product_url", "link": "product_url", "link sp": "product_url",
  "link san pham": "product_url", "url": "product_url",
};

function parseSheet(raw: string): { rows: SheetProductRow[]; error: string | null } {
  const sep = detectSeparator(raw);
  const all = tokenizeRows(raw, sep);
  if (all.length < 2) return { rows: [], error: "Cần ít nhất 1 dòng tiêu đề + 1 dòng dữ liệu." };

  const headers = all[0].map((h) => h.toLowerCase().trim());
  const fieldMap = headers.map((h) => COL_MAP[h] ?? null);
  if (!fieldMap.includes("product_name") || !fieldMap.includes("script")) {
    return {
      rows: [],
      error: `Không thấy cột "Tên sản phẩm" và "Kịch bản". Cột đọc được: ${headers.join(", ")}`,
    };
  }

  const rows: SheetProductRow[] = [];
  for (let i = 1; i < all.length; i++) {
    const cols = all[i];
    const row: SheetProductRow = { product_name: "", script: "" };
    fieldMap.forEach((field, idx) => {
      if (field && cols[idx] != null) row[field] = cols[idx];
    });
    if (row.product_name?.trim() && row.script?.trim()) rows.push(row);
  }
  return { rows, error: rows.length === 0 ? "Không có dòng hợp lệ (cần Tên SP + Kịch bản)." : null };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SheetImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = raw.trim() ? parseSheet(raw) : { rows: [], error: null };

  function handleImport() {
    if (!title.trim()) { setError("Nhập tiêu đề buổi live"); return; }
    const { rows, error: parseErr } = parseSheet(raw);
    if (parseErr) { setError(parseErr); return; }
    setError(null);
    startTransition(async () => {
      const result = await importProductsFromSheet(title.trim(), rows);
      if (result.success) {
        onClose();
        setTitle(""); setRaw("");
        router.push(`/admin/livestream/scripts/${result.data.script_id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Import sản phẩm từ Google Sheet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Tiêu đề buổi live</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Live TOKYOLIFE — Bra tàng hình 14/09"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dán dữ liệu từ Sheet</Label>
            <p className="text-xs text-zinc-500">
              Bôi đen các dòng trong Google Sheet (kèm dòng tiêu đề) rồi copy &amp; dán vào đây.
              Cần có cột <strong>Tên sản phẩm</strong> và <strong>Kịch bản</strong> (kèm ID sản phẩm nếu có).
            </p>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Tên Sản Phẩm    ID sản phẩm    KỊCH BẢN&#10;Áo Bra ...    49763993830    Mặc áo thun mà lo lộ viền..."
              className="h-40 font-mono text-xs"
            />
          </div>

          {raw.trim() && (
            preview.error
              ? <p className="text-sm text-amber-600">{preview.error}</p>
              : <p className="text-sm text-emerald-700">Đọc được <strong>{preview.rows.length}</strong> sản phẩm.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={handleImport}
            disabled={isPending || preview.rows.length === 0}
          >
            {isPending ? "Đang tạo..." : `Tạo kịch bản (${preview.rows.length} SP)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
