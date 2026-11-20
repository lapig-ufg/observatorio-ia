import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties, Network } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";
import { radarDateWindow } from "./radarPeriod";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey" | "lesson";

const courseLinks = {
  overview: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/",
  lesson: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/aula.html",
  browserPractice: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/pratica.html",
  desktopPractice: "https://lapig-ufg.github.io/observatorio-ia/do-chat-ao-agente/pratica-3.html",
} as const;

const courseEditions = {
  pt: {
    startsOn: "2026-11-15",
    kicker: "Em destaque...",
    period: "15 a 20 nov 2026 · curso prático do Observatório UFG-IA",
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
    period: "Nov 15–20, 2026 · practical course from the UFG-AI Observatory",
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

const educationLinks = {
  resolution: "https://www.in.gov.br/web/dou/-/resolucao-cne/cp-n-1-de-11-de-novembro-de-2026-744136563",
  presentation: "https://drive.google.com/file/d/1fnq7F2oIsrEtgSSmKknfFpWA80D3Udpo/view",
  audio: "https://drive.google.com/file/d/1tbsRLBdu299Yv8lXj0ytUO7dIyCwP4Nk/view",
  itemPt: "https://lapig-ufg.github.io/observatorio-ia/?item=documento-cne-cp-parecer-15-2026#item",
  itemEn: "https://lapig-ufg.github.io/observatorio-ia/en/?item=documento-cne-cp-parecer-15-2026#item",
} as const;

const editions = {
  pt: {
    startsOn: "2026-11-20",
    kicker: "Em destaque...",
    period: "20 a 28 nov 2026 · Conselho Nacional de Educação",
    eyebrow: "Resolução CNE/CP nº 1/2026",
    title: "IA na educação brasileira",
    lead: "Quando a IA pode apoiar o ensino? A Resolução CNE/CP nº 1/2026 define regras por etapa, protege os dados dos estudantes e mantém a responsabilidade pedagógica com as pessoas. Conheça a norma, veja a apresentação e ouça o episódio.",
    imageAlt: "Uma professora conversa com dois estudantes diante de um caderno aberto. Um computador está ao lado.",
    imageCredit: "Ilustração editorial gerada com IA · Observatório UFG-IA",
    explore: "Materiais para entender a resolução",
    first: "A resolução entrou em vigor em 12 de novembro de 2026. O art. 46 dá 12 meses para que redes e instituições façam as adequações necessárias. As vedações do art. 41, como a vigilância biométrica contínua e as decisões exclusivamente automatizadas com efeitos relevantes, valem desde a publicação.",
    second: "Na Educação Infantil, a norma veda o uso de IA pelas crianças, mesmo com mediação. Nos anos iniciais do Ensino Fundamental, a interação de estudantes com IA generativa ou conversacional é vedada mesmo com supervisão. Nos anos finais, o uso de IA generativa só é admitido em atividades com mediação de profissionais da educação (arts. 21 a 23).",
    quick: [
      { kind: "document", label: "Ler a resolução no DOU", href: educationLinks.resolution },
      { kind: "document", label: "Ver a síntese e o parecer", href: educationLinks.itemPt },
      { kind: "presentation", label: "Ver a apresentação (PDF)", href: educationLinks.presentation },
      { kind: "audio", label: "Ouvir o episódio (12 min)", href: educationLinks.audio },
    ],
    note: "Na apresentação, a lâmina 6 reúne anos finais e Ensino Médio. O art. 23 da resolução trata dos anos finais do Ensino Fundamental.",
    cards: [
      {
        meta: "Diário Oficial da União · 12/11/2026",
        title: "Resolução CNE/CP nº 1/2026",
        description: "Texto oficial das diretrizes e ficha do Observatório com síntese de uma página, parecer integral e despacho de homologação.",
        links: [
          { kind: "document", label: "Ler o texto oficial", href: educationLinks.resolution },
          { kind: "document", label: "Abrir a ficha da norma", href: educationLinks.itemPt },
        ],
      },
      {
        meta: "Apresentação · PDF · 15 lâminas",
        title: "Diretrizes de IA na educação brasileira",
        description: "Guia visual sobre mediação docente, regras por etapa e níveis de risco. Na lâmina 7, a incorporação da política ao PDI e aos PPCs é prevista quando pertinente (art. 27, § 1º). Na lâmina 12, o relatório de impacto à proteção de dados é exigido quando aplicável (art. 40, § 2º, II).",
        links: [{ kind: "presentation", label: "Abrir a apresentação", href: educationLinks.presentation }],
      },
      {
        meta: "Áudio em português · 12 min",
        title: "Novas regras da IA nas escolas",
        description: "Episódio complementar sobre as diretrizes.",
        links: [{ kind: "audio", label: "Abrir o áudio no Drive", href: educationLinks.audio }],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: "Nov 20–28, 2026 · Brazil’s National Council of Education",
    eyebrow: "CNE/CP Resolution No. 1/2026",
    title: "AI in Brazilian education",
    lead: "When can AI support teaching? CNE/CP Resolution No. 1/2026 sets rules by stage of education, protects student data and keeps people responsible for teaching and assessment. Read the resolution, view the slides and listen to the episode.",
    imageAlt: "A teacher talks with two students over an open notebook, with a laptop to one side.",
    imageCredit: "AI-generated editorial illustration · UFG-AI Observatory",
    explore: "Materials for understanding the resolution",
    first: "The resolution took effect on November 12, 2026. Article 46 gives education systems and institutions 12 months to make the required adjustments. The prohibitions in Article 41, including continuous biometric surveillance and solely automated decisions with significant effects, have applied since publication.",
    second: "Children in early childhood education may not use AI, even with adult mediation. In the early grades of fundamental education, students may not interact with generative or conversational AI even under supervision. In the later grades, generative AI may only be used in activities mediated by education professionals (Articles 21–23).",
    quick: [
      { kind: "document", label: "Read the resolution (Portuguese)", href: educationLinks.resolution },
      { kind: "document", label: "See the English summary", href: educationLinks.itemEn },
      { kind: "presentation", label: "View the slides (Portuguese)", href: educationLinks.presentation },
      { kind: "audio", label: "Listen in Portuguese (12 min)", href: educationLinks.audio },
    ],
    note: "Slide 6 groups the later grades of fundamental education and upper secondary education. Article 23 addresses only the later grades of fundamental education.",
    cards: [
      {
        meta: "Brazilian Official Gazette · Nov 12, 2026",
        title: "CNE/CP Resolution No. 1/2026",
        description: "The official guidelines and the Observatory entry with a one-page English summary, the full opinion and the ministerial ratification notice.",
        links: [
          { kind: "document", label: "Read the official text (Portuguese)", href: educationLinks.resolution },
          { kind: "document", label: "Open the Observatory entry", href: educationLinks.itemEn },
        ],
      },
      {
        meta: "Presentation · 15 slides · Portuguese PDF",
        title: "AI guidelines for Brazilian education",
        description: "A visual guide to teacher mediation, rules by stage of education and risk levels. For slide 7, the resolution calls for including AI policies in institutional development and course plans where relevant (Article 27, § 1). For slide 12, a data protection impact report is required where applicable (Article 40, § 2, II).",
        links: [{ kind: "presentation", label: "Open the slides (Portuguese)", href: educationLinks.presentation }],
      },
      {
        meta: "Portuguese audio · 12 min",
        title: "New rules for AI in schools",
        description: "A companion episode about the guidelines.",
        links: [{ kind: "audio", label: "Open the audio in Drive (Portuguese)", href: educationLinks.audio }],
      },
    ],
  },
} as const;

export function isEducationEdition(now = new Date()) {
  return radarDateWindow(now).end >= editions.pt.startsOn;
}

// O Sobre reaproveita a data editorial da edição, sem manter uma segunda cópia.
export function featuredPeriod(language: Language) {
  return (isEducationEdition() ? editions : courseEditions)[language].period.split(" · ")[0];
}

function MaterialIcon({ kind }: { kind: MaterialKind }) {
  if (kind === "audio") return <Headphones size={15} aria-hidden="true" />;
  if (kind === "presentation") return <Presentation size={15} aria-hidden="true" />;
  if (kind === "document") return <FileText size={15} aria-hidden="true" />;
  if (kind === "lesson") return <Network size={15} aria-hidden="true" />;
  if (kind === "survey") return <TableProperties size={15} aria-hidden="true" />;
  return <ArrowUpRight size={15} aria-hidden="true" />;
}

export function FeaturedDebate({ language, weeklyBadge = false }: { language: Language; weeklyBadge?: boolean }) {
  const education = isEducationEdition();
  const edition = (education ? editions : courseEditions)[language];
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
    // O GA4 só emite o evento automático "click" para links externos. O curso
    // fica no mesmo domínio, então enviamos o mesmo evento à mão para o painel
    // de audiência conseguir contar cada material do destaque.
    if (href.startsWith(`${window.location.origin}/`)) {
      trackEvent("click", { link_url: href, link_domain: window.location.hostname, link_text: label, outbound: false });
    }
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
        {education ? <img src={assetUrl("covers/ia-educacao-brasileira-2026-11-22-1280.webp")} srcSet={`${assetUrl("covers/ia-educacao-brasileira-2026-11-22-640.webp")} 640w, ${assetUrl("covers/ia-educacao-brasileira-2026-11-22-1280.webp")} 1280w`} sizes="(max-width: 760px) calc(100vw - 56px), 510px" alt={edition.imageAlt} width="1280" height="720" decoding="async" /> : <img src={assetUrl("do-chat-ao-agente/assets/img/domino.jpg")} alt={edition.imageAlt} width="1600" height="900" decoding="async" />}
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
