import { formatPublicDate } from "../dateLabels";
import { useState } from "react";
import { trackEvent } from "../analytics";
import { filterFreeTools, type FreeTool } from "../panoramaEditorial";
import { loadPanoramaFreeTools } from "../panoramaSource";
import { EditorialExternal, EditorialFooter, EditorialState, useEditorialData } from "./EditorialShared";

export function FreeTools({ english = false }: { english?: boolean }) {
  const { data, loading, error, retry } = useEditorialData(loadPanoramaFreeTools, english);
  const [category, setCategory] = useState("todos");
  const [query, setQuery] = useState("");
  if (loading || error || !data) return <EditorialState loading={loading} error={error} retry={retry} english={english} />;
  const items = filterFreeTools(data.items, category, query);
  const fields: { key: keyof FreeTool; label: string }[] = [
    { key: "freeQuota", label: english ? "Free plan" : "Plano gratuito" },
    { key: "limits", label: english ? "Limits and rules" : "Limites e regras" },
    { key: "bestFor", label: english ? "Best for" : "Ideal para" },
    { key: "paidStepUp", label: english ? "Paid plan" : "Plano pago" },
    { key: "theCatch", label: english ? "The catch" : "O porém" },
    { key: "howToAccess", label: english ? "How to access" : "Como acessar" },
  ];
  return <div className="panorama-free">
    <h2>{english ? "Free AI tools" : "IAs gratuitas"}</h2>
    <p className="panorama-editorial-meta">{data.source.attribution} · {english ? "Verified on" : "Verificado em"} <time dateTime={data.source.lastChecked}>{formatPublicDate(data.source.lastChecked, english ? "en" : "pt")}</time> · <EditorialExternal href={data.source.url} english={english}>{data.source.name}</EditorialExternal></p>
    <label className="panorama-search"><span>{english ? "Search tools" : "Buscar ferramentas"}</span><input type="search" value={query} placeholder={english ? "Name, model, use…" : "Nome, modelo, uso…"} onChange={e => setQuery(e.target.value)} onBlur={() => {
      if (query.trim()) trackEvent(english ? "panorama_free_search_en" : "panorama_free_search", { event_category: "filter", event_label: "search" });
    }} /></label>
    <div className="panorama-editorial-chips" role="group" aria-label={english ? "Tool categories" : "Categorias de ferramentas"}>
      {data.categories.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); trackEvent(english ? "panorama_free_category_en" : "panorama_free_category", { event_category: "filter", event_label: c.id }); }}>{c.label}</button>)}
    </div>
    <p role="status">{items.length} {english ? "tools found" : "ferramentas encontradas"}</p>
    {!items.length && <div className="panorama-state"><p>{english ? "No tools match these filters." : "Nenhuma ferramenta corresponde aos filtros."}</p><button type="button" onClick={() => { setCategory("todos"); setQuery(""); }}>{english ? "Clear filters" : "Limpar filtros"}</button></div>}
    <div className="panorama-free-grid">{items.map(item => <article className="panorama-free-card" key={item.id}>
      <header><span>{item.company} · {item.badge}</span><h3>{item.name}</h3>{item.freeModel && <p className="panorama-free-model">{item.freeModel}</p>}</header>
      <p>{item.highlight}</p>
      <dl>{fields.map(({ key, label }) => item[key] ? <div key={key}><dt>{label}</dt><dd>{String(item[key])}</dd></div> : null)}</dl>
      <ul className="panorama-free-tags" aria-label={english ? "Tags" : "Etiquetas"}>{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      <footer><EditorialExternal href={item.link} english={english} label={item.id}>{english ? "Access for free" : "Acessar gratuitamente"}</EditorialExternal>
        <small><EditorialExternal href={item.sourceUrl || data.source.url} english={english} label={`source:${item.id}`}>{english ? "Source" : "Fonte"}</EditorialExternal> · {english ? "Verified" : "Verificado"} <time dateTime={data.source.lastChecked}>{formatPublicDate(data.source.lastChecked, english ? "en" : "pt")}</time></small>
      </footer>
    </article>)}</div>
    <EditorialFooter date={data.updatedAt} page="gratuitos" english={english} />
  </div>;
}
