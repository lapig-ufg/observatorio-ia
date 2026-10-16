import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../analytics";
import { PANORAMA_SITE } from "../panoramaData";
import { Timeline } from "./Timeline";
import { ModelGuide } from "./ModelGuide";
import { FreeTools } from "./FreeTools";
import { UsageGuide } from "./UsageGuide";

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

  /* Em telas maiores a aba ativa entra na vista ao trocar. No celular a
     grade de duas colunas já mantém todos os destinos visíveis. */
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [tab]);

  const openOriginalUrl = english ? `${PANORAMA_SITE}en/` : PANORAMA_SITE;

  return (
    <section id="panorama" className="panorama-page" aria-labelledby="panorama-title">
      <div className="panorama-intro">
        <a className="back-to-catalog" href={english ? "#top" : "#acervo"} onClick={() => trackEvent(english ? "back_to_catalog_en" : "back_to_catalog")}>
          ← {english ? "Back to the collection" : "Voltar ao acervo"}
        </a>
        <div className="panorama-heading">
          <h1 id="panorama-title">{english ? "Global Generative AI Landscape" : "Panorama Global da IA Generativa"}</h1>
          <p>{english
            ? "Model releases since ChatGPT (Nov 2022), which model to use for each task, free AI tools, and a practical guide to agents in the terminal."
            : "Os lançamentos de modelos desde o ChatGPT (nov/2022), qual modelo usar em cada tipo de tarefa e o que dá para usar de graça."}</p>
        </div>
        <a
          className="panorama-open"
          href={openOriginalUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent(english ? "open_panorama_standalone_en" : "open_panorama_standalone", {
            event_category: "outbound",
            event_label: english ? "panorama-en" : "panorama",
          })}
        >
          {english ? "Original Panorama" : "Panorama original"} <ArrowUpRight size={14} aria-hidden="true" />
        </a>
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

      {tab === "" ? <Timeline english={english} /> : tab === "guia" ? <ModelGuide english={english} /> : tab === "gratuitos" ? <FreeTools english={english} /> : <UsageGuide english={english} />}
    </section>
  );
}
