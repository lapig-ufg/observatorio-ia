import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties, Network } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey" | "lesson";

const reportLinks = {
  pdf: "https://www.stateof.ai/State-of-AI-Report-2026.pdf",
  explorer: "https://www.stateof.ai/2026-explore/",
  podcast: "https://drive.google.com/file/d/1t6HZOeQTxRr_Jp6CIVfmQUJPDdZaiY-K/view",
} as const;

const editions = {
  "pt": {
    "startsOn": "2026-11-08",
    "kicker": "Em destaque...",
    "period": "8 a 14 nov 2026 · o panorama anual da IA",
    "eyebrow": "Modelos, aplicações e infraestrutura",
    "title": "State of AI Report 2026",
    "lead": "De agentes e robótica à energia que sustenta os centros de dados. Conheça o panorama anual de Nathan Benaich e da Air Street Capital pelo relatório completo, pelo Explorador Web ou pelo podcast em português.",
    "first": "O relatório tem 244 lâminas. Depois da introdução, organiza-se em cinco seções: pesquisa, indústria, política e regulação, segurança e previsões. A última seção avalia as previsões da edição anterior e apresenta as dos autores para 2027.",
    "second": "O Explorador reorganiza o relatório em nove capítulos, com texto, gráficos interativos e links para lâminas específicas. Ao comparar as fontes, vale distinguir resultados de estudos e benchmarks, métricas divulgadas por empresas e previsões dos autores.",
    "imageAlt": "Gravura de um centro de dados em corte, com fileiras de servidores entre uma subestação elétrica e o sistema de refrigeração.",
    "imageCredit": "Gravura editorial do Observatório UFG-IA · gerada com IA",
    "explore": "Três formas de acompanhar a edição",
    "note": "Relatório e Explorador em inglês. Podcast em português, com 21 min.",
    "quick": [
      {
        "kind": "presentation",
        "label": "Abrir o PDF · 244 lâminas",
        "href": reportLinks.pdf
      },
      {
        "kind": "document",
        "label": "Explorar a edição de 2026",
        "href": reportLinks.explorer
      },
      {
        "kind": "audio",
        "label": "Ouvir o podcast",
        "href": reportLinks.podcast
      }
    ],
    "cards": [
      {
        "meta": "Relatório original · PDF em inglês",
        "title": "As 244 lâminas do State of AI Report 2026",
        "description": "Pesquisa, indústria, política e regulação, segurança e previsões. Para ver como o Explorador remete às fontes, abra a lâmina numerada 14 sobre agentes, que é a página 15 do PDF.",
        "links": [
          {
            "kind": "presentation",
            "label": "Abrir relatório completo",
            "href": reportLinks.pdf
          }
        ]
      },
      {
        "meta": "Explorador Web · nove capítulos em inglês",
        "title": "Explore the 2026 report",
        "description": "Progresso da IA, agentes, computação e infraestrutura, negócios, robótica, ciência, política e geopolítica, segurança e previsões.",
        "links": [
          {
            "kind": "document",
            "label": "Abrir o Explorador Web",
            "href": reportLinks.explorer
          }
        ]
      },
      {
        "meta": "Podcast complementar · M4A em português · 21 min",
        "title": "O gargalo da IA é físico",
        "description": "Síntese em áudio do Explorador Web, com o tema da infraestrutura em primeiro plano.",
        "links": [
          {
            "kind": "audio",
            "label": "Ouvir no Google Drive",
            "href": reportLinks.podcast
          }
        ]
      }
    ]
  },
  "en": {
    "kicker": "Featured",
    "period": "Nov 8–14, 2026 · the annual AI report",
    "eyebrow": "Models, applications and infrastructure",
    "title": "State of AI Report 2026",
    "lead": "From agents and robotics to the electricity that powers data centres. Explore Nathan Benaich and Air Street Capital’s annual survey through the full report, the web explorer or a companion podcast in Portuguese.",
    "first": "The report contains 244 slides. After the introduction, it has five sections: research, industry, politics and regulation, safety, and predictions. The final section grades last year’s predictions and presents the authors’ forecasts for 2027.",
    "second": "The web explorer reorganises the report into nine chapters, with text, interactive charts and links to specific slides. The sources range from studies and benchmarks to figures reported by companies and the authors’ own forecasts.",
    "imageAlt": "An engraving of a data centre in cutaway, with rows of servers between an electrical substation and the cooling system.",
    "imageCredit": "Editorial engraving by the UFG-AI Observatory · AI-generated",
    "explore": "Three ways to explore the report",
    "note": "Report and web explorer in English. Podcast in Portuguese, 21 min.",
    "quick": [
      {
        "kind": "presentation",
        "label": "Open the PDF · 244 slides",
        "href": reportLinks.pdf
      },
      {
        "kind": "document",
        "label": "Explore the 2026 report",
        "href": reportLinks.explorer
      },
      {
        "kind": "audio",
        "label": "Listen to the podcast (Portuguese)",
        "href": reportLinks.podcast
      }
    ],
    "cards": [
      {
        "meta": "Original report · PDF in English",
        "title": "All 244 slides of the State of AI Report 2026",
        "description": "Research, industry, politics and regulation, safety, and predictions. To see how the explorer links back to the source, open the agent slide numbered 14, which is page 15 of the PDF.",
        "links": [
          {
            "kind": "presentation",
            "label": "Open the full report",
            "href": reportLinks.pdf
          }
        ]
      },
      {
        "meta": "Web explorer · nine chapters in English",
        "title": "Explore the 2026 report",
        "description": "AI progress, agents, compute and infrastructure, business, robotics, science, policy and geopolitics, safety, and predictions.",
        "links": [
          {
            "kind": "document",
            "label": "Open the web explorer",
            "href": reportLinks.explorer
          }
        ]
      },
      {
        "meta": "Companion podcast · M4A in Portuguese · 21 min",
        "title": "O gargalo da IA é físico",
        "description": "An audio summary of the web explorer with an emphasis on the physical infrastructure behind AI.",
        "links": [
          {
            "kind": "audio",
            "label": "Listen on Google Drive (Portuguese)",
            "href": reportLinks.podcast
          }
        ]
      }
    ]
  }
} as const;

// O Sobre reaproveita a data editorial da edição, sem manter uma segunda cópia.
export const featuredPeriod = { label: editions.pt.period.split(" · ")[0], englishLabel: editions.en.period.split(" · ")[0] };

function MaterialIcon({ kind }: { kind: MaterialKind }) {
  if (kind === "audio") return <Headphones size={15} aria-hidden="true" />;
  if (kind === "presentation") return <Presentation size={15} aria-hidden="true" />;
  if (kind === "document") return <FileText size={15} aria-hidden="true" />;
  if (kind === "lesson") return <Network size={15} aria-hidden="true" />;
  if (kind === "survey") return <TableProperties size={15} aria-hidden="true" />;
  return <ArrowUpRight size={15} aria-hidden="true" />;
}

export function FeaturedDebate({ language, weeklyBadge = false }: { language: Language; weeklyBadge?: boolean }) {
  const edition = editions[language];
  const Title = weeklyBadge || language === "pt" ? "h3" : "h2";
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = introRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackEvent("view_featured_highlight", { event_category: "engagement", event_label: edition.title, language });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [edition.title, language]);

  const trackMaterial = (material: MaterialKind, label: string, href: string) => {
    trackEvent("open_featured_material", { event_category: "content", event_label: label, material, featured_edition: edition.title, language });
    // External materials already emit GA's enhanced-measurement click event.
    if (material === "survey") trackEvent("open_featured_survey", { event_category: "content", event_label: href, language });
  };

  return <>
    <div className="weekly-highlight-kicker">{!weeklyBadge && <span>{edition.kicker}</span>}{weeklyBadge && <p className="pt-weekly-badge">{language === "en" ? "New edition every Sunday" : "Nova edição todo domingo"}</p>}<span>{edition.period}</span></div>
    <div className="featured-debate-intro" ref={introRef}>
      <div className="featured-debate-copy">
        {!weeklyBadge && <p className="eyebrow">{edition.eyebrow}</p>}
        <Title id="weekly-highlight-title">{edition.title}</Title>
        <p>{edition.lead}</p>
        <div className="featured-quick-links">
          {edition.quick.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => trackMaterial(link.kind, link.label, link.href)}><MaterialIcon kind={link.kind} /> {link.label}</a>)}
        </div>
        <small className="featured-material-note">{edition.note}</small>
      </div>
      <figure className="featured-debate-art">
        <picture>
          <source type="image/webp" srcSet={`${assetUrl("covers/infraestrutura-ia-2026-11-08-640.webp")} 640w, ${assetUrl("covers/infraestrutura-ia-2026-11-08-1280.webp")} 1280w`} sizes="(max-width: 700px) calc(100vw - 64px), 550px" />
          <img src={assetUrl("covers/infraestrutura-ia-2026-11-08.png")} alt={edition.imageAlt} width="1536" height="1024" decoding="async" />
        </picture>
        <figcaption>{edition.imageCredit}</figcaption>
      </figure>
    </div>
    <details className="featured-reading">
    <summary>{language === "pt" ? "Explorar a análise e as conexões" : "Explore the analysis and connections"}</summary>
    <div className="featured-full-analysis"><p>{edition.first}</p><p>{edition.second}</p></div>
    <div className="featured-debate-list" aria-label={edition.explore}>
      <p className="eyebrow">{edition.explore}</p>
      <div className="featured-debate-grid">
        {edition.cards.map((item) => <article className="featured-debate-card" key={item.title}>
          <p className="featured-debate-meta">{item.meta}</p>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="featured-debate-links">
            {item.links.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith("#") ? undefined : "_blank"} rel={link.href.startsWith("#") ? undefined : "noreferrer"} onClick={() => trackMaterial(link.kind, `${item.title}: ${link.label}`, link.href)}><MaterialIcon kind={link.kind} /> {link.label}</a>)}
          </div>
        </article>)}
      </div>
    </div>
    </details>
  </>;
}
