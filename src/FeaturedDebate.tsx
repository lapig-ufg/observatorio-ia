import { ArrowUpRight, Headphones, Presentation } from "lucide-react";
import { assetUrl } from "./catalog";

type Language = "pt" | "en";

const sources = {
  coxon: "https://x.com/hilbertspaess/status/2097476196791709843",
  amodei: "https://darioamodei.com/post/we-must-pace-the-frontier",
  suleyman: "https://mustafa-suleyman.ai/a-warning-about-model-welfare",
  novaes: "https://pnovaes.substack.com/p/sem-apocalipse-ou-redencao",
  economy: "https://www.anthropic.com/institute/econ-scenarios",
  pacingSlides: "https://drive.google.com/file/d/1ZnJ49gJ6q0hUOWsQlz8phglzSlA3l1sN/view",
  welfareSlides: "https://drive.google.com/file/d/1VBmKbUWi5cyC8p_ukdzTQaeif-5Xsvpj/view",
  pacingAudio: "https://drive.google.com/file/d/1GOWwH68VD1zbG3q9xfS1Q0HNAmFqSBju/view",
  welfareAudio: "https://drive.google.com/file/d/1-0XguO2UMNarM9re8FX0QsGiSR-wu4No/view",
  novaesAudio: "https://drive.google.com/file/d/1zUzJP39dQBKbFNrFtJtSYtxwpay00T5U/view",
  economyAudio: "https://drive.google.com/file/d/15FnNCNZiOPjDlhyGRyh8YPRXNIwtBI0P/view",
};

const editions = {
  pt: {
    kicker: "Em destaque...",
    period: "Leituras e escutas · setembro de 2026",
    eyebrow: "Segurança, sociedade e economia",
    title: "IA entre o alarme e a evidência",
    first: "Em setembro, a saída de Jacob Coxon da Anthropic reacendeu o debate sobre os riscos da corrida por IA. Dario Amodei propôs moderar seu ritmo; Mustafa Suleyman alertou para a humanização dos modelos; Pedro Novaes recusou tanto o apocalipse quanto a redenção tecnológica. Entre esses extremos, o que podemos afirmar sobre segurança e trabalho?",
    second: "Um estudo da Anthropic oferece cenários, não previsões. No mais extremo e hipotético, em 2030, o PIB dos EUA seria 32,4% acima da trajetória sem IA, mas o desemprego chegaria a 11,9% e a participação do trabalho na renda cairia de 60% para 45,2%.",
    imageAlt: "Charge de Laerte: uma pessoa diz que a IA pode extinguir a humanidade; três robôs reagem com horror, dúvida e uma pergunta sobre quem deu a ordem.",
    imageCredit: "Charge: Laerte · Folha de S.Paulo",
    explore: "Leia e escute",
    sourceAction: "Ler texto",
    slidesAction: "Ver slides",
    audioAction: "Ouvir análise",
    cards: [
      { date: "12 set", source: "Dario Amodei", title: "We Must Pace the Frontier", description: "Uma proposta de desaceleração verificável, avaliação externa e coordenação para enfrentar riscos da IA de fronteira.", href: sources.amodei, slides: sources.pacingSlides, audios: [sources.pacingAudio] },
      { date: "16 set", source: "Mustafa Suleyman", title: "A warning about ‘model welfare’", description: "Uma crítica à atribuição de consciência e status moral a modelos atuais e ao efeito disso sobre segurança e controle humano.", href: sources.suleyman, slides: sources.welfareSlides, audios: [sources.welfareAudio] },
      { date: "15 set", source: "Pedro Novaes", title: "Sem apocalipse ou redenção", description: "Um convite a examinar as escolhas humanas por trás das narrativas de salvação ou danação tecnológica.", href: sources.novaes, audios: [sources.novaesAudio] },
      { date: "set 2026", source: "Anthropic Institute", title: "What will our economic future look like?", description: "Três cenários condicionais para discutir crescimento, emprego e distribuição dos ganhos da IA nos Estados Unidos.", href: sources.economy, audios: [sources.economyAudio] },
    ],
  },
  en: {
    kicker: "Featured",
    period: "Reading and listening · September 2026",
    eyebrow: "Safety, society and the economy",
    title: "AI between alarm and evidence",
    first: "In September, Jacob Coxon's departure from Anthropic renewed the debate over the risks of the AI race. Dario Amodei proposed pacing its advance; Mustafa Suleyman warned against humanizing AI models; Pedro Novaes rejected both technological doom and salvation. Between these extremes, what can we say about safety and work?",
    second: "An Anthropic study offers scenarios, not forecasts. In its most extreme hypothetical case, by 2030 US GDP would be 32.4% above the path without AI, but unemployment would reach 11.9% and labor's income share would fall from 60% to 45.2%.",
    imageAlt: "Cartoon by Laerte: a person warns that AI could extinguish humanity; three robots react with alarm, disbelief and a question about who gave the order. The cartoon's dialogue is in Portuguese.",
    imageCredit: "Cartoon: Laerte · Folha de S.Paulo (Portuguese)",
    explore: "Read and listen",
    sourceAction: "Read original",
    slidesAction: "View slides",
    audioAction: "Listen to analysis (PT)",
    cards: [
      { date: "12 Sep", source: "Dario Amodei", title: "We Must Pace the Frontier", description: "A proposal for verifiable pacing, external evaluation and coordination around frontier AI risks.", href: sources.amodei, slides: sources.pacingSlides, audios: [sources.pacingAudio] },
      { date: "16 Sep", source: "Mustafa Suleyman", title: "A warning about ‘model welfare’", description: "A critique of assigning consciousness or moral standing to current models, and the implications for safety and human control.", href: sources.suleyman, slides: sources.welfareSlides, audios: [sources.welfareAudio] },
      { date: "15 Sep", source: "Pedro Novaes", title: "Sem apocalipse ou redenção", description: "A Portuguese essay on the human choices obscured by narratives of technological salvation or doom.", href: sources.novaes, audios: [sources.novaesAudio] },
      { date: "Sep 2026", source: "Anthropic Institute", title: "What will our economic future look like?", description: "Three conditional scenarios for discussing growth, jobs and the distribution of AI's gains in the US.", href: sources.economy, audios: [sources.economyAudio] },
    ],
  },
} as const;

export function FeaturedDebate({ language }: { language: Language }) {
  const edition = editions[language];
  return <>
    <div className="weekly-highlight-kicker"><span>{edition.kicker}</span><span>{edition.period}</span></div>
    <div className="featured-debate-intro">
      <div className="featured-debate-copy">
        <p className="eyebrow">{edition.eyebrow}</p>
        <h2 id="weekly-highlight-title">{edition.title}</h2>
        <p>{edition.first.split("Jacob Coxon")[0]}<a href={sources.coxon} target="_blank" rel="noreferrer">Jacob Coxon</a>{edition.first.split("Jacob Coxon")[1]}</p>
        <p>{edition.second}</p>
      </div>
      <figure className="featured-debate-art">
        <img src={assetUrl("covers/laerte-charge-ia-risco-2026-09.jpg")} alt={edition.imageAlt} width="1024" height="683" />
        <figcaption>{edition.imageCredit}</figcaption>
      </figure>
    </div>
    <div className="featured-debate-list" aria-label={edition.explore}>
      <p className="eyebrow">{edition.explore}</p>
      <div className="featured-debate-grid">
        {edition.cards.map((item) => <article className="featured-debate-card" key={item.href}>
          <p className="featured-debate-meta">{item.date} · {item.source}</p>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="featured-debate-links">
            <a href={item.href} target="_blank" rel="noreferrer">{edition.sourceAction} <ArrowUpRight size={15} aria-hidden="true" /></a>
            {"slides" in item && item.slides && <a href={item.slides} target="_blank" rel="noreferrer"><Presentation size={15} aria-hidden="true" /> {edition.slidesAction}</a>}
            {item.audios.map((audio) => <a key={audio} href={audio} target="_blank" rel="noreferrer"><Headphones size={15} aria-hidden="true" /> {edition.audioAction}</a>)}
          </div>
        </article>)}
      </div>
    </div>
  </>;
}
