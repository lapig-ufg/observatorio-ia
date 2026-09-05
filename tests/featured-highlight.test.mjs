import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("o destaque apresenta o relatório do MIT e preserva Gates e a entrevista no histórico", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(app, /IA na educação: mais do que regular ferramentas/);
  assert.match(app, /MIT · Educação, aprendizagem e pesquisa/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1aiDFYVOyyv43PWB9TKzP3xzX85iCVf4s\/view\?usp=drivesdk/);
  assert.match(app, /assetUrl\("covers\/mit-ia-educacao-aprendizagem-2026-09-05\.png"\)/);
  assert.match(app, /Ilustração editorial de uma mesa de estudo que aproxima leitura, escrita e orientação humana/);
  assert.match(app, /usar a IA para ampliar — não automatizar — a aprendizagem/);
  assert.match(app, /https:\/\/drive\.google\.com\/uc\?export=download&id=15K_wBXRoitcdt6XjWXe0gPGA9I4DjoSI/);
  assert.match(app, /A era turbulenta da IA chegou\. As escolhas que fazemos agora são cruciais\./);
  assert.match(app, /Bill Gates · Gates Notes/);
  assert.match(app, /https:\/\/www\.gatesnotes\.com\/a-turbulent-ai-era-and-critical-choices-to-make/);
  assert.match(app, /Baixar podcast \(M4A\)/);
  assert.match(app, /IA, arte e design: repertório crítico em tempos de transformação/);
  assert.match(app, /Entrevista exclusiva · Observatório UFG-IA/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1mHCzff-0WYGG146KlpidVwn9_oE-cvZU\/view\?usp=drivesdk/);
  assert.match(app, /A Geopolítica da IA e a Soberania Nacional/);
  assert.match(app, /Laerte Ferreira · Ensaio/);
  assert.match(app, /https:\/\/drive\.google\.com\/file\/d\/1phb__uTl7uxzr0gIdj5SBd_1rCqLtHFJ\/view/);
  assert.match(app, /Entendendo e Usando IA Generativa para o Processamento e Análise de Dados de Observação da Terra/);
  assert.match(app, /Curso híbrido · UFG\/IESA\/CIAMB/);
  assert.match(app, /https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLScZuIGJyrRGRetn_nlsCNq-Hfih-ZmXBuv5fj82ebU60vs10w\/viewform/);
  assert.match(app, /title: "IA como notícia diária"/);
  assert.match(app, /href: "#ia-como-noticia-diaria"/);
  assert.ok(fs.existsSync("public/covers/mit-ia-educacao-aprendizagem-2026-09-05.png"));
});
