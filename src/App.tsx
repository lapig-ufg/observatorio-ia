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

const typeLabels: Record<"todos" | ArticleType, string> = {
  todos: "Todos",
  medium: "Blogs",
  documento: "Documentos gerais",
  "link-video": "Links e vídeos",
  noticia: "Jornais e notícias",
  paper: "Papers IA",
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

const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "noticia", "paper", "apresentacao"];
const featuredArticleByCategory: Partial<Record<ArticleType, string>> = {
  documento: "drive-1mg-diretrizes-ia-ies",
};
const blogThemes = [
  "Fundamentos, matemática e deep learning",
  "Transformers e atenção",
  "LLMs e IA generativa",
  "Agentes, RAG e aplicações",
  "Bases vetoriais e conhecimento",
  "Modelos, mercado e indústria",
  "Aprendizado, pesquisa e produtividade",
];
const maxCloudWords = 32;
const cloudPositions = [
  [50, 46, 0], [50, 23, -2], [24, 44, 2], [76, 43, -2], [48, 67, 1], [76, 25, 1], [27, 25, -1], [22, 65, 2],
  [77, 66, -1], [49, 82, 0], [37, 34, -2], [63, 34, 2], [35, 55, 1], [64, 55, -1], [13, 35, 2], [87, 35, -2],
  [13, 54, -1], [87, 54, 1], [31, 78, 2], [68, 79, -2], [49, 10, 1], [49, 92, -1], [8, 20, 2], [92, 20, -2],
  [9, 74, -1], [91, 74, 1], [39, 16, 2], [61, 16, -2], [39, 90, 1], [61, 90, -1], [19, 12, 0], [81, 12, 0],
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
  const [page, setPage] = useState(() => window.location.hash === "#ecossistema-ufg" ? "ecosystem" : "catalog");

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
    const syncPage = () => setPage(window.location.hash === "#ecossistema-ufg" ? "ecosystem" : "catalog");
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  const articles = catalog?.articles || [];
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

  const blogCategories = useMemo(() => blogThemes.map((blogTheme) => ({
    theme: blogTheme,
    count: articles.filter((article) => article.type === "medium" && article.theme === blogTheme).length,
  })), [articles]);

  const keywordCloud = useMemo(() => {
    const itemsByType = new Map<ArticleType, number>();
    articles.forEach((article) => itemsByType.set(article.type, (itemsByType.get(article.type) || 0) + 1));

    const keywords = new Map<string, { label: string; count: number; weightedCount: number }>();

    articles.forEach((article) => article.tags.forEach((tag) => {
      const label = tag.trim();
      const key = normalize(label);
      if (!key) return;
      const categoryWeight = 1 / (itemsByType.get(article.type) || 1);
      const keyword = keywords.get(key);
      if (keyword) {
        keyword.count += 1;
        keyword.weightedCount += categoryWeight;
      } else keywords.set(key, { label, count: 1, weightedCount: categoryWeight });
    }));

    const sorted = Array.from(keywords.entries())
      .map(([key, keyword]) => ({ key, ...keyword }))
      .sort((a, b) => b.weightedCount - a.weightedCount || b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, maxCloudWords);
    const maximum = Math.max(...sorted.map((keyword) => keyword.weightedCount), 1);
    const minimum = Math.min(...sorted.map((keyword) => keyword.weightedCount), maximum);

    return sorted.map((keyword) => ({
      ...keyword,
      size: maximum === minimum ? 3 : 1 + Math.round(((keyword.weightedCount - minimum) / (maximum - minimum)) * 4),
    }));
  }, [articles]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return articles.filter((article) => {
      const matchesType = type === "todos" || article.type === type;
      const matchesTheme = theme === "todos" || article.theme === theme;
      const matchesKeyword = !selectedKeyword || article.tags.some((tag) => normalize(tag) === normalize(selectedKeyword));
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
    });
  }, [articles, query, selectedKeyword, theme, type]);

  const latestByCategory = useMemo(() => categoryTypes.flatMap((category) => {
    const items = articles.filter((article) => article.type === category);
    if (!items.length) return [];

    const featured = featuredArticleByCategory[category];
    if (featured) {
      const requestedArticle = items.find((article) => article.id === featured);
      if (requestedArticle) return requestedArticle;
    }

    return items.reduce((latest, article) => {
      const latestDate = Date.parse(latest.includedAt) || Date.parse(latest.publishedAt) || 0;
      const articleDate = Date.parse(article.includedAt) || Date.parse(article.publishedAt) || 0;
      return articleDate >= latestDate ? article : latest;
    });
  }), [articles]);

  const isInitialSelection = !showAll && !query && !selectedKeyword && type === "todos" && theme === "todos";
  const displayedArticles = isInitialSelection ? latestByCategory : filtered;

  const resetFilters = () => {
    setQuery("");
    setSelectedKeyword("");
    setType("todos");
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
  };

  const selectKeyword = (keyword: string) => {
    setQuery(keyword);
    setSelectedKeyword(keyword);
    setType("todos");
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    setType(category);
    setTheme("todos");
    setVisible(15);
    setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById(category === "medium" ? "categorias" : "catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectBlogTheme = (blogTheme: string) => {
    setType("medium");
    setTheme(blogTheme);
    setVisible(15);
    setShowAll(true);
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const ribbon = articles.filter((article) => article.cover).slice(0, 7);

  return (
    <main id="top" className="site-shell">
      <a className="skip-link" href="#catalogo">Ir para o catálogo</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Observatório UFG-IA - início">
          <span className="brand-mark"><Library size={21} aria-hidden="true" /></span>
          <span className="brand-name"><strong>Observatório</strong><strong>UFG-IA</strong></span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#categorias">Categorias</a>
          <a className="ecosystem-nav-link" href="#ecossistema-ufg">Ecossistema UFG <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="form-nav-link" href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer"><span><strong>Participe!</strong>Como você está usando a IA?</span> <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="#palavras-chave">Assuntos</a>
          <a href="#catalogo">Acervo</a>
          <a href="https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/" target="_blank" rel="noreferrer">Panorama <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="https://github.com/lapig-ufg" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
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

      {page === "ecosystem" ? <EcosystemPage initiatives={initiatives} /> : <>
      <section className="catalog-intro" aria-labelledby="page-title">
        <div className="intro-copy-block">
          <p className="eyebrow">Inteligência artificial em perspectiva</p>
          <h1 id="page-title">Conhecimento sobre IA para estudo, pesquisa e debate</h1>
          <p className="intro-copy">Artigos de Blogs, documentos, vídeos, notícias, papers científicos e apresentações reunidos em um acervo temático.</p>
        </div>
        <div className="collection-summary" aria-label="Resumo do acervo">
          <span><strong>{articles.length || "—"}</strong> itens</span>
          <span><strong>6</strong> categorias</span>
        </div>
        {ribbon.length > 0 && (
          <div className="cover-ribbon" aria-hidden="true">
            {ribbon.map((article) => <img key={article.id} src={assetUrl(article.cover)} alt="" />)}
          </div>
        )}
      </section>

      <section className="weekly-highlight" aria-labelledby="weekly-highlight-title">
        <div className="weekly-highlight-kicker">
          <span>Em destaque...</span>
          <span>The Batch · DeepLearning.AI</span>
        </div>
        <div className="weekly-highlight-content">
          <div>
            <p className="eyebrow">29 de maio de 2026</p>
            <h2 id="weekly-highlight-title">Gemini fica mais caro, a regulação europeia desacelera e agentes passam a dirigir tráfego na web</h2>
          </div>
          <div className="weekly-highlight-aside">
            <p>A edição mais recente reúne sinais importantes para a adoção de IA: preços de modelos, mudanças no AI Act e o crescimento do tráfego online conduzido por agentes.</p>
            <a href="https://www.deeplearning.ai/the-batch/tag/may-29-2026" target="_blank" rel="noreferrer">Ler a edição do The Batch <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="obia-callout" aria-labelledby="obia-title">
        <a className="obia-logo-link" href="https://obia.nic.br/" target="_blank" rel="noreferrer" aria-label="Acessar o Observatório Brasileiro de Inteligência Artificial">
          <img src="https://obia.nic.br/img/logo-text-white.svg" alt="OBIA" />
          <span>Observatório Brasileiro de Inteligência Artificial</span>
        </a>
        <div>
          <p className="eyebrow">Brasil em foco</p>
          <h2 id="obia-title">Para saber mais sobre o uso e as perspectivas da IA no Brasil, acesse o Observatório Brasileiro de Inteligência Artificial.</h2>
        </div>
        <a className="obia-action" href="https://obia.nic.br/" target="_blank" rel="noreferrer">Conhecer o OBIA <ArrowUpRight size={17} aria-hidden="true" /></a>
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
        {type === "medium" && (
          <div className="blog-subcategories" aria-label="Subcategorias de Blogs">
            <div className="blog-subcategories-heading">
              <div>
                <p className="eyebrow">Blogs</p>
                <h3>Explore pelas sete coleções</h3>
              </div>
              <p>Selecione uma subcategoria para ver os artigos relacionados.</p>
            </div>
            <div className="blog-subcategory-grid">
              {blogCategories.map(({ theme: blogTheme, count }) => (
                <button
                  type="button"
                  key={blogTheme}
                  className={theme === blogTheme ? "blog-subcategory-button active" : "blog-subcategory-button"}
                  onClick={() => selectBlogTheme(blogTheme)}
                  aria-pressed={theme === blogTheme}
                >
                  <span>{blogTheme}</span>
                  <strong>{count}</strong>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {keywordCloud.length > 0 && (
        <section id="palavras-chave" className="keyword-cloud-section" aria-labelledby="keyword-cloud-title">
          <div className="keyword-cloud-heading">
            <div>
              <p className="eyebrow">Assuntos em destaque</p>
              <h2 id="keyword-cloud-title">Explore o acervo pelas palavras-chave</h2>
            </div>
            <p>Quanto maior a palavra, mais itens relacionados ela reúne.</p>
          </div>
          <div className="keyword-cloud" aria-label="Palavras-chave do acervo">
            {keywordCloud.map((keyword, index) => {
              const [x, y, rotation] = cloudPositions[index % cloudPositions.length];
              const positionStyle = {
                "--cloud-x": `${x}%`,
                "--cloud-y": `${y}%`,
                "--cloud-rotation": `${rotation}deg`,
              } as CSSProperties;
              return (
              <button
                type="button"
                key={keyword.key}
                className={`keyword-cloud-item cloud-size-${keyword.size} cloud-color-${index % 5}${selectedKeyword && normalize(selectedKeyword) === keyword.key ? " active" : ""}`}
                style={positionStyle}
                onClick={() => selectKeyword(keyword.label)}
                aria-pressed={normalize(selectedKeyword) === keyword.key}
                aria-label={`${keyword.label}: ${keyword.count} ${keyword.count === 1 ? "item" : "itens"}`}
              >
                <span>{keyword.label}</span>
                <small className="sr-only"> {keyword.count} itens</small>
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
          {query && <button type="button" className="icon-button" onClick={() => { setQuery(""); setSelectedKeyword(""); }} aria-label="Limpar busca"><X size={18} /></button>}
        </label>
        <div className="filter-row">
          <div className="type-tabs" role="group" aria-label="Tipo de publicação">
            {(Object.keys(typeLabels) as Array<"todos" | ArticleType>).map((key) => (
              <button
                type="button"
                key={key}
                className={type === key ? "active" : ""}
                onClick={() => { setType(key); setVisible(15); setShowAll(true); }}
                aria-pressed={type === key}
              >
                {typeLabels[key]} <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="select-filter">
            <span className="sr-only">Filtrar por tema</span>
            <select id="temas" value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(15); setShowAll(true); }}>
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
          <button type="button" onClick={() => window.location.reload()} title="Atualizar catálogo" aria-label="Atualizar catálogo">
            <RefreshCw size={15} className={refreshing ? "spinning" : ""} />
          </button>
        </div>
      </section>

      {error ? (
        <section className="empty-state" role="alert">
          <FileText size={30} />
          <h2>Catálogo indisponível</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
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
              <button type="button" className="clear-filters" onClick={() => { setShowAll(true); setVisible(15); }}>Ver todo o acervo</button>
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
              <button type="button" onClick={resetFilters}>Ver todo o acervo</button>
            </section>
          )}

          {visible < displayedArticles.length && (
            <button type="button" className="load-more" onClick={() => setVisible((value) => value + 15)}>Carregar mais itens</button>
          )}
        </>
      )}
      </>}

      <footer className="footer">
        <div><strong>Observatório UFG-IA</strong><p>Acervo educacional em desenvolvimento contínuo.</p></div>
        <div><span>LAPIG • Universidade Federal de Goiás</span><p>Conteúdo público com acesso às fontes originais.</p><p className="credits"><strong>Desenvolvimento e curadoria:</strong> <a href="mailto:laerte@ufg.br">Laerte Ferreira</a>, <a href="mailto:victor.amaral@ufg.br">Victor Amaral</a> e <a href="mailto:tiagogoncalves@discente.ufg.br">Tiago Geraldine</a>.</p><p className="contact-callout">Dúvidas? Sugestões? <a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer">Entre em contato <ArrowUpRight size={14} aria-hidden="true" /></a></p></div>
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
      <a href={initiative.url} target="_blank" rel="noreferrer">
        Conhecer iniciativa <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </article>
  );
}

function EcosystemPage({ initiatives }: { initiatives: Initiative[] }) {
  return (
    <section id="ecossistema-ufg" className="ecosystem-page" aria-labelledby="ecosystem-title">
      <div className="ecosystem-hero">
        <p className="eyebrow">Universidade Federal de Goiás</p>
        <h1 id="ecosystem-title">Ecossistema UFG em inteligência artificial</h1>
        <p>Conheça centros e redes que conectam conhecimento, tecnologia e políticas públicas.</p>
        <a className="back-to-catalog" href="#top">← Voltar ao acervo</a>
      </div>
      <aside className="ecosystem-mapping-callout" aria-label="Mapeamento da IA na UFG">
        <div>
          <p className="ecosystem-mapping-kicker">Sua iniciativa de IA não está aqui?</p>
          <p>Então responda ao nosso <strong>mapeamento da IA na UFG</strong>. É bem simples e rápido!</p>
        </div>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSe3qfZ5hjL0NifRXvI-SM6NKDN7g8DoFQJyoTTRTvhlptWk-w/viewform" target="_blank" rel="noreferrer">Participar do mapeamento <ArrowUpRight size={17} aria-hidden="true" /></a>
      </aside>
      {initiatives.length ? (
        <div className="ecosystem-initiative-grid">
          {initiatives.map((initiative) => <InitiativeCard key={initiative.id} initiative={initiative} />)}
        </div>
      ) : (
        <div className="ecosystem-empty">As iniciativas estão sendo carregadas.</div>
      )}
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

  const fileId = article.type === "documento" ? driveFileId(article.institutionalPdfUrl || article.originalUrl) : "";
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
              <a className="secondary-action" href={article.institutionalPdfUrl} target="_blank" rel="noreferrer" title="Acesso controlado pela UFG">
                <LockKeyhole size={16} /> PDF institucional
              </a>
            )}
            <a className="article-action" href={article.originalUrl} target="_blank" rel="noreferrer">
              {actionLabels[article.type]} <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
