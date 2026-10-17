import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = ts.transpileModule(fs.readFileSync("src/sectionNavigation.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { sectionNavigation } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("seções preservam ordem, limites e identidade em listas de quatro e sete rotas", () => {
  for (const count of [4, 7]) {
    const sections = Array.from({ length: count }, (_, index) => Object.freeze({ href: index ? `#pagina/${index}` : "#pagina", label: String(index) }));
    Object.freeze(sections);
    sections.forEach((section, index) => {
      const actual = sectionNavigation(sections, `${section.href}?filtro=valor`);
      assert.equal(actual.index, index);
      assert.equal(actual.current, section);
      assert.equal(actual.previous, sections[index - 1] ?? null);
      assert.equal(actual.next, sections[index + 1] ?? null);
    });
  }
});

test("rota desconhecida usa a abertura sem confundir prefixos de sub-rotas", () => {
  const sections = [{ href: "#panorama" }, { href: "#panorama/guia" }];
  for (const route of ["", "#panorama/guia-extra", "#outra", "#panorama/inexistente"]) {
    assert.deepEqual(sectionNavigation(sections, route), { index: 0, current: sections[0], previous: null, next: sections[1] });
  }
});

test("lista vazia e seção única nunca produzem vizinhos inválidos", () => {
  assert.deepEqual(sectionNavigation([], "#pagina"), { index: -1, current: null, previous: null, next: null });
  const only = { href: "#pagina" };
  assert.deepEqual(sectionNavigation([only], "#pagina"), { index: 0, current: only, previous: null, next: null });
});
