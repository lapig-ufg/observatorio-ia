import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Library,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Mic,
  Presentation,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { assetUrl, loadCatalog, type Article, type ArticleType, type CatalogLoadResult } from "./catalog";
import { trackEvent, trackPageView } from "./analytics";
import { collectionThemes } from "./catalogNavigation";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { buildKeywordCloud, cloudTermKey, matchesCloudTerm } from "./keywordCloud";
import { isPublicResearchPaper, paperResearchArea, paperResearchAreas, type PaperResearchArea } from "./paperResearch";
import { languageUrl } from "./locale";

const typeLabels: Record<"all" | ArticleType, string> = {
  all: "All",
  medium: "Blogs",
  documento: "General documents",
  "link-video": "Links and videos",
  noticia: "News",
  paper: "AI in scientific research",
  apresentacao: "Presentations",
  entrevista: "Interviews",
};

const actionLabels: Record<ArticleType, string> = {
  medium: "Read publication",
  documento: "Open document",
  "link-video": "Open content",
  noticia: "Read news",
  paper: "Open paper",
  apresentacao: "View presentation",
  entrevista: "Watch interview",
};

const typeIcons = {
  medium: Sparkles,
  documento: FileText,
  "link-video": Link2,
  noticia: FileText,
  paper: BookOpen,
  apresentacao: Presentation,
  entrevista: Mic,
};

const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "entrevista", "paper", "apresentacao"];
const filterTypes: Array<"all" | ArticleType> = ["all", ...categoryTypes];
const chartColors: Record<ArticleType, { bar: string; track: string }> = {
  medium: { bar: "#16715b", track: "#cfe6dc" },
  documento: { bar: "#28759f", track: "#d4e6f0" },
  "link-video": { bar: "#bd5a37", track: "#f2d9ce" },
  noticia: { bar: "#b87516", track: "#f1e3bf" },
  paper: { bar: "#70569b", track: "#e2d9ee" },
  apresentacao: { bar: "#bd4659", track: "#f1d4da" },
  entrevista: { bar: "#76568d", track: "#e5dbee" },
};
const paperAreaLabels: Record<PaperResearchArea, string> = {
  "Ciências da Vida e Saúde": "Life and Health Sciences",
  "Ciências Humanas, Sociais e Linguística": "Humanities, Social Sciences and Linguistics",
  "Engenharias e Agrárias": "Engineering and Agricultural Sciences",
  "Ciências Exatas e da Terra": "Exact and Earth Sciences",
  "Epistemologia e Metaciência": "Epistemology and Metascience",
  "Fundamentos de IA": "AI Foundations",
};

const panoramaEnglishUrl = "https://lapig-ufg.github.io/observatorio-ia/panorama/en/";
const panoramaEnglishEmbedUrl = `${panoramaEnglishUrl}?embed=1`;

const featuredHistoryEnglish = [
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
    href: "https://www.gatesnotes.com/a-turbulent-ai-era-and-critical-choices-to-make",
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
    href: "https://drive.google.com/file/d/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ/view",
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

function driveFileId(url: string) {
  return url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1] || "";
}

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || "";
  } catch { /* Optional source URL. */ }
  return "";
}

function fallbackThumbnail(article: Article) {
  const videoId = article.type === "link-video" ? youtubeVideoId(article.originalUrl) : "";
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const fileId = driveFileId(article.institutionalPdfUrl || article.originalUrl);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` : "";
}

function ArticleCardEnglish({ article }: { article: Article }) {
  const Icon = typeIcons[article.type];
  const publishedAt = article.publishedAt.trim();
  const includedAt = article.includedAt.trim();
  const distinctIncludedAt = includedAt && catalogDate(includedAt) !== catalogDate(publishedAt);
  const metadata = [
    article.pages ? `${article.pages} pages` : "",
    publishedAt ? `Published ${publishedAt}` : "",
    distinctIncludedAt || (!publishedAt && includedAt) ? `Added to the catalog ${includedAt}` : "",
  ].filter(Boolean).join(" • ");
  const thumbnail = fallbackThumbnail(article);
  const distinctInstitutionalPdf = article.institutionalPdfUrl && article.institutionalPdfUrl !== article.originalUrl;
  const author = article.author === "Autoria não identificada" ? "Author not identified" : article.author.replace("(entrevistado)", "(interviewee)");

  return <article className={`article-card type-${article.type}`}>
    <div className="cover-frame">
      {article.cover ? <img src={assetUrl(article.cover)} alt="" loading="lazy" /> : thumbnail ? <img className="source-thumbnail" src={thumbnail} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      {!article.cover && <Icon className="cover-fallback-icon" size={42} aria-hidden="true" />}
      <span className="type-badge"><Icon size={14} aria-hidden="true" /> {typeLabels[article.type]}</span>
    </div>
    <div className="card-content">
      <p className="card-theme">{article.subtheme || article.theme}</p>
      <h3>{article.title}</h3>
      <p className="byline">{author} <span>•</span> {article.source}</p>
      <p className="summary">{article.summary}</p>
      <ul className="tag-list" aria-label="Keywords">{article.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
      <div className="card-footer">
        <span>{metadata || "Editorial information under review"}</span>
        <div className="article-actions">
          {distinctInstitutionalPdf && <a className="secondary-action" href={article.institutionalPdfUrl} target="_blank" rel="noreferrer" title="Access controlled by UFG"><LockKeyhole size={16} /> Institutional PDF</a>}
          {article.originalUrl ? <a className="article-action" href={article.originalUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_article", { event_category: "article-en", event_label: article.id })}>{actionLabels[article.type]} <ArrowUpRight size={17} /></a> : !article.institutionalPdfUrl && <span className="article-action-unavailable">Link under review</span>}
        </div>
      </div>
    </div>
  </article>;
}

function PanoramaPageEnglish() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const size = () => {
      const top = frame.getBoundingClientRect().top + window.scrollY;
      frame.style.height = `${Math.max(420, window.innerHeight - top)}px`;
    };
    size();
    const observer = new ResizeObserver(size);
    if (frame.parentElement) observer.observe(frame.parentElement);
    window.addEventListener("resize", size);
    window.addEventListener("orientationchange", size);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", size);
      window.removeEventListener("orientationchange", size);
    };
  }, []);

  return <section id="panorama" className="panorama-page" aria-labelledby="panorama-title">
    <div className="panorama-intro">
      <a className="back-to-catalog" href="#top" onClick={() => trackEvent("back_to_catalog_en")}>← Back to the collection</a>
      <div className="panorama-heading">
        <h1 id="panorama-title">Global Generative AI Landscape</h1>
        <p>Model releases since ChatGPT (Nov 2022), which model to use for each task, free AI tools, and a practical guide to agents in the terminal.</p>
      </div>
      <a className="panorama-open" href={panoramaEnglishUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_panorama_standalone_en", { event_category: "outbound", event_label: "panorama-en" })}>Open in a new tab <ArrowUpRight size={14} aria-hidden="true" /></a>
    </div>
    <iframe ref={frameRef} className="panorama-frame" src={panoramaEnglishEmbedUrl} title="Global Generative AI Landscape" loading="lazy" />
  </section>;
}

export function AppEnglish() {
  const [page, setPage] = useState<"catalog" | "panorama">(() => window.location.hash === "#panorama" ? "panorama" : "catalog");
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [type, setType] = useState<"all" | ArticleType>("all");
  const [theme, setTheme] = useState("all");
  const [visible, setVisible] = useState(15);
  const [showAll, setShowAll] = useState(false);
  const [showFeaturedHistory, setShowFeaturedHistory] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async (quiet = false) => {
      if (!quiet) setRefreshing(true);
      try {
        const result = await loadCatalog(undefined, "en");
        if (active) { setCatalog(result); setLastUpdated(new Date()); setError(""); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "The catalog could not be loaded.");
      } finally { if (active) setRefreshing(false); }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 60_000);
    trackPageView("/en/", "UFG-AI Observatory — English");
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    const syncPage = () => {
      const next = window.location.hash === "#panorama" ? "panorama" : "catalog";
      setPage(next);
      trackPageView(next === "panorama" ? "/en/#panorama" : "/en/", next === "panorama" ? "Global Generative AI Landscape" : "UFG-AI Observatory — English");
    };
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  const articles = useMemo(() => (catalog?.articles || [])
    .filter((article) => article.type !== "noticia")
    .filter((article) => article.type !== "paper" || isPublicResearchPaper(article)), [catalog]);
  const counts = useMemo(() => Object.fromEntries(["all", ...categoryTypes].map((key) => [key, key === "all" ? articles.length : articles.filter((article) => article.type === key).length])) as Record<"all" | ArticleType, number>, [articles]);
  const maximumCount = Math.max(...categoryTypes.map((category) => counts[category]), 1);
  const nonPaperThemes = useMemo(() => Array.from(new Set(articles.filter((article) => article.type !== "paper").map((article) => article.theme))).sort(), [articles]);
  const availableThemes = type === "paper" ? [...paperResearchAreas] : nonPaperThemes;
  const selectedCollection = type === "medium" || type === "link-video" || type === "apresentacao" ? type : null;
  const collectionCategories = useMemo(() => selectedCollection ? collectionThemes(articles, selectedCollection) : [], [articles, selectedCollection]);

  const keywordCloud = useMemo(() => {
    const recentIds = new Set(articles.slice().sort(newestFirst).slice(0, 60).map((article) => article.id));
    const sorted = buildKeywordCloud(articles, recentIds, 18, 0.06);
    const maximum = Math.max(...sorted.map((keyword) => keyword.score), 1);
    return sorted.map((keyword) => ({ ...keyword, size: 0.92 + Math.sqrt(keyword.score / maximum) * 2 }));
  }, [articles]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return articles.filter((article) => {
      const matchesType = type === "all" || article.type === type;
      const matchesTheme = theme === "all" || (article.type === "paper" ? paperResearchArea(article) === theme : article.theme === theme);
      const matchesKeyword = !selectedKeyword || matchesCloudTerm(article, selectedKeyword);
      const haystack = normalize([article.title, article.author, article.source, article.theme, article.subtheme, article.summary, ...article.tags].join(" "));
      return matchesType && matchesTheme && matchesKeyword && (!needle || haystack.includes(needle));
    }).sort(newestFirst);
  }, [articles, query, selectedKeyword, theme, type]);

  const latestByCategory = useMemo(() => categoryTypes.flatMap((category) => {
    const items = articles.filter((article) => article.type === category);
    return items.length ? [items.slice().sort(newestFirst)[0]] : [];
  }).sort(newestFirst), [articles]);
  const initial = !showAll && !query && !selectedKeyword && type === "all" && theme === "all";
  const displayed = initial ? latestByCategory : filtered;

  const selectCategory = (category: ArticleType) => {
    setType(category); setTheme("all"); setVisible(15); setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" }));
  };
  const reset = () => { setQuery(""); setSelectedKeyword(""); setType("all"); setTheme("all"); setVisible(15); setShowAll(true); };

  return <main id="top" className="site-shell">
    <a className="skip-link" href="#catalog">Skip to catalog</a>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="UFG-AI Observatory — home"><span className="brand-mark"><Library size={21} aria-hidden="true" /></span><span className="brand-name"><strong>Observatory</strong><strong>UFG-AI</strong></span></a>
      <nav aria-label="Main navigation">
        <div className="catalog-nav-links"><a href="#collections">Collections</a><a href="#topics">Topics</a></div>
        <a className="ecosystem-nav-link" href="../#ecossistema-ufg">UFG ecosystem <small>(PT)</small> <ArrowUpRight size={15} /></a>
        <a className="daily-news-nav-link" href="../#ia-como-noticia-diaria"><span><strong>AI in the news</strong><small>archive in Portuguese</small></span> <ArrowUpRight size={15} /></a>
        <a className="panorama-nav-link" href="#panorama" onClick={() => trackEvent("nav_panorama_en")}><span><strong>Overview</strong><small>generative AI</small></span> <ArrowUpRight size={15} /></a>
      </nav>
      <div className="institutional-marks" aria-label="Responsible institutions"><a href="https://lapig.iesa.ufg.br/" target="_blank" rel="noreferrer"><img src={assetUrl("brand/lapig-remote-sensing-gis-lab.png")} alt="LAPIG" /></a><a href="https://ufg.br/" target="_blank" rel="noreferrer"><img src={assetUrl("brand/ufg-vertical-colorido.png")} alt="UFG" /></a></div>
      <div className="language-switch" aria-label="Language"><a href={languageUrl("pt")} lang="pt-BR">Português</a><span aria-current="page">English</span></div>
    </header>

    {page === "panorama" ? <PanoramaPageEnglish /> : <><section className="catalog-intro" aria-labelledby="page-title">
      <div className="intro-copy-block"><p className="eyebrow">Artificial intelligence in perspective</p><h1 id="page-title">AI knowledge for study, research and public debate</h1><p className="intro-copy">Blog articles, documents, videos, interviews, scientific papers and presentations in a thematic collection.</p></div>
      <div className="collection-chart" aria-label="Items by category"><p className="collection-chart-title">Items by category</p><ul>{categoryTypes.map((category) => <li key={category} style={{ "--bar-color": chartColors[category].bar, "--bar-track": chartColors[category].track } as CSSProperties}><span className="collection-chart-label">{typeLabels[category]}</span><span className="collection-chart-track" aria-hidden="true"><span className="collection-chart-bar" style={{ "--bar-value": `${Math.max((counts[category] / maximumCount) * 100, 4)}%` } as CSSProperties} /></span><strong>{counts[category]}</strong></li>)}</ul></div>
    </section>

    <section className="weekly-highlight" aria-labelledby="weekly-highlight-title">
      <div className="weekly-highlight-kicker"><span>Featured</span><span>Practical guide · Generative AI overview</span></div>
      <div className="weekly-highlight-content weekly-highlight-content--with-image"><a className="weekly-highlight-media" href="#panorama" aria-label="Explore the guide Using AI beyond the browser" onClick={() => trackEvent("open_weekly_highlight_image_en", { event_category: "navigation", event_label: "ai-beyond-the-browser" })}><img src={assetUrl("covers/ia-fora-do-navegador-agentes-terminal-2026-09-12.png")} alt="Editorial illustration of a terminal connected to AI tools and agents." /><span>Open guide <ArrowUpRight size={16} aria-hidden="true" /></span></a><div className="weekly-highlight-copy"><p className="eyebrow">AI in the terminal and agents</p><h2 id="weekly-highlight-title">Using AI beyond the browser</h2><div className="weekly-highlight-aside"><p>Learn, step by step, how to use AI directly in the terminal and explore the power of agents for research, task organization and workflow automation.</p><div className="weekly-highlight-actions"><a href="#panorama" onClick={() => trackEvent("open_weekly_highlight_en", { event_category: "navigation", event_label: "ai-beyond-the-browser" })}>Explore the guide <ArrowUpRight size={17} aria-hidden="true" /></a></div></div><button type="button" className="weekly-highlight-history-toggle" aria-expanded={showFeaturedHistory} aria-controls="weekly-highlight-history-en" onClick={() => { setShowFeaturedHistory((isOpen) => !isOpen); trackEvent("toggle_featured_history_en", { event_category: "navigation", event_label: showFeaturedHistory ? "close" : "open" }); }}><Clock3 size={16} aria-hidden="true" /><span>What has been featured before?</span><ChevronDown size={16} className={showFeaturedHistory ? "is-open" : ""} aria-hidden="true" /></button></div></div>
      {showFeaturedHistory && <div id="weekly-highlight-history-en" className="weekly-highlight-history" aria-label="Previously featured topics"><p className="eyebrow">Previous highlights</p><div className="weekly-highlight-history-grid">{featuredHistoryEnglish.map((featured) => <article key={featured.href} className="weekly-highlight-history-item"><p>{featured.date} · {featured.source}</p><h3>{featured.title}</h3><span>{featured.summary}</span><a href={featured.href} target={featured.href.startsWith("http") ? "_blank" : undefined} rel={featured.href.startsWith("http") ? "noreferrer" : undefined} onClick={() => trackEvent("open_featured_history_en", { event_category: featured.href.startsWith("http") ? "outbound" : "navigation", event_label: featured.eventLabel })}>Open topic <ArrowUpRight size={15} aria-hidden="true" /></a></article>)}</div></div>}
    </section>

    <section id="interactive-experiences" className="interactive-experience" aria-labelledby="interactive-experience-title-en">
      <div className="interactive-experience-copy">
        <p className="eyebrow">Interactive experiences · LAPIG / UFG</p>
        <h2 id="interactive-experience-title-en">Inside AI <span>From a sentence to the next token</span></h2>
        <p>How does a language model generate a response? Follow a sentence about remote sensing, explore diagrams and try the mathematical operations step by step.</p>
        <p className="interactive-experience-scope">A visual introduction to inference, using GPT-3 as a reference. No prior knowledge of mathematics or programming is required.</p>
        <a className="interactive-experience-action" href={assetUrl("por-dentro-da-ia/")} onClick={() => trackEvent("open_interactive_inference_en", { event_category: "navigation", event_label: "inside-ai" })}>Inside AI <span aria-hidden="true">→</span></a>
        <small>Explore the interactive lesson and return to the Observatory using the button in its header.</small>
      </div>
      <div className="interactive-experience-journey">
        <p className="eyebrow">The sentence guiding the journey</p>
        <blockquote>Healthy vegetation has high reflectance in the near infrared.</blockquote>
        <ol aria-label="Steps in next-token generation">
          <li><strong>01 · Tokens and embeddings</strong><span>Text is converted into numerical representations.</span></li>
          <li><strong>02 · Transformer blocks</strong><span>Attention and neural networks transform the representations using context.</span></li>
          <li><strong>03 · Next token</strong><span>Vocabulary scores become probabilities used to choose the continuation.</span></li>
        </ol>
      </div>
    </section>

    <section className="obia-callout" aria-labelledby="obia-title-en">
      <a className="obia-logo-link" href="https://obia.nic.br/" target="_blank" rel="noreferrer" aria-label="Visit the Brazilian Artificial Intelligence Observatory" onClick={() => trackEvent("open_obia_en", { event_category: "outbound", event_label: "obia" })}><img src="https://obia.nic.br/img/logo-text-white.svg" alt="OBIA" /><span>Brazilian Artificial Intelligence Observatory</span></a>
      <div><p className="eyebrow">Brazil in focus</p><h2 id="obia-title-en">To learn more about the use and outlook of AI in Brazil, visit the Brazilian Artificial Intelligence Observatory.</h2></div>
      <a className="obia-action" href="https://obia.nic.br/" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_obia_en", { event_category: "outbound", event_label: "obia" })}>Visit OBIA <ArrowUpRight size={17} aria-hidden="true" /></a>
    </section>

    <section id="collections" className="category-band" aria-labelledby="category-title">
      <div className="category-heading"><p className="eyebrow">Collections</p><h2 id="category-title">Browse by content type</h2></div>
      <div className="category-grid">{categoryTypes.map((category) => { const Icon = typeIcons[category]; return <button type="button" key={category} className={type === category ? "category-button active" : "category-button"} onClick={() => selectCategory(category)} aria-pressed={type === category}><Icon size={22} /><span>{typeLabels[category]}</span><strong>{counts[category]}</strong></button>; })}</div>
      {selectedCollection && collectionCategories.length > 0 && <div className="blog-subcategories"><div className="blog-subcategories-heading"><div><p className="eyebrow">{typeLabels[selectedCollection]}</p><h3>Explore by topic</h3></div><p>Select a subcategory to view related content.</p></div><div className="blog-subcategory-grid">{collectionCategories.map(({ theme: item, count }) => <button type="button" key={item} className={theme === item ? "blog-subcategory-button active" : "blog-subcategory-button"} onClick={() => { setTheme(item); setVisible(15); setShowAll(true); }}><span>{item}</span><strong>{count}</strong><ArrowUpRight size={16} /></button>)}</div></div>}
      {type === "paper" && <div className="blog-subcategories"><div className="blog-subcategories-heading"><div><p className="eyebrow">AI in scientific research</p><h3>Explore by field of knowledge</h3></div><p>A curated selection on generative AI, foundation models, agents and their effects on research.</p></div><div className="blog-subcategory-grid">{paperResearchAreas.map((area) => <button type="button" key={area} className={theme === area ? "blog-subcategory-button active" : "blog-subcategory-button"} onClick={() => { setTheme(area); setVisible(15); setShowAll(true); }}><span>{paperAreaLabels[area]}</span><strong>{articles.filter((article) => article.type === "paper" && paperResearchArea(article) === area).length}</strong><ArrowUpRight size={16} /></button>)}</div></div>}
    </section>

    {keywordCloud.length > 0 && <section id="topics" className="keyword-cloud-section" aria-labelledby="keyword-cloud-title"><div className="keyword-cloud-heading"><div><p className="eyebrow">Topics in motion</p><h2 id="keyword-cloud-title">Collection topic radar</h2></div><p>Editorial keywords grouped by concept. Ranking emphasizes the 60 most recent additions while preserving recurrence across the full collection.</p></div><div className="keyword-cloud-legend"><span><strong>{Math.min(60, articles.length)}</strong> recent additions shape the weight</span><span><strong>{articles.length}</strong> active items form the historical base</span></div><div className="keyword-cloud" aria-label="Collection topic radar">{keywordCloud.map((keyword, index) => <button type="button" key={keyword.key} className={`keyword-cloud-item cloud-color-${index % 5}${selectedKeyword && cloudTermKey(selectedKeyword) === keyword.key ? " active" : ""}`} style={{ "--cloud-size": `${keyword.size}rem` } as CSSProperties} onClick={() => { setQuery(keyword.label); setSelectedKeyword(keyword.label); setType("all"); setTheme("all"); setVisible(15); setShowAll(true); }}><span>{keyword.label}</span><small className="sr-only">{keyword.recentCount} recent additions and {keyword.count} items in the collection</small></button>)}</div></section>}

    <section id="catalog" className="search-panel" aria-label="Search the collection">
      <label className="search-field"><Search size={23} /><span className="sr-only">Search the collection</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setVisible(15); setShowAll(true); }} placeholder="Search by title, author, summary, topic or keyword" />{query && <button type="button" className="icon-button" onClick={() => { setQuery(""); setSelectedKeyword(""); }} aria-label="Clear search"><X size={18} /></button>}</label>
      <div className="filter-row"><div className="type-tabs" role="group" aria-label="Publication type">{filterTypes.map((key) => <button type="button" key={key} className={type === key ? "active" : ""} onClick={() => { setType(key); setTheme("all"); setVisible(15); setShowAll(true); }}>{typeLabels[key]} <span>{counts[key]}</span></button>)}</div><label className="select-filter"><span className="sr-only">Filter by topic</span><select value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(15); setShowAll(true); }}><option value="all">All topics</option>{availableThemes.map((item) => <option key={item} value={item}>{type === "paper" ? paperAreaLabels[item as PaperResearchArea] : item}</option>)}</select><ChevronDown size={17} /></label></div>
      <div className={`sync-line ${catalog?.warning ? "has-warning" : ""}`} aria-live="polite"><span>{catalog?.source === "google-sheets" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{catalog?.warning || (lastUpdated ? `Catalog synchronized at ${lastUpdated.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}` : "Loading catalog")}</span><button type="button" onClick={() => window.location.reload()} title="Refresh catalog" aria-label="Refresh catalog"><RefreshCw size={15} className={refreshing ? "spinning" : ""} /></button></div>
    </section>

    {error ? <section className="empty-state" role="alert"><FileText size={30} /><h2>Catalog unavailable</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></section> : !catalog ? <section className="loading-state"><LoaderCircle className="spinning" size={28} /><span>Loading collection…</span></section> : <><section className="results-heading" aria-live="polite"><div><p className="eyebrow">{initial ? "Initial selection" : "Catalog"}</p><h2>{initial ? "One recent item from each category" : `${displayed.length} ${displayed.length === 1 ? "item found" : "items found"}`}</h2></div>{initial ? <button type="button" className="clear-filters" onClick={() => { setShowAll(true); setVisible(15); }}>View full collection</button> : (query || type !== "all" || theme !== "all") && <button type="button" className="clear-filters" onClick={reset}><X size={16} /> Clear filters</button>}</section>{displayed.length ? <div className="article-grid">{displayed.slice(0, visible).map((article) => <ArticleCardEnglish key={article.id} article={article} />)}</div> : <section className="empty-state"><Search size={30} /><h2>No items found</h2><p>Try another term or remove the filters.</p><button type="button" onClick={reset}>View full collection</button></section>}{visible < displayed.length && <button type="button" className="load-more" onClick={() => setVisible((value) => value + 15)}>Load more items</button>}</>}</>}

    <footer className="footer"><div><strong>UFG-AI Observatory</strong><p>An educational collection under continuous development.</p><a className="github-footer-link" href="https://github.com/lapig-ufg" target="_blank" rel="noreferrer">LAPIG/UFG on GitHub <ArrowUpRight size={14} /></a></div><div><span>LAPIG • Federal University of Goiás</span><p>Public content with access to original sources.</p><p className="credits"><strong>Development and curation:</strong> Laerte Ferreira, Victor Amaral and Tiago Geraldine.</p><p className="contact-callout">Questions or suggestions? <a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer">Contact us <ArrowUpRight size={14} /></a></p></div></footer>
  </main>;
}
