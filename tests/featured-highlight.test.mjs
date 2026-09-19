import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("destaque bilíngue oferece fontes, áudios, charge e cenário econômico qualificado", () => {
  const feature = fs.readFileSync("src/FeaturedDebate.tsx", "utf8");
  const pt = fs.readFileSync("src/App.tsx", "utf8");
  const en = fs.readFileSync("src/AppEnglish.tsx", "utf8");

  assert.ok(fs.existsSync("public/covers/laerte-charge-ia-risco-2026-09.jpg"));
  assert.match(feature, /Charge: Laerte · Folha de S\.Paulo/);
  assert.match(feature, /32,4% acima da trajetória sem IA/);
  assert.match(feature, /11,9%/);
  assert.match(feature, /45,2%/);
  assert.match(feature, /oferece cenários, não previsões/);
  assert.match(feature, /offers scenarios, not forecasts/);
  for (const id of ["1GOWwH68VD1zbG3q9xfS1Q0HNAmFqSBju", "1-0XguO2UMNarM9re8FX0QsGiSR-wu4No", "1zUzJP39dQBKbFNrFtJtSYtxwpay00T5U", "15FnNCNZiOPjDlhyGRyh8YPRXNIwtBI0P"]) {
    assert.ok(feature.includes(id));
  }
  assert.match(pt, /<FeaturedDebate language="pt" \/>/);
  assert.match(en, /<FeaturedDebate language="en" \/>/);
  assert.match(pt, /Como usar a IA fora do navegador/);
  assert.match(en, /Using AI beyond the browser/);
  assert.match(pt, /O que já foi destaque\?/);
  assert.match(en, /What has been featured before\?/);
});
