import { cloudTermKey, cloudTerms, matchesCloudTerm, type KeywordCloudArticle } from "./keywordCloud";

// Preserve the source-language selection by stable article IDs. Do not assume
// keyword order or infer a translation from coincidental co-occurrence.
export function keywordSelectionIds(articles: KeywordCloudArticle[], term: string) {
  if (!term) return new Set<string>();
  return new Set(articles.filter(article => matchesCloudTerm(article, term)).map(article => article.id));
}

export function keywordSelectionLabel(articles: KeywordCloudArticle[], term: string, sourceLocale: "pt" | "en", locale: "pt" | "en") {
  if (!term) return "";
  const key = cloudTermKey(term);
  for (const article of articles) {
    const label = cloudTerms(article).get(key);
    if (label) return label;
  }
  // An unlisted equivalence is not invented; the exact selection still works.
  return sourceLocale === locale ? term : `${term} (${sourceLocale.toUpperCase()})`;
}
