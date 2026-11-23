// Teste do "Pergunte ao Observatório" no PC, sem Cloudflare: dados publicados do Panorama
// e IA pelo Ollama local (que usa o login do próprio Ollama; nenhuma chave aqui).
// Uso: node workers/coruja-guia/teste-observatorio.mjs
import assert from "node:assert/strict";
import { perguntar, limparMemoria, validarConversa } from "./observatorio.mjs";

const env = {
  PANORAMA_ASSETS: "https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/assets/",
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434/api/chat",
  MODELO: process.env.MODELO || "deepseek-v4.1-flash:cloud",
};

// Sem IA: validação e memória forjada.
assert.equal(validarConversa({ pergunta: "  " }), "esperava uma pergunta");
assert.equal(validarConversa({ pergunta: "x".repeat(501) }), "pergunta longa demais");
const m = limparMemoria({ trocas: [1, { pergunta: "a", resposta: "b".repeat(5000) }, { pergunta: "c" }], foco: { modelos: ["gemini-4-hydrogen", "<script>", 3], area: "hack" } });
assert.equal(m.trocas.length, 2); assert.equal(m.trocas[0].resposta.length, 600);
assert.deepEqual(m.foco, { modelos: ["gemini-4-hydrogen"], area: null });
// IA falsa que não chama ferramenta: ainda responde com formato certo.
const falsa = async () => ({ ok: true, mensagem: { content: "Só falo sobre os dados desta página." } });
const r0 = await perguntar(env, { pergunta: "qual a capital da França?" }, { ia: falsa });
assert.equal(r0.ok, true); assert.ok(r0.titulo);
console.log("testes sem IA: ok");

let memoria = null;
for (const q of ["vale subir o hydrogen de high para xhigh?", "e se eu descer para medium?", "qual o mais barato que seja bom em direito?"]) {
  const t0 = Date.now();
  const r = await perguntar(env, { pergunta: q, memoria });
  console.log(`\n=== ${q}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (!r.ok) { console.log("FALHOU:", r.erro); process.exitCode = 1; continue; }
  console.log(r.titulo); for (const p of r.texto) console.log("  " + p);
  console.log(`  blocos: ${r.blocos.map((b) => b.cartao).join(",") || "-"} · fontes: ${r.fontes.map((f) => f.nome).join(",")} · conferida ${r.conferida} · ${r._log.ferramentas} · ${r.uso.entrada}→${r.uso.saida} tokens`);
  memoria = r.memoria;
}
