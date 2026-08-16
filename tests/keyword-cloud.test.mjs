import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/keywordCloud.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { isEditorialCloudTerm } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

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
  assert.match(app, /if \(!isEditorialCloudTerm\(tag\)\) return;/);
  assert.match(app, /"agentes de ia": "agentes"/);
  assert.match(app, /const maxCloudWords = 18;/);
  assert.doesNotMatch(app, /cloudPositions/);
  assert.match(cloudStyles, /display: flex;/);
  assert.match(cloudStyles, /flex-wrap: wrap;/);
  assert.match(cloudItemStyles, /position: static;/);
  assert.match(cloudItemStyles, /white-space: normal;/);
  assert.doesNotMatch(stylesheet, /left: var\(--cloud-x\);/);
});
