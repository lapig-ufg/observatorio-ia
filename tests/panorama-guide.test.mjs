import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function isolated(path) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const guide = await isolated("src/panoramaGuide.ts");
const panorama = await isolated("src/panoramaData.ts");
const entry = (model, score, pricePerMillion = 2, tokensPerSecond = 50) => ({ model, score, company: "OpenAI", variant: "", releaseDate: "", pricePerMillion, tokensPerSecond });
const benchmark = (key, entries, top = entries) => ({ key, label: key, category: "", description: "", unit: "0–100", isFraction: false, modelsEvaluated: entries.length, entries, top });
const data = (benchmarks) => ({ source: "AA", sourceUrl: "", attribution: "", fetchedAt: "", modelsTotal: 50, benchmarks });

test("cada categoria usa somente seu índice principal, sem somar testes de apoio", () => {
  const categories = guide.GUIDE_CATEGORIES;
  const bm = data(categories.map((cat, n) => benchmark(cat.primary, [entry(`líder${n}`, 100), entry(`segundo${n}`, 90)])));
  bm.benchmarks.push(benchmark("gpqa_diamond", [entry("apoio", 999)]));
  for (let n = 0; n < categories.length; n++) {
    const rows = guide.rankedList(guide.primaryBench(bm, categories[n]), "best");
    assert.deepEqual(rows.map(r => r.entry.model), [`líder${n}`, `segundo${n}`]);
    assert.deepEqual(rows.map(r => r.baseRank), [1, 2]);
    assert.ok(categories[n].pt.compositionParts.length);
    assert.ok(categories[n].en.question);
  }
  assert.equal(categories[1].pt.blockWeight, "24%");
  assert.equal(categories[2].en.blockWeight, "34%");
  assert.equal(guide.firstCategoryWithData(data([bm.benchmarks[1]])).id, "codigo");
  assert.equal(guide.firstCategoryWithData(data([])), null);
});

test("custo-benefício e velocidade aplicam piso inclusivo de 88%, sem promover dado ausente", () => {
  const bench = benchmark("test", [entry("líder", 100, 10, 30), entry("limite", 88, 1, 100), entry("barato fraco", 87.99, .01, 999), entry("sem dados", 95, 0, null)]);
  for (const mode of ["value", "fast"]) {
    const rows = guide.rankedList(bench, mode);
    assert.deepEqual(rows.map(r => r.entry.model), ["limite", "líder", "sem dados", "barato fraco"]);
    assert.equal(rows[2].metric, 0);
    assert.equal(rows[3].belowFloor, true);
    assert.equal(rows[3].metric, 0);
    assert.equal(rows[0].baseRank, 2);
  }
  assert.equal(guide.formatGuidePrice(0), null);
  assert.equal(guide.formatGuideSpeed(null), null);
  assert.equal(guide.formatGuideScore(true, 92.3), "92,3%");
  assert.equal(guide.formatGuideScore(true, 92.3, true), "92.3%");
  assert.equal(guide.barPercent({ metric: 0 }, 100), 0);
});

test("comparação limita a quatro, permite remover no teto e não colapsa famílias via apelido", () => {
  let selected = [];
  for (const name of ["a", "b", "c", "d", "e"]) selected = guide.toggleCompareKey(selected, name);
  assert.deepEqual(selected, ["a", "b", "c", "d"]);
  assert.deepEqual(guide.toggleCompareKey(selected, "b"), ["a", "c", "d"]);
  const names = ["GPT-5.6 Sol", "GPT-5.6 Terra", "GPT-5.6 Luna"];
  for (const name of [...names, "Cláude 4.5 Sonnet"]) assert.equal(guide.guideModelKey(name), panorama.benchmarkModelKey(name));
  assert.equal(new Set(names.map(guide.guideModelKey)).size, 3);
});

test("busca e comparação usam full para postos e top para preço e velocidade", () => {
  const bench = benchmark(guide.GUIDE_CATEGORIES[0].primary, [entry("topo", 100, null, null), entry("fora do top", 80, null, null)], [entry("topo", 100, 4, 75)]);
  const index = guide.buildModelIndex(data([bench]));
  assert.equal(index.get("topo").price, 4);
  assert.equal(index.get("topo").speed, 75);
  assert.equal(index.get("foradotop").cats.geral.rank, 2);
  assert.equal(index.get("foradotop").price, null);
  assert.equal(guide.searchSuggestions(index, "fora do top", []).length, 1);
  assert.equal(guide.searchSuggestions(index, "FORA-DO-TOP", []).length, 1);
  assert.equal(guide.searchSuggestions(index, "topo", ["topo"]).length, 0);
  assert.equal(guide.searchSuggestions(index, "!!!", []).length, 0);
  assert.equal(guide.searchSuggestions(index, "tópo", []).length, 1);
});

test("vitórias contam só capacidade; empates vencem para ambos, preço menor e velocidade maior", () => {
  const profiles = [
    { key: "a", cats: { geral: { score: 90, rank: 2, isFraction: false } }, price: 5, speed: 100 },
    { key: "b", cats: { geral: { score: 90, rank: 2, isFraction: false }, codigo: { score: 80, rank: 1, isFraction: false } }, price: 1, speed: 50 },
  ];
  const result = guide.comparisonTable(profiles, false);
  assert.deepEqual(result.wins, [1, 2]);
  assert.equal(result.maxWins, 2);
  assert.ok(result.rows[0].cells.every(c => c.isWinner));
  assert.equal(result.rows[1].cells[0], null);
  assert.equal(result.rows.find(r => r.kind === "price").cells[1].isWinner, true);
  assert.equal(result.rows.find(r => r.kind === "speed").cells[0].isWinner, true);
});

test("Spearman: listas iguais, inversas, interseção parcial e amostra insuficiente", () => {
  const values = Array.from({ length: 12 }, (_, n) => entry(`m${n}`, 100 - n));
  const a = benchmark("a", values);
  assert.deepEqual(guide.spearman(a, a), { rho: 1, n: 12 });
  const b = benchmark("b", values.map((e, n) => ({ ...e, score: n })));
  assert.equal(guide.spearman(a, b).rho, -1);
  const partial = benchmark("partial", [entry("extra", 200), ...values.slice(2)]);
  assert.deepEqual(guide.spearman(a, partial), { rho: 1, n: 10 });
  assert.equal(guide.spearman(a, benchmark("tiny", values.slice(0, 9))), null);
  const bits = guide.overlapBits(data([benchmark(guide.GUIDE_CATEGORIES[0].primary, values), benchmark(guide.GUIDE_CATEGORIES[1].primary, b.entries)]), guide.GUIDE_CATEGORIES[0], false);
  assert.equal(bits[0].rho, -1);
  assert.equal(bits[0].on, 12);
});

test("apoios envelhecidos somem; outros testes usam notas da lista completa", () => {
  const entries = Array.from({ length: 6 }, (_, n) => entry(`m${n}`, 100 - n));
  const cat = guide.GUIDE_CATEGORIES[0];
  const primary = benchmark(cat.primary, entries);
  const stale = benchmark("gpqa_diamond", entries.slice(0, 4));
  const current = benchmark("hle", entries, entries.slice(0, 1));
  const supports = guide.supportMaps(data([primary, stale, current]), cat);
  assert.equal(supports.length, 1);
  assert.equal(supports[0].bench.key, "hle");
  assert.equal(supports[0].map.get("m5").rank, 6);
});

test("deep-link guia ↔ régua preserva empresa, data, Unicode e nomes com +, usando aliases só no vínculo", () => {
  const config = { ...panorama.emptyPanoramaConfig, modelAliases: { claude45sonnet: "claudesonnet45", gpt56sol: "gpt56" } };
  const launch = { model: "Claude Sonnet 4.5", company: "Anthropic", date: "2026-01-02", level: 2 };
  const grouped = { model: "GPT-5.6", company: "OpenAI", date: "2026-02-03", level: 1 };
  const launches = [launch, grouped, { ...launch, company: "Outra" }];
  const hit = panorama.launchForModel("Claude 4.5 Sonnet", "Anthropic", launches, config);
  assert.equal(hit, launch);
  const request = guide.parseRulerDeepLink(guide.rulerModelHref(hit.model, hit.company, hit.date));
  assert.equal(panorama.launchForModel(request.model, request.company, launches, config, request.date), launch);
  assert.equal(panorama.launchForModel("GPT-5.6 Sol", "OpenAI", launches, config), grouped);
  assert.equal(panorama.launchForModel("GPT-5.6 Sol", "Outra", launches, config), null);
  assert.equal(panorama.launchForModel("Claude", "Anthropic", launches, config), null, "sem aproximação fuzzy");
  const encoded = guide.parseRulerDeepLink(guide.rulerModelHref("Command R+ / Á", "Empresa & Filhos", "2026-03-04"));
  assert.deepEqual(encoded, { model: "Command R+ / Á", company: "Empresa & Filhos", date: "2026-03-04" });
  assert.equal(guide.parseRulerDeepLink(guide.rulerCompanyHref("Moonshot AI")).company, "Moonshot AI");
  assert.equal(guide.parseRulerDeepLink("#panorama/guia"), null);
  assert.equal(guide.parseRulerDeepLink("#panorama?sem=valor"), null);
  assert.equal(guide.parseGuideDeepLink(guide.guideModelHref("GPT-5.6 Sol")), panorama.benchmarkModelKey("GPT-5.6 Sol"));
  assert.equal(guide.parseGuideDeepLink("#panorama?modelo=outro"), "");
  const groupedNames = { ...grouped, model: "o3 / o4-mini" };
  assert.equal(panorama.launchForModel("o4-mini", "OpenAI", [groupedNames], config), groupedNames);
  assert.equal(panorama.launchForModel(launch.model, launch.company, [launch], config, "2026-04-05"), null);
});

test("deep-link da revisão encontra a mesma pílula quando a população ampliada chega depois", () => {
  const request = guide.parseRulerDeepLink("#panorama?modelo=Claude%20Opus%205.5&empresa=Anthropic&data=2026-09-22");
  const target = { model: "Claude Opus 5.5", company: "Anthropic", date: "2026-09-22", level: 1 };
  const other = { ...target, date: "2026-09-21", level: 2 };
  const config = panorama.emptyPanoramaConfig;
  const find = launches => panorama.launchForModel(request.model, request.company, launches, config, request.date);
  assert.strictEqual(find([other, target]), target);
  assert.strictEqual(find([other, target, { ...target, company: "Outra", level: 3 }]), target);
  assert.equal(`${target.date}|${target.company}|${target.model}`, "2026-09-22|Anthropic|Claude Opus 5.5");
});

test("o parser preserva listas ricas e completas separadas, com fallback para JSON antigo", () => {
  const raw = { models_total: 80, benchmarks: [{ key: "test", is_fraction: true, top: [{ model: "modelo", creator: "OpenAI", score: 95, price_1m_blended: 2, tok_per_sec: 50 }], full: [{ model: "modelo", creator: "OpenAI", score: 95 }, { model: "outro", creator: "OpenAI", score: 80 }] }] };
  const parsed = panorama.benchmarksFromJson(raw, panorama.emptyPanoramaConfig);
  assert.equal(parsed.modelsTotal, 80);
  assert.equal(parsed.benchmarks[0].entries.length, 2);
  assert.equal(parsed.benchmarks[0].top[0].pricePerMillion, 2);
  assert.equal(parsed.benchmarks[0].isFraction, true);
  delete raw.benchmarks[0].full;
  assert.equal(panorama.benchmarksFromJson(raw, panorama.emptyPanoramaConfig).benchmarks[0].entries.length, 1);
});
