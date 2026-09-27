import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "article" | "document" | "slides" | "audio";

const sources = {
  fifthEra: "https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003230",
  knowledgePreservation: "https://www.nature.com/articles/s41467-026-72667-3",
  paper2Agent: "https://www.nature.com/articles/s41586-026-11044-y",
  relativity: "https://www.nature.com/articles/d41586-026-02804-x",
  mathControversy: "https://www.science.org/content/article/how-ai-math-breakthrough-ignited-controversy",
  severeMisalignment: "https://zenodo.org/records/22737751",
  leidenDeclaration: "https://zenodo.org/records/20302944",
  fifthEraSlides: "https://drive.google.com/file/d/1o6A1vPeyzAfgkWTYZgKgtgPicxxz8grd/view",
  livingManuscriptSlides: "https://drive.google.com/file/d/1d8w6RpIEEwIQPbqXussWOgxf6_PB4Hms/view",
  relativitySlides: "https://drive.google.com/file/d/1H2X2XISoaQGK7gHUC_Jl-6AgPdIPJE1-/view",
  understandingSlides: "https://drive.google.com/file/d/1yXOgbJ7sN1lR6wDvX9FbfD6nM3T7EHMT/view",
  fifthEraAudio: "https://drive.google.com/file/d/1KHG_DpLv7Fe7c-Ay-awfuzI5aT0pd3jQ/view",
  paper2AgentAudio: "https://drive.google.com/file/d/1xFZwjvXq0A8bojd8MY8TxIqYcxJ2CGA3/view",
  relativityAudio: "https://drive.google.com/file/d/12-wpVpC1-XYSkTvI1NBtTs8HcG1lkmr3/view",
  mathematicsAudio: "https://drive.google.com/file/d/1AOlNLNczg9o6u6GEnumCR825U125ek8w/view",
};

const editions = {
  pt: {
    kicker: "Em destaque...",
    period: "27 set a 3 out 2026 · leituras, escutas e apresentações",
    eyebrow: "Descoberta, reprodutibilidade e responsabilidade",
    title: "IA na ciência: da ferramenta ao agente",
    first: "Os Nobel de 2024 mostraram que métodos de IA já mudaram a forma como a ciência reconhece padrões e modela estruturas complexas. O passo seguinte é mais profundo: sistemas que formulam hipóteses, executam métodos, conectam artigos a código e exploram problemas que exigem criatividade. É nesse contexto que surge a ideia de uma “quinta era” da ciência — não sem o pesquisador, mas com novas formas de colaboração entre inteligência humana e computacional.",
    second: "A questão decisiva não é apenas se a IA produz uma resposta, mas se o resultado tem proveniência, pode ser auditado, reproduzido e validado de forma independente. Paper2Agent revela o potencial de manuscritos executáveis; experimentos com uma IA treinada em conhecimento anterior a 1900 expõem capacidades e limites da redescoberta; e as controvérsias na matemática tornam visíveis os conflitos sobre autoria, crédito e responsabilidade. Produtividade só se converte em conhecimento quando permanece aberta ao escrutínio da comunidade.",
    imageAlt: "Ilustração conceitual das cinco eras da ciência: uma pesquisadora dialoga com uma rede de IA entre observação, teoria, computação, dados e agentes científicos, sob um símbolo de orientação e responsabilidade humana.",
    imageCredit: "Ilustração conceitual: Observatório UFG-IA · gerada com IA",
    explore: "Explore o dossiê",
    cards: [
      {
        meta: "Perspectiva · ciência aberta",
        title: "Uma quinta era da ciência?",
        description: "Nina Miolane propõe a inteligência científica artificial como uma nova etapa da prática científica. A promessa depende, porém, de conhecimento bem documentado, curadoria especializada e supervisão humana.",
        links: [
          { kind: "article", label: "Ler artigo", href: sources.fifthEra },
          { kind: "article", label: "Preservação do conhecimento", href: sources.knowledgePreservation },
          { kind: "slides", label: "Ver apresentação", href: sources.fifthEraSlides },
          { kind: "audio", label: "Ouvir análise", href: sources.fifthEraAudio },
        ],
      },
      {
        meta: "Nature · agentes científicos",
        title: "Do artigo estático ao manuscrito executável",
        description: "O Paper2Agent transforma texto, dados e código em agentes interativos. O avanço reduz barreiras ao reuso, mas depende de repositórios completos, ambientes reproduzíveis e validação humana.",
        links: [
          { kind: "article", label: "Ler artigo", href: sources.paper2Agent },
          { kind: "slides", label: "Ver apresentação", href: sources.livingManuscriptSlides },
          { kind: "audio", label: "Ouvir análise", href: sources.paper2AgentAudio },
        ],
      },
      {
        meta: "Nature · criatividade científica",
        title: "Uma IA conseguiria reinventar a relatividade?",
        description: "A Machina Mirabilis foi treinada com conhecimento histórico para testar se um modelo poderia reconstruir ideias da física moderna. Houve lampejos úteis, não uma redescoberta autônoma: o sistema falhou em muitas tarefas e precisou de orientação.",
        links: [
          { kind: "article", label: "Ler análise", href: sources.relativity },
          { kind: "slides", label: "Ver apresentação", href: sources.relativitySlides },
          { kind: "audio", label: "Ouvir análise", href: sources.relativityAudio },
        ],
      },
      {
        meta: "Matemática · autoria e integridade",
        title: "Quando resolver não basta",
        description: "Resultados recentes reacenderam uma pergunta difícil: uma prova formalmente verificada basta para produzir compreensão matemática? A controvérsia envolve prioridade, acesso a trabalho não publicado, atribuição e responsabilidade humana.",
        links: [
          { kind: "article", label: "Ler reportagem", href: sources.mathControversy },
          { kind: "document", label: "Severe Misalignment", href: sources.severeMisalignment },
          { kind: "document", label: "Declaração de Leiden", href: sources.leidenDeclaration },
          { kind: "slides", label: "Ver apresentação", href: sources.understandingSlides },
          { kind: "audio", label: "Ouvir análise", href: sources.mathematicsAudio },
        ],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: "27 Sep–3 Oct 2026 · reading, listening and presentations",
    eyebrow: "Discovery, reproducibility and responsibility",
    title: "AI in science: from tool to agent",
    first: "The 2024 Nobel Prizes showed that AI methods have already changed how science recognizes patterns and models complex structures. The next step is deeper: systems that formulate hypotheses, execute methods, connect papers to code and explore problems that demand creativity. This is the context for the idea of a “fifth era” of science — not without researchers, but with new forms of collaboration between human and computational intelligence.",
    second: "The decisive question is not merely whether AI produces an answer, but whether the result has provenance and can be audited, reproduced and independently validated. Paper2Agent demonstrates the potential of executable manuscripts; experiments with an AI trained on pre-1900 knowledge expose both the possibilities and limits of rediscovery; and disputes in mathematics make conflicts over authorship, credit and responsibility visible. Productivity becomes knowledge only when it remains open to scrutiny by the scientific community.",
    imageAlt: "Conceptual illustration of five eras of science: a researcher engages with an AI network among observation, theory, computation, data and scientific agents, under a symbol of human direction and responsibility.",
    imageCredit: "Conceptual illustration: UFG-AI Observatory · AI-generated",
    explore: "Explore the dossier",
    cards: [
      {
        meta: "Perspective · open science",
        title: "A fifth era of science?",
        description: "Nina Miolane proposes artificial scientific intelligence as a new stage of scientific practice. Its promise, however, depends on well-documented knowledge, expert curation and human oversight.",
        links: [
          { kind: "article", label: "Read article", href: sources.fifthEra },
          { kind: "article", label: "Knowledge preservation", href: sources.knowledgePreservation },
          { kind: "slides", label: "View presentation", href: sources.fifthEraSlides },
          { kind: "audio", label: "Listen to analysis (PT)", href: sources.fifthEraAudio },
        ],
      },
      {
        meta: "Nature · scientific agents",
        title: "From static paper to executable manuscript",
        description: "Paper2Agent turns text, data and code into interactive agents. It lowers barriers to reuse, but still depends on complete repositories, reproducible environments and human validation.",
        links: [
          { kind: "article", label: "Read article", href: sources.paper2Agent },
          { kind: "slides", label: "View presentation", href: sources.livingManuscriptSlides },
          { kind: "audio", label: "Listen to analysis (PT)", href: sources.paper2AgentAudio },
        ],
      },
      {
        meta: "Nature · scientific creativity",
        title: "Could AI reinvent relativity?",
        description: "Machina Mirabilis was trained on historical knowledge to test whether a model could reconstruct ideas from modern physics. It showed useful glimpses, not an autonomous rediscovery: the system failed many tasks and needed guidance.",
        links: [
          { kind: "article", label: "Read analysis", href: sources.relativity },
          { kind: "slides", label: "View presentation", href: sources.relativitySlides },
          { kind: "audio", label: "Listen to analysis (PT)", href: sources.relativityAudio },
        ],
      },
      {
        meta: "Mathematics · authorship and integrity",
        title: "When solving is not enough",
        description: "Recent results revived a difficult question: is a formally verified proof enough to produce mathematical understanding? The dispute involves priority, access to unpublished work, attribution and human responsibility.",
        links: [
          { kind: "article", label: "Read report", href: sources.mathControversy },
          { kind: "document", label: "Severe Misalignment", href: sources.severeMisalignment },
          { kind: "document", label: "Leiden Declaration", href: sources.leidenDeclaration },
          { kind: "slides", label: "View presentation", href: sources.understandingSlides },
          { kind: "audio", label: "Listen to analysis (PT)", href: sources.mathematicsAudio },
        ],
      },
    ],
  },
} as const;

function MaterialIcon({ kind }: { kind: MaterialKind }) {
  if (kind === "audio") return <Headphones size={15} aria-hidden="true" />;
  if (kind === "slides") return <Presentation size={15} aria-hidden="true" />;
  if (kind === "document") return <FileText size={15} aria-hidden="true" />;
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
        <img src={assetUrl("covers/ia-quinta-era-ciencia-2026-09-26.jpg")} alt={edition.imageAlt} width="1672" height="941" />
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
