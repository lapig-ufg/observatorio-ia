import { useEffect, useRef } from "react";
import { ArrowUpRight, Headphones } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "article" | "audio";

const sources = {
  intuition: "https://semiengineering.com/intuition-and-ai/",
  jSpace: "https://transformer-circuits.pub/2026/workspace/index.html",
  podcast: "https://drive.google.com/file/d/1ro42roPdwrfXNghWYzhM7n3R1RIiWYr0/view",
};

const editions = {
  pt: {
    kicker: "Em destaque...",
    period: "4 a 10 out 2026 · duas leituras e um podcast",
    eyebrow: "Intuição, processamento implícito e reflexão deliberada",
    title: "Da intuição ao J-Space: padrões, linguagem e reflexão",
    first: "O ensaio “Intuition and AI” pergunta se criatividade e intuição podem ser reduzidas à recombinação do passado. Entre as concepções de Freud, Jung e Gary Klein, emerge uma formulação operacional fértil: a intuição como reconhecimento de padrões sob restrição de tempo, seguido por análise deliberada para testar a viabilidade da solução. É uma provocação conceitual — não uma demonstração de que sistemas de IA tenham intuição humana.",
    second: "O estudo da Anthropic oferece uma ponte mecanicista. Nos modelos analisados, um pequeno conjunto de representações verbalizáveis forma o J-Space: um espaço funcionalmente privilegiado para relato, modulação, raciocínio interno e generalização flexível, sobre um volume muito maior de processamento automático. Operações rotineiras continuam sem ele; tarefas que exigem planejamento e encadeamento deliberado se degradam quando esse espaço é suprimido. A analogia com o espaço de trabalho global ilumina como o modelo organiza informação — mas não prova consciência, experiência subjetiva ou equivalência com o inconsciente humano.",
    imageAlt: "Ilustração conceitual que distingue intuição humana e processamento em redes neurais: muitos padrões implícitos convergem para um espaço central restrito, no qual algumas representações se tornam disponíveis para avaliação deliberada e expressão verbal.",
    imageCredit: "Ilustração conceitual: Observatório UFG-IA · gerada com IA",
    explore: "Explore as conexões",
    cards: [
      {
        meta: "Ensaio · intuição e criatividade",
        title: "Reconhecer primeiro, verificar depois",
        description: "Brian Bailey contrapõe intuição, experiência e criatividade à otimização baseada no passado. A definição de Gary Klein organiza o problema em dois momentos: correspondência rápida de padrões e revisão deliberada da solução.",
        links: [
          { kind: "article", label: "Ler Intuition and AI", href: sources.intuition },
        ],
      },
      {
        meta: "Anthropic · interpretabilidade mecanicista",
        title: "O que chega ao J-Space",
        description: "A Jacobian Lens identifica representações disponíveis para verbalização. O J-Space reúne uma fração pequena e mutável dessas representações, utilizada em relato, controle dirigido e raciocínio flexível, enquanto grande parte do processamento permanece automática.",
        links: [
          { kind: "article", label: "Ler o estudo do J-Space", href: sources.jSpace },
        ],
      },
      {
        meta: "Podcast · síntese crítica",
        title: "A ponte — e o limite da analogia",
        description: "O podcast articula os dois textos: correspondência implícita de padrões, seleção de representações e verificação deliberada. A semelhança funcional é informativa, mas não autoriza concluir que o J-Space seja consciência ou inconsciente humano em uma rede neural.",
        links: [
          { kind: "audio", label: "Ouvir o podcast", href: sources.podcast },
        ],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: "4–10 Oct 2026 · two readings and one podcast",
    eyebrow: "Intuition, implicit processing and deliberate reflection",
    title: "From intuition to J-Space: patterns, language and reflection",
    first: "The essay “Intuition and AI” asks whether creativity and intuition can be reduced to recombining the past. Across the views of Freud, Jung and Gary Klein, one operational account proves especially useful: intuition as pattern matching under time pressure, followed by deliberate analysis to test whether the solution is feasible. This is a conceptual provocation — not evidence that AI systems possess human intuition.",
    second: "Anthropic’s study supplies a mechanistic bridge. In the models examined, a small set of verbalizable representations forms the J-Space: a functionally privileged workspace for report, modulation, internal reasoning and flexible generalization, above a much larger volume of automatic processing. Routine operations continue without it; tasks requiring planning and deliberate chaining deteriorate when it is suppressed. The global-workspace analogy helps explain how models organize information, but it does not establish consciousness, subjective experience or equivalence with the human unconscious.",
    imageAlt: "Conceptual illustration distinguishing human intuition from neural-network processing: many implicit patterns converge on a restricted central workspace where selected representations become available for deliberate evaluation and verbal expression.",
    imageCredit: "Conceptual illustration: UFG-AI Observatory · AI-generated",
    explore: "Explore the connections",
    cards: [
      {
        meta: "Essay · intuition and creativity",
        title: "Recognize first, verify next",
        description: "Brian Bailey contrasts intuition, experience and creativity with optimization over the past. Gary Klein’s definition structures the problem in two stages: rapid pattern matching followed by deliberate review of the proposed solution.",
        links: [
          { kind: "article", label: "Read Intuition and AI", href: sources.intuition },
        ],
      },
      {
        meta: "Anthropic · mechanistic interpretability",
        title: "What enters the J-Space",
        description: "The Jacobian Lens identifies representations available for verbalization. J-Space contains a small, changing fraction of them, used for report, directed control and flexible reasoning while much of the model’s processing remains automatic.",
        links: [
          { kind: "article", label: "Read the J-Space study", href: sources.jSpace },
        ],
      },
      {
        meta: "Podcast · critical synthesis",
        title: "The bridge — and the analogy’s limit",
        description: "The podcast brings the two texts together through implicit pattern matching, selective representation and deliberate verification. The functional similarity is informative, but it does not make J-Space human consciousness or a human unconscious inside a neural network.",
        links: [
          { kind: "audio", label: "Listen to the podcast (PT)", href: sources.podcast },
        ],
      },
    ],
  },
} as const;

function MaterialIcon({ kind }: { kind: MaterialKind }) {
  if (kind === "audio") return <Headphones size={15} aria-hidden="true" />;
  return <ArrowUpRight size={15} aria-hidden="true" />;
}

export function FeaturedDebate({ language }: { language: Language }) {
  const edition = editions[language];
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

  const trackMaterial = (material: MaterialKind, label: string) =>
    trackEvent("open_featured_material", { event_category: "outbound", event_label: label, material, featured_edition: edition.title, language });

  return <>
    <div className="weekly-highlight-kicker"><span>{edition.kicker}</span><span>{edition.period}</span></div>
    <div className="featured-debate-intro" ref={introRef}>
      <div className="featured-debate-copy">
        <p className="eyebrow">{edition.eyebrow}</p>
        <h2 id="weekly-highlight-title">{edition.title}</h2>
        <p>{edition.first}</p>
        <p>{edition.second}</p>
      </div>
      <figure className="featured-debate-art">
        <img src={assetUrl("covers/intuicao-jspace-2026-10-04.png")} alt={edition.imageAlt} width="1672" height="941" />
        <figcaption>{edition.imageCredit}</figcaption>
      </figure>
    </div>
    <div className="featured-debate-list" aria-label={edition.explore}>
      <p className="eyebrow">{edition.explore}</p>
      <div className="featured-debate-grid">
        {edition.cards.map((item) => <article className="featured-debate-card" key={item.title}>
          <p className="featured-debate-meta">{item.meta}</p>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="featured-debate-links">
            {item.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => trackMaterial(link.kind, `${item.title}: ${link.label}`)}><MaterialIcon kind={link.kind} /> {link.label}</a>)}
          </div>
        </article>)}
      </div>
    </div>
  </>;
}
