import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("o destaque apresenta o curso de IA generativa e preserva a série diária no histórico", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(app, /Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra/);
  assert.match(app, /Curso híbrido · UFG\/IESA\/CIAMB/);
  assert.doesNotMatch(app, /Curso aberto · UFG\/LAPIG/);
  assert.match(app, /Segundas-feiras · 14h às 17h · 10 de agosto a 7 de dezembro de 2026/);
  assert.match(app, /https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w\/viewform/);
  assert.match(app, /title: "IA como notícia diária"/);
  assert.match(app, /href: "#ia-como-noticia-diaria"/);
});
