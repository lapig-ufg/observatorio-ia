export function normalizedSearch(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Words may appear in any order; quotation marks request an exact phrase.
export function matchesSearch(text: string, query: string) {
  const haystack = normalizedSearch(text);
  const terms = normalizedSearch(query).match(/"[^"]+"|\S+/g) || [];
  return terms.every(term => haystack.includes(term.replace(/^"|"$/g, "")));
}

export function readArchiveFilters<T extends Record<string, string>>(search: string, prefix: string, defaults: T): T {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, params.get(`${prefix}_${key}`) ?? fallback])) as T;
}

export function parseNewsPeriod(value: string): "30d" | "all" | number {
  if (value === "all" || value === "30d") return value;
  return /^20\d{2}$/.test(value) ? Number(value) : "30d";
}
