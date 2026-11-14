import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties, Network } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey" | "lesson";

const courseLinks = {
  overview: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/",
  lesson: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/aula.html",
  browserPractice: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/pratica.html",
  desktopPractice: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/pratica-3.html",
} as const;

const editions = {
  pt: {
    startsOn: "2026-11-15",
    kicker: "Em destaque...",
    period: "15 a 21 nov 2026 · curso prático do Observatório UFG-IA",
    eyebrow: "Aprenda a usar IA no dia a dia",
    title: "Do chat ao agente",
    lead: "Um curso prático de oito horas, em dois encontros, para quem trabalha com documentos, planilhas e fotos e não programa. Comece pelo chat no navegador e pratique com a IA em uma pasta no seu computador. Em cada etapa, aprenda a conferir o resultado.",
    imageAlt: "Quatro personagens robóticos ao redor de uma mesa de dominó, com as peças e as fichas de regras à vista.",
    imageCredit: "Mesa de dominó da aula · Observatório UFG-IA",
    explore: "Três formas de começar",
    first: "A aula começa com demonstrações criadas com IA, como a gangorra que calcula o centro de massa e a mesa de dominó. Depois, os exercícios no navegador mostram como extrair tarefas de uma foto, conferir informações em documentos e revisar planilhas.",
    second: "Na última etapa, a prática passa para arquivos e pastas no computador, com exemplos de viagens, certificados e um mapa de Goiás. Cada exercício indica quais resultados conferir antes de usá-los.",
    quick: [{ kind: "lesson", label: "Acessar o curso", href: courseLinks.overview }],
    cards: [
      {
        meta: "Aula e gravações",
        title: "Assista à aula",
        description: "Percorra as três etapas e veja os exemplos gravados.",
        links: [{ kind: "lesson", label: "Abrir a aula", href: courseLinks.lesson }],
      },
      {
        meta: "Seis exercícios",
        title: "Pratique no navegador",
        description: "Trabalhe com fotos, documentos e planilhas no chat de IA que você já usa.",
        links: [{ kind: "lesson", label: "Abrir os exercícios no navegador", href: courseLinks.browserPractice }],
      },
      {
        meta: "Três exercícios",
        title: "Pratique no computador",
        description: "Trabalhe com pastas e arquivos de exemplo e confira os resultados de cada exercício.",
        links: [{ kind: "lesson", label: "Abrir os exercícios no computador", href: courseLinks.desktopPractice }],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: "Nov 15–21, 2026 · practical course from the UFG-AI Observatory",
    eyebrow: "Learn to use AI in everyday work",
    title: "From chat to agent",
    lead: "An eight-hour practical course over two sessions for people who work with documents, spreadsheets and photos and have no programming experience. Start with AI chat in your browser, then practise using AI with a folder on your computer. Learn to check the results at every stage.",
    imageAlt: "Four robot characters around a domino table, with the tiles and rule cards in view.",
    imageCredit: "Domino table from the course · UFG-AI Observatory",
    note: "The course and its materials are in Portuguese.",
    explore: "Three ways to get started",
    first: "The course begins with demonstrations made with AI, including a seesaw that calculates the centre of mass and a domino table. Browser exercises then show how to extract tasks from a photo, check information in documents and review spreadsheets.",
    second: "The final stage moves to files and folders on your computer, with examples involving travel records, certificates and a map of Goiás. Each exercise tells you what to check before using the results.",
    quick: [{ kind: "lesson", label: "Open the course (Portuguese)", href: courseLinks.overview }],
    cards: [
      {
        meta: "Lesson and recordings",
        title: "Watch the lesson",
        description: "Work through all three stages and watch the recorded examples.",
        links: [{ kind: "lesson", label: "Open the lesson (Portuguese)", href: courseLinks.lesson }],
      },
      {
        meta: "Six exercises",
        title: "Practise in the browser",
        description: "Work with photos, documents and spreadsheets in the AI chat you already use.",
        links: [{ kind: "lesson", label: "Open the browser exercises (Portuguese)", href: courseLinks.browserPractice }],
      },
      {
        meta: "Three exercises",
        title: "Practise on your computer",
        description: "Work with sample files and folders and check the results of each exercise.",
        links: [{ kind: "lesson", label: "Open the desktop exercises (Portuguese)", href: courseLinks.desktopPractice }],
      },
    ],
  },
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
        {"note" in edition && <small className="featured-material-note">{edition.note}</small>}
      </div>
      <figure className="featured-debate-art">
        <img src={assetUrl("do-chat-ao-agente/assets/img/domino.jpg")} alt={edition.imageAlt} width="1600" height="900" decoding="async" />
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
