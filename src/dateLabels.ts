import type { Locale } from "./locale";

export function formatPublicDate(value: string, locale: Locale = "pt") {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  // Preserva textos editoriais e datas inválidas, sem inventar mês ou dia ausente.
  if (!match || !match[2]) return value;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day || "01"}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, value.length) !== value) return value;
  const monthLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", { month: "short", timeZone: "UTC" }).format(date);
  if (!day) return `${monthLabel} ${year}`;
  // A composição evita os conectivos do Intl em PT e mantém a data no dia UTC original.
  return locale === "en" ? `${monthLabel} ${Number(day)}, ${year}` : `${Number(day)} ${monthLabel} ${year}`;
}
