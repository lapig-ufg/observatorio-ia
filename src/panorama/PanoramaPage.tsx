import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../analytics";
import { PANORAMA_SITE, canonicalCompany } from "../panoramaData";
import { Timeline } from "./Timeline";
import { ModelGuide } from "./ModelGuide";
import { FreeTools } from "./FreeTools";
import { UsageGuide } from "./UsageGuide";
import { loadPanoramaBenchmarks, loadPanoramaLaunches } from "../panoramaSource";
import { formatPublicDate } from "../dateLabels";

/* Página do Panorama dentro do Observatório — a casca que as quatro abas
   compartilham. O iframe acabou: cada aba renderiza o próprio conteúdo, lendo
   os dados ao vivo do site do Panorama e da planilha dele.

   Rotas por hash: `#panorama` (régua) e as sub-rotas `#panorama/guia`,
   `#panorama/gratuitos` e `#panorama/como-usar`. O App resolve qualquer hash
   que comece com `#panorama` como a página "panorama"; a sub-rota é lida aqui.
   Cada aba lê sua fonte viva, inclusive os textos e as cenas editoriais. */

type TabKey = "" | "guia" | "gratuitos" | "como-usar";

const TABS: Array<{ key: TabKey; pt: string; en: string }> = [
  { key: "", pt: "Linha do tempo", en: "Timeline" },
  { key: "guia", pt: "Qual modelo usar", en: "Which model to use" },
  { key: "gratuitos", pt: "IAs gratuitas", en: "Free AI tools" },
  { key: "como-usar", pt: "Como usar fora do navegador", en: "Using AI beyond the browser" },
];

function panoramaSubRoute(route: string): TabKey {
  const hash = route.split("?")[0];
  if (hash === "#panorama/guia") return "guia";
  if (hash === "#panorama/gratuitos") return "gratuitos";
  if (hash === "#panorama/como-usar") return "como-usar";
  return "";
}

export function PanoramaPage({ english = false }: { english?: boolean }) {
  const [route, setRoute] = useState(() => window.location.hash);
  const tab = panoramaSubRoute(route);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const [context, setContext] = useState<{ releases: number; companies: number; date: string } | null>(null);
  const [contextFailed, setContextFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setContext(null);
    setContextFailed(false);
    // A data é a da coleta publicada, nunca a data de visita ao portal.
    void Promise.all([loadPanoramaLaunches(english ? "en" : "pt", controller.signal), loadPanoramaBenchmarks(english ? "en" : "pt", controller.signal)])
      .then(([result, benchmarks]) => {
        if (!controller.signal.aborted) setContext({ releases: result.launches.length, companies: new Set(result.launches.map(item => canonicalCompany(item.company, result.config))).size, date: benchmarks.fetchedAt.slice(0, 10) });
      }).catch(() => { if (!controller.signal.aborted) setContextFailed(true); });
    return () => controller.abort();
  }, [english]);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /* Ao trocar de sub-página, o foco vai para o <h1> — a mesma convenção das
     páginas do App, para leitores de tela não continuarem na aba anterior. */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById("panorama-title");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        document.getElementById("page-content")?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, english]);

  useEffect(() => {
    const label = TABS.find((entry) => entry.key === tab);
    // O App trata a página maior; depois dele, a sub-rota dá o título
    // específico, inclusive na entrada direta e na navegação pelo histórico.
    const frame = window.requestAnimationFrame(() => {
      document.title = `${english ? label?.en : label?.pt} | ${english ? "UFG-AI Observatory" : "Observatório UFG-IA"}`;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route, tab, english]);


  const introductions: Record<TabKey, string> = english ? {
    "": "Follow model releases since ChatGPT in November 2022, by company and ecosystem.",
    guia: "Compare measured capability, API price and response speed for each task.",
    gratuitos: "Compare free quotas, uses and paid plans before choosing a tool.",
    "como-usar": "Understand what changes when AI can work with files and programs on your computer.",
  } : {
    "": "Acompanhe os lançamentos desde o ChatGPT, em novembro de 2022, por empresa e ecossistema.",
    guia: "Compare a capacidade medida, o preço da API e a velocidade de resposta para cada tarefa.",
    gratuitos: "Compare cotas gratuitas, usos e planos pagos antes de escolher uma ferramenta.",
    "como-usar": "Entenda o que muda quando a IA pode trabalhar com arquivos e programas no seu computador.",
  };
  const openOriginalUrl = english ? `${PANORAMA_SITE}en/` : PANORAMA_SITE;

  return (
    <section id="panorama" className="panorama-page" aria-labelledby="panorama-title">
      <div className="panorama-intro pt-panorama-intro">
        <div className="panorama-heading">
          <p className="eyebrow">{english ? "AI Panorama" : "Panorama da IA"}</p>
          <h1 id="panorama-title">{english ? "Global Generative AI Landscape" : "Panorama da IA generativa"}</h1>
          <p className="panorama-context" aria-live="polite">{context ? (english
            ? `${context.releases} releases from ${context.companies} companies · data collected on ${formatPublicDate(context.date, "en")}`
            : `${context.releases} lançamentos de ${context.companies} empresas · dados de ${formatPublicDate(context.date)}`) : contextFailed ? (english ? "Collection context unavailable." : "Contexto da coleta indisponível.") : (english ? "Loading collection context…" : "Carregando o contexto da coleta…")}</p>
        </div>
      </div>

      <nav className="panorama-tabs" aria-label={english ? "Panorama sections" : "Seções do Panorama"}>
        {TABS.map((entry) => (
          <a
            key={entry.key || "regua"}
            ref={tab === entry.key ? activeTabRef : undefined}
            href={`#panorama${entry.key ? `/${entry.key}` : ""}`}
            aria-current={tab === entry.key ? "page" : undefined}
            onClick={() => trackEvent(english ? "panorama_tab_en" : "panorama_tab", {
              event_category: "navigation",
              event_label: entry.key || "regua",
            })}
          >
            {english ? entry.en : entry.pt}
          </a>
        ))}
      </nav>
      <p className="panorama-tab-intro">{introductions[tab]}</p>

      {tab === "" ? <Timeline english={english} /> : tab === "guia" ? <ModelGuide english={english} /> : tab === "gratuitos" ? <FreeTools english={english} referenceDate={context?.date} /> : <UsageGuide english={english} />}
      {tab === "guia" && <footer className="panorama-provenance panorama-page-source"><span>{english ? "Source: Artificial Analysis · curation by LAPIG/UFG" : "Fonte: Artificial Analysis · curadoria LAPIG/UFG"}</span><a href={`${openOriginalUrl}guia.html`} target="_blank" rel="noreferrer">{english ? "Original Panorama" : "Panorama original"} ↗</a></footer>}
    </section>
  );
}
