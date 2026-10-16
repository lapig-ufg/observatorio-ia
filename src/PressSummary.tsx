import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { assetUrl } from "./catalog";
import { trackEvent } from "./analytics";
import { formatPublicDate } from "./dateLabels";
import type { summarizeNews } from "./portalStructure";

export type NewsSummary = ReturnType<typeof summarizeNews>;
export function useNewsSummary(enabled = true) {
  const [summary, setSummary] = useState<NewsSummary | null>(null);
  useEffect(() => {
    if (!enabled || summary) return;
    const controller = new AbortController();
    void fetch(assetUrl("folha-ia/resumo.json"), { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Resumo indisponível"); return response.json() as Promise<NewsSummary>; })
      .then(value => { if (Number.isFinite(value.total) && Array.isArray(value.articles)) setSummary(value); }).catch(() => {});
    return () => controller.abort();
  }, [enabled, summary]);
  return summary;
}
export function PressSummary({ summary }: { summary: NewsSummary | null }) {
  return <section className="pt-home-section portal-news pt-press" aria-labelledby="home-press-title">
    <div className="discovery-heading"><h2 id="home-press-title">IA na imprensa</h2><a className="text-action" href="#ia-como-noticia-diaria" onClick={() => trackEvent("nav_daily_news", { position: "home" })}>Explorar notícias →</a></div>
    <p>Explore a cobertura da Folha de S.Paulo sobre inteligência artificial.</p>
    {summary && <><p><strong>{summary.total.toLocaleString("pt-BR")} matérias</strong> · Última publicação: <time dateTime={summary.lastDate}>{formatPublicDate(summary.lastDate)}</time></p><ul>{summary.articles.map(article => <li key={article.url}><a href={article.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_news_article", { event_label: article.url, position: "home" })}><span>{article.title}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul></>}
  </section>;
}
