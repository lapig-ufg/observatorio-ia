export type Locale = "pt" | "en";

export function currentLocale(): Locale {
  return window.location.pathname.split("/").filter(Boolean).at(-1) === "en" ? "en" : "pt";
}

export function siteAssetUrl(path: string) {
  const cleanPath = path.replace(/^\//, "");
  const prefix = currentLocale() === "en" ? "../" : import.meta.env.BASE_URL;
  return new URL(`${prefix}${cleanPath}`, window.location.href).toString();
}

export function languageUrl(locale: Locale) {
  const mappedHash = localizedHash(window.location.hash || "#top", locale);
  const params = new URLSearchParams(window.location.search);
  if (params.get("keyword") && !["pt", "en"].includes(params.get("keywordLang") || "")) {
    params.set("keywordLang", currentLocale());
  }
  const search = params.toString() ? `?${params}` : "";
  return locale === "en" ? `./en/${search}${mappedHash}` : `../${search}${mappedHash}`;
}

const hashPairs = [
  ["#acervo", "#catalog"], ["#acervo/colecoes", "#collections"], ["#acervo/radar", "#topics"],
  ["#sobre", "#about"], ["#em-destaque", "#highlight"], ["#experiencias-interativas", "#interactive-experiences"],
  ["#ecossistema-ufg", "#ufg-ecosystem"], ["#leituras-em-ia", "#ai-readings"], ["#ia-como-noticia-diaria", "#daily-news"],
] as const;

export function localizedHash(hash: string, locale: Locale) {
  const index = hash.indexOf("?");
  const path = index < 0 ? hash : hash.slice(0, index);
  const selection = index < 0 ? "" : hash.slice(index);
  const canonical = ({ "#catalogo": "#acervo", "#categorias": "#acervo/colecoes", "#palavras-chave": "#acervo/radar" } as Record<string, string>)[path] || path;
  const pair = hashPairs.find(pair => pair[0] === canonical || pair[1] === canonical);
  return (pair ? pair[locale === "en" ? 1 : 0] : canonical) + selection;
}
