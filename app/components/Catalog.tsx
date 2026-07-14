"use client";

import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Library,
  Newspaper,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Article, ArticleType } from "../catalog.generated";

const typeLabels: Record<"todos" | ArticleType, string> = {
  todos: "Todos",
  opiniao: "Opinião e divulgação",
  noticia: "Notícias",
  cientifico: "Ciência aberta",
};

const typeIcons = {
  opiniao: Sparkles,
  noticia: Newspaper,
  cientifico: BookOpen,
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function Catalog({ articles, mode }: { articles: Article[]; mode: "public" | "student" }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"todos" | ArticleType>("todos");
  const [theme, setTheme] = useState("todos");
  const [visible, setVisible] = useState(15);

  const themes = useMemo(() => Array.from(new Set(articles.map((article) => article.theme))).sort(), [articles]);
  const counts = useMemo(() => ({
    todos: articles.length,
    opiniao: articles.filter((article) => article.type === "opiniao").length,
    noticia: articles.filter((article) => article.type === "noticia").length,
    cientifico: articles.filter((article) => article.type === "cientifico").length,
  }), [articles]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return articles.filter((article) => {
      const matchesType = type === "todos" || article.type === type;
      const matchesTheme = theme === "todos" || article.theme === theme;
      const haystack = normalize([article.title, article.author, article.source, article.theme, article.subtheme, ...article.tags].join(" "));
      return matchesType && matchesTheme && (!needle || haystack.includes(needle));
    });
  }, [articles, query, theme, type]);

  const reset = () => {
    setQuery("");
    setType("todos");
    setTheme("todos");
    setVisible(15);
  };

  return (
    <main id="conteudo" className="site-shell">
      <a className="skip-link" href="#catalogo">Ir para o catálogo</a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Observatório IA - início">
          <span className="brand-mark"><Library size={21} aria-hidden="true" /></span>
          <span><strong>Observatório IA</strong><small>Acervo de leituras</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          <a href="#temas">Temas</a>
          <a href="#catalogo">Acervo</a>
          {mode === "public" ? (
            <Link className="student-link" href="/alunos"><GraduationCap size={18} aria-hidden="true" /> Área dos alunos</Link>
          ) : (
            <Link className="student-link" href="/"><ArrowUpRight size={18} aria-hidden="true" /> Catálogo público</Link>
          )}
        </nav>
      </header>

      <section className="catalog-intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Inteligência artificial em perspectiva</p>
          <h1 id="page-title">Leituras para entender a IA além das manchetes</h1>
          <p className="intro-copy">Um acervo em evolução com artigos de opinião, jornalismo e ciência aberta, organizado para estudo, pesquisa e debate.</p>
        </div>
        <div className="collection-summary" aria-label="Resumo do acervo">
          <span><strong>{articles.length}</strong> leituras catalogadas</span>
          <span><strong>{themes.length}</strong> grandes temas</span>
          <span><strong>Diário</strong> ciclo de atualização</span>
        </div>
      </section>

      <section id="catalogo" className="search-panel" aria-label="Busca no acervo">
        <label className="search-field">
          <Search size={23} aria-hidden="true" />
          <span className="sr-only">Buscar artigos</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(15); }} placeholder="Busque por título, autor, tema ou palavra-chave" />
          {query && <button className="icon-button" onClick={() => setQuery("")} aria-label="Limpar busca"><X size={18} /></button>}
        </label>
        <div className="filter-row">
          <div className="type-tabs" role="group" aria-label="Tipo de publicação">
            {(Object.keys(typeLabels) as Array<"todos" | ArticleType>).map((key) => (
              <button key={key} className={type === key ? "active" : ""} onClick={() => { setType(key); setVisible(15); }} aria-pressed={type === key}>
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
      </section>

      <section className="results-heading" aria-live="polite">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2>{filtered.length} {filtered.length === 1 ? "leitura encontrada" : "leituras encontradas"}</h2>
        </div>
        {(query || type !== "todos" || theme !== "todos") && <button className="clear-filters" onClick={reset}><X size={16} /> Limpar filtros</button>}
      </section>

      {filtered.length ? (
        <div className="article-grid">
          {filtered.slice(0, visible).map((article) => <ArticleCard key={article.id} article={article} mode={mode} />)}
        </div>
      ) : (
        <div className="empty-state"><Search size={30} /><h2>Nenhuma leitura encontrada</h2><p>Tente outro termo ou remova os filtros.</p><button onClick={reset}>Ver todo o acervo</button></div>
      )}

      {visible < filtered.length && <button className="load-more" onClick={() => setVisible((value) => value + 15)}>Carregar mais leituras</button>}

      <footer className="footer">
        <div><strong>Observatório IA</strong><p>Acervo educacional em desenvolvimento contínuo.</p></div>
        <div><span>Acesso institucional</span><p>@ufg.br · @discente.ufg.br · @egresso.ufg.br</p></div>
      </footer>
    </main>
  );
}

function ArticleCard({ article, mode }: { article: Article; mode: "public" | "student" }) {
  const Icon = typeIcons[article.type];
  return (
    <article className={`article-card type-${article.type}`}>
      <div className="cover-frame">
        {article.cover ? <img src={article.cover} alt="" loading="lazy" /> : <FileText size={42} aria-hidden="true" />}
        <span className="type-badge"><Icon size={14} aria-hidden="true" /> {typeLabels[article.type]}</span>
      </div>
      <div className="card-content">
        <p className="card-theme">{article.subtheme || article.theme}</p>
        <h3>{article.title}</h3>
        <p className="byline">{article.author} · {article.source}</p>
        <p className="summary">{article.summary}</p>
        <ul className="tag-list" aria-label="Palavras-chave">
          {article.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
        <div className="card-footer">
          <span>{article.pages ? `${article.pages} páginas` : article.publishedAt}</span>
          {mode === "student" ? (
            article.pdfReady ? <a className="article-action" href={`/api/pdf/${article.id}`}><FileText size={17} /> Abrir PDF</a> : <span className="sync-status"><Check size={15} /> Catalogado</span>
          ) : article.originalUrl ? (
            <a className="article-action" href={article.originalUrl} target="_blank" rel="noreferrer">Artigo original <ArrowUpRight size={17} /></a>
          ) : <span className="link-review">Link em revisão</span>}
        </div>
      </div>
    </article>
  );
}
