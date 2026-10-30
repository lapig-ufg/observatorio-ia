import { ArrowUpRight, ChevronDown, Clock3, History, Scale, Gift, Terminal, Search } from "lucide-react";
import { useMemo, type MouseEvent } from "react";
import { assetUrl, type Article, type Initiative } from "./catalog";
import { trackEvent } from "./analytics";
import { localizedPortalNavigation, selectRecentAdditions } from "./portalStructure";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { videoThumbnail } from "./catalogExperienceState";
import { PortalSectionCards } from "./PortalSectionCards";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { HomeAdditions } from "./HomeAdditions";
import { PressSummary, type NewsSummary } from "./PressSummary";
import { FeaturedDebate } from "./FeaturedDebate";
import { InitiativeCard } from "./InitiativeCard";

export type FeaturedHistoryItem = { date: string; source: string; title: string; summary: string; links?: { label: string; href: string }[]; href?: string; eventLabel: string };
type Props = { english?: boolean; articles: Article[]; initiatives: Initiative[]; catalog: boolean; error: string; query: string; setQuery: (value: string) => void; setSelectedKeyword: (value: string) => void; setAdded: (value: "" | "7d") => void; revealCatalog: () => void; detailHref: (id: string) => string; openDetail: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; featuredHistory: FeaturedHistoryItem[]; showFeaturedHistory: boolean; setShowFeaturedHistory: (value: boolean | ((value: boolean) => boolean)) => void; newsSummary: NewsSummary | null };

export function PortalHome({ english = false, articles, initiatives, catalog, error, query, setQuery, setSelectedKeyword, setAdded, revealCatalog, detailHref, openDetail, featuredHistory, showFeaturedHistory, setShowFeaturedHistory, newsSummary }: Props) {
  const recentArticles = useMemo(() => selectRecentAdditions(articles, (left, right) => catalogDate(right.includedAt) - catalogDate(left.includedAt) || newestFirst(left, right), article => article.type === "link-video" && !!videoThumbnail(article.originalUrl)), [articles]);
  return (<div className="pt-home-page">
      <section className="pt-home-opening" aria-labelledby="page-title">
        <p className="eyebrow">{english ? "Artificial intelligence in perspective" : "Inteligência artificial em perspectiva"}</p>
        <h1 id="page-title">{english ? "Generative AI explained, compared and followed by UFG" : "IA generativa explicada, comparada e acompanhada pela UFG"}</h1>
        <p>{english ? "A curated collection, model comparisons, news and an interactive lesson for students, researchers and educators." : "Acervo curado, comparação de modelos, notícias e uma aula interativa para quem estuda, pesquisa e ensina."}</p>
        <PortalSectionCards english={english} counts={{ materials: catalog ? articles.length : undefined, news: newsSummary?.total, initiatives: catalog ? initiatives.length : undefined }} />
        <form className="hero-search pt-hero-search" role="search" onSubmit={event => { event.preventDefault(); revealCatalog(); }}>
          <Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor={english ? "hero-search-en" : "hero-search-pt"}>{english ? "Search the collection" : "Buscar no acervo"}</label>
          <input id={english ? "hero-search-en" : "hero-search-pt"} value={query} onChange={event => { setQuery(event.target.value); setSelectedKeyword(""); setAdded(""); }} placeholder={catalog ? (english ? "Search " + articles.length.toLocaleString("en-US") + " items" : "Buscar entre " + articles.length.toLocaleString("pt-BR") + " materiais") : english ? "Search the collection" : "Buscar no acervo"} />
          <button type="submit">{english ? "Search" : "Buscar"}</button>
        </form>
      </section>
      <section id={english ? "highlight" : "em-destaque"} className="pt-home-section weekly-highlight weekly-highlight--debate" aria-labelledby="home-featured-title">
        <HomeSectionHeading id="home-featured-title" eyebrow={english ? "Weekly highlight" : "Destaque semanal"} title={english ? "Weekly highlight" : "Em destaque"} action={<button
          type="button"
          className="text-action pt-featured-history-action"
          aria-expanded={showFeaturedHistory}
          aria-controls="weekly-highlight-history"
          onClick={() => {
            setShowFeaturedHistory((isOpen) => !isOpen);
            trackEvent("toggle_featured_history", { event_category: "navigation", event_label: showFeaturedHistory ? "close" : "open", position: "home" });
          }}
        >
          <Clock3 size={16} aria-hidden="true" />
          <span>{english ? "What has been featured before?" : "O que já foi destaque?"}</span>
          <ChevronDown size={16} className={showFeaturedHistory ? "is-open" : ""} aria-hidden="true" />
        </button>} />
        <FeaturedDebate language={english ? "en" : "pt"} weeklyBadge />
        {showFeaturedHistory && (
          <div id="weekly-highlight-history" className="weekly-highlight-history" aria-label={english ? "Previously featured topics" : "Temas anteriores em destaque"}>
            <p className="eyebrow">{english ? "Previous highlights" : "Destaques anteriores"}</p>
            <div className="weekly-highlight-history-grid">
              {featuredHistory.map((featured) => {
                const links = featured.links ?? [{ label: english ? "Open topic" : "Acessar tema", href: featured.href || "#" }];
                return <article key={featured.eventLabel} className="weekly-highlight-history-item">
                  <p>{featured.date} · {featured.source}</p>
                  <h3>{featured.title}</h3>
                  <span>{featured.summary}</span>
                  <div className="weekly-highlight-history-links">
                    {links.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined} onClick={() => trackEvent("open_featured_history", { event_category: link.href.startsWith("http") ? "outbound" : "navigation", event_label: `${featured.eventLabel}:${link.label}`, position: "home" })}>
                      {link.label} <ArrowUpRight size={15} aria-hidden="true" />
                    </a>)}
                  </div>
                </article>;
              })}
            </div>
          </div>
        )}
      </section>


      <section className="pt-home-section pt-home-panorama" aria-labelledby="home-panorama-title">
        <HomeSectionHeading id="home-panorama-title" eyebrow={english ? "AI Panorama" : "Panorama da IA"} title={english ? "AI Panorama" : "Panorama da IA"} action={<a className="text-action" href="#panorama" onClick={() => trackEvent("nav_panorama", { position: "home" })}>{english ? "Open the Panorama →" : "Abrir o Panorama →"}</a>} />
        <div className="pt-panorama-grid">{localizedPortalNavigation(english)[0].links!.map((link, i) => { const Icon = [History, Scale, Gift, Terminal][i]; return <a key={link.href} href={link.href} onClick={() => trackEvent(link.event, { position: "home", event_label: link.href })}><Icon className="pt-panorama-icon" size={20} aria-hidden="true" /><strong>{link.label}</strong><span>{link.description}</span><span className="pt-panorama-arrow" aria-hidden="true">→</span></a>; })}</div>
      </section>
      <section className="pt-home-section pt-home-recent" aria-labelledby="home-recent-title">
        <HomeSectionHeading id="home-recent-title" eyebrow={english ? "New in the collection" : "Novidades do acervo"} title={english ? "Recently added" : "Adicionados recentemente"} action={<a className="text-action" href={english ? "#catalog" : "#acervo"}>{english ? "View the full collection →" : "Ver todo o acervo →"}</a>} />
        {error ? <p role="alert">{error}</p> : !catalog ? <p role="status">{english ? "Loading collection…" : "Carregando acervo…"}</p> : <HomeAdditions {...recentArticles} english={english} detailHref={detailHref} onOpen={openDetail} />}
      </section>
      <PressSummary summary={newsSummary} english={english} />
      <section id={english ? "interactive-experiences" : "experiencias-interativas"} className="pt-home-section interactive-experience" aria-labelledby="interactive-experience-title">
        <div className="interactive-experience-copy">
          <HomeSectionHeading id="interactive-experience-title" eyebrow={english ? "Interactive classes (in Portuguese)" : "Aulas interativas"} title={english ? "Inside AI" : "Por dentro da IA"} description={english ? "Start with neural networks and continue to Transformers. From a sentence to the next token: see how a model generates responses, with diagrams, step-by-step operations and browser playgrounds. No prerequisites." : "Duas aulas: comece pelas redes neurais e siga para os Transformers, com diagramas, operações passo a passo e playgrounds no navegador. Sem pré-requisitos."} />
          <a className="interactive-experience-action" href={assetUrl("por-dentro-da-ia/")} onClick={() => trackEvent("open_interactive_inference", { event_category: "navigation", event_label: "por-dentro-da-ia", position: "home" })}>{english ? "Open the interactive classes (in Portuguese) " : "Abrir as aulas interativas "}<span aria-hidden="true">→</span></a>
        <details className="interactive-experience-journey"><summary>{english ? "See the learning path" : "Ver o percurso de aprendizagem"}</summary>
          <p>{english ? "Start with a small neural network: build it, run the forward pass, backpropagate the error, update the weights and train it. Then follow a sentence about remote sensing through a Transformer. The second class is a visual introduction to inference, with GPT-3 as a reference, and every playground runs locally in the browser. Return to the Observatory using the header." : "Comece por uma rede neural pequena: construa, faça a passagem direta, retropropague o erro, atualize os pesos e treine. Depois, acompanhe uma frase sobre sensoriamento remoto por um Transformer. A segunda aula é uma introdução visual à inferência, com o GPT-3 como referência, e todos os playgrounds rodam localmente no navegador. Depois, volte ao Observatório pelo cabeçalho."}</p>
          <p className="eyebrow">{english ? "The sentence guiding the journey" : "A frase que guia a jornada"}</p>
          <blockquote>{english ? "Healthy vegetation has high reflectance in the near infrared." : "A vegetação saudável apresenta alta reflectância no infravermelho próximo."}</blockquote>
          <ol aria-label={english ? "Steps in next-token generation" : "Etapas da geração do próximo token"}>
            <li><strong>{english ? "01 · Tokens and embeddings" : "01 · Tokens e embeddings"}</strong><span>{english ? "Text is converted into numerical representations." : "O texto ganha representações numéricas."}</span></li>
            <li><strong>{english ? "02 · Transformer blocks" : "02 · Blocos Transformer"}</strong><span>{english ? "Attention and neural networks transform the representations using context." : "Atenção e redes neurais transformam as representações usando o contexto."}</span></li>
            <li><strong>{english ? "03 · Next token" : "03 · Próximo token"}</strong><span>{english ? "Vocabulary scores become probabilities used to choose the continuation." : "Escores para o vocabulário tornam-se probabilidades para escolher a continuação."}</span></li>
          </ol>
        </details>
        </div>
        <div className="pt-token-illustration" aria-hidden="true"><span className="pt-token-label">{english ? "The sentence becomes tokens" : "A frase vira tokens"}</span><div className="pt-tokens">{(english ? ["UFG", "is", "located", "in"] : ["A", "UFG", "fica", "em"]).map(token => <span key={token}>{token}</span>)}</div><span className="pt-token-arrow">↓</span><span className="pt-token-label">{english ? "Possible next tokens" : "Possíveis próximos tokens"}</span><div className="pt-token-candidates">{[{ token: "Goiânia", probability: 87 }, { token: "Goiás", probability: 9 }, { token: english ? "Brazil" : "Brasil", probability: 3 }].map(candidate => <div key={candidate.token}><span>{candidate.token}</span><span className="pt-token-bar"><i style={{ width: `${candidate.probability}%` }} /></span><strong>{candidate.probability}%</strong></div>)}</div></div>
      </section>

      <section className="pt-home-section pt-home-ufg" aria-labelledby="home-ufg-title">
        <HomeSectionHeading id="home-ufg-title" eyebrow={english ? "University" : "Universidade"} title={english ? "AI at UFG" : "IA na UFG"} action={<a className="text-action" href={english ? "#ufg-ecosystem" : "#ecossistema-ufg"} onClick={() => trackEvent("nav_ecosystem", { position: "home" })}>{english ? "View all →" : "Ver todas →"}</a>} />
        <div className="ecosystem-initiative-grid">{initiatives.slice(0, 3).map(initiative => <InitiativeCard key={initiative.id} initiative={initiative} position="home" english={english} />)}</div>
        <div className="pt-participate"><h3>{english ? "Join in: how do you use AI?" : "Participe: como você usa a IA?"}</h3><p>{english ? "Share your experience with the Observatory." : "Compartilhe sua experiência com o Observatório."}</p><a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer" onClick={() => trackEvent("nav_participate", { event_category: "outbound", event_label: "forms.gle", position: "home" })}>{english ? "Participate →" : "Participar →"}</a></div>
      </section>
      </div>);
}
