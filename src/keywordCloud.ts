const technicalReferencePatterns = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bdoi\.org\b/i,
  /\b10\.\d{4,9}\/[\w./;()_-]+/i,
  /\b(?:doi|arxiv|pmid|pmc|isbn|issn)\s*:\s*\S+/i,
];

/**
 * O Radar representa conceitos editoriais. Endereços e identificadores
 * bibliográficos continuam disponíveis nos metadados do item, mas não são temas.
 */
export function isEditorialCloudTerm(value: string) {
  const term = value.trim();
  return Boolean(term) && !technicalReferencePatterns.some((pattern) => pattern.test(term));
}
