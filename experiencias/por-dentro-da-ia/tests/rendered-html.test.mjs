import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { inferToy } from "../app/lesson-math.ts";

async function page(path) {
  return new Response(await readFile(new URL(path, import.meta.url), "utf8"), {
    headers: { "content-type": "text/html" },
  });
}

const plain = (html) => html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "");

test("serves the hub with two independent classes ordered by complexity", async () => {
  const response = await page("../dist/index.html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  const html = await response.text();
  const text = plain(html);
  assert.match(html, /<html lang="pt-BR">/);
  assert.equal((html.match(/class="class-card /g) || []).length, 2);
  assert.ok(html.includes('href="redes-neurais/"'));
  assert.ok(html.includes('href="transformers/"'));
  for (const phrase of [
    "Duas aulas independentes.",
    "aulas disponíveis",
    "Nível fundamental",
    "Nível avançado",
    "Redes neurais",
    "Transformers",
    "Do neurônio ao aprendizado",
    "Da frase ao próximo token",
    "Observatório",
  ]) {
    assert.ok(text.includes(phrase), phrase);
  }
  assert.ok(text.indexOf("Redes neurais") < text.lastIndexOf("Transformers"));
  assert.ok(html.includes('class="lesson-header"'));
  assert.ok(html.includes("brand/observatorio-coruja.svg"));
  assert.doesNotMatch(html, /classes-hero-figure|classes-hero-facts|classes-connector|header-actions|site-course/);
  assert.doesNotMatch(text, /A base primeiro|Em seguida|Comece aqui|depois/);
});

test("preserves the 19-chapter Transformer lesson on its own page", async () => {
  const html = await (await page("../dist/transformers/index.html")).text();
  const text = plain(html);
  const ids = ["inicio", "ensaio", "mapa", "tokens", "vetores", "ordem", "matriz", "transformer", "qkv", "atencao", "softmax", "normalizacao", "mlp", "dobras", "profundidade", "laboratorio", "saida", "ciclo", "fontes"];
  for (const id of ids) assert.ok(html.includes(`<section id="${id}"`), id);
  assert.equal((html.match(/class="chapter [^"]*active-chapter"/g) || []).length, 1);
  assert.ok(html.includes('aria-label="Localização na arquitetura Transformer"'));
  assert.ok(html.includes('aria-current="step"'));
  assert.ok(html.includes("ABC · consultar conceitos e símbolos"));
  assert.ok(html.includes("Ir ao conteúdo"));
  for (const sentence of ["A vegetação saudável apresenta alta reflectância no infravermelho próximo.", "O treinamento já terminou.", "Nenhum parâmetro é ajustado nesta jornada."]) {
    assert.ok(text.includes(sentence), sentence);
  }
});

test("the Transformer lesson keeps its concepts, figures and sources", async () => {
  const html = await (await page("../dist/transformers/index.html")).text();
  const text = plain(html);
  for (const concept of ["matriz de embeddings", "Multilayer Perceptron", "Rectified Linear Unit", "Gaussian Error Linear Unit", "Query", "Key", "Value", "Layer Normalization", "conexão residual", "Softmax", "exponencial", "viés"]) {
    assert.match(text, new RegExp(concept, "i"));
  }
  for (const explanation of ["ReLU e GELU não são a mesma curva", "ReLU é anterior à GELU", "não é a codificação posicional do GPT‑3", "Dois blocos, duas cabeças", "Não descrevemos aqui o treinamento", "não tem encoder separado nem atenção cruzada", "Os 175 bilhões são parâmetros, não 175 bilhões de etapas sucessivas"]) {
    assert.ok(text.includes(explanation), explanation);
  }
  assert.ok(html.includes('<details class="more-math">'));
  assert.ok((html.match(/<svg/g) || []).length >= 8);
  assert.ok((html.match(/aria-pressed=/g) || []).length > 100);
  for (const phrase of ["Dos pontos nas ondas ao vetor de entrada", "Mesma entrada, outra cabeça", "Inspecionar neurônio 1", "Somar 5 a TODOS os escores", "Uma etapa →", "Sortear segundo essas chances", "PARE UM INSTANTE", "Animação roteirizada"]) {
    assert.ok(text.includes(phrase) || html.includes(phrase), phrase);
  }
  assert.equal((html.match(/aria-label="Após o bloco \d+"/g) || []).length, 96);
});

test("the Transformer toy probabilities come from the connected forward pass", async () => {
  const text = plain(await (await page("../dist/transformers/index.html")).text());
  const model = inferToy();
  for (const probability of model.probabilities) assert.ok(text.includes(`${(probability * 100).toFixed(2)}%`));
  for (const logit of model.logits) assert.ok(text.includes(logit.toFixed(3).replace(".", ",")));
  assert.ok(text.includes("Nenhuma das probabilidades acima foi digitada manualmente"));
  assert.ok(text.includes("pesos inventados, fixos e não treinados"));
  const html = await (await page("../dist/transformers/index.html")).text();
  for (const source of ["https://www.ibm.com/think/news/what-does-ai-look-like", "https://arxiv.org/abs/2005.14165", "https://arxiv.org/abs/1706.03762", "https://arxiv.org/abs/1606.08415", "https://arxiv.org/abs/1607.06450", "https://arxiv.org/abs/1402.1869"]) {
    assert.ok(html.includes(source), source);
  }
  assert.ok(html.includes("https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/og.png"));
});

test("serves the Neural Network class with its chapter map and first lesson", async () => {
  const html = await (await page("../dist/redes-neurais/index.html")).text();
  const text = plain(html);
  assert.match(html, /<html lang="pt-BR">/);
  assert.ok(html.includes('data-page="redes-neurais"'));
  assert.ok(html.includes('class="site-root friendly-site nn-page"'));
  assert.ok(html.includes('class="lesson-header"'));
  assert.ok(html.includes("brand/observatorio-coruja.svg"));
  assert.ok(html.includes('href="/observatorio-ia/"'));
  assert.ok(!html.includes("Voltar ao Observatório"));
  assert.ok(!html.includes("Todas as aulas"));
  assert.ok(text.includes("REDES NEURAIS · 26 CAPÍTULOS"));
  for (const label of ["Do neurônio à rede", "Um neurônio", "Funções de ativação", "Construção da rede", "Passagem direta", "Retropropagação", "Atualização dos pesos", "Treino e previsão", "Síntese"]) {
    assert.ok(text.includes(label), label);
  }
  assert.ok(text.includes("Uma rede neural é uma função feita de camadas"));
  assert.ok(text.includes("O playground calcula tudo localmente"));
  assert.ok(html.includes('aria-current="step"'));
  assert.ok(html.includes('id="inicio"'));
  assert.ok(html.includes("progress"));

  const sources = await Promise.all([
    readFile(new URL("../app/neural/content.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/neural/NeuralNetworkPage.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of sources) assert.doesNotMatch(source, /Transformer/i);
  assert.doesNotMatch(sources[0], /WorkedExample/);
  assert.match(sources[0], /ForwardUntilN/);
});
