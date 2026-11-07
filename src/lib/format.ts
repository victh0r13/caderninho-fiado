const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(cents: number): string {
  return brl.format((cents || 0) / 100);
}

/** "12,50" -> "12,50" sem o símbolo R$ */
export function moneyPlain(cents: number): string {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte texto digitado ("12,50", "12.5", "1.234,56", "R$ 3") em centavos. */
export function parseMoney(input: string): number {
  if (!input) return 0;
  let s = String(input).replace(/[^\d,.-]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function dateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = daysBetween(d, now);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const label = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  })}`;
  return diff < 0 ? dateFull(iso) : label;
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Diferença em dias de calendário (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export function relativeDays(iso: string | null, now = new Date()): string {
  if (!iso) return "nunca";
  const d = daysBetween(new Date(iso), now);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return m === 1 ? "há 1 mês" : `há ${m} meses`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Remove acentos e deixa minúsculo — para buscas. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export function formatPhone(phone: string): string {
  const d = onlyDigits(phone).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/** yyyy-mm-dd no fuso local, para <input type="date"> */
export function toDateInput(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
