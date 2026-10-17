import { formatPublicDate } from "./dateLabels";
import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey";

const sources = {
  survey: "#levantamentos/politicas-ia",
  dossier: "https://drive.google.com/file/d/180BdIVjxxTz5s9gLMt36JAg8AS98yikV/view",
  podcast: "https://drive.google.com/file/d/1WIHOYWwecUKKJScm4CiileJJz18qVNe9/view",
  presentation: "https://drive.google.com/file/d/1-db96LJfCQAyWV8c_frRAtkeulupacHg/view",
};

const editions = {
  pt: {
    kicker: "Em destaque...",
    period: "18 a 24 out 2026 · um levantamento e três materiais complementares",
    eyebrow: "Autoria, transparência, confidencialidade e responsabilidade",
    title: "IA na publicação científica: regras diversas, responsabilidade humana",
    lead: "Pode usar IA para escrever um artigo? Onde declarar esse uso? E na revisão por pares? O Observatório UFG-IA reúne 149 registros de políticas e diretrizes para explorar um sistema de regras heterogêneas. Um painel, um dossiê, um podcast e uma apresentação ajudam a transformar essa complexidade em consulta crítica e prática científica rastreável.",
    first: "Não há uma regra única para todas as etapas da pesquisa. Edição linguística, geração de texto ou código, produção de imagens e avaliação de manuscritos sob sigilo recebem tratamentos diferentes. O levantamento permite comparar essas regras sem confundir a orientação de uma editora com a política de cada periódico. No recorte editorial de 130 registros, 88 permitem geração de texto com declaração; 50 não tratam explicitamente do uso por revisores, segundo a revisão integral de 17 de outubro.",
    second: "O dossiê articula essa base à literatura sobre integridade, diversidade epistêmica, detecção e reprodutibilidade. A responsabilidade pela verificação continua humana: conferir fontes e regras vigentes, proteger material confidencial, registrar a tarefa e declarar conforme as instruções aplicáveis. A base é uma amostra intencional, não um censo; ausência de regra localizada não é autorização. Os três materiais complementares estão em português. A apresentação conserva indicadores anteriores à revisão: para números atuais, consulte o painel e o dossiê final de 17/10.",
    imageAlt: "Composição editorial de um periódico aberto, manuscritos anotados e uma matriz conceitual em verde, ocre, cinza e terracota sobre papel, simbolizando a comparação de regras de publicação científica.",
    imageCredit: "Ilustração editorial: Observatório UFG-IA · gerada com IA; matriz conceitual, não quantitativa",
    explore: "Quatro caminhos para explorar o tema",
    cards: [
      {
        meta: "Levantamento · consulta e comparação",
        title: "Políticas de IA na publicação científica",
        description: "Explore os 149 registros, compare regras por entidade e área e consulte fontes oficiais, método e downloads CSV/XLSX. Verifique sempre as instruções vigentes antes de submeter ou avaliar um trabalho.",
        links: [
          { kind: "survey", label: "Explorar o levantamento", href: sources.survey },
        ],
      },
      {
        meta: "Dossiê · versão final de 17/10/2026",
        title: "Da norma à responsabilidade científica",
        description: "O ensaio integra a base revisada à literatura metacientífica: autoria, transparência, confidencialidade, limites dos detectores, diversidade do conhecimento e práticas de verificação. Documento Word em português.",
        links: [
          { kind: "document", label: "Ler o dossiê (DOCX)", href: sources.dossier },
        ],
      },
      {
        meta: "Podcast · material complementar",
        title: "O caos da IA na publicação científica",
        description: "Uma entrada em áudio para o debate, baseada no dossiê conforme indicação do editor. Para conferir regras, estatísticas e referências, consulte o documento final e as fontes do levantamento. Áudio em português, formato M4A.",
        links: [
          { kind: "audio", label: "Ouvir o podcast", href: sources.podcast },
        ],
      },
      {
        meta: "Apresentação · síntese visual",
        title: "Governança de IA na Ciência",
        description: "Quinze lâminas sobre regras em camadas, tarefas, declaração e responsabilidade. Atenção: seus indicadores antecedem a revisão integral de 17/10; para os valores atualizados, use o painel e o dossiê final. PDF em português.",
        links: [
          { kind: "presentation", label: "Ver a apresentação (PDF)", href: sources.presentation },
        ],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: formatPublicDate("2026-10-18", "en") + " – " + formatPublicDate("2026-10-24", "en") + " · one survey and three companion materials",
    eyebrow: "Authorship, transparency, confidentiality and accountability",
    title: "AI in scientific publishing: different rules, human responsibility",
    lead: "Can AI be used to write a paper? Where should its use be disclosed? What about peer review? The UFG-AI Observatory brings together 149 policy and guidance records to explore a heterogeneous system of rules. A survey, a dossier, a podcast and a presentation connect critical consultation with traceable scientific practice.",
    first: "There is no single rule for every research task. Language editing, text or code generation, images and the assessment of confidential manuscripts receive different treatment. The survey compares these rules without equating a publisher’s guidance with each journal’s policy. Among the 130 editorial records, 88 allow text generation with disclosure; 50 do not explicitly address use by reviewers, according to the full review of 17 October.",
    second: "The dossier connects this dataset with research on integrity, epistemic diversity, detection and reproducibility. Verification remains a human responsibility: check primary sources and current rules, protect confidential material, record the task and disclose use as required. The dataset is a purposive sample, not a census; an unlocated rule is not permission. The three companion materials are in Portuguese. The presentation retains earlier indicators: consult the survey and the final 17 October dossier for updated figures.",
    imageAlt: "Editorial composition of an open scholarly journal, annotated manuscripts and a conceptual green, ochre, grey and terracotta comparison matrix on paper, representing scientific publishing policies.",
    imageCredit: "Editorial illustration: UFG-AI Observatory · AI-generated; conceptual, not quantitative matrix",
    explore: "Four ways to explore the topic",
    cards: [
      {
        meta: "Survey · consultation and comparison",
        title: "AI policies in scientific publishing",
        description: "Explore 149 records, compare rules by entity and field, and consult official sources, methods and CSV/XLSX downloads. Always check current instructions before submitting or reviewing work.",
        links: [
          { kind: "survey", label: "Explore the survey", href: sources.survey },
        ],
      },
      {
        meta: "Dossier · final version of 17 October 2026",
        title: "From policy to scientific responsibility",
        description: "The essay connects the revised dataset with metascientific literature: authorship, disclosure, confidentiality, detector limitations, diversity of knowledge and verification practices. Word document in Portuguese.",
        links: [
          { kind: "document", label: "Read the dossier (DOCX, in Portuguese)", href: sources.dossier },
        ],
      },
      {
        meta: "Podcast · companion material",
        title: "The chaos of AI in scientific publishing",
        description: "An audio introduction to the debate, based on the dossier as identified by the editor. Consult the final document and the survey’s sources to check rules, statistics and references. Portuguese audio, M4A format.",
        links: [
          { kind: "audio", label: "Listen to the podcast (in Portuguese)", href: sources.podcast },
        ],
      },
      {
        meta: "Presentation · visual synthesis",
        title: "AI governance in science",
        description: "Fifteen slides on layered rules, tasks, disclosure and accountability. Caution: its indicators predate the full review of 17 October; use the survey and final dossier for updated figures. PDF in Portuguese.",
        links: [
          { kind: "presentation", label: "View the presentation (PDF, in Portuguese)", href: sources.presentation },
        ],
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

  const trackMaterial = (material: MaterialKind, label: string) =>
    trackEvent("open_featured_material", { event_category: "outbound", event_label: label, material, featured_edition: edition.title, language });

  return <>
    <div className="weekly-highlight-kicker">{!weeklyBadge && <span>{edition.kicker}</span>}{weeklyBadge && <p className="pt-weekly-badge">{language === "en" ? "New edition every Sunday" : "Nova edição todo domingo"}</p>}<span>{edition.period}</span></div>
    <div className="featured-debate-intro" ref={introRef}>
      <div className="featured-debate-copy">
        {!weeklyBadge && <p className="eyebrow">{edition.eyebrow}</p>}
        <Title id="weekly-highlight-title">{edition.title}</Title>
        <p>{edition.lead}</p>
        <div className="featured-quick-links">
          <a href={sources.survey}><TableProperties size={15} /> {language === "pt" ? "Explorar o levantamento" : "Explore the survey"}</a>
          <a href={sources.dossier} target="_blank" rel="noreferrer"><FileText size={15} /> {language === "pt" ? "Ler dossiê (DOCX)" : "Read dossier (Portuguese, DOCX)"}</a>
          <a href={sources.podcast} target="_blank" rel="noreferrer"><Headphones size={15} /> {language === "pt" ? "Ouvir podcast" : "Listen to podcast (in Portuguese)"}</a>
          <a href={sources.presentation} target="_blank" rel="noreferrer"><Presentation size={15} /> {language === "pt" ? "Ver apresentação" : "View presentation (in Portuguese)"}</a>
        </div>
        <small className="featured-material-note">{language === "pt" ? "A apresentação conserva números anteriores à revisão de 17/10. Para os indicadores atualizados, consulte o levantamento e o dossiê final." : "The presentation retains figures from before the 17 October review. Consult the survey and final dossier for updated indicators."}</small>
      </div>
      <figure className="featured-debate-art">
        <picture>
        <source type="image/webp" srcSet={`${assetUrl("covers/politicas-publicacao-cientifica-2026-10-18-640.webp")} 640w, ${assetUrl("covers/politicas-publicacao-cientifica-2026-10-18-1280.webp")} 1280w`} sizes="(max-width: 700px) calc(100vw - 64px), 550px" />
        <img src={assetUrl("covers/politicas-publicacao-cientifica-2026-10-18.png")} alt={edition.imageAlt} width="1672" height="941" decoding="async" />
        </picture>
        <figcaption>{edition.imageCredit}</figcaption>
      </figure>
    </div>
    <details className="featured-reading">
    <summary>{language === "pt" ? "Explorar a análise e as conexões" : "Explore the analysis and connections"}</summary>
    <div className="featured-full-analysis"><p>{edition.first}</p><p>{edition.second}</p></div>
    <div className="featured-debate-list" aria-label={edition.explore}>
      <p className="eyebrow">{edition.explore}</p>
      <div className="featured-debate-grid featured-debate-grid-four">
        {edition.cards.map((item) => <article className="featured-debate-card" key={item.title}>
          <p className="featured-debate-meta">{item.meta}</p>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="featured-debate-links">
            {item.links.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith("#") ? undefined : "_blank"} rel={link.href.startsWith("#") ? undefined : "noreferrer"} onClick={() => trackMaterial(link.kind, `${item.title}: ${link.label}`)}><MaterialIcon kind={link.kind} /> {link.label}</a>)}
          </div>
        </article>)}
      </div>
    </div>
    </details>
  </>;
}
