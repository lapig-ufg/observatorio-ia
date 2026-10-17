import { formatPublicDate } from "./dateLabels";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Headphones, Presentation } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "video";

const sources = {
  podcast: "https://drive.google.com/file/d/1L1ChcDaz6ves1ddobAzVgPyBmYIgwi7x/view",
  presentation: "https://drive.google.com/file/d/1BwCAoazLO6euEso_W63046oPTuTFsIc9/view",
  video: "https://www.youtube.com/watch?v=HIUzrxQxTtw",
};

const editions = {
  pt: {
    kicker: "Em destaque...",
    period: "11 a 17 out 2026 · um podcast, uma apresentação e um vídeo",
    eyebrow: "Proveniência, detecção estatística e limites técnicos",
    title: "Assinaturas invisíveis: até onde resistem as marcas d’água da IA?",
    lead: "Foi-se o tempo em que aparência ou estilo bastavam para reconhecer conteúdo sintético. À medida que textos, imagens, áudios e vídeos se tornam mais convincentes, marcas d’água digitais tentam registrar sua origem — mas sua presença não é necessariamente definitiva.",
    first: "As marcas d’água contemporâneas não são um carimbo visível. Elas inserem sinais discretos na escolha de tokens, nos pixels, no áudio ou em outras estruturas geradas. Podem apoiar a proveniência, a atribuição e a segurança, além de ajudar a identificar dados sintéticos antes que retornem inadvertidamente ao treinamento de novos modelos. A mesma lógica já é investigada em sequências de aminoácidos produzidas por IA generativa.",
    second: "O limite é decisivo: detecção não equivale a prova absoluta de autoria. Paráfrase, reescrita, recorte, compressão, ruído, baixa entropia ou alteração do amostrador podem enfraquecer ou remover o sinal; textos curtos também oferecem pouca evidência estatística. O podcast, a apresentação e o vídeo desta semana mostram por que a marca d’água deve ser tratada como uma camada de proveniência — útil, mas combinada a metadados, assinatura criptográfica e governança.",
    imageAlt: "Ilustração editorial de duas folhas translúcidas vistas contra a luz: a primeira contém uma grande marca d’água em forma de gota, com padrões de texto, imagem, áudio e proteína; na segunda, a marca aparece parcialmente fragmentada.",
    imageCredit: "Ilustração conceitual: Observatório UFG-IA · gerada com IA",
    explore: "Explore os três materiais",
    cards: [
      {
        meta: "Podcast · análise crítica",
        title: "Por que as marcas d’água falham?",
        description: "Uma análise dos limites das assinaturas invisíveis, sobretudo em textos: reescrita, paráfrase e outras transformações podem degradar o sinal e tornar a detecção inconclusiva.",
        links: [
          { kind: "audio", label: "Ouvir o podcast", href: sources.podcast },
        ],
      },
      {
        meta: "Apresentação · fundamentos e métodos",
        title: "Como a assinatura entra nos tokens",
        description: "A apresentação explica greenlists, viés de amostragem, escore z, valor-p e o papel da entropia, além de falsos positivos, robustez e ataques de reescrita.",
        links: [
          { kind: "presentation", label: "Ver LLM Watermark", href: sources.presentation },
        ],
      },
      {
        meta: "Google DeepMind · vídeo",
        title: "De deepfakes ao DNA",
        description: "Hannah Fry, Pushmeet Kohli e Jeremy Ratcliffe mostram como o SynthID marca texto, imagem, áudio e vídeo — e como a ideia se estende a sequências biológicas, conectando proveniência e biossegurança.",
        links: [
          { kind: "video", label: "Assistir ao vídeo", href: sources.video },
        ],
      },
    ],
  },
  en: {
    kicker: "Featured",
    period: formatPublicDate("2026-10-11", "en") + " – " + formatPublicDate("2026-10-17", "en") + " · one podcast, one presentation and one video",
    eyebrow: "Provenance, statistical detection and technical limits",
    title: "Invisible signatures: how well do AI watermarks survive?",
    lead: "The time when appearance or style alone could reveal synthetic content is over. As text, images, audio and video become more convincing, digital watermarks seek to record their origin — but their presence is not necessarily permanent.",
    first: "Contemporary watermarks are not visible stamps. They place subtle signals in token selection, pixels, audio or other generated structures. They can support provenance, attribution and safety, and help identify synthetic data before it inadvertently returns to the training sets of new models. The same logic is already being investigated in amino-acid sequences produced by generative AI.",
    second: "The limitation is crucial: detection is not absolute proof of authorship. Paraphrasing, rewriting, cropping, compression, noise, low entropy or changes to the sampler can weaken or remove the signal; short texts also provide little statistical evidence. This week’s podcast, presentation and video show why a watermark is best understood as one provenance layer — useful, but combined with metadata, cryptographic signatures and governance.",
    imageAlt: "Editorial illustration of two translucent sheets held against the light: the first contains a large droplet-shaped watermark with text, image, audio and protein motifs; on the second, the watermark is partially fragmented.",
    imageCredit: "Conceptual illustration: UFG-AI Observatory · AI-generated",
    explore: "Explore the three materials",
    cards: [
      {
        meta: "Podcast · critical analysis",
        title: "Why do AI watermarks fail?",
        description: "An analysis of the limits of invisible signatures, especially in text: rewriting, paraphrasing and other transformations can degrade the signal and make detection inconclusive.",
        links: [
          { kind: "audio", label: "Listen to the podcast (in Portuguese)", href: sources.podcast },
        ],
      },
      {
        meta: "Presentation · foundations and methods",
        title: "How the signature enters the tokens",
        description: "The presentation explains greenlists, sampling bias, z-scores, p-values and the role of entropy, along with false positives, robustness and rewriting attacks.",
        links: [
          { kind: "presentation", label: "View LLM Watermark (in Portuguese)", href: sources.presentation },
        ],
      },
      {
        meta: "Google DeepMind · video",
        title: "From deepfakes to DNA",
        description: "Hannah Fry, Pushmeet Kohli and Jeremy Ratcliffe show how SynthID marks text, images, audio and video — and how the idea extends to biological sequences, linking provenance and biosecurity.",
        links: [
          { kind: "video", label: "Watch the video", href: sources.video },
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
          <a href={sources.podcast} target="_blank" rel="noreferrer"><Headphones size={15} /> {language === "pt" ? "Ouvir podcast" : "Listen to podcast (in Portuguese)"}</a>
          <a href={sources.presentation} target="_blank" rel="noreferrer"><Presentation size={15} /> {language === "pt" ? "Ver apresentação" : "View presentation (in Portuguese)"}</a>
          <a href={sources.video} target="_blank" rel="noreferrer">{language === "pt" ? "Assistir ao vídeo" : "Watch the video"} <ArrowUpRight size={15} /></a>
        </div>
      </div>
      <figure className="featured-debate-art">
        <picture>
        <source type="image/webp" srcSet={`${assetUrl("covers/watermarking-proveniencia-2026-10-11-640.webp")} 640w, ${assetUrl("covers/watermarking-proveniencia-2026-10-11-1280.webp")} 1280w`} sizes="(max-width: 700px) calc(100vw - 64px), 550px" />
        <img src={assetUrl("covers/watermarking-proveniencia-2026-10-11.png")} alt={edition.imageAlt} width="1672" height="941" decoding="async" />
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
            {item.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => trackMaterial(link.kind, `${item.title}: ${link.label}`)}><MaterialIcon kind={link.kind} /> {link.label}</a>)}
          </div>
        </article>)}
      </div>
    </div>
    </details>
  </>;
}
