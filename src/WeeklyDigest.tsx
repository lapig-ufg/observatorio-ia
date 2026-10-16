import { useEffect, useState } from "react";
import { assetUrl } from "./catalog";
import { formatPublicDate } from "./dateLabels";

type Bilingual = { pt: string; en: string };
type Reference = { id: string; title: string; url: string; date: string };
export type Digest = {
  start: string; end: string; reviewedAt: string; corpus: Reference[];
  title: Bilingual; summary: Bilingual; method: Bilingual;
  topics: { title: Bilingual; summary: Bilingual; sourceIds: string[] }[];
};

export function WeeklyDigest({ collection, english = false }: { collection: "medium" | "folha"; english?: boolean }) {
  const [digest, setDigest] = useState<Digest | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(assetUrl(`editorial/${collection}-weekly.json`), { signal: controller.signal, cache: "no-cache" })
      .then(response => response.ok ? response.json() : null).then(setDigest).catch(() => {});
    return () => controller.abort();
  }, [collection]);
  if (!digest) return null;
  const lang = english ? "en" : "pt";
  const date = (value: string) => formatPublicDate(value, lang);
  const sourceById = new Map(digest.corpus.map(source => [source.id, source]));
  return <section className="weekly-digest" aria-labelledby={`${collection}-digest-title`}>
    <div className="digest-heading"><p className="eyebrow">{english ? "Weekly briefing · latest published edition" : "Síntese da semana · última edição publicada"}</p><span>{date(digest.start)} – {date(digest.end)}</span></div>
    <h2 id={`${collection}-digest-title`}>{digest.title[lang]}</h2>
    <p className="digest-overview">{digest.summary[lang]}</p>
    <details className="digest-topics"><summary>{english ? `Explore ${digest.topics.length} topic summaries` : `Explorar as ${digest.topics.length} sínteses por assunto`}</summary>
      <div>{digest.topics.map((topic, index) => <article key={index}><h3>{topic.title[lang]}</h3><p>{topic.summary[lang]}</p><ul className="digest-links">{topic.sourceIds.map(id => sourceById.get(id)).filter((source): source is Reference => Boolean(source)).map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" lang={collection === "folha" ? "pt-BR" : undefined}>{source.title} <span aria-hidden="true">↗</span></a></li>)}</ul></article>)}</div>
    </details>
    <details className="digest-method"><summary>{english ? `Sources and scope · ${digest.corpus.length} texts` : `Fontes e recorte · ${digest.corpus.length} textos`}</summary><p>{digest.method[lang]}</p><p>{english ? "Editorial review:" : "Revisão editorial:"} {date(digest.reviewedAt)}</p><ul className="digest-links">{digest.corpus.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> <time dateTime={source.date}>({date(source.date)})</time></li>)}</ul></details>
  </section>;
}
