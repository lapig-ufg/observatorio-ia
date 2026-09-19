const technicalReferencePatterns = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bdoi\.org\b/i,
  /\b10\.\d{4,9}\/[\w./;()_-]+/i,
  /\b(?:doi|arxiv|pmid|pmc|isbn|issn)\s*:\s*\S+/i,
];

const nonThematicEntityPatterns = [
  /^(?:lapig(?:\s+ufg)?|ufg|universidade federal de goias)$/i,
  /^(?:anthropic|openai|google|microsoft|meta|nvidia|deepmind|moonshot)$/i,
  /^(?:chatgpt|claude|gemini|notebooklm|copilot|grok)$/i,
  /^kimi(?:\s+k?\d+)?$/i,
];

export type KeywordCloudArticle = {
  id: string;
  tags: string[];
};

export type KeywordCloudEntry = {
  key: string;
  label: string;
  count: number;
  recentCount: number;
  score: number;
};

// Equivalências editoriais deliberadas. Não há lematização automática: ela
// criaria aproximações semânticas indevidas em um acervo multidisciplinar.
const cloudTermAliases: Record<string, string> = {
  "agents, racs, and applications": "agents, rag and applications",
  agente: "agentes",
  agentes: "agentes",
  "agente de ia": "agentes",
  "agentes de ia": "agentes",
  ferramenta: "ferramentas",
  ferramentas: "ferramentas",
  "ferramenta de ia": "ferramentas",
  "ferramentas de ia": "ferramentas",
  "large language model": "llms",
  "large language models": "llms",
  llm: "llms",
  llms: "llms",
  "modelo de linguagem": "llms",
  "modelos de linguagem": "llms",
  modelo: "modelos",
  modelos: "modelos",
  "modelo de ia": "modelos",
  "modelos de ia": "modelos",
  "rede neural": "redes neurais",
  "redes neurais": "redes neurais",
  sistema: "sistemas",
  sistemas: "sistemas",
  transformer: "transformers",
  transformers: "transformers",
  vetor: "vetores",
  vetores: "vetores",
  embedding: "embeddings",
  embeddings: "embeddings",
};

const cloudTermLabels: Record<string, string> = {
  "agents, rag and applications": "Agents, RAG and applications",
  agentes: "Agentes",
  ferramentas: "Ferramentas",
  llms: "LLMs",
  modelos: "Modelos",
  "redes neurais": "Redes neurais",
  sistemas: "Sistemas",
  transformers: "Transformers",
  vetores: "Vetores",
};

const cloudExcludedTerms = new Set(["ia", "inteligencia artificial", "artificial intelligence"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * O Radar representa conceitos editoriais. Endereços, identificadores
 * bibliográficos, instituições, empresas e produtos continuam disponíveis nos
 * metadados do item, mas não são temas.
 */
export function isEditorialCloudTerm(value: string) {
  const term = value.trim();
  return Boolean(term)
    && !technicalReferencePatterns.some((pattern) => pattern.test(term))
    && !nonThematicEntityPatterns.some((pattern) => pattern.test(term));
}

export function cloudTermKey(value: string) {
  const key = normalize(value.trim());
  return cloudTermAliases[key] || key;
}

export function cloudTerms(article: KeywordCloudArticle) {
  const terms = new Map<string, string>();
  article.tags.forEach((tag) => {
    if (!isEditorialCloudTerm(tag)) return;
    const key = cloudTermKey(tag);
    if (key && !cloudExcludedTerms.has(key)) terms.set(key, cloudTermLabels[key] || tag.trim());
  });
  return terms;
}

export function matchesCloudTerm(article: KeywordCloudArticle, term: string) {
  return cloudTerms(article).has(cloudTermKey(term));
}

export function buildKeywordCloud(
  articles: KeywordCloudArticle[],
  recentIds: Set<string>,
  maxWords = 18,
  historicalWeight = 0.06,
): KeywordCloudEntry[] {
  const keywords = new Map<string, { label: string; itemIds: Set<string>; recentItemIds: Set<string> }>();

  articles.forEach((article) => cloudTerms(article).forEach((label, key) => {
    const keyword = keywords.get(key);
    if (keyword) {
      keyword.itemIds.add(article.id);
      if (recentIds.has(article.id)) keyword.recentItemIds.add(article.id);
    } else {
      keywords.set(key, {
        label,
        itemIds: new Set([article.id]),
        recentItemIds: recentIds.has(article.id) ? new Set([article.id]) : new Set(),
      });
    }
  }));

  return Array.from(keywords.entries())
    .map(([key, keyword]) => ({
      key,
      label: keyword.label,
      count: keyword.itemIds.size,
      recentCount: keyword.recentItemIds.size,
      score: keyword.recentItemIds.size + keyword.itemIds.size * historicalWeight,
    }))
    .sort((left, right) => right.score - left.score
      || right.recentCount - left.recentCount
      || right.count - left.count
      || left.label.localeCompare(right.label, "pt-BR"))
    .slice(0, maxWords);
}
