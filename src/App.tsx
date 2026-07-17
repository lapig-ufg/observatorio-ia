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
import { useEffect, useMemo, useState } from "react";
import { assetUrl, loadCatalog, type Article, type ArticleType, type CatalogLoadResult, type Initiative } from "./catalog";

const typeLabels: Record<"todos" | ArticleType, string> = {
  todos: "Todos",
  medium: "Artigos Medium",
  documento: "Documentos gerais",
  "link-video": "Links e vídeos",
  noticia: "Jornais e notícias",
  paper: "Papers IA",
  apresentacao: "Apresentações IA",
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
  medium: "Artigo original",
  documento: "Acessar documento",
  "link-video": "Acessar conteúdo",
  noticia: "Ler notícia",
  paper: "Acessar paper",
  apresentacao: "Ver apresentação",
};

const categoryTypes: ArticleType[] = ["medium", "documento", "link-video", "noticia", "paper", "apresentacao"];
const maxCloudWords = 48;

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

  const keywordCloud = useMemo(() => {
    const keywords = new Map<string, { label: string; count: number }>();

    articles.forEach((article) => article.tags.forEach((tag) => {
      const label = tag.trim();
      const key = normalize(label);
      if (!key) return;
      const keyword = keywords.get(key);
      if (keyword) keyword.count += 1;
      else keywords.set(key, { label, count: 1 });
    }));

    const sorted = Array.from(keywords.entries())
      .map(([key, keyword]) => ({ key, ...keyword }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, maxCloudWords);
    const maximum = Math.max(...sorted.map((keyword) => keyword.count), 1);

    return sorted.map((keyword) => ({
      ...keyword,
      size: Math.max(1, Math.ceil((keyword.count / maximum) * 5)),
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

  const resetFilters = () => {
    setQuery("");
    setSelectedKeyword("");
    setType("todos");
    setTheme("todos");
    setVisible(15);
  };

  const selectKeyword = (keyword: string) => {
    setQuery(keyword);
    setSelectedKeyword(keyword);
    setType("todos");
    setTheme("todos");
    setVisible(15);
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const selectCategory = (category: ArticleType) => {
    setType(category);
    setVisible(15);
    window.requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }));
  };

  const ribbon = articles.filter((article) => article.cover).slice(0, 7);

  return (
    <main id="top" className="site-shell">
      <a className="skip-link" href="#catalogo">Ir para o catálogo</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Observatório UFG-IA - início">
          <span className="brand-mark"><Library size={21} aria-hidden="true" /></span>
          <span><strong>Observatório UFG-IA</strong><small>LAPIG • UFG</small></span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#categorias">Categorias</a>
          <a href="#iniciativas">UFG em IA</a>
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

      <section className="catalog-intro" aria-labelledby="page-title">
        <div className="intro-copy-block">
          <p className="eyebrow">Inteligência artificial em perspectiva</p>
          <h1 id="page-title">Conhecimento sobre IA para estudo, pesquisa e debate</h1>
          <p className="intro-copy">Artigos do Medium, documentos, vídeos, notícias, papers científicos e apresentações reunidos em um acervo temático.</p>
        </div>
        <div className="collection-summary" aria-label="Resumo do acervo">
          <span><strong>{articles.length || "—"}</strong> itens</span>
          <span><strong>6</strong> categorias</span>
          <span><strong>1 min</strong> atualização</span>
        </div>
        {ribbon.length > 0 && (
          <div className="cover-ribbon" aria-hidden="true">
            {ribbon.map((article) => <img key={article.id} src={assetUrl(article.cover)} alt="" />)}
          </div>
        )}
      </section>

      {initiatives.length > 0 && (
        <section id="iniciativas" className="initiatives-section" aria-labelledby="initiatives-title">
          <div className="initiatives-heading">
            <div>
              <p className="eyebrow">Ecossistema UFG</p>
              <h2 id="initiatives-title">Iniciativas de inteligência artificial</h2>
            </div>
            <p>Centros e redes que transformam pesquisa em impacto público, tecnológico e social.</p>
          </div>
          <div className="initiative-grid">
            {initiatives.map((initiative) => <InitiativeCard key={initiative.id} initiative={initiative} />)}
          </div>
        </section>
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
      </section>

      {keywordCloud.length > 0 && (
        <section id="palavras-chave" className="keyword-cloud-section" aria-labelledby="keyword-cloud-title">
          <div className="keyword-cloud-heading">
            <div>
              <p className="eyebrow">Assuntos em destaque</p>
              <h2 id="keyword-cloud-title">Explore o acervo pelas palavras-chave</h2>
            </div>
            <p>Quanto maior a palavra, mais artigos relacionados ela reúne.</p>
          </div>
          <div className="keyword-cloud" aria-label="Palavras-chave do acervo">
            {keywordCloud.map((keyword, index) => (
              <button
                type="button"
                key={keyword.key}
                className={`keyword-cloud-item cloud-size-${keyword.size} cloud-color-${index % 5}${selectedKeyword && normalize(selectedKeyword) === keyword.key ? " active" : ""}`}
                onClick={() => selectKeyword(keyword.label)}
                aria-pressed={normalize(selectedKeyword) === keyword.key}
                aria-label={`${keyword.label}: ${keyword.count} ${keyword.count === 1 ? "artigo" : "artigos"}`}
              >
                <span>{keyword.label}</span>
                <small className="sr-only"> {keyword.count} artigos</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="catalogo" className="search-panel" aria-label="Busca no acervo">
        <label className="search-field">
          <Search size={23} aria-hidden="true" />
          <span className="sr-only">Buscar no acervo</span>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelectedKeyword(""); setVisible(15); }}
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
                onClick={() => { setType(key); setVisible(15); }}
                aria-pressed={type === key}
              >
                {typeLabels[key]} <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="select-filter">
            <span className="sr-only">Filtrar por tema</span>
            <select id="temas" value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(15); }}>
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
              <p className="eyebrow">Catálogo</p>
              <h2>{filtered.length} {filtered.length === 1 ? "item encontrado" : "itens encontrados"}</h2>
            </div>
            {(query || type !== "todos" || theme !== "todos") && (
              <button type="button" className="clear-filters" onClick={resetFilters}><X size={16} /> Limpar filtros</button>
            )}
          </section>

          {filtered.length ? (
            <div className="article-grid">
              {filtered.slice(0, visible).map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          ) : (
            <section className="empty-state">
              <Search size={30} />
              <h2>Nenhum item encontrado</h2>
              <p>Tente outro termo ou remova os filtros.</p>
              <button type="button" onClick={resetFilters}>Ver todo o acervo</button>
            </section>
          )}

          {visible < filtered.length && (
            <button type="button" className="load-more" onClick={() => setVisible((value) => value + 15)}>Carregar mais itens</button>
          )}
        </>
      )}

      <footer className="footer">
        <div><strong>Observatório UFG-IA</strong><p>Acervo educacional em desenvolvimento contínuo.</p></div>
        <div><span>LAPIG • Universidade Federal de Goiás</span><p>Conteúdo público com acesso às fontes originais.</p></div>
      </footer>
    </main>
  );
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  return (
    <article className={`initiative-card initiative-${normalize(initiative.color).replace(/\s+/g, "-")}`}>
      <div className="initiative-mark" aria-hidden="true"><Building2 size={25} /></div>
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

function ArticleCard({ article }: { article: Article }) {
  const Icon = typeIcons[article.type];
  const metadata = [article.pages ? `${article.pages} páginas` : "", article.publishedAt].filter(Boolean).join(" • ");

  return (
    <article className={`article-card type-${article.type}`}>
      <div className="cover-frame">
        {article.cover ? <img src={assetUrl(article.cover)} alt="" loading="lazy" /> : <Icon size={42} aria-hidden="true" />}
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
