import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type Article } from "./catalog";
import { keywordSelectionIds, keywordSelectionLabel } from "./keywordSelection";

export function useKeywordSelection(articles: Article[], term: string, sourceLocale: "pt" | "en", locale: "pt" | "en") {
  const foreign = Boolean(term) && sourceLocale !== locale;
  const [source, setSource] = useState<{ locale: string; articles: Article[]; error: string } | null>(null);
  useEffect(() => {
    if (!foreign) return;
    const controller = new AbortController();
    setSource(null);
    void loadCatalog(controller.signal, sourceLocale).then(result => {
      if (!controller.signal.aborted) setSource({ locale: sourceLocale, articles: result.articles, error: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setSource({ locale: sourceLocale, articles: [], error: locale === "en"
        ? "The original topic selection could not be verified. Retry or clear the topic filter."
        : "Não foi possível conferir o assunto no idioma de origem. Tente novamente ou limpe o filtro." });
    });
    return () => controller.abort();
  }, [foreign, sourceLocale, locale]);
  const ready = !foreign || source?.locale === sourceLocale;
  const ids = useMemo(() => keywordSelectionIds(foreign ? source?.articles || [] : articles, term), [foreign, source, articles, term]);
  const label = useMemo(() => keywordSelectionLabel(articles, term, sourceLocale, locale), [articles, term, sourceLocale, locale]);
  return { ids, label, loading: !ready, error: foreign && ready ? source?.error || "" : "" };
}
