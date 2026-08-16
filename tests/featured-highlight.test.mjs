import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("o destaque apresenta o ensaio sobre soberania e preserva os temas anteriores no histórico", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(app, /A Geopolítica da IA e a Soberania Nacional/);
  assert.match(app, /Laerte Ferreira · Ensaio/);
  assert.match(app, /assetUrl\("highlights\/guerra_fria_IA_logos_v6\.png"\)/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ\/view/);
  assert.match(app, /Ler o ensaio completo/);
  assert.match(app, /Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra/);
  assert.match(app, /Curso híbrido · UFG\/IESA\/CIAMB/);
  assert.match(app, /https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w\/viewform/);
  assert.match(app, /title: "IA como notícia diária"/);
  assert.match(app, /href: "#ia-como-noticia-diaria"/);
});
