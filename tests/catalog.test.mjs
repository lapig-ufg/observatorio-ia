import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
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

function records(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const headers = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

test("catalog contains the complete multidisciplinary collection", () => {
  const catalog = records("public/catalogo.csv");
  const active = catalog.filter((article) => article.ativo === "TRUE");
  assert.ok(catalog.length >= 1_000);
  assert.equal(new Set(catalog.map((article) => article.id)).size, catalog.length);
  assert.ok(active.length >= 900);
  assert.ok(active.every((article) => article.titulo && article.tema && article.subtema && article.resumo && article.palavras_chave));
  assert.ok(active.every((article) => article.url_original || article.url_pdf_institucional));
  assert.ok(active.every((article) => !article.url_original || article.url_original.startsWith("https://")));
  assert.ok(active.every((article) => !article.url_pdf_institucional || article.url_pdf_institucional.startsWith("https://")));
  assert.ok(active.filter((article) => article.tipo === "medium").every((article) => !article.url_pdf_institucional));
  assert.deepEqual(
    new Set(active.map((article) => article.tipo)),
    new Set(["medium", "documento", "link-video", "noticia", "paper", "apresentacao", "entrevista"]),
  );
});

test("catalog parser recognizes the separate interview collection", () => {
  const catalogSource = fs.readFileSync("src/catalog.ts", "utf8");
  const app = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(catalogSource, /\| "entrevista";/);
  assert.match(catalogSource, /entrevista: "entrevista"/);
  assert.match(app, /entrevista: "Entrevistas"/);
  assert.match(app, /const categoryTypes: ArticleType\[\] = \["medium", "documento", "link-video", "entrevista", "paper", "apresentacao"\];/);
});

test("legacy duplicate registry remains internally valid", () => {
  const control = records("data/controle-duplicatas.csv");
  assert.equal(new Set(control.map((article) => article.sha256_arquivo)).size, control.length);
  assert.ok(control.every((article) => /^[a-f0-9]{64}$/.test(article.sha256_texto)));
  assert.ok(control.every((article) => /^[a-f0-9]{16}$/.test(article.simhash_texto)));
});

test("GitHub Pages workflow builds from direct Google Sheets configuration", () => {
  const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(workflow, /VITE_GOOGLE_SHEETS_ID/);
  assert.match(workflow, /VITE_GOOGLE_SHEETS_GID/);
  assert.match(workflow, /VITE_GOOGLE_SHEETS_INITIATIVES_GID/);
  assert.match(workflow, /pnpm catalog:sync-fallback/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("newspaper records are preserved in the source but suppressed from the general catalog", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(app, /const categoryTypes: ArticleType\[\] = \["medium", "documento", "link-video", "entrevista", "paper", "apresentacao"\];/);
  assert.match(app, /filter\(\(article\) => article\.type !== "noticia"\)/);
  assert.match(app, /const catalogFilterTypes: Array<"todos" \| ArticleType> = \["todos", \.\.\.categoryTypes\];/);
  assert.doesNotMatch(app, /Artigos de Blogs, documentos, vídeos, notícias,/);
  assert.doesNotMatch(app, /keyword-cloud-recent/);
});

test("cards never render an empty primary-link action", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(app, /article\.originalUrl \? \(/);
  assert.match(app, /!article\.institutionalPdfUrl && \(/);
  assert.match(app, /article\.institutionalPdfUrl !== article\.originalUrl/);
  assert.match(app, /Link em revisão/);
});
