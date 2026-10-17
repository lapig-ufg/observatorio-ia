import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function moduleFrom(name) {
  const compiled = ts.transpileModule(fs.readFileSync(`src/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { portalNavigation, featuredPortalSections, portalMetricLabel, combineInitiatives, canonicalPortalHash, portalPage, latestAdditions, selectRecentAdditions, monthlyNewsCounts, summarizeNews } = await moduleFrom("portalStructure");
const { catalogDate, newestFirst } = await moduleFrom("catalogOrdering");
const { videoThumbnail } = await moduleFrom("catalogExperienceState");

test("featured sections follow the navigation, target pages and accept a fifth section", () => {
  const sections = featuredPortalSections();
  assert.deepEqual(sections.map(section => section.title), ["Panorama da IA", "Acervo", "IA na imprensa", "IA na UFG"]);
  assert.deepEqual(sections.map(section => section.href), ["#panorama", "#acervo", "#ia-como-noticia-diaria", "#ecossistema-ufg"]);
  for (const section of sections) {
    assert.notEqual(portalPage(section.href), "home");
    assert.ok(section.description && section.icon && section.event);
    assert.ok(portalNavigation.some(entry => entry.href === section.href || entry.links?.some(link => link.href === section.href)));
  }
  assert.equal(sections[0].metric, undefined);
  const next = { id: "nova", label: "Nova seção", href: "#nova", event: "nav_new", featured: { title: "Nova seção", description: "Uma nova porta do portal.", icon: "acervo", href: "#nova", event: "nav_new" } };
  const extended = [...portalNavigation, next];
  assert.equal(featuredPortalSections(extended).length, 5);
  assert.equal(featuredPortalSections(extended)[4], next.featured);
  assert.equal(portalNavigation.length, 5);
});

test("hero metrics omit pending values and a lone initiative, with real localized counts", () => {
  for (const metric of ["materials", "news", "initiatives"]) {
    assert.equal(portalMetricLabel(metric, {}), "");
    for (const value of [NaN, Infinity, -1]) assert.equal(portalMetricLabel(metric, { [metric]: value }), "");
  }
  assert.equal(portalMetricLabel(undefined, { materials: 42 }), "");
  assert.equal(portalMetricLabel("materials", { materials: 1445 }), "1.445 materiais");
  assert.equal(portalMetricLabel("materials", { materials: 0 }), "0 materiais");
  assert.equal(portalMetricLabel("materials", { materials: 1 }), "1 material");
  assert.equal(portalMetricLabel("news", { news: 6727 }), "6.727 matérias");
  assert.equal(portalMetricLabel("news", { news: 1 }), "1 matéria");
  for (const count of [0, 1]) assert.equal(portalMetricLabel("initiatives", { initiatives: count }), "");
  assert.equal(portalMetricLabel("initiatives", { initiatives: 3 }), "3 iniciativas");
});

test("initiative count uses the same editorial combination as the page and preview", () => {
  const featured = [{ id: "course", url: "https://ufg.br/course" }];
  const incoming = [{ id: "course", url: "https://ufg.br/duplicate-id" }, { id: "other-id", url: "https://ufg.br/course" }, { id: "lab", url: "https://ufg.br/lab" }];
  const original = structuredClone({ incoming, featured });
  assert.deepEqual(combineInitiatives(incoming, featured), [featured[0], incoming[2]]);
  assert.deepEqual(combineInitiatives([], featured), featured);
  assert.deepEqual(combineInitiatives([], []), []);
  assert.deepEqual({ incoming, featured }, original);
});

test("PT menu and sitemap share five sections with explicit product routes", () => {
  assert.deepEqual(portalNavigation.map(section => section.label), ["Panorama", "Acervo", "Atualidade", "IA na UFG", "Sobre"]);
  assert.deepEqual(portalNavigation[0].links.map(link => link.href), ["#panorama", "#panorama/guia", "#panorama/gratuitos", "#panorama/como-usar"]);
  assert.deepEqual(portalNavigation[1].links.map(link => link.href), ["#acervo", "#leituras-em-ia", "por-dentro-da-ia/"]);
  assert.deepEqual(portalNavigation[2].links.map(link => link.href), ["#em-destaque", "#ia-como-noticia-diaria"]);
  for (const section of portalNavigation) for (const link of section.links || []) assert.ok(link.description && link.event);
  const source = fs.readFileSync("src/PortalNavigation.tsx", "utf8");
  assert.equal((source.match(/portalNavigation.map/g) || []).length, 2);
  for (const feature of ["aria-expanded", "aria-controls", "aria-current", 'event.key === "Escape"', '"pointerdown"', 'triggers.current[open]?.focus()']) assert.ok(source.includes(feature), feature);
});

test("legacy hashes resolve to Acervo while the URL preserves search parameters", () => {
  for (const [old, expected] of [["#catalogo", "#acervo"], ["#categorias", "#acervo/colecoes"], ["#palavras-chave", "#acervo/radar"]]) {
    const url = new URL(`https://example.org/?q=aten%C3%A7%C3%A3o&type=medium&item=abc${old}`);
    url.hash = canonicalPortalHash(url.hash);
    assert.equal(url.hash, expected);
    assert.equal(url.searchParams.get("q"), "atenção"); assert.equal(url.searchParams.get("item"), "abc");
    assert.equal(portalPage(old), "catalog");
  }
  assert.equal(portalPage("#sobre"), "about");
  assert.equal(portalPage("#em-destaque"), "home");
  assert.equal(portalPage("#experiencias-interativas"), "home");
  assert.equal(portalPage("#panorama/guia"), "panorama");
  assert.equal(portalPage("#item"), "catalog");
});

test("six recent inclusions include readings, use newestFirst for ties and do not mutate data", () => {
  const articles = Array.from({ length: 8 }, (_, i) => ({ id: String(i), title: String(i), type: i === 7 ? "medium" : "paper", includedAt: i > 4 ? "2026-10-15" : "2026-10-14", publishedAt: `2026-10-${10 + i}` }));
  const original = structuredClone(articles);
  const selected = latestAdditions(articles, (a, b) => catalogDate(b.includedAt) - catalogDate(a.includedAt) || newestFirst(a, b));
  assert.equal(selected.length, 6); assert.deepEqual(selected.map(item => item.id), ["7", "6", "5", "4", "3", "2"]);
  assert.equal(selected[0].type, "medium"); assert.deepEqual(articles, original);
  assert.deepEqual(latestAdditions([], newestFirst), []);
});

test("recent additions cap readings at two and retain the newest other formats in date order", () => {
  const articles = Array.from({ length: 12 }, (_, i) => ({ id: String(i), title: String(i), type: i < 7 ? "medium" : ["paper", "audio", "documento", "link-video", "entrevista"][i - 7], includedAt: `2026-10-${String(20 - i).padStart(2, "0")}` }));
  const original = structuredClone(articles);
  const compare = (a, b) => catalogDate(b.includedAt) - catalogDate(a.includedAt) || newestFirst(a, b);
  const selected = latestAdditions(articles, compare);
  assert.deepEqual(selected.map(item => item.id), ["0", "1", "7", "8", "9", "10"]);
  assert.equal(selected.filter(item => item.type === "medium").length, 2);
  assert.deepEqual(articles, original);
  // Leituras mais antigas não precisam ocupar a cota se houver seis materiais mais novos.
  assert.deepEqual(latestAdditions(articles.map(item => ({ ...item, type: Number(item.id) < 7 ? "paper" : "medium" })), compare).map(item => item.id), ["0", "1", "2", "3", "4", "5"]);
});

test("recent additions keep the reading cap even in small collections", () => {
  const readings = Array.from({ length: 8 }, (_, i) => ({ id: `reading-${i}`, type: "medium", includedAt: `2026-10-${20 - i}` }));
  const other = { id: "audio", type: "audio", includedAt: "2026-10-01" };
  const compare = (a, b) => catalogDate(b.includedAt) - catalogDate(a.includedAt) || newestFirst(a, b);
  assert.deepEqual(latestAdditions([...readings, other], compare).map(item => item.id), ["reading-0", "reading-1", "audio"]);
  assert.deepEqual(latestAdditions(readings, compare), readings.slice(0, 2));
  assert.deepEqual(latestAdditions([other, ...readings.slice(0, 2)], compare), [...readings.slice(0, 2), other]);
  assert.deepEqual(latestAdditions([other], compare), [other]);
});

test("small news summary matches all local annual records, latest date and source titles", () => {
  const records = fs.readdirSync("public/folha-ia").filter(file => /^\d{4}\.json$/.test(file)).flatMap(file => JSON.parse(fs.readFileSync(`public/folha-ia/${file}`, "utf8")));
  const result = summarizeNews(records);
  const summary = JSON.parse(fs.readFileSync("public/folha-ia/resumo.json", "utf8"));
  const index = JSON.parse(fs.readFileSync("public/folha-ia/index.json", "utf8"));
  assert.deepEqual(summary, result); assert.equal(summary.total, index.articleCount); assert.equal(summary.lastDate, index.lastDate);
  assert.equal(summary.articles.length, 3); assert.ok(fs.statSync("public/folha-ia/resumo.json").size < 4000);
  for (const item of summary.articles) assert.ok(records.some(record => record.url === item.url && record.title === item.title && record.date === item.date));
  assert.deepEqual(summarizeNews([]), { total: 0, lastDate: "", monthlyCounts: [], articles: [] });
});

test("recent video leads five compact additions, with deterministic ties and no duplicates", () => {
  const articles = [
    { id: "link", type: "link-video", originalUrl: "https://example.org/", includedAt: "2026-10-16" },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `reading-${i}`, type: "medium", originalUrl: "", includedAt: "2026-10-15" })),
    { id: "video-old", type: "link-video", originalUrl: "https://youtu.be/abcdefghijk", includedAt: "2026-10-12" },
    { id: "video-new", type: "link-video", originalUrl: "https://www.youtube.com/watch?v=12345678901", includedAt: "2026-10-13", publishedAt: "2026-10-15" },
    { id: "video-tie", type: "link-video", originalUrl: "https://www.youtube.com/shorts/12345678901", includedAt: "2026-10-13", publishedAt: "2026-10-11" },
    { id: "audio", type: "audio", originalUrl: "https://youtu.be/abcdefghijk", includedAt: "2026-10-16" },
  ].map(article => ({ title: article.id, publishedAt: "", ...article }));
  const original = structuredClone(articles);
  const compare = (a, b) => catalogDate(b.includedAt) - catalogDate(a.includedAt) || newestFirst(a, b);
  const isVideo = item => item.type === "link-video" && !!videoThumbnail(item.originalUrl);
  const { featured, items } = selectRecentAdditions(articles, compare, isVideo);
  assert.equal(featured.id, "video-new");
  assert.equal(items.length, 5);
  assert.equal(items.filter(item => item.type === "medium").length, 2);
  assert.equal(new Set([featured, ...items].map(item => item.id)).size, 6);
  assert.deepEqual(items, [...items].sort(compare));
  assert.deepEqual(articles, original);
  const withoutVideo = articles.filter(item => !isVideo(item));
  const fallback = selectRecentAdditions(withoutVideo, compare, isVideo);
  assert.equal(fallback.featured, [...withoutVideo].sort(compare)[0]);
  const onlyReadings = selectRecentAdditions(articles.filter(item => item.type === "medium"), compare, isVideo);
  assert.equal(onlyReadings.featured.type, "medium");
  assert.equal(onlyReadings.items.length, 1);
  assert.deepEqual(selectRecentAdditions([], compare, isVideo), { featured: undefined, items: [] });
  assert.deepEqual(selectRecentAdditions([articles[5]], compare, isVideo), { featured: articles[5], items: [] });
});

test("monthly news includes 12 consecutive UTC months, gaps, leap days and inclusive boundaries", () => {
  const articles = ["2023-02-28", "2023-03-01", "2023-03-31", "2023-12-31", "2024-01-01", "2024-02-29", "2024-03-01", "2024-02-30", "invalid", "2024-2-01"].map(date => ({ date }));
  const original = structuredClone(articles);
  const months = monthlyNewsCounts(articles, "2024-02-29");
  assert.equal(months.length, 12);
  assert.equal(months[0].month, "2023-03");
  assert.equal(months[11].month, "2024-02");
  assert.deepEqual(months.map(month => month.count), [2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
  assert.equal(monthlyNewsCounts([], "2024-02-29").reduce((sum, item) => sum + item.count, 0), 0);
  for (const value of ["", "invalid", "2024-02-30"]) assert.deepEqual(monthlyNewsCounts(articles, value), []);
  assert.deepEqual(articles, original);
});

test("separate official SVGs change only the viewBox and keep full names and colors", () => {
  const source = fs.readFileSync("public/brand/lapig-iesa-ufg-approved.svg", "utf8");
  const boxes = { ufg: "625 15 422 225", iesa: "357 70 220 110", lapig: "50 70 260 110" };
  for (const [name, box] of Object.entries(boxes)) {
    assert.equal(fs.readFileSync(`public/brand/${name}.svg`, "utf8"), source.replace('viewBox="0 0 1127.49 265.53"', `viewBox="${box}"`));
  }
  const band = fs.readFileSync("src/RealizationBand.tsx", "utf8");
  for (const name of Object.keys(boxes)) assert.ok(band.includes(`brand/${name}.svg`));
  assert.doesNotMatch(band, /\.png|symbol\.svg/);
});

test("home DOM follows D3 and Acervo alone contains all seven collections and radar", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  const home = fs.readFileSync("src/PortalHome.tsx", "utf8");
  const markers = ['className="pt-home-opening"', 'id={english ? "highlight" : "em-destaque"}', 'id="home-panorama-title"', 'id="home-recent-title"', '<PressSummary', 'id={english ? "interactive-experiences" : "experiencias-interativas"}', 'id="home-ufg-title"'];
  let last = -1;
  for (const marker of markers) { const index = home.indexOf(marker); assert.ok(index > last, marker); last = index; }
  assert.doesNotMatch(home, /<PortalCollections|<TopicRadar|search-panel|obia-callout/);
  assert.match(fs.readFileSync("src/PortalFooter.tsx", "utf8"), /<RealizationBand english=\{english\} \/>[\s\S]*<footer/);
  assert.match(fs.readFileSync("src/PortalFooter.tsx", "utf8"), /trackEvent\("open_obia"[^\n]*position: "footer"/);
  assert.match(fs.readFileSync("src/PortalDiscovery.tsx", "utf8"), /\[\.\.\.homeCollections, "medium" as const\]/);
  assert.doesNotMatch(app, /if \(category === "medium"\)/);
});
