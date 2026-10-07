import type { Article, ArticleType } from "./catalog";

export type CatalogOrder = "added" | "published";
export type CatalogView = "cards" | "list";
export const publicTypes: ArticleType[] = ["medium", "documento", "link-video", "audio", "entrevista", "paper", "apresentacao"];

export function readCatalogLocation<A extends "all" | "todos">(search: string, all: A) {
  const params = new URLSearchParams(search);
  const candidate = params.get("type") || "";
  return {
    query: params.get("q") || "",
    keyword: params.get("keyword") || "",
    type: publicTypes.includes(candidate as ArticleType) ? candidate as ArticleType : all,
    theme: params.get("theme") || all,
    sort: (params.get("sort") === "published" ? "published" : "added") as CatalogOrder,
    view: (params.get("view") === "list" ? "list" : "cards") as CatalogView,
    showAll: params.get("all") === "1",
    visible: Math.min(10000, Math.max(15, Number(params.get("limit")) || 15)),
    item: params.get("item") || "",
  };
}

// A preview is explicitly an excerpt, never a replacement for the editorial summary.
// A neutral topical description is safer than cutting a long sentence mid-claim.
export function articlePreview(article: Article, english: boolean) {
  if (/navier.stokes/i.test(article.title) && /Helena Nussenzveig/i.test(article.author)) return english
    ? "AI and the Navier–Stokes problem: an analysis of a provisional result with external forcing, distinct from the still-open unforced Millennium Problem."
    : "IA e o problema de Navier–Stokes: análise de um resultado provisório com força externa, distinto do Problema do Milênio sem forçamento, ainda aberto.";
  const sentences = article.summary.match(/[^]*?[.!?](?=\s|$)|[^]+$/gu) || [article.summary];
  let first = sentences.shift()?.trim() || "";
  while (sentences.length && /(?:\bProf|\bDr|\bDra|\bSr|\bSra|\bSt|\bal|\bvs|\bS)\.$/i.test(first)) first += ` ${sentences.shift()?.trim()}`;
  if (first.length <= 230) return first;
  const topics = article.tags.slice(0, 3).join(" · ") || article.subtheme || article.theme;
  return english ? `Topics covered: ${topics}.` : `Temas abordados: ${topics}.`;
}

export function videoThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? parsed.pathname.slice(1) : ["youtube.com", "m.youtube.com"].includes(host)
      ? parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:live|shorts|embed)\/([^/]+)/)?.[1] : "";
    return id && /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "";
  } catch { return ""; }
}
