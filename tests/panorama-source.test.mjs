import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { freeFixture, usageFixture, scenesFixture } from "./fixtures/panorama/editorial.mjs";

const compile = (path) => ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const uri = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const sourceUri = uri(compile("src/panoramaSource.ts").replace('"./panoramaData"', JSON.stringify(uri(compile("src/panoramaData.ts")))).replace('"./panoramaEditorial"', JSON.stringify(uri(compile("src/panoramaEditorial.ts")))));

test("sair de uma aba não cancela a configuração compartilhada com outra aba", async (t) => {
  const source = await import(sourceUri);
  let complete;
  let requests = 0;
  t.mock.method(globalThis, "fetch", (url, options) => {
    requests++;
    return new Promise((resolve, reject) => {
      complete = () => resolve({ ok: true, text: async () => "const COMPANY_COLORS = { OpenAI: '#123456' };" });
      options.signal?.addEventListener("abort", () => reject(new DOMException("Abortado", "AbortError")));
    });
  });
  const controller = new AbortController();
  const fromTimeline = source.loadPanoramaConfig(controller.signal);
  const fromGuide = source.loadPanoramaConfig();
  controller.abort();
  complete();
  const [timeline, guide] = await Promise.all([fromTimeline, fromGuide]);
  assert.equal(requests, 1);
  assert.equal(timeline.config.companyColors.OpenAI, "#123456");
  assert.equal(guide.config.companyColors.OpenAI, "#123456");
  assert.equal(guide.warning, "");
});

test("abas editoriais pedem os seis scripts vivos por idioma e propagam cancelamento/erros", async (t) => {
  const source = await import(sourceUri);
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    const [name, data] = url.includes("gratuitos") ? ["GRATUITOS_DATA", freeFixture()] : url.includes("cenas") ? ["COMO_USAR_CENAS", scenesFixture()] : ["COMO_USAR_DATA", usageFixture()];
    return { ok: true, text: async () => `const ${name} = ${JSON.stringify(data)};` };
  });
  const controller = new AbortController();
  for (const locale of ["pt", "en"]) {
    assert.equal((await source.loadPanoramaFreeTools(locale, controller.signal)).items.length, 2);
    assert.equal((await source.loadPanoramaUsage(locale, controller.signal)).scenes.cenas.length, 1);
  }
  assert.deepEqual(requests.map(r => new URL(r.url).pathname.split("/").at(-1)), ["gratuitos-data.js", "como-usar-data.js", "como-usar-cenas.js", "gratuitos-data-en.js", "como-usar-data-en.js", "como-usar-cenas-en.js"]);
  assert.ok(requests.every(r => r.url.startsWith("https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/assets/") && r.options.signal === controller.signal && r.options.cache === "no-cache"));
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 503 }));
  await assert.rejects(source.loadPanoramaFreeTools(), /HTTP 503/);
  await assert.rejects(source.loadPanoramaUsage("en"), /HTTP 503/);
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("Cancelado", "AbortError"); });
  await assert.rejects(source.loadPanoramaFreeTools(), { name: "AbortError" });
});
