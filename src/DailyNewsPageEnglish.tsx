import { CalendarDays, ChevronDown, ExternalLink, Filter, LoaderCircle, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "./analytics";
import { loadFolhaIndex, loadFolhaYear, type FolhaArticle, type FolhaIndex } from "./folha";
import { englishSectionGroup, englishSourceSection } from "./folhaEnglish";

type Period = "30d" | "all" | number;

const themes: Record<string, string> = {
  "Modelos, produtos e empresas": "Models, products and companies",
  "Sociedade e vida cotidiana": "Society and everyday life",
  "Trabalho, economia e profissões": "Work, economy and professions",
  "Educação, cultura e comunicação": "Education, culture and communication",
  "Infraestrutura, dados e geopolítica": "Infrastructure, data and geopolitics",
  "Ciência, saúde e ambiente": "Science, health and environment",
  "Regulação, direitos e governança": "Regulation, rights and governance",
  "Segurança, fraudes e plataformas": "Security, fraud and platforms",
};
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

function cutoffDate(lastDate: string, period: Period) {
  if (period !== "30d") return "";
  const date = new Date(`${lastDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}

function yearsForPeriod(lastDate: string, availableYears: number[], period: Period) {
  if (period === "all") return availableYears;
  if (period !== "30d") return [period];
  const cutoff = cutoffDate(lastDate, period);
  return [...new Set([Number(lastDate.slice(0, 4)), Number(cutoff.slice(0, 4))])].filter((year) => availableYears.includes(year));
}

export function DailyNewsPageEnglish() {
  const [index, setIndex] = useState<FolhaIndex | null>(null);
  const [records, setRecords] = useState<FolhaArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [theme, setTheme] = useState("todos");
  const [section, setSection] = useState("todos");
  const [stars, setStars] = useState("todas");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(18);

  useEffect(() => {
    const controller = new AbortController();
    void loadFolhaIndex(controller.signal).then(setIndex).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "The news archive could not be loaded.");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!index) return;
    const controller = new AbortController();
    setLoadingRecords(true);
    void Promise.all(yearsForPeriod(index.lastDate, index.years, period).map((year) => loadFolhaYear(year, controller.signal)))
      .then((years) => { setRecords(years.flat()); setError(""); })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "The selected period could not be loaded."); })
      .finally(() => setLoadingRecords(false));
    return () => controller.abort();
  }, [index, period]);

  const relevantRecords = useMemo(() => {
    if (!index) return [];
    const cutoff = cutoffDate(index.lastDate, period);
    const needle = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return records.filter((article) => {
      const inPeriod = period === "all" || (period === "30d" ? article.date >= cutoff : article.date.startsWith(`${period}-`));
      const haystack = `${article.title} ${article.section} ${article.theme} ${englishSectionGroup(article.sectionGroup)} ${themes[article.theme] || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return inPeriod && (theme === "todos" || article.theme === theme) && (section === "todos" || article.sectionGroup === section)
        && (stars === "todas" || article.stars === Number(stars)) && (!needle || haystack.includes(needle));
    }).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "pt-BR"));
  }, [index, period, query, records, section, stars, theme]);
  const timeline = useMemo(() => {
    if (!index) return [];
    const cutoff = cutoffDate(index.lastDate, period);
    return index.monthly.filter(({ month }) => period === "all" || (period === "30d" ? month >= cutoff.slice(0, 7) : month.startsWith(`${period}-`)));
  }, [index, period]);
  const maximum = Math.max(...timeline.map(({ count }) => count), 1);
  const reset = () => { setPeriod("30d"); setTheme("todos"); setSection("todos"); setStars("todas"); setQuery(""); setVisible(18); trackEvent("daily_news_clear_filters_en"); };
  const hasFilters = period !== "30d" || theme !== "todos" || section !== "todos" || stars !== "todas" || Boolean(query);

  if (loading) return <section className="daily-news-loading" aria-live="polite"><LoaderCircle className="spinning" size={28} /> Loading the news archive…</section>;
  if (error || !index) return <section className="daily-news-unavailable"><p className="eyebrow">News observatory</p><h1>AI in the daily news</h1><p>{error || "The archive is being prepared."}</p></section>;

  return <section className="daily-news-page" aria-labelledby="daily-news-title">
    <header className="daily-news-hero"><div><p className="eyebrow">Folha de S.Paulo · News observatory</p><h1 id="daily-news-title">AI in the daily news</h1><p>Explore how Brazilian news coverage of artificial intelligence has changed over time. Every article links to its original source.</p></div><aside className="daily-news-source-note"><strong>About the links</strong><span>Full access may require a Folha subscription. Original Portuguese headlines are retained so readers can find the source accurately.</span></aside></header>
    <div className="daily-news-metrics" aria-label="Archive overview"><div><strong>{index.daysCovered.toLocaleString("en-US")}</strong><span>days covered</span></div><div><strong>{index.articleCount.toLocaleString("en-US")}</strong><span>articles cataloged</span></div><div><strong>{dateLabel(index.lastDate)}</strong><span>latest recorded article</span></div></div>
    <section className="daily-news-reading" aria-labelledby="daily-news-reading-title"><header className="daily-news-reading-heading"><p className="eyebrow">Reading the archive</p><h2 id="daily-news-reading-title">What changed over {index.daysCovered.toLocaleString("en-US")} days of AI coverage</h2><p>An editorial reading of {index.articleCount.toLocaleString("en-US")} Folha de S.Paulo articles from November 2022 to the most recent entry.</p></header>
      <div className="daily-news-reading-method"><h3>How the series is curated</h3><p>This is a curated selection from searches about artificial intelligence on Folha’s website. Brief mentions, unrelated reviews, sponsored material and duplicates are removed. Dates, editorial areas, original headlines and source links remain available.</p><p>One to five stars indicate editorial relevance. The timeline and topic filters help readers examine the long-running series without losing access to individual articles.</p></div>
      <div className="daily-news-reading-phases" aria-label="Phases of news coverage"><article><p className="eyebrow">November 2022 to June 2023</p><h3>The awakening</h3><p>Coverage shifted from scattered applications to a broad public debate after ChatGPT launched. Safety warnings, regulation, labor disputes, culture and technology markets brought AI into the daily news.</p></article><article><p className="eyebrow">July 2023 to December 2024</p><h3>Institutions and early fractures</h3><p>OpenAI’s governance crisis, copyright disputes, deepfakes, regulation and public-sector use became recurring themes. The series also documents environmental applications, from satellite methane monitoring to wildfire prediction and weather forecasting.</p></article><article><p className="eyebrow">January 2025 onward</p><h3>Competition, infrastructure and uncertainty</h3><p>DeepSeek, data centers, sovereign AI, election campaigns and investment concerns shaped the debate. The archive follows both promised productivity gains and the social, environmental and political costs of deployment.</p></article></div>
      <div className="daily-news-reading-thread"><h3>A thread across the whole series</h3><p>Three tensions recur: concentrated power, consequences for rights and everyday life, and AI’s growing presence in physical territory and the environment. The archive also follows the energy and water demands of AI infrastructure.</p></div>
    </section>
    <section className="daily-news-timeline" aria-labelledby="daily-news-timeline-title"><div className="daily-news-section-heading"><div><p className="eyebrow">Timeline</p><h2 id="daily-news-timeline-title">AI in the news</h2></div><p>Monthly article counts show the pace of coverage in the selected period.</p></div><div className="daily-news-periods" role="group" aria-label="Analysis period"><button type="button" className={period === "30d" ? "active" : ""} onClick={() => { setPeriod("30d"); setVisible(18); }}>Last 30 days</button><label className={`daily-news-year-picker ${typeof period === "number" ? "active" : ""}`}><span className="sr-only">Select a year</span><select value={typeof period === "number" ? String(period) : ""} onChange={(event) => { const year = Number(event.target.value); if (year) { setPeriod(year); setVisible(18); } }}><option value="" disabled>Select a year</option>{index.years.map((year) => <option value={year} key={year}>{year}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><button type="button" className={period === "all" ? "active" : ""} onClick={() => { setPeriod("all"); setVisible(18); }}>Full period</button></div><div className="daily-news-timeline-bars" aria-label="Articles per month">{timeline.map(({ month, count }) => <div key={month} className="daily-news-month"><span className="daily-news-month-label">{monthLabel(month)}</span><span className="daily-news-month-track"><span style={{ width: `${count / maximum * 100}%` }} /></span><strong>{count}</strong></div>)}</div></section>
    <section className="daily-news-explorer" aria-labelledby="daily-news-results-title"><aside className="daily-news-filters"><div className="daily-news-filter-title"><Filter size={17} aria-hidden="true" /><strong>Filter articles</strong></div><label className="daily-news-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search headlines or topics</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(18); }} placeholder="Search headlines or topics" /></label><label className="daily-news-select"><span>Topic</span><select value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(18); }}><option value="todos">All topics</option>{index.themes.map((item) => <option value={item.label} key={item.label}>{themes[item.label] || item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><label className="daily-news-select"><span>Coverage area</span><select value={section} onChange={(event) => { setSection(event.target.value); setVisible(18); }}><option value="todos">All areas</option>{index.sections.map((item) => <option value={item.label} key={item.label}>{englishSectionGroup(item.label)} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><label className="daily-news-select"><span>Editorial relevance</span><select value={stars} onChange={(event) => { setStars(event.target.value); setVisible(18); }}><option value="todas">All ratings</option>{[5, 4, 3, 2, 1, 0].map((count) => <option value={count} key={count}>{count ? `${"★".repeat(count)} (${count} ${count === 1 ? "star" : "stars"})` : "Unrated"}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>{hasFilters && <button type="button" className="daily-news-clear" onClick={reset}><X size={15} /> Clear filters</button>}</aside>
      <div className="daily-news-results"><div className="daily-news-results-heading"><div><p className="eyebrow">Matching articles</p><h2 id="daily-news-results-title">{loadingRecords ? "Loading period…" : `${relevantRecords.length.toLocaleString("en-US")} ${relevantRecords.length === 1 ? "article" : "articles"}`}</h2></div><span><CalendarDays size={16} aria-hidden="true" /> {period === "30d" ? "recent selection" : period === "all" ? "full archive" : `year ${period}`}</span></div>{relevantRecords.length ? <ol className="daily-news-list">{relevantRecords.slice(0, visible).map((article) => <li key={article.id}><div className="daily-news-record-meta"><time dateTime={article.date}>{dateLabel(article.date)}</time><span>{englishSourceSection(article.section, article.sectionGroup)}</span>{article.stars ? <span className="daily-news-stars" aria-label={`${article.stars} out of 5 stars`}>{Array.from({ length: article.stars }, (_, i) => <Star key={i} size={13} fill="currentColor" aria-hidden="true" />)}</span> : <span className="daily-news-no-stars">Unrated</span>}</div><h3 lang="pt-BR">{article.title}</h3><div className="daily-news-record-footer"><span>{themes[article.theme] || article.theme}</span><a href={article.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("daily_news_open_article_en", { event_category: "outbound", event_label: article.id })}>Read at Folha <ExternalLink size={15} aria-hidden="true" /></a></div></li>)}</ol> : <div className="daily-news-empty"><Search size={25} /><strong>No articles in this selection</strong><p>Adjust the filters or choose another period.</p></div>}{visible < relevantRecords.length && <button type="button" className="daily-news-more" onClick={() => setVisible((value) => value + 18)}>Load more articles</button>}</div>
    </section>
  </section>;
}
