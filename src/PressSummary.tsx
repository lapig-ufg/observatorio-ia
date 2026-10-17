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
export function PressSummary({ summary, english = false }: { summary: NewsSummary | null; english?: boolean }) {
  return <section className="pt-home-section portal-news pt-press" aria-labelledby="home-press-title">
    <HomeSectionHeading id="home-press-title" eyebrow={english ? "Press" : "Imprensa"} title={english ? "AI in the press" : "IA na imprensa"} action={<a className="text-action" href={english ? "#daily-news" : "#ia-como-noticia-diaria"} onClick={() => trackEvent("nav_daily_news", { position: "home" })}>{english ? "Explore the news →" : "Explorar notícias →"}</a>} />
    {summary ? <div className="pt-press-layout"><div className="pt-press-overview">
      <p className="pt-press-total"><strong>{summary.total.toLocaleString(english ? "en-US" : "pt-BR")}</strong> {english ? "articles" : "matérias"}</p>
      <p>{english ? "Folha de S.Paulo · Latest publication: " : "Folha de S.Paulo · Última publicação: "}<time dateTime={summary.lastDate}>{formatPublicDate(summary.lastDate, english ? "en" : "pt")}</time></p>
      {!!summary.monthlyCounts?.length && <MonthlyNewsChart months={summary.monthlyCounts} english={english} />}
    </div><ul className="pt-press-headlines">{summary.articles.map(article => <li key={article.url}><a href={article.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_news_article", { event_label: article.url, position: "home" })}><Newspaper size={20} aria-hidden="true" /><div><time dateTime={article.date}>{formatPublicDate(article.date, english ? "en" : "pt")}</time><h3 lang={english ? "pt-BR" : undefined}>{article.title}</h3>{english && <span>(in Portuguese)</span>}</div><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul></div> : <p>{english ? "Explore Folha de S.Paulo’s coverage of artificial intelligence (in Portuguese)." : "Explore a cobertura da Folha de S.Paulo sobre inteligência artificial."}</p>}
  </section>;
}

function MonthlyNewsChart({ months, english = false }: { months: NewsSummary["monthlyCounts"]; english?: boolean }) {
  const max = Math.max(1, ...months.map(month => month.count));
  const total = months.reduce((sum, month) => sum + month.count, 0);
  const description = `${total.toLocaleString(english ? "en-US" : "pt-BR")} ${english ? "articles from" : "matérias de"} ${formatPublicDate(months[0].month, english ? "en" : "pt")} ${english ? "to" : "a"} ${formatPublicDate(months[months.length - 1].month, english ? "en" : "pt")}. ${months.map(month => `${formatPublicDate(month.month, english ? "en" : "pt")}: ${month.count}`).join("; ")}.`;
  return <figure className="pt-press-chart"><figcaption>{english ? "Articles per month · last 12 months" : "Matérias por mês · últimos 12 meses"}</figcaption>
    <svg viewBox="0 0 360 104" role="img" aria-labelledby="pt-press-chart-title pt-press-chart-description">
      <title id="pt-press-chart-title">{english ? "Monthly coverage of artificial intelligence" : "Cobertura mensal de inteligência artificial"}</title><desc id="pt-press-chart-description">{description}</desc>
      {months.map((month, i) => { const height = month.count / max * 68; return <g key={month.month}>
        <title>{formatPublicDate(month.month, english ? "en" : "pt" )}: {month.count} {english ? "articles" : "matérias"}</title>
        <rect x={i * 30 + 5} y={74 - height} width="20" height={height} rx="2" fill="currentColor" />
        <text x={i * 30 + 15} y="96" textAnchor="middle">{formatPublicDate(month.month, english ? "en" : "pt").split(" ")[0].replace(".", "")}</text>
      </g>; })}
    </svg>
  </figure>;
}
