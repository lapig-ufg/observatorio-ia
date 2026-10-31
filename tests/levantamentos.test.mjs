import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function moduleFrom(file) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const survey = await moduleFrom("src/levantamentos/surveyLogic.ts");
const { portalPage } = await moduleFrom("src/portalStructure.ts");
const data = JSON.parse(fs.readFileSync("public/levantamentos/politicas-ia/dados.json", "utf8"));

test("os dados publicados batem com a base do levantamento", () => {
  assert.equal(data.rows.length, 149);
  const csv = fs.readFileSync("public/levantamentos/politicas-ia/base-politicas-ia-2026-10.csv", "utf8").replace(/^\uFEFF/, "");
  const table = []; let line = [], cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { line.push(cell); cell = ""; }
    else if (c === "\n" && !quoted) { line.push(cell); table.push(line); line = []; cell = ""; }
    else if (c !== "\r" || quoted) cell += c;
  }
  assert.equal(quoted, false);
  assert.equal(table.length - 1, data.rows.length);
  const fields = ["nome", "tipo", "area", "sub", "geo", "ano", "gen", "loc", "rev", "img", "verif", "url", "nota"];
  data.rows.forEach((row, i) => fields.forEach((field, j) => assert.equal(table[i + 1][j], String(row[field] ?? ""))));
  const gen = survey.countBy(data.rows, row => row.gen);
  const csvGen = survey.countBy(table.slice(1), row => row[6]);
  assert.deepEqual([...gen].sort(), [...csvGen].sort());
  assert.equal([...gen.values()].reduce((a, b) => a + b, 0), data.rows.length);
});

test("periódicos brasileiros com regra seguem os denominadores e as narrativas recalculadas", () => {
  const journals = survey.brazilianJournals(data.rows);
  const withRule = journals.filter(row => row.gen !== "Sem regra").length;
  assert.equal(journals.length, data.rows.filter(row => row.geo.startsWith("Brasil") && row.tipo === "Periódico").length);
  assert.ok(data.brasil[0].includes(`${withRule} de ${journals.length}`));
  assert.ok(data.cross.find(([title]) => title === "Brasil")[1].includes(`${withRule}/${journals.length}`));
});

test("o não se aplica fica fora do denominador, mas é contado à parte", () => {
  const exatas = survey.comparableRows(data.rows).filter(row => row.area === "EXA");
  const counts = survey.categoryCounts(exatas, "gen", survey.GEN_CATEGORIES);
  assert.equal(counts.total + counts.notApplicable, exatas.length);
  assert.equal(counts.parts.reduce((sum, part) => sum + part.rows.length, 0), counts.total);
});

test("filtros combinam busca sem acento, área e abrangência", () => {
  const empty = { query: "", area: "", type: "", gen: "", rev: "", scope: "" };
  assert.equal(survey.filterPolicies(data.rows, { ...empty, gen: "Vedada" }).length, data.rows.filter(row => row.gen === "Vedada").length);
  assert.deepEqual(survey.filterPolicies(data.rows, { ...empty, gen: "N/A" }).map(row => row.nome).sort(), ["DFG", "ERC", "STM — classificação de usos de IA"]);
  assert.ok(survey.filterPolicies(data.rows, { ...empty, query: "educacao" }).some(row => row.nome.includes("Educação")));
  assert.ok(survey.filterPolicies(data.rows, { ...empty, scope: "br" }).every(survey.isBrazilian));
  assert.equal(survey.filterPolicies(data.rows, { ...empty, query: "zzzz" }).length, 0);
});

test("abas do levantamento vêm do hash e caem na visão geral quando desconhecidas", () => {
  assert.equal(survey.surveyTab("#levantamentos/politicas-ia"), "");
  assert.equal(survey.surveyTab("#levantamentos/politicas-ia/entidades"), "entidades");
  assert.equal(survey.surveyTab("#levantamentos/politicas-ia/inexistente"), "");
  assert.equal(portalPage("#levantamentos/politicas-ia/brasil"), "survey");
  assert.equal(portalPage("#levantamentos/politicas-ia", true), "survey");
});

test("negrito em markdown vira trechos marcados sem interpretar HTML", () => {
  assert.deepEqual(survey.boldSegments("**Portaria:** declarar <b>uso</b>"), [{ bold: true, text: "Portaria:" }, { bold: false, text: " declarar <b>uso</b>" }]);
});

const history = JSON.parse(fs.readFileSync(`data/politicas-ia/revisoes/${data.meta.revisao.data}.json`, "utf8"));
const key = row => JSON.stringify([row.tipo,row.nome,row.area,row.geo].map(value => String(value).normalize("NFC").trim()));

test("revisão inventaria todas as identidades e só avança a referência com cobertura integral", () => {
  assert.equal(new Set(data.rows.map(key)).size, data.rows.length);
  assert.equal(new Set(history.entries.map(entry => entry.key)).size, data.rows.length);
  assert.deepEqual(new Set(history.entries.map(entry => entry.key)), new Set(data.rows.map(key)));
  for (const entry of history.entries) {
    const row = data.rows.find(row => key(row) === entry.key);
    if (entry.outcome === "changed") {
      assert.deepEqual(row, entry.after);
      assert.deepEqual(Object.keys(row).filter(field => JSON.stringify(entry.before[field]) !== JSON.stringify(row[field])).sort(), [...entry.changedFields].sort());
      assert.equal(entry.decisions.length, entry.changedFields.length);
    }
    if (entry.outcome === "unresolved") assert.deepEqual(entry.changedFields, []);
    if (entry.outcome !== "unresolved") {
      assert.deepEqual(entry.scopesChecked, ["author", "disclosure", "review", "images"]);
      assert.ok(entry.sources.some(source => source.official && source.access === "read" && /^[a-f0-9]{64}$/.test(source.sha256)));
    }
  }
  const counts = outcome => history.entries.filter(entry => entry.outcome === outcome).length;
  assert.equal(data.meta.revisao.verified, counts("changed") + counts("unchanged"));
  assert.equal(data.meta.revisao.changed, counts("changed"));
  assert.equal(data.meta.revisao.unresolved, counts("unresolved"));
  assert.equal(data.meta.revisao.inventory, data.rows.length);
  if (counts("unresolved")) assert.ok(data.meta.referencia < history.cycle);
  else assert.equal(data.meta.referencia, history.cycle);
  assert.equal(history.summary.canClose, counts("unresolved") === 0);
  assert.equal(data.meta.revisao.status, counts("unresolved") ? "parcial" : "integral");
  assert.deepEqual(history, JSON.parse(fs.readFileSync(`public/${data.meta.revisao.history}`, "utf8")));
});

test("divergências de revisão, imagens e declaração não regressam", () => {
  assert.equal(data.rows.find(row => row.nome === "ICML 2026").gen, "Permitida");
  assert.equal(data.rows.find(row => row.nome === "ICML 2026").loc, "Sem exigência p/ redação");
  assert.equal(data.rows.find(row => row.nome === "USGS").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "Royal Society of Chemistry").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "Royal Society (periódicos)").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "London Mathematical Society").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "RAE (FGV EAESP)").gen, "Vedada");
  assert.equal(data.rows.find(row => row.nome === "Current Anthropology / AAA").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "Scientia Agricola (USP/ESALQ)").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "Thieme").img, "Restritas");
  assert.equal(data.rows.find(row => row.nome === "INFORMS").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "Edward Elgar").gen, "Vedada");
  assert.equal(data.rows.find(row => row.nome === "Rev. Brasileira de Cartografia (SBC-Cartografia)").verif, "H");
  assert.equal(data.rows.find(row => row.nome === "Rev. Brasileira de Zootecnia (SBZ)").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "American Mathematical Society").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "WAME").url, "https://wame.org/page3.php?id=106");
  assert.equal(survey.CATEGORY_LABEL.Permitida, "Permite, com condições");
  const source = fs.readFileSync("src/levantamentos/PoliticasIAPage.tsx", "utf8");
  assert.match(source, /Permitida: "permitem, com condições"/);
  assert.doesNotMatch(source, /permitem, com declaração/);
  assert.equal(survey.VERIFICATION_LABEL.H, "Regra herdada");
  assert.equal(data.rows.find(row => row.nome === "ACM").loc, "Sem exigência p/ redação");
});

test("a página revalida a base para não combinar interface nova com políticas antigas em cache", () => {
  const source = fs.readFileSync("src/levantamentos/PoliticasIAPage.tsx", "utf8");
  assert.match(source, /fetch\(siteAssetUrl\(`\$\{DATA_DIR\}dados\.json`\), \{ signal: controller\.signal, cache: "no-cache" \}\)/);
});

test("a retomada das fontes alternativas preserva as exceções normativas e os códigos canônicos", () => {
  const row = name => data.rows.find(row => row.nome === name);
  assert.equal(row("The Lancet").rev, "Vedado");
  assert.equal(row("The Lancet").loc, "Múltiplos");
  assert.equal(row("ACP (Annals of Internal Medicine)").verif, "P");
  assert.equal(row("Society for Neuroscience (J. Neurosci.)").rev, "Condicionado");
  assert.match(row("AAR / SBL").nota, /não há política conjunta/i);
  assert.equal(row("FAPESP / CAPES / FAPEG").verif, "NL");
  assert.match(row("FAPESP / CAPES / FAPEG").nota, /NL não prova inexistência/);
  assert.ok(data.rows.every(row => row.loc !== "Múltiplos locais"));
});
