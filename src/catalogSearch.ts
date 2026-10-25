import type { Article } from "./catalog";

type SearchableArticle = Pick<Article, "title" | "author" | "source" | "theme" | "subtheme" | "summary" | "tags">;

// Ignore linking words, but preserve short domain terms (IA, AI, R1) and
// negations. The same rules apply to both language versions of the catalog.
const linkingWords = new Set([
  "a", "as", "o", "os", "um", "uma", "uns", "umas", "de", "da", "das", "do", "dos",
  "e", "em", "na", "nas", "nos", "ao", "aos", "para", "por", "com",
  "an", "the", "of", "and", "in", "on", "at", "to", "for", "from", "with", "by",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function catalogSearchMatcher(query: string): (article: SearchableArticle) => boolean {
  const words = normalize(query).split(" ").filter(Boolean);
  const meaningfulWords = words.filter((word) => !linkingWords.has(word));
  const terms = [...new Set(meaningfulWords.length ? meaningfulWords : words)];

  return (article) => {
    const haystack = normalize([
      article.title, article.author, article.source, article.theme,
      article.subtheme, article.summary, ...article.tags,
    ].join(" "));
    const words = new Set(haystack.split(" "));
    // Every relevant term must occur, without requiring adjacency or order.
    // Short terms must be whole words: IA must not match the end of "matéria".
    return terms.every((term) => term.length <= 3 ? words.has(term) : haystack.includes(term));
  };
}
