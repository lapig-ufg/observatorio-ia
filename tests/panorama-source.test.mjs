import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const compile = (path) => ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const uri = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const sourceUri = uri(compile("src/panoramaSource.ts").replace('"./panoramaData"', JSON.stringify(uri(compile("src/panoramaData.ts")))));

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
