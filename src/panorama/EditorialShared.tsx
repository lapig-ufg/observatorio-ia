import { formatPublicDate } from "../dateLabels";
import { useEffect, useState, type ReactNode } from "react";
import { trackEvent } from "../analytics";
import { PANORAMA_SITE } from "../panoramaData";
import { editorialHtml, editorialText, safeEditorialUrl, type LearnMore } from "../panoramaEditorial";
import type { PanoramaLocale } from "../panoramaSource";

export function useEditorialData<T>(loader: (locale: PanoramaLocale, signal?: AbortSignal) => Promise<T>, english: boolean) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ data: null, loading: true, error: false });
    loader(english ? "en" : "pt", controller.signal).then(data => {
      if (active) setState({ data, loading: false, error: false });
    }).catch(() => { if (active) setState({ data: null, loading: false, error: true }); });
    return () => { active = false; controller.abort(); };
  }, [loader, english, attempt]);
  return { ...state, retry: () => setAttempt(a => a + 1) };
}

export function EditorialState({ loading, error, retry, english }: { loading: boolean; error: boolean; retry: () => void; english: boolean }) {
  return <div className={`panorama-state${error ? " panorama-state--error" : ""}`} role={error ? "alert" : "status"}>
    <p>{loading ? (english ? "Loading the Panorama content…" : "Carregando o conteúdo do Panorama…") : (english ? "The Panorama content could not be loaded." : "Não foi possível carregar o conteúdo do Panorama.")}</p>
    {error && <button type="button" onClick={retry}>{english ? "Try again" : "Tentar de novo"}</button>}
  </div>;
}

export function Prose({ text, raw = false, className = "" }: { text?: string; raw?: boolean; className?: string }) {
  return text ? <span className={className} dangerouslySetInnerHTML={{ __html: raw ? editorialHtml(text) : editorialText(text) }} /> : null;
}

export function More({ items, english }: { items?: LearnMore | LearnMore[]; english: boolean }) {
  return <>{(items ? Array.isArray(items) ? items : [items] : []).map((item, i) => <details className="panorama-reading-more" key={i} onToggle={e => {
    if (e.currentTarget.open) trackEvent(english ? "panorama_usage_expand_en" : "panorama_usage_expand", { event_category: "content", event_label: item.titulo });
  }}><summary>{item.titulo}</summary><p><Prose text={item.corpo} raw /></p></details>)}</>;
}

export function EditorialExternal({ href, children, english, label = "editorial" }: { href: string; children: ReactNode; english: boolean; label?: string }) {
  const url = safeEditorialUrl(href);
  return url ? <a href={url} target="_blank" rel="noreferrer" onClick={() => trackEvent(english ? "panorama_editorial_outbound_en" : "panorama_editorial_outbound", { event_category: "outbound", event_label: label })}>{children} ↗</a> : <>{children}</>;
}

export function EditorialFooter({ english, date, page }: { english: boolean; date: string; page: "gratuitos" | "como-usar" }) {
  return <footer className="panorama-provenance"><span>{english ? "Curation by LAPIG/UFG · content from the live Panorama" : "Curadoria LAPIG/UFG · conteúdo do Panorama ao vivo"} · <time dateTime={date}>{formatPublicDate(date, english ? "en" : "pt")}</time></span>
    <EditorialExternal href={`${PANORAMA_SITE}${english ? "en/" : ""}${page}.html`} english={english}>{english ? "Open the original Panorama" : "Abrir o Panorama original"}</EditorialExternal>
  </footer>;
}
