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
  assert.equal(catalog.length, 99);
  assert.equal(new Set(catalog.map((article) => article.id)).size, 99);
  assert.equal(catalog.filter((article) => article.ativo === "TRUE").length, 98);
  assert.ok(catalog.every((article) => article.titulo && article.resumo && article.url_original));
  assert.ok(catalog.every((article) => article.resumo.split(/\r?\n/).length <= 10));
  assert.ok(catalog.every((article) => article.url_original.startsWith("https://")));
  assert.deepEqual(
    new Set(catalog.map((article) => article.tipo)),
    new Set(["medium", "documento", "link-video", "noticia", "paper", "apresentacao"]),
  );
});

test("duplicate registry matches the catalog", () => {
  const catalog = records("public/catalogo.csv");
  const control = records("data/controle-duplicatas.csv");
  assert.equal(control.length, catalog.length);
  assert.equal(new Set(control.map((article) => article.sha256_arquivo)).size, control.length);
  assert.ok(control.every((article) => /^[a-f0-9]{64}$/.test(article.sha256_texto)));
  assert.ok(control.every((article) => /^[a-f0-9]{16}$/.test(article.simhash_texto)));
});

test("GitHub Pages workflow builds from Google Sheets configuration", () => {
  const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(workflow, /VITE_GOOGLE_SHEETS_CSV_URL/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
