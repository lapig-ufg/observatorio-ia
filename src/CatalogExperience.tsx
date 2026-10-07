import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowUpRight, BookOpen, FileText, Headphones, Link2, Presentation, Sparkles, Video } from "lucide-react";
import { assetUrl, type Article, type ArticleType } from "./catalog";
import { trackEvent } from "./analytics";
import { articlePreview, readCatalogLocation, videoThumbnail } from "./catalogExperienceState";

const labels = {
  pt: { medium: "Blogs", documento: "Documentos gerais", "link-video": "Links e vídeos", audio: "Áudios", entrevista: "Entrevistas", paper: "Pesquisa científica", apresentacao: "Apresentações", noticia: "Notícias" },
  en: { medium: "Blogs", documento: "General documents", "link-video": "Links and videos", audio: "Audio", entrevista: "Interviews", paper: "Scientific research", apresentacao: "Presentations", noticia: "News" },
};
const icons = { medium: Sparkles, documento: FileText, "link-video": Link2, audio: Headphones, entrevista: Video, paper: BookOpen, apresentacao: Presentation, noticia: FileText };

export function useCatalogExperience<A extends "all" | "todos">(all: A) {
  const [initial] = useState(() => readCatalogLocation(window.location.search, all));
  const [query, setQuery] = useState(initial.query);
  const [selectedKeyword, setSelectedKeyword] = useState(initial.keyword);
  const [type, setType] = useState<A | ArticleType>(initial.type);
  const [theme, setTheme] = useState(initial.theme);
  const [visible, setVisible] = useState(initial.visible);
  const [showAll, setShowAll] = useState(initial.showAll);
  const [sort, setSort] = useState(initial.sort);
  const [view, setView] = useState(initial.view);
  const [item, setItem] = useState(initial.item);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [allTopics, setAllTopics] = useState(false);
  const returnPosition = useRef<{ y: number; element: HTMLElement | null } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const values = { q: query, keyword: selectedKeyword, type: type === all ? "" : type, theme: theme === all ? "" : theme, sort: sort === "added" ? "" : sort, view: view === "cards" ? "" : view, all: showAll ? "1" : "", limit: visible > 15 ? String(visible) : "", item };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    window.history.replaceState(window.history.state, "", url);
  }, [query, selectedKeyword, type, theme, sort, view, showAll, visible, item, all]);

  useEffect(() => {
    const restore = () => {
      const state = readCatalogLocation(window.location.search, all);
      setQuery(state.query); setSelectedKeyword(state.keyword); setType(state.type); setTheme(state.theme);
      setSort(state.sort); setView(state.view); setVisible(state.visible); setShowAll(state.showAll); setItem(state.item);
      if (!state.item && returnPosition.current) {
        const position = returnPosition.current;
        requestAnimationFrame(() => {
          window.scrollTo({ top: position.y, behavior: "instant" });
          document.getElementById(position.element?.id || "")?.focus({ preventScroll: true });
        });
      }
    };
    window.addEventListener("popstate", restore);
    const leaveDetail = () => {
      if (window.location.hash !== "#item") {
        const url = new URL(window.location.href);
        url.searchParams.delete("item");
        window.history.replaceState(null, "", url);
        setItem("");
      }
    };
    window.addEventListener("hashchange", leaveDetail);
    return () => { window.removeEventListener("popstate", restore); window.removeEventListener("hashchange", leaveDetail); };
  }, [all]);

  const detailHref = (id: string) => {
    const url = new URL(window.location.href);
    // Include this render's state even before the history-sync effect has run.
    const values = { q: query, keyword: selectedKeyword, type: type === all ? "" : type, theme: theme === all ? "" : theme, sort: sort === "added" ? "" : sort, view: view === "cards" ? "" : view, all: showAll ? "1" : "", limit: visible > 15 ? String(visible) : "" };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    url.searchParams.set("item", id); url.hash = "item";
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const openDetail = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    returnPosition.current = { y: window.scrollY, element: event.currentTarget };
    window.history.pushState({ catalogDetail: true }, "", detailHref(id));
    setItem(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const closeDetail = () => {
    if (returnPosition.current && window.history.state?.catalogDetail) window.history.back();
    else {
      const url = new URL(window.location.href); url.searchParams.delete("item"); url.hash = all === "todos" ? "catalogo" : "catalog";
      window.history.replaceState(null, "", url); setItem("");
    }
  };
  return { query, setQuery, selectedKeyword, setSelectedKeyword, type, setType, theme, setTheme, visible, setVisible, showAll, setShowAll, sort, setSort, view, setView, item, filtersOpen, setFiltersOpen, allTopics, setAllTopics, detailHref, openDetail, closeDetail };
}

export function CatalogCard({ article, english = false, expanded = false, href, onOpen }: { article: Article; english?: boolean; expanded?: boolean; href?: string; onOpen?: (event: MouseEvent<HTMLAnchorElement>, id: string) => void }) {
  const Icon = icons[article.type];
  const typeLabel = labels[english ? "en" : "pt"][article.type];
  const thumbnail = videoThumbnail(article.originalUrl);
  // Document covers are typography-led: a miniature PDF page is not a readable cover.
  const cover = ["documento", "paper", "apresentacao"].includes(article.type) ? "" : article.cover ? assetUrl(article.cover) : thumbnail;
  const [failed, setFailed] = useState(false);
  const author = english ? article.author.replace("Autoria não identificada", "Author not identified").replace("(entrevistado)", "(interviewee)") : article.author;
  const byline = [...new Set([author, article.source].filter(Boolean))].join(" · ");
  const action = article.type === "audio" ? (english ? "Listen" : "Ouvir áudio") : article.type === "entrevista" || thumbnail ? (english ? "Watch video" : "Assistir vídeo") : article.type === "apresentacao" ? (english ? "View presentation" : "Ver apresentação") : english ? "Read source" : "Acessar fonte";
  const primaryUrl = article.originalUrl || (article.type !== "medium" ? article.institutionalPdfUrl : "");
  return <article className={`article-card compact-card type-${article.type}${expanded ? " expanded-card" : ""}`}>
    {!expanded && <div className={`cover-frame${cover && !failed ? " has-image" : " category-cover"}`}>
      {cover && !failed ? <img src={cover} alt="" loading="lazy" decoding="async" width="320" height="180" onError={() => setFailed(true)} /> : <Icon size={40} aria-hidden="true" />}
      <span className="type-badge">{typeLabel}</span>
    </div>}
    <div className="card-content">
      <p className="card-theme">{expanded ? typeLabel : article.subtheme || article.theme}</p>
      {expanded ? <h1 tabIndex={-1} id="article-detail-title">{article.title}</h1> : <h3>{article.title}</h3>}
      <p className="byline">{byline}</p>
      <p className="summary">{expanded ? article.summary : articlePreview(article, english)}</p>
      {!expanded && <p className="preview-note">{english ? "Preview · full context and caveats in the summary" : "Prévia · contexto e ressalvas no resumo completo"}</p>}
      <ul className="tag-list" aria-label={english ? "Keywords" : "Palavras-chave"}>{(expanded ? article.tags : article.tags.slice(0, 3)).map((tag) => <li key={tag}>{tag}</li>)}</ul>
      <div className="card-footer">
        {expanded && <dl className="detail-metadata">
          {article.publishedAt && <><dt>{english ? "Published" : "Publicado em"}</dt><dd>{article.publishedAt}</dd></>}
          {article.includedAt && <><dt>{english ? "Added to collection" : "Incluído no acervo"}</dt><dd>{article.includedAt}</dd></>}
          {article.pages > 0 && <><dt>{english ? "Pages" : "Páginas"}</dt><dd>{article.pages}</dd></>}
          <dt>{english ? "Topic" : "Tema"}</dt><dd>{article.theme}</dd>
        </dl>}
        <div className="article-actions">
          {!expanded && <a id={`summary-${article.id}`} className="secondary-action summary-action" href={href} onClick={(event) => onOpen?.(event, article.id)} aria-label={`${english ? "Read summary" : "Ver resumo"}: ${article.title}`}>{english ? "Read summary" : "Ver resumo"}</a>}
          {primaryUrl ? <a className="article-action" href={primaryUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_article", { event_category: "article", event_label: article.id, article_type: article.type })}>{action} <ArrowUpRight size={17} aria-hidden="true" /></a> : <span>{english ? "Link under review" : "Link em revisão"}</span>}
          {expanded && article.type !== "medium" && article.institutionalPdfUrl && article.originalUrl && article.institutionalPdfUrl !== article.originalUrl && <a className="secondary-action" href={article.institutionalPdfUrl} target="_blank" rel="noreferrer">{english ? "Institutional PDF" : "PDF institucional"} <ArrowUpRight size={16} aria-hidden="true" /></a>}
        </div>
      </div>
    </div>
  </article>;
}

export function ArticleDetail({ article, loading, english = false, onClose }: { article?: Article; loading: boolean; english?: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  useEffect(() => {
    if (article) {
      document.title = `${article.title} | ${english ? "UFG-AI Observatory" : "Observatório UFG-IA"}`;
      document.getElementById("article-detail-title")?.focus({ preventScroll: true });
    }
  }, [article, english]);
  return <section className="article-detail" aria-label={english ? "Item details" : "Ficha do acervo"}>
    <div className="detail-toolbar"><button onClick={onClose}>← {english ? "Back to collection" : "Voltar ao acervo"}</button><button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(english ? "Link copied" : "Link copiado"); } catch { setCopied(english ? "Copy the URL from your address bar" : "Copie o endereço na barra do navegador"); } }}>{english ? "Copy link" : "Copiar link"}</button></div>
    <p role="status">{copied}</p>
    {article ? <CatalogCard article={article} english={english} expanded /> : <p role="status">{loading ? (english ? "Loading item…" : "Carregando ficha…") : (english ? "Item not found in the published collection." : "Item não encontrado no acervo publicado.")}</p>}
  </section>;
}

export function InstitutionalBand({ english = false }: { english?: boolean }) {
  const institutions = [
    { key: "lapig", acronym: "LAPIG", url: "https://lapig.iesa.ufg.br/", name: english ? "Remote Sensing and GIS Laboratory" : "Laboratório de Sensoriamento Remoto e Geoprocessamento", width: 140 },
    { key: "iesa", acronym: "IESA", url: "https://iesa.ufg.br/", name: english ? "Institute of Socio-Environmental Studies" : "Instituto de Estudos Socioambientais", width: 120 },
    { key: "ufg", acronym: "UFG", url: "https://ufg.br/", name: english ? "Federal University of Goiás" : "Universidade Federal de Goiás", width: 160 },
  ];
  return <aside className="institutional-band" aria-label={english ? "Responsible institutions" : "Instituições responsáveis"}>
    {institutions.map(({ key, acronym, url, name, width }) => <a key={key} href={url} target="_blank" rel="noreferrer" title={`${acronym} — ${name}`} aria-label={`${acronym} — ${name}`}>
      <img src={assetUrl(`brand/lapig-iesa-ufg-${key}.png`)} width={width} height="91" alt={acronym} />
    </a>)}
  </aside>;
}
