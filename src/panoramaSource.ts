import {
  PANORAMA_LAUNCHES_TAB,
  PANORAMA_SHEET_ID,
  PANORAMA_SITE,
  PANORAMA_TRANSLATIONS_TAB,
  applyTranslations,
  benchmarksFromJson,
  catalogFromJson,
  emptyPanoramaConfig,
  launchesFromGviz,
  panoramaConfigFromDataJs,
  translationsFromGviz,
  type PanoramaBenchmarks,
  type PanoramaCatalogModel,
  type PanoramaConfig,
  type PanoramaGvizResponse,
  type PanoramaLaunch,
} from "./panoramaData";
import { editorialFromScript } from "./panoramaEditorial";

/* Busca de rede do Panorama. Tudo vem do site vivo do Panorama e da planilha
   dele, a cada abertura: o Observatório não guarda cópia (ver o teste
   "never a local copy" em tests/english-version.test.mjs). */

export type PanoramaLocale = "pt" | "en";

export type PanoramaLaunchesResult = {
  launches: PanoramaLaunch[];
  config: PanoramaConfig;
  /* Avisos para quem mantém o site; a página pode mostrá-los discretamente. */
  warnings: string[];
};

const assetUrl = (path: string) => new URL(`assets/${path}`, PANORAMA_SITE).toString();

/* A planilha do Panorama é lida pelo nome da aba (a do acervo é lida pelo gid).
   JSONP, como o resto do Observatório e o próprio Panorama: o gviz não manda
   cabeçalho CORS para leitura via fetch no navegador. */
export function fetchPanoramaSheet(tab: string, signal?: AbortSignal) {
  return new Promise<PanoramaGvizResponse>((resolve, reject) => {
    const callbackName = `panoramaGviz_${tab.replace(/\W/g, "_")}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const target = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    let timeout = 0;

    const cleanup = () => {
      window.clearTimeout(timeout);
      script.remove();
      delete target[callbackName];
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Consulta cancelada.", "AbortError"));
    };

    target[callbackName] = (response: PanoramaGvizResponse) => {
      cleanup();
      resolve(response);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível consultar a planilha do Panorama."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("A consulta à planilha do Panorama excedeu o tempo disponível."));
    }, 15_000);
    script.src = `https://docs.google.com/spreadsheets/d/${PANORAMA_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(tab)}&tqx=responseHandler:${callbackName}`;
    document.head.appendChild(script);
  });
}

async function fetchJson(path: string, signal?: AbortSignal) {
  const response = await fetch(assetUrl(path), { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

let configRequest: Promise<{ config: PanoramaConfig; warning: string }> | null = null;

/* Uma busca por carga de página: cores e apelidos mudam só quando alguém
   cadastra empresa no Panorama. Falhou, segue com a configuração vazia. */
export function loadPanoramaConfig(signal?: AbortSignal) {
  // A requisição é compartilhada: sair de uma aba não pode cancelar a
  // configuração que outra aba ainda está esperando.
  void signal;
  configRequest ??= fetch(assetUrl("data.js"), { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { config: panoramaConfigFromDataJs(await response.text()), warning: "" };
    })
    .catch((error: unknown) => {
      configRequest = null;
      return { config: emptyPanoramaConfig, warning: `Cores e países das empresas indisponíveis (${error instanceof Error ? error.message : "erro"}).` };
    });
  return configRequest;
}

export async function loadPanoramaLaunches(locale: PanoramaLocale = "pt", signal?: AbortSignal): Promise<PanoramaLaunchesResult> {
  const [{ config, warning }, sheet] = await Promise.all([
    loadPanoramaConfig(signal),
    fetchPanoramaSheet(PANORAMA_LAUNCHES_TAB, signal),
  ]);
  const warnings = warning ? [warning] : [];
  let launches = launchesFromGviz(sheet);
  if (locale === "en") {
    /* Sem a aba de tradução, os lançamentos aparecem com o texto em português:
       nenhum lançamento some da versão inglesa por falta de tradução. */
    const translations = await fetchPanoramaSheet(PANORAMA_TRANSLATIONS_TAB, signal)
      .then((response) => translationsFromGviz(response, config))
      .catch(() => new Map<string, string>());
    launches = applyTranslations(launches, translations, config);
    const missing = launches.filter((launch) => launch.untranslated).length;
    if (missing) warnings.push(`${missing} release descriptions are not translated yet.`);
  }
  return { launches, config, warnings };
}

export async function loadPanoramaBenchmarks(locale: PanoramaLocale = "pt", signal?: AbortSignal): Promise<PanoramaBenchmarks> {
  const [{ config }, json] = await Promise.all([
    loadPanoramaConfig(signal),
    fetchJson(locale === "en" ? "benchmarks-en.json" : "benchmarks.json", signal),
  ]);
  return benchmarksFromJson(json, config);
}

/* O catálogo (~480 famílias) só deve ser pedido quando a tela precisar dele. */
export async function loadPanoramaCatalog(signal?: AbortSignal): Promise<PanoramaCatalogModel[]> {
  const [{ config }, json] = await Promise.all([loadPanoramaConfig(signal), fetchJson("catalogo.json", signal)]);
  return catalogFromJson(json, config);
}

async function fetchEditorialScript(file: string, locale: PanoramaLocale, signal?: AbortSignal) {
  const path = `${file}${locale === "en" ? "-en" : ""}.js`;
  const response = await fetch(assetUrl(path), { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

export async function loadPanoramaFreeTools(locale: PanoramaLocale = "pt", signal?: AbortSignal) {
  return editorialFromScript(await fetchEditorialScript("gratuitos-data", locale, signal), "GRATUITOS_DATA");
}

export async function loadPanoramaUsage(locale: PanoramaLocale = "pt", signal?: AbortSignal) {
  const [text, scenes] = await Promise.all([
    fetchEditorialScript("como-usar-data", locale, signal),
    fetchEditorialScript("como-usar-cenas", locale, signal),
  ]);
  return { data: editorialFromScript(text, "COMO_USAR_DATA"), scenes: editorialFromScript(scenes, "COMO_USAR_CENAS") };
}
