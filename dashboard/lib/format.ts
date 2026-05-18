export const AUD = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-AU");

export const AUDk = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return "$" + Math.round(n / 1_000) + "k";
  return AUD(n);
};

export const pct = (n: number, digits = 1) =>
  (n * 100).toFixed(digits).replace(/\.0$/, "") + "%";

export const pctRaw = (n: number, digits = 1) =>
  n.toFixed(digits).replace(/\.0$/, "") + "%";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtWeekday = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short" });

export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function weekOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - start.getTime()) / 86_400_000) + start.getDay() + 1) / 7);
}

export function deadlineSeverity(days: number): "overdue" | "urgent" | "normal" {
  if (days < 0) return "overdue";
  if (days <= 14) return "urgent";
  return "normal";
}
