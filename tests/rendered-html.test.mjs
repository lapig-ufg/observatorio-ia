import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the real catalog instead of the starter preview", async () => {
  const [page, layout, catalog, component] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/catalog.generated.ts", root), "utf8"),
    readFile(new URL("app/components/Catalog.tsx", root), "utf8"),
  ]);

  assert.match(page, /<Catalog articles=\{articles\} mode="public"/);
  assert.match(layout, /Observatório IA/);
  assert.equal((catalog.match(/"id":/g) ?? []).length, 63);
  assert.match(component, /Busque por título, autor, tema ou palavra-chave/);
  assert.doesNotMatch(`${page}\n${layout}`, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("restricts the student collection to institutional domains", async () => {
  const [studentPage, policy, pdfRoute] = await Promise.all([
    readFile(new URL("app/alunos/page.tsx", root), "utf8"),
    readFile(new URL("app/auth-policy.ts", root), "utf8"),
    readFile(new URL("app/api/pdf/[id]/route.ts", root), "utf8"),
  ]);

  assert.match(studentPage, /requireChatGPTUser\("\/alunos"\)/);
  assert.match(policy, /"ufg\.br"/);
  assert.match(policy, /"discente\.ufg\.br"/);
  assert.match(policy, /"egresso\.ufg\.br"/);
  assert.match(pdfRoute, /cache-control": "private, no-store"/);
});
