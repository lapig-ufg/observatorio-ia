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
  const csv = fs.readFileSync("public/levantamentos/politicas-ia/base-politicas-ia-v5.csv", "utf8").trim().split(/\r?\n/);
  assert.equal(csv.length - 1, data.rows.length);
  const gen = survey.countBy(data.rows, row => row.gen);
  assert.deepEqual([gen.get("Permitida"), gen.get("Restrita"), gen.get("Vedada"), gen.get("Sem regra"), gen.get("N/A")], [101, 18, 7, 19, 4]);
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
  assert.equal(survey.filterPolicies(data.rows, { ...empty, gen: "Vedada" }).length, 7);
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
