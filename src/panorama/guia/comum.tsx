import { useEffect, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { canonicalCompany, companyColor, type PanoramaConfig } from "../../panoramaData";
import { CompanyMark } from "../CompanyMark";
import type { IndexKey } from "../../guiaModelos";

export type T = (pt: string, en: string) => string;
export const makeT = (english: boolean): T => (pt, en) => english ? en : pt;

export const INDEX_LABELS: Record<IndexKey, { pt: string; en: string; short: { pt: string; en: string } }> = {
  intelligence: { pt: "Inteligência geral", en: "Overall intelligence", short: { pt: "Geral", en: "Overall" } },
  finance: { pt: "Finanças e contabilidade", en: "Finance and accounting", short: { pt: "Finanças", en: "Finance" } },
  strategy: { pt: "Estratégia e operações", en: "Strategy and operations", short: { pt: "Estratégia", en: "Strategy" } },
  legal: { pt: "Jurídico", en: "Legal", short: { pt: "Jurídico", en: "Legal" } },
  health: { pt: "Saúde e medicina", en: "Health and medicine", short: { pt: "Saúde", en: "Health" } },
  engineering: { pt: "Engenharia", en: "Engineering", short: { pt: "Engenharia", en: "Engineering" } },
  economics: { pt: "Economia", en: "Economics", short: { pt: "Economia", en: "Economics" } },
};

export const indexLabel = (key: IndexKey, english: boolean, short = false) => {
  const item = INDEX_LABELS[key];
  return short ? item.short[english ? "en" : "pt"] : item[english ? "en" : "pt"];
};

/* O mesmo selo da régua e do guia antigo: círculo na cor da empresa + logo. */
export function Mark({ company, config, size = 26 }: { company: string; config: PanoramaConfig; size?: number }) {
  const canonical = canonicalCompany(company, config);
  return <CompanyMark company={canonical} color={companyColor(company, config)} logoPath={config.logoPaths[config.logoMap[canonical]] || config.logoPaths[config.logoMap[company]] || ""} size={size} className="gm-mark" />;
}

/* Cor de série estável por família: a cor da empresa. Duas famílias da mesma
   empresa no mesmo gráfico se distinguem pelo traço (ver `dashFor`). */
export const familyColor = (company: string, config: PanoramaConfig) => companyColor(company, config) || "#61706a";

/* Explicação curta de um termo, aberta ao toque (sem depender de hover). */
export function InfoTip({ label, children, english }: { label: string; children: ReactNode; english: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return <span className="gm-info" ref={ref}>
    <button type="button" className="gm-info-button" aria-expanded={open} aria-label={`${english ? "What is" : "O que é"}: ${label}`} onClick={() => setOpen(!open)}><Info size={14} aria-hidden="true" /></button>
    {open && <span className="gm-info-pop" role="note"><button type="button" className="gm-info-close" onClick={() => setOpen(false)} aria-label={english ? "Close" : "Fechar"}><X size={14} aria-hidden="true" /></button><strong>{label}</strong>{children}</span>}
  </span>;
}

/* Largura do contêiner, para os gráficos em SVG se redesenharem no celular. */
export function useWidth<E extends HTMLElement>(fallback = 720) {
  const ref = useRef<E>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/* Escala log com marcas "redondas" (1, 2, 5 × 10^n). */
export function logTicks(min: number, max: number) {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

export function niceMax(value: number, step = 10) {
  return Math.ceil(value / step) * step;
}
