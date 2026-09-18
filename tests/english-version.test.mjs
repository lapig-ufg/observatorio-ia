import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function parseCsv(input) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index], next = input[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows[0];
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]))).filter((record) => record.id);
}

test("English catalog preserves source identity and access fields", () => {
  const pt = parseCsv(fs.readFileSync("public/catalogo.csv", "utf8"));
  const en = parseCsv(fs.readFileSync("public/catalogo-en.csv", "utf8"));
  assert.equal(en.length, pt.length);
  const enById = new Map(en.map((record) => [record.id, record]));
  for (const record of pt) {
    const translated = enById.get(record.id);
    assert.ok(translated, `missing English record ${record.id}`);
    for (const field of ["ativo", "tipo", "url_original", "url_pdf_institucional", "capa", "idioma", "data_inclusao"]) {
      assert.equal(translated[field], record[field], `${record.id}: ${field} changed`);
    }
  }
  const active = en.filter((record) => record.ativo === "TRUE");
  assert.ok(active.every((record) => record.tema && record.subtema && record.titulo && record.resumo && record.palavras_chave));
  assert.ok(active.every((record) => !/carregando|loading data|#(?:error|value|n\/a|ref)/i.test([record.tema, record.subtema, record.titulo, record.resumo, record.palavras_chave].join(" "))));
});

test("English route selects the translated catalog and provides a language switch", () => {
  const main = fs.readFileSync("src/main.tsx", "utf8");
  const catalog = fs.readFileSync("src/catalog.ts", "utf8");
  const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
  const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(main, /locale === "en" \? <AppEnglish \/> : <App \/>/);
  assert.match(catalog, /VITE_GOOGLE_SHEETS_EN_GID/);
  assert.match(catalog, /catalogo-en\.csv/);
  assert.match(english, /Português/);
  assert.match(english, /Collection topic radar/);
  assert.match(english, /observatorio-ia\/panorama\/en\//);
  assert.match(english, /href="#panorama"/);
  assert.match(english, /Global Generative AI Landscape/);
  assert.doesNotMatch(english, /generative AI · PT/);
  assert.match(workflow, /GOOGLE_SHEETS_EN_GID/);
});

test("English homepage includes the interactive lesson, OBIA and the complete featured history", () => {
  const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
  assert.match(english, /Inside AI/);
  assert.match(english, /From a sentence to the next token/);
  assert.match(english, /href=\{assetUrl\("por-dentro-da-ia\/"\)\}/);
  assert.match(english, /Healthy vegetation has high reflectance in the near infrared\./);
  assert.match(english, /Brazilian Artificial Intelligence Observatory/);
  assert.match(english, /What has been featured before\?/);
  assert.match(english, /Previously featured topics/);
  assert.equal((english.match(/eventLabel: "/g) || []).length, 9);
});

test("English version includes the UFG ecosystem and linked curator emails", () => {
  const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
  const locale = fs.readFileSync("src/locale.ts", "utf8");
  assert.match(english, /href="#ufg-ecosystem"/);
  assert.match(english, /UFG ecosystem in artificial intelligence/);
  assert.match(english, /Graduate Program in Intelligent Systems and Agents/);
  assert.match(english, /Mapping AI initiatives at UFG/);
  assert.doesNotMatch(english, /UFG ecosystem <small>\(PT\)<\/small>/);
  assert.match(english, /mailto:laerte@ufg\.br/);
  assert.match(english, /mailto:victor\.amaral@ufg\.br/);
  assert.match(english, /mailto:tiagogoncalves@discente\.ufg\.br/);
  assert.match(locale, /#ufg-ecosystem/);
  assert.match(locale, /#ecossistema-ufg/);
});

test("translated catalog preserves the same public scientific-paper selection", async () => {
  const source = fs.readFileSync("src/paperResearch.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { isPublicResearchPaper } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  const asArticles = (file) => parseCsv(fs.readFileSync(file, "utf8")).filter((record) => record.ativo === "TRUE").map((record) => ({
    id: record.id, type: record.tipo, theme: record.tema, title: record.titulo,
    summary: record.resumo, tags: record.palavras_chave.split("|").map((tag) => tag.trim()),
  }));
  const portuguese = asArticles("public/catalogo.csv").filter(isPublicResearchPaper).map((article) => article.id).sort();
  const english = asArticles("public/catalogo-en.csv").filter(isPublicResearchPaper).map((article) => article.id).sort();
  assert.equal(portuguese.length, 141);
  assert.deepEqual(english, portuguese);
});

test("build creates a direct English entry point with parent asset URLs", () => {
  const script = fs.readFileSync("scripts/include-english-entry.mjs", "utf8");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.match(script, /dist\/en\/index\.html|en\/index\.html/);
  assert.match(pkg.scripts["build:all"], /include-english-entry/);
});
