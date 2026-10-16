import { useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Article } from "./catalog";
import { CatalogFormatIcon } from "./CatalogExperience";
import { videoThumbnail } from "./catalogExperienceState";
import { formatPublicDate } from "./dateLabels";
import { trackEvent } from "./analytics";

type Props = { featured?: Article; items: Article[]; detailHref: (id: string) => string; onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void };

function AdditionMeta({ article }: { article: Article }) {
  return <span className="pt-addition-meta">{article.source} · <time dateTime={article.includedAt}>{formatPublicDate(article.includedAt)}</time></span>;
}

export function HomeAdditions({ featured, items, detailHref, onOpen }: Props) {
  const [failedUrl, setFailedUrl] = useState("");
  if (!featured) return null;
  const thumbnail = featured.type === "link-video" ? videoThumbnail(featured.originalUrl) : "";
  const video = !!thumbnail;
  const openItem = (event: MouseEvent<HTMLAnchorElement>, article: Article) => {
    trackEvent("open_article", { event_category: "article", event_label: article.id, article_type: article.type, position: "home-recent" });
    onOpen(event, article.id);
  };
  return <div className="pt-additions-layout">
    <article className="pt-addition-feature">
      <a id={`home-feature-cover-${featured.id}`} className="pt-addition-cover" href={detailHref(featured.id)} onClick={event => openItem(event, featured)} aria-label={`Abrir ficha: ${featured.title}`}>
        {thumbnail && failedUrl !== thumbnail ? <img src={thumbnail} alt="" loading="lazy" decoding="async" width="640" height="360" onError={() => setFailedUrl(thumbnail)} /> : <CatalogFormatIcon type={featured.type} size={44} />}
      </a>
      <div className="pt-addition-copy"><h3><a id={`home-feature-title-${featured.id}`} href={detailHref(featured.id)} onClick={event => openItem(event, featured)}>{featured.title}</a></h3>
        <AdditionMeta article={featured} />
        {video ? <a className="pt-addition-action" href={featured.originalUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_article", { event_category: "article", event_label: featured.id, article_type: featured.type, position: "home-recent" })}>Assistir <ArrowUpRight size={16} aria-hidden="true" /></a> : <a id={`home-feature-action-${featured.id}`} className="pt-addition-action" href={detailHref(featured.id)} onClick={event => openItem(event, featured)}>Abrir ficha →</a>}
      </div>
    </article>
    <ul className="pt-additions-list">{items.map(article => <li key={article.id}>
      <a id={`home-recent-${article.id}`} href={detailHref(article.id)} onClick={event => openItem(event, article)}><CatalogFormatIcon type={article.type} /><div><h3>{article.title}</h3><AdditionMeta article={article} /></div><span aria-hidden="true">→</span></a>
    </li>)}</ul>
  </div>;
}
