import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function isolated(path) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const refinement = await isolated("src/panoramaRefinement.ts");
const guide = await isolated("src/panoramaGuide.ts");
const timeline = await isolated("src/panoramaTimeline.ts");

test("preço respeita o idioma, duas casas e ausência publicada", () => {
  assert.equal(guide.formatGuidePrice(8), "US$ 8,00");
  assert.equal(guide.formatGuidePrice(8, true), "$8.00");
  assert.equal(guide.formatGuidePrice(1234.567), "US$ 1.234,57");
  assert.equal(guide.formatGuidePrice(1234.567, true), "$1,234.57");
  for (const absent of [null, undefined, NaN, Infinity, 0, -1]) assert.equal(guide.formatGuidePrice(absent), null);
});

test("destaques usam os dados da categoria e mantêm o piso nas alternativas", () => {
  const bench = { top: [
    { model: "Líder", score: 100, pricePerMillion: 10, tokensPerSecond: 30 },
    { model: "Eficiente", score: 95, pricePerMillion: 1, tokensPerSecond: 50 },
    { model: "Rápido", score: 88, pricePerMillion: 4, tokensPerSecond: 200 },
    { model: "Fora do piso", score: 87, pricePerMillion: .01, tokensPerSecond: 999 },
    { model: "Sem dados", score: 90, pricePerMillion: null, tokensPerSecond: null },
  ] };
  assert.deepEqual(guide.categoryHighlights(bench).map(item => [item.mode, item.row.entry.model, item.row.metric]), [
    ["best", "Líder", 100], ["value", "Eficiente", 95], ["fast", "Rápido", 200],
  ]);
  assert.ok(guide.categoryHighlights({top: []}).every(item => item.row === null));
  assert.deepEqual(guide.categoryHighlights({top: [{ model: "Único", score: 50, pricePerMillion: 0, tokensPerSecond: 0 }]}).map(item => item.row?.entry.model || null), ["Único", null, null]);
});

test("frescor é calculado pela referência da coleta, com corte estrito de 30 dias", () => {
  assert.equal(refinement.verificationAge("2026-09-12", "2026-10-12T23:59:59Z"), 30);
  assert.equal(refinement.verificationAge("2026-09-11", "2026-10-12"), 31);
  assert.equal(refinement.verificationAge("2026-10-15", "2026-10-12"), 0);
  assert.equal(refinement.verificationAge("2024-02-28", "2024-03-01"), 2);
  assert.equal(refinement.verificationAge("inválida", "2026-10-12"), null);
  assert.equal(refinement.verificationAge("2026-10-12", ""), null);
});

test("leitura conta palavras, remove marcação e arredonda a 200 por minuto", () => {
  assert.equal(refinement.readingMinutes(""), 1);
  assert.equal(refinement.readingMinutes("<b>Uma</b> palavra &amp; outra"), 1);
  assert.equal(refinement.readingMinutes(Array(200).fill("palavra").join(" ")), 1);
  assert.equal(refinement.readingMinutes(Array(201).fill("palavra").join(" ")), 2);
  assert.equal(refinement.readingMinutes(Array(601).fill("palavra").join(" ")), 4);
});

test("rótulos densos não colidem entre faixas ou empresas, mesmo no zoom mínimo", () => {
  const items = Array.from({ length: 130 }, (_, n) => ({ id: String(n), model: `Modelo ${n} com nome extenso`, days: 1200 + n % 40, level: n % 3 + 1 }));
  for (const scale of [.4, .55, .85, 1.5, 4]) {
    const placed = timeline.stackPills(items, scale, 170, 4);
    const height = timeline.trackHeight(placed, 72);
    const boxes = placed.map(pill => {
      const spec = timeline.pillSpec(pill.item.level);
      const top = height / 2 + pill.laneOffset - spec.h / 2;
      assert.ok(top >= 12 && top + spec.h <= height - 12, "rótulo precisa caber na própria empresa");
      return { left: pill.x, right: pill.x + pill.width, top, bottom: top + spec.h };
    });
    for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
      const x = boxes[a], y = boxes[b];
      assert.ok(x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top, "interseção entre caixas de rótulos");
    }
  }
});
