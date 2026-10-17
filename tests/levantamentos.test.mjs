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
  const csv = fs.readFileSync("public/levantamentos/politicas-ia/base-politicas-ia-2026-10.csv", "utf8").trim().split(/\r?\n/);
  assert.equal(csv.length - 1, data.rows.length);
  const gen = survey.countBy(data.rows, row => row.gen);
  assert.deepEqual([gen.get("Permitida"), gen.get("Restrita"), gen.get("Vedada"), gen.get("Sem regra"), gen.get("N/A")], [98, 20, 8, 19, 4]);
});

test("periódicos brasileiros com regra seguem o texto do levantamento (28 de 36)", () => {
  const journals = survey.brazilianJournals(data.rows);
  assert.equal(journals.length, 36);
  assert.equal(journals.filter(row => row.gen !== "Sem regra").length, 28);
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
  assert.equal(survey.filterPolicies(data.rows, { ...empty, gen: "N/A" }).length, 4);
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

const history = JSON.parse(fs.readFileSync("data/politicas-ia/revisoes/2026-10-17.json", "utf8"));
const key = row => JSON.stringify([row.tipo,row.nome,row.area,row.geo].map(value => String(value).normalize("NFC").trim()));

test("revisão parcial inventaria todas as identidades sem duplicar nem certificar pendências", () => {
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
  assert.equal(data.meta.referencia, "2026-10-16");
  assert.equal(history.summary.canClose, false);
  assert.deepEqual(history, JSON.parse(fs.readFileSync("public/levantamentos/politicas-ia/revisao-2026-10-17.json", "utf8")));
});

test("divergências de revisão, imagens e declaração não regressam", () => {
  assert.equal(data.rows.find(row => row.nome === "London Mathematical Society").rev, "Condicionado");
  assert.equal(data.rows.find(row => row.nome === "RAE (FGV EAESP)").gen, "Vedada");
  assert.equal(data.rows.find(row => row.nome === "Current Anthropology / AAA").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "Scientia Agricola (USP/ESALQ)").loc, "Múltiplos");
  assert.equal(data.rows.find(row => row.nome === "Thieme").img, "Restritas");
});
