import type { Article, ArticleType } from "./catalog";
import { catalogDate, newestFirst } from "./catalogOrdering";
import { videoThumbnail } from "./catalogExperienceState";

// Navigation is not a filter on the collection: Medium remains searchable and in the Radar.
export const homeCollections: ArticleType[] = ["documento", "link-video", "audio", "entrevista", "paper", "apresentacao"];
export const catalogPageSize = 6;
export function defaultCatalogView(type: string) {
  return type === "link-video" || type === "paper" ? "cards" as const : "list" as const;
}
export function recentDiscovery(articles: Article[]) {
  const recent = [...articles].sort((left, right) => catalogDate(right.includedAt) - catalogDate(left.includedAt) || newestFirst(left, right));
  return {
    videos: recent.filter(article => article.type === "link-video" && videoThumbnail(article.originalUrl)).slice(0, 3),
    papers: recent.filter(article => article.type === "paper").slice(0, 3),
  };
}
