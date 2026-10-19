import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

/* Os tutoriais do computador simulado dependem do sistema de quem lê e do
   Node.js. Este arquivo transpila o módulo puro e confere cada combinação. */
const source = fs.readFileSync("src/panoramaCliTutorials.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const cli = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const systems = ["windows", "mac", "linux"];
const profiles = systems.flatMap((os) => ["yes", "no"].map((node) => ({ os, node })));

test("o sistema detectado é só um ponto de partida plausível", () => {
  assert.equal(cli.detectOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "windows");
  assert.equal(cli.detectOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)", "MacIntel"), "mac");
  assert.equal(cli.detectOs("Mozilla/5.0 (X11; Ubuntu; Linux x86_64)"), "linux");
  assert.equal(cli.detectOs("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "windows", "celular cai no sistema mais comum dos computadores");
});

test("cada perfil tem um roteiro completo: todo passo de terminal tem comando e todo diálogo tem botão", () => {
  for (const tutorial of cli.CLI_TUTORIALS) for (const profile of profiles) {
    const steps = cli.resolveSteps(tutorial, profile);
    assert.ok(steps.length >= 6, `${tutorial.id} ${profile.os}/${profile.node}`);
    assert.equal(new Set(steps.map((step) => step.id)).size, steps.length, "ids únicos");
    for (const step of steps) {
      const label = `${tutorial.id}:${step.id}:${profile.os}`;
      if (step.window === "terminal") assert.ok(cli.stepCommand(step, profile.os).trim(), `${label} sem comando`);
      if (step.window === "dialog") assert.ok(step.dialog?.button.pt && step.dialog.button.en, `${label} sem botão`);
      if (step.window === "browser") assert.match(step.browser.url, /^https:\/\//, label);
      const explain = cli.pick(step.explain, profile.os);
      assert.ok(explain.pt && explain.en, `${label} sem explicação nos dois idiomas`);
      assert.ok(Array.isArray(cli.stepOutput(step, profile)), label);
    }
  }
});

test("o Node.js só entra no caminho de quem não tem, e cada sistema instala do jeito recomendado", () => {
  const ollama = cli.CLI_TUTORIALS.find((t) => t.id === "ollama");
  const ids = (profile) => cli.resolveSteps(ollama, profile).map((step) => step.id);
  for (const os of systems) {
    assert.ok(ids({ os, node: "yes" }).includes("node-check"), "todos conferem a versão");
    assert.ok(!ids({ os, node: "yes" }).some((id) => id.startsWith("node-install")), "quem tem não reinstala");
    assert.ok(ids({ os, node: "no" }).includes("node-reopen"), "reabrir o terminal depois de instalar");
  }
  assert.ok(ids({ os: "windows", node: "no" }).includes("node-install-win"));
  assert.ok(!ids({ os: "windows", node: "no" }).includes("node-install-nvm"));
  assert.ok(ids({ os: "mac", node: "no" }).includes("node-install-nvm"));
  assert.ok(ids({ os: "linux", node: "no" }).includes("node-nvm-install"));
  const check = ollama.steps.find((step) => step.id === "node-check");
  assert.equal(cli.stepOutput(check, { os: "linux", node: "yes" })[0].v, cli.NODE_LTS_VERSION);
  assert.match(cli.stepOutput(check, { os: "mac", node: "no" })[0].v, /command not found: node/);
  assert.equal(cli.CLI_TUTORIALS.find((t) => t.id === "antigravity").needsNode, false);
});

test("os comandos de instalação mudam com o sistema e usam endereços oficiais", () => {
  for (const tutorial of cli.CLI_TUTORIALS) {
    const install = tutorial.steps.find((step) => step.id === "install");
    assert.match(cli.stepCommand(install, "windows"), /^irm https:\/\/\S+\.ps1 \| iex$/);
    assert.match(cli.stepCommand(install, "mac"), /^curl -fsSL https:\/\/\S+ \| (ba)?sh$/);
    assert.equal(cli.stepCommand(install, "mac"), cli.stepCommand(install, "linux"));
    for (const os of systems) assert.match(cli.stepCommand(install, os), /https:\/\/(ollama\.com|antigravity\.google)\//);
  }
});

test("o terminal confere o comando como um shell: espaços sobram, letras contam (menos no PowerShell)", () => {
  assert.ok(cli.commandMatches("  ollama   --version ", "ollama --version", "linux"));
  assert.ok(!cli.commandMatches("Ollama --version", "ollama --version", "mac"));
  assert.ok(cli.commandMatches("IRM https://ollama.com/install.ps1 | IEX", "irm https://ollama.com/install.ps1 | iex", "windows"));
  assert.match(cli.wrongCommandOutput("olama --version", "ollama --version", "linux", false)[0].v, /olama: command not found/);
  assert.match(cli.wrongCommandOutput("olama", "ollama", "windows", false)[0].v, /não é reconhecido/);
  assert.match(cli.wrongCommandOutput("ollama --versao", "ollama --version", "mac", false)[0].v, /argumento inválido/);
});

test("a conferência tem data e o aviso de desatualização liga sozinho", () => {
  assert.match(cli.VERIFIED_AT, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(cli.verificationAgeDays(Date.parse(`${cli.VERIFIED_AT}T12:00:00Z`)), 0);
  assert.ok(cli.verificationAgeDays(Date.parse(`${cli.VERIFIED_AT}T00:00:00Z`) + (cli.STALE_AFTER_DAYS + 1) * 86_400_000) > cli.STALE_AFTER_DAYS);
  for (const tutorial of cli.CLI_TUTORIALS) assert.ok(tutorial.sources.every((s) => s.url.startsWith("https://")));
});

test("quem lê em inglês escreve ao agente em inglês e lê a resposta em inglês", () => {
  for (const tutorial of cli.CLI_TUTORIALS) for (const step of tutorial.steps.filter((s) => s.prompt === "agent" && s.id !== "codex-exit")) {
    assert.ok(step.cmdEn && step.outEn, `${tutorial.id}:${step.id}`);
    assert.notEqual(cli.stepCommand(step, "linux", "en"), cli.stepCommand(step, "linux", "pt"));
  }
  assert.match(cli.notFound("windows", "node", "en")[0].v, /is not recognized/);
});
