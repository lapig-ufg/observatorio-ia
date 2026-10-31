import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue liga a aula e o levantamento e preserva as edições anteriores", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");

  assert.match(feature, /Do neurônio ao campus: entender para decidir/);
  assert.match(feature, /From neuron to campus: understand, then decide/);
  assert.match(feature, /1 a 7 nov 2026/);
  assert.match(feature, /não um orçamento ou uma decisão de compra/);
  assert.match(feature, /available in Portuguese/);
  assert.doesNotMatch(feature, /observatorio-ia\/en\/#levantamentos\/ia-propria/);
  for (const link of ["https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/", "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"]) assert.equal(feature.split(link).length - 1, 4);
  for (const file of ["do-neuronio-ao-campus-2026-11-01.png", "do-neuronio-ao-campus-2026-11-01-640.webp", "do-neuronio-ao-campus-2026-11-01-1280.webp"]) assert.ok(fs.existsSync(`public/covers/${file}`));
  assert.match(pt, /Magnifica Humanitas: a dignidade humana na era da IA/);
  assert.match(en, /Magnifica Humanitas: human dignity in the age of AI/);
  for (const link of ["185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws", "1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK", "1SnHeGl1MMMoj-K5EVSdMMyvf6NxRcEVt", "/pt/encyclicals/documents/20260515-magnifica-humanitas.html", "/en/encyclicals/documents/20260515-magnifica-humanitas.html"]) { assert.ok(pt.includes(link)); assert.ok(en.includes(link)); }
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
