import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { inferToy } from "../app/lesson-math.ts";

async function render() {
  return new Response(await readFile(new URL("../dist/index.html", import.meta.url), "utf8"), {headers:{"content-type":"text/html"}});
}
const plain=html=>html.replace(/<!--.*?-->/g,"").replace(/<[^>]+>/g,"");

test("serves the Portuguese lesson with its exact course and remote-sensing hook",async()=>{
  const response=await render();assert.equal(response.status,200);
  assert.match(response.headers.get("content-type"),/^text\/html/);
  const html=await response.text(),text=plain(html);
  assert.match(html,/<html lang="pt-BR">/);
  for(const sentence of ["Tópicos em sensoriamento remoto","LAPIG / UFG","A vegetação saudável apresenta alta reflectância no infravermelho próximo.","O treinamento já terminou.","Nenhum parâmetro é ajustado nesta jornada."])assert.ok(text.includes(sentence),sentence);
  assert.ok((text.match(/INFERÊNCIA · PARÂMETROS FIXOS/g)||[]).length>=15);
  assert.doesNotMatch(text,/pizza|cachorro|\bcão\b|\bgato\b/i);
});
test("renders 19 navigable chapters and a contextual architecture map",async()=>{
  const html=await(await render()).text();
  const ids=["inicio","ensaio","mapa","tokens","vetores","ordem","matriz","transformer","qkv","atencao","softmax","normalizacao","mlp","dobras","profundidade","laboratorio","saida","ciclo","fontes"];
  for(const id of ids)assert.ok(html.includes(`<section id="${id}"`),id);
  assert.equal((html.match(/class="chapter [^"]*active-chapter"/g)||[]).length,1);
  assert.ok(html.includes('aria-label="Localização na arquitetura Transformer"'));
  assert.ok(html.includes('aria-current="step"'));
  assert.ok(html.includes("ABC · consultar conceitos e símbolos"));
  assert.ok(html.includes("Ir ao conteúdo"));
});
test("defines the concepts and distinguishes GPT-3 from the teaching analogies",async()=>{
  const html=await(await render()).text(),text=plain(html);
  for(const concept of ["matriz de embeddings","Multilayer Perceptron","Rectified Linear Unit","Gaussian Error Linear Unit","Query","Key","Value","Layer Normalization","conexão residual","Softmax","exponencial","viés"])assert.match(text,new RegExp(concept,"i"));
  for(const explanation of ["ReLU e GELU não são a mesma curva","ReLU é anterior à GELU","não é a codificação posicional do GPT‑3","Dois blocos, duas cabeças","Não descrevemos aqui o treinamento","não tem encoder separado nem atenção cruzada","Os 175 bilhões são parâmetros, não 175 bilhões de etapas sucessivas"])assert.ok(text.includes(explanation),explanation);
  assert.ok(html.includes('<details class="more-math">'));
});
test("includes accessible numerical figures and explanatory interactions",async()=>{
  const html=await(await render()).text(),text=plain(html);
  assert.ok((html.match(/<svg/g)||[]).length>=8);
  assert.ok((html.match(/aria-pressed=/g)||[]).length>100);
  for(const phrase of ["Dos pontos nas ondas ao vetor de entrada","Mesma entrada, outra cabeça","Inspecionar neurônio 1","Somar 5 a TODOS os escores","Uma etapa →","Sortear segundo essas chances","PARE UM INSTANTE","Animação roteirizada"])assert.ok(text.includes(phrase)||html.includes(phrase),phrase);
  assert.equal((html.match(/aria-label="Após o bloco \d+"/g)||[]).length,96);
  assert.ok(text.includes("Q e K calculam compatibilidades; V contém os componentes que serão combinados"));
  assert.ok(text.includes("O contexto orienta. O vocabulário oferece os candidatos."));
});
test("rendered probabilities come from the same connected forward pass",async()=>{
  const text=plain(await(await render()).text()),m=inferToy();
  for(const p of m.probabilities)assert.ok(text.includes(`${(p*100).toFixed(2)}%`));
  for(const z of m.logits)assert.ok(text.includes(z.toFixed(3).replace(".",",")));
  assert.ok(text.includes("Nenhuma das probabilidades acima foi digitada manualmente"));
  assert.ok(text.includes("pesos inventados, fixos e não treinados"));
});
test("preserves sources and does not trust arbitrary social-preview hosts",async()=>{
  const html=await(await render()).text();
  for(const source of ["https://www.ibm.com/think/news/what-does-ai-look-like","https://arxiv.org/abs/2005.14165","https://arxiv.org/abs/1706.03762","https://arxiv.org/abs/1606.08415","https://arxiv.org/abs/1607.06450","https://arxiv.org/abs/1402.1869"])assert.ok(html.includes(source));
  assert.ok(html.includes("https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/og.png"));
  assert.ok(!html.includes("untrusted.invalid/og.png"));
});
