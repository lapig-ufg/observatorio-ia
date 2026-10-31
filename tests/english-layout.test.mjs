import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function isolated(name) {
  const compiled = ts.transpileModule(fs.readFileSync(`src/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { localizedHash, languageUrl } = await isolated("locale");
const { portalNavigation, localizedPortalNavigation, portalMetricLabel, portalPage } = await isolated("portalStructure");

const pairs = [
  ["#top", "#top"], ["#acervo", "#catalog"], ["#acervo/colecoes", "#collections"], ["#acervo/radar", "#topics"],
  ["#em-destaque", "#highlight"], ["#sobre", "#about"], ["#leituras-em-ia", "#ai-readings"],
  ["#ia-como-noticia-diaria", "#daily-news"], ["#ecossistema-ufg", "#ufg-ecosystem"],
  ["#experiencias-interativas", "#interactive-experiences"], ["#item", "#item"],
  ...["", "/guia", "/gratuitos", "/como-usar"].map(path => [`#panorama${path}`, `#panorama${path}`]),
];

test("every page and anchor maps exactly in both languages, preserving internal selections", () => {
  for (const [pt, en] of pairs) for (const selection of ["", "?secao=tutorial&aba=2"]) {
    assert.equal(localizedHash(pt + selection, "en"), en + selection);
    assert.equal(localizedHash(en + selection, "pt"), pt + selection);
    assert.equal(localizedHash(localizedHash(pt + selection, "en"), "pt"), pt + selection);
    assert.equal(portalPage(pt), portalPage(en, true));
  }
  for (const [alias, pt, en] of [["#catalogo", "#acervo", "#catalog"], ["#categorias", "#acervo/colecoes", "#collections"], ["#palavras-chave", "#acervo/radar", "#topics"]]) {
    assert.equal(localizedHash(alias, "pt"), pt);
    assert.equal(localizedHash(alias, "en"), en);
  }
});

test("language URLs retain the collection search, filters and detail ID on every route", () => {
  const previous = globalThis.window;
  const search = "?q=AI&type=paper&theme=fundamentos&keyword=Agents&sort=published&view=list&limit=12&item=paper-1";
  try {
    for (const [pt, en] of pairs) {
      globalThis.window = { location: { hash: pt, search, pathname: "/observatorio-ia/" } };
      assert.equal(languageUrl("en"), `./en/${search}&keywordLang=pt${en}`);
      window.location = { hash: en, search, pathname: "/observatorio-ia/en/" };
      assert.equal(languageUrl("pt"), `../${search}&keywordLang=en${pt}`);
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test("English navigation translates all five entries and preserves each event and product destination", () => {
  const english = localizedPortalNavigation(true);
  assert.deepEqual(english.map(section => section.label), ["Panorama", "Research", "Collection", "News", "AI at UFG", "About"]);
  assert.deepEqual(english[0].links.map(link => link.label), ["Timeline", "Which model to use", "Free AI tools", "Using AI outside the browser"]);
  assert.deepEqual(english[2].links.map(link => link.label), ["Full collection", "AI Readings", "Inside AI (interactive classes, in Portuguese)"]);
  assert.deepEqual(english[3].links.map(link => link.label), ["Weekly highlight", "AI in the daily news"]);
  for (const [i, section] of english.entries()) {
    assert.equal(section.id, portalNavigation[i].id);
    assert.equal(section.event, portalNavigation[i].event);
    if (section.href) assert.equal(section.href, localizedHash(portalNavigation[i].href, "en"));
    for (const [j, link] of (section.links || []).entries()) {
      const original = portalNavigation[i].links[j];
      assert.equal(link.href, localizedHash(original.href, "en"));
      assert.equal(link.event, original.event);
      assert.ok(link.description);
    }
    if (section.featured) {
      assert.equal(section.featured.href, localizedHash(portalNavigation[i].featured.href, "en"));
      assert.equal(section.featured.metric, portalNavigation[i].featured.metric);
    }
  }
  assert.equal(localizedPortalNavigation(), portalNavigation);
  assert.equal(portalMetricLabel("materials", { materials: 1445 }, true), "1,445 items");
  assert.equal(portalMetricLabel("news", { news: 1 }, true), "1 article");
  assert.equal(portalMetricLabel("initiatives", { initiatives: 10 }, true), "10 initiatives");
});
