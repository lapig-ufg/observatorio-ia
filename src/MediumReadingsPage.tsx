import { BookOpen, CalendarDays, ChevronDown, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { useMemo, type MouseEvent } from "react";
import { useArchiveFilters, ShareSearch, ArchiveFilterDetails } from "./ArchiveControls";
import { matchesSearch } from "./archiveSearch";
import { readingTopic, readingSubtopic } from "./readingTopics";
import { WeeklyDigest } from "./WeeklyDigest";
import type { Article } from "./catalog";
import { CatalogCard } from "./CatalogExperience";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { trackEvent } from "./analytics";
import { formatPublicDate } from "./dateLabels";

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
  return readingTopic(article.theme, english).label;
}

function formatReadingDate(article: Article, english: boolean) {
  const value = catalogDate(article.publishedAt) ? article.publishedAt : article.includedAt;
  return value ? formatPublicDate(value, english ? "en" : "pt") : english ? "Date not available" : "Data não informada";
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
  const all = "all";
  const [filters, setFilter] = useArchiveFilters("readings", { q: "", theme: all, subtheme: all, year: all, sort: "published-newest", limit: "6" });
  const { q: query, theme, subtheme, year, sort } = filters;
  const setQuery = (value: string) => setFilter("q", value);
  const setTheme = (value: string) => setFilter("theme", value);
  const setSubtheme = (value: string) => setFilter("subtheme", value);
  const setYear = (value: string) => setFilter("year", value);
  const setSort = (value: string) => setFilter("sort", value);
  // A ficha desmonta esta página; o limite próprio na URL preserva a lista de origem.
  const visible = Math.min(10000, Math.max(6, Number(filters.limit) || 6));
  const setVisible = (value: number | ((previous: number) => number)) => setFilter("limit", String(typeof value === "function" ? value(visible) : value));

  const readings = useMemo(() => articles.filter((article) => article.type === "medium"), [articles]);
  const themes = useMemo(() => countedOptions(readings.map((article) => readingTheme(article, english))), [readings, english]);
  const subthemes = useMemo(() => countedOptions(readings
    .filter((article) => theme === all || readingTopic(article.theme).id === readingTopic(theme).id)
    .map((article) => readingSubtopic(article.subtheme, english).label)), [readings, theme, all, english]);
  const years = useMemo(() => countedOptions(readings.map(readingYear))
    .sort((left, right) => Number(right.label) - Number(left.label)), [readings]);

  const filtered = useMemo(() => {
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
      return (theme === all || readingTopic(article.theme).id === readingTopic(theme).id)
        && (subtheme === all || readingSubtopic(article.subtheme).id === readingSubtopic(subtheme).id)
        && (year === all || readingYear(article) === year)
        && matchesSearch(haystack, query);
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
    setVisible(6);
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

    <WeeklyDigest collection="medium" english={english} />
    <section className="readings-explorer" aria-labelledby="readings-results-title">
      <aside className="readings-filters">
        <div className="readings-filter-title"><Search size={18} aria-hidden="true" /><strong>{english ? "Filter readings" : "Filtrar leituras"}</strong></div>
        <label className="readings-search"><span className="sr-only">{english ? "Search title, author or keyword" : "Buscar título, autor ou palavra-chave"}</span><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(6); }} placeholder={english ? "Title, author or keyword" : "Título, autor ou palavra-chave"} />{query && <button type="button" onClick={() => setQuery("")} aria-label={english ? "Clear search" : "Limpar busca"}><X size={16} /></button>}</label>
        <ArchiveFilterDetails label={english ? "Topics, dates and order" : "Assuntos, datas e ordenação"}>
        <label className="readings-select"><span>{english ? "Topic" : "Assunto"}</span><select value={readingTopic(theme).id} onChange={(event) => { setTheme(event.target.value); setSubtheme(all); setVisible(6); }}><option value={all}>{english ? "All topics" : "Todos os assuntos"}</option>{themes.map((item) => <option value={readingTopic(item.label).id} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Subtopic" : "Subtema"}</span><select value={readingSubtopic(subtheme).id} onChange={(event) => { setSubtheme(event.target.value); setVisible(6); }}><option value={all}>{english ? "All subtopics" : "Todos os subtemas"}</option>{subthemes.map((item) => <option value={readingSubtopic(item.label).id} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Publication year" : "Ano de publicação"}</span><select value={year} onChange={(event) => { setYear(event.target.value); setVisible(6); }}><option value={all}>{english ? "All years" : "Todos os anos"}</option>{years.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="readings-select"><span>{english ? "Order" : "Ordenação"}</span><select value={sort} onChange={(event) => { setSort(event.target.value as ReadingSort); setVisible(6); }}><option value="published-newest">{english ? "Newest publications" : "Publicações mais recentes"}</option><option value="published-oldest">{english ? "Oldest publications" : "Publicações mais antigas"}</option><option value="added-newest">{english ? "Recently added" : "Inclusões mais recentes"}</option><option value="title">{english ? "Title A–Z" : "Título A–Z"}</option></select><ChevronDown size={16} aria-hidden="true" /></label>
        </ArchiveFilterDetails>
        {hasFilters && <button type="button" className="readings-clear" onClick={reset}><X size={15} /> {english ? "Clear filters" : "Limpar filtros"}</button>}
      </aside>

      <div className="readings-results">
        <div className="readings-results-heading"><div><p className="eyebrow">{english ? "Matching readings" : "Leituras encontradas"}</p><h2 id="readings-results-title">{filtered.length.toLocaleString(english ? "en-US" : "pt-BR")} {english ? (filtered.length === 1 ? "text" : "texts") : (filtered.length === 1 ? "texto" : "textos")}</h2></div><span><CalendarDays size={16} aria-hidden="true" /> {year === all ? (english ? "all dates" : "todas as datas") : year}</span></div>
        <ShareSearch english={english} />{filtered.length ? <div className="article-grid readings-card-grid view-list">{filtered.slice(0, visible).map((article) => <div className="reading-card-wrap" key={article.id}><p className="reading-card-date">{formatReadingDate(article, english)}</p><CatalogCard article={article} english={english} layout="list" href={detailHref(article.id)} onOpen={onOpen} /></div>)}</div> : <div className="readings-empty"><Search size={28} aria-hidden="true" /><strong>{english ? "No reading found" : "Nenhuma leitura encontrada"}</strong><p>{english ? "Try another term or remove the filters." : "Tente outro termo ou remova os filtros."}</p><button type="button" onClick={reset}>{english ? "View the full collection" : "Ver toda a coleção"}</button></div>}
        {visible < filtered.length && <button type="button" className="load-more readings-load-more" onClick={() => setVisible((value) => value + 6)}>{english ? "Load more readings" : "Carregar mais leituras"}</button>}
      </div>
    </section>
  </section>;
}
