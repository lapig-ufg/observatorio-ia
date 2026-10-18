import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function moduleUrl(name, replacements = {}) {
  let source = ts.transpileModule(fs.readFileSync(`src/${name}.ts`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
const { catalogThemeOptions, readingTopic } = await import(moduleUrl("readingTopics"));
const { languageUrl } = await import(moduleUrl("locale"));
const { readCatalogLocation, catalogLocationValues } = await import(moduleUrl("catalogExperienceState"));
const { keywordSelectionIds, keywordSelectionLabel } = await import(moduleUrl("keywordSelection", {
  '"./keywordCloud"': JSON.stringify(moduleUrl("keywordCloud")),
}));

test("topic options deduplicate bilingual legacy aliases by stable ID, not raw label", () => {
  const values = [
    "LLMs e IA generativa", "Modelos, mercado e indústria", "Agents, RAG and applications",
    "Fundamentals, mathematics, and deep learning", "Transformers and attention",
    "Vector bases and knowledge", "Cultura, sociedade e comportamento",
    "Models, market and industry", "Models, markets and industry", "market", "", "  ",
  ];
  const pt = catalogThemeOptions(values);
  const en = catalogThemeOptions(values, true);
  assert.equal(pt.length, 7);
  assert.equal(en.length, 7);
  assert.equal(new Set(en.map(topic => topic.id)).size, 7);
  assert.equal(new Set(en.map(topic => topic.label)).size, 7);
  assert.deepEqual(pt.map(topic => topic.id).sort(), en.map(topic => topic.id).sort());
  assert.equal(en.find(topic => topic.id === "market").label, "Strategy, market and impacts");
  assert.deepEqual(catalogThemeOptions(["Ciências Humanas", "Ciências Sociais Aplicadas", "Linguística, Letras e Artes", "Tema específico"])
    .map(topic => topic.id).sort(), ["human-sciences", "applied-social", "linguistics-arts", "Tema específico"].sort());
  assert.ok(values.filter(Boolean).every(value => !value.trim() || pt.some(topic => topic.id === readingTopic(value).id)));
});

test("language switches preserve the keyword origin and every active filter in both directions", () => {
  const previous = globalThis.window;
  try {
    const initial = new URL("https://lapig-ufg.github.io/observatorio-ia/?keyword=Modelos+de+decis%C3%A3o&added=7d&type=link-video&theme=market&limit=12&item=video-1#item");
    globalThis.window = { location: initial };
    const english = new URL(languageUrl("en"), initial);
    assert.equal(english.pathname, "/observatorio-ia/en/");
    assert.equal(english.searchParams.get("keywordLang"), "pt");
    assert.equal(english.searchParams.get("keyword"), "Modelos de decisão");
    for (const key of ["added", "type", "theme", "limit", "item"])
      assert.equal(english.searchParams.get(key), initial.searchParams.get(key));
    window.location = english;
    const portuguese = new URL(languageUrl("pt"), english);
    assert.equal(portuguese.pathname, initial.pathname);
    assert.equal(portuguese.search, english.search);
    assert.equal(portuguese.hash, initial.hash);
    window.location = new URL("https://lapig-ufg.github.io/observatorio-ia/en/?keyword=Decision+models&added=7d#topics");
    const fromEnglish = new URL(languageUrl("pt"), window.location);
    assert.equal(fromEnglish.searchParams.get("keywordLang"), "en");
    assert.equal(fromEnglish.hash, "#acervo/radar");
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test("shareable filter state validates and clears keyword origin without losing a recent window", () => {
  const state = readCatalogLocation("?keyword=Tema&keywordLang=pt&added=7d&type=link-video&theme=market", "all");
  assert.equal(state.keywordLocale, "pt");
  assert.equal(state.added, "7d");
  const values = catalogLocationValues({ ...state, selectedKeyword: state.keyword }, "all");
  assert.equal(values.keywordLang, "pt");
  assert.equal(values.theme, "market");
  assert.equal(values.added, "7d");
  assert.equal(catalogLocationValues({ ...state, selectedKeyword: "" }, "all").keywordLang, "");
  assert.equal(readCatalogLocation("?keywordLang=invalid", "todos").keywordLocale, "");
});

test("keyword selection uses source IDs even when translations are unknown or tags reordered", () => {
  const pt = [
    { id: "video-1", tags: ["Modelos de decisão", "Agentes"] },
    { id: "video-2", tags: ["Etiqueta sem equivalente", "RAG"] },
    { id: "video-3", tags: ["Modelos de decisão", "Etiqueta sem equivalente"] },
  ];
  const en = [
    { id: "video-1", tags: ["Agents", "Decision models"] },
    { id: "video-2", tags: ["A different ordering", "RAG"] },
    { id: "video-3", tags: ["Decision models", "Another translation"] },
  ];
  const selected = keywordSelectionIds(pt, "Etiqueta sem equivalente");
  assert.deepEqual(en.filter(article => selected.has(article.id)).map(article => article.id), ["video-2", "video-3"]);
  assert.equal(keywordSelectionLabel(en, "Etiqueta sem equivalente", "pt", "en"), "Etiqueta sem equivalente (PT)");
  assert.equal(keywordSelectionLabel(en, "Modelos de decisão", "pt", "en"), "Decision models");
  assert.equal(keywordSelectionLabel(pt, "Decision models", "en", "pt"), "Modelos de decisão");
  assert.deepEqual([...keywordSelectionIds(pt, "Modelos de decisão")], [...keywordSelectionIds(en, "Decision models")]);
  assert.deepEqual([...keywordSelectionIds(pt, "")], []);
  assert.equal(keywordSelectionLabel(en, "", "pt", "en"), "");
  assert.equal(keywordSelectionIds(pt, "Categoria inexistente").size, 0);
});

test("cross-language corpus fallback resolves at the site root from either localized page", async () => {
  const { loadCatalog } = await import(moduleUrl("catalog", {
    "import.meta.env": JSON.stringify({ DEV: false, BASE_URL: "/observatorio-ia/" }),
  }));
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async url => {
      requested.push(url);
      return new Response("id,ativo,tipo,tema,titulo,resumo,url_original\nvideo-1,true,video,Models,Title,Summary,https://youtu.be/0FBdWvkgNQE\n");
    };
    for (const page of ["/observatorio-ia/", "/observatorio-ia/en/"]) {
      globalThis.window = { location: new URL(`https://lapig-ufg.github.io${page}`) };
      for (const language of ["pt", "en"]) {
        const result = await loadCatalog(undefined, language);
        assert.equal(result.articles[0].id, "video-1");
        assert.equal(requested.at(-1), `https://lapig-ufg.github.io/observatorio-ia/catalogo${language === "en" ? "-en" : ""}.csv`);
      }
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("both interfaces wait for the source corpus and expose a failure instead of a false empty result", () => {
  const hook = fs.readFileSync("src/useKeywordSelection.ts", "utf8");
  assert.match(hook, /loadCatalog\(controller.signal, sourceLocale\)/);
  assert.match(hook, /controller.abort\(\)/);
  assert.match(hook, /if \(!controller.signal.aborted\)/);
  for (const app of ["App", "AppEnglish"]) {
    const source = fs.readFileSync(`src/${app}.tsx`, "utf8");
    assert.match(source, /keywordSelection.ids.has\(article.id\)/);
    assert.match(source, /error \|\| keywordSelection.error \?/);
    assert.match(source, /!catalog \|\| keywordSelection.loading \?/);
  }
});
