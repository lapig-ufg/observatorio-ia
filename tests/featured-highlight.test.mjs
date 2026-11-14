import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue divulga o curso e preserva as edições anteriores", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8") + fs.readFileSync("src/PortalHome.tsx", "utf8");

  assert.match(feature, /15 a 21 nov 2026/);
  assert.match(feature, /Nov 15–21, 2026/);
  assert.match(feature, /Do chat ao agente/);
  assert.match(feature, /From chat to agent/);
  assert.match(feature, /Open the course \(Portuguese\)/);
  assert.match(feature, /https:\/\/lapig-ufg\.github\.io\/observatorio-ia\/do-chat-ao-agente\//);
  for (const file of ["index.html", "aula.html", "pratica.html", "pratica-3.html", "assets/img/domino.jpg"]) {
    assert.ok(fs.existsSync(`public/do-chat-ao-agente/${file}`));
    if (file !== "index.html") assert.ok(feature.includes(file));
  }
  assert.match(pt, /8 a 14 de novembro de 2026/);
  assert.match(en, /Nov 8–14, 2026/);
  for (const history of [pt, en]) {
    assert.match(history, /State of AI Report 2026/);
    for (const link of [
      "https://www.stateof.ai/State-of-AI-Report-2026.pdf",
      "https://www.stateof.ai/2026-explore/",
      "https://drive.google.com/file/d/1t6HZOeQTxRr_Jp6CIVfmQUJPDdZaiY-K/view",
    ]) assert.ok(history.includes(link));
  }
  for (const file of ["infraestrutura-ia-2026-11-08.png", "infraestrutura-ia-2026-11-08-640.webp", "infraestrutura-ia-2026-11-08-1280.webp"]) assert.ok(fs.existsSync(`public/covers/${file}`));
  assert.match(pt, /Do neurônio ao campus: entender para decidir/);
  assert.match(en, /From neuron to campus: understand, then decide/);
  for (const link of ["https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/", "https://lapig-ufg.github.io/observatorio-ia/#levantamentos/ia-propria"]) {
    assert.ok(pt.includes(link));
    assert.ok(en.includes(link));
  }
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
