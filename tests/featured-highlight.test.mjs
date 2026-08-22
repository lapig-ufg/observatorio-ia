import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("o destaque apresenta a entrevista e preserva os temas anteriores no histórico", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(app, /IA, arte e design: repertório crítico em tempos de transformação/);
  assert.match(app, /Entrevista exclusiva · Observatório UFG-IA/);
  assert.match(app, /assetUrl\("highlights\/entrevista-ia-arte-design-2026-08-22\.png"\)/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1mHCzff-0WYGG146KlpidVwn9_oE-cvZU\/view\?usp=drivesdk/);
  assert.match(app, /Assistir entrevista/);
  assert.match(app, /A Geopolítica da IA e a Soberania Nacional/);
  assert.match(app, /Laerte Ferreira · Ensaio/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ\/view/);
  assert.match(app, /Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra/);
  assert.match(app, /Curso híbrido · UFG\/IESA\/CIAMB/);
  assert.match(app, /https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w\/viewform/);
  assert.match(app, /title: "IA como notícia diária"/);
  assert.match(app, /href: "#ia-como-noticia-diaria"/);
});
