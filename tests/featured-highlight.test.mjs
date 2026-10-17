import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue apresenta marcas d’água e preserva integralmente a edição anterior", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");

  assert.ok(fs.existsSync("public/covers/watermarking-proveniencia-2026-10-11.png"));
  assert.ok(fs.existsSync("public/covers/watermarking-proveniencia-2026-10-11-640.webp"));
  assert.ok(fs.existsSync("public/covers/watermarking-proveniencia-2026-10-11-1280.webp"));
  assert.match(feature, /Assinaturas invisíveis: até onde resistem as marcas d’água da IA\?/);
  assert.match(feature, /Invisible signatures: how well do AI watermarks survive\?/);
  assert.match(feature, /detecção não equivale a prova absoluta de autoria/);
  assert.match(feature, /detection is not absolute proof of authorship/);
  assert.match(feature, /1L1ChcDaz6ves1ddobAzVgPyBmYIgwi7x/);
  assert.match(feature, /1BwCAoazLO6euEso_W63046oPTuTFsIc9/);
  assert.match(feature, /HIUzrxQxTtw/);
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
