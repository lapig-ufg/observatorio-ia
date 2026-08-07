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
  LockKeyhole,
  Newspaper,
  Presentation,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { assetUrl, loadCatalog, type Article, type ArticleType, type CatalogLoadResult, type Initiative } from "./catalog";
import { trackEvent, trackPageView } from "./analytics";
import { DailyNewsPage } from "./DailyNewsPage";
import { isEditorialCloudTerm } from "./keywordCloud";
import { isPublicResearchPaper, paperResearchArea, paperResearchAreas } from "./paperResearch";

const typeLabels: Record<"todos" | ArticleType, string> = {
  todos: "Todos",
  medium: "Blogs",
  documento: "Documentos gerais",
  "link-video": "Links e vídeos",
  noticia: "Jornais e notícias",
  paper: "IA na pesquisa científica",
  apresentacao: "Apresentações",
};

const typeIcons = {
  medium: Sparkles,
  documento: FileText,
  "link-video": Link2,
  noticia: Newspaper,
  paper: BookOpen,
  apresentacao: Presentation,
};

const actionLabels: Record<ArticleType, string> = {
  medium: "Ler publicação",
  documento: "Acessar documento",
  "link-video": "Acessar conteúdo",
  noticia: "Ler notícia",
  paper: "Acessar paper",
  apresentacao: "Ver apresentação",
};

// Notícias têm página editorial própria em “IA como notícia diária”. Os registros
// permanecem na fonte, mas não fazem parte do catálogo público geral.
const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "paper", "apresentacao"];
const catalogFilterTypes: Array<"todos" | ArticleType> = ["todos", ...categoryTypes];
const chartLabels: Record<ArticleType, string> = {
  medium: "Blogs",
  documento: "Documentos",
  "link-video": "Links e vídeos",
  noticia: "Notícias",
  paper: "Pesquisa científica",
  apresentacao: "Apresentações",
};
const chartColors: Record<ArticleType, { bar: string; track: string }> = {
  medium: { bar: "#16715b", track: "#cfe6dc" },
  documento: { bar: "#28759f", track: "#d4e6f0" },
  "link-video": { bar: "#bd5a37", track: "#f2d9ce" },
  noticia: { bar: "#b87516", track: "#f1e3bf" },
  paper: { bar: "#70569b", track: "#e2d9ee" },
  apresentacao: { bar: "#bd4659", track: "#f1d4da" },
};
// Painel externo do LAPIG exibido dentro do site. O parâmetro embed pede ao
// painel que esconda o próprio cabeçalho, já que ele roda aqui dentro.
const panoramaUrl = "https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/";
const panoramaEmbedUrl = `${panoramaUrl}?embed=1`;

const pagesByHash: Record<string, string> = {
  "#ecossistema-ufg": "ecosystem",
  "#ia-como-noticia-diaria": "daily-news",
  "#panorama": "panorama",
};
const pageTitles: Record<string, string> = {
  ecosystem: "Ecossistema UFG",
  "daily-news": "IA como notícia diária",
  panorama: "Panorama da IA generativa",
  catalog: "Catálogo",
};
const pageFromHash = () => pagesByHash[window.location.hash] || "catalog";
const blogThemes = [
  "Fundamentos, matemática e deep learning",
  "Transformers e atenção",
  "LLMs e IA generativa",
  "Agentes, RAG e aplicações",
  "Bases vetoriais e conhecimento",
  "Modelos, mercado e indústria",
  "Aprendizado, pesquisa e produtividade",
];

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

const maxCloudWords = 20;
const cloudRecentArticleLimit = 60;
const cloudHistoricalWeight = 0.06;
const cloudPositions = [
  [50, 50, 0], [50, 31, 0], [34, 43, 0], [66, 43, 0], [38, 62, 0], [62, 62, 0],
  [50, 74, 0], [50, 16, 0], [29, 27, 0], [71, 27, 0], [21, 52, 0], [79, 52, 0],
  [27, 76, 0], [73, 76, 0], [50, 87, 0], [39, 20, 0], [61, 20, 0], [22, 37, 0],
  [78, 37, 0], [50, 63, 0],
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Equivalências editoriais deliberadas. Não há lematização automática: ela
// criaria aproximações semânticas indevidas em um acervo multidisciplinar.
const cloudTermAliases: Record<string, string> = {
  agente: "agentes",
  agentes: "agentes",
  "agente de ia": "agentes",
  "agentes de ia": "agentes",
  ferramenta: "ferramentas",
  ferramentas: "ferramentas",
  "large language model": "llms",
  "large language models": "llms",
  llm: "llms",
  llms: "llms",
  modelo: "modelos",
  modelos: "modelos",
  "rede neural": "redes neurais",
  "redes neurais": "redes neurais",
  sistema: "sistemas",
  sistemas: "sistemas",
  transformer: "transformers",
  transformers: "transformers",
  vetor: "vetores",
  vetores: "vetores",
  embedding: "embeddings",
  embeddings: "embeddings",
};

const cloudTermLabels: Record<string, string> = {
  agentes: "Agentes",
  ferramentas: "Ferramentas",
  llms: "LLMs",
  modelos: "Modelos",
  "redes neurais": "Redes neurais",
  sistemas: "Sistemas",
  transformers: "Transformers",
  vetores: "Vetores",
};

const cloudExcludedTerms = new Set(["ia", "inteligencia artificial", "artificial intelligence"]);

function cloudTermKey(value: string) {
  const key = normalize(value.trim());
  return cloudTermAliases[key] || key;
}

const portugueseMonths: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function catalogDate(value: string) {
  const text = value.trim();
  if (!text) return 0;

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));

  const localizedDate = normalize(text).match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (localizedDate && localizedDate[2] in portugueseMonths) {
    return Date.UTC(Number(localizedDate[3]), portugueseMonths[localizedDate[2]], Number(localizedDate[1]));
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recency(article: Article) {
  return Math.max(catalogDate(article.publishedAt), catalogDate(article.includedAt));
}

function newestFirst(left: Article, right: Article) {
  return recency(right) - recency(left)
    || catalogDate(right.includedAt) - catalogDate(left.includedAt)
    || right.title.localeCompare(left.title, "pt-BR");
}

function cloudTerms(article: Article) {
  const terms = new Map<string, string>();
  article.tags.forEach((tag) => {
    if (!isEditorialCloudTerm(tag)) return;
    const key = cloudTermKey(tag);
    if (key && !cloudExcludedTerms.has(key)) terms.set(key, cloudTermLabels[key] || tag.trim());
  });
  return terms;
}

function matchesCloudTerm(article: Article, term: string) {
  const key = cloudTermKey(term);
  return cloudTerms(article).has(key);
}

export function App() {
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [type, setType] = useState<"todos" | ArticleType>("todos");
  const [theme, setTheme] = useState("todos");
  const [visible, setVisible] = useState(15);
  const [showAll, setShowAll] = useState(false);
  const [showFeaturedHistory, setShowFeaturedHistory] = useState(false);
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    let active = true;

    const refresh = async (quiet = false) => {
      if (!quiet) setRefreshing(true);
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
    const interval = window.setInterval(() => void refresh(true), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const syncPage = () => {
      const nextPage = pageFromHash();
      setPage(nextPage);
      trackPageView(window.location.hash || "/", pageTitles[nextPage]);
    };
    window.addEventListener("hashchange", syncPage);
    trackPageView(window.location.hash || "/", pageTitles[pageFromHash()]);
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
  const themes = useMemo(() => Array.from(new Set(articles.map((article) => article.theme))).sort(), [articles]);
  const counts = useMemo(() => ({
    todos: articles.length,
    medium: articles.filter((article) => article.type === "medium").length,
    documento: articles.filter((article) => article.type === "documento").length,
    "link-video": articles.filter((article) => article.type === "link-video").length,
    noticia: articles.filter((article) => article.type === "noticia").length,
    paper: articles.filter((article) => article.type === "paper").length,
    apresentacao: articles.filter((article) => article.type === "apresentacao").length,
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

  const blogCategories = useMemo(() => blogThemes.map((blogTheme) => ({
    theme: blogTheme,
    count: articles.filter((article) => article.type === "medium" && article.theme === blogTheme).length,
  })), [articles]);
  const videoCategories = useMemo(() => blogThemes.map((blogTheme) => ({
    theme: blogTheme,
    count: articles.filter((article) => article.type === "link-video" && article.theme === blogTheme).length,
  })), [articles]);
  const presentationCategories = useMemo(() => blogThemes.map((blogTheme) => ({
    theme: blogTheme,
    count: articles.filter((article) => article.type === "apresentacao" && article.theme === blogTheme).length,
  })), [articles]);
  const paperCategories = useMemo(() => paperResearchAreas.map((area) => ({
    area,
    count: articles.filter((article) => article.type === "paper" && paperResearchArea(article) === area).length,
  })), [articles]);

  const keywordCloud = useMemo(() => {
    const keywords = new Map<string, { label: string; itemIds: Set<string>; recentItemIds: Set<string> }>();
    const recentIds = new Set(articles
      .slice()
      .sort(newestFirst)
      .slice(0, cloudRecentArticleLimit)
      .map((article) => article.id));

    articles.forEach((article) => cloudTerms(article).forEach((label, key) => {
      const keyword = keywords.get(key);
      if (keyword) {
        keyword.itemIds.add(article.id);
        if (recentIds.has(article.id)) keyword.recentItemIds.add(article.id);
      } else {
        keywords.set(key, {
          label,
          itemIds: new Set([article.id]),
          recentItemIds: recentIds.has(article.id) ? new Set([article.id]) : new Set(),
        });
      }
    }));

    const sorted = Array.from(keywords.entries())
      .map(([key, keyword]) => ({
        key,
        label: keyword.label,
        count: keyword.itemIds.size,
        recentCount: keyword.recentItemIds.size,
        score: keyword.recentItemIds.size + keyword.itemIds.size * cloudHistoricalWeight,
      }))
      .sort((a, b) => b.score - a.score || b.recentCount - a.recentCount || b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, maxCloudWords);
    const maximum = Math.max(...sorted.map((keyword) => keyword.score), 1);

    return sorted.map((keyword) => ({
      ...keyword,
      size: 0.92 + Math.sqrt(keyword.score / maximum) * 2,
    }));
  }, [articles]);

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
    }).sort(newestFirst);
  }, [articles, query, selectedKeyword, theme, type]);

  const latestByCategory = useMemo(() => categoryTypes.flatMap((category) => {
    const items = articles.filter((article) => article.type === category);
    if (!items.length) return [];

    return items.reduce((latest, article) => newestFirst(article, latest) < 0 ? article : latest);
  }).sort(newestFirst), [articles]);

  const isInitialSelection = !showAll && !query && !selectedKeyword && type === "todos" && theme === "todos";
  const displayedArticles = isInitialSelection ? latestByCategory : filtered;

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
    setQuery(keyword);
    setSelectedKeyword(keyword);
    setType("todos");
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    trackEvent("select_keyword", { event_category: "cloud", event_label: keyword });
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    setType(category);
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    trackEvent("select_category", { event_category: "filter", event_label: category });
    const destination = category === "medium" || category === "link-video" || category === "apresentacao" || category === "paper"
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
    ? { label: "Blogs", description: "Selecione uma subcategoria para ver os artigos relacionados.", categories: blogCategories, contentType: "medium" as const }
    : type === "link-video"
      ? { label: "Links & vídeos", description: "Selecione uma subcategoria para ver os links e vídeos relacionados.", categories: videoCategories, contentType: "link-video" as const }
      : type === "apresentacao"
        ? { label: "Apresentações", description: "Selecione uma subcategoria para ver as apresentações relacionadas.", categories: presentationCategories, contentType: "apresentacao" as const }
        : null;

  return (
    <main id="top" className="site-shell">
      <a className="skip-link" href="#catalogo">Ir para o catálogo</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Observatório UFG-IA - início">
          <span className="brand-mark"><Library size={21} aria-hidden="true" /></span>
          <span className="brand-name"><strong>Observatório</strong><strong>UFG-IA</strong></span>
        </a>
        <nav aria-label="Navegação principal">
          <div className="catalog-nav-links">
            <a href="#categorias">Categorias</a>
            <a href="#palavras-chave" onClick={() => trackEvent("nav_subjects")}>Assuntos</a>
          </div>
          <a className="ecosystem-nav-link" href="#ecossistema-ufg" onClick={() => trackEvent("nav_ecosystem")}>Ecossistema UFG <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="form-nav-link" href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_participate", { event_category: "outbound", event_label: "forms.gle" })}><span><strong>Participe!</strong><small>Como você está usando a IA?</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="daily-news-nav-link" href="#ia-como-noticia-diaria" onClick={() => trackEvent("nav_daily_news")}><span><strong>IA como notícia</strong><small>diária</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="panorama-nav-link" href="#panorama" onClick={() => trackEvent("nav_panorama")}><span><strong>Panorama</strong><small>IA generativa</small></span> <ArrowUpRight size={15} aria-hidden="true" /></a>
        </nav>
        <div className="institutional-marks" aria-label="Instituições responsáveis">
          <a href="https://lapig.iesa.ufg.br/" target="_blank" rel="noreferrer" aria-label="LAPIG">
            <img src={assetUrl("brand/lapig-remote-sensing-gis-lab.png")} alt="LAPIG" />
          </a>
          <a href="https://ufg.br/" target="_blank" rel="noreferrer" aria-label="Universidade Federal de Goiás">
            <img src={assetUrl("brand/ufg-vertical-colorido.png")} alt="UFG" />
          </a>
        </div>
      </header>

      {page === "ecosystem" ? <EcosystemPage initiatives={initiatives} /> : page === "daily-news" ? <DailyNewsPage /> : page === "panorama" ? <PanoramaPage /> : <>
      <section className="catalog-intro" aria-labelledby="page-title">
        <div className="intro-copy-block">
          <p className="eyebrow">Inteligência artificial em perspectiva</p>
          <h1 id="page-title">Conhecimento sobre IA para estudo, pesquisa e debate</h1>
          <p className="intro-copy">Artigos de Blogs, documentos, vídeos, papers científicos e apresentações reunidos em um acervo temático.</p>
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

      <section className="weekly-highlight" aria-labelledby="weekly-highlight-title">
        <div className="weekly-highlight-kicker">
          <span>Em destaque...</span>
          <span>Curso híbrido · UFG/IESA/CIAMB</span>
        </div>
        <div className="weekly-highlight-content">
          <div>
            <p className="eyebrow">Segundas-feiras · 14h às 17h · 10 de agosto a 7 de dezembro de 2026</p>
            <h2 id="weekly-highlight-title">Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra</h2>
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
          </div>
          <div className="weekly-highlight-aside">
            <p>Curso sobre fundamentos conceituais, matemáticos e históricos da IA, com aplicação prática de modelos ao processamento e à classificação de imagens de sensoriamento remoto. Aborda redes neurais, Transformers, LLMs, atenção, embeddings, viés algorítmico, custo ambiental, integridade acadêmica e uso responsável da IA.</p>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w/viewform" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_weekly_highlight", { event_category: "outbound", event_label: "curso-ia-generativa-observacao-terra" })}>Participar ou acessar materiais <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
        {showFeaturedHistory && (
          <div id="weekly-highlight-history" className="weekly-highlight-history" aria-label="Temas anteriores em destaque">
            <p className="eyebrow">Destaques anteriores</p>
            <div className="weekly-highlight-history-grid">
              {featuredHistory.map((featured) => (
                <article key={featured.href} className="weekly-highlight-history-item">
                  <p>{featured.date} · {featured.source}</p>
                  <h3>{featured.title}</h3>
                  <span>{featured.summary}</span>
                  <a href={featured.href} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_featured_history", { event_category: "outbound", event_label: featured.eventLabel })}>
                    Acessar tema <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

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
          <div className="blog-subcategories" aria-label={`Subcategorias de ${activeCollection.label}`}>
            <div className="blog-subcategories-heading">
              <div>
                <p className="eyebrow">{activeCollection.label}</p>
                <h3>Explore pelas sete coleções</h3>
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
            <p>Palavras-chave editoriais, agrupadas por conceito. A ordem prioriza as {Math.min(cloudRecentArticleLimit, articles.length)} inclusões mais recentes e preserva a recorrência no acervo.</p>
          </div>
          <div className="keyword-cloud-legend" aria-label="Como ler o radar">
            <span><strong>{Math.min(cloudRecentArticleLimit, articles.length)}</strong> inclusões recentes orientam o peso</span>
            <span><strong>{articles.length}</strong> itens ativos formam a base histórica</span>
          </div>
          <div className="keyword-cloud" aria-label="Radar de assuntos do acervo">
            {keywordCloud.map((keyword, index) => {
              const [x, y, rotation] = cloudPositions[index % cloudPositions.length];
              const recentLabel = `${keyword.recentCount} ${keyword.recentCount === 1 ? "inclusão recente" : "inclusões recentes"}`;
              const positionStyle = {
                "--cloud-x": `${x}%`,
                "--cloud-y": `${y}%`,
                "--cloud-rotation": `${rotation}deg`,
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
        </section>
      )}

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
        <div className="filter-row">
          <div className="type-tabs" role="group" aria-label="Tipo de publicação">
            {catalogFilterTypes.map((key) => (
              <button
                type="button"
                key={key}
                className={type === key ? "active" : ""}
                onClick={() => { setType(key); setVisible(15); setShowAll(true); trackEvent("select_type_tab", { event_category: "filter", event_label: key }); }}
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
              {themes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        </div>
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
              <h2>{isInitialSelection ? "Um conteúdo recente por categoria" : `${displayedArticles.length} ${displayedArticles.length === 1 ? "item encontrado" : "itens encontrados"}`}</h2>
            </div>
            {isInitialSelection ? (
              <button type="button" className="clear-filters" onClick={() => { setShowAll(true); setVisible(15); trackEvent("view_all_catalog"); }}>Ver todo o acervo</button>
            ) : (query || type !== "todos" || theme !== "todos") && (
              <button type="button" className="clear-filters" onClick={resetFilters}><X size={16} /> Limpar filtros</button>
            )}
          </section>

          {displayedArticles.length ? (
            <div className="article-grid">
              {displayedArticles.slice(0, visible).map((article) => <ArticleCard key={article.id} article={article} />)}
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
      </>}

      <footer className="footer">
        <div><strong>Observatório UFG-IA</strong><p>Acervo educacional em desenvolvimento contínuo.</p><a className="github-footer-link" href="https://github.com/lapig-ufg" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_github", { event_category: "outbound", event_label: "github" })}>GitHub do LAPIG/UFG <ArrowUpRight size={14} aria-hidden="true" /></a></div>
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
  return (
    <section id="panorama" className="panorama-page" aria-labelledby="panorama-title">
      <div className="panorama-intro">
        <p className="eyebrow">Linha do tempo · LAPIG/UFG</p>
        <h1 id="panorama-title">Panorama Global da IA Generativa</h1>
        <p>Os lançamentos de modelos desde o ChatGPT (nov/2022), qual modelo usar em cada tipo de tarefa e o que dá para usar de graça.</p>
        <a className="back-to-catalog" href="#top" onClick={() => trackEvent("back_to_catalog")}>← Voltar ao acervo</a>
      </div>
      <iframe
        className="panorama-frame"
        src={panoramaEmbedUrl}
        title="Panorama Global da IA Generativa"
        loading="lazy"
      />
      <p className="panorama-note">
        Painel mantido pelo LAPIG, atualizado continuamente.{" "}
        <a href={panoramaUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_panorama_standalone", { event_category: "outbound", event_label: "panorama" })}>Abrir em nova aba <ArrowUpRight size={14} aria-hidden="true" /></a>
      </p>
    </section>
  );
}

function driveFileId(url: string) {
  return url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1] || "";
}

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || "";
  } catch { /* The source link is optional. */ }
  return "";
}

function fallbackThumbnail(article: Article) {
  const videoId = article.type === "link-video" ? youtubeVideoId(article.originalUrl) : "";
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const fileId = driveFileId(article.institutionalPdfUrl || article.originalUrl);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` : "";
}

function ArticleCard({ article }: { article: Article }) {
  const Icon = typeIcons[article.type];
  const metadata = [article.pages ? `${article.pages} páginas` : "", article.publishedAt].filter(Boolean).join(" • ");
  const thumbnail = fallbackThumbnail(article);

  return (
    <article className={`article-card type-${article.type}`}>
      <div className="cover-frame">
        {article.cover ? <img src={assetUrl(article.cover)} alt="" loading="lazy" /> : thumbnail ? <img className="source-thumbnail" src={thumbnail} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
        {!article.cover && <Icon className="cover-fallback-icon" size={42} aria-hidden="true" />}
        <span className="type-badge"><Icon size={14} aria-hidden="true" /> {typeLabels[article.type]}</span>
      </div>
      <div className="card-content">
        <p className="card-theme">{article.subtheme || article.theme}</p>
        <h3>{article.title}</h3>
        <p className="byline">{article.author} <span>•</span> {article.source}</p>
        <p className="summary">{article.summary}</p>
        <ul className="tag-list" aria-label="Palavras-chave">
          {article.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
        <div className="card-footer">
          <span>{metadata || "Informações editoriais em revisão"}</span>
          <div className="article-actions">
            {article.institutionalPdfUrl && (
              <a className="secondary-action" href={article.institutionalPdfUrl} target="_blank" rel="noreferrer" title="Acesso controlado pela UFG"
                onClick={() => trackEvent("open_article_pdf", { event_category: "article", event_label: article.id, article_type: article.type })}>
                <LockKeyhole size={16} /> PDF institucional
              </a>
            )}
            <a className="article-action" href={article.originalUrl} target="_blank" rel="noreferrer"
              onClick={() => trackEvent("open_article", { event_category: "article", event_label: article.id, article_type: article.type, source: article.source })}>
              {actionLabels[article.type]} <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
