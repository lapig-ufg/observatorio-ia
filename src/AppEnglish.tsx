import { useNewsSummary } from "./PressSummary";
import { formatPublicDate } from "./dateLabels";
import { PortalHome } from "./PortalHome";
import { PortalFooter } from "./PortalFooter";
import { PortalNavigation } from "./PortalNavigation";
import { portalPage, combineInitiatives } from "./portalStructure";
import { EcosystemPage } from "./EcosystemPage";
import { AboutPageEnglish } from "./AboutPageEnglish";
import { skipToContent, usePageNavigation } from "./usePageNavigation";
import { readingTopic } from "./readingTopics";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadCatalog, type Article, type ArticleType, type CatalogLoadResult, type Initiative } from "./catalog";
import { trackEvent, trackPageView } from "./analytics";
import { DailyNewsPageEnglish } from "./DailyNewsPageEnglish";
import { PortalCollections } from "./PortalDiscovery";
import { TopicRadar } from "./TopicRadar";
import { addedInWindow, radarDateWindow } from "./radarPeriod";
import { defaultCatalogView } from "./discoverySelection";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { matchesCloudTerm } from "./keywordCloud";
import { isPublicResearchPaper, paperResearchArea, paperResearchAreas, type PaperResearchArea } from "./paperResearch";
import { ArticleDetail, CatalogCard, useCatalogExperience } from "./CatalogExperience";
import { MediumReadingsPage } from "./MediumReadingsPage";
import { PanoramaPage } from "./panorama/PanoramaPage";
import { PoliticasIAPage } from "./levantamentos/PoliticasIAPage";

const typeLabels: Record<"all" | ArticleType, string> = {
  all: "All",
  medium: "AI readings",
  documento: "General documents",
  "link-video": "Links and videos",
  audio: "Audio",
  noticia: "News",
  paper: "AI in scientific research",
  apresentacao: "Presentations",
  entrevista: "Interviews",
};



const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "audio", "entrevista", "paper", "apresentacao"];
const filterTypes: Array<"all" | ArticleType> = ["all", ...categoryTypes];
const paperAreaLabels: Record<PaperResearchArea, string> = {
  "Ciências da Vida e Saúde": "Life and Health Sciences",
  "Ciências Humanas, Sociais e Linguística": "Humanities, Social Sciences and Linguistics",
  "Engenharias e Agrárias": "Engineering and Agricultural Sciences",
  "Ciências Exatas e da Terra": "Exact and Earth Sciences",
  "Epistemologia e Metaciência": "Epistemology and Metascience",
  "Fundamentos de IA": "AI Foundations",
};

// O Panorama inglês mora no repositório do próprio Panorama, ao lado do
// português: a página nativa lê as mesmas fontes vivas nos dois idiomas.

const ecosystemFeaturedInitiativesEnglish: Initiative[] = [
  {
    id: "pos-graduacao-sistemas-agentes-inteligentes",
    acronym: "PÓS-AGENTES",
    name: "Lato Sensu Specialization — Graduate Program in Intelligent Systems and Agents",
    summary: "A UFG program focused on building systems with intelligent agents. Held online on Saturdays, it combines 11 courses and a final project.",
    areas: ["Intelligent agents", "AI systems", "Online program", "11 courses + final project"],
    url: "https://agentes.inf.ufg.br/index.html",
    sourceUrl: "https://agentes.inf.ufg.br/index.html",
    color: "azul",
    order: -1,
    actionLabel: "Explore the program",
    // O serviço de favicons retorna 404 para este curso; o ícone padrão já o representa.
    useFavicon: false,
  },
];

const ecosystemInitiativeTranslationsEnglish: Record<string, Pick<Initiative, "name" | "summary" | "areas">> = {
  "ceia-ufg": {
    name: "Center of Excellence in Artificial Intelligence",
    summary: "A UFG innovation hub that develops high-impact solutions using data and artificial intelligence. Founded in 2019, it connects academia, government and companies for research, development and technology transfer.",
    areas: ["Applied research", "Innovation", "Data and AI", "Partnerships"],
  },
  "ciap-ufg": {
    name: "Interinstitutional Collaboration Center for Artificial Intelligence Applied to Public Policy",
    summary: "An interinstitutional initiative dedicated to the responsible use of artificial intelligence to strengthen public policy. It brings together CEPASP/UFG, NEPP/Unicamp and ENCE/IBGE in the Research Network on AI for Public Policy Improvement.",
    areas: ["Public policy", "Knowledge management", "Data and AI", "Interinstitutional cooperation"],
  },
  "bacharelado-ia-inf-ufg": {
    name: "Bachelor's Degree in Artificial Intelligence",
    summary: "An undergraduate program at UFG's Institute of Informatics that prepares professionals to solve complex problems with artificial intelligence, including embedded and autonomous systems. The curriculum combines foundations in computing and mathematics, AI methods and innovation.",
    areas: ["Education", "Computing and mathematics", "Autonomous systems", "Innovation"],
  },
  "pasto-legal": {
    name: "Pasto Legal",
    summary: "An AI platform available through WhatsApp that monitors pasture health using satellite data and field knowledge. It provides real-time information for management decisions as a free, Brazilian open-science initiative.",
    areas: ["AI through WhatsApp", "Satellite data", "Pasture monitoring", "Open science"],
  },
  "cempa-cerrado": {
    name: "Center of Excellence for Environmental Studies, Monitoring and Forecasting in the Cerrado Biome",
    summary: "A UFG center dedicated to environmental studies, monitoring and forecasting for the Cerrado. Its PROPEC model uses machine learning and regional data to estimate rainfall probability and intensity every 30 minutes over a six-hour forecast horizon.",
    areas: ["Environmental monitoring", "Machine learning", "Rainfall forecasting", "Cerrado"],
  },
  "lamcad-ufg": {
    name: "Multiuser High-Performance Computing Laboratory",
    summary: "UFG's multiuser infrastructure for scientific computing, high-performance computing and cloud computing. It supports AI projects with advanced computing capacity, accelerating research in environmental forecasting, health and public policy.",
    areas: ["High-performance computing", "Cloud computing", "Artificial intelligence", "Scientific research"],
  },
  "cerise-ufg": {
    name: "Center of Excellence in Intelligent Wireless Networks and Advanced Services",
    summary: "A center at UFG's School of Electrical, Mechanical and Computer Engineering that combines artificial intelligence, telecommunications, sensing and digital twins to develop technologies with urban impact. It also works in computer vision, autonomous robotics and synthetic-data education.",
    areas: ["5G and beyond-5G networks", "AI and telecommunications", "Digital twins", "Robotics", "Synthetic data"],
  },
  "akcit-ufg": {
    name: "Embrapii Competence Center for Immersive Technologies Applied to Virtual Worlds",
    summary: "A UFG competence center focused on immersive technologies, artificial intelligence and virtual worlds. It conducts applied research and education in generative AI, computer vision, virtual and augmented reality, digital twins and the Internet of Things.",
    areas: ["Generative AI", "Immersive technologies", "Computer vision", "Digital twins", "IoT"],
  },
  "labmol-ufg": {
    name: "Drug Design and Molecular Modeling Laboratory",
    summary: "A laboratory at UFG's School of Pharmacy coordinated by Professor Carolina Horta Andrade. It uses artificial intelligence, machine learning and virtual compound screening to accelerate the discovery of drug candidates and reduce development time and cost.",
    areas: ["Medicinal chemistry", "Drug discovery", "Machine learning", "Virtual screening", "Molecular modeling"],
  },
};

const featuredHistoryEnglish = [
  {
    date: formatPublicDate("2026-10-04", "en") + " – " + formatPublicDate("2026-10-10", "en"),
    source: "UFG-AI Observatory · Curated dossier",
    title: "From intuition to J-Space: patterns, language and reflection",
    summary: "Two readings and a podcast connect implicit pattern recognition, selective representation and deliberate verification without mistaking a functional analogy for consciousness.",
    links: [
      { label: "Intuition and AI", href: "https://semiengineering.com/intuition-and-ai/" },
      { label: "J-Space study", href: "https://transformer-circuits.pub/2026/workspace/index.html" },
      { label: "Listen to the podcast (in Portuguese)", href: "https://drive.google.com/file/d/1ro42roPdwrfXNghWYzhM7n3R1RIiWYr0/view" },
    ],
    eventLabel: "intuition-jspace-patterns-language-reflection",
  },
  {
    date: formatPublicDate("2026-09-27", "en") + " – " + formatPublicDate("2026-10-03", "en"),
    source: "UFG-AI Observatory · Curated dossier",
    title: "AI in science: from tool to agent",
    summary: "A critical synthesis of the shift from analytical tool to scientific agent, connecting discovery, executable manuscripts, creativity, authorship and responsibility.",
    links: [
      { label: "The fifth age of science", href: "https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003230" },
      { label: "Paper2Agent", href: "https://www.nature.com/articles/s41586-026-11044-y" },
      { label: "AI and relativity", href: "https://www.nature.com/articles/d41586-026-02804-x" },
      { label: "The mathematics controversy", href: "https://www.science.org/content/article/how-ai-math-breakthrough-ignited-controversy" },
    ],
    eventLabel: "ai-in-science-from-tool-to-agent",
  },
  {
    date: formatPublicDate("2026-09-19", "en") + " – " + formatPublicDate("2026-09-26", "en"),
    source: "UFG-AI Observatory · Curated dossier",
    title: "AI between alarm and evidence",
    summary: "Four readings on safety, consciousness, social choices and economic scenarios, distinguishing plausible warnings from forecasts and extrapolations.",
    links: [
      { label: "Dario Amodei", href: "https://darioamodei.com/post/we-must-pace-the-frontier" },
      { label: "Mustafa Suleyman", href: "https://mustafa-suleyman.ai/a-warning-about-model-welfare" },
      { label: "Pedro Novaes", href: "https://pnovaes.substack.com/p/sem-apocalipse-ou-redencao" },
      { label: "Anthropic economic scenarios", href: "https://www.anthropic.com/institute/econ-scenarios" },
    ],
    eventLabel: "ai-between-alarm-and-evidence",
  },
  {
    date: formatPublicDate("2026-09-12", "en") + " – " + formatPublicDate("2026-09-19", "en"),
    source: "UFG-AI Observatory · Practical guide",
    title: "Using AI beyond the browser",
    summary: "A step-by-step guide to using AI in the terminal and exploring what agents can do.",
    href: "#panorama",
    eventLabel: "ai-beyond-the-browser",
  },
  {
    date: formatPublicDate("2026-09-05", "en") + " – " + formatPublicDate("2026-09-11", "en"),
    source: "MIT · Education, learning and research",
    title: "AI in education: more than regulating tools",
    summary: "An MIT report on redesigning teaching, assessment and teacher education so AI can support learning without automating it.",
    href: "https://drive.google.com/file/d/1aiDFYVOyyv43PWB9TKzP3xzX85iCVf4s/view?usp=drivesdk",
    eventLabel: "mit-ai-committee-report",
  },
  {
    date: formatPublicDate("2026-08-29", "en") + " – " + formatPublicDate("2026-09-04", "en"),
    source: "Bill Gates · Gates Notes",
    title: "The turbulent age of AI is here. The choices we make now are crucial.",
    summary: "Bill Gates discusses how AI can advance health, education, agriculture and science while urgent public choices remain around work, inequality, safety and childhood.",
    links: [
      { label: "Read the essay", href: "https://www.gatesnotes.com/a-turbulent-ai-era-and-critical-choices-to-make" },
      { label: "Listen to the podcast (in Portuguese)", href: "https://drive.google.com/uc?export=download&id=1Ku_rnntTaz6fotiaAv3kCDRD8X1Mzo7Q" },
    ],
    eventLabel: "gates-turbulent-ai-era-critical-choices",
  },
  {
    date: formatPublicDate("2026-08-22", "en") + " – " + formatPublicDate("2026-08-28", "en"),
    source: "Exclusive interview · UFG-AI Observatory",
    title: "AI, art and design: critical repertoire in a time of transformation",
    summary: "An interview with Marcilon Almeida on how AI is reshaping creative processes without replacing human repertoire, judgment and expression.",
    href: "https://drive.google.com/file/d/1mHCzff-0WYGG146KlpidVwn9_oE-cvZU/view?usp=drivesdk",
    eventLabel: "entrevista-marcilon-almeida-ia-arte-design",
  },
  {
    date: formatPublicDate("2026-08-15", "en") + " – " + formatPublicDate("2026-08-21", "en"),
    source: "Laerte Ferreira · Essay",
    title: "The Geopolitics of AI and National Sovereignty",
    summary: "An essay on technological competition in AI and its consequences for autonomy, infrastructure and national sovereignty.",
    links: [
      { label: "Read the essay (in Portuguese)", href: "https://drive.google.com/file/d/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ/view" },
      { label: "Listen to the podcast (in Portuguese)", href: "https://drive.google.com/uc?export=download&id=1NfkckiNeegn9XtW3NxOsbOFn73MZ6GSq" },
    ],
    eventLabel: "geopolitica-ia-soberania-nacional",
  },
  {
    date: formatPublicDate("2026-08-07", "en") + " – " + formatPublicDate("2026-08-14", "en"),
    source: "Hybrid course · UFG/IESA/CIAMB",
    title: "Understanding and Using Generative AI for Earth Observation Data Processing and Analysis",
    summary: "A course on AI foundations and the practical application of models to remote-sensing image processing and classification.",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w/viewform",
    eventLabel: "curso-ia-generativa-observacao-terra",
  },
  {
    date: formatPublicDate("2026-08-03", "en") + " – " + formatPublicDate("2026-08-06", "en"),
    source: "Folha de S.Paulo · Press observatory",
    title: "AI in the daily news",
    summary: "An editorial reading of Folha de S.Paulo’s coverage of AI across science, work, culture, regulation, territory and the environment.",
    href: "#daily-news",
    eventLabel: "daily-news",
  },
  {
    date: formatPublicDate("2026-07-24", "en") + " – " + formatPublicDate("2026-08-02", "en"),
    source: "Open Weights Ledger · Open letter",
    title: "Open Weights and American AI Leadership",
    summary: "An open letter on open-weight models, competition, cybersecurity, technological autonomy and United States leadership in AI.",
    href: "https://openweights.gitlawb.com/",
    eventLabel: "open-weights-american-ai-leadership",
  },
  {
    date: formatPublicDate("2026-07-20", "en"),
    source: "The Batch · DeepLearning.AI",
    title: "Kimi K3 marks a big shift in AI development; Thinking Machines launches its first general-purpose model",
    summary: "An issue covering model releases, AI agents on Android, Nemotron 3 Embed, NotebookLM and safety.",
    href: "https://charonhub.deeplearning.ai/kimi-k3-marks-a-big-shift-in-ai-development/",
    eventLabel: "the-batch-kimi-k3-thinking-machines",
  },
  {
    date: formatPublicDate("2026-05-29", "en"),
    source: "The Batch · DeepLearning.AI",
    title: "Gemini gets more expensive, European regulation slows down and agents start driving web traffic",
    summary: "An issue on model pricing, changes to the AI Act and the growth of online traffic driven by agents.",
    href: "https://www.deeplearning.ai/the-batch/tag/may-29-2026",
    eventLabel: "the-batch-may-29-2026",
  },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function translatedInitiatives(initiatives: Initiative[]) {
  return combineInitiatives(initiatives.map(initiative => ({ ...initiative, ...ecosystemInitiativeTranslationsEnglish[initiative.id], actionLabel: "Explore initiative (in Portuguese)" })), ecosystemFeaturedInitiativesEnglish);
}

const englishPageFromHash = () => portalPage(window.location.hash, true);

export function AppEnglish() {
  const [route, setRoute] = useState(window.location.hash);
  const [page, setPage] = useState(englishPageFromHash);
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { added, setAdded, query, setQuery, selectedKeyword, setSelectedKeyword, type, setType, theme, setTheme, visible, setVisible, setShowAll, sort, setSort, view, setView, item, filtersOpen, setFiltersOpen, detailHref, openDetail, closeDetail } = useCatalogExperience("all");
  const [showFeaturedHistory, setShowFeaturedHistory] = useState(false);
  const newsSummary = useNewsSummary(page === "home");
  const focusSearch = useRef(false);
  usePageNavigation(route, (!item || route === "#item") && ((page !== "catalog" && page !== "home") || !!catalog || !!error), true, focusSearch);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setRefreshing(true);
      try {
        const result = await loadCatalog(undefined, "en");
        if (active) { setCatalog(result); setLastUpdated(new Date()); setError(""); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "The catalog could not be loaded.");
      } finally { if (active) setRefreshing(false); }
    };
    void refresh();
    trackPageView("/en/", "UFG-AI Observatory — English");
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let trackedRoute = "";
    const syncPage = () => {
      const next = englishPageFromHash();
      setRoute(window.location.hash);
      setPage(next);

      const route = next === "panorama" ? "/en/#panorama" : next === "ecosystem" ? "/en/#ufg-ecosystem" : next === "daily-news" ? "/en/#daily-news" : next === "readings" ? "/en/#ai-readings" : "/en/";
      const pageTitle = next === "catalog" ? "Collection" : next === "about" ? "About" : next === "panorama" ? "Global Generative AI Landscape" : next === "survey" ? "AI policies in scholarly publishing" : next === "ecosystem" ? "UFG AI Ecosystem" : next === "daily-news" ? "AI in the daily news" : next === "readings" ? "AI Readings" : "UFG-AI Observatory";
      const title = `${pageTitle} | LAPIG/UFG`;
      if (window.location.hash !== "#item") document.title = title;
      const current = window.location.hash || "#top";
      if (trackedRoute !== current) { trackPageView(route, title); trackedRoute = current; }
    };
    syncPage();
    for (const event of ["hashchange", "popstate", "observatorio:location"]) window.addEventListener(event, syncPage);
    return () => { for (const event of ["hashchange", "popstate", "observatorio:location"]) window.removeEventListener(event, syncPage); };
  }, []);

  const articles = useMemo(() => (catalog?.articles || [])
    .filter((article) => article.type !== "noticia")
    .filter((article) => article.type !== "paper" || isPublicResearchPaper(article)), [catalog]);
  const counts = useMemo(() => Object.fromEntries(["all", ...categoryTypes].map((key) => [key, key === "all" ? articles.length : articles.filter((article) => article.type === key).length])) as Record<"all" | ArticleType, number>, [articles]);
  const nonPaperThemes = useMemo(() => Array.from(new Set(articles.filter((article) => type === "all" || article.type === type).map((article) => article.type === "paper" ? paperResearchArea(article) || article.theme : article.theme))).sort(), [articles, type]);
  const availableThemes = type === "paper" ? [...paperResearchAreas] : nonPaperThemes;
  const radarWindow = radarDateWindow();

  const orderArticles = useMemo(() => (left: Article, right: Article) =>
    (sort === "published" ? catalogDate(right.publishedAt) - catalogDate(left.publishedAt) : catalogDate(right.includedAt) - catalogDate(left.includedAt)) || newestFirst(left, right), [sort]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return articles.filter((article) => {
      const matchesType = type === "all" || article.type === type;
      const matchesTheme = theme === "all" || (article.type === "paper" ? readingTopic(paperResearchArea(article) || article.theme).id === readingTopic(theme).id : readingTopic(article.theme).id === readingTopic(theme).id);
      const matchesKeyword = !selectedKeyword || matchesCloudTerm(article, selectedKeyword);
      const haystack = normalize([article.title, article.author, article.source, article.theme, article.subtheme, article.summary, ...article.tags].join(" "));
      return (!added || addedInWindow(article, radarWindow)) && matchesType && matchesTheme && matchesKeyword && (!needle || haystack.includes(needle));
    }).sort(orderArticles);
  }, [articles, query, selectedKeyword, theme, type, orderArticles, added, radarWindow.start, radarWindow.end]);

  const displayed = filtered;

  const revealCatalog = () => {
    setSelectedKeyword(""); setAdded("");
    setVisible(6);
    setShowAll(true);
    window.location.hash = "catalog";
    trackEvent("search_from_hero_en", { event_category: "search", event_label: query.trim() || "all" });
    window.requestAnimationFrame(() => document.getElementById("catalog-search")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    setQuery(""); setSelectedKeyword(""); setAdded(""); setType(category); setTheme("all"); setView(defaultCatalogView(category)); setVisible(6); setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById("catalog-search")?.scrollIntoView({ behavior: "smooth" }));
  };
  const reset = () => { setQuery(""); setSelectedKeyword(""); setAdded(""); setType("all"); setTheme("all"); setVisible(6); setShowAll(true); };

  return <main id="top" className="site-shell pt-site-shell">
    <a className="skip-link" href="#page-content" onClick={skipToContent}>Skip to content</a>
    <PortalNavigation english route={route} onSearch={() => {
      focusSearch.current = true; setShowAll(true);
      if (page === "catalog" && !item) { document.getElementById("catalog-search-en")?.focus(); focusSearch.current = false; }
    }} />

    <div id="page-content" tabIndex={-1}>
    {item ? <ArticleDetail article={articles.find((article) => article.id === item)} loading={!catalog && !error} english onClose={closeDetail} /> : page === "about" ? <AboutPageEnglish articles={articles} loaded={!!catalog} /> : page === "panorama" ? <PanoramaPage english /> : page === "survey" ? <PoliticasIAPage english /> : page === "ecosystem" ? <EcosystemPage initiatives={translatedInitiatives(catalog?.initiatives || [])} english /> : page === "daily-news" ? <DailyNewsPageEnglish /> : page === "readings" ? <MediumReadingsPage articles={articles} loading={!catalog && !error} error={error} english detailHref={detailHref} onOpen={openDetail} /> : page === "home" ? <PortalHome english articles={articles} initiatives={translatedInitiatives(catalog?.initiatives || [])} catalog={!!catalog} error={error} query={query} setQuery={setQuery} setSelectedKeyword={setSelectedKeyword} setAdded={setAdded} revealCatalog={revealCatalog} detailHref={detailHref} openDetail={openDetail} featuredHistory={featuredHistoryEnglish} showFeaturedHistory={showFeaturedHistory} setShowFeaturedHistory={setShowFeaturedHistory} newsSummary={newsSummary} /> : <div id="catalog" className="pt-acervo-page">
    <div className="pt-internal-heading"><p className="eyebrow">Selected materials</p><h1 id="acervo-title">Collection</h1><p>Search by title, author, topic or keyword and explore the seven collections.</p></div>
    <PortalCollections articles={articles} type={type} onSelect={selectCategory} onExplore={revealCatalog} english loading={!catalog} />

    <section id="catalog-search" className="search-panel" aria-label="Search the collection">
      <label className="search-field"><Search size={23} /><span className="sr-only">Search the collection</span><input id="catalog-search-en" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setAdded(""); setVisible(6); setShowAll(true); }} placeholder="Search by title, author, summary, topic or keyword" />{query && <button type="button" className="icon-button" onClick={() => { setQuery(""); setSelectedKeyword(""); setAdded(""); }} aria-label="Clear search"><X size={18} /></button>}</label>
      <button className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filter-options" onClick={() => setFiltersOpen(!filtersOpen)}>Filter and sort <ChevronDown size={18} aria-hidden="true" /></button>
      <div id="catalog-filter-options" className={filtersOpen ? "filter-row is-open" : "filter-row"}><div className="type-tabs" role="group" aria-label="Publication type">{filterTypes.map((key) => <button type="button" key={key} className={type === key ? "active" : ""} onClick={() => { setType(key); setView(defaultCatalogView(key)); setTheme("all"); setVisible(6); setShowAll(true); }}>{typeLabels[key]} {catalog && <span>{counts[key]}</span>}</button>)}</div><label className="select-filter"><span className="sr-only">Filter by topic</span><select value={readingTopic(theme).id} onChange={(event) => { setTheme(event.target.value); setVisible(6); setShowAll(true); }}><option value="all">All topics</option>{availableThemes.map((item) => <option key={item} value={readingTopic(item).id}>{paperAreaLabels[item as PaperResearchArea] || readingTopic(item, true).label}</option>)}</select><ChevronDown size={17} /></label></div>
      <div className="catalog-toolbar"><label className="sort-control">Order by <select value={sort} onChange={(event) => { setSort(event.target.value as "added" | "published"); setVisible(6); }}><option value="added">Most recently added</option><option value="published">Most recently published</option></select></label><div hidden={defaultCatalogView(type) !== "cards"} className="view-switch" role="group" aria-label="Display"><button aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button><button aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div></div>
      {(added || query || selectedKeyword || type !== "all" || theme !== "all") && <div className="active-filters" aria-label="Active filters">{added && <button onClick={() => setAdded("")}>Added in the last 7 days ×</button>}{query && <button onClick={() => { setQuery(""); setSelectedKeyword(""); setAdded(""); }}>Search: {query} ×</button>}{selectedKeyword && <button onClick={() => setSelectedKeyword("")}>Topic: {selectedKeyword} ×</button>}{type !== "all" && <button onClick={() => { setType("all"); setTheme("all"); }}>{typeLabels[type]} ×</button>}{theme !== "all" && <button onClick={() => setTheme("all")}>{type === "paper" ? paperAreaLabels[theme as PaperResearchArea] || readingTopic(theme, true).label : readingTopic(theme, true).label} ×</button>}<button onClick={reset}>Clear all</button></div>}
      <div className={`sync-line ${catalog?.warning ? "has-warning" : ""}`} aria-live="polite"><span>{catalog?.source === "google-sheets" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{catalog?.warning || (lastUpdated ? `Catalog synchronized at ${lastUpdated.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}` : "Loading catalog")}</span><button type="button" onClick={() => window.location.reload()} title="Refresh catalog" aria-label="Refresh catalog"><RefreshCw size={15} className={refreshing ? "spinning" : ""} /></button></div>
    </section>

    {error ? <section className="empty-state" role="alert"><FileText size={30} /><h2>Catalog unavailable</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></section> : !catalog ? <section className="loading-state" aria-live="polite"><LoaderCircle className="spinning" size={28} /><span>Loading collection…</span></section> : <><section className="results-heading" aria-live="polite"><div><p className="eyebrow">Collection</p><h2>{`${displayed.length} ${displayed.length === 1 ? "item found" : "items found"}`}</h2></div>{(query || type !== "all" || theme !== "all") && <button type="button" className="clear-filters" onClick={reset}><X size={16} /> Clear filters</button>}</section>{displayed.length ? <div className={`article-grid view-${defaultCatalogView(type) === "cards" ? view : "list"}`}>{displayed.slice(0, visible).map((article) => <CatalogCard key={article.id} article={article} english layout={defaultCatalogView(type) === "cards" ? view : "list"} href={detailHref(article.id)} onOpen={openDetail} />)}</div> : <section className="empty-state"><Search size={30} /><h2>No items found</h2><p>Try another term or remove the filters.</p><button type="button" onClick={reset}>View full collection</button></section>}{visible < displayed.length && <button type="button" className="load-more" onClick={() => { const first = displayed[visible]; setVisible(value => value + 6); requestAnimationFrame(() => { const link = document.getElementById(`summary-${first?.id}`); link?.focus({ preventScroll: true }); link?.closest("article")?.scrollIntoView({ block: "start", behavior: "instant" }); }); }}>Load more items</button>}</>}
    {articles.length > 0 && <TopicRadar articles={articles} selected={selectedKeyword} english onSelect={(label, period) => { setAdded(period === "7d" ? "7d" : ""); setQuery(""); setSelectedKeyword(label); setType("all"); setTheme("all"); setVisible(6); setShowAll(true); requestAnimationFrame(() => document.getElementById("catalog-search")?.scrollIntoView({ behavior: "smooth" })); }} />}

</div>}
    </div>

    <PortalFooter english />
  </main>;
}
