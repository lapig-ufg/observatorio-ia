import { useEffect, useRef } from "react";
import { ArrowUpRight, FileText, Headphones, Presentation, TableProperties } from "lucide-react";
import { trackEvent } from "./analytics";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";
type MaterialKind = "audio" | "presentation" | "document" | "survey";

const sources = {
  "original": "https://drive.google.com/file/d/185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws/view",
  "officialPT": "https://www.vatican.va/content/leo-xiv/pt/encyclicals/documents/20260515-magnifica-humanitas.html",
  "officialEN": "https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html",
  "podcast": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view",
  "presentation": "https://drive.google.com/file/d/1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt/view"
};

const editions = {
  "pt": {
    "startsOn": "2026-10-24",
    "kicker": "Em destaque...",
    "period": "25 a 31 out 2026 · encíclica, podcast e apresentação",
    "eyebrow": "Dignidade humana, discernimento e bem comum",
    "title": "Magnifica Humanitas: a dignidade humana na era da IA",
    "lead": "Em Magnifica Humanitas, Leão XIV desloca o debate do simples apoio ou rejeição à tecnologia para o discernimento sobre quem ela serve. A encíclica reconhece a contribuição da IA ao cuidado, à educação e ao desenvolvimento humano, enquanto exige que seu uso preserve a dignidade da pessoa, a responsabilidade e o bem comum. O acesso desigual a esses recursos e o risco de ampliar desigualdades tornam essa responsabilidade ainda mais urgente.",
    "first": "O ponto de partida é a Doutrina Social da Igreja e sua compreensão cristã da pessoa. As imagens de Babel e da reconstrução de Jerusalém contrapõem a concentração de poder à cooperação e à responsabilidade partilhada (§§7–10). A técnica pode beneficiar a humanidade, mas suas escolhas não são neutras: incorporam valores, interesses e parâmetros culturais de quem a desenvolve, financia, regula e utiliza (§§9 e 100–104). Por isso, a dignidade humana não pode ser reduzida a dados, produtividade ou capacidade de otimização. Transparência, prestação de contas, participação e regras adequadas devem orientar o desenvolvimento e o uso da IA (§§105–111). Isso inclui ampliar o acesso às tecnologias e à formação, evitando que dados e capacidade computacional reforcem privilégios já concentrados (§§108–109).",
    "second": "Esse discernimento alcança a verdade pública, a educação, o trabalho e as formas de exploração (§§132–177). O alerta sobre perda de empregos é contextual e condicionado; não constitui uma previsão quantitativa inevitável (§§151–156). No campo militar, o texto rejeita confiar a sistemas artificiais decisões letais ou irreversíveis e exige responsabilidade identificável, rastreabilidade e controle humano efetivo, consciente e responsável (§§197–200). É uma orientação ética, teológica e social: a tecnologia deve servir à vida, à dignidade e à convivência humana. A encíclica é a fonte primária; podcast e apresentação são materiais complementares de leitura e discussão.",
    "imageAlt": "Uma pequena mesa com livros, computadores e servidores atrás de um portão, separada por um abismo de um grupo diverso com livros e carteiras escolares; pontes incompletas e o livro Magnifica Humanitas simbolizam o desafio do acesso equitativo à IA.",
    "imageCredit": "Ilustração editorial: Observatório UFG-IA · gerada com IA; metáfora do acesso desigual, sem representação quantitativa",
    "explore": "Três caminhos para explorar o tema",
    "note": "Encíclica original da Santa Sé · podcast e apresentação em português.",
    "sourceLabel": "Conferir os parágrafos na fonte oficial da Santa Sé",
    "quick": [
      {
        "kind": "document",
        "label": "Ler encíclica (PDF)",
        "href": "https://drive.google.com/file/d/185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws/view"
      },
      {
        "kind": "audio",
        "label": "Ouvir podcast",
        "href": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view"
      },
      {
        "kind": "presentation",
        "label": "Ver apresentação",
        "href": "https://drive.google.com/file/d/1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt/view"
      }
    ],
    "cards": [
      {
        "meta": "Fonte primária · Leão XIV · 15 de maio de 2026",
        "title": "Carta Encíclica Magnifica Humanitas",
        "description": "Texto integral sobre a salvaguarda da pessoa humana na era da inteligência artificial. Assinada em 15 de maio de 2026. PDF preservado em Documentos gerais e acesso ao texto oficial da Santa Sé.",
        "links": [
          {
            "kind": "document",
            "label": "Ler encíclica original (PDF)",
            "href": "https://drive.google.com/file/d/185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws/view"
          },
          {
            "kind": "document",
            "label": "Ler na Santa Sé",
            "href": "https://www.vatican.va/content/leo-xiv/pt/encyclicals/documents/20260515-magnifica-humanitas.html"
          }
        ]
      },
      {
        "meta": "Podcast · material complementar · português",
        "title": "A crítica do Papa à inteligência artificial",
        "description": "Áudio indicado pelo editor para acompanhar a leitura da encíclica. Uma entrada complementar para o debate; para conferir a formulação e o contexto das afirmações, consulte o texto original. Formato M4A.",
        "links": [
          {
            "kind": "audio",
            "label": "Ouvir o podcast",
            "href": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view"
          }
        ]
      },
      {
        "meta": "Apresentação · síntese visual · português",
        "title": "Magnifica Humanitas",
        "description": "Quinze lâminas sobre dignidade, humanismo cristão, governança, justiça social e responsabilidade. Síntese visual baseada na encíclica, com marca Gemini Notebook, para estudo e discussão. PDF em português.",
        "links": [
          {
            "kind": "presentation",
            "label": "Ver apresentação (PDF)",
            "href": "https://drive.google.com/file/d/1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt/view"
          }
        ]
      }
    ]
  },
  "en": {
    "kicker": "Featured",
    "period": "Oct 25, 2026 – Oct 31, 2026 · encyclical, podcast and presentation",
    "eyebrow": "Human dignity, discernment and the common good",
    "title": "Magnifica Humanitas: human dignity in the age of AI",
    "lead": "In Magnifica Humanitas, Leo XIV shifts the debate from simply accepting or rejecting technology to discerning whom it serves. The encyclical recognizes AI’s contribution to care, education and human development, while insisting that its use safeguard personal dignity, responsibility and the common good. Unequal access to these resources and the risk of widening inequality make that responsibility more urgent.",
    "first": "The starting point is Catholic social teaching and its Christian understanding of the human person. The images of Babel and the rebuilding of Jerusalem contrast concentrated power with cooperation and shared responsibility (§§7–10). Technology can benefit humanity, but its choices are not neutral: they embody the values, interests and cultural assumptions of those who develop, finance, regulate and use it (§§9 and 100–104). Human dignity therefore cannot be reduced to data, productivity or optimization. Transparency, accountability, participation and appropriate rules should guide AI’s development and use (§§105–111). This includes widening access to technology and education, rather than allowing concentrated data and computing capacity to reinforce existing privilege (§§108–109).",
    "second": "This discernment encompasses public truth, education, work and exploitation (§§132–177). The warning about job losses is contextual and conditional, rather than an inevitable quantitative forecast (§§151–156). In warfare, the text rejects entrusting lethal or irreversible decisions to artificial systems and requires identifiable responsibility, traceability and effective, conscious and responsible human control (§§197–200). Its guidance is ethical, theological and social: technology should serve life, dignity and human coexistence. The encyclical is the primary source; the podcast and presentation are companion materials for reading and discussion.",
    "imageAlt": "A small table with books, computers and servers behind a gate, separated by a chasm from a diverse group with books and school desks; incomplete bridges and the book Magnifica Humanitas symbolize the challenge of equitable access to AI.",
    "imageCredit": "Editorial illustration: UFG-AI Observatory · AI-generated metaphor of unequal access, not a quantitative representation",
    "explore": "Three ways to explore the topic",
    "note": "Official encyclical available in English · companion audio and slides in Portuguese.",
    "sourceLabel": "Check the paragraphs in the Holy See’s official text",
    "quick": [
      {
        "kind": "document",
        "label": "Read encyclical (English)",
        "href": "https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html"
      },
      {
        "kind": "audio",
        "label": "Listen to podcast (Portuguese)",
        "href": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view"
      },
      {
        "kind": "presentation",
        "label": "View presentation (Portuguese)",
        "href": "https://drive.google.com/file/d/1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt/view"
      }
    ],
    "cards": [
      {
        "meta": "Primary source · Leo XIV · 15 May 2026",
        "title": "Encyclical Letter Magnifica Humanitas",
        "description": "The complete text on safeguarding the human person in the time of artificial intelligence, signed on 15 May 2026. Read the Holy See’s official English text or the preserved Portuguese PDF.",
        "links": [
          {
            "kind": "document",
            "label": "Read official English text",
            "href": "https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html"
          },
          {
            "kind": "document",
            "label": "Open original PDF (Portuguese)",
            "href": "https://drive.google.com/file/d/185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws/view"
          }
        ]
      },
      {
        "meta": "Podcast · companion material · Portuguese",
        "title": "The Pope’s critique of artificial intelligence",
        "description": "Audio selected by the editor to accompany the encyclical. A companion introduction to the discussion; consult the original document to check the wording and context of its claims. M4A format, in Portuguese.",
        "links": [
          {
            "kind": "audio",
            "label": "Listen to the podcast (Portuguese)",
            "href": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view"
          }
        ]
      },
      {
        "meta": "Presentation · visual synthesis · Portuguese",
        "title": "Magnifica Humanitas",
        "description": "Fifteen slides on dignity, Christian humanism, governance, social justice and responsibility. A visual synthesis based on the encyclical, bearing the Gemini Notebook mark, for study and discussion. Portuguese PDF.",
        "links": [
          {
            "kind": "presentation",
            "label": "View presentation (Portuguese PDF)",
            "href": "https://drive.google.com/file/d/1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt/view"
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
        <source type="image/webp" srcSet={`${assetUrl("covers/magnifica-humanitas-desigualdade-2026-10-25-640.webp")} 640w, ${assetUrl("covers/magnifica-humanitas-desigualdade-2026-10-25-1280.webp")} 1280w`} sizes="(max-width: 700px) calc(100vw - 64px), 550px" />
        <img src={assetUrl("covers/magnifica-humanitas-desigualdade-2026-10-25.png")} alt={edition.imageAlt} width="1672" height="941" decoding="async" />
        </picture>
        <figcaption>{edition.imageCredit}</figcaption>
      </figure>
    </div>
    <details className="featured-reading">
    <summary>{language === "pt" ? "Explorar a análise e as conexões" : "Explore the analysis and connections"}</summary>
    <div className="featured-full-analysis"><p>{edition.first}</p><p>{edition.second}</p><p><a href={language === "pt" ? sources.officialPT : sources.officialEN} target="_blank" rel="noreferrer">{edition.sourceLabel} <ArrowUpRight size={14} aria-hidden="true" /></a></p></div>
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
