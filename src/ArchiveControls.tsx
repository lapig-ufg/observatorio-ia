import { useEffect, useState, type ReactNode } from "react";
import { readArchiveFilters } from "./archiveSearch";

export function ArchiveFilterDetails({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 701px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 701px)");
    const update = () => setOpen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <details className="archive-filter-details" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{label}</summary><div className="archive-filter-fields">{children}</div>
  </details>;
}

export function useArchiveFilters<T extends Record<string, string>>(prefix: string, defaults: T) {
  const [values, setValues] = useState(() => readArchiveFilters(window.location.search, prefix, defaults));
  const defaultsKey = JSON.stringify(defaults);
  useEffect(() => {
    const url = new URL(window.location.href);
    Object.entries(values).forEach(([key, value]) => value !== defaults[key] ? url.searchParams.set(`${prefix}_${key}`, value) : url.searchParams.delete(`${prefix}_${key}`));
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event("observatorio:location"));
  }, [values, prefix, defaultsKey]);
  useEffect(() => {
    const restore = () => setValues(readArchiveFilters(window.location.search, prefix, defaults));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [prefix, defaultsKey]);
  return [values, (key: keyof T, value: string) => setValues(previous => ({ ...previous, [key]: value }))] as const;
}

export function ShareSearch({ english = false }: { english?: boolean }) {
  const [message, setMessage] = useState("");
  return <div className="share-search"><button className="text-action" onClick={async () => {
    try { await navigator.clipboard.writeText(window.location.href); setMessage(english ? "Search link copied" : "Link da busca copiado"); }
    catch { setMessage(english ? "Copy the address from your browser" : "Copie o endereço na barra do navegador"); }
  }}>{english ? "Share this search" : "Compartilhar esta busca"}</button><span role="status">{message}</span></div>;
}
