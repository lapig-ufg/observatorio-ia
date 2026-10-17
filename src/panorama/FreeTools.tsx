import { formatPublicDate } from "../dateLabels";
import { Fragment, useState } from "react";
import { trackEvent } from "../analytics";
import { filterFreeTools, type FreeTool } from "../panoramaEditorial";
import { loadPanoramaFreeTools } from "../panoramaSource";
import { EditorialExternal, EditorialFooter, EditorialState, useEditorialData } from "./EditorialShared";
import { verificationAge } from "../panoramaRefinement";

export function FreeTools({ english = false, referenceDate }: { english?: boolean; referenceDate?: string }) {
  const { data, loading, error, retry } = useEditorialData(loadPanoramaFreeTools, english);
  const [category, setCategory] = useState("todos");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (loading || error || !data) return <EditorialState loading={loading} error={error} retry={retry} english={english} />;
  const items = filterFreeTools(data.items, category, query);
  const fields: { key: keyof FreeTool; label: string }[] = [
    { key: "limits", label: english ? "Limits and rules" : "Limites e regras" },
    { key: "theCatch", label: english ? "The catch" : "O porém" },
    { key: "howToAccess", label: english ? "How to access" : "Como acessar" },
  ];
  const labels = english ? ["Tool (company)", "Model", "Free quota", "Best for", "Paid plan", "Access"] : ["Ferramenta (empresa)", "Modelo", "Limite gratuito", "Ideal para", "Plano pago", "Acesso"];
  const age = referenceDate ? verificationAge(data.source.lastChecked, referenceDate) : null;
  return <div className="panorama-free">
    <p className="panorama-editorial-meta">{data.source.attribution} · {english ? "Verified on" : "Verificado em"} <time dateTime={data.source.lastChecked}>{formatPublicDate(data.source.lastChecked, english ? "en" : "pt")}</time> · <EditorialExternal href={data.source.url} english={english}>{data.source.name}</EditorialExternal></p>
    {age !== null && age > 30 && <p className="panorama-freshness">{english ? `Verified ${age} days ago; free quotas change frequently.` : `Verificado há ${age} dias; cotas gratuitas mudam com frequência.`}</p>}
    <label className="panorama-search"><span>{english ? "Search tools" : "Buscar ferramentas"}</span><input type="search" value={query} placeholder={english ? "Name, model, use…" : "Nome, modelo, uso…"} onChange={e => setQuery(e.target.value)} onBlur={() => {
      if (query.trim()) trackEvent(english ? "panorama_free_search_en" : "panorama_free_search", { event_category: "filter", event_label: "search" });
    }} /></label>
    <div className="panorama-editorial-chips" role="group" aria-label={english ? "Tool categories" : "Categorias de ferramentas"}>
      {data.categories.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); trackEvent(english ? "panorama_free_category_en" : "panorama_free_category", { event_category: "filter", event_label: c.id }); }}>{c.label}</button>)}
    </div>
    <p role="status">{items.length} {english ? "tools found" : "ferramentas encontradas"}</p>
    {!items.length && <div className="panorama-state"><p>{english ? "No tools match these filters." : "Nenhuma ferramenta corresponde aos filtros."}</p><button type="button" onClick={() => { setCategory("todos"); setQuery(""); }}>{english ? "Clear filters" : "Limpar filtros"}</button></div>}
    <table className="panorama-free-table">
      <caption className="sr-only">{english ? "Comparison of free AI tools" : "Comparação de ferramentas de IA gratuitas"}</caption>
      <thead><tr>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{items.map(item => <Fragment key={item.id}>
        <tr>
          <th scope="row" data-label={labels[0]}><strong>{item.name}</strong><small>{item.company}</small><button type="button" aria-expanded={expanded.has(item.id)} aria-controls={`free-detail-${item.id}`} onClick={() => setExpanded(current => {
            const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next;
          })}>{expanded.has(item.id) ? (english ? "Close details −" : "Fechar detalhes −") : (english ? "Details +" : "Detalhes +")}<span className="sr-only"> · {item.name}</span></button></th>
          <td data-label={labels[1]}>{item.freeModel || "—"}</td>
          <td data-label={labels[2]}>{item.freeQuota}</td>
          <td data-label={labels[3]}>{item.bestFor}</td>
          <td data-label={labels[4]}>{item.paidStepUp || "—"}</td>
          <td data-label={labels[5]}><EditorialExternal href={item.link} english={english} label={item.id}>{english ? "Access" : "Acessar"}</EditorialExternal></td>
        </tr>
        <tr className="panorama-free-detail" id={`free-detail-${item.id}`} hidden={!expanded.has(item.id)}><td colSpan={6}>
          <p><strong>{item.badge}</strong> · {item.highlight}</p>
          <dl>{fields.map(({ key, label }) => item[key] ? <div key={key}><dt>{label}</dt><dd>{String(item[key])}</dd></div> : null)}</dl>
          <p className="panorama-editorial-meta">{item.tags.join(" · ")}</p>
          <p className="panorama-editorial-meta"><EditorialExternal href={item.sourceUrl || data.source.url} english={english} label={`source:${item.id}`}>{english ? "Source" : "Fonte"}</EditorialExternal> · {english ? "Verified" : "Verificado"} <time dateTime={data.source.lastChecked}>{formatPublicDate(data.source.lastChecked, english ? "en" : "pt")}</time></p>
        </td></tr>
      </Fragment>)}</tbody>
    </table>
    <EditorialFooter date={data.updatedAt} page="gratuitos" english={english} />
  </div>;
}
