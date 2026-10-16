import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LoaderCircle,
  Menu,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl, loadCatalog, type Article, type ArticleType, type CatalogLoadResult, type Initiative } from "./catalog";
import { trackEvent, trackPageView } from "./analytics";
import { DailyNewsPageEnglish } from "./DailyNewsPageEnglish";
import { FeaturedDebate } from "./FeaturedDebate";
import { PortalCollections, RecentDiscovery } from "./PortalDiscovery";
import { TopicRadar } from "./TopicRadar";
import { addedInWindow, radarDateWindow } from "./radarPeriod";
import { NavigationMore } from "./NavigationMore";
import { defaultCatalogView } from "./discoverySelection";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { matchesCloudTerm } from "./keywordCloud";
import { isPublicResearchPaper, paperResearchArea, paperResearchAreas, type PaperResearchArea } from "./paperResearch";
import { languageUrl } from "./locale";
import { ArticleDetail, CatalogCard, InstitutionalBand, useCatalogExperience } from "./CatalogExperience";
import { MediumReadingsPage } from "./MediumReadingsPage";
import { PanoramaPage } from "./panorama/PanoramaPage";

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
    date: "4–10 October 2026",
    source: "UFG-AI Observatory · Curated dossier",
    title: "From intuition to J-Space: patterns, language and reflection",
    summary: "Two readings and a podcast connect implicit pattern recognition, selective representation and deliberate verification without mistaking a functional analogy for consciousness.",
    links: [
      { label: "Intuition and AI", href: "https://semiengineering.com/intuition-and-ai/" },
      { label: "J-Space study", href: "https://transformer-circuits.pub/2026/workspace/index.html" },
      { label: "Listen to the podcast (PT)", href: "https://drive.google.com/file/d/1ro42roPdwrfXNghWYzhM7n3R1RIiWYr0/view" },
    ],
    eventLabel: "intuition-jspace-patterns-language-reflection",
  },
  {
    date: "27 September–3 October 2026",
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
    date: "19–26 September 2026",
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
    date: "12–19 September 2026",
    source: "UFG-AI Observatory · Practical guide",
    title: "Using AI beyond the browser",
    summary: "A step-by-step guide to using AI in the terminal and exploring what agents can do.",
    href: "#panorama",
    eventLabel: "ai-beyond-the-browser",
  },
  {
    date: "5–11 September 2026",
    source: "MIT · Education, learning and research",
    title: "AI in education: more than regulating tools",
    summary: "An MIT report on redesigning teaching, assessment and teacher education so AI can support learning without automating it.",
    href: "https://drive.google.com/file/d/1aiDFYVOyyv43PWB9TKzP3xzX85iCVf4s/view?usp=drivesdk",
    eventLabel: "mit-ai-committee-report",
  },
  {
    date: "29 August–4 September 2026",
    source: "Bill Gates · Gates Notes",
    title: "The turbulent age of AI is here. The choices we make now are crucial.",
    summary: "Bill Gates discusses how AI can advance health, education, agriculture and science while urgent public choices remain around work, inequality, safety and childhood.",
    links: [
      { label: "Read the essay", href: "https://www.gatesnotes.com/a-turbulent-ai-era-and-critical-choices-to-make" },
      { label: "Listen to the podcast (PT)", href: "https://drive.google.com/uc?export=download&id=1Ku_rnntTaz6fotiaAv3kCDRD8X1Mzo7Q" },
    ],
    eventLabel: "gates-turbulent-ai-era-critical-choices",
  },
  {
    date: "22–28 August 2026",
    source: "Exclusive interview · UFG-AI Observatory",
    title: "AI, art and design: critical repertoire in a time of transformation",
    summary: "An interview with Marcilon Almeida on how AI is reshaping creative processes without replacing human repertoire, judgment and expression.",
    href: "https://drive.google.com/file/d/1mHCzff-0WYGG146KlpidVwn9_oE-cvZU/view?usp=drivesdk",
    eventLabel: "entrevista-marcilon-almeida-ia-arte-design",
  },
  {
    date: "15–21 August 2026",
    source: "Laerte Ferreira · Essay",
    title: "The Geopolitics of AI and National Sovereignty",
    summary: "An essay on technological competition in AI and its consequences for autonomy, infrastructure and national sovereignty.",
    links: [
      { label: "Read the essay (PT)", href: "https://drive.google.com/file/d/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ/view" },
      { label: "Listen to the podcast (PT)", href: "https://drive.google.com/uc?export=download&id=1NfkckiNeegn9XtW3NxOsbOFn73MZ6GSq" },
    ],
    eventLabel: "geopolitica-ia-soberania-nacional",
  },
  {
    date: "7–14 August 2026",
    source: "Hybrid course · UFG/IESA/CIAMB",
    title: "Understanding and Using Generative AI for Earth Observation Data Processing and Analysis",
    summary: "A course on AI foundations and the practical application of models to remote-sensing image processing and classification.",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w/viewform",
    eventLabel: "curso-ia-generativa-observacao-terra",
  },
  {
    date: "3–6 August 2026",
    source: "Folha de S.Paulo · Press observatory",
    title: "AI in the daily news",
    summary: "An editorial reading of Folha de S.Paulo’s coverage of AI across science, work, culture, regulation, territory and the environment.",
    href: "../#ia-como-noticia-diaria",
    eventLabel: "daily-news",
  },
  {
    date: "24 July–2 August 2026",
    source: "Open Weights Ledger · Open letter",
    title: "Open Weights and American AI Leadership",
    summary: "An open letter on open-weight models, competition, cybersecurity, technological autonomy and United States leadership in AI.",
    href: "https://openweights.gitlawb.com/",
    eventLabel: "open-weights-american-ai-leadership",
  },
  {
    date: "20 July 2026",
    source: "The Batch · DeepLearning.AI",
    title: "Kimi K3 marks a big shift in AI development; Thinking Machines launches its first general-purpose model",
    summary: "An issue covering model releases, AI agents on Android, Nemotron 3 Embed, NotebookLM and safety.",
    href: "https://charonhub.deeplearning.ai/kimi-k3-marks-a-big-shift-in-ai-development/",
    eventLabel: "the-batch-kimi-k3-thinking-machines",
  },
  {
    date: "29 May 2026",
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

function InitiativeCardEnglish({ initiative }: { initiative: Initiative }) {
  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(initiative.url)}`;
  return <article className={`initiative-card initiative-${normalize(initiative.color).replace(/\s+/g, "-")}`}>
    <div className="initiative-mark">
      <img src={logoUrl} alt={`${initiative.acronym} logo`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      <Building2 className="initiative-mark-fallback" size={25} aria-hidden="true" />
    </div>
    <p className="initiative-acronym">{initiative.acronym}</p>
    <h3>{initiative.name}</h3>
    <p>{initiative.summary}</p>
    <ul aria-label="Areas of activity">{initiative.areas.map((area) => <li key={area}>{area}</li>)}</ul>
    <a href={initiative.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_initiative_en", { event_category: "ecosystem", event_label: initiative.acronym })}>
      {initiative.actionLabel || "Explore initiative"} <ArrowUpRight size={17} aria-hidden="true" />
    </a>
  </article>;
}

function EcosystemPageEnglish({ initiatives, loading, warning }: { initiatives: Initiative[]; loading: boolean; warning: string }) {
  const visibleInitiatives = [
    ...ecosystemFeaturedInitiativesEnglish,
    ...initiatives
      .filter((initiative) => !ecosystemFeaturedInitiativesEnglish.some((featured) => featured.id === initiative.id || featured.url === initiative.url))
      .map((initiative) => ({ ...initiative, ...ecosystemInitiativeTranslationsEnglish[initiative.id] })),
  ];

  return <section id="ufg-ecosystem" className="ecosystem-page" aria-labelledby="ecosystem-title-en">
    <div className="ecosystem-hero">
      <p className="eyebrow">Federal University of Goiás</p>
      <h1 id="ecosystem-title-en">UFG ecosystem in artificial intelligence</h1>
      <p>Discover centers, networks and educational programs that connect knowledge, technology and public policy.</p>
      <a className="back-to-catalog" href="#top" onClick={() => trackEvent("back_to_catalog_en")}>← Back to the collection</a>
    </div>
    <aside className="ecosystem-mapping-callout" aria-label="Mapping AI initiatives at UFG">
      <div>
        <p className="ecosystem-mapping-kicker">Is your AI initiative missing?</p>
        <p>Then join our <strong>mapping of AI initiatives at UFG</strong>. It is quick and easy!</p>
      </div>
      <a href="https://docs.google.com/forms/d/e/1FAIpQLSe3qfZ5hjL0NifRXvI-SM6NKDN7g8DoFQJyoTTRTvhlptWk-w/viewform" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_mapping_form_en", { event_category: "outbound", event_label: "mapping" })}>Join the mapping <ArrowUpRight size={17} aria-hidden="true" /></a>
    </aside>
    <div className="ecosystem-initiative-grid">
      {visibleInitiatives.map((initiative) => <InitiativeCardEnglish key={initiative.id} initiative={initiative} />)}
    </div>
    {loading && <div className="ecosystem-empty" role="status">Loading initiatives from the live UFG catalog…</div>}
    {!loading && warning && initiatives.length === 0 && <div className="ecosystem-empty" role="status">The live initiative catalog is temporarily unavailable. Please try again shortly.</div>}
  </section>;
}

type EnglishPage = "catalog" | "panorama" | "ecosystem" | "daily-news" | "readings";

/* O Panorama tem sub-rotas próprias (#panorama/guia etc.): qualquer hash que
   comece com #panorama resolve para a página, que decide a aba internamente. */
function englishPageFromHash(): EnglishPage {
  if (window.location.hash.startsWith("#panorama")) return "panorama";
  if (["#daily-news", "#ia-como-noticia-diaria"].includes(window.location.hash)) return "daily-news";
  if (["#ai-readings", "#leituras-em-ia"].includes(window.location.hash)) return "readings";
  if (["#ufg-ecosystem", "#ecossistema-ufg"].includes(window.location.hash)) return "ecosystem";
  return "catalog";
}

export function AppEnglish() {
  const [page, setPage] = useState<EnglishPage>(englishPageFromHash);
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { added, setAdded, query, setQuery, selectedKeyword, setSelectedKeyword, type, setType, theme, setTheme, visible, setVisible, showAll, setShowAll, sort, setSort, view, setView, item, filtersOpen, setFiltersOpen, allTopics, setAllTopics, detailHref, openDetail, closeDetail } = useCatalogExperience("all");
  const [showFeaturedHistory, setShowFeaturedHistory] = useState(false);
  const previousPage = useRef(page);

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
    const syncPage = () => {
      const next = englishPageFromHash();
      const pageChanged = next !== previousPage.current;
      setPage(next);
      previousPage.current = next;
      const route = next === "panorama" ? "/en/#panorama" : next === "ecosystem" ? "/en/#ufg-ecosystem" : next === "daily-news" ? "/en/#daily-news" : next === "readings" ? "/en/#ai-readings" : "/en/";
      const pageTitle = next === "panorama" ? "Global Generative AI Landscape" : next === "ecosystem" ? "UFG AI Ecosystem" : next === "daily-news" ? "AI in the daily news" : next === "readings" ? "AI Readings" : "UFG-AI Observatory";
      const title = `${pageTitle} | LAPIG/UFG`;
      document.title = title;
      trackPageView(route, title);
      if (pageChanged) {
        window.requestAnimationFrame(() => {
          const anchorId = next === "catalog" ? window.location.hash.slice(1) : "";
          const anchor = ["collections", "topics", "catalog"].includes(anchorId)
            ? document.getElementById(anchorId)
            : null;
          if (anchor) anchor.scrollIntoView();
          else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          const heading = anchor?.querySelector<HTMLElement>("h1, h2, h3")
            || document.querySelector<HTMLElement>(".site-shell h1");
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        });
      }
    };
    window.addEventListener("hashchange", syncPage);
    const initialPage = englishPageFromHash();
    const initialPageTitle = initialPage === "panorama" ? "Global Generative AI Landscape" : initialPage === "ecosystem" ? "UFG AI Ecosystem" : initialPage === "daily-news" ? "AI in the daily news" : initialPage === "readings" ? "AI Readings" : "UFG-AI Observatory";
    document.title = `${initialPageTitle} | LAPIG/UFG`;
    return () => window.removeEventListener("hashchange", syncPage);
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
      const matchesTheme = theme === "all" || (article.type === "paper" ? paperResearchArea(article) === theme : article.theme === theme);
      const matchesKeyword = !selectedKeyword || matchesCloudTerm(article, selectedKeyword);
      const haystack = normalize([article.title, article.author, article.source, article.theme, article.subtheme, article.summary, ...article.tags].join(" "));
      return (!added || addedInWindow(article, radarWindow)) && matchesType && matchesTheme && matchesKeyword && (!needle || haystack.includes(needle));
    }).sort(orderArticles);
  }, [articles, query, selectedKeyword, theme, type, orderArticles, added, radarWindow.start, radarWindow.end]);

  const initial = !added && !showAll && !query && !selectedKeyword && type === "all" && theme === "all";
  const displayed = filtered;

  const revealCatalog = () => {
    setSelectedKeyword(""); setAdded("");
    setVisible(6);
    setShowAll(true);
    trackEvent("search_from_hero_en", { event_category: "search", event_label: query.trim() || "all" });
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    if (category === "medium") {
      trackEvent("open_ai_readings_en", { event_category: "navigation", event_label: "collection-card" });
      window.location.hash = "ai-readings";
      return;
    }
    setQuery(""); setSelectedKeyword(""); setAdded(""); setType(category); setTheme("all"); setView(defaultCatalogView(category)); setVisible(6); setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }));
  };
  const reset = () => { setQuery(""); setSelectedKeyword(""); setAdded(""); setType("all"); setTheme("all"); setVisible(6); setShowAll(true); };

  return <main id="top" className="site-shell">
    <a className="skip-link" href={page === "readings" ? "#readings-results-title" : "#catalog"}>{page === "readings" ? "Skip to readings" : "Skip to catalog"}</a>
    <InstitutionalBand english />
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => { if (item) closeDetail(); }} aria-label="UFG-AI Observatory — home"><span className="brand-mark"><img src={assetUrl("brand/observatorio-coruja.svg")} width="946" height="826" alt="" /></span><span className="brand-name"><strong>Observatory</strong><strong>UFG · Artificial Intelligence</strong></span></a>
      <nav className="primary-navigation" aria-label="Main navigation"><a className="readings-nav-link" href="#ai-readings" aria-current={page === "readings" ? "page" : undefined}>AI Readings</a><a className="daily-news-nav-link" href="#daily-news" aria-current={page === "daily-news" ? "page" : undefined}>AI in the news</a><a className="panorama-nav-link" href="#panorama" aria-current={page === "panorama" ? "page" : undefined} onClick={() => trackEvent("nav_panorama_en")}>Generative AI overview</a><a href="#ufg-ecosystem" aria-current={page === "ecosystem" ? "page" : undefined}>UFG ecosystem</a><NavigationMore english /></nav>
<div className="language-switch" aria-label="Language"><a href={languageUrl("pt")}>Portuguese</a><span aria-current="page">English</span></div>
      <a className="header-search" href="#catalog" onClick={revealCatalog} aria-label="Search collection"><Search size={21} aria-hidden="true" /></a>
      <details className="mobile-navigation">
        <summary><Menu size={20} aria-hidden="true" /><span>Menu</span></summary>
        <div className="mobile-navigation-panel" role="navigation" aria-label="Main navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
          <a href="#ai-readings" aria-current={page === "readings" ? "page" : undefined} onClick={() => trackEvent("nav_ai_readings_en")}>AI Readings</a>
          <a href="#daily-news" aria-current={page === "daily-news" ? "page" : undefined}>AI in the news</a>
          <a className="panorama-mobile-link" href="#panorama" aria-current={page === "panorama" ? "page" : undefined} onClick={() => trackEvent("nav_panorama_en")}>Generative AI overview</a>
          <a href="#ufg-ecosystem" aria-current={page === "ecosystem" ? "page" : undefined} onClick={() => trackEvent("nav_ecosystem_en")}>UFG ecosystem</a>
          <a href={assetUrl("por-dentro-da-ia/")}>Inside AI · interactive lesson (PT)</a>
          <a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer">Participate <ArrowUpRight size={15} aria-hidden="true" /></a>
          <div className="mobile-language-switch"><a href={languageUrl("pt")}>Portuguese</a><span aria-current="page">English</span></div>
        </div>
      </details>
    </header>

    {item ? <ArticleDetail article={articles.find((article) => article.id === item)} loading={!catalog && !error} english onClose={closeDetail} /> : page === "panorama" ? <PanoramaPage english /> : page === "ecosystem" ? <EcosystemPageEnglish initiatives={catalog?.initiatives || []} loading={!catalog && !error} warning={catalog?.warning || error} /> : page === "daily-news" ? <DailyNewsPageEnglish /> : page === "readings" ? <MediumReadingsPage articles={articles} loading={!catalog && !error} error={error} english detailHref={detailHref} onOpen={openDetail} /> : <div className="home-page"><section className="catalog-intro" aria-labelledby="page-title">
      <div className="intro-copy-block"><p className="eyebrow">Artificial intelligence in perspective</p><h1 id="page-title">AI knowledge for study, research and public debate</h1><p className="intro-copy">Curated readings, documents, videos, audio, interviews, scientific papers and presentations in a thematic collection.</p><form className="hero-search" role="search" onSubmit={(event) => { event.preventDefault(); revealCatalog(); }}><Search size={22} aria-hidden="true" /><label className="sr-only" htmlFor="hero-search-en">Search the collection</label><input id="hero-search-en" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setAdded(""); }} placeholder="Search by topic, title, author or keyword" /><button type="submit">Search</button></form><p className="hero-search-hint">Search {articles.length || "more than 1,000"} items selected and summarized by UFG.</p></div>
    </section>

    <PortalCollections articles={articles} type={type} onSelect={selectCategory} onExplore={revealCatalog} english />

    <section className="weekly-highlight weekly-highlight--debate" aria-labelledby="weekly-highlight-title">
      <FeaturedDebate language="en" />
      <button type="button" className="weekly-highlight-history-toggle" aria-expanded={showFeaturedHistory} aria-controls="weekly-highlight-history-en" onClick={() => { setShowFeaturedHistory((isOpen) => !isOpen); trackEvent("toggle_featured_history_en", { event_category: "navigation", event_label: showFeaturedHistory ? "close" : "open" }); }}><Clock3 size={16} aria-hidden="true" /><span>What has been featured before?</span><ChevronDown size={16} className={showFeaturedHistory ? "is-open" : ""} aria-hidden="true" /></button>
      {showFeaturedHistory && <div id="weekly-highlight-history-en" className="weekly-highlight-history" aria-label="Previously featured topics"><p className="eyebrow">Previous highlights</p><div className="weekly-highlight-history-grid">{featuredHistoryEnglish.map((featured) => {
        const links = featured.links ?? [{ label: "Open topic", href: featured.href || "#" }];
        return <article key={featured.eventLabel} className="weekly-highlight-history-item"><p>{featured.date} · {featured.source}</p><h3>{featured.title}</h3><span>{featured.summary}</span><div className="weekly-highlight-history-links">{links.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined} onClick={() => trackEvent("open_featured_history_en", { event_category: link.href.startsWith("http") ? "outbound" : "navigation", event_label: `${featured.eventLabel}:${link.label}` })}>{link.label} <ArrowUpRight size={15} aria-hidden="true" /></a>)}</div></article>;
      })}</div></div>}
    </section>

    <section id="catalog" hidden={initial} className="search-panel" aria-label="Search the collection">
      <label className="search-field"><Search size={23} /><span className="sr-only">Search the collection</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setAdded(""); setVisible(6); setShowAll(true); }} placeholder="Search by title, author, summary, topic or keyword" />{query && <button type="button" className="icon-button" onClick={() => { setQuery(""); setSelectedKeyword(""); setAdded(""); }} aria-label="Clear search"><X size={18} /></button>}</label>
      <button className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filter-options" onClick={() => setFiltersOpen(!filtersOpen)}>Filter and sort <ChevronDown size={18} aria-hidden="true" /></button>
      <div id="catalog-filter-options" className={filtersOpen ? "filter-row is-open" : "filter-row"}><div className="type-tabs" role="group" aria-label="Publication type">{filterTypes.map((key) => <button type="button" key={key} className={type === key ? "active" : ""} onClick={() => { setType(key); setView(defaultCatalogView(key)); setTheme("all"); setVisible(6); setShowAll(true); }}>{typeLabels[key]} <span>{counts[key]}</span></button>)}</div><label className="select-filter"><span className="sr-only">Filter by topic</span><select value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(6); setShowAll(true); }}><option value="all">All topics</option>{availableThemes.map((item) => <option key={item} value={item}>{paperAreaLabels[item as PaperResearchArea] || item}</option>)}</select><ChevronDown size={17} /></label></div>
      <div className="catalog-toolbar"><label className="sort-control">Order by <select value={sort} onChange={(event) => { setSort(event.target.value as "added" | "published"); setVisible(6); }}><option value="added">Most recently added</option><option value="published">Most recently published</option></select></label><div hidden={defaultCatalogView(type) !== "cards"} className="view-switch" role="group" aria-label="Display"><button aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button><button aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div></div>
      {(added || query || selectedKeyword || type !== "all" || theme !== "all") && <div className="active-filters" aria-label="Active filters">{added && <button onClick={() => setAdded("")}>Added in the last 7 days ×</button>}{query && <button onClick={() => { setQuery(""); setSelectedKeyword(""); setAdded(""); }}>Search: {query} ×</button>}{selectedKeyword && <button onClick={() => setSelectedKeyword("")}>Topic: {selectedKeyword} ×</button>}{type !== "all" && <button onClick={() => { setType("all"); setTheme("all"); }}>{typeLabels[type]} ×</button>}{theme !== "all" && <button onClick={() => setTheme("all")}>{type === "paper" ? paperAreaLabels[theme as PaperResearchArea] || theme : theme} ×</button>}<button onClick={reset}>Clear all</button></div>}
      <div className={`sync-line ${catalog?.warning ? "has-warning" : ""}`} aria-live="polite"><span>{catalog?.source === "google-sheets" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{catalog?.warning || (lastUpdated ? `Catalog synchronized at ${lastUpdated.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}` : "Loading catalog")}</span><button type="button" onClick={() => window.location.reload()} title="Refresh catalog" aria-label="Refresh catalog"><RefreshCw size={15} className={refreshing ? "spinning" : ""} /></button></div>
    </section>

    {error ? <section className="empty-state" role="alert"><FileText size={30} /><h2>Catalog unavailable</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></section> : !catalog ? <section className="loading-state"><LoaderCircle className="spinning" size={28} /><span>Loading collection…</span></section> : initial ? <RecentDiscovery articles={articles} english onSelect={selectCategory} detailHref={detailHref} onOpen={openDetail} /> : <><section className="results-heading" aria-live="polite"><div><p className="eyebrow">{initial ? "Initial selection" : "Catalog"}</p><h2>{initial ? "Explore the latest additions" : `${displayed.length} ${displayed.length === 1 ? "item found" : "items found"}`}</h2></div>{initial ? <button type="button" className="clear-filters" onClick={() => { setShowAll(true); setVisible(6); }}>View full collection</button> : (query || type !== "all" || theme !== "all") && <button type="button" className="clear-filters" onClick={reset}><X size={16} /> Clear filters</button>}</section>{displayed.length ? <div className={`article-grid view-${defaultCatalogView(type) === "cards" ? view : "list"}`}>{displayed.slice(0, visible).map((article) => <CatalogCard key={article.id} article={article} english layout={defaultCatalogView(type) === "cards" ? view : "list"} href={detailHref(article.id)} onOpen={openDetail} />)}</div> : <section className="empty-state"><Search size={30} /><h2>No items found</h2><p>Try another term or remove the filters.</p><button type="button" onClick={reset}>View full collection</button></section>}{visible < displayed.length && <button type="button" className="load-more" onClick={() => setVisible((value) => value + 6)}>Load more items</button>}</>}
    {articles.length > 0 && <TopicRadar articles={articles} selected={selectedKeyword} english onSelect={(label, period) => { setAdded(period === "7d" ? "7d" : ""); setQuery(""); setSelectedKeyword(label); setType("all"); setTheme("all"); setVisible(6); setShowAll(true); requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })); }} />}

      <section id="interactive-experiences" className="interactive-experience" aria-labelledby="interactive-experience-title-en">
      <div className="interactive-experience-copy">
        <p className="eyebrow">Interactive experiences · LAPIG / UFG</p>
        <h2 id="interactive-experience-title-en">Inside AI <span>From a sentence to the next token</span></h2>
        <p>How does a language model generate a response? Follow a sentence about remote sensing, explore diagrams and try the mathematical operations step by step.</p>
        <p className="interactive-experience-scope">A visual introduction to inference, using GPT-3 as a reference. No prior knowledge of mathematics or programming is required.</p>
        <a className="interactive-experience-action" href={assetUrl("por-dentro-da-ia/")} onClick={() => trackEvent("open_interactive_inference_en", { event_category: "navigation", event_label: "inside-ai" })}>Inside AI (PT) <span aria-hidden="true">→</span></a>
        <small>The interactive lesson is in Portuguese (PT). Return to the Observatory using the button in its header.</small>
      </div>
      <details className="interactive-experience-journey"><summary>See the learning path</summary>
        <p className="eyebrow">The sentence guiding the journey</p>
        <blockquote>Healthy vegetation has high reflectance in the near infrared.</blockquote>
        <ol aria-label="Steps in next-token generation">
          <li><strong>01 · Tokens and embeddings</strong><span>Text is converted into numerical representations.</span></li>
          <li><strong>02 · Transformer blocks</strong><span>Attention and neural networks transform the representations using context.</span></li>
          <li><strong>03 · Next token</strong><span>Vocabulary scores become probabilities used to choose the continuation.</span></li>
        </ol>
      </details>
    </section>

<section className="portal-news"><h2>AI in the news</h2><p>Explore the newspaper archive by year and topic, with links to the original coverage.</p><a href="#daily-news">Browse the news archive →</a></section>
    <section className="obia-callout" aria-labelledby="obia-title-en">
      <a className="obia-logo-link" href="https://obia.nic.br/" target="_blank" rel="noreferrer" aria-label="Visit the Brazilian Artificial Intelligence Observatory" onClick={() => trackEvent("open_obia_en", { event_category: "outbound", event_label: "obia" })}><img src="https://obia.nic.br/img/logo-text-white.svg" alt="OBIA" /><span>Brazilian Artificial Intelligence Observatory</span></a>
      <div><p className="eyebrow">Brazil in focus</p><h2 id="obia-title-en">To learn more about the use and outlook of AI in Brazil, visit the Brazilian Artificial Intelligence Observatory.</h2></div>
      <a className="obia-action" href="https://obia.nic.br/" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_obia_en", { event_category: "outbound", event_label: "obia" })}>Visit OBIA <ArrowUpRight size={17} aria-hidden="true" /></a>
    </section>

</div>}

    <footer className="footer"><div><strong>UFG-AI Observatory</strong><p>An educational collection under continuous development.</p><a className="github-footer-link" href="https://github.com/lapig-ufg" target="_blank" rel="noreferrer">LAPIG/UFG on GitHub <ArrowUpRight size={14} /></a></div><div><span>LAPIG • Federal University of Goiás</span><p>Public content with access to original sources.</p><p className="credits"><strong>Development and curation:</strong> <a href="mailto:laerte@ufg.br">Laerte Ferreira</a>, <a href="mailto:victor.amaral@ufg.br">Victor Amaral</a> and <a href="mailto:tiagogoncalves@discente.ufg.br">Tiago Geraldine</a>.</p><p className="contact-callout">Questions or suggestions? <a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer">Contact us <ArrowUpRight size={14} /></a></p></div></footer>
  </main>;
}
