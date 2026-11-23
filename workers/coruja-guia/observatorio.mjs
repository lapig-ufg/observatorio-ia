// "Pergunte ao Observatório": a conversa com IA que usa o motor do guia de modelos.
// A IA escolhe ferramentas do motor e redige; todo número sai do motor (motor/conversa.mjs
// confere a resposta e, se a IA inventar número, usa o texto calculado pelo motor).
//
// src/panorama/guia/motor/ (motor.mjs, conversa.mjs, perfis.json) é cópia do conselheiro-ia
// (pasta motor/ de lá). Ao mudar lá, copiar de novo e rodar os testes.
import { carregar, AREA_KEYS } from "../../src/panorama/guia/motor/motor.mjs";
import { conversar, ollama, LIMITES as LIMITES_CONVERSA } from "../../src/panorama/guia/motor/conversa.mjs";
import perfis from "../../src/panorama/guia/motor/perfis.json" with { type: "json" };

const ARQUIVOS = ["guia-modelos", "guia-fontes", "guia-planos"];
const VALIDADE_MS = 60 * 60 * 1000; // os dados do Panorama mudam no máximo uma vez por dia
let cache = null; // { base, quando }

/** Carrega os dados publicados do Panorama (com cache de 1 h por instância do worker). */
export async function baseDoPanorama(assets, buscar = fetch, agora = Date.now()) {
  if (cache && agora - cache.quando < VALIDADE_MS) return cache.base;
  try {
    const raiz = String(assets).replace(/\/?$/, "/");
    const [modelos, fontes, planos] = await Promise.all(ARQUIVOS.map(async (f) => {
      const r = await buscar(`${raiz}${f}.json`, { cf: { cacheTtl: 3600 } });
      if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      return r.json();
    }));
    cache = { base: carregar({ modelos, fontes, planos, perfis }), quando: agora };
    return cache.base;
  } catch (e) {
    if (cache) return cache.base; // dado velho é melhor que nenhum
    throw e;
  }
}

const texto = (v, max) => String(v ?? "").slice(0, max);

/** A memória vem do navegador: só passa o formato esperado, com tamanho limitado. */
export function limparMemoria(m) {
  if (!m || typeof m !== "object") return null;
  const trocas = (Array.isArray(m.trocas) ? m.trocas : []).slice(-LIMITES_CONVERSA.trocas)
    .filter((t) => t && typeof t === "object")
    .map((t) => ({ pergunta: texto(t.pergunta, LIMITES_CONVERSA.pergunta), resposta: texto(t.resposta, 600) }));
  const foco = m.foco && typeof m.foco === "object" ? m.foco : {};
  const modelos = (Array.isArray(foco.modelos) ? foco.modelos : [])
    .filter((x) => typeof x === "string" && /^[\w.:-]{1,60}$/.test(x)).slice(0, 4);
  const area = AREA_KEYS.includes(foco.area) ? foco.area : null;
  return { trocas, foco: { modelos, area } };
}

/** Valida o pedido da conversa: { pergunta, memoria?, idioma? }. */
export function validarConversa(corpo) {
  const p = String(corpo?.pergunta ?? "").trim();
  if (!p) return "esperava uma pergunta";
  if (p.length > LIMITES_CONVERSA.pergunta) return "pergunta longa demais";
  return "";
}

/** Responde uma pergunta. `ia` é opcional (testes); no worker, é o Ollama Cloud. */
export async function perguntar(env, corpo, { ia = null, buscar = fetch } = {}) {
  const base = await baseDoPanorama(env.PANORAMA_ASSETS, buscar);
  const adaptador = ia ?? ollama({ url: env.OLLAMA_URL, modelo: env.MODELO, chave: env.OLLAMA_CHAVE, prazo: 40_000 });
  const r = await conversar({ base, pergunta: corpo.pergunta, memoria: limparMemoria(corpo.memoria), ia: adaptador, idioma: corpo.idioma === "en" ? "en" : "pt" });
  if (!r.ok) return r;
  // `ferramentas_usadas` e `numeros_descartados` ficam só no log.
  const { ferramentas_usadas, numeros_descartados, ...publico } = r;
  return { ...publico, _log: { ferramentas: ferramentas_usadas.map((f) => f.nome).join(","), descartados: numeros_descartados.length } };
}

export function _zerarCache() { cache = null; }
