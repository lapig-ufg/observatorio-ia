import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function moduleFrom(name) {
  const compiled = ts.transpileModule(fs.readFileSync(`src/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { portalNavigation, canonicalPortalHash, portalPage, latestAdditions, summarizeNews } = await moduleFrom("portalStructure");
const { catalogDate, newestFirst } = await moduleFrom("catalogOrdering");

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

test("recent additions fill missing formats with readings and handle small collections", () => {
  const readings = Array.from({ length: 8 }, (_, i) => ({ id: `reading-${i}`, type: "medium", includedAt: `2026-10-${20 - i}` }));
  const other = { id: "audio", type: "audio", includedAt: "2026-10-01" };
  const compare = (a, b) => catalogDate(b.includedAt) - catalogDate(a.includedAt) || newestFirst(a, b);
  assert.deepEqual(latestAdditions([...readings, other], compare).map(item => item.id), ["reading-0", "reading-1", "reading-2", "reading-3", "reading-4", "audio"]);
  assert.deepEqual(latestAdditions(readings, compare), readings.slice(0, 6));
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
  assert.deepEqual(summarizeNews([]), { total: 0, lastDate: "", articles: [] });
});

test("home DOM follows D3 and Acervo alone contains all seven collections and radar", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  const home = app.slice(app.indexOf('<div className="pt-home-page">'), app.indexOf('<footer'));
  const markers = ['className="pt-home-opening"', 'id="em-destaque"', 'id="home-panorama-title"', 'id="home-recent-title"', '<PressSummary', 'id="experiencias-interativas"', 'id="home-ufg-title"'];
  let last = -1;
  for (const marker of markers) { const index = home.indexOf(marker); assert.ok(index > last, marker); last = index; }
  assert.doesNotMatch(home, /<PortalCollections|<TopicRadar|search-panel|obia-callout/);
  assert.match(app, /pt-footer-institutions"><InstitutionalBand/);
  assert.match(app, /trackEvent\("open_obia"[^\n]*position: "footer"/);
  assert.match(fs.readFileSync("src/PortalDiscovery.tsx", "utf8"), /english \? homeCollections : \[\.\.\.homeCollections, "medium" as const\]/);
  assert.doesNotMatch(app, /if \(category === "medium"\)/);
});
