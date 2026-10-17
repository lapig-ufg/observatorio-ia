import { useState, type MouseEvent } from "react";
import { ArrowRight, BookOpen, FileText, Headphones, Presentation, Video } from "lucide-react";
import type { Article, ArticleType } from "./catalog";
import { CatalogCard } from "./CatalogExperience";
import { homeCollections, recentDiscovery } from "./discoverySelection";

const names = {
  pt: { medium: "Leituras em IA", documento: "Documentos gerais", "link-video": "Links e vídeos", audio: "Áudios", entrevista: "Entrevistas", paper: "IA na pesquisa científica", apresentacao: "Apresentações" },
  en: { medium: "AI readings", documento: "General documents", "link-video": "Links and videos", audio: "Audio", entrevista: "Interviews", paper: "AI in scientific research", apresentacao: "Presentations" },
};
const icons = { medium: BookOpen, documento: FileText, "link-video": Video, audio: Headphones, entrevista: Video, paper: BookOpen, apresentacao: Presentation };

export function PortalCollections({ articles, type, onSelect, onExplore, english = false, loading = false }: { articles: Article[]; type: string; onSelect: (type: ArticleType) => void; onExplore: () => void; english?: boolean; loading?: boolean }) {
  return <section id={english ? "collections" : "categorias"} className="category-band" aria-labelledby="category-title">
    <div className="discovery-heading">
      <div><p className="eyebrow">{english ? "Collections" : "Coleções"}</p><h2 id="category-title">{english ? "What would you like to explore?" : "O que você quer explorar?"}</h2></div>
      <button className="text-action" onClick={onExplore}>{english ? "Search all content" : "Pesquisar todo o acervo"} <ArrowRight size={18} aria-hidden="true" /></button>
    </div>
    <div className="category-grid">{[...homeCollections, "medium" as const].map(category => {
      const key = category as keyof typeof icons;
      const Icon = icons[key];
      return <button type="button" key={key} className={`category-button category-${key}${type === key ? " active" : ""}`} onClick={() => onSelect(category)} aria-pressed={type === key}>
        <Icon size={23} aria-hidden="true" /><span>{names[english ? "en" : "pt"][key]}</span>{!loading && <strong>{articles.filter(article => article.type === key).length}</strong>}
      </button>;
    })}</div>
    <a className="topics-shortcut" href={english ? "#topics" : "#palavras-chave"}>{english ? "Prefer to browse by topic? Explore the collection radar" : "Prefere explorar por assunto? Acesse o Radar do acervo"} <ArrowRight size={16} aria-hidden="true" /></a>
  </section>;
}

export function RecentDiscovery({ articles, english = false, onSelect, detailHref, onOpen }: { articles: Article[]; english?: boolean; onSelect: (type: ArticleType) => void; detailHref: (id: string) => string; onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void }) {
  const { videos, papers } = recentDiscovery(articles);
  const [expanded, setExpanded] = useState<string[]>([]);
  return <div className="recent-discovery">{[
    { key: "link-video" as const, items: videos, label: english ? "Watch & understand" : "Ver e compreender", title: english ? "Recent videos" : "Vídeos recentes", more: english ? "All links and videos" : "Todos os links e vídeos" },
    { key: "paper" as const, items: papers, label: english ? "Science in focus" : "Ciência em foco", title: english ? "AI in scientific research" : "IA na pesquisa científica", more: english ? "Explore scientific research" : "Explorar a pesquisa científica" },
  ].map(group => group.items.length > 0 && <section key={group.key} className={`recent-group recent-${group.key}${expanded.includes(group.key) ? " show-more" : ""}`} aria-labelledby={`recent-${group.key}`}>
    <div className="discovery-heading"><div><p className="eyebrow">{group.label}</p><h2 id={`recent-${group.key}`}>{group.title}</h2></div><button className="text-action" onClick={() => onSelect(group.key)}>{group.more} <ArrowRight size={18} aria-hidden="true" /></button></div>
    <p className="recent-caption">{english ? "A short selection from the latest additions. The full collection is one click away." : "Uma seleção curta das últimas inclusões. O acervo completo está a um clique."}</p>
    <div id={`recent-list-${group.key}`} className="article-grid discovery-grid">{group.items.map(article => <CatalogCard key={article.id} article={article} english={english} href={detailHref(article.id)} onOpen={onOpen} />)}</div>
    {group.items.length > 1 && <button className="recent-mobile-toggle text-action" aria-expanded={expanded.includes(group.key)} aria-controls={`recent-list-${group.key}`} onClick={() => setExpanded(previous => previous.includes(group.key) ? previous.filter(key => key !== group.key) : [...previous, group.key])}>
      {expanded.includes(group.key) ? (english ? "Show less" : "Mostrar menos") : (english ? `See ${group.items.length - 1} more suggestions` : `Ver mais ${group.items.length - 1} sugestões`)}
    </button>}
  </section>)}</div>;
}
