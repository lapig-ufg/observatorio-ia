import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = ts.transpileModule(fs.readFileSync("src/catalogSearch.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { catalogSearchMatcher } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const presentation = {
  title: "Não há almoço grátis: o custo material da IA generativa",
  author: "Laerte G. Ferreira",
  source: "UFG / IESA / LAPIG",
  theme: "Modelos, mercado e indústria",
  subtheme: "Governança, trabalho e desigualdade",
  summary: "Apresentação sobre energia, água e emissões de carbono.",
  tags: ["infraestrutura", "centros de dados"],
};

test("recupera o título relatado pelo editor sem exigir frase contígua", () => {
  for (const query of ["O custo da IA generativa", "generativa custo IA", "  O   CUSTO, da IA GENERATIVA!  ", "almoco gratis", presentation.title]) {
    assert.equal(catalogSearchMatcher(query)(presentation), true, query);
  }
});

test("a mesma regra recupera o título inglês com palavras intermediárias", () => {
  const english = { ...presentation, title: "There is no free lunch: the material cost of generative AI" };
  for (const query of ["The cost of generative AI", "AI cost generative", "COST, of GENERATIVE AI!"]) {
    assert.equal(catalogSearchMatcher(query)(english), true, query);
  }
});

test("exige todos os termos relevantes e combina os campos pesquisáveis", () => {
  assert.equal(catalogSearchMatcher("Ferreira generativa água infraestrutura LAPIG indústria desigualdade")(presentation), true);
  assert.equal(catalogSearchMatcher("custo generativa oncologia")(presentation), false);
  assert.equal(catalogSearchMatcher("custo IA generativa")({ ...presentation, title: "Aplicações da IA generativa na educação" }), false);
});

test("não descarta siglas curtas, identificadores de modelos nem negações", () => {
  const titleOnly = (title) => ({ title, author: "", source: "", theme: "", subtheme: "", summary: "", tags: [] });
  for (const term of ["IA", "AI", "R1", "RAG", "não", "not", "no"]) {
    assert.equal(catalogSearchMatcher(`${term} custo`)(titleOnly("Custo material")), false, term);
    assert.equal(catalogSearchMatcher(`${term} custo`)(titleOnly(`Custo material ${term}`)), true, term);
  }
});

test("consultas vazias não filtram e consultas só de conectivos não viram busca vazia", () => {
  for (const query of ["", "   ", " , ! "]) assert.equal(catalogSearchMatcher(query)(presentation), true);
  assert.equal(catalogSearchMatcher("the of")({ ...presentation, title: "The cost of computing" }), true);
  assert.equal(catalogSearchMatcher("the of")(presentation), false);
});

test("PT e EN preservam os filtros de coleção, tema, palavra-chave, período e ordenação", () => {
  for (const file of ["src/App.tsx", "src/AppEnglish.tsx"]) {
    const app = fs.readFileSync(file, "utf8");
    assert.match(app, /const matchesSearch = catalogSearchMatcher\(query\)/);
    assert.match(app, /\(!added \|\| addedInWindow\(article, radarWindow\)\) && matchesType && matchesTheme && matchesKeyword && matchesSearch\(article\);\s*}\)\.sort\(orderArticles\)/);
  }
});
