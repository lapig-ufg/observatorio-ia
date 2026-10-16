import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { assetUrl } from "./catalog";
import { trackEvent } from "./analytics";
import { formatPublicDate } from "./dateLabels";
import type { summarizeNews } from "./portalStructure";
import { HomeSectionHeading } from "./HomeSectionHeading";

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
    <HomeSectionHeading id="home-press-title" eyebrow="Imprensa" title="IA na imprensa" action={<a className="text-action" href="#ia-como-noticia-diaria" onClick={() => trackEvent("nav_daily_news", { position: "home" })}>Explorar notícias →</a>} />
    {summary ? <div className="pt-press-layout"><div className="pt-press-overview">
      <p className="pt-press-total"><strong>{summary.total.toLocaleString("pt-BR")}</strong> matérias</p>
      <p>Folha de S.Paulo · Última publicação: <time dateTime={summary.lastDate}>{formatPublicDate(summary.lastDate)}</time></p>
      {!!summary.monthlyCounts?.length && <MonthlyNewsChart months={summary.monthlyCounts} />}
    </div><ul className="pt-press-headlines">{summary.articles.map(article => <li key={article.url}><a href={article.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_news_article", { event_label: article.url, position: "home" })}><Newspaper size={20} aria-hidden="true" /><div><time dateTime={article.date}>{formatPublicDate(article.date)}</time><h3>{article.title}</h3></div><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul></div> : <p>Explore a cobertura da Folha de S.Paulo sobre inteligência artificial.</p>}
  </section>;
}

function MonthlyNewsChart({ months }: { months: NewsSummary["monthlyCounts"] }) {
  const max = Math.max(1, ...months.map(month => month.count));
  const total = months.reduce((sum, month) => sum + month.count, 0);
  const description = `${total.toLocaleString("pt-BR")} matérias de ${formatPublicDate(months[0].month)} a ${formatPublicDate(months[months.length - 1].month)}. ${months.map(month => `${formatPublicDate(month.month)}: ${month.count}`).join("; ")}.`;
  return <figure className="pt-press-chart"><figcaption>Matérias por mês · últimos 12 meses</figcaption>
    <svg viewBox="0 0 360 104" role="img" aria-labelledby="pt-press-chart-title pt-press-chart-description">
      <title id="pt-press-chart-title">Cobertura mensal de inteligência artificial</title><desc id="pt-press-chart-description">{description}</desc>
      {months.map((month, i) => { const height = month.count / max * 68; return <g key={month.month}>
        <title>{formatPublicDate(month.month)}: {month.count} matérias</title>
        <rect x={i * 30 + 5} y={74 - height} width="20" height={height} rx="2" fill="currentColor" />
        <text x={i * 30 + 15} y="96" textAnchor="middle">{formatPublicDate(month.month).split(" ")[0].replace(".", "")}</text>
      </g>; })}
    </svg>
  </figure>;
}
