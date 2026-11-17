import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = ts.transpileModule(fs.readFileSync("src/guiaModelos.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const g = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const variant = (effort, intelligence, cost, e2e, extra = {}) => ({ effort, label: effort, scores: { intelligence, finance: null, strategy: null, legal: null, health: null, engineering: null, economics: null, ...extra }, cost_per_task: cost, e2e_s: e2e, tps: 50, ttft_s: 1, price: { blended_3_1: 5 } });
const json = {
  fetched_at: "2026-11-17T15:47:03Z", intelligence_index_version: 5,
  families: [
    { id: "opus", name: "Opus", creator: "Anthropic", variants: [variant("max", 59.1, 10.04, 750), variant("low", 34.8, 0.98, 10), variant("medium", 48.2, 2.45, 17), variant("xhigh", 57.4, 6.05, 139), variant("high", 51.8, 3.46, 40)] },
    { id: "sol", name: "Sol", creator: "OpenAI", variants: [variant("medium", 46.3, 0.36, 15), variant("max", 58.5, 1.27, 277)] },
    { id: "sem-nota", name: "Sem nota", creator: "X", variants: [variant("single", null, 1, 1, { strategy: 12 })] },
    { id: "", name: "inválida", variants: [] },
  ],
};

test("lê o guia-modelos.json, ordena os esforços e não transforma ausência em zero", () => {
  const models = g.modelsFromJson(json);
  assert.equal(models.families.length, 3);
  const opus = models.families[0];
  assert.deepEqual(opus.variants.map((v) => v.effort), ["low", "medium", "high", "xhigh", "max"]);
  assert.equal(opus.variants[0].costPerTask, 0.98);
  assert.equal(models.families[2].variants[0].scores.intelligence, null);
  assert.equal(models.indexVersion, 5);
});

test("o ranking usa o melhor resultado e marca empate abaixo de 1 ponto", () => {
  const rows = g.rankFamilies(g.modelsFromJson(json), "intelligence");
  assert.deepEqual(rows.map((r) => [r.family.id, r.score, r.top.effort, r.floor]), [["opus", 59.1, "max", 34.8], ["sol", 58.5, "max", 46.3]]);
  assert.equal(rows[1].tieWithPrevious, true, "0,6 ponto é empate");
  assert.equal(g.isTie(59.1, 58.0), false);
});

test("a escada mostra pontos, custo e tempo de cada degrau", () => {
  const opus = g.modelsFromJson(json).families[0];
  const steps = g.effortSteps(opus, "intelligence");
  assert.equal(steps.length, 4);
  assert.equal(steps[0].points.toFixed(1), "13.4");
  assert.equal(steps[0].costRatio.toFixed(2), "2.50");
  const self = g.compareVariants(opus.variants[1], opus.variants[4], "intelligence");
  assert.equal(self.points.toFixed(1), "10.9");
  assert.equal(Math.round(self.timeRatio), 44);
});

test("a fronteira só guarda quem ninguém supera com nota maior e custo menor", () => {
  const models = g.modelsFromJson(json);
  const front = g.frontier(g.chartPoints(models.families, "intelligence", "cost"));
  assert.deepEqual(front.map((p) => `${p.family.id}:${p.variant.effort}`), ["sol:medium", "sol:max", "opus:max"]);
});

test("parecido com: mesma faixa de nota, custo e tempo relativos", () => {
  const models = g.modelsFromJson(json);
  const opus = models.families[0];
  const similar = g.similarTo(models, opus, opus.variants[1], "intelligence", 2);
  assert.deepEqual(similar.map((s) => `${s.family.id}:${s.variant.effort}`), ["sol:medium"]);
  assert.equal(similar[0].costRatio.toFixed(2), "0.15");
});

test("as outras fontes ficam separadas e a correlação usa postos", () => {
  const models = g.modelsFromJson(json);
  const sources = g.sourcesFromJson({ sources: { lmarena: { name: "LMArena", url: "u" } }, families: {
    opus: { lmarena: [{ effort: "high", overall: { rating: 1514, lower: 1508, upper: 1520 }, categories: {} }] },
    sol: { lmarena: [{ effort: "max", overall: { rating: 1445 }, categories: {} }] },
  } });
  const { points } = g.voices(models, sources);
  const opus = points.find((p) => p.family.id === "opus");
  assert.equal(opus.aaVariant.effort, "high", "usa a nota da AA no esforço que o LMArena mediu");
  assert.equal(g.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(g.spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1);
  assert.equal(Math.round(g.eloWinShare(1514, 1445) * 100), 60);
});

test("a equipe entra no esforço padrão do fabricante quando o plano não informa", () => {
  const models = g.modelsFromJson(json);
  const plans = g.plansFromJson({ checked_at: "2026-11-17", plans: [{ id: "claude-pro", provider: "Anthropic", name: "Pro", families: [{ id: "opus", efforts: null }] }], defaults: { opus: { effort: "medium" } } });
  const [member] = g.teamFrom(models, plans, ["claude-pro"], []);
  assert.equal(member.variant.effort, "medium");
  assert.equal(member.effortSource, "default");
  const [chosen] = g.teamFrom(models, plans, ["claude-pro"], [], { opus: "max" });
  assert.equal(chosen.variant.effort, "max");
  assert.deepEqual(g.teamFrom(models, plans, [], ["sol"]).map((m) => m.variant.effort), ["max"]);
});

test("formatos em português e inglês", () => {
  assert.equal(g.formatScore(48.25), "48,3");
  assert.equal(g.formatScore(48.25, true), "48.3");
  assert.equal(g.formatCost(0.0421), "US$ 0,042");
  assert.equal(g.formatTime(750), "13 min");
  assert.equal(g.formatTime(17), "17 s");
  assert.equal(g.formatRatio(44.1), "44×");
  assert.equal(g.formatDelta(-2.04), "−2,0");
});
