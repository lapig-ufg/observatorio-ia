import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function isolatedModule(file) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { formatPublicDate } = await isolatedModule("src/dateLabels.ts");
const { aggregateNewsMonths } = await isolatedModule("src/newsTimeline.ts");
const { languageUrl } = await isolatedModule("src/locale.ts");

test("public dates preserve the available precision in both languages", () => {
  for (const [value, pt, en] of [
    ["2026-10-07", "7 out. 2026", "Oct 7, 2026"],
    ["2026-10", "out. 2026", "Oct 2026"],
    ["2026", "2026", "2026"],
    ["2024-02-29", "29 fev. 2024", "Feb 29, 2024"],
    ["2026-01-01", "1 jan. 2026", "Jan 1, 2026"],
  ]) {
    assert.equal(formatPublicDate(value), pt);
    assert.equal(formatPublicDate(value, "en"), en);
  }
});

test("public dates keep missing, editorial and invalid values without throwing or rolling over", () => {
  for (const value of ["", "Sem data", "2026-02-29", "2026-02-31", "2026-13", "2026-00", "2026-10-00", "2026-10-32", "2026-1-2"]) {
    assert.equal(formatPublicDate(value), value);
    assert.equal(formatPublicDate(value, "en"), value);
  }
});

test("monthly bars use the exact September 11–October 10 selection from the archive", () => {
  const records = JSON.parse(fs.readFileSync("public/folha-ia/2026.json", "utf8"));
  const selected = records.filter(({ date }) => date >= "2026-09-11" && date <= "2026-10-10");
  const months = aggregateNewsMonths(selected);
  assert.equal(selected.length, 340);
  assert.equal(months.reduce((sum, { count }) => sum + count, 0), 340);
  assert.deepEqual(months.map(({ month }) => month), ["2026-09", "2026-10"]);
  assert.equal(months.find(({ month }) => month === "2026-10").count, 111);
  assert.equal(months.find(({ month }) => month === "2026-09").count, 229);
  const filtered = selected.filter(article => article.stars === 5);
  assert.equal(aggregateNewsMonths(filtered).reduce((sum, { count }) => sum + count, 0), filtered.length);
  assert.equal(aggregateNewsMonths(records).reduce((sum, { count }) => sum + count, 0), records.length);
});

test("monthly bars sort across years, handle empty results and preserve their input", () => {
  const records = Object.freeze([Object.freeze({ date: "2027-01-01" }), Object.freeze({ date: "2026-12-31" }), Object.freeze({ date: "2027-01-02" })]);
  assert.deepEqual(aggregateNewsMonths(records), [{ month: "2026-12", count: 1 }, { month: "2027-01", count: 2 }]);
  assert.deepEqual(aggregateNewsMonths([]), []);
});

test("language switching maps the interactive section both ways and preserves search state", () => {
  const previous = globalThis.window;
  try {
    globalThis.window = { location: { hash: "#experiencias-interativas", search: "?q=token" } };
    assert.equal(languageUrl("en"), "./en/?q=token#interactive-experiences");
    window.location.hash = "#interactive-experiences";
    assert.equal(languageUrl("pt"), "../?q=token#experiencias-interativas");
    window.location.hash = "#panorama/como-usar?secao=tutorial";
    assert.equal(languageUrl("en"), "./en/?q=token#panorama/como-usar?secao=tutorial");
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
