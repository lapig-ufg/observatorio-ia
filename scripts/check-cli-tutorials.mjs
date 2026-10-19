/* Confere se os tutoriais de instalação do "Como usar fora do navegador"
   continuam valendo: os instaladores respondem nos endereços do tutorial, a
   versão LTS do Node é a que o tutorial mostra e os pacotes npm existem.
   Depende de rede e não faz parte do build. Rode `pnpm tutoriais:check` de
   tempos em tempos (ou numa tarefa agendada) e, ao conferir tudo de novo,
   atualize VERIFIED_AT em src/panoramaCliTutorials.ts. */
import fs from "node:fs";
import ts from "typescript";

const load = async (path) => {
  const compiled = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
};
const cli = await load("src/panoramaCliTutorials.ts");
const usage = await load("src/panoramaUsageText.ts");

const failures = [];
const warnings = [];
const check = async (label, run) => {
  try { console.log(`ok    ${label}: ${await run()}`); }
  catch (error) { failures.push(label); console.log(`FALHA ${label}: ${error.message}`); }
};

// 1. Todo endereço https que aparece num comando precisa responder.
const commands = new Set();
for (const tutorial of cli.CLI_TUTORIALS) for (const step of tutorial.steps) for (const os of ["windows", "mac", "linux"]) {
  const command = cli.stepCommand(step, os);
  if (command) commands.add(command);
}
for (const tool of usage.USAGE_TOOLS) { commands.add(tool.install.windows); commands.add(tool.install.unix); }
const urls = new Set([...commands].flatMap((command) => command.match(/https:\/\/[^\s"|]+/g) || []));
await Promise.all([...urls].map((url) => check(url, async () => {
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "observatorio-ufg-tutorial-check" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return `HTTP ${response.status}`;
})));

// 2. A versão LTS do Node que o tutorial mostra.
await check("Node.js LTS", async () => {
  const releases = await (await fetch("https://nodejs.org/dist/index.json")).json();
  const lts = releases.find((release) => release.lts);
  const major = Number(lts.version.slice(1).split(".")[0]);
  if (major !== cli.NODE_LTS_MAJOR) throw new Error(`LTS atual é ${lts.version}; o tutorial usa ${cli.NODE_LTS_VERSION}`);
  if (lts.version !== cli.NODE_LTS_VERSION) warnings.push(`Node LTS agora é ${lts.version} (tutorial mostra ${cli.NODE_LTS_VERSION}; mesma linha, só a saída de exemplo muda).`);
  return lts.version;
});

// 2b. Versões que aparecem no tutorial e mudam no GitHub.
for (const [repo, current, label] of [["nvm-sh/nvm", cli.NVM_VERSION, "nvm (está no endereço do instalador)"], ["ollama/ollama", `v${cli.OLLAMA_EXAMPLE_VERSION}`, "Ollama (só na saída de exemplo)"]]) {
  await check(label, async () => {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { "user-agent": "observatorio-ufg-tutorial-check" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const latest = (await response.json()).tag_name;
    if (latest !== current) warnings.push(`${label}: última versão ${latest}, o tutorial usa ${current}.`);
    return latest;
  });
}

// 3. Os pacotes npm citados existem e de onde vêm.
const packages = new Set([...commands].flatMap((command) => [...command.matchAll(/npm install -g (\S+)/g)].map((match) => match[1])));
await Promise.all([...packages].map((name) => check(`npm ${name}`, async () => {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}/latest`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.deprecated) throw new Error(`descontinuado: ${data.deprecated}`);
  return `v${data.version}`;
})));

// 4. A idade da conferência manual.
const age = cli.verificationAgeDays(Date.now());
if (age > cli.STALE_AFTER_DAYS) warnings.push(`Comandos conferidos há ${age} dias (limite ${cli.STALE_AFTER_DAYS}): a página já mostra o aviso de desatualização.`);
else console.log(`ok    conferência manual: há ${age} dias (aviso na página depois de ${cli.STALE_AFTER_DAYS})`);

for (const warning of warnings) console.log(`AVISO ${warning}`);
if (failures.length) {
  console.log(`\n${failures.length} problema(s). Confira as páginas oficiais em src/panoramaCliTutorials.ts (campo source) e atualize os comandos.`);
  process.exit(1);
}
console.log("\nTudo confere. Se você revisou as saídas de exemplo também, atualize VERIFIED_AT.");
