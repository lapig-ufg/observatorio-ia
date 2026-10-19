import { formatPublicDate } from "../dateLabels";
import { useEffect, useState } from "react";
import { Code2, Gift, Image, LayoutGrid, MessagesSquare, Music, Search, Server, Telescope, type LucideIcon } from "lucide-react";
import { trackEvent } from "../analytics";
import { filterFreeTools, type FreeTool } from "../panoramaEditorial";
import { loadPanoramaConfig, loadPanoramaFreeTools } from "../panoramaSource";
import { canonicalCompany, emptyPanoramaConfig, type PanoramaConfig } from "../panoramaData";
import { EditorialExternal, EditorialFooter, EditorialState, useEditorialData } from "./EditorialShared";
import { CompanyMark } from "./CompanyMark";
import { verificationAge } from "../panoramaRefinement";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  todos: LayoutGrid, "assistentes-dev": Code2, "modelos-llm": MessagesSquare, "apis-inferencia": Server,
  "pesquisa-busca": Telescope, "imagem-design": Image, "midia-av": Music,
};

/* Empresas fora da régua (Cursor, Groq, Vercel…) ainda ganham uma cor estável,
   tirada do nome: a página não fica com metade dos selos cinza. */
const FALLBACK_COLORS = ["#2f6f8f", "#7a4fa3", "#b5562f", "#2f7d5b", "#9a6a12", "#3d5aa8", "#a23e62", "#4b6b2a"];
function toolBrand(company: string, config: PanoramaConfig) {
  const first = company.split(/\s*[/,]\s*/)[0];
  const name = canonicalCompany(first, config);
  const logoPath = config.logoPaths[config.logoMap[name]] || config.logoPaths[config.logoMap[first]] || "";
  const known = config.companyColors[name] || config.companyColors[first];
  const hash = [...first].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { name: first, logoPath, color: known || FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}

export function FreeTools({ english = false, referenceDate }: { english?: boolean; referenceDate?: string }) {
  const { data, loading, error, retry } = useEditorialData(loadPanoramaFreeTools, english);
  const [config, setConfig] = useState<PanoramaConfig>(emptyPanoramaConfig);
  const [category, setCategory] = useState("todos");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    void loadPanoramaConfig().then((result) => { if (active) setConfig(result.config); });
    return () => { active = false; };
  }, []);
  if (loading || error || !data) return <EditorialState loading={loading} error={error} retry={retry} english={english} />;
  const items = filterFreeTools(data.items, category, query);
  const featured = [...data.items].filter(item => item.rank).sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3);
  const showFeatured = category === "todos" && !query.trim() && featured.length === 3;
  const count = (id: string) => id === "todos" ? data.items.length : data.items.filter(item => item.category === id).length;
  const fields: { key: keyof FreeTool; label: string }[] = [
    { key: "limits", label: english ? "Limits and rules" : "Limites e regras" },
    { key: "theCatch", label: english ? "The catch" : "O porém" },
    { key: "howToAccess", label: english ? "How to access" : "Como acessar" },
  ];
  const age = referenceDate ? verificationAge(data.source.lastChecked, referenceDate) : null;
  const toggle = (id: string) => setExpanded(current => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const access = (item: FreeTool, className: string) => <EditorialExternal href={item.link} english={english} label={item.id}>
    <span className={className}>{english ? "Open" : "Acessar"} {item.name}</span>
  </EditorialExternal>;

  return <div className="panorama-free">
    {showFeatured && <section className="free-featured" aria-labelledby="free-featured-title">
      <h2 id="free-featured-title"><Gift size={18} aria-hidden="true" />{english ? "Where to start" : "Por onde começar"}</h2>
      <div className="free-featured-grid">{featured.map((item, i) => {
        const brand = toolBrand(item.company, config);
        return <article key={item.id} className="free-featured-card" style={{ ["--brand" as string]: brand.color }}>
          <span className="free-featured-rank">{i + 1}</span>
          <header><CompanyMark company={brand.name} color={brand.color} logoPath={brand.logoPath} size={44} /><div><h3>{item.name}</h3><small>{item.company}{item.freeModel ? ` · ${item.freeModel}` : ""}</small></div></header>
          <p className="free-quota"><span>{english ? "Free" : "Grátis"}</span>{item.freeQuota}</p>
          <p className="free-best">{item.highlight}</p>
          {access(item, "free-access")}
        </article>;
      })}</div>
    </section>}

    <div className="free-filters">
      <label className="free-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{english ? "Search tools" : "Buscar ferramentas"}</span><input type="search" value={query} placeholder={english ? "Search by name, model or use…" : "Buscar por nome, modelo ou uso…"} onChange={e => setQuery(e.target.value)} onBlur={() => {
        if (query.trim()) trackEvent(english ? "panorama_free_search_en" : "panorama_free_search", { event_category: "filter", event_label: "search" });
      }} /></label>
      <div className="free-chips" role="group" aria-label={english ? "Tool categories" : "Categorias de ferramentas"}>
        {data.categories.map(c => {
          const Icon = CATEGORY_ICONS[c.id] || LayoutGrid;
          return <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); trackEvent(english ? "panorama_free_category_en" : "panorama_free_category", { event_category: "filter", event_label: c.id }); }}><Icon size={15} aria-hidden="true" />{c.label}<small>{count(c.id)}</small></button>;
        })}
      </div>
    </div>

    <p className="free-count" role="status">{items.length} {english ? "tools" : "ferramentas"} · {english ? "verified on" : "verificado em"} <time dateTime={data.source.lastChecked}>{formatPublicDate(data.source.lastChecked, english ? "en" : "pt")}</time>{age !== null && age > 30 && <strong> · {english ? `${age} days ago; free quotas change often` : `há ${age} dias; cotas gratuitas mudam com frequência`}</strong>}</p>
    {!items.length && <div className="panorama-state"><p>{english ? "No tools match these filters." : "Nenhuma ferramenta corresponde aos filtros."}</p><button type="button" onClick={() => { setCategory("todos"); setQuery(""); }}>{english ? "Clear filters" : "Limpar filtros"}</button></div>}

    <ul className="free-grid">{items.map(item => {
      const brand = toolBrand(item.company, config);
      const open = expanded.has(item.id);
      return <li key={item.id} className="free-card" style={{ ["--brand" as string]: brand.color }}>
        <header>
          <CompanyMark company={brand.name} color={brand.color} logoPath={brand.logoPath} size={36} />
          <div><h3>{item.name}</h3><small>{item.company}</small></div>
          <span className="free-badge">{item.badge}</span>
        </header>
        {item.freeModel && <p className="free-model">{english ? "Free model: " : "Modelo grátis: "}<strong>{item.freeModel}</strong></p>}
        <p className="free-quota"><span>{english ? "Free" : "Grátis"}</span>{item.freeQuota}</p>
        <dl className="free-facts">
          <div><dt>{english ? "Best for" : "Ideal para"}</dt><dd>{item.bestFor}</dd></div>
          {item.paidStepUp && <div><dt>{english ? "Paid plan" : "Plano pago"}</dt><dd>{item.paidStepUp}</dd></div>}
        </dl>
        <div className="free-detail" id={`free-detail-${item.id}`} hidden={!open}>
          <p>{item.highlight}</p>
          <dl>{fields.map(({ key, label }) => item[key] ? <div key={key}><dt>{label}</dt><dd>{String(item[key])}</dd></div> : null)}</dl>
          <p className="panorama-editorial-meta">{item.tags.join(" · ")} · <EditorialExternal href={item.sourceUrl || data.source.url} english={english} label={`source:${item.id}`}>{english ? "Source" : "Fonte"}</EditorialExternal></p>
        </div>
        <footer>
          <button type="button" className="free-more" aria-expanded={open} aria-controls={`free-detail-${item.id}`} onClick={() => toggle(item.id)}>{open ? (english ? "Fewer details" : "Menos detalhes") : (english ? "Limits and catch" : "Limites e porém")}<span className="sr-only"> · {item.name}</span></button>
          <EditorialExternal href={item.link} english={english} label={item.id}><span className="free-access-inline">{english ? "Open" : "Acessar"}</span></EditorialExternal>
        </footer>
      </li>;
    })}</ul>
    <p className="panorama-editorial-meta">{data.source.attribution} · <EditorialExternal href={data.source.url} english={english}>{data.source.name}</EditorialExternal></p>
    <EditorialFooter date={data.updatedAt} page="gratuitos" english={english} />
  </div>;
}
