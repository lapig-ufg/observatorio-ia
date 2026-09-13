import type { Article } from "./catalog";

const portugueseMonths: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function catalogDate(value: string) {
  const text = value.trim();
  if (!text) return 0;

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));

  const localizedDate = normalized(text).match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (localizedDate && localizedDate[2] in portugueseMonths) {
    return Date.UTC(Number(localizedDate[3]), portugueseMonths[localizedDate[2]], Number(localizedDate[1]));
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function articleRecency(article: Pick<Article, "publishedAt" | "includedAt">) {
  return Math.max(catalogDate(article.publishedAt), catalogDate(article.includedAt));
}

export function newestFirst(left: Article, right: Article) {
  return articleRecency(right) - articleRecency(left)
    || catalogDate(right.includedAt) - catalogDate(left.includedAt)
    || right.title.localeCompare(left.title, "pt-BR");
}
