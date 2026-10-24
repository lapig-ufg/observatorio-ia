import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue apresenta a encíclica e preserva integralmente as edições anteriores", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");

  assert.match(feature, /Magnifica Humanitas: a dignidade humana na era da IA/);
  assert.match(feature, /Magnifica Humanitas: human dignity in the age of AI/);
  assert.match(feature, /25 a 31 out 2026/);
  assert.match(feature, /contextual e condicionado/);
  assert.match(feature, /contextual and conditional/);
  assert.match(feature, /197–200/);
  for (const file of ["magnifica-humanitas-desigualdade-2026-10-25.png", "magnifica-humanitas-desigualdade-2026-10-25-640.webp", "magnifica-humanitas-desigualdade-2026-10-25-1280.webp"]) assert.ok(fs.existsSync(`public/covers/${file}`));
  for (const link of ["185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws", "1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK", "1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt", "/en/encyclicals/documents/20260515-magnifica-humanitas.html"]) assert.ok(feature.includes(link));
  assert.match(pt, /IA na publicação científica: regras diversas, responsabilidade humana/);
  assert.match(en, /AI in scientific publishing: different rules, human responsibility/);
  for (const link of ["#levantamentos/politicas-ia", "180BdIVjxxTz5s9gLMt36JAg8AS98yikV", "1WIHOYWwecUKKJScm4CiileJJz18qVNe9", "1-db96LJfCQAyWV8c_frRAtkeulupacHg"]) {
    assert.ok(pt.includes(link));
    assert.ok(en.includes(link));
  }
  assert.match(pt, /Assinaturas invisíveis: até onde resistem as marcas d’água da IA\?/);
  assert.match(en, /Invisible signatures: how well do AI watermarks survive\?/);
  for (const link of ["1L1ChcDaz6ves1ddobAzVgPyBmYIgwi7x", "1BwCAoazLO6euEso_W63046oPTuTFsIc9", "HIUzrxQxTtw"]) {
    assert.ok(pt.includes(link));
    assert.ok(en.includes(link));
  }
  assert.match(pt, /<FeaturedDebate language=\{english \? "en" : "pt"\} weeklyBadge \/>/);
  assert.match(en, /<FeaturedDebate language=\{english \? "en" : "pt"\} weeklyBadge \/>/);
  assert.match(pt, /Como usar a IA fora do navegador/);
  assert.match(en, /Using AI beyond the browser/);
  assert.match(pt, /IA entre o alarme e a evidência/);
  assert.match(en, /AI between alarm and evidence/);
  assert.match(pt, /IA na ciência: da ferramenta ao agente/);
  assert.match(en, /AI in science: from tool to agent/);
  assert.match(pt, /Da intuição ao J-Space: padrões, linguagem e reflexão/);
  assert.match(en, /From intuition to J-Space: patterns, language and reflection/);
  for (const previousLink of [
    "semiengineering.com\/intuition-and-ai",
    "transformer-circuits.pub\/2026\/workspace\/index.html",
    "1ro42roPdwrfXNghWYzhM7n3R1RIiWYr0",
  ]) {
    assert.match(pt, new RegExp(previousLink));
    assert.match(en, new RegExp(previousLink));
  }
  assert.match(pt, /O que já foi destaque\?/);
  assert.match(en, /What has been featured before\?/);
  for (const link of [
    "s41586-026-11044-y",
    "d41586-026-02804-x",
    "how-ai-math-breakthrough-ignited-controversy",
    "a-warning-about-model-welfare",
    "sem-apocalipse-ou-redencao",
    "anthropic.com\/institute\/econ-scenarios",
  ]) {
    assert.match(pt, new RegExp(link));
    assert.match(en, new RegExp(link));
  }
  assert.match(pt, /weekly-highlight-history-links/);
  assert.match(en, /weekly-highlight-history-links/);
});
