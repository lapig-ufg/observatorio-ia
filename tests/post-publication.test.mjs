import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function moduleFrom(file) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { routePath, pageAnchor, usableInitiativeLogo } = await moduleFrom("src/pageNavigation.ts");
const { catalogLocationValues, readCatalogLocation } = await moduleFrom("src/catalogExperienceState.ts");
const { readingTopic } = await moduleFrom("src/readingTopics.ts");
const { matchesCloudTerm } = await moduleFrom("src/keywordCloud.ts");

test("seleções internas preservam a rota e cada âncora tem destino próprio", () => {
  assert.equal(routePath("#panorama/como-usar?secao=resumo"), "#panorama/como-usar");
  assert.equal(pageAnchor("#acervo"), "acervo");
  assert.equal(pageAnchor("#acervo/colecoes"), "categorias");
  assert.equal(pageAnchor("#acervo/radar"), "palavras-chave");
  assert.equal(pageAnchor("#experiencias-interativas"), "experiencias-interativas");
  assert.equal(pageAnchor("#em-destaque"), "em-destaque");
  for (const anchor of ["catalog", "collections", "topics"]) assert.equal(pageAnchor(`#${anchor}`, true), anchor);
  assert.equal(pageAnchor("#sobre"), "page-content");
});

test("URL omite padrões por tipo, mas conserva escolhas explícitas e links antigos", () => {
  const state = { added: "", query: "", selectedKeyword: "", type: "todos", theme: "todos", sort: "added", view: "list", visible: 6 };
  const values = catalogLocationValues(state, "todos");
  assert.ok(Object.values(values).every(value => value === ""));
  assert.equal(catalogLocationValues({ ...state, type: "paper", view: "cards" }, "todos").view, "");
  assert.equal(catalogLocationValues({ ...state, type: "paper", view: "list" }, "todos").view, "list");
  assert.equal(catalogLocationValues({ ...state, type: "link-video", view: "list", visible: 12 }, "todos").limit, "12");
  const old = readCatalogLocation("?view=list&all=1&readings_limit=12", "todos");
  assert.equal(old.showAll, true);
  assert.equal(old.view, "list");
  assert.equal(old.visible, 6);
});

test("IDs de tema preservam traduções e variantes antigas nos dois sentidos", () => {
  for (const [pt, en] of [["Agentes, RAG e aplicações", "Agents, RACs and applications"], ["Fundamentos, matemática e deep learning", "Foundations, mathematics and deep learning"], ["Ciências da Vida e Saúde", "Life Sciences and Health"], ["Educação, políticas e governança", "Education, policy and governance"]]) {
    const id = readingTopic(pt).id;
    assert.equal(readingTopic(en).id, id);
    assert.equal(readingTopic(id).id, id);
    assert.equal(readingTopic(id, true).label, readingTopic(pt, true).label);
  }
});

test("palavras-chave traduzidas mantêm a identidade do filtro", () => {
  for (const [pt, en] of [["Agentes", "Agents"], ["Conhecimento", "Knowledge"], ["Pesquisa", "Research"], ["Vetores", "Vectors"], ["IA generativa", "Generative AI"]]) {
    assert.equal(matchesCloudTerm({ tags: [en] }, pt), true);
    assert.equal(matchesCloudTerm({ tags: [pt] }, en), true);
  }
  assert.equal(matchesCloudTerm({ tags: ["Safety"] }, "Security"), false);
});

test("logos pequenos, ausentes ou genéricos usam fallback", () => {
  for (const [width, height] of [[0, 0], [16, 16], [16, 32], [32, 16]]) assert.equal(usableInitiativeLogo(width, height), false);
  assert.equal(usableInitiativeLogo(32, 32), true);
  assert.equal(usableInitiativeLogo(128, 128), true);
});
