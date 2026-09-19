import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/keywordCloud.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildKeywordCloud, cloudTermKey, isEditorialCloudTerm, matchesCloudTerm } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Radar exclui URLs e identificadores bibliográficos dos temas", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  const stylesheet = fs.readFileSync("src/styles.css", "utf8");
  const cloudStyles = stylesheet.slice(stylesheet.indexOf(".keyword-cloud {"), stylesheet.indexOf(".keyword-cloud-item {"));
  const cloudItemStyles = stylesheet.slice(stylesheet.indexOf(".keyword-cloud-item {"), stylesheet.indexOf(".keyword-cloud-item:hover,"));

  assert.equal(isEditorialCloudTerm("Agentes de IA"), true);
  assert.equal(isEditorialCloudTerm("RAG"), true);
  assert.equal(isEditorialCloudTerm("https://doi.org/10.1016/j.compag.2026.111995"), false);
  assert.equal(isEditorialCloudTerm("10.1016/j.compag.2026.111995"), false);
  assert.equal(isEditorialCloudTerm("arXiv:2608.01234"), false);
  assert.equal(isEditorialCloudTerm("LAPIG UFG"), false);
  assert.equal(isEditorialCloudTerm("Anthropic"), false);
  assert.equal(isEditorialCloudTerm("ChatGPT"), false);
  assert.equal(isEditorialCloudTerm("Kimi K3"), false);
  assert.equal(isEditorialCloudTerm(""), false);
  assert.equal(cloudTermKey("Modelos de IA"), "modelos");
  assert.equal(cloudTermKey("Ferramentas de IA"), "ferramentas");
  assert.equal(cloudTermKey("Modelos de linguagem"), "llms");
  assert.match(source, /if \(!isEditorialCloudTerm\(tag\)\) return;/);
  assert.match(source, /"agentes de ia": "agentes"/);
  assert.match(app, /const maxCloudWords = 18;/);
  assert.doesNotMatch(app, /cloudPositions/);
  assert.match(cloudStyles, /display: flex;/);
  assert.match(cloudStyles, /flex-wrap: wrap;/);
  assert.match(cloudItemStyles, /position: static;/);
  assert.match(cloudItemStyles, /white-space: normal;/);
  assert.doesNotMatch(stylesheet, /left: var\(--cloud-x\);/);
});

test("Radar agrupa sinônimos, prioriza inclusões recentes e cada termo filtra itens", () => {
  const articles = [
    { id: "old-1", tags: ["LLM", "Agente de IA", "https://example.com"] },
    { id: "new-1", tags: ["Large language models", "RAG", "ChatGPT"] },
    { id: "new-2", tags: ["Agentes", "RAG", "Embeddings"] },
  ];
  const radar = buildKeywordCloud(articles, new Set(["new-1", "new-2"]), 18, 0.06);

  assert.equal(cloudTermKey("Large language model"), "llms");
  assert.equal(radar.find((term) => term.key === "llms")?.count, 2);
  assert.equal(radar.find((term) => term.key === "agentes")?.count, 2);
  assert.equal(radar[0].key, "rag");
  assert.ok(radar.every((term) => articles.some((article) => matchesCloudTerm(article, term.label))));
  assert.ok(!radar.some((term) => term.key.includes("http") || term.key === "chatgpt"));
});

test("Radar inglês corrige RAG traduzido como RACs sem perder o filtro", () => {
  const article = { id: "translated-1", tags: ["Agents, RACs, and applications"] };
  const [term] = buildKeywordCloud([article], new Set([article.id]));
  assert.equal(term.label, "Agents, RAG and applications");
  assert.equal(matchesCloudTerm(article, term.label), true);
});
