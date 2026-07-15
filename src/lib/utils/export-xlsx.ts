import * as XLSX from "xlsx";

// Only ever writes workbooks built from our own trusted in-app data via
// json_to_sheet/writeFile — never call XLSX.read/readFile on user-supplied
// files with this module (that parse path is where SheetJS's known
// vulnerabilities live).
export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, unknown>[]
) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}

export function slugifyFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "campaign";
}

export function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
