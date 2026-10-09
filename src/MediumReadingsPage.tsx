import { BookOpen, CalendarDays, ChevronDown, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import type { Article } from "./catalog";
import { CatalogCard } from "./CatalogExperience";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { trackEvent } from "./analytics";

type ReadingSort = "published-newest" | "published-oldest" | "added-newest" | "title";

type MediumReadingsPageProps = {
  articles: Article[];
  loading: boolean;
  error: string;
  english?: boolean;
  detailHref: (id: string) => string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function readingTimestamp(article: Article) {
  return catalogDate(article.publishedAt) || catalogDate(article.includedAt);
}

function readingYear(article: Article) {
  const timestamp = readingTimestamp(article);
  return timestamp ? String(new Date(timestamp).getUTCFullYear()) : "";
}

function readingTheme(article: Article, english: boolean) {
  const value = article.theme.trim();
  if (english && /^agents,\s*racs?\s+and\s+applications$/i.test(value)) {
    return "Agents, RAG and applications";
  }
  return value;
}

function formatReadingDate(article: Article, english: boolean) {
  const timestamp = readingTimestamp(article);
  if (!timestamp) return english ? "Date not available" : "Data não informada";
  return new Intl.DateTimeFormat(english ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function countedOptions(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function Metric({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return <div><Icon size={19} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>;
}

export function MediumReadingsPage({ articles, loading, error, english = false, detailHref, onOpen }: MediumReadingsPageProps) {
  const all = english ? "all" : "todos";
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(all);
  const [subtheme, setSubtheme] = useState(all);
  const [year, setYear] = useState(all);
  const [sort, setSort] = useState<ReadingSort>("published-newest");
  const [visible, setVisible] = useState(18);

  const readings = useMemo(() => articles.filter((article) => article.type === "medium"), [articles]);
  const themes = useMemo(() => countedOptions(readings.map((article) => readingTheme(article, english))), [readings, english]);
  const subthemes = useMemo(() => countedOptions(readings
    .filter((article) => theme === all || readingTheme(article, english) === theme)
    .map((article) => article.subtheme)), [readings, theme, all, english]);
  const years = useMemo(() => countedOptions(readings.map(readingYear))
    .sort((left, right) => Number(right.label) - Number(left.label)), [readings]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return readings.filter((article) => {
      const haystack = normalize([
        article.title,
        article.author,
        article.source,
        article.theme,
        readingTheme(article, english),
        article.subtheme,
        article.summary,
        ...article.tags,
      ].join(" "));
      return (theme === all || readingTheme(article, english) === theme)
        && (subtheme === all || article.subtheme === subtheme)
        && (year === all || readingYear(article) === year)
        && (!needle || haystack.includes(needle));
    }).sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, english ? "en" : "pt-BR");
      if (sort === "published-oldest") return readingTimestamp(left) - readingTimestamp(right) || left.title.localeCompare(right.title);
      if (sort === "added-newest") return catalogDate(right.includedAt) - catalogDate(left.includedAt) || newestFirst(left, right);
      return readingTimestamp(right) - readingTimestamp(left) || newestFirst(left, right);
    });
  }, [all, english, query, readings, sort, subtheme, theme, year]);

  const datedYears = years.map(({ label }) => Number(label)).filter(Number.isFinite);
  const coverage = datedYears.length
    ? datedYears.length === 1 ? String(datedYears[0]) : `${Math.min(...datedYears)}–${Math.max(...datedYears)}`
    : "—";
  const hasFilters = Boolean(query || theme !== all || subtheme !== all || year !== all || sort !== "published-newest");
  const reset = () => {
    setQuery("");
    setTheme(all);
    setSubtheme(all);
    setYear(all);
    setSort("published-newest");
    setVisible(18);
    trackEvent(english ? "ai_readings_clear_filters_en" : "ai_readings_clear_filters");
  };

  if (loading) return <section className="readings-loading" aria-live="polite"><LoaderCircle className="spinning" size={28} /> {english ? "Loading curated readings…" : "Carregando leituras selecionadas…"}</section>;
  if (error && !readings.length) return <section className="readings-unavailable" role="alert"><p className="eyebrow">{english ? "Curated collection" : "Coleção curada"}</p><h1>{english ? "AI Readings" : "Leituras em IA"}</h1><p>{error}</p></section>;

  return <section className="readings-page" aria-labelledby="readings-title">
    <header className="readings-hero">
      <div>
        <p className="eyebrow">{english ? "Articles and essays · UFG editorial curation" : "Artigos e ensaios · curadoria editorial UFG"}</p>
        <h1 id="readings-title">{english ? "AI Readings" : "Leituras em IA"}</h1>
        <p>{english
          ? "Explore selected articles and essays on artificial intelligence. Search the collection by publication date, topic, author or keyword, with direct access to each original text."
          : "Explore artigos e ensaios selecionados sobre inteligência artificial. Consulte a coleção por data de publicação, assunto, autoria ou palavra-chave, com acesso direto a cada texto original."}</p>
      </div>
      <aside className="readings-source-note">
        <BookOpen size={22} aria-hidden="true" />
        <div><strong>{english ? "About this collection" : "Sobre a coleção"}</strong><span>{english
          ? "The Observatory provides editorial summaries. The full texts remain with their original publishers, predominantly on Medium, and may require an account."
          : "O Observatório oferece resumos editoriais. Os textos integrais permanecem nas publicações de origem, predominantemente no Medium, e podem exigir uma conta."}</span></div>
      </aside>
    </header>

    <div className="readings-metrics" aria-label={english ? "Collection overview" : "Visão geral da coleção"}>
      <Metric icon={BookOpen} value={readings.length.toLocaleString(english ? "en-US" : "pt-BR")} label={english ? "curated readings" : "leituras selecionadas"} />
      <Metric icon={Search} value={themes.length.toLocaleString(english ? "en-US" : "pt-BR")} label={english ? "main topics" : "assuntos principais"} />
      <Metric icon={CalendarDays} value={coverage} label={english ? "publication period" : "período das publicações"} />
    </div>

    <section className="readings-explorer" aria-labelledby="readings-results-title">
      <aside className="readings-filters">
        <div className="readings-filter-title"><Search size={18} aria-hidden="true" /><strong>{english ? "Filter readings" : "Filtrar leituras"}</strong></div>
        <label className="readings-search"><span className="sr-only">{english ? "Search title, author or keyword" : "Buscar título, autor ou palavra-chave"}</span><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(18); }} placeholder={english ? "Title, author or keyword" : "Título, autor ou palavra-chave"} />{query && <button type="button" onClick={() => setQuery("")} aria-label={english ? "Clear search" : "Limpar busca"}><X size={16} /></button>}</label>
        <label className="readings-select"><span>{english ? "Topic" : "Assunto"}</span><select value={theme} onChange={(event) => { setTheme(event.target.value); setSubtheme(all); setVisible(18); }}><option value={all}>{english ? "All topics" : "Todos os assuntos"}</option>{themes.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Subtopic" : "Subtema"}</span><select value={subtheme} onChange={(event) => { setSubtheme(event.target.value); setVisible(18); }}><option value={all}>{english ? "All subtopics" : "Todos os subtemas"}</option>{subthemes.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Publication year" : "Ano de publicação"}</span><select value={year} onChange={(event) => { setYear(event.target.value); setVisible(18); }}><option value={all}>{english ? "All years" : "Todos os anos"}</option>{years.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Order" : "Ordenação"}</span><select value={sort} onChange={(event) => { setSort(event.target.value as ReadingSort); setVisible(18); }}><option value="published-newest">{english ? "Newest publications" : "Publicações mais recentes"}</option><option value="published-oldest">{english ? "Oldest publications" : "Publicações mais antigas"}</option><option value="added-newest">{english ? "Recently added" : "Inclusões mais recentes"}</option><option value="title">{english ? "Title A–Z" : "Título A–Z"}</option></select><ChevronDown size={16} aria-hidden="true" /></label>
        {hasFilters && <button type="button" className="readings-clear" onClick={reset}><X size={15} /> {english ? "Clear filters" : "Limpar filtros"}</button>}
      </aside>

      <div className="readings-results">
        <div className="readings-results-heading"><div><p className="eyebrow">{english ? "Matching readings" : "Leituras encontradas"}</p><h2 id="readings-results-title">{filtered.length.toLocaleString(english ? "en-US" : "pt-BR")} {english ? (filtered.length === 1 ? "text" : "texts") : (filtered.length === 1 ? "texto" : "textos")}</h2></div><span><CalendarDays size={16} aria-hidden="true" /> {year === all ? (english ? "all dates" : "todas as datas") : year}</span></div>
        {filtered.length ? <div className="article-grid readings-card-grid">{filtered.slice(0, visible).map((article) => <div className="reading-card-wrap" key={article.id}><p className="reading-card-date">{formatReadingDate(article, english)}</p><CatalogCard article={article} english={english} href={detailHref(article.id)} onOpen={onOpen} /></div>)}</div> : <div className="readings-empty"><Search size={28} aria-hidden="true" /><strong>{english ? "No reading found" : "Nenhuma leitura encontrada"}</strong><p>{english ? "Try another term or remove the filters." : "Tente outro termo ou remova os filtros."}</p><button type="button" onClick={reset}>{english ? "View the full collection" : "Ver toda a coleção"}</button></div>}
        {visible < filtered.length && <button type="button" className="load-more readings-load-more" onClick={() => setVisible((value) => value + 18)}>{english ? "Load more readings" : "Carregar mais leituras"}</button>}
      </div>
    </section>
  </section>;
}
