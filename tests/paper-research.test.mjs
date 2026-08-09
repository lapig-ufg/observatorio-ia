import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/paperResearch.ts", "utf8")
  .replace('import type { Article } from "./catalog";\n\n', "");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { isPublicResearchPaper, paperResearchArea, paperResearchAreas } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function paper(id, title, summary = "", tags = [], theme = "") {
  return { id, type: "paper", title, summary, tags, theme };
}

test("a nova taxonomia de pesquisa tem as seis áreas aprovadas", () => {
  assert.deepEqual(paperResearchAreas, [
    "Ciências da Vida e Saúde",
    "Ciências Humanas, Sociais e Linguística",
    "Engenharias e Agrárias",
    "Ciências Exatas e da Terra",
    "Epistemologia e Metaciência",
    "Fundamentos de IA",
  ]);
});

test("papers fora do recorte generativo não entram na seção pública", () => {
  const traditional = paper("paper-people-use-fast-and-flat-simulation-to-reason-about-new-86-026-10722-1", "People use fast and flat simulation to reason about new games", "Estudo de cognição humana", ["Agentes"]);
  assert.equal(isPublicResearchPaper(traditional), false);
  assert.equal(paperResearchArea(traditional), null);
});

test("papers curados permanecem na área científica correta", () => {
  const scientificAi = paper("drive-1s3-fifth-era-science", "The fifth era of science: Artificial scientific intelligence");
  const generativeHealth = paper("new-health", "Clinical assistant", "Estudo com large language models para apoiar diagnósticos", ["LLMs", "Saúde"]);
  assert.equal(paperResearchArea(scientificAi), "Epistemologia e Metaciência");
  assert.equal(paperResearchArea(generativeHealth), "Ciências da Vida e Saúde");
});

test("classificação editorial explícita da planilha prevalece sobre a heurística", () => {
  const chemistry = paper(
    "new-chemistry",
    "A fully adaptive automated system for nanoparticle washing enabled by vision and language AI",
    "Sistema de visão e linguagem para automação laboratorial.",
    ["IA generativa", "Química"],
    "Ciências Exatas e da Terra",
  );
  assert.equal(paperResearchArea(chemistry), "Ciências Exatas e da Terra");
});
