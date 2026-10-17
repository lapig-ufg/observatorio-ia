import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/catalogNavigation.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { collectionThemes } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("coleções incluem automaticamente todos os temas existentes no tipo", () => {
  const articles = [
    { type: "link-video", theme: "LLMs e IA generativa" },
    { type: "link-video", theme: "Cultura, sociedade e comportamento" },
    { type: "link-video", theme: "Cultura, sociedade e comportamento" },
    { type: "medium", theme: "Tema exclusivo de blog" },
  ];

  assert.deepEqual(collectionThemes(articles, "link-video"), [
    { theme: "LLMs e IA generativa", count: 1 },
    { theme: "Cultura, sociedade e comportamento", count: 2 },
  ]);
});

test("coleções da entrada são independentes da taxonomia completa dos filtros", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(app, /<PortalCollections articles=\{articles\}/);
  assert.ok(app.includes("new Set(articles.filter"));
  assert.doesNotMatch(app, /Explore pelas sete coleções/);
});

test("Links e vídeos apresentam temas, não subcategorias repetidas", () => {
  const pt = fs.readFileSync("src/App.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8");
  assert.match(pt, /themes\).map\(\(item\) => <option key=\{item\}/);
  assert.match(en, /availableThemes.map\(\(item\) => <option key=\{item\} value=\{readingTopic\(item\).id\}/);
  assert.doesNotMatch(pt, /Selecione uma subcategoria para ver os links e vídeos relacionados/);
});
