import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue articula intuição, J-Space e o podcast", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8");

  assert.ok(fs.existsSync("public/covers/intuicao-jspace-2026-10-04.png"));
  assert.match(feature, /Da intuição ao J-Space: padrões, linguagem e reflexão/);
  assert.match(feature, /From intuition to J-Space: patterns, language and reflection/);
  assert.match(feature, /processos possivelmente análogos à intuição em humanos e LLMs/);
  assert.match(feature, /functionally analogous to intuition in humans and LLMs/);
  assert.match(feature, /não prova consciência, experiência subjetiva ou equivalência com o inconsciente humano/);
  assert.match(feature, /does not establish consciousness, subjective experience or equivalence with the human unconscious/);
  assert.match(feature, /semiengineering\.com\/intuition-and-ai/);
  assert.match(feature, /transformer-circuits\.pub\/2026\/workspace\/index\.html/);
  assert.match(feature, /1ro42roPdwrfXNghWYzhM7n3R1RIiWYr0/);
  assert.match(pt, /<FeaturedDebate language="pt" \/>/);
  assert.match(en, /<FeaturedDebate language="en" \/>/);
  assert.match(pt, /Como usar a IA fora do navegador/);
  assert.match(en, /Using AI beyond the browser/);
  assert.match(pt, /IA entre o alarme e a evidência/);
  assert.match(en, /AI between alarm and evidence/);
  assert.match(pt, /IA na ciência: da ferramenta ao agente/);
  assert.match(en, /AI in science: from tool to agent/);
  assert.match(pt, /O que já foi destaque\?/);
  assert.match(en, /What has been featured before\?/);
});
