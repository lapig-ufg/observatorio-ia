/* Dados da aba "IAs gratuitas": um arquivo só, com os fatos comuns aos dois
   idiomas e os textos em { pt, en }. Atualizar = editar
   public/gratuitos/gratuitos.json e mudar as datas "checked". */
import { assetUrl } from "./catalog";
import type { PanoramaLocale } from "./panoramaSource";

export type FreeLimitType = "horas" | "dia" | "semana" | "mes" | "rede" | "aberto";
export type Bilingual = { pt: string; en: string };
export type FreeGuideItem = {
  id: string; section: "navegador" | "instalada"; name: string; company: string;
  url: string; source: string; checked: string; limitType: FreeLimitType;
  bestFor: Bilingual; model: Bilingual; quota: Bilingual; files?: Bilingual; creates?: Bilingual;
  systems?: Bilingual; account: Bilingual; privacy: Bilingual; catch: Bilingual;
};
export type FreeGuide = {
  checked: string; lead: Bilingual; limitsIntro: Bilingual;
  limitTypes: { id: FreeLimitType; label: Bilingual; text: Bilingual }[];
  sections: { id: "navegador" | "instalada"; title: Bilingual; short: Bilingual; text: Bilingual; leftOut?: { name: string; why: Bilingual }[] }[];
  items: FreeGuideItem[];
};

const LIMITS = new Set<FreeLimitType>(["horas", "dia", "semana", "mes", "rede", "aberto"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function freeText(value: Bilingual | undefined, english: boolean) {
  return value ? (english ? value.en : value.pt) : undefined;
}

/* Recusa dado incompleto em vez de mostrar cartão pela metade. */
export function validateFreeGuide(data: unknown): FreeGuide {
  const d = data as FreeGuide;
  const ok = (b: unknown) => !!b && typeof (b as Bilingual).pt === "string" && typeof (b as Bilingual).en === "string" && !!(b as Bilingual).pt && !!(b as Bilingual).en;
  if (!d || !DATE.test(d.checked) || !ok(d.lead) || !Array.isArray(d.items) || !Array.isArray(d.sections) || !Array.isArray(d.limitTypes)) throw new Error("gratuitos.json inválido");
  for (const i of d.items) {
    if (!i.id || !i.name || !i.company || !/^https:\/\//.test(i.url) || !/^https:\/\//.test(i.source) || !DATE.test(i.checked) || !LIMITS.has(i.limitType)
      || !d.sections.some(s => s.id === i.section) || ![i.bestFor, i.model, i.quota, i.account, i.privacy, i.catch].every(ok)) throw new Error(`gratuitos.json: item inválido (${i.id || "?"})`);
  }
  return d;
}

export async function loadFreeGuide(_locale: PanoramaLocale = "pt", signal?: AbortSignal) {
  const response = await fetch(assetUrl("gratuitos/gratuitos.json"), { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`gratuitos.json: HTTP ${response.status}`);
  return validateFreeGuide(await response.json());
}
