import type { Article, ArticleType } from "./catalog";

const preferredThemes = [
  "Fundamentos, matemática e deep learning",
  "Transformers e atenção",
  "LLMs e IA generativa",
  "Agentes, RAG e aplicações",
  "Bases vetoriais e conhecimento",
  "Modelos, mercado e indústria",
  "Aprendizado, pesquisa e produtividade",
];

export function collectionThemes(articles: Article[], type: ArticleType) {
  const counts = new Map<string, number>();

  articles.forEach((article) => {
    if (article.type !== type) return;
    const theme = article.theme.trim();
    if (!theme) return;
    counts.set(theme, (counts.get(theme) || 0) + 1);
  });

  const preferred = preferredThemes.filter((theme) => counts.has(theme));
  const additional = Array.from(counts.keys())
    .filter((theme) => !preferredThemes.includes(theme))
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  return [...preferred, ...additional].map((theme) => ({
    theme,
    count: counts.get(theme) || 0,
  }));
}
