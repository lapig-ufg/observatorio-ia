// Uma fonte de destinos mantém menu, cartões e mapa do site em acordo.
export const portalNavigation = [
  { english: { label: "Panorama", featured: { title: "AI Panorama", description: "Timeline, which model to use and free AI tools." }, links: [
    { label: "Timeline", href: "#panorama", description: "Follow the timeline of AI models." },
    { label: "Which model to use", href: "#panorama/guia", description: "Compare options for each task." },
    { label: "Free AI tools", href: "#panorama/gratuitos", description: "Explore tools with free access." },
    { label: "Using AI outside the browser", href: "#panorama/como-usar", description: "Discover the terminal and AI agents." },
  ] }, id: "panorama", label: "Panorama", featured: { title: "Panorama da IA", description: "Linha do tempo, qual modelo usar e IAs gratuitas.", icon: "panorama", href: "#panorama", event: "nav_panorama" }, links: [
    { label: "Linha do tempo", href: "#panorama", description: "Acompanhe a linha do tempo dos modelos.", event: "nav_panorama" },
    { label: "Qual modelo usar", href: "#panorama/guia", description: "Compare opções para cada tarefa.", event: "nav_panorama" },
    { label: "IAs gratuitas", href: "#panorama/gratuitos", description: "Explore ferramentas com acesso gratuito.", event: "nav_panorama" },
    { label: "Como usar fora do navegador", href: "#panorama/como-usar", description: "Conheça o terminal e os agentes de IA.", event: "nav_panorama" },
  ] },
  { english: { label: "Research", featured: { title: "Research", description: "Original surveys by the Observatory.", href: "#levantamentos/politicas-ia" }, links: [
    { label: "AI policies in scholarly publishing", href: "#levantamentos/politicas-ia", description: "What journals, publishers, societies and funders allow, require and forbid." },
  ] }, id: "levantamentos", label: "Levantamentos", featured: { title: "Levantamentos", description: "Pesquisas originais do Observatório, com dados abertos.", icon: "levantamentos", href: "#levantamentos/politicas-ia", event: "nav_surveys" }, links: [
    { label: "Políticas de IA na publicação científica", href: "#levantamentos/politicas-ia", description: "O que periódicos, editoras, sociedades e agências permitem, exigem e vedam.", event: "nav_surveys" },
  ] },
  { english: { label: "Collection", featured: { title: "Collection", description: "Readings, documents, videos, audio and presentations.", href: "#catalog" }, links: [
    { label: "Full collection", href: "#catalog", description: "Search and filter the selected materials." },
    { label: "AI Readings", href: "#ai-readings", description: "Read essays and articles organized by topic." },
    { label: "Inside AI (interactive lesson, in Portuguese)", href: "por-dentro-da-ia/", description: "Explore the interactive classes on neural networks and language models (in Portuguese)." },
  ] }, id: "acervo", label: "Acervo", featured: { title: "Acervo", description: "Leituras, documentos, vídeos, áudios e apresentações.", icon: "acervo", href: "#acervo", event: "nav_catalog", metric: "materials" }, links: [
    { label: "Todo o acervo", href: "#acervo", description: "Busque e filtre os materiais selecionados.", event: "nav_catalog" },
    { label: "Leituras em IA", href: "#leituras-em-ia", description: "Leia ensaios e artigos organizados por tema.", event: "nav_ai_readings" },
    { label: "Por dentro da IA", href: "por-dentro-da-ia/", description: "Experimente as aulas interativas sobre redes neurais e modelos de linguagem.", event: "open_interactive_inference" },
  ] },
  { english: { label: "News", featured: { title: "AI in the press", description: "Daily coverage of AI by Folha de S.Paulo (in Portuguese).", href: "#daily-news" }, links: [
    { label: "Weekly highlight", href: "#highlight", description: "Explore the current edition and previous highlights." },
    { label: "AI in the daily news", href: "#daily-news", description: "Explore press coverage by year and topic (in Portuguese)." },
  ] }, id: "atualidade", label: "Atualidade", featured: { title: "IA na imprensa", description: "Cobertura diária da Folha de S.Paulo sobre IA.", icon: "imprensa", href: "#ia-como-noticia-diaria", event: "nav_daily_news", metric: "news" }, links: [
    { label: "Em destaque da semana", href: "#em-destaque", description: "Conheça a edição e os destaques anteriores.", event: "nav_featured" },
    { label: "IA como notícia diária", href: "#ia-como-noticia-diaria", description: "Explore a cobertura da imprensa por ano e assunto.", event: "nav_daily_news" },
  ] },
  { english: { label: "AI at UFG", href: "#ufg-ecosystem", featured: { title: "AI at UFG", description: "Courses, projects and university initiatives.", href: "#ufg-ecosystem" } }, id: "ufg", label: "IA na UFG", href: "#ecossistema-ufg", event: "nav_ecosystem", featured: { title: "IA na UFG", description: "Cursos, projetos e iniciativas da universidade.", icon: "ufg", href: "#ecossistema-ufg", event: "nav_ecosystem", metric: "initiatives" } },
  { english: { label: "About", href: "#about" }, id: "sobre", label: "Sobre", href: "#sobre", event: "nav_about" },
] as const;

export type PortalLink = { label: string; href: string; description: string; event: string };
export type PortalSection = { id: string; label: string; href?: string; event?: string; featured?: FeaturedPortalSection; links?: readonly PortalLink[] };

export function localizedPortalNavigation(english = false): readonly PortalSection[] {
  if (!english) return portalNavigation;
  return portalNavigation.map(section => {
    const translation = section.english;
    const localized: PortalSection = { ...section, label: translation.label };
    if ("href" in translation) localized.href = translation.href;
    if ("featured" in section && "featured" in translation) localized.featured = { ...section.featured, ...translation.featured };
    if ("links" in section && "links" in translation) localized.links = section.links.map((link, i) => ({ ...link, ...translation.links[i] }));
    return localized;
  });
}

export type PortalMetric = "materials" | "news" | "initiatives";
export type FeaturedPortalSection = { title: string; description: string; icon: string; href: string; event: string; metric?: PortalMetric };

export function featuredPortalSections(sections: readonly { id: string; featured?: FeaturedPortalSection }[] = portalNavigation) {
  return sections.flatMap(section => section.featured ? [section.featured] : []);
}

// Ausência de dados não vira zero; uma única iniciativa não representa o mapeamento completo.
export function portalMetricLabel(metric: PortalMetric | undefined, counts: Partial<Record<PortalMetric, number>>, english = false) {
  const count = metric ? counts[metric] : undefined;
  if (!metric || count === undefined || !Number.isFinite(count) || count < 0 || (metric === "initiatives" && count <= 1)) return "";
  const labels = english ? { materials: ["item", "items"], news: ["article", "articles"], initiatives: ["initiative", "initiatives"] } : { materials: ["material", "materiais"], news: ["matéria", "matérias"], initiatives: ["iniciativa", "iniciativas"] };
  return `${count.toLocaleString(english ? "en-US" : "pt-BR")} ${labels[metric][count === 1 ? 0 : 1]}`;
}

// A página, a prévia e a contagem usam a mesma combinação, preservando a prioridade editorial.
export function combineInitiatives<T extends { id: string; url: string }>(initiatives: T[], featured: T[]) {
  return [...featured, ...initiatives.filter(initiative => !featured.some(item => item.id === initiative.id || item.url === initiative.url))];
}

export function canonicalPortalHash(hash: string) {
  return ({ "#catalogo": "#acervo", "#categorias": "#acervo/colecoes", "#palavras-chave": "#acervo/radar" } as Record<string, string>)[hash] || hash;
}

export function portalPage(hash: string, english = false) {
  const route = canonicalPortalHash(hash);
  if (route.startsWith("#panorama")) return "panorama";
  if (route.startsWith("#levantamentos")) return "survey";
  if (english && ["#catalog", "#collections", "#topics", "#item"].includes(route)) return "catalog";
  if (route.startsWith("#acervo") || route === "#item") return "catalog";
  return ({ "#ecossistema-ufg": "ecosystem", "#ia-como-noticia-diaria": "daily-news", "#leituras-em-ia": "readings", "#ai-readings": "readings", "#sobre": "about", ...(english ? { "#ufg-ecosystem": "ecosystem", "#daily-news": "daily-news", "#about": "about" } : {}) } as Record<string, string>)[route] || "home";
}

// O comparador do catálogo resolve empates, sem duplicar a regra de datas.
export function latestAdditions<T extends { type: string }>(articles: T[], compare: (left: T, right: T) => number, limit = 6, readingLimit = 2) {
  const sorted = [...articles].sort(compare);
  let readings = 0;
  // A cota é um teto mesmo quando faltam outros formatos.
  return sorted.filter(article => article.type !== "medium" || ++readings <= readingLimit).slice(0, limit);
}

export function selectRecentAdditions<T extends { type: string }>(articles: T[], compare: (left: T, right: T) => number, isVideo: (article: T) => boolean) {
  const sorted = [...articles].sort(compare);
  const featured = sorted.find(isVideo) || sorted[0];
  const items = latestAdditions(sorted.filter(article => article !== featured), compare, 5, featured?.type === "medium" ? 1 : 2);
  return { featured, items };
}

// A janela termina no mês da última publicação, não no relógio de quem gera o arquivo.
export function monthlyNewsCounts(articles: Array<{ date: string }>, lastDate: string) {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(lastDate)) return [];
  const end = new Date(`${lastDate}T00:00:00Z`);
  const months = Array.from({ length: 12 }, (_, i) => ({ month: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1)).toISOString().slice(0, 7), count: 0 }));
  for (const article of articles) {
    if (!validDate(article.date)) continue;
    const month = months.find(month => month.month === article.date.slice(0, 7));
    if (month) month.count++;
  }
  return months;
}

export function summarizeNews(articles: Array<{ date: string; title: string; url: string }>) {
  const latest = [...articles].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "pt-BR"));
  const lastDate = latest[0]?.date || "";
  return { total: articles.length, lastDate, monthlyCounts: monthlyNewsCounts(articles, lastDate), articles: latest.slice(0, 3).map(({ date, title, url }) => ({ date, title, url })) };
}
