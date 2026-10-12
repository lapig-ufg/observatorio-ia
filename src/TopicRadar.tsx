import { useState, useMemo, type CSSProperties } from "react";
import type { Article } from "./catalog";
import { addedInWindow, radarDateWindow, type RadarPeriod } from "./radarPeriod";
import { buildKeywordCloud, cloudTermKey, type KeywordCloudEntry } from "./keywordCloud";
import { matchesSearch } from "./archiveSearch";

type Topic = KeywordCloudEntry & { size: number };
export function TopicRadar({ articles, selected, onSelect, english = false }: { articles: Article[]; selected: string; onSelect: (label: string, period: RadarPeriod) => void; english?: boolean }) {
  const [period, setPeriod] = useState<RadarPeriod>(() => new URLSearchParams(window.location.search).get("added") === "7d" ? "7d" : "all");
  const windowDates = radarDateWindow();
  const corpus = useMemo(() => period === "7d" ? articles.filter(article => addedInWindow(article, windowDates)) : articles, [articles, period, windowDates.start, windowDates.end]);
  const topics: Topic[] = useMemo(() => {
    const cloud = buildKeywordCloud(corpus, new Set<string>(), Number.MAX_SAFE_INTEGER, 1);
    const maximum = Math.max(...cloud.map(term => term.count), 1);
    return cloud.map(term => ({ ...term, size: 0.92 + Math.sqrt(term.count / maximum) * 2 }));
  }, [corpus]);
  const date = (value: string) => new Intl.DateTimeFormat(english ? "en-GB" : "pt-BR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const matches = topics.filter(topic => matchesSearch(topic.label, query));
  const visible = expanded ? matches.slice(0, limit) : topics.slice(0, 12);
  return <section id={english ? "topics" : "palavras-chave"} className="keyword-cloud-section" aria-labelledby="keyword-cloud-title">
    <div className="keyword-cloud-heading"><div><p className="eyebrow">{english ? "Explore connections" : "Explore conexões"}</p><h2 id="keyword-cloud-title">{english ? "Collection topic radar" : "Radar de assuntos do acervo"}</h2></div><p>{english ? "Choose a topic to find related materials across the collection." : "Escolha um assunto e encontre materiais relacionados em todo o acervo."}</p></div>
    <div className="radar-period" role="group" aria-label={english ? "Radar period" : "Período do Radar"}>{(["all", "7d"] as const).map(value => <button key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setQuery(""); setLimit(24); }}>{value === "all" ? (english ? "Entire collection" : "Todo o acervo") : (english ? "Added in the last 7 days" : "Adicionados nos últimos 7 dias")}</button>)}</div>
    <p className="radar-coverage" role="status">{period === "7d" ? `${date(windowDates.start)} – ${date(windowDates.end)} · ` : ""}{corpus.length} {english ? "published items in this view" : "itens publicados neste recorte"}{period === "7d" && (english ? " · inclusion date, São Paulo time" : " · data de inclusão, horário de Brasília")}</p>
    {!corpus.length && <p>{english ? "No additions in this period. Explore the entire collection." : "Nenhuma inclusão neste período. Explore todo o acervo."}</p>}
    {expanded && <div className="radar-search"><label htmlFor="radar-search">{english ? "Find a topic" : "Encontrar um assunto"}</label><input id="radar-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} placeholder={english ? "e.g. education, agents, ethics" : "Ex.: educação, agentes, ética"} /><span role="status">{matches.length} {english ? "topics" : "assuntos"}</span></div>}
    <div className="keyword-cloud" aria-label={english ? "Collection topics" : "Assuntos do acervo"}>
      {visible.map((keyword, index) => <button type="button" key={keyword.key} className={`keyword-cloud-item cloud-color-${index % 5}${cloudTermKey(selected) === keyword.key ? " active" : ""}`} style={{ "--cloud-size": `${keyword.size}rem`, "--cloud-weight": Math.round(500 + (keyword.size - 0.92) * 175) } as CSSProperties} onClick={() => onSelect(keyword.label, period)} aria-pressed={cloudTermKey(selected) === keyword.key}>
        <span>{keyword.label}</span><small className="radar-count" aria-hidden="true">{keyword.count}</small><small className="sr-only">{english ? `: ${keyword.count} items in the selected period` : `: ${keyword.count} itens no período selecionado`}</small>
      </button>)}
      {expanded && !matches.length && <p>{english ? "Try another topic." : "Tente outro assunto."}</p>}
    </div>
    <p className="radar-coverage">{english ? "Larger, heavier words indicate higher frequency — not scientific importance." : "Tamanho e peso da fonte indicam frequência — não importância científica."}</p>
    <div className="radar-actions"><button className="radar-toggle" aria-expanded={expanded} onClick={() => { setExpanded(!expanded); setLimit(24); }}>{expanded ? (english ? "Show main topics" : "Mostrar principais assuntos") : (english ? `Explore all ${topics.length} topics` : `Explorar os ${topics.length} assuntos`)}</button>
      {expanded && limit < matches.length && <button className="radar-toggle" onClick={() => setLimit(previous => previous + 24)}>{english ? "Show more topics" : "Ver mais assuntos"}</button>}
    </div>
    <details className="radar-method"><summary>{english ? "How this radar is built" : "Como este Radar é construído"}</summary><p>{english ? `Keywords are grouped by concept and ranked by the number of items in the selected view. The full collection includes all ${articles.length} active published catalog items, including AI Readings. The seven-day view uses inclusion dates, from six days before today through today in São Paulo; older or future-dated items do not affect its ranking. Folha has a separate news archive. Frequencies describe this curated collection, not the whole AI field.` : `As palavras-chave são agrupadas por conceito e ordenadas pelo número de itens no recorte escolhido. O acervo completo inclui todos os ${articles.length} registros ativos publicados do catálogo, inclusive Leituras em IA. O recorte de sete dias usa a data de inclusão, dos seis dias anteriores até hoje, no horário de Brasília; itens antigos ou com data futura não influenciam sua ordem. A Folha possui acervo jornalístico separado. As frequências descrevem esta coleção curada, não todo o universo da IA.`}</p></details>
  </section>;
}
