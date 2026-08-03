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
