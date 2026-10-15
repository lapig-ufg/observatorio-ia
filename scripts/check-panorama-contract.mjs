/* Confere se o Panorama vivo ainda entrega o que src/panoramaData.ts espera:
   aba Lancamentos, data.js, benchmarks e catálogo. Não faz parte do deploy
   (depende de rede); rode `pnpm panorama:check` depois de mudar o Panorama ou
   quando a página do Panorama no Observatório aparecer vazia. */
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/panoramaData.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const panorama = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const editorialCompiled = ts.transpileModule(fs.readFileSync(new URL("../src/panoramaEditorial.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const editorial = await import(`data:text/javascript;base64,${Buffer.from(editorialCompiled).toString("base64")}`);

const asset = (path) => new URL(`assets/${path}`, panorama.PANORAMA_SITE);
const failures = [];
const check = async (label, run) => {
  try {
    console.log(`ok   ${label}: ${await run()}`);
  } catch (error) {
    failures.push(label);
    console.log(`FALHA ${label}: ${error.message}`);
  }
};

// O conteúdo das abas editoriais também é contrato de rede: os seis scripts
// precisam continuar válidos nos dois idiomas, sem guardar uma cópia local.
await Promise.all([
  ["gratuitos-data", "GRATUITOS_DATA"], ["como-usar-data", "COMO_USAR_DATA"], ["como-usar-cenas", "COMO_USAR_CENAS"],
].flatMap(([file, name]) => ["", "-en"].map(suffix => check(`${file}${suffix}.js`, async () => {
  const response = await fetch(asset(`${file}${suffix}.js`));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("sem CORS aberto");
  const data = editorial.editorialFromScript(await response.text(), name);
  return name === "GRATUITOS_DATA" ? `${data.items.length} ferramentas` : name === "COMO_USAR_DATA" ? `${data.tutoriais.length} tutoriais` : `${data.cenas.length} cenas`;
}))));

async function sheet(tab) {
  const callback = "panoramaCheck";
  const url = `https://docs.google.com/spreadsheets/d/${panorama.PANORAMA_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(tab)}&tqx=responseHandler:${callback}`;
  const text = await (await fetch(url)).text();
  return JSON.parse(text.slice(text.indexOf(`${callback}(`) + callback.length + 1, text.lastIndexOf(")")));
}

async function json(path) {
  const response = await fetch(asset(path));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("sem CORS aberto");
  return response.json();
}

let config = panorama.emptyPanoramaConfig;
let launches = [];

await check("data.js", async () => {
  const response = await fetch(asset("data.js"));
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error("sem CORS aberto");
  config = panorama.panoramaConfigFromDataJs(await response.text());
  const companies = Object.keys(config.companyColors);
  const withoutCountry = companies.filter((company) => !panorama.companyCountry(company, config));
  return `${companies.length} empresas, ${Object.keys(config.modelAliases).length} apelidos de modelo` +
    (withoutCountry.length ? `; sem país: ${withoutCountry.join(", ")}` : "");
});

await check("Lancamentos", async () => {
  const response = await sheet(panorama.PANORAMA_LAUNCHES_TAB);
  launches = panorama.launchesFromGviz(response);
  const raw = response.table.rows.length;
  const levels = [1, 2].map((level) => launches.filter((launch) => launch.level === level).length);
  const unknown = [...new Set(launches.map((launch) => launch.company))]
    .filter((company) => !config.companyColors[panorama.canonicalCompany(company, config)]);
  if (!launches.length) throw new Error("nenhum lançamento publicado");
  return `${raw} linhas → ${levels[0]} marcos + ${levels[1]} secundários; último ${launches.at(-1).date}` +
    (unknown.length ? `; empresas sem cadastro em data.js: ${unknown.join(", ")}` : "");
});

await check("Lancamentos_EN", async () => {
  const translations = panorama.translationsFromGviz(await sheet(panorama.PANORAMA_TRANSLATIONS_TAB), config);
  const missing = panorama.applyTranslations(launches, translations, config).filter((launch) => launch.untranslated).length;
  return `${translations.size} traduções; ${missing} lançamentos ainda sem texto em inglês`;
});

for (const file of ["benchmarks.json", "benchmarks-en.json"]) {
  await check(file, async () => {
    const data = panorama.benchmarksFromJson(await json(file), config);
    if (!data.benchmarks.length) throw new Error("nenhum teste");
    return `${data.benchmarks.map((bench) => `${bench.key.replace("artificial_analysis_", "")} (${bench.entries.length})`).join(", ")}; coletado em ${data.fetchedAt.slice(0, 10)}`;
  });
}

await check("catalogo.json", async () => {
  const catalog = panorama.catalogFromJson(await json("catalogo.json"), config);
  const extra = panorama.catalogWithoutCurated(catalog, launches, config);
  return `${catalog.length} modelos; ${catalog.length - extra.length} já cobertos pela curadoria ou repetidos`;
});

if (failures.length) {
  console.error(`\n${failures.length} fonte(s) fora do contrato: ${failures.join(", ")}`);
  process.exit(1);
}
