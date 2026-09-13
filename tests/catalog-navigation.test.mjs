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

test("interface não promete um número fixo de coleções", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(app, /collectionThemes\(articles, "link-video"\)/);
  assert.match(app, /Explore por tema/);
  assert.doesNotMatch(app, /Explore pelas sete coleções/);
});
