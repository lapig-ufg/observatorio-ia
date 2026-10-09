import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Link2,
  Library,
  LoaderCircle,
  Menu,
  Mic,
  Newspaper,
  Presentation,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { assetUrl, loadCatalog, type Article, type ArticleType, type CatalogLoadResult, type Initiative } from "./catalog";
import { trackEvent, trackPageView } from "./analytics";
import { DailyNewsPage } from "./DailyNewsPage";
import { FeaturedDebate } from "./FeaturedDebate";
import { collectionThemes } from "./catalogNavigation";
import { catalogDate, newestFirst, recentInclusionIdsWithTies } from "./catalogOrdering";
import { buildKeywordCloud, cloudTermKey, matchesCloudTerm } from "./keywordCloud";
import { isPublicResearchPaper, paperResearchArea, paperResearchAreas } from "./paperResearch";
import { languageUrl } from "./locale";
import { ArticleDetail, CatalogCard, InstitutionalBand, useCatalogExperience } from "./CatalogExperience";
import { MediumReadingsPage } from "./MediumReadingsPage";

const typeLabels: Record<"todos" | ArticleType, string> = {
  todos: "Todos",
  medium: "Leituras em IA",
  documento: "Documentos gerais",
  "link-video": "Links e vídeos",
  audio: "Áudios",
  noticia: "Jornais e notícias",
  paper: "IA na pesquisa científica",
  apresentacao: "Apresentações",
  entrevista: "Entrevistas",
};

const typeIcons = {
  medium: Sparkles,
  documento: FileText,
  "link-video": Link2,
  audio: Mic,
  noticia: Newspaper,
  paper: BookOpen,
  apresentacao: Presentation,
  entrevista: Mic,
};



// Notícias têm página editorial própria em “IA como notícia diária”. Os registros
// permanecem na fonte, mas não fazem parte do catálogo público geral.
const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "audio", "entrevista", "paper", "apresentacao"];
const catalogFilterTypes: Array<"todos" | ArticleType> = ["todos", ...categoryTypes];
const chartLabels: Record<ArticleType, string> = {
  medium: "Leituras em IA",
  documento: "Documentos",
  "link-video": "Links e vídeos",
  audio: "Áudios",
  noticia: "Notícias",
  paper: "Pesquisa científica",
  apresentacao: "Apresentações",
  entrevista: "Entrevistas",
};
const chartColors: Record<ArticleType, { bar: string; track: string }> = {
  medium: { bar: "#16715b", track: "#cfe6dc" },
  documento: { bar: "#28759f", track: "#d4e6f0" },
  "link-video": { bar: "#bd5a37", track: "#f2d9ce" },
  audio: { bar: "#497a80", track: "#d9e9e8" },
  noticia: { bar: "#b87516", track: "#f1e3bf" },
  paper: { bar: "#70569b", track: "#e2d9ee" },
  apresentacao: { bar: "#bd4659", track: "#f1d4da" },
  entrevista: { bar: "#76568d", track: "#e5dbee" },
};
// Painel externo do LAPIG exibido dentro do site. O parâmetro embed pede ao
// painel que esconda o próprio cabeçalho, já que ele roda aqui dentro.
const panoramaUrl = "https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/";
const panoramaEmbedUrl = `${panoramaUrl}?embed=1`;

const pagesByHash: Record<string, string> = {
  "#ecossistema-ufg": "ecosystem",
  "#ia-como-noticia-diaria": "daily-news",
  "#leituras-em-ia": "readings",
  "#ai-readings": "readings",
  "#panorama": "panorama",
};
const pageTitles: Record<string, string> = {
  ecosystem: "Ecossistema UFG",
  "daily-news": "IA como notícia diária",
  readings: "Leituras em IA",
  panorama: "Panorama da IA generativa",
  catalog: "Catálogo",
};
const pageFromHash = () => pagesByHash[window.location.hash] || "catalog";
const ecosystemFeaturedInitiatives: Initiative[] = [
  {
    id: "pos-graduacao-sistemas-agentes-inteligentes",
    acronym: "PÓS-AGENTES",
    name: "Especialização Lato Sensu — Pós-Graduação em Sistemas e Agentes Inteligentes",
    summary: "Formação da UFG voltada à construção de sistemas com agentes inteligentes. Realizada on-line aos sábados, articula 11 disciplinas e TCC.",
    areas: ["Agentes inteligentes", "Sistemas de IA", "Formação on-line", "11 disciplinas + TCC"],
    url: "https://agentes.inf.ufg.br/index.html",
    sourceUrl: "https://agentes.inf.ufg.br/index.html",
    color: "azul",
    order: -1,
    actionLabel: "Conhecer curso",
  },
];

const featuredHistory = [
  {
    date: "27 de setembro a 3 de outubro de 2026",
    source: "Curadoria do Observatório UFG-IA",
    title: "IA na ciência: da ferramenta ao agente",
    summary: "Uma síntese crítica sobre a passagem da IA de ferramenta analítica a agente científico, articulando descoberta, manuscritos executáveis, criatividade, autoria e responsabilidade.",
    links: [
      { label: "Quinta era da ciência", href: "https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003230" },
      { label: "Paper2Agent", href: "https://www.nature.com/articles/s41586-026-11044-y" },
      { label: "IA e relatividade", href: "https://www.nature.com/articles/d41586-026-02804-x" },
      { label: "Controvérsia na matemática", href: "https://www.science.org/content/article/how-ai-math-breakthrough-ignited-controversy" },
    ],
    eventLabel: "ia-na-ciencia-da-ferramenta-ao-agente",
  },
  {
    date: "19 a 26 de setembro de 2026",
    source: "Curadoria do Observatório UFG-IA",
    title: "IA entre o alarme e a evidência",
    summary: "Quatro leituras sobre segurança, consciência, escolhas sociais e cenários econômicos, separando alertas plausíveis de previsões e extrapolações.",
    links: [
      { label: "Dario Amodei", href: "https://darioamodei.com/post/we-must-pace-the-frontier" },
      { label: "Mustafa Suleyman", href: "https://mustafa-suleyman.ai/a-warning-about-model-welfare" },
      { label: "Pedro Novaes", href: "https://pnovaes.substack.com/p/sem-apocalipse-ou-redencao" },
      { label: "Cenários econômicos da Anthropic", href: "https://www.anthropic.com/institute/econ-scenarios" },
    ],
    eventLabel: "ia-entre-alarme-e-evidencia",
  },
  {
    date: "12 a 19 de setembro de 2026",
    source: "Observatório UFG-IA · Guia prático",
    title: "Como usar a IA fora do navegador",
    summary: "Um guia didático para começar a usar IA no terminal e explorar o potencial dos agentes.",
    href: "#panorama",
    eventLabel: "ia-fora-do-navegador",
  },
  {
    date: "5 a 11 de setembro de 2026",
    source: "MIT · Educação, aprendizagem e pesquisa",
    title: "IA na educação: mais do que regular ferramentas",
    summary: "Relatório do MIT sobre como redesenhar ensino, avaliação e formação docente para que a IA amplie, sem automatizar, a aprendizagem.",
    href: "https://drive.google.com/file/d/1aiDFYVOyyv43PWB9TKzP3xzX85iCVf4s/view?usp=drivesdk",
    eventLabel: "mit-ai-committee-report",
  },
  {
    date: "29 de agosto a 4 de setembro de 2026",
    source: "Bill Gates · Gates Notes",
    title: "A era turbulenta da IA chegou. As escolhas que fazemos agora são cruciais.",
    summary: "Bill Gates discute como a IA pode ampliar saúde, educação, agricultura e ciência, sem que isso dispense escolhas públicas urgentes sobre trabalho, desigualdade, segurança e infância.",
    links: [
      { label: "Ler o ensaio", href: "https://www.gatesnotes.com/a-turbulent-ai-era-and-critical-choices-to-make" },
      { label: "Ouvir o podcast", href: "https://drive.google.com/uc?export=download&id=1Ku_rnntTaz6fotiaAv3kCDRD8X1Mzo7Q" },
    ],
    eventLabel: "gates-turbulent-ai-era-critical-choices",
  },
  {
    date: "22 a 28 de agosto de 2026",
    source: "Entrevista exclusiva · Observatório UFG-IA",
    title: "IA, arte e design: repertório crítico em tempos de transformação",
    summary: "Entrevista com Marcilon Almeida sobre como a IA reconfigura processos criativos, sem substituir repertório, julgamento e expressão humanos.",
    href: "https://drive.google.com/file/d/1mHCzff-0WYGG146KlpidVwn9_oE-cvZU/view?usp=drivesdk",
    eventLabel: "entrevista-marcilon-almeida-ia-arte-design",
  },
  {
    date: "15 a 21 de agosto de 2026",
    source: "Laerte Ferreira · Ensaio",
    title: "A Geopolítica da IA e a Soberania Nacional",
    summary: "Ensaio sobre a disputa tecnológica em IA e seus efeitos sobre autonomia, infraestrutura e soberania nacional.",
    links: [
      { label: "Ler o ensaio", href: "https://drive.google.com/file/d/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ/view" },
      { label: "Ouvir o podcast", href: "https://drive.google.com/uc?export=download&id=1NfkckiNeegn9XtW3NxOsbOFn73MZ6GSq" },
    ],
    eventLabel: "geopolitica-ia-soberania-nacional",
  },
  {
    date: "7 a 14 de agosto de 2026",
    source: "Curso híbrido · UFG/IESA/CIAMB",
    title: "Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra",
    summary: "Curso sobre fundamentos da IA e aplicação prática de modelos ao processamento e à classificação de imagens de sensoriamento remoto.",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w/viewform",
    eventLabel: "curso-ia-generativa-observacao-terra",
  },
  {
    date: "3 a 6 de agosto de 2026",
    source: "Folha de S.Paulo · Observatório de imprensa",
    title: "IA como notícia diária",
    summary: "Uma leitura curatorial da cobertura da Folha de S.Paulo sobre como a IA atravessa ciência, trabalho, cultura, regulação, território e meio ambiente.",
    href: "#ia-como-noticia-diaria",
    eventLabel: "daily-news",
  },
  {
    date: "24 de julho a 2 de agosto de 2026",
    source: "Open Weights Ledger · Carta aberta",
    title: "Open Weights and American AI Leadership",
    summary: "Carta aberta sobre modelos de pesos abertos, concorrência, segurança cibernética, autonomia tecnológica e liderança dos Estados Unidos em IA.",
    href: "https://openweights.gitlawb.com/",
    eventLabel: "open-weights-american-ai-leadership",
  },
  {
    date: "20 de julho de 2026",
    source: "The Batch · DeepLearning.AI",
    title: "Kimi K3 marca uma mudança no desenvolvimento de IA; Thinking Machines lança seu primeiro modelo de uso geral",
    summary: "Edição sobre lançamentos de modelos, agentes de IA no Android, Nemotron 3 Embed, NotebookLM e segurança.",
    href: "https://charonhub.deeplearning.ai/kimi-k3-marks-a-big-shift-in-ai-development/",
    eventLabel: "the-batch-kimi-k3-thinking-machines",
  },
  {
    date: "29 de maio de 2026",
    source: "The Batch · DeepLearning.AI",
    title: "Gemini fica mais caro, a regulação europeia desacelera e agentes passam a dirigir tráfego na web",
    summary: "Edição sobre preços de modelos, mudanças no AI Act e o crescimento do tráfego online conduzido por agentes.",
    href: "https://www.deeplearning.ai/the-batch/tag/may-29-2026",
    eventLabel: "the-batch-may-29-2026",
  },
];

const cloudRecentArticleLimit = 60;
const cloudHistoricalWeight = 0.06;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function App() {
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { query, setQuery, selectedKeyword, setSelectedKeyword, type, setType, theme, setTheme, visible, setVisible, showAll, setShowAll, sort, setSort, view, setView, item, filtersOpen, setFiltersOpen, allTopics, setAllTopics, detailHref, openDetail, closeDetail } = useCatalogExperience("todos");
  const [showFeaturedHistory, setShowFeaturedHistory] = useState(false);
  const [page, setPage] = useState(pageFromHash);
  const previousPage = useRef(page);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      setRefreshing(true);
      try {
        const result = await loadCatalog();
        if (active) {
          setCatalog(result);
          setLastUpdated(new Date());
          setError("");
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o catálogo.");
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void refresh();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncPage = () => {
      const nextPage = pageFromHash();
      const pageChanged = nextPage !== previousPage.current;
      setPage(nextPage);
      previousPage.current = nextPage;
      const title = `${pageTitles[nextPage]} | Observatório UFG-IA`;
      document.title = title;
      trackPageView(window.location.hash || "/", title);
      if (pageChanged) {
        window.requestAnimationFrame(() => {
          const anchorId = nextPage === "catalog" ? window.location.hash.slice(1) : "";
          const anchor = ["categorias", "palavras-chave", "catalogo"].includes(anchorId)
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
    const initialTitle = `${pageTitles[pageFromHash()]} | Observatório UFG-IA`;
    document.title = initialTitle;
    trackPageView(window.location.hash || "/", initialTitle);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  const nonNewsArticles = useMemo(
    () => (catalog?.articles || []).filter((article) => article.type !== "noticia"),
    [catalog],
  );
  const articles = useMemo(
    () => nonNewsArticles.filter((article) => article.type !== "paper" || isPublicResearchPaper(article)),
    [nonNewsArticles],
  );
  const initiatives = catalog?.initiatives || [];
  const themes = useMemo(() => Array.from(new Set(articles.filter((article) => type === "todos" || article.type === type).map((article) => article.type === "paper" ? paperResearchArea(article) || article.theme : article.theme))).sort(), [articles, type]);
  const counts = useMemo(() => ({
    todos: articles.length,
    medium: articles.filter((article) => article.type === "medium").length,
    documento: articles.filter((article) => article.type === "documento").length,
    "link-video": articles.filter((article) => article.type === "link-video").length,
    audio: articles.filter((article) => article.type === "audio").length,
    noticia: articles.filter((article) => article.type === "noticia").length,
    paper: articles.filter((article) => article.type === "paper").length,
    apresentacao: articles.filter((article) => article.type === "apresentacao").length,
    entrevista: articles.filter((article) => article.type === "entrevista").length,
  }), [articles]);
  const collectionChart = useMemo(() => {
    const entries = categoryTypes.map((category) => ({
      category,
      label: chartLabels[category],
      count: counts[category],
    }));
    const maximum = Math.max(...entries.map((entry) => entry.count), 1);

    return entries.map((entry) => ({
      ...entry,
      percentage: entry.count ? Math.max((entry.count / maximum) * 100, 4) : 0,
    }));
  }, [counts]);

  const blogCategories = useMemo(() => collectionThemes(articles, "medium"), [articles]);
  const videoCategories = useMemo(() => collectionThemes(articles, "link-video"), [articles]);
  const presentationCategories = useMemo(() => collectionThemes(articles, "apresentacao"), [articles]);
  const paperCategories = useMemo(() => paperResearchAreas.map((area) => ({
    area,
    count: articles.filter((article) => article.type === "paper" && paperResearchArea(article) === area).length,
  })), [articles]);

  const keywordCloudRecentIds = useMemo(
    () => recentInclusionIdsWithTies(articles, cloudRecentArticleLimit),
    [articles],
  );

  const keywordCloud = useMemo(() => {
    const sorted = buildKeywordCloud(articles, keywordCloudRecentIds, Number.MAX_SAFE_INTEGER, cloudHistoricalWeight);
    const maximum = Math.max(...sorted.map((keyword) => keyword.score), 1);

    return sorted.map((keyword) => ({
      ...keyword,
      size: 0.92 + Math.sqrt(keyword.score / maximum) * 2,
    }));
  }, [articles, keywordCloudRecentIds]);

  const orderArticles = useMemo(() => (left: Article, right: Article) =>
    (sort === "published" ? catalogDate(right.publishedAt) - catalogDate(left.publishedAt) : catalogDate(right.includedAt) - catalogDate(left.includedAt)) || newestFirst(left, right), [sort]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return articles.filter((article) => {
      const matchesType = type === "todos" || article.type === type;
      const matchesTheme = theme === "todos" || (article.type === "paper" ? paperResearchArea(article) === theme : article.theme === theme);
      const matchesKeyword = !selectedKeyword || matchesCloudTerm(article, selectedKeyword);
      const haystack = normalize([
        article.title,
        article.author,
        article.source,
        article.theme,
        article.subtheme,
        article.summary,
        ...article.tags,
      ].join(" "));
      return matchesType && matchesTheme && matchesKeyword && (!needle || haystack.includes(needle));
    }).sort(orderArticles);
  }, [articles, query, selectedKeyword, theme, type, orderArticles]);

  const latestByCategory = useMemo(() => categoryTypes.flatMap((category) => {
    const items = articles.filter((article) => article.type === category);
    if (!items.length) return [];

    return items.reduce((latest, article) => orderArticles(article, latest) < 0 ? article : latest);
  }).sort(orderArticles), [articles, orderArticles]);

  const isInitialSelection = !showAll && !query && !selectedKeyword && type === "todos" && theme === "todos";
  const displayedArticles = isInitialSelection ? latestByCategory : filtered;

  const revealCatalog = () => {
    setSelectedKeyword("");
    setVisible(15);
    setShowAll(true);
    trackEvent("search_from_hero", { event_category: "search", event_label: query.trim() || "all" });
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedKeyword("");
    setType("todos");
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    trackEvent("clear_filters");
  };

  const selectKeyword = (keyword: string) => {
    setQuery("");
    setSelectedKeyword(keyword);
    setType("todos");
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    trackEvent("select_keyword", { event_category: "cloud", event_label: keyword });
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    if (category === "medium") {
      trackEvent("open_ai_readings", { event_category: "navigation", event_label: "collection-card" });
      window.location.hash = "leituras-em-ia";
      return;
    }
    setType(category);
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    trackEvent("select_category", { event_category: "filter", event_label: category });
    const destination = category === "link-video" || category === "apresentacao" || category === "paper"
      ? "categorias"
      : "catalogo";
    window.requestAnimationFrame(() => document.getElementById(destination)?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCollectionTheme = (contentType: "medium" | "link-video" | "apresentacao", collectionTheme: string) => {
    setType(contentType);
    setTheme(collectionTheme);
    setVisible(15);
    setShowAll(true);
    trackEvent("select_collection_theme", { event_category: "filter", event_label: `${contentType}:${collectionTheme}` });
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectPaperArea = (area: string) => {
    setType("paper");
    setTheme(area);
    setVisible(15);
    setShowAll(true);
    trackEvent("select_paper_area", { event_category: "filter", event_label: area });
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const activeCollection = type === "medium"
    ? { label: "Leituras em IA", description: "Selecione um tema para ver os artigos e ensaios relacionados.", categories: blogCategories, contentType: "medium" as const }
    : type === "link-video"
      ? { label: "Links & vídeos", description: "Sete temas organizam todos os links e vídeos, sem categorias repetidas.", categories: videoCategories, contentType: "link-video" as const }
      : type === "apresentacao"
        ? { label: "Apresentações", description: "Selecione um tema para ver as apresentações relacionadas.", categories: presentationCategories, contentType: "apresentacao" as const }
        : null;

  return (
    <main id="top" className="site-shell">
      <a className="skip-link" href={page === "readings" ? "#readings-results-title" : "#catalogo"}>{page === "readings" ? "Ir para as leituras" : "Ir para o catálogo"}</a>

      <InstitutionalBand />
    <header className="topbar">
        <a className="brand" href="#top" onClick={() => { if (item) closeDetail(); }} aria-label="Observatório UFG-IA - início">
          <span className="brand-mark"><Library size={21} aria-hidden="true" /></span>
          <span className="brand-name"><strong>Observatório</strong><strong>UFG-IA</strong></span>
        </a>
        <nav className="primary-navigation" aria-label="Navegação principal">
          <div className="catalog-nav-links">
            <a href="#categorias">Categorias</a>
            <a href="#palavras-chave" onClick={() => trackEvent("nav_subjects")}>Assuntos</a>
          </div>
          <a className="readings-nav-link" href="#leituras-em-ia" aria-current={page === "readings" ? "page" : undefined} onClick={() => trackEvent("nav_ai_readings")}><span><strong>Leituras</strong><small>em IA</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="ecosystem-nav-link" href="#ecossistema-ufg" aria-current={page === "ecosystem" ? "page" : undefined} onClick={() => trackEvent("nav_ecosystem")}>Ecossistema UFG <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="form-nav-link" href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_participate", { event_category: "outbound", event_label: "forms.gle" })}><span><strong>Participe!</strong><small>Como você está usando a IA?</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="daily-news-nav-link" href="#ia-como-noticia-diaria" aria-current={page === "daily-news" ? "page" : undefined} onClick={() => trackEvent("nav_daily_news")}><span><strong>IA como notícia</strong><small>diária</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="panorama-nav-link" href="#panorama" aria-current={page === "panorama" ? "page" : undefined} onClick={() => trackEvent("nav_panorama")}><span><strong>Panorama</strong><small>IA generativa</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
        </nav>
  <div className="language-switch" aria-label="Idioma">
          <span aria-current="page">Português</span>
          <a href={languageUrl("en")} lang="en">English</a>
        </div>
        <a className="header-search" href="#catalogo" aria-label="Buscar no acervo"><Search size={21} aria-hidden="true" /></a>
      <details className="mobile-navigation">
          <summary><Menu size={20} aria-hidden="true" /><span>Menu</span></summary>
          <div className="mobile-navigation-panel" role="navigation" aria-label="Navegação principal" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
            <a href="#categorias">Categorias</a>
            <a href="#palavras-chave" onClick={() => trackEvent("nav_subjects")}>Assuntos</a>
            <a href="#leituras-em-ia" aria-current={page === "readings" ? "page" : undefined} onClick={() => trackEvent("nav_ai_readings")}>Leituras em IA</a>
            <a href="#ecossistema-ufg" aria-current={page === "ecosystem" ? "page" : undefined} onClick={() => trackEvent("nav_ecosystem")}>Ecossistema UFG</a>
            <a href="#ia-como-noticia-diaria" aria-current={page === "daily-news" ? "page" : undefined} onClick={() => trackEvent("nav_daily_news")}>IA como notícia diária</a>
            <a href="#panorama" aria-current={page === "panorama" ? "page" : undefined} onClick={() => trackEvent("nav_panorama")}>Panorama IA generativa</a>
            <a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_participate", { event_category: "outbound", event_label: "forms.gle" })}>Participe! <ArrowUpRight size={15} aria-hidden="true" /></a>
            <div className="mobile-language-switch"><span aria-current="page">Português</span><a href={languageUrl("en")} lang="en">English</a></div>
          </div>
        </details>
      </header>

      {item ? <ArticleDetail article={articles.find((article) => article.id === item)} loading={!catalog && !error} onClose={closeDetail} /> : page === "ecosystem" ? <EcosystemPage initiatives={initiatives} /> : page === "daily-news" ? <DailyNewsPage /> : page === "readings" ? <MediumReadingsPage articles={articles} loading={!catalog && !error} error={error} detailHref={detailHref} onOpen={openDetail} /> : page === "panorama" ? <PanoramaPage /> : <div className="home-page">
      <section className="catalog-intro" aria-labelledby="page-title">
        <div className="intro-copy-block">
          <p className="eyebrow">Inteligência artificial em perspectiva</p>
          <h1 id="page-title">Conhecimento sobre IA para estudo, pesquisa e debate</h1>
          <p className="intro-copy">Leituras selecionadas, documentos, vídeos, áudios, entrevistas, papers científicos e apresentações reunidos em um acervo temático.</p>
          <form className="hero-search" role="search" onSubmit={(event) => { event.preventDefault(); revealCatalog(); }}>
            <Search size={22} aria-hidden="true" />
            <label className="sr-only" htmlFor="hero-search-pt">Buscar no acervo</label>
            <input id="hero-search-pt" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); }} placeholder="Busque por tema, título, autor ou palavra-chave" />
            <button type="submit">Pesquisar</button>
          </form>
          <p className="hero-search-hint">Pesquise diretamente nos {articles.length || "mais de 1.000"} itens selecionados e resumidos pela UFG.</p>
        </div>
        <div className="collection-chart" aria-label="Número de itens por categoria">
          <p className="collection-chart-title">Itens por categoria</p>
          <ul>
            {collectionChart.map(({ category, label, count, percentage }) => (
              <li key={category} style={{
                "--bar-color": chartColors[category].bar,
                "--bar-track": chartColors[category].track,
              } as CSSProperties}>
                <span className="collection-chart-label">{label}</span>
                <span className="collection-chart-track" aria-hidden="true">
                  <span className="collection-chart-bar" style={{ "--bar-value": `${percentage}%` } as CSSProperties} />
                </span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="weekly-highlight weekly-highlight--debate" aria-labelledby="weekly-highlight-title">
        <FeaturedDebate language="pt" />
        <button
          type="button"
          className="weekly-highlight-history-toggle"
          aria-expanded={showFeaturedHistory}
          aria-controls="weekly-highlight-history"
          onClick={() => {
            setShowFeaturedHistory((isOpen) => !isOpen);
            trackEvent("toggle_featured_history", { event_category: "navigation", event_label: showFeaturedHistory ? "close" : "open" });
          }}
        >
          <Clock3 size={16} aria-hidden="true" />
          <span>O que já foi destaque?</span>
          <ChevronDown size={16} className={showFeaturedHistory ? "is-open" : ""} aria-hidden="true" />
        </button>
        {showFeaturedHistory && (
          <div id="weekly-highlight-history" className="weekly-highlight-history" aria-label="Temas anteriores em destaque">
            <p className="eyebrow">Destaques anteriores</p>
            <div className="weekly-highlight-history-grid">
              {featuredHistory.map((featured) => {
                const links = featured.links ?? [{ label: "Acessar tema", href: featured.href || "#" }];
                return <article key={featured.eventLabel} className="weekly-highlight-history-item">
                  <p>{featured.date} · {featured.source}</p>
                  <h3>{featured.title}</h3>
                  <span>{featured.summary}</span>
                  <div className="weekly-highlight-history-links">
                    {links.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined} onClick={() => trackEvent("open_featured_history", { event_category: link.href.startsWith("http") ? "outbound" : "navigation", event_label: `${featured.eventLabel}:${link.label}` })}>
                      {link.label} <ArrowUpRight size={15} aria-hidden="true" />
                    </a>)}
                  </div>
                </article>;
              })}
            </div>
          </div>
        )}
      </section>

      <section id="catalogo" className="search-panel" aria-label="Busca no acervo">
        <label className="search-field">
          <Search size={23} aria-hidden="true" />
          <span className="sr-only">Buscar no acervo</span>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setVisible(15); setShowAll(true); }}
            placeholder="Busque por título, autor, resumo, tema ou palavra-chave"
          />
          {query && <button type="button" className="icon-button" onClick={() => { setQuery(""); setSelectedKeyword(""); trackEvent("clear_search"); }} aria-label="Limpar busca"><X size={18} /></button>}
        </label>
        <button className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filter-options" onClick={() => setFiltersOpen(!filtersOpen)}>Filtrar e ordenar <ChevronDown size={18} aria-hidden="true" /></button>
        <div id="catalog-filter-options" className={filtersOpen ? "filter-row is-open" : "filter-row"}>
          <div className="type-tabs" role="group" aria-label="Tipo de publicação">
            {catalogFilterTypes.map((key) => (
              <button
                type="button"
                key={key}
                className={type === key ? "active" : ""}
                onClick={() => { setType(key); setTheme("todos"); setVisible(15); setShowAll(true); trackEvent("select_type_tab", { event_category: "filter", event_label: key }); }}
                aria-pressed={type === key}
              >
                {typeLabels[key]} <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="select-filter">
            <span className="sr-only">Filtrar por tema</span>
            <select id="temas" value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(15); setShowAll(true); trackEvent("select_theme", { event_category: "filter", event_label: event.target.value }); }}>
              <option value="todos">Todos os temas</option>
              {(type === "paper" ? paperResearchAreas : themes).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        </div>
        <div className="catalog-toolbar">
        <label className="sort-control">Ordenar por <select value={sort} onChange={(event) => { setSort(event.target.value as "added" | "published"); setVisible(15); }}>
          <option value="added">Inclusão mais recente</option><option value="published">Publicação mais recente</option>
        </select></label>
        <div className="view-switch" role="group" aria-label="Visualização"><button aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cartões</button><button aria-pressed={view === "list"} onClick={() => setView("list")}>Lista</button></div>
      </div>
      {(query || selectedKeyword || type !== "todos" || theme !== "todos") && <div className="active-filters" aria-label="Filtros ativos">
        {query && <button onClick={() => { setQuery(""); setSelectedKeyword(""); }}>Busca: {query} ×</button>}{selectedKeyword && <button onClick={() => setSelectedKeyword("")}>Assunto: {selectedKeyword} ×</button>}
        {type !== "todos" && <button onClick={() => { setType("todos"); setTheme("todos"); }}>{typeLabels[type]} ×</button>}
        {theme !== "todos" && <button onClick={() => setTheme("todos")}>{theme} ×</button>}
        <button onClick={resetFilters}>Limpar tudo</button>
      </div>}
      <div className={`sync-line ${catalog?.warning ? "has-warning" : ""}`} aria-live="polite">
          <span>
            {catalog?.source === "google-sheets" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
            {catalog?.warning || (lastUpdated ? `Catálogo sincronizado às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Carregando catálogo")}
          </span>
          <button type="button" onClick={() => { trackEvent("refresh_catalog"); window.location.reload(); }} title="Atualizar catálogo" aria-label="Atualizar catálogo">
            <RefreshCw size={15} className={refreshing ? "spinning" : ""} />
          </button>
        </div>
      </section>

      {error ? (
        <section className="empty-state" role="alert">
          <FileText size={30} />
          <h2>Catálogo indisponível</h2>
          <p>{error}</p>
          <button type="button" onClick={() => { trackEvent("retry_load"); window.location.reload(); }}>Tentar novamente</button>
        </section>
      ) : !catalog ? (
        <section className="loading-state" aria-live="polite">
          <LoaderCircle className="spinning" size={28} />
          <span>Carregando acervo…</span>
        </section>
      ) : (
        <>
          <section className="results-heading" aria-live="polite">
            <div>
              <p className="eyebrow">{isInitialSelection ? "Seleção inicial" : "Catálogo"}</p>
              <h2>{isInitialSelection ? "Explore as novidades do acervo" : `${displayedArticles.length} ${displayedArticles.length === 1 ? "item encontrado" : "itens encontrados"}`}</h2>
            </div>
            {isInitialSelection ? (
              <button type="button" className="clear-filters" onClick={() => { setShowAll(true); setVisible(15); trackEvent("view_all_catalog"); }}>Ver todo o acervo</button>
            ) : (query || type !== "todos" || theme !== "todos") && (
              <button type="button" className="clear-filters" onClick={resetFilters}><X size={16} /> Limpar filtros</button>
            )}
          </section>

          {displayedArticles.length ? (
            <div className={`article-grid view-${view}`}>
              {displayedArticles.slice(0, visible).map((article) => <CatalogCard key={article.id} article={article} href={detailHref(article.id)} onOpen={openDetail} />)}
            </div>
          ) : (
            <section className="empty-state">
              <Search size={30} />
              <h2>Nenhum item encontrado</h2>
              <p>Tente outro termo ou remova os filtros.</p>
              <button type="button" onClick={() => { resetFilters(); trackEvent("view_all_empty"); }}>Ver todo o acervo</button>
            </section>
          )}

          {visible < displayedArticles.length && (
            <button type="button" className="load-more" onClick={() => { setVisible((value) => value + 15); trackEvent("load_more", { event_category: "pagination" }); }}>Carregar mais itens</button>
          )}
        </>
      )}
      <section id="categorias" className="category-band" aria-labelledby="category-title">
        <div className="category-heading">
          <p className="eyebrow">Coleções</p>
          <h2 id="category-title">Acesse por tipo de conteúdo</h2>
        </div>
        <div className="category-grid">
          {categoryTypes.map((category) => {
            const Icon = typeIcons[category];
            return (
              <button
                type="button"
                key={category}
                className={type === category ? "category-button active" : "category-button"}
                onClick={() => selectCategory(category)}
                aria-pressed={type === category}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{typeLabels[category]}</span>
                <strong>{counts[category]}</strong>
              </button>
            );
          })}
        </div>
        {activeCollection && (
          <div className="blog-subcategories" aria-label={`Temas de ${activeCollection.label}`}>
            <div className="blog-subcategories-heading">
              <div>
                <p className="eyebrow">{activeCollection.label}</p>
                <h3>Explore por tema</h3>
              </div>
              <p>{activeCollection.description}</p>
            </div>
            <div className="blog-subcategory-grid">
              {activeCollection.categories.map(({ theme: collectionTheme, count }) => (
                <button
                  type="button"
                  key={collectionTheme}
                  className={theme === collectionTheme ? "blog-subcategory-button active" : "blog-subcategory-button"}
                  onClick={() => selectCollectionTheme(activeCollection.contentType, collectionTheme)}
                  aria-pressed={theme === collectionTheme}
                >
                  <span>{collectionTheme}</span>
                  <strong>{count}</strong>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
        {type === "paper" && (
          <div className="blog-subcategories" aria-label="Áreas de IA na pesquisa científica">
            <div className="blog-subcategories-heading"><div><p className="eyebrow">IA na pesquisa científica</p><h3>Explore por área do conhecimento</h3></div><p>Seleção curada de estudos sobre IA generativa, modelos fundacionais, agentes e seus efeitos diretos na pesquisa.</p></div>
            <div className="blog-subcategory-grid">
              {paperCategories.map(({ area, count }) => <button type="button" key={area} className={theme === area ? "blog-subcategory-button active" : "blog-subcategory-button"} onClick={() => selectPaperArea(area)} aria-pressed={theme === area}><span>{area}</span><strong>{count}</strong><ArrowUpRight size={16} aria-hidden="true" /></button>)}
            </div>
          </div>
        )}
      </section>

      {keywordCloud.length > 0 && (
        <section id="palavras-chave" className="keyword-cloud-section" aria-labelledby="keyword-cloud-title">
          <div className="keyword-cloud-heading">
            <div>
              <p className="eyebrow">Temas em movimento</p>
              <h2 id="keyword-cloud-title">Radar de assuntos do acervo</h2>
            </div>
            <p>Palavras-chave editoriais, agrupadas por conceito. A ordem prioriza as {keywordCloudRecentIds.size} inclusões mais recentes, sem cortar empates de data, e preserva a recorrência na totalidade do catálogo publicado.</p>
          </div>
          <div className="keyword-cloud-legend" aria-label="Como ler o radar">
            <span><strong>{keywordCloudRecentIds.size}</strong> inclusões recentes orientam o peso</span>
            <span>a totalidade dos <strong>{articles.length}</strong> itens ativos publicados forma a base histórica</span>
          </div>
          <div className="keyword-cloud" aria-label="Radar de assuntos do acervo">
            {(allTopics ? keywordCloud : keywordCloud.slice(0, 8)).map((keyword, index) => {
              const recentLabel = `${keyword.recentCount} ${keyword.recentCount === 1 ? "inclusão recente" : "inclusões recentes"}`;
              const positionStyle = {
                "--cloud-size": `${keyword.size}rem`,
              } as CSSProperties;
              return (
              <button
                type="button"
                key={keyword.key}
                className={`keyword-cloud-item cloud-color-${index % 5}${selectedKeyword && cloudTermKey(selectedKeyword) === keyword.key ? " active" : ""}`}
                style={positionStyle}
                onClick={() => selectKeyword(keyword.label)}
                aria-pressed={cloudTermKey(selectedKeyword) === keyword.key}
                aria-label={`${keyword.label}: ${recentLabel} e ${keyword.count} ${keyword.count === 1 ? "item" : "itens"} no acervo`}
              >
                <span>{keyword.label}</span>
                <small className="sr-only"> {recentLabel} e {keyword.count} itens no acervo</small>
              </button>
              );
            })}
          </div>
          <button className="radar-toggle" aria-expanded={allTopics} onClick={() => setAllTopics(!allTopics)}>{allTopics ? "Mostrar principais assuntos" : `Ver todos os assuntos (${keywordCloud.length})`}</button>
        </section>
      )}

      <section id="experiencias-interativas" className="interactive-experience" aria-labelledby="interactive-experience-title">
        <div className="interactive-experience-copy">
          <p className="eyebrow">Experiências interativas · LAPIG / UFG</p>
          <h2 id="interactive-experience-title">Por dentro da IA <span>Da frase ao próximo token</span></h2>
          <p>Como um modelo de linguagem gera uma resposta? Acompanhe a jornada de uma frase sobre sensoriamento remoto, explore diagramas e experimente operações matemáticas passo a passo.</p>
          <p className="interactive-experience-scope">Uma introdução visual à inferência, com o GPT-3 como referência. Não é preciso dominar matemática ou programação.</p>
          <a className="interactive-experience-action" href={assetUrl("por-dentro-da-ia/")} onClick={() => trackEvent("open_interactive_inference", { event_category: "navigation", event_label: "por-dentro-da-ia" })}>Por dentro da IA <span aria-hidden="true">→</span></a>
          <small>Explore a aula e volte ao Observatório pelo botão no cabeçalho.</small>
        </div>
        <details className="interactive-experience-journey"><summary>Ver o percurso de aprendizagem</summary>
          <p className="eyebrow">A frase que guia a jornada</p>
          <blockquote>A vegetação saudável apresenta alta reflectância no infravermelho próximo.</blockquote>
          <ol aria-label="Etapas da geração do próximo token">
            <li><strong>01 · Tokens e embeddings</strong><span>O texto ganha representações numéricas.</span></li>
            <li><strong>02 · Blocos Transformer</strong><span>Atenção e redes neurais transformam as representações usando o contexto.</span></li>
            <li><strong>03 · Próximo token</strong><span>Escores para o vocabulário tornam-se probabilidades para escolher a continuação.</span></li>
          </ol>
        </details>
      </section>

<section className="portal-news"><h2>IA como notícia diária</h2><p>Explore o arquivo de imprensa por ano e assunto, com acesso às fontes originais.</p><a href="#ia-como-noticia-diaria">Explorar notícias →</a></section>
      <section className="obia-callout" aria-labelledby="obia-title">
        <a className="obia-logo-link" href="https://obia.nic.br/" target="_blank" rel="noreferrer" aria-label="Acessar o Observatório Brasileiro de Inteligência Artificial" onClick={() => trackEvent("open_obia", { event_category: "outbound", event_label: "obia" })}>
          <img src="https://obia.nic.br/img/logo-text-white.svg" alt="OBIA" />
          <span>Observatório Brasileiro de Inteligência Artificial</span>
        </a>
        <div>
          <p className="eyebrow">Brasil em foco</p>
          <h2 id="obia-title">Para saber mais sobre o uso e as perspectivas da IA no Brasil, acesse o Observatório Brasileiro de Inteligência Artificial.</h2>
        </div>
        <a className="obia-action" href="https://obia.nic.br/" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_obia", { event_category: "outbound", event_label: "obia" })}>Conhecer o OBIA <ArrowUpRight size={17} aria-hidden="true" /></a>
      </section>

      </div>}

      <footer className="footer">
        <div><strong>Observatório UFG-IA</strong><p>Acervo educacional em desenvolvimento contínuo.</p><div className="footer-links"><a className="github-footer-link" href="https://github.com/lapig-ufg" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_github", { event_category: "outbound", event_label: "github" })}>GitHub do LAPIG/UFG <ArrowUpRight size={14} aria-hidden="true" /></a><a className="github-footer-link" href="https://victorgit10.github.io/audiencia-observatorio/" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_audiencia", { event_category: "outbound", event_label: "audiencia" })}>Quem visita o Observatório? <ArrowUpRight size={14} aria-hidden="true" /></a></div></div>
        <div><span>LAPIG • Universidade Federal de Goiás</span><p>Conteúdo público com acesso às fontes originais.</p><p className="credits"><strong>Desenvolvimento e curadoria:</strong> <a href="mailto:laerte@ufg.br">Laerte Ferreira</a>, <a href="mailto:victor.amaral@ufg.br">Victor Amaral</a> e <a href="mailto:tiagogoncalves@discente.ufg.br">Tiago Geraldine</a>.</p><p className="contact-callout">Dúvidas? Sugestões? <a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_contact_form", { event_category: "outbound", event_label: "contato" })}>Entre em contato <ArrowUpRight size={14} aria-hidden="true" /></a></p></div>
      </footer>
    </main>
  );
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(initiative.url)}`;
  return (
    <article className={`initiative-card initiative-${normalize(initiative.color).replace(/\s+/g, "-")}`}>
      <div className="initiative-mark">
        <img src={logoUrl} alt={`Marca de ${initiative.acronym}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        <Building2 className="initiative-mark-fallback" size={25} aria-hidden="true" />
      </div>
      <p className="initiative-acronym">{initiative.acronym}</p>
      <h3>{initiative.name}</h3>
      <p>{initiative.summary}</p>
      <ul aria-label="Frentes de atuação">
        {initiative.areas.map((area) => <li key={area}>{area}</li>)}
      </ul>
      <a href={initiative.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_initiative", { event_category: "ecosystem", event_label: initiative.acronym })}>
        {initiative.actionLabel || "Conhecer iniciativa"} <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </article>
  );
}

function EcosystemPage({ initiatives }: { initiatives: Initiative[] }) {
  const visibleInitiatives = [
    ...ecosystemFeaturedInitiatives,
    ...initiatives.filter((initiative) => !ecosystemFeaturedInitiatives.some((featured) => featured.id === initiative.id || featured.url === initiative.url)),
  ];

  return (
    <section id="ecossistema-ufg" className="ecosystem-page" aria-labelledby="ecosystem-title">
      <div className="ecosystem-hero">
        <p className="eyebrow">Universidade Federal de Goiás</p>
        <h1 id="ecosystem-title">Ecossistema UFG em inteligência artificial</h1>
        <p>Conheça centros, redes e formações que conectam conhecimento, tecnologia e políticas públicas.</p>
        <a className="back-to-catalog" href="#top" onClick={() => trackEvent("back_to_catalog")}>← Voltar ao acervo</a>
      </div>
      <aside className="ecosystem-mapping-callout" aria-label="Mapeamento da IA na UFG">
        <div>
          <p className="ecosystem-mapping-kicker">Sua iniciativa de IA não está aqui?</p>
          <p>Então responda ao nosso <strong>mapeamento da IA na UFG</strong>. É bem simples e rápido!</p>
        </div>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSe3qfZ5hjL0NifRXvI-SM6NKDN7g8DoFQJyoTTRTvhlptWk-w/viewform" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_mapping_form", { event_category: "outbound", event_label: "mapeamento" })}>Participar do mapeamento <ArrowUpRight size={17} aria-hidden="true" /></a>
      </aside>
      {visibleInitiatives.length ? (
        <div className="ecosystem-initiative-grid">
          {visibleInitiatives.map((initiative) => <InitiativeCard key={initiative.id} initiative={initiative} />)}
        </div>
      ) : (
        <div className="ecosystem-empty">As iniciativas estão sendo carregadas.</div>
      )}
    </section>
  );
}

function PanoramaPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // A topbar muda de altura entre breakpoints (uma, duas, três fileiras) e o
  // rodapé do site fica abaixo da dobra. A altura do iframe é medida, não
  // chutada: sob a faixa sobra exatamente a janela, qualquer que seja a
  // largura — sem cortes e sem rolagem. Os créditos ficam na topbar do site
  // e no rodapé do próprio painel, então não há barra de nota aqui.
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

  return (
    <section id="panorama" className="panorama-page" aria-labelledby="panorama-title">
      <div className="panorama-intro">
        <a className="back-to-catalog" href="#top" onClick={() => trackEvent("back_to_catalog")}>← Voltar ao acervo</a>
        <div className="panorama-heading">
          <h1 id="panorama-title">Panorama Global da IA Generativa</h1>
          <p>Os lançamentos de modelos desde o ChatGPT (nov/2022), qual modelo usar em cada tipo de tarefa e o que dá para usar de graça.</p>
        </div>
        <a className="panorama-open" href={panoramaUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_panorama_standalone", { event_category: "outbound", event_label: "panorama" })}>Abrir em nova aba <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
      <iframe
        ref={frameRef}
        className="panorama-frame"
        src={panoramaEmbedUrl}
        title="Panorama Global da IA Generativa"
        loading="lazy"
      />
    </section>
  );
}
