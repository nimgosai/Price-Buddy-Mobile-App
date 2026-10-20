/** Desktop table helpers: column sorting + CSV (spreadsheet) export. Web only. */
import { useMemo, useState } from "react";

export type SortState = { key: string; dir: "asc" | "desc" };
type Getter<T> = (row: T) => string | number | null | undefined;

export function useSort<T>(rows: T[], getters: Record<string, Getter<T>>, initial: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(initial);
  const sorted = useMemo(() => {
    if (!sort || !getters[sort.key]) return rows;
    const g = getters[sort.key];
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = g(a);
      const vb = g(b);
      if (va == null || va === "") return 1;
      if (vb == null || vb === "") return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va).localeCompare(String(vb), "en-GB", { numeric: true, sensitivity: "base" }) * mul;
    });
    // getters are static per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const onSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  return { sorted, sort, onSort };
}

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads a CSV file that opens directly in Excel / Google Sheets. */
export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  if (typeof document === "undefined") return;
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const today = () => new Date().toISOString().slice(0, 10);
