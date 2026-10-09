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
  const currentHash = window.location.hash || "#top";
  const hash = locale === "en" && currentHash === "#ecossistema-ufg"
    ? "#ufg-ecosystem"
    : locale === "pt" && currentHash === "#ufg-ecosystem" ? "#ecossistema-ufg"
    : locale === "en" && currentHash === "#leituras-em-ia" ? "#ai-readings"
    : locale === "pt" && currentHash === "#ai-readings" ? "#leituras-em-ia"
    : locale === "en" && currentHash === "#ia-como-noticia-diaria" ? "#daily-news"
    : locale === "pt" && currentHash === "#daily-news" ? "#ia-como-noticia-diaria" : currentHash;
  const mappedHash = locale === "en"
    ? ({ "#catalogo": "#catalog", "#categorias": "#collections", "#palavras-chave": "#topics" }[hash] || hash)
    : ({ "#catalog": "#catalogo", "#collections": "#categorias", "#topics": "#palavras-chave" }[hash] || hash);
  return locale === "en" ? `./en/${window.location.search}${mappedHash}` : `../${window.location.search}${mappedHash}`;
}
