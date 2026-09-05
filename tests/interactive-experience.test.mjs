import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const section = app.match(/<section id="experiencias-interativas"[\s\S]*?<\/section>/)?.[0];

test("interactive inference has a labelled homepage section and canonical destination", () => {
  assert.ok(section);
  assert.match(section, /aria-labelledby="interactive-experience-title"/);
  assert.match(section, /id="interactive-experience-title"/);
  assert.ok(section.includes('href={assetUrl("por-dentro-da-ia/")}'));
  assert.doesNotMatch(section, /target="_blank"/);
  assert.match(section, /volte ao Observatório/);
});

test("experience preserves the inference scope and remote-sensing narrative", () => {
  assert.match(section, /A vegetação saudável apresenta alta reflectância no infravermelho próximo\./);
  assert.match(section, /inferência, com o GPT-3 como referência/);
  assert.match(section, /Escores para o vocabulário tornam-se probabilidades/);
  assert.equal((section.match(/<li>/g) || []).length, 3);
  assert.ok(app.indexOf('id="experiencias-interativas"') < app.indexOf('id="categorias" className='));
});
