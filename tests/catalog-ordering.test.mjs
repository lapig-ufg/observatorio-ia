import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const source = fs.readFileSync("src/catalogOrdering.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { articleRecency, catalogDate, newestFirst } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function catalogArticles() {
  const rows = parseCsv(fs.readFileSync("public/catalogo.csv", "utf8"));
  const headers = rows[0];
  return rows.slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])))
    .filter((record) => record.ativo === "TRUE")
    .map((record) => ({
      id: record.id,
      type: record.tipo,
      theme: record.tema,
      title: record.titulo,
      publishedAt: record.data_publicacao,
      includedAt: record.data_inclusao,
    }));
}

test("todas as inclusões têm data reconhecida e cada coleção pode ser ordenada do mais recente", () => {
  const articles = catalogArticles();
  assert.ok(articles.every((article) => catalogDate(article.includedAt) > 0));

  const groups = new Map();
  articles.forEach((article) => {
    for (const key of [article.type, `${article.type}|${article.theme}`]) {
      const group = groups.get(key) || [];
      group.push(article);
      groups.set(key, group);
    }
  });

  groups.forEach((group) => {
    const sorted = group.slice().sort(newestFirst);
    for (let index = 1; index < sorted.length; index += 1) {
      assert.ok(articleRecency(sorted[index - 1]) >= articleRecency(sorted[index]));
    }
  });
});

test("a interface aplica a mesma ordem à seleção inicial e a todos os filtros", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(app, /return matchesType && matchesTheme && matchesKeyword && \(!needle \|\| haystack\.includes\(needle\)\);\s*}\)\.sort\(newestFirst\);/);
  assert.match(app, /latestByCategory[\s\S]*\.sort\(newestFirst\)/);
});
