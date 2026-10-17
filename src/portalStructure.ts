// Uma fonte de destinos mantém menu, cartões e mapa do site em acordo.
export const portalNavigation = [
  { id: "panorama", label: "Panorama", featured: { title: "Panorama da IA", description: "Linha do tempo, qual modelo usar e IAs gratuitas.", icon: "panorama", href: "#panorama", event: "nav_panorama" }, links: [
    { label: "Linha do tempo", href: "#panorama", description: "Acompanhe a linha do tempo dos modelos.", event: "nav_panorama" },
    { label: "Qual modelo usar", href: "#panorama/guia", description: "Compare opções para cada tarefa.", event: "nav_panorama" },
    { label: "IAs gratuitas", href: "#panorama/gratuitos", description: "Explore ferramentas com acesso gratuito.", event: "nav_panorama" },
    { label: "Como usar fora do navegador", href: "#panorama/como-usar", description: "Conheça o terminal e os agentes de IA.", event: "nav_panorama" },
  ] },
  { id: "acervo", label: "Acervo", featured: { title: "Acervo", description: "Leituras, documentos, vídeos, áudios e apresentações.", icon: "acervo", href: "#acervo", event: "nav_catalog", metric: "materials" }, links: [
    { label: "Todo o acervo", href: "#acervo", description: "Busque e filtre os materiais selecionados.", event: "nav_catalog" },
    { label: "Leituras em IA", href: "#leituras-em-ia", description: "Leia ensaios e artigos organizados por tema.", event: "nav_ai_readings" },
    { label: "Por dentro da IA", href: "por-dentro-da-ia/", description: "Experimente a aula interativa sobre modelos de linguagem.", event: "open_interactive_inference" },
  ] },
  { id: "atualidade", label: "Atualidade", featured: { title: "IA na imprensa", description: "Cobertura diária da Folha de S.Paulo sobre IA.", icon: "imprensa", href: "#ia-como-noticia-diaria", event: "nav_daily_news", metric: "news" }, links: [
    { label: "Em destaque da semana", href: "#em-destaque", description: "Conheça a edição e os destaques anteriores.", event: "nav_featured" },
    { label: "IA como notícia diária", href: "#ia-como-noticia-diaria", description: "Explore a cobertura da imprensa por ano e assunto.", event: "nav_daily_news" },
  ] },
  { id: "ufg", label: "IA na UFG", href: "#ecossistema-ufg", event: "nav_ecosystem", featured: { title: "IA na UFG", description: "Cursos, projetos e iniciativas da universidade.", icon: "ufg", href: "#ecossistema-ufg", event: "nav_ecosystem", metric: "initiatives" } },
  { id: "sobre", label: "Sobre", href: "#sobre", event: "nav_about" },
] as const;

export type PortalMetric = "materials" | "news" | "initiatives";
export type FeaturedPortalSection = { title: string; description: string; icon: string; href: string; event: string; metric?: PortalMetric };

export function featuredPortalSections(sections: readonly { id: string; featured?: FeaturedPortalSection }[] = portalNavigation) {
  return sections.flatMap(section => section.featured ? [section.featured] : []);
}

// Ausência de dados não vira zero; uma única iniciativa não representa o mapeamento completo.
export function portalMetricLabel(metric: PortalMetric | undefined, counts: Partial<Record<PortalMetric, number>>) {
  const count = metric ? counts[metric] : undefined;
  if (!metric || count === undefined || !Number.isFinite(count) || count < 0 || (metric === "initiatives" && count <= 1)) return "";
  const labels = { materials: ["material", "materiais"], news: ["matéria", "matérias"], initiatives: ["iniciativa", "iniciativas"] };
  return `${count.toLocaleString("pt-BR")} ${labels[metric][count === 1 ? 0 : 1]}`;
}

// A página, a prévia e a contagem usam a mesma combinação, preservando a prioridade editorial.
export function combineInitiatives<T extends { id: string; url: string }>(initiatives: T[], featured: T[]) {
  return [...featured, ...initiatives.filter(initiative => !featured.some(item => item.id === initiative.id || item.url === initiative.url))];
}

export function canonicalPortalHash(hash: string) {
  return ({ "#catalogo": "#acervo", "#categorias": "#acervo/colecoes", "#palavras-chave": "#acervo/radar" } as Record<string, string>)[hash] || hash;
}

export function portalPage(hash: string) {
  const route = canonicalPortalHash(hash);
  if (route.startsWith("#panorama")) return "panorama";
  if (route.startsWith("#acervo") || route === "#item") return "catalog";
  return ({ "#ecossistema-ufg": "ecosystem", "#ia-como-noticia-diaria": "daily-news", "#leituras-em-ia": "readings", "#ai-readings": "readings", "#sobre": "about" } as Record<string, string>)[route] || "home";
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
