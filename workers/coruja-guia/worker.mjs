// Worker da coruja do "Qual modelo usar" (Cloudflare). O único lugar onde a
// chave do Ollama existe (segredo OLLAMA_CHAVE). Separado do Worker do curso
// "Do chat ao agente", para um não derrubar o outro.
//
// Configuração em wrangler.toml: ORIGENS, MODELO, OLLAMA_URL, IA_LIGADA, PANORAMA_ASSETS.
// Dois tipos de pedido: { modo, ... } (coruja antiga da página no ar) e
// { pergunta, memoria } ("Pergunte ao Observatório", observatorio.mjs).
// IA_LIGADA diferente de "sim" desliga a IA sem apagar nada: a página segue
// com os textos que ela mesma monta. O log nunca guarda o texto das pessoas.
import { DurableObject } from "cloudflare:workers";
import { LIMITES, chamarOllama, lerEquipe, mensagens, numerosConferem, novoEstado, reservar, validar } from "./nucleo.mjs";
import { perguntar, validarConversa } from "./observatorio.mjs";

const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export class Contador extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.estado = (await ctx.storage.get("estado")) ?? novoEstado(); });
  }
  async reservar(aparelho) {
    const r = reservar(this.estado, { aparelho, agora: Date.now(), dia: hoje() });
    if (r.ok) await this.ctx.storage.put("estado", this.estado);
    return r;
  }
}

const json = (status, corpo, cors = {}) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors } });

export default {
  async fetch(request, env) {
    const origens = String(env.ORIGENS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
    const origem = request.headers.get("Origin") ?? "";
    const cors = origens.includes(origem) ? { "Access-Control-Allow-Origin": origem, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" } : null;
    if (request.method === "OPTIONS") return cors ? new Response(null, { status: 204, headers: cors }) : json(403, { erro: "origem não permitida" });
    if (request.method !== "POST") return json(405, { erro: "só POST" });
    if (!cors) return json(403, { erro: "origem não permitida" });
    if (env.IA_LIGADA !== "sim") return json(503, { erro: "IA desligada" }, cors);

    const texto = await request.text();
    if (texto.length > LIMITES.corpo) return json(413, { erro: "pedido grande demais" }, cors);
    let corpo;
    try { corpo = JSON.parse(texto); } catch { return json(400, { erro: "esperava JSON" }, cors); }
    const conversa = corpo && typeof corpo === "object" && !("modo" in corpo) && "pergunta" in corpo;
    const problema = conversa ? validarConversa(corpo) : validar(corpo);
    if (problema) return json(400, { erro: problema }, cors);

    const aparelho = String(corpo.aparelho ?? "anonimo").replace(/[^\w-]/g, "").slice(0, 40) || "anonimo";
    const contador = env.CONTADOR.get(env.CONTADOR.idFromName("geral"));
    const r = await contador.reservar(aparelho);
    if (!r.ok) return json(r.status, { erro: r.motivo }, cors);

    if (conversa) {
      let r;
      try { r = await perguntar(env, corpo); } catch (e) { r = { ok: false, erro: "dados indisponíveis" }; console.log(`[${hoje()}] conversa: ${e?.message ?? e}`); }
      if (!r.ok) { console.log(`[${hoje()}] conversa: ${r.erro}`); return json(502, { ok: false, erro: "IA fora do ar" }, cors); }
      const { _log, ...resposta } = r;
      console.log(`[${hoje()}] conversa: ${_log.ferramentas || "sem ferramenta"} · ${r.uso.rodadas} rodadas · ${r.uso.entrada}→${r.uso.saida} tokens · conferida ${r.conferida}${_log.descartados ? ` (${_log.descartados} números fora)` : ""}`);
      return json(200, resposta, cors);
    }

    const equipe = corpo.modo === "equipe";
    const resposta = await chamarOllama({ url: env.OLLAMA_URL, chave: env.OLLAMA_CHAVE, modelo: env.MODELO, mensagens: mensagens(corpo), json: equipe, sinal: request.signal });
    console.log(`[${hoje()}] ${corpo.modo}: ${resposta.ok ? `${resposta.entrada ?? "?"} → ${resposta.saida ?? "?"} tokens` : resposta.motivo}`);
    if (!resposta.ok) return json(502, { erro: "IA fora do ar" }, cors);
    if (equipe) return json(200, { planos: lerEquipe(resposta.texto, corpo) }, cors);
    // Número que não veio da página: a resposta é descartada e a página usa o próprio texto.
    if (!numerosConferem(resposta.texto, corpo)) {
      console.log(`[${hoje()}] ${corpo.modo}: resposta descartada (número fora dos dados)`);
      return json(200, { texto: "" }, cors);
    }
    return json(200, { texto: resposta.texto }, cors);
  },
};
