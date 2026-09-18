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
    : locale === "pt" && currentHash === "#ufg-ecosystem" ? "#ecossistema-ufg" : currentHash;
  return locale === "en" ? `./en/${hash}` : `../${hash}`;
}
