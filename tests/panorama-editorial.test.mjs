import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { freeFixture, usageFixture, scenesFixture, tutorialSteps } from "./fixtures/panorama/editorial.mjs";

const source = ts.transpileModule(fs.readFileSync("src/panoramaEditorial.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const editorial = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const extract = (value, name) => editorial.editorialFromScript(`const ${name} = ${JSON.stringify(value)};`, name);

test("extrai só a constante solicitada, sem window/document e sem misturar contratos", () => {
  const free = freeFixture();
  const script = `const GRATUITOS_DATA = ${JSON.stringify(free)}; const PRIVATE = 'ignorado'; if(typeof window !== 'undefined' || typeof document !== 'undefined') throw Error('DOM exposto');`;
  assert.deepEqual(editorial.editorialFromScript(script, "GRATUITOS_DATA"), free);
  assert.deepEqual(extract(usageFixture(), "COMO_USAR_DATA"), usageFixture());
  assert.deepEqual(extract(scenesFixture(), "COMO_USAR_CENAS"), scenesFixture());
  assert.throws(() => extract(free, "COMO_USAR_DATA"), /inválidos/);
  assert.throws(() => editorial.editorialFromScript("const OUTRA = {};", "GRATUITOS_DATA"), /inválidos/);
  assert.throws(() => editorial.editorialFromScript("", "process.exit()"), /constante/);
  assert.throws(() => editorial.editorialFromScript("syntax error", "GRATUITOS_DATA"), SyntaxError);
});

test("rejeita catálogo malformado, ids repetidos, categoria ausente e URL executável", () => {
  for (const corrupt of [d => { d.items[0].freeQuota = 42; }, d => { d.items[0].tags = [null]; }, d => { d.source.lastChecked = "ontem"; }, d => { d.updatedAt = "2026-02-31"; }, d => { d.items[0].link = "javascript:alert(1)"; }, d => { d.items[0].category = "inexistente"; }, d => { d.items[1].id = d.items[0].id; }, d => { d.categories.pop(); }, d => { d.categories = []; }]) {
    const data = freeFixture(); corrupt(data);
    assert.throws(() => extract(data, "GRATUITOS_DATA"), /inválidos/);
  }
  const empty = freeFixture(); empty.items = [];
  assert.deepEqual(extract(empty, "GRATUITOS_DATA").items, [], "vazio válido permite estado vazio na UI");
});

test("valida campos aninhados e os quatro tipos de janela, sem aceitar roteiro quebrado", () => {
  for (const corrupt of [d => { d.tutoriais[0].passos = []; }, d => { d.tutoriais[0].passos[0].cmd = ""; }, d => { d.tutoriais[0].passos[1].navegador.url = "data:text/html,x"; }, d => { d.tutoriais[0].passos[2].dialogo.linhas = "não é lista"; }, d => { d.tutoriais[0].passos[3].diff.linhas[0].v = null; }, d => { d.tutoriais[0].passos[0].janela = "desconhecida"; }, d => { delete d.permanencia.mecanismos[0].artefato.linhas; }, d => { d.medicao.passos[0].texto = null; }]) {
    const data = usageFixture(); corrupt(data);
    assert.throws(() => extract(data, "COMO_USAR_DATA"), /inválidos/);
  }
  const scenes = scenesFixture(); scenes.cenas[0].saibaMais = [scenes.cenas[0].saibaMais];
  assert.equal(extract(scenes, "COMO_USAR_CENAS").cenas.length, 1);
  scenes.cenas[0].instalado.narrativa = null;
  assert.throws(() => extract(scenes, "COMO_USAR_CENAS"), /narrativa/);
});

test("crases e asteriscos são convertidos depois do escape; código e artefatos são literais", () => {
  assert.equal(editorial.editorialText('Rode `x < y && z` e **confira**.'), 'Rode <code>x &lt; y &amp;&amp; z</code> e <strong>confira</strong>.');
  assert.equal(editorial.editorialText('`**literal**` <strong>texto</strong>'), '<code>**literal**</code> &lt;strong&gt;texto&lt;/strong&gt;');
  assert.equal(editorial.editorialText('**Rode `x < y`**'), '<strong>Rode <code>x &lt; y</code></strong>');
  assert.equal(editorial.editorialText('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(editorial.editorialHtml('<strong>Texto</strong><br><em>ênfase</em><code>x</code>'), '<strong>Texto</strong><br><em>ênfase</em><code>x</code>');
  assert.equal(editorial.editorialHtml('<strong onclick="x">a</strong><script>x</script>'), '&lt;strong onclick=&quot;x&quot;&gt;a</strong>&lt;script&gt;x&lt;/script&gt;');
  assert.equal(editorial.escapeEditorial('`dados/` **literal**'), '`dados/` **literal**');
  assert.equal(editorial.safeEditorialUrl('javascript:alert(1)'), '');
});

test("busca combina categoria, modelo, empresa, cota e etiquetas sem acentos", () => {
  const items = freeFixture().items;
  for (const query of ["ACADEMICA", "audio", "modelo a", "exemplo", "duas consultas"]) assert.deepEqual(editorial.filterFreeTools(items, "todos", query).map(i => i.id), ["alpha"]);
  assert.equal(editorial.filterFreeTools(items, "codigo", "alpha").length, 0);
  assert.equal(editorial.filterFreeTools(items, "codigo", "")[0].id, "beta");
  assert.equal(editorial.filterFreeTools(items, "todos", "  ").length, 2);
});

test("simulador: vazio não executa; erro registra histórico antes do comando correto", () => {
  const steps = tutorialSteps();
  let state = editorial.initialSimulatorState();
  assert.strictEqual(editorial.simulatorTransition(state, { type: "submit" }, steps), state);
  state = editorial.simulatorTransition(state, { type: "type", value: "toool --name x" }, steps);
  state = editorial.simulatorTransition(state, { type: "submit" }, steps);
  assert.equal(state.phase, "guide"); assert.equal(state.input, "");
  assert.deepEqual(state.attempts, [{ command: "toool --name x", error: "bash: toool: command not found" }]);
  state = editorial.simulatorTransition(state, { type: "type", value: "tool --name errado" }, steps);
  state = editorial.simulatorTransition(state, { type: "submit" }, steps);
  assert.match(state.attempts[1].error, /sintaxe/);
  state = editorial.simulatorTransition(state, { type: "type", value: `  ${steps[0].cmd}  ` }, steps);
  const before = structuredClone(state);
  state = editorial.simulatorTransition(state, { type: "submit" }, steps);
  assert.equal(state.phase, "done"); assert.equal(state.attempts.length, 2);
  assert.deepEqual(before.attempts, state.attempts, "acerto conserva tentativas anteriores");
  assert.equal(before.phase, "guide", "transição não modifica o estado recebido");
});

test("simulador: três superfícies usam as mesmas transições, quatro janelas, voltar e recomeçar", () => {
  const steps = tutorialSteps();
  let state = editorial.initialSimulatorState();
  assert.strictEqual(editorial.simulatorTransition(state, { type: "next" }, steps), state, "não pula passo incompleto");
  assert.strictEqual(editorial.simulatorTransition(state, { type: "back" }, steps), state);
  for (let i = 0; i < steps.length; i++) {
    assert.equal(state.step, i);
    state = editorial.simulatorTransition(state, { type: "demonstrate" }, steps);
    assert.equal(state.phase, "done");
    assert.strictEqual(editorial.simulatorTransition(state, { type: "type", value: "x" }, steps), state);
    state = editorial.simulatorTransition(state, { type: "next" }, steps);
  }
  assert.equal(state.phase, "end");
  state = editorial.simulatorTransition(state, { type: "back" }, steps);
  assert.equal(state.step, 2); assert.equal(state.phase, "guide"); assert.deepEqual(state.attempts, []);
  assert.deepEqual(editorial.simulatorTransition(state, { type: "restart" }, steps), editorial.initialSimulatorState());
});

test("espelho separa prefixo certo, divergência e sugestão, inclusive excedentes", () => {
  assert.deepEqual(editorial.commandMirror("to", "tool --help"), { correct: "to", incorrect: "", remaining: "ol --help" });
  assert.deepEqual(editorial.commandMirror("toll", "tool --help"), { correct: "to", incorrect: "ll", remaining: " --help" });
  assert.deepEqual(editorial.commandMirror("tool x", "tool"), { correct: "tool", incorrect: " x", remaining: "" });
});

test("alvos de navegador, diálogo e diff avançam diretamente, sem exigir comando de terminal", () => {
  const steps = tutorialSteps();
  for (let i = 1; i < steps.length; i++) {
    const state = { ...editorial.initialSimulatorState(), step: i };
    const next = editorial.simulatorTransition(state, { type: "next" }, steps);
    assert.equal(next.phase, i === steps.length - 1 ? "end" : "guide");
    assert.equal(next.step, Math.min(i + 1, steps.length - 1));
  }
});
