export type RadarPeriod = "all" | "7d";
export function radarDateWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  const end = `${part("year")}-${part("month")}-${part("day")}`;
  const startDate = new Date(`${end}T12:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  return { start: startDate.toISOString().slice(0, 10), end };
}
export function addedInWindow(article: { includedAt: string }, window: { start: string; end: string }) {
  const date = article.includedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= window.start && date <= window.end;
}
