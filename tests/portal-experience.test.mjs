import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/catalogExperienceState.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { readCatalogLocation, articlePreview, videoThumbnail } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const shared = fs.readFileSync("src/CatalogExperience.tsx", "utf8");
const styles = fs.readFileSync("src/portal.css", "utf8");

test("shareable location preserves query, filters, ordering, view, page length and detail ID", () => {
  const state = readCatalogLocation("?q=Navier&type=documento&theme=Ci%C3%AAncia&keyword=IA&sort=published&view=list&all=1&limit=45&item=documento-123", "todos");
  assert.deepEqual(state, { query: "Navier", type: "documento", theme: "Ciência", keyword: "IA", added: "", sort: "published", view: "list", showAll: true, visible: 45, item: "documento-123" });
  assert.equal(readCatalogLocation("?type=noticia&view=invalid&sort=invalid&limit=-1", "all").type, "all");
  assert.equal(readCatalogLocation("?limit=Infinity", "all").visible, 10000);
  assert.equal(readCatalogLocation("?limit=nan", "todos").visible, 6);
  assert.equal(readCatalogLocation("?type=documento", "todos").view, "list");
  assert.equal(readCatalogLocation("?type=paper", "todos").view, "cards");
});

test("previews do not cut an abbreviation and preserve the Navier–Stokes distinction", () => {
  const article = { title: "Entrevista", author: "Helena Nussenzveig", summary: "Em entrevista, o Prof. Ronaldo discute matemática. Há ressalvas.", tags: ["Matemática"], theme: "Ciência" };
  assert.equal(articlePreview(article, false), "Em entrevista, o Prof. Ronaldo discute matemática.");
  assert.equal(articlePreview({ ...article, summary: "Uma oração longa ".repeat(30) }, false), "Temas abordados: Matemática.");
  assert.match(articlePreview({ ...article, title: "O problema do milênio de Navier-Stokes" }, false), /sem forçamento, ainda aberto/);
  assert.match(articlePreview({ ...article, title: "Navier-Stokes" }, true), /still-open unforced/);
});

test("video thumbnails use only canonical YouTube hosts including live and shorts", () => {
  for (const url of ["https://youtu.be/HIUzrxQxTtw", "https://www.youtube.com/watch?v=HIUzrxQxTtw", "https://youtube.com/live/HIUzrxQxTtw", "https://youtube.com/shorts/HIUzrxQxTtw"])
    assert.equal(videoThumbnail(url), "https://i.ytimg.com/vi/HIUzrxQxTtw/mqdefault.jpg");
  assert.equal(videoThumbnail("https://youtube.com.invalid/watch?v=HIUzrxQxTtw"), "");
  assert.equal(videoThumbnail("not a URL"), "");
});

test("cards preserve full text in detail and cap only preview keywords", () => {
  assert.match(shared, /expanded \? article.summary : articlePreview/);
  assert.match(shared, /expanded \? article.tags : article.tags.slice\(0, 3\)/);
  assert.match(shared, /expanded && article.type !== "medium"/);
  assert.match(shared, /loading="lazy" decoding="async"/);
  assert.match(shared, /window.history.pushState/);
  assert.match(shared, /position.y/);
  assert.match(shared, /focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(styles, /line-clamp|overflow-y:\s*(auto|scroll)/);
});

test("both languages expose equivalent responsive portal controls and full-catalog radar", () => {
  for (const name of ["App.tsx", "AppEnglish.tsx"]) {
    const app = fs.readFileSync(`src/${name}`, "utf8");
    for (const feature of ["useCatalogExperience", "<CatalogCard", "<ArticleDetail", "<InstitutionalBand", "catalog-filter-options", "catalog-toolbar", "view-switch", "active-filters", "<TopicRadar", "portal-news"]) assert.ok(app.includes(feature), feature);
    assert.match(app, /<TopicRadar articles=\{articles\}/);
    assert.ok(app.indexOf('className="weekly-highlight weekly-highlight--debate"') < app.indexOf('className="results-heading"'));
  }
  assert.match(shared, /Laboratório de Sensoriamento Remoto e Geoprocessamento/);
  assert.match(shared, /Remote Sensing and GIS Laboratory/);
  assert.match(styles, /\.type-tabs \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("institutional band uses only official logos, with full accessible names instead of duplicated visible text", () => {
  const band = shared.slice(shared.indexOf("export function InstitutionalBand"));
  assert.doesNotMatch(band, /<p[ >]/);
  assert.match(band, /<span className="institutional-tooltip" aria-hidden="true">\{name\}<\/span>/);
  assert.match(styles, /institutional-tooltip \{ display: none;/);
  assert.match(styles, /a:focus-visible \.institutional-tooltip \{ display: block;/);
  assert.match(styles, /a:hover \.institutional-tooltip \{ display: block;/);
  assert.match(band, /aria-label=\{`\$\{acronym\} — \$\{name\}`\}/);
  assert.match(band, /className="institutional-lockup-image".*width="420" height="91" alt=""/);
  assert.doesNotMatch(band, /-symbol\.svg/);
  assert.match(styles, /\.institutional-lockup \{ position: relative; width: 420px; max-width: 100%;/);
  assert.match(styles, /\.institutional-lockup-image \{ display: block; width: 100%; height: auto;/);
  assert.match(styles, /grid-template-columns: 140fr 120fr 160fr/);
});
