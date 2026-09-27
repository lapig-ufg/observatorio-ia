import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue reúne artigos, áudios e apresentações sobre IA na ciência", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8");

  assert.ok(fs.existsSync("public/covers/ia-quinta-era-ciencia-2026-09-26.jpg"));
  assert.match(feature, /IA na ciência: da ferramenta ao agente/);
  assert.match(feature, /AI in science: from tool to agent/);
  assert.match(feature, /pode ser auditado, reproduzido e validado de forma independente/);
  assert.match(feature, /can be audited, reproduced and independently validated/);
  assert.match(feature, /Houve lampejos úteis, não uma redescoberta autônoma/);
  for (const id of ["1KHG_DpLv7Fe7c-Ay-awfuzI5aT0pd3jQ", "1xFZwjvXq0A8bojd8MY8TxIqYcxJ2CGA3", "12-wpVpC1-XYSkTvI1NBtTs8HcG1lkmr3", "1AOlNLNczg9o6u6GEnumCR825U125ek8w"]) {
    assert.ok(feature.includes(id));
  }
  for (const id of ["1o6A1vPeyzAfgkWTYZgKgtgPicxxz8grd", "1d8w6RpIEEwIQPbqXussWOgxf6_PB4Hms", "1H2X2XISoaQGK7gHUC_Jl-6AgPdIPJE1-", "1yXOgbJ7sN1lR6wDvX9FbfD6nM3T7EHMT"]) {
    assert.ok(feature.includes(id));
  }
  assert.match(feature, /zenodo\.org\/records\/22737751/);
  assert.match(feature, /zenodo\.org\/records\/20302944/);
  assert.match(pt, /<FeaturedDebate language="pt" \/>/);
  assert.match(en, /<FeaturedDebate language="en" \/>/);
  assert.match(pt, /Como usar a IA fora do navegador/);
  assert.match(en, /Using AI beyond the browser/);
  assert.match(pt, /IA entre o alarme e a evidência/);
  assert.match(en, /AI between alarm and evidence/);
  assert.match(pt, /O que já foi destaque\?/);
  assert.match(en, /What has been featured before\?/);
});
