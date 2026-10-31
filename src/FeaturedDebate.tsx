import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties, Network } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey" | "lesson";

const editions = {
  "pt": {
    "startsOn": "2026-10-31",
    "kicker": "Em destaque...",
    "period": "1 a 7 nov 2026 · redes neurais e IA na universidade",
    "eyebrow": "Aprender por dentro, decidir com fundamento",
    "title": "Do neurônio ao campus: entender para decidir",
    "lead": "Como uma rede neural aprende — e o que é preciso para manter uma IA na universidade? Explore uma rede pequena, treinável e totalmente visível; depois, examine os custos e as escolhas de infraestrutura de uma IA própria no campus.",
    "first": "Na aula interativa, uma rede com duas entradas, três neurônios ocultos e uma saída permite acompanhar o ciclo de aprendizado: passagem direta, cálculo do erro, retropropagação e atualização dos pesos. Os cinco playgrounds rodam no navegador, com números e operações à vista.",
    "second": "O levantamento compara a compra e a operação de um modelo de pesos abertos por cinco anos com a contratação por uso. Equipamentos, equipe, energia, manutenção, demanda e redundância entram na discussão. São estimativas para orientar o debate, não um orçamento ou uma decisão de compra; operar esse modelo institucional é uma questão distinta de treinar a pequena rede didática.",
    "imageAlt": "Gravura em verde e cobre sobre papel claro: uma rede de neurônios desenhada em um caderno aberto se conecta a um gabinete de servidores, com edifícios universitários ao fundo.",
    "imageCredit": "Gravura editorial: Observatório UFG-IA · gerada com IA; composição simbólica",
    "explore": "Dois caminhos complementares",
    "note": "Dois conteúdos do Observatório UFG-IA.",
    "quick": [
      {
        "kind": "lesson",
        "label": "Explorar a rede neural",
        "href": "https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/"
      },
      {
        "kind": "survey",
        "label": "Quanto custa uma IA própria?",
        "href": "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"
      }
    ],
    "cards": [
      {
        "meta": "Aula interativa · Por dentro da IA",
        "title": "Como construir uma rede neural pequena, treinável e totalmente visível",
        "description": "Do neurônio à atualização dos pesos: 26 capítulos e cinco playgrounds para construir, inspecionar e treinar uma rede no navegador.",
        "links": [
          {
            "kind": "lesson",
            "label": "Abrir a aula de redes neurais",
            "href": "https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/"
          }
        ]
      },
      {
        "meta": "Levantamento · infraestrutura e custos",
        "title": "Quanto custa ter uma IA própria rodando dentro da universidade?",
        "description": "Compare cenários de público e redundância, custos de compra e operação por cinco anos e a alternativa de pagar por uso. Consulte as hipóteses e os limites de cada estimativa.",
        "links": [
          {
            "kind": "survey",
            "label": "Explorar o levantamento",
            "href": "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"
          }
        ]
      }
    ]
  },
  "en": {
    "kicker": "Featured",
    "period": "Nov 1–7, 2026 · neural networks and AI at university",
    "eyebrow": "Understand the workings, make informed choices",
    "title": "From neuron to campus: understand, then decide",
    "lead": "How does a neural network learn — and what does it take to run AI at a university? Explore a small, trainable, fully visible network, then examine the costs and infrastructure choices involved in running AI on campus.",
    "first": "In the interactive class, a network with two inputs, three hidden neurons and one output reveals the learning cycle: forward propagation, error calculation, backpropagation and weight updates. Five playgrounds run in the browser, keeping numbers and operations visible.",
    "second": "The survey compares purchasing and operating an open-weight model over five years with paying for usage. Equipment, staffing, energy, maintenance, demand and redundancy all enter the discussion. These estimates inform debate; they are not a budget or procurement decision. Operating that institutional model is a different task from training the small teaching network.",
    "imageAlt": "An engraving in green and copper on light paper: a neural network drawn in an open notebook connects to a server cabinet, with university buildings in the background.",
    "imageCredit": "Editorial engraving: UFG-AI Observatory · AI-generated symbolic composition",
    "explore": "Two complementary paths",
    "note": "Two Observatory resources, available in Portuguese.",
    "quick": [
      {
        "kind": "lesson",
        "label": "Explore the neural network (Portuguese)",
        "href": "https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/"
      },
      {
        "kind": "survey",
        "label": "The cost of on-campus AI (Portuguese)",
        "href": "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"
      }
    ],
    "cards": [
      {
        "meta": "Interactive class · Inside AI · Portuguese",
        "title": "Build a small, trainable, fully visible neural network",
        "description": "From a neuron to weight updates: 26 chapters and five playgrounds for building, inspecting and training a network in your browser.",
        "links": [
          {
            "kind": "lesson",
            "label": "Open the neural network class (Portuguese)",
            "href": "https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/"
          }
        ]
      },
      {
        "meta": "Survey · infrastructure and costs · Portuguese",
        "title": "What does it cost to run AI within a university?",
        "description": "Compare audience sizes and redundancy, five-year purchase and operating costs, and the pay-per-use alternative. Check the assumptions and limits behind each estimate.",
        "links": [
          {
            "kind": "survey",
            "label": "Explore the survey (Portuguese)",
            "href": "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"
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
        <source type="image/webp" srcSet={`${assetUrl("covers/do-neuronio-ao-campus-2026-11-01-640.webp")} 640w, ${assetUrl("covers/do-neuronio-ao-campus-2026-11-01-1280.webp")} 1280w`} sizes="(max-width: 700px) calc(100vw - 64px), 550px" />
        <img src={assetUrl("covers/do-neuronio-ao-campus-2026-11-01.png")} alt={edition.imageAlt} width="1536" height="1024" decoding="async" />
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
