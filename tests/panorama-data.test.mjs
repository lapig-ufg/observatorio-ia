import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

/* Fixtures recortadas dos dados reais do Panorama em 15/out/2026:
   data.js inteiro, 14 linhas da aba Lancamentos (com a duplicata real do
   ChatGPT e o "Publicado" com maiúscula) e um recorte do benchmarks.json. */
const source = fs.readFileSync("src/panoramaData.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const panorama = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const fixture = (name) => fs.readFileSync(`tests/fixtures/panorama/${name}`, "utf8");
const config = panorama.panoramaConfigFromDataJs(fixture("data.js"));
const sheet = JSON.parse(fixture("lancamentos-gviz.json"));

test("a configuração sai do data.js do Panorama sem vazar para o escopo global", () => {
  assert.equal(config.companyColors["Moonshot AI"], "#4A90E2");
  assert.equal(config.companyAliases.KIMI, "Moonshot AI");
  assert.equal(config.modelAliases.claude45sonnet, "claudesonnet45");
  assert.equal(config.creatorCountry.Mistral, "França");
  assert.ok(config.logoPaths.OpenAI.startsWith("<path"));
  assert.equal(globalThis.COMPANY_COLORS, undefined);
  assert.equal(globalThis.CONFIG, undefined);
});

test("data.js quebrado ou sem empresas é recusado, para o carregador cair no modo neutro", () => {
  assert.throws(() => panorama.panoramaConfigFromDataJs("const X = ;"));
  assert.throws(() => panorama.panoramaConfigFromDataJs("const COMPANY_COLORS = {};"), /COMPANY_COLORS/);
  assert.equal(panorama.companyColor("OpenAI", panorama.emptyPanoramaConfig), "#6b6860");
});

test("o primeiro lançamento da planilha não é confundido com o cabeçalho", () => {
  const launches = panorama.launchesFromGviz(sheet);
  assert.equal(launches[0].model, "ChatGPT (GPT-3.5)");
  assert.equal(launches[0].date, "2022-11-30");
  assert.equal(launches.filter((launch) => launch.model === "ChatGPT (GPT-3.5)").length, 1, "duplicata real da planilha");
});

test("só publicado e secundario entram, sem depender da caixa do status", () => {
  const launches = panorama.launchesFromGviz(sheet);
  assert.ok(launches.some((launch) => launch.model === "MiMo-V2.5-Pro" && launch.level === 1), "linha com 'Publicado'");
  assert.equal(launches.filter((launch) => launch.level === 2).length, 9);
  assert.ok(launches.every((launch) => /^\d{4}-\d{2}-\d{2}$/.test(launch.date)));
  assert.deepEqual(launches.map((launch) => launch.date), launches.map((launch) => launch.date).sort());

  const pending = structuredClone(sheet);
  pending.table.rows[1].c[5].v = "pendente";
  assert.equal(panorama.launchesFromGviz(pending).some((launch) => launch.model === "GPT-4"), false);
});

test("cabeçalho entregue como primeira linha de dados também é lido", () => {
  const header = sheet.table.cols.map((column) => ({ v: column.label }));
  const response = { status: "ok", table: { cols: sheet.table.cols.map(() => ({ label: "" })), rows: [{ c: header }, ...sheet.table.rows] } };
  assert.deepEqual(panorama.launchesFromGviz(response), panorama.launchesFromGviz(sheet));
});

test("planilha sem coluna obrigatória falha com mensagem clara", () => {
  const broken = structuredClone(sheet);
  broken.table.cols[5].label = "situacao";
  assert.throws(() => panorama.launchesFromGviz(broken), /status/);
  assert.throws(() => panorama.launchesFromGviz({ status: "error" }), /erro/);
});

test("datas da planilha viram ISO sem passar pelo fuso", () => {
  assert.equal(panorama.parseSheetDate("Date(2026,9,15)"), "2026-10-15");
  assert.equal(panorama.parseSheetDate("2026-10-15"), "2026-10-15");
  assert.equal(panorama.parseSheetDate("15/10/2026"), "2026-10-15");
  assert.equal(panorama.parseSheetDate("31/02/2026"), "");
  assert.equal(panorama.parseSheetDate("outubro"), "");
  assert.equal(panorama.daysSinceEpoch("2022-11-30"), 0);
  assert.equal(panorama.daysSinceEpoch("2023-03-14"), 104, "coluna `dias` da planilha para o GPT-4");
});

test("identidade de modelo segue as três regras do Panorama", () => {
  assert.equal(panorama.launchModelKey("Claude 4.5 Sonnet", config), panorama.launchModelKey("Claude Sonnet 4.5", config));
  assert.equal(panorama.launchModelKey("GPT-5.5", config), "chatgpt55");
  assert.notEqual(panorama.catalogModelKey("Command-R+", config), panorama.catalogModelKey("Command-R", config));
  assert.notEqual(panorama.benchmarkModelKey("GPT-5.6 Sol"), panorama.benchmarkModelKey("GPT-5.6 Terra"));
});

test("empresas usam o nome, a cor e o ecossistema canônicos", () => {
  assert.equal(panorama.canonicalCompany("Kimi", config), "Moonshot AI");
  assert.equal(panorama.canonicalCompany("openai", config), "OpenAI");
  assert.equal(panorama.canonicalCompany("Laboratório Novo", config), "Laboratório Novo");
  assert.equal(panorama.companyColor("Z AI", config), config.companyColors["Zhipu AI"]);
  assert.equal(panorama.companyEcosystem("Anthropic", config), "ECOSSISTEMA NORTE-AMERICANO");
  assert.equal(panorama.companyEcosystem("Cohere", config), "ECOSSISTEMA NORTE-AMERICANO");
  assert.equal(panorama.companyEcosystem("DeepSeek", config), "ECOSSISTEMA CHINÊS");
  assert.equal(panorama.companyEcosystem("Mistral", config), "OUTROS PAÍSES");
  assert.equal(panorama.companyEcosystem("Laboratório Novo", config, "Ecossistema Chinês"), "ECOSSISTEMA CHINÊS");
  assert.equal(panorama.companyEcosystem("Laboratório Novo", config), "OUTROS PAÍSES", "país não é chutado");
});

test("nomes agrupados são quebrados em modelos, mas Command-R+ continua inteiro", () => {
  assert.ok(panorama.modelNameParts("Claude 4 (Opus/Sonnet)").includes("Opus"));
  assert.ok(panorama.modelNameParts("o3 / o4-mini").includes("o4-mini"));
  assert.ok(panorama.modelNameParts("Large 3 + Ministral 3").includes("Ministral 3"));
  assert.deepEqual(panorama.modelNameParts("Command-R+"), ["Command-R+"]);
});

test("o catálogo automático não repete o que a curadoria já cobre", () => {
  const launches = panorama.launchesFromGviz(sheet);
  const catalog = panorama.catalogFromJson({
    modelos: [
      { mod: "Claude 4.5 Sonnet", emp: "Anthropic", date: "2025-09-29", score: 50 },
      { mod: "Command-R", emp: "Cohere", date: "2024-03-11", score: 10 },
      { mod: "Command-R+", emp: "Cohere", date: "2024-04-04", score: 12 },
      { mod: "Command-R+", emp: "Cohere", date: "2024-04-04", score: 12 },
      { mod: "GPT-3", emp: "OpenAI", date: "2020-06-11", score: 1 },
      { mod: "Sem data", emp: "OpenAI", date: "2024" },
    ],
  }, config);
  assert.equal(catalog.length, 5);
  assert.deepEqual(panorama.catalogWithoutCurated(catalog, launches, config).map((model) => model.model), ["Command-R", "Command-R+"]);
  assert.throws(() => panorama.catalogFromJson({}, config), /lista de modelos/);
});

test("a versão inglesa traduz por empresa+modelo e nunca esconde lançamento", () => {
  const launches = panorama.launchesFromGviz(sheet);
  const english = {
    status: "ok",
    table: {
      cols: [{ label: "company" }, { label: "model" }, { label: "impact" }],
      rows: [{ c: [{ v: "openai" }, { v: "GPT 4" }, { v: "First big leap after ChatGPT." }] }],
    },
  };
  const translated = panorama.applyTranslations(launches, panorama.translationsFromGviz(english, config), config);
  assert.equal(translated.length, launches.length);
  assert.equal(translated.find((launch) => launch.model === "GPT-4").impact, "First big leap after ChatGPT.");
  assert.equal(translated.find((launch) => launch.model === "GPT-4").untranslated, undefined);
  assert.equal(translated.find((launch) => launch.model === "Claude Sonnet 4.5").untranslated, true);
  // Formato real da aba Lancamentos_EN hoje: vazia.
  assert.equal(panorama.translationsFromGviz({ status: "ok", table: { cols: [{ label: "" }], rows: [] } }, config).size, 0);
});

test("benchmarks são lidos do arquivo da AA e ligados ao lançamento curado", () => {
  const data = panorama.benchmarksFromJson(JSON.parse(fixture("benchmarks.json")), config);
  assert.equal(data.benchmarks.length, 3);
  assert.ok(data.attribution.includes("Artificial Analysis"));
  assert.ok(data.benchmarks.every((bench) => bench.entries.every((entry) => Number.isFinite(entry.score))));

  const launch = { date: "2025-09-29", company: "Anthropic", model: "Claude Sonnet 4.5", impact: "", reference: "", level: 1, sheetGroup: "", addedAt: 0, updatedAt: 0 };
  const synthetic = {
    source: "", sourceUrl: "", attribution: "", fetchedAt: "",
    benchmarks: [{
      key: "coding", label: "Coding Index", category: "Coding", description: "", unit: "", modelsEvaluated: 3,
      entries: [
        { model: "GPT-6 Sol", variant: "", company: "OpenAI", score: 70, releaseDate: "", pricePerMillion: null, tokensPerSecond: null },
        { model: "Claude 4.5 Sonnet", variant: "", company: "Anthropic", score: 40, releaseDate: "", pricePerMillion: 6, tokensPerSecond: null },
        { model: "Claude Sonnet 4.5", variant: "", company: "OutraEmpresa", score: 90, releaseDate: "", pricePerMillion: null, tokensPerSecond: null },
      ],
    }],
  };
  const scores = panorama.benchmarkScoresForLaunch(launch, synthetic, config);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].rank, 3);
  assert.equal(scores[0].of, 3);
  assert.equal(scores[0].entry.pricePerMillion, 6);
});

test("o carregador lê o Panorama vivo e não traz cópia para o Observatório", () => {
  const loader = fs.readFileSync("src/panoramaSource.ts", "utf8");
  assert.match(source, /PANORAMA_SITE = "https:\/\/lapig-ufg\.github\.io\/app-panorama-global-da-ia-generativa\/"/);
  assert.match(loader, /new URL\(`assets\/\$\{path\}`, PANORAMA_SITE\)/);
  assert.doesNotMatch(loader, /["'`]\.{1,2}\/panorama\/|public\/panorama/);
});
