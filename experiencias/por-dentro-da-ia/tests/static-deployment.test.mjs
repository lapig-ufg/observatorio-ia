import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

test("all built local assets resolve under the GitHub Pages project path", () => {
  const html = readFileSync("dist/index.html", "utf8");
  const paths = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(match => match[1]);
  assert.ok(paths.some(path => path.endsWith(".js")));
  assert.ok(paths.some(path => path.endsWith(".css")));
  for (const path of paths) {
    assert.ok(path.startsWith("/observatorio-ia/por-dentro-da-ia/"), path);
    assert.ok(existsSync(`dist/${path.slice("/observatorio-ia/por-dentro-da-ia/".length)}`), path);
  }
  assert.ok(existsSync("dist/og.png"));
  assert.match(html, /href="\/observatorio-ia\/#experiencias-interativas"/);
  assert.match(html, /Voltar ao Observatório/);
  assert.doesNotMatch(html, /<!--app-html-->|\/app\/main.tsx|_next\/|chatgpt-auth/);
  assert.match(html, /https:\/\/lapig-ufg.github.io\/observatorio-ia\/por-dentro-da-ia\//);
});
