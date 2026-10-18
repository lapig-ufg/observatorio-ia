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
  "language model": "llms",
  "language models": "llms",
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

// Equivalências bilíngues da taxonomia publicada; termos ambíguos continuam distintos.
const bilingualTerms = [
  ["modelos de decisao", "decision models"],
  ["agentes", "agents", "ai agents"], ["ferramentas", "tools", "ai tools"],
  ["modelos", "models", "ai models"], ["redes neurais", "neural networks"],
  ["sistemas", "systems"], ["vetores", "vectors"], ["ia generativa", "generative ai"],
  ["conhecimento", "knowledge"], ["pesquisa", "research"],
  ["bases vetoriais", "vector databases", "vector bases"], ["produtividade", "productivity"],
  ["aprendizado", "learning"], ["aprendizado de maquina", "machine learning"],
  ["educacao", "education"], ["ciencia", "science"], ["saude", "health"],
  ["governanca", "governance"], ["regulacao", "regulation"], ["etica", "ethics"],
  ["trabalho", "work"], ["cultura", "culture"], ["sociedade", "society"],
  ["atencao", "attention"], ["raciocinio", "reasoning"], ["dados", "data"],
  ["automacao", "automation"], ["avaliacao", "evaluation"],
  ["engenharia de software", "software engineering"], ["trabalho e ia", "work and ai"],
  ["industria de ia", "ai industry"], ["estrategia", "strategy"],
  ["seguranca de ia", "ai security", "ai safety"], ["seguranca", "security"],
  ["economia da ia", "ai economics", "economics of ai"], ["mercado de ia", "ai market"],
  ["orquestracao", "orchestration"], ["governanca de ia", "ai governance"],
  ["avaliacao de modelos", "model evaluation"], ["programacao", "programming"],
  ["seguranca e governanca de ia", "ai security and governance"],
  ["interpretabilidade", "interpretability"], ["inferencia", "inference"],
  ["educacao e pesquisa", "education and research"], ["matematica", "mathematics"],
  ["modelos abertos", "open models"], ["infraestrutura de ia", "ai infrastructure"],
  ["sistemas multiagente", "multi-agent systems"], ["impactos economicos", "economic impacts"],
  ["produtividade com ia", "productivity with ai"], ["etica em ia", "ethics in ai"],
  ["industria", "industry"], ["sensoriamento remoto", "remote sensing"], ["contexto", "context"],
  ["arquitetura de agentes", "agent architecture"], ["autonomia", "autonomy"],
  ["modelos de difusao", "diffusion models"], ["aplicacoes de ia", "ai applications"],
  ["mercado", "market"], ["impactos sociais", "social impacts"], ["confiabilidade", "reliability"],
  ["contexto longo", "long context"], ["gestao do conhecimento", "knowledge management"],
  ["privacidade", "privacy"], ["fundamentos", "fundamentals"], ["limites da ia", "limits of ai"],
  ["aprendizado com ia", "learning with ai"], ["memoria de agentes", "agent memory"],
  ["reprodutibilidade", "reproducibility"], ["robotica", "robotics"],
  ["ciberseguranca", "cybersecurity"], ["engenharia de ia", "ai engineering"],
  ["raciocinio agentico", "agentic reasoning"], ["autoria", "authorship"],
  ["pesquisa em ia", "ai research"], ["alinhamento", "alignment"],
  ["agents, rag and applications", "agentes, rag e aplicacoes", "agents, rag, and applications"],
  ["modelos, mercado e industria", "models, market and industry"],
  ["industria, estrategia e impactos", "industry, strategy and impacts"],
  ["llms e ia generativa", "llms and generative ai"],
  ["modelos, limites e impactos", "models, limits, and impacts"],
  ["produtividade com ia e notebooklm", "productivity with ai and notebooklm"],
  ["aprendizado, pesquisa e produtividade", "learning, research, and productivity"],
];

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
  const alias = cloudTermAliases[key] || key;
  return bilingualTerms.find(terms => terms.includes(alias))?.[0] || alias;
}

export function cloudTerms(article: KeywordCloudArticle) {
  const terms = new Map<string, string>();
  article.tags.forEach((tag) => {
    if (!isEditorialCloudTerm(tag)) return;
    const key = cloudTermKey(tag);
    const translated = bilingualTerms.some(terms => terms.slice(1).includes(normalize(tag.trim())));
    if (key && !cloudExcludedTerms.has(key)) terms.set(key, translated ? tag.trim() : cloudTermLabels[key] || tag.trim());
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
