// Motor de análise do "Qual modelo usar" (nov/2026).
//
// Um código só, sem IA e sem dependências, para três lugares: a página do
// Observatório, o worker da Coruja e o uso local do Victor (linha de comando).
// Desenho completo em ../design/FERRAMENTAS.md.
//
// Regras guardadas aqui:
// - número só sai daqui: toda ferramenta devolve os números e frases prontas;
// - diferença menor que 1 ponto é empate, nunca vitória;
// - dado ausente é ausente: nada vira zero;
// - resposta enxuta: listas com no máximo 10 linhas;
// - toda resposta traz `ver`, o cartão da página que mostra aquele resultado.

export const AREAS = {
  intelligence: "Inteligência geral",
  finance: "Finanças",
  strategy: "Estratégia e operações",
  legal: "Direito",
  health: "Saúde",
  engineering: "Engenharia",
  economics: "Economia",
};
export const AREA_KEYS = Object.keys(AREAS);
export const ORDEM_ESFORCO = ["non-reasoning", "minimal", "low", "medium", "high", "xhigh", "max", "single"];
const RACIOCINIO = ["minimal", "low", "medium", "high", "xhigh", "max"];
export const EMPATE = 1;
export const LIMITE_LINHAS = 10;
/** Linha do selo: na escada dos modelos, dobrar o custo costuma render 6 a 7 pontos. */
export const PONTOS_POR_DOBRA = 6;
/** Acima disto o tempo pesa no selo do degrau. */
export const TEMPO_MAX_DEGRAU = 2;

/* ─── leitura defensiva ─── */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === "string" ? v : "");
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const posEsforco = (e) => { const i = ORDEM_ESFORCO.indexOf(e); return i < 0 ? ORDEM_ESFORCO.length : i; };

/**
 * Junta os arquivos publicados pelo Panorama (guia-modelos, guia-fontes, guia-planos)
 * e os perfis de tarefa numa base única. Só `modelos` é obrigatório.
 */
export function carregar({ modelos, fontes = null, planos = null, perfis = null } = {}) {
  const raiz = obj(modelos);
  const familias = [];
  for (const f of arr(raiz.families)) {
    const id = str(f.id), nome = str(f.name);
    if (!id || !nome) continue;
    const variantes = arr(f.variants).map((v) => {
      const notas = obj(v.scores);
      return {
        esforco: str(v.effort) || "single",
        notas: Object.fromEntries(AREA_KEYS.map((k) => [k, num(notas[k])])),
        custo: num(v.cost_per_task),
        tempo: num(v.e2e_s),
        tps: num(v.tps),
        preco: num(obj(v.price).blended_3_1),
      };
    }).sort((a, b) => posEsforco(a.esforco) - posEsforco(b.esforco));
    if (!variantes.some((v) => AREA_KEYS.some((k) => v.notas[k] !== null))) continue;
    familias.push({ id, nome, empresa: str(f.creator) || "—", lancamento: str(f.release_date), pesosAbertos: typeof f.open_weights === "boolean" ? f.open_weights : null, variantes });
  }
  const base = {
    coletadoEm: str(raiz.fetched_at),
    versaoIndice: num(raiz.intelligence_index_version),
    familias,
    porId: new Map(familias.map((f) => [f.id, f])),
    fontes: lerFontes(fontes),
    planos: lerPlanos(planos),
    perfis: lerPerfis(perfis),
  };
  base.fontesInfo = montarFontesInfo(base, raiz);
  return base;
}

/* ─── de onde sai cada número ─── */

/** Nome original de cada índice na Artificial Analysis (para a pessoa achar no site deles). */
export const INDICES_AA = {
  intelligence: "Intelligence Index",
  finance: "Finance and Accounting Index",
  strategy: "Strategy and Operations Index",
  legal: "Legal Index",
  health: "Healthcare and Medical Index",
  engineering: "Engineering Index",
  economics: "Economics Index",
};

function montarFontesInfo(base, raiz) {
  const v = base.versaoIndice ? ` v${base.versaoIndice}` : "";
  const info = {
    aa: {
      id: "aa", nome: "Artificial Analysis", url: str(raiz.source_url) || "https://artificialanalysis.ai/", coletadoEm: base.coletadoEm,
      mede: "acerto em tarefas difíceis, por índice (0 a 100), mais custo e tempo medidos nas mesmas tarefas",
      medidas: {
        nota: (area = "intelligence") => `${INDICES_AA[area] ?? area}${area === "intelligence" ? v : ""} da Artificial Analysis (0 a 100)`,
        custo: "custo médio por tarefa que a Artificial Analysis pagou pela API ao rodar o índice",
        tempo: "tempo típico de resposta medido pela Artificial Analysis, do envio ao fim da resposta",
      },
    },
  };
  // Vals AI fica de fora: sem licença de republicação (ver guia-fontes.json).
  for (const id of ["lmarena", "epoch"]) {
    const f = base.fontes?.info[id];
    if (f) info[id] = { id, nome: f.nome, url: f.url, coletadoEm: f.coletadoEm, mede: f.mede };
  }
  return info;
}

/** Quais fontes cada ferramenta usa. */
export const FONTES_POR_FERRAMENTA = {
  achar_modelo: [], placar: ["aa"], ranking: ["aa"], escada: ["aa"], degrau: ["aa"], comparar: ["aa"],
  parecidos: ["aa"], perfil_tarefa: ["aa"], outras_fontes: ["lmarena", "epoch"], abismo: ["aa"], montar_time: ["aa"],
  explicar_metodo: [], opcoes: [],
};

/** As fontes de uma ferramenta, prontas para mostrar: nome, link, data e o que medem. */
export function fontesDe(base, ferramenta) {
  return (FONTES_POR_FERRAMENTA[ferramenta] ?? []).map((id) => base.fontesInfo[id]).filter(Boolean).map((f) => ({
    id: f.id, nome: f.nome, url: f.url, coletado_em: f.coletadoEm ? f.coletadoEm.slice(0, 10) : null, mede: f.mede,
  }));
}

function lerFontes(json) {
  if (!json) return null;
  const raiz = obj(json);
  const info = Object.fromEntries(Object.entries(obj(raiz.sources)).map(([id, s]) => [id, { nome: str(s.name) || id, url: str(s.url), mede: str(s.measures), coletadoEm: str(s.collected_at), licenca: str(s.license) }]));
  const familias = new Map();
  for (const [id, f] of Object.entries(obj(raiz.families))) {
    const intervalo = (v) => { const o = obj(v); return num(o.rating) === null ? null : { nota: num(o.rating), min: num(o.lower), max: num(o.upper), votos: num(o.votes), posicao: num(o.rank), total: num(o.n) }; };
    const lmarena = arr(f.lmarena).map((e) => ({
      esforco: str(e.effort) || null,
      geral: intervalo(e.overall),
      categorias: Object.fromEntries(Object.entries(obj(e.categories)).map(([c, v]) => [c, intervalo(v)]).filter(([, v]) => v)),
    })).filter((e) => e.geral);
    const ep = obj(f.epoch);
    const epoch = Object.keys(obj(ep.benchmarks)).length ? {
      esforco: str(ep.effort) || null,
      testes: Object.entries(obj(ep.benchmarks)).flatMap(([k, b]) => num(obj(b).score) === null ? [] : [{ chave: k, nome: str(b.label) || k, nota: b.score }]),
    } : null;
    familias.set(id, { lmarena, epoch });
  }
  return { info, familias };
}

function lerPlanos(json) {
  if (!json) return null;
  const raiz = obj(json);
  const planos = arr(raiz.plans).flatMap((p) => str(p.id) ? [{
    id: p.id, empresa: str(p.provider), nome: str(p.name) || p.id, preco: str(p.price), fonte: str(p.source_url),
    familias: arr(p.families).flatMap((f) => str(f.id) ? [{ id: f.id, esforcos: Array.isArray(f.efforts) && f.efforts.length ? f.efforts.map(str) : null }] : []),
  }] : []);
  const padroes = new Map(Object.entries(obj(raiz.defaults)).flatMap(([id, d]) => str(d.effort) ? [[id, str(d.effort)]] : []));
  return { conferidoEm: str(raiz.checked_at), planos, padroes };
}

/** Perfis: aceita a lista de `dados-publicos.json` ou o objeto de `dados/perfis.json`.
    Só os pesos dos 7 índices da AA entram; pesos de outra origem ficam de fora e são avisados. */
function lerPerfis(json) {
  if (!json) return [];
  const lista = Array.isArray(json) ? json : Array.isArray(json.perfis) ? json.perfis : Object.entries(obj(json.perfis ?? json)).map(([key, p]) => ({ key, ...p }));
  return lista.flatMap((p) => {
    const pesosBrutos = obj(p.pesos ?? p.qualidade);
    const pesos = Object.fromEntries(Object.entries(pesosBrutos).filter(([k, v]) => AREA_KEYS.includes(k) && num(v)));
    const fora = Object.keys(pesosBrutos).filter((k) => !AREA_KEYS.includes(k));
    if (!str(p.key) || !Object.keys(pesos).length) return [];
    // Ficam de fora os perfis que dependem do que a AA não mede: gerar imagem ("imagem"),
    // a nota pessoal de escrita ("escrita") e ser de outra família ("segunda-opiniao").
    // Só com as notas de texto, eles pareceriam medir algo que não medem.
    if (p.gera_imagem || p.diversidade || fora.length) return [];
    return [{ chave: p.key, nome: str(p.nome) || p.key, descricao: str(p.descricao), pesos, piso: num(p.piso), risco: str(p.risco), fora }];
  });
}

/* ─── formatos (português) ─── */

const virgula = (n, casas = 1) => n.toFixed(casas).replace(".", ",");
export const fmt = {
  nota: (n) => (n === null || n === undefined ? "sem dado" : virgula(n)),
  custo: (c) => (c === null || c === undefined ? "sem dado" : c < 0.001 ? "< US$ 0,001" : "US$ " + virgula(c, c < 0.1 ? 3 : 2)),
  tempo: (s) => {
    if (s === null || s === undefined) return "sem dado";
    const t = Math.round(s);
    if (t < 60) return `${t} s`;
    const m = Math.floor(t / 60), r = t % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  },
  vezes: (r) => (r >= 10 ? String(Math.round(r)) : virgula(r)) + "×",
  pontos: (d) => `${d >= 0 ? "+" : "−"}${virgula(Math.abs(d))} pontos`,
  esforco: (e) => ({ "non-reasoning": "sem raciocínio", single: "único" }[e] ?? e),
  data: (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso ?? "")) ? String(iso).slice(0, 10).split("-").reverse().join("/") : "data desconhecida"),
};
const nomeVar = (f, v) => (v.esforco === "single" ? f.nome : `${f.nome} ${fmt.esforco(v.esforco)}`);
/** "custo 2,3× maior", "tempo 1,6× menor", "mesmo custo". */
function relacao(rotulo, de, para) {
  if (!(de > 0) || !(para > 0)) return `${rotulo} sem dado`;
  if (para > de) return `${rotulo} ${fmt.vezes(para / de)} maior`;
  if (para < de) return `${rotulo} ${fmt.vezes(de / para)} menor`;
  return `mesmo ${rotulo}`;
}
const razao = (de, para) => (de > 0 && para > 0 ? para / de : null);
const arred = (n, c = 2) => (n === null ? null : Math.round(n * 10 ** c) / 10 ** c);

/* ─── peças comuns ─── */

function nota(v, area = "intelligence", perfil = null) {
  if (!perfil) return v.notas[area];
  let soma = 0, peso = 0;
  for (const [k, w] of Object.entries(perfil.pesos)) {
    if (v.notas[k] === null) return null; // dado ausente não vira zero
    soma += v.notas[k] * w; peso += w;
  }
  return peso ? soma / peso : null;
}

function resumoVar(f, v, area = "intelligence", perfil = null) {
  return { modelo: f.id, nome: f.nome, empresa: f.empresa, esforco: v.esforco, nota: arred(nota(v, area, perfil), 1), custo: arred(v.custo, 4), tempo: arred(v.tempo, 1), custo_txt: fmt.custo(v.custo), tempo_txt: fmt.tempo(v.tempo) };
}

function passaFiltros(f, v, filtros = {}, area, perfil) {
  if (filtros.pesos_abertos && f.pesosAbertos !== true) return false;
  if (filtros.empresa && !normal(f.empresa).includes(normal(filtros.empresa))) return false;
  if (num(filtros.custo_max) !== null && !(v.custo !== null && v.custo <= filtros.custo_max)) return false;
  if (num(filtros.tempo_max) !== null && !(v.tempo !== null && v.tempo <= filtros.tempo_max)) return false;
  if (num(filtros.nota_min) !== null && !((nota(v, area, perfil) ?? -1) >= filtros.nota_min)) return false;
  if (Array.isArray(filtros.modelos) && !filtros.modelos.includes(f.id)) return false;
  return true;
}

/** Filtro sem dado na base não pode virar "nenhum modelo": diz que falta o dado. */
function filtroSemDado(base, filtros = {}) {
  if (filtros.pesos_abertos && !base.familias.some((f) => f.pesosAbertos === true)) return erro("a base não informa quais modelos têm pesos abertos (a fonte atual não traz esse dado)");
  return null;
}

function area(a) {
  if (!a) return "intelligence";
  if (AREA_KEYS.includes(a)) return a;
  const n = normal(a);
  const achada = AREA_KEYS.find((k) => normal(AREAS[k]).includes(n) || n.includes(normal(AREAS[k]).split(" ")[0]));
  const apelidos = { codigo: "engineering", programacao: "engineering", juridico: "legal", direito: "legal", medicina: "health", geral: "intelligence", inteligencia: "intelligence", contabilidade: "finance", economia: "economics", estrategia: "strategy" };
  return achada ?? apelidos[n] ?? null;
}

function erro(mensagem, extra = {}) { return { ok: false, erro: mensagem, ...extra }; }

/* ─── 1. achar_modelo ─── */

export function normal(t) {
  return String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const PALAVRAS_ESFORCO = [
  [/\b(sem raciocinio|sem pensar|non reasoning|nao raciocina)\b/, "non-reasoning"],
  [/\b(extra alto|muito alto|xhigh|x high|extra high)\b/, "xhigh"],
  [/\b(maximo|max|maxima)\b/, "max"],
  [/\b(minimo|minimal|minima)\b/, "minimal"],
  [/\b(baixo|low|baixa)\b/, "low"],
  [/\b(medio|medium|media|med)\b/, "medium"],
  [/\b(alto|high|alta)\b/, "high"],
];
const RUIDO = new Set(["o", "a", "no", "na", "em", "de", "do", "da", "modelo", "esforco", "nivel", "effort", "com", "e", "versao", "pensando", "thinking"]);

/** "opus 5.5 médio" → Claude Opus 5.5, medium. Entre várias famílias que casam, fica a mais recente. */
export function achar_modelo(base, { texto, esforco = null } = {}) {
  let t = normal(texto);
  if (!t) return erro("texto vazio");
  let esf = esforco ? normalizarEsforco(esforco) : null;
  for (const [re, e] of PALAVRAS_ESFORCO) {
    if (re.test(t)) { if (!esf) esf = e; t = t.replace(re, " "); }
  }
  const pedaços = t.split(" ").filter((p) => p && !RUIDO.has(p));
  if (!pedaços.length) return erro("não reconheci o nome do modelo", { texto });
  const exato = base.porId.get(String(texto).trim());
  const casam = exato ? [exato] : base.familias.filter((f) => {
    const alvo = ` ${normal(f.nome)} ${normal(f.id)} ${normal(f.empresa)} `;
    return pedaços.every((p) => alvo.includes(` ${p} `) || (p.length >= 4 && alvo.includes(p)));
  }).sort((a, b) => b.lancamento.localeCompare(a.lancamento) || a.nome.length - b.nome.length);
  if (!casam.length) return erro(`nenhum modelo com "${texto}"`, { texto });
  const f = casam[0];
  const resultado = { ok: true, modelo: f.id, nome: f.nome, empresa: f.empresa, esforcos: f.variantes.map((v) => v.esforco) };
  if (esf) {
    if (f.variantes.some((v) => v.esforco === esf)) resultado.esforco = esf;
    else resultado.aviso = `${f.nome} não tem o nível ${fmt.esforco(esf)} medido; níveis medidos: ${f.variantes.map((v) => fmt.esforco(v.esforco)).join(", ")}`;
  }
  if (casam.length > 1) resultado.alternativas = casam.slice(1, 4).map((x) => ({ modelo: x.id, nome: x.nome }));
  resultado.frases = [`Entendi ${f.nome}${resultado.esforco ? ` em ${fmt.esforco(resultado.esforco)}` : ""}.`, resultado.aviso].filter(Boolean);
  resultado.ver = { cartao: "painel_modelo", params: { modelo: f.id, esforco: resultado.esforco ?? null } };
  return resultado;
}

function normalizarEsforco(e) {
  const n = normal(e);
  if (ORDEM_ESFORCO.includes(e)) return e;
  for (const [re, val] of PALAVRAS_ESFORCO) if (re.test(n)) return val;
  return e;
}

/** Aceita id, texto livre ou {modelo, esforco}. Devolve {f, v} ou um erro. */
function resolver(base, modelo, esforco = null, { area: a = "intelligence", padrao = "teto" } = {}) {
  let f = base.porId.get(modelo), esf = esforco ? normalizarEsforco(esforco) : null;
  if (!f) {
    const r = achar_modelo(base, { texto: modelo, esforco });
    if (!r.ok) return r;
    f = base.porId.get(r.modelo);
    esf = esf ?? r.esforco ?? null;
  }
  let v = esf ? f.variantes.find((x) => x.esforco === esf) : null;
  if (esf && !v) return erro(`${f.nome} não tem o nível ${fmt.esforco(esf)} medido`, { esforcos: f.variantes.map((x) => x.esforco) });
  if (!v) v = padrao === "teto" ? teto(f, a) : f.variantes[f.variantes.length - 1];
  return { ok: true, f, v };
}

/** O nível de maior nota na área (empate na nota fica com o mais barato). */
function teto(f, a = "intelligence", perfil = null) {
  let melhor = null;
  for (const v of f.variantes) {
    const s = nota(v, a, perfil);
    if (s === null) continue;
    const b = melhor ? nota(melhor, a, perfil) : null;
    if (b === null || s > b || (s === b && (v.custo ?? Infinity) < (melhor.custo ?? Infinity))) melhor = v;
  }
  return melhor;
}

/* ─── 2. placar ─── */

/** O mais inteligente, e o mais barato e o mais rápido a até `tolerancia` pontos dele. Compara níveis de esforço, não famílias. */
export function placar(base, { area: a = "intelligence", tolerancia = 10, filtros = {} } = {}) {
  const k = area(a);
  if (!k) return erro(`área desconhecida: ${a}`, { areas: AREA_KEYS });
  const semDado = filtroSemDado(base, filtros);
  if (semDado) return semDado;
  const tol = Math.max(0, Math.min(25, num(Number(tolerancia)) ?? 10));
  const todas = base.familias.flatMap((f) => f.variantes.filter((v) => v.notas[k] !== null && passaFiltros(f, v, filtros, k)).map((v) => ({ f, v })));
  if (!todas.length) return erro("nenhum modelo passa nos filtros");
  const topo = todas.reduce((m, x) => (x.v.notas[k] > m.v.notas[k] ? x : m));
  const max = topo.v.notas[k];
  const empatados = [...new Set(todas.filter((x) => x.f.id !== topo.f.id && max - x.v.notas[k] < EMPATE).map((x) => x.f.nome))];
  const piso = max - tol;
  const elegiveis = todas.filter((x) => x.v.notas[k] >= piso - 1e-9);
  const menor = (campo) => elegiveis.filter((x) => x.v[campo] !== null).reduce((m, x) => (!m || x.v[campo] < m.v[campo] || (x.v[campo] === m.v[campo] && x.v.notas[k] > m.v.notas[k]) ? x : m), null);
  const barato = menor("custo"), rapido = menor("tempo");
  const cartao = (x, titulo, destaque) => x && ({
    titulo, ...resumoVar(x.f, x.v, k), destaque,
    abre_mao: x === topo || (x.f.id === topo.f.id && x.v.esforco === topo.v.esforco) ? "é o próprio melhor" : abreMao(x.v, topo.v, k),
  });
  const r = {
    ok: true, area: k, nome_area: AREAS[k], tolerancia: tol, piso: arred(piso, 1),
    mais_inteligente: { ...cartao(topo, "Mais inteligente", `${fmt.nota(max)} pontos`), abre_mao: "referência do placar", empatados_com: empatados },
    mais_barato: cartao(barato, "Mais barato acima do piso", barato && fmt.custo(barato.v.custo)),
    mais_rapido: cartao(rapido, "Mais rápido acima do piso", rapido && fmt.tempo(rapido.v.tempo)),
  };
  r.frases = [
    `Em ${AREAS[k].toLowerCase()}, o topo é ${nomeVar(topo.f, topo.v)}, com ${fmt.nota(max)} pontos${empatados.length ? ` (empate técnico com ${empatados.join(", ")})` : ""}.`,
    barato && `Aceitando até ${virgula(tol, 0)} pontos abaixo, o mais barato é ${nomeVar(barato.f, barato.v)}: ${fmt.custo(barato.v.custo)} por tarefa (${r.mais_barato.abre_mao}).`,
    rapido && `O mais rápido nessa faixa é ${nomeVar(rapido.f, rapido.v)}: ${fmt.tempo(rapido.v.tempo)} (${r.mais_rapido.abre_mao}).`,
    tol === 0 ? "Com tolerância 0, os três cartões tendem a mostrar o próprio topo: a régua serve para revelar opções bem mais baratas ou rápidas poucos pontos atrás." : null,
  ].filter(Boolean);
  r.resposta = (() => {
    const area = AREAS[k].toLowerCase();
    if (!barato || (barato.f.id === topo.f.id && barato.v.esforco === topo.v.esforco)) {
      return { titulo: `Em ${area}, ninguém chega perto do ${nomeVar(topo.f, topo.v)} por menos.`, texto: [`Com a margem de ${virgula(tol, 0)} pontos, o próprio topo (${fmt.nota(max)} pontos) já é o mais barato. Aumente a margem para ver opções mais baratas.`] };
    }
    const d = max - barato.v.notas[k];
    const texto = [
      `${nomeVar(barato.f, barato.v)} fica ${virgula(d)} pontos abaixo do melhor (${nomeVar(topo.f, topo.v)}, ${fmt.nota(max)}) e custa ${fmt.custo(barato.v.custo)} por tarefa${topo.v.custo ? `, ${fmt.vezes(topo.v.custo / barato.v.custo)} menos` : ""}.`,
    ];
    if (rapido && !(rapido.f.id === barato.f.id && rapido.v.esforco === barato.v.esforco)) texto.push(`Se a pressa pesa mais que o preço, ${nomeVar(rapido.f, rapido.v)} responde em ${fmt.tempo(rapido.v.tempo)} (${fmt.nota(rapido.v.notas[k])} pontos).`);
    else if (rapido) texto.push(`Ele também é o mais rápido dessa faixa (${fmt.tempo(rapido.v.tempo)}).`);
    texto.push(`A margem de ${virgula(tol, 0)} pontos é o quanto você aceita ficar abaixo do melhor; ${tol <= 5 ? "é uma margem apertada" : tol >= 15 ? "é uma margem larga, boa para tarefas simples" : "é um meio-termo razoável para o dia a dia"}.`);
    return { titulo: `Em ${area}, ${nomeVar(barato.f, barato.v)} entrega quase o mesmo por bem menos.`, texto };
  })();
  r.ver = { cartao: "placar", params: { area: k, tolerancia: tol } };
  return r;
}

function abreMao(v, topoV, k) {
  const d = topoV.notas[k] - v.notas[k];
  return [d < 0.05 ? "mesma nota do melhor" : `${virgula(d)} pontos abaixo do melhor`, relacao("custo", topoV.custo, v.custo), relacao("tempo", topoV.tempo, v.tempo)].join(" · ");
}

/* ─── 3. ranking (e 8. perfil_tarefa) ─── */

/** Cada família no seu melhor nível na área (ou no perfil). Ordena por nota, custo ou tempo. */
export function ranking(base, { area: a = "intelligence", perfil = null, ordenar = "nota", limite = LIMITE_LINHAS, filtros = {} } = {}) {
  const p = perfil ? base.perfis.find((x) => x.chave === perfil || normal(x.nome).includes(normal(perfil))) : null;
  if (perfil && !p) return erro(`perfil desconhecido: ${perfil}`, { perfis: base.perfis.map((x) => x.chave) });
  const k = p ? null : area(a);
  if (!p && !k) return erro(`área desconhecida: ${a}`, { areas: AREA_KEYS });
  const semDado = filtroSemDado(base, filtros);
  if (semDado) return semDado;
  const campo = { nota: "nota", custo: "custo", tempo: "tempo" }[ordenar] ?? "nota";
  const piso = p?.piso ?? null;
  const linhas = base.familias.flatMap((f) => {
    const vs = f.variantes.filter((v) => nota(v, k, p) !== null && passaFiltros(f, v, filtros, k, p));
    if (!vs.length) return [];
    // nota: o melhor nível; custo/tempo: o nível mais barato/rápido que passa no piso do perfil (ou o teto).
    let v;
    if (campo === "nota") v = vs.reduce((m, x) => (nota(x, k, p) > nota(m, k, p) || (nota(x, k, p) === nota(m, k, p) && (x.custo ?? Infinity) < (m.custo ?? Infinity)) ? x : m));
    else {
      const ok = vs.filter((x) => x[campo] !== null && (piso === null || nota(x, k, p) >= piso));
      if (!ok.length) return [];
      v = ok.reduce((m, x) => (x[campo] < m[campo] ? x : m));
    }
    return [{ f, v, s: nota(v, k, p) }];
  });
  linhas.sort(campo === "nota" ? (x, y) => y.s - x.s || (x.v.custo ?? Infinity) - (y.v.custo ?? Infinity) : (x, y) => x.v[campo] - y.v[campo] || y.s - x.s);
  const lim = Math.max(1, Math.min(LIMITE_LINHAS, Number(limite) || LIMITE_LINHAS));
  const saida = linhas.slice(0, lim).map((x, i) => ({
    posicao: i + 1, ...resumoVar(x.f, x.v, k, p),
    empate_com_anterior: campo === "nota" && i > 0 && linhas[i - 1].s - x.s < EMPATE,
    abaixo_do_piso: piso !== null && x.s < piso,
  }));
  const emTitulo = p ? `No perfil "${p.nome}"` : `Em ${AREAS[k].toLowerCase()}`;
  const r = { ok: true, area: k, perfil: p && { chave: p.chave, nome: p.nome, pesos: p.pesos, piso: p.piso, risco: p.risco }, ordenar: campo, total: linhas.length, linhas: saida };
  const l1 = saida[0];
  r.frases = [
    campo === "nota" ? `${emTitulo}, ${nomeVarR(l1)} lidera com ${fmt.nota(l1.nota)} pontos${saida[1]?.empate_com_anterior ? `, em empate técnico com ${nomeVarR(saida[1])}` : ""}.`
      : `${emTitulo}, ${campo === "custo" ? "o mais barato" : "o mais rápido"}${piso !== null ? ` com nota a partir de ${fmt.nota(piso)}` : ""} é ${nomeVarR(l1)}: ${campo === "custo" ? fmt.custo(l1.custo) : fmt.tempo(l1.tempo)} (${fmt.nota(l1.nota)} pontos).`,
    p ? `O perfil pondera ${Object.entries(p.pesos).map(([kk, w]) => `${AREAS[kk].toLowerCase()} ${Math.round(w * 100)}%`).join(", ")}${p.piso !== null ? `; abaixo de ${fmt.nota(p.piso)} pontos o risco de errar é alto para esse uso` : ""}.` : null,
    p?.fora.length ? `Parte do perfil original (${p.fora.join(", ")}) não vem da AA e ficou fora desta conta.` : null,
  ].filter(Boolean);
  r.ver = { cartao: "ranking", params: { area: k, perfil: p?.chave ?? null, ordenar: campo, filtros } };
  return r;
}
const nomeVarR = (l) => (l.esforco === "single" ? l.nome : `${l.nome} ${fmt.esforco(l.esforco)}`);

export function perfil_tarefa(base, { perfil, ordenar = "nota", limite = LIMITE_LINHAS, filtros = {} } = {}) {
  if (!perfil) return { ok: true, perfis: base.perfis.map((p) => ({ chave: p.chave, nome: p.nome, descricao: p.descricao, piso: p.piso, risco: p.risco })), ver: null };
  return ranking(base, { perfil, ordenar, limite, filtros });
}

/* ─── 4. escada ─── */

export function escada(base, { modelo, esforco = null, area: a = "intelligence" } = {}) {
  const k = area(a);
  if (!k) return erro(`área desconhecida: ${a}`);
  const r0 = resolver(base, modelo, esforco, { area: k });
  if (!r0.ok) return r0;
  const { f, v: atual } = r0;
  const vs = f.variantes.filter((v) => v.notas[k] !== null);
  const niveis = vs.map((v) => ({ ...resumoVar(f, v, k), posicao_nota: posicaoEntreTetos(base, f, v, k) }));
  const degraus = [];
  for (let i = 1; i < vs.length; i++) degraus.push(medirDegrau(f, vs[i - 1], vs[i], k));
  const r = { ok: true, modelo: f.id, nome: f.nome, empresa: f.empresa, area: k, atual: atual.esforco, niveis, degraus: degraus.map(({ frase, ...d }) => d), frases: frasesDaEscada(base, f, vs, atual, k) };
  r.ver = { cartao: "painel_modelo", params: { modelo: f.id, esforco: atual.esforco } };
  return r;
}

function posicaoEntreTetos(base, f, v, k) {
  if (v.notas[k] === null) return null;
  const outros = base.familias.filter((x) => x.id !== f.id).map((x) => teto(x, k)).filter(Boolean);
  return 1 + outros.filter((o) => o.notas[k] > v.notas[k]).length;
}

function frasesDaEscada(base, f, vs, atual, k) {
  const out = [];
  if (vs.length >= 3) {
    let melhor = null;
    for (let i = 1; i < vs.length; i++) { const g = vs[i].notas[k] - vs[i - 1].notas[k]; if (!melhor || g > melhor.g) melhor = { a: vs[i - 1], b: vs[i], g }; }
    const total = vs[vs.length - 1].notas[k] - vs[0].notas[k];
    if (melhor && melhor.g > 0 && total > 0) out.push(`A maior parte do ganho do ${f.nome} vem de ${fmt.esforco(melhor.a.esforco)} para ${fmt.esforco(melhor.b.esforco)}: +${virgula(melhor.g)} dos ${virgula(total)} pontos entre o menor e o maior esforço.`);
  }
  let salto = null;
  for (let i = 1; i < vs.length; i++) { const r = razao(vs[i - 1].tempo, vs[i].tempo); if (r && (!salto || r > salto.r)) salto = { a: vs[i - 1], b: vs[i], r }; }
  if (salto && salto.r >= 2) out.push(`De ${fmt.esforco(salto.a.esforco)} para ${fmt.esforco(salto.b.esforco)} o tempo multiplica por ${virgula(salto.r)} (${fmt.tempo(salto.a.tempo)} → ${fmt.tempo(salto.b.tempo)}).`);
  const par = parecidos(base, { modelo: f.id, esforco: atual.esforco, area: k, tolerancia: 2 });
  if (par.ok && par.frases[0]) out.push(par.frases[0]);
  return out.slice(0, 3);
}

/* ─── 5. degrau ─── */

export const SELOS = {
  "compensa": "Compensa",
  "compensa-mas-demora": "Compensa, mas demora",
  "teto": "Só se precisar do teto",
  "nao-muda": "Não muda",
};

/**
 * O selo é sempre do degrau de subida (do nível menor para o maior):
 * - ganho < 1 ponto → Não muda;
 * - custo rende pelo menos 6 pontos por dobra (ou não sobe) e o tempo no máximo dobra → Compensa;
 * - custo rende, mas o tempo mais que dobra → Compensa, mas demora;
 * - senão → Só se precisar do teto.
 * Sem dado de custo ou de tempo, aquele critério não pesa, e o resultado avisa.
 */
export function selo(baixo, alto, k = "intelligence") {
  const ganho = alto.notas[k] - baixo.notas[k];
  const faltam = [];
  if (ganho < EMPATE) return { selo: "nao-muda", texto: SELOS["nao-muda"], faltam };
  let custoOk = true, tempoOk = true;
  const rc = razao(baixo.custo, alto.custo), rt = razao(baixo.tempo, alto.tempo);
  if (rc !== null) { const dobras = Math.log2(rc); custoOk = dobras <= 0 || ganho / dobras >= PONTOS_POR_DOBRA; } else faltam.push("custo");
  if (rt !== null) tempoOk = rt <= TEMPO_MAX_DEGRAU; else faltam.push("tempo");
  const s = custoOk ? (tempoOk ? "compensa" : "compensa-mas-demora") : "teto";
  return { selo: s, texto: SELOS[s], faltam };
}

function medirDegrau(f, de, para, k) {
  const subindo = posEsforco(para.esforco) >= posEsforco(de.esforco);
  const [baixo, alto] = subindo ? [de, para] : [para, de];
  const s = selo(baixo, alto, k);
  const ganho = para.notas[k] - de.notas[k];
  const rc = razao(baixo.custo, alto.custo), rt = razao(baixo.tempo, alto.tempo);
  const dobras = rc ? Math.log2(rc) : null;
  const mudancas = [fmt.pontos(ganho), relacao("custo", de.custo, para.custo), relacao("tempo", de.tempo, para.tempo)].join(" · ");
  const porque = {
    "nao-muda": "a diferença fica abaixo de 1 ponto, que é empate",
    "compensa": "o ganho acompanha o custo e a espera no máximo dobra",
    "compensa-mas-demora": `o ganho acompanha o custo, mas a espera passa de ${fmt.tempo(baixo.tempo)} para ${fmt.tempo(alto.tempo)}`,
    "teto": dobras > 0 ? `cada dobra de custo rende ${virgula(Math.abs(ganho) / dobras)} pontos, abaixo da referência de 6` : "o ganho é pequeno para o que muda",
  }[s.selo];
  return {
    de: de.esforco, para: para.esforco, sentido: subindo ? "subir" : "descer",
    nota_de: arred(de.notas[k], 1), nota_para: arred(para.notas[k], 1), ganho: arred(ganho, 1),
    custo_de: arred(de.custo, 4), custo_para: arred(para.custo, 4), custo_vezes: arred(razao(de.custo, para.custo), 2),
    tempo_de: arred(de.tempo, 1), tempo_para: arred(para.tempo, 1), tempo_vezes: arred(razao(de.tempo, para.tempo), 2),
    custo_de_txt: fmt.custo(de.custo), custo_para_txt: fmt.custo(para.custo), tempo_de_txt: fmt.tempo(de.tempo), tempo_para_txt: fmt.tempo(para.tempo),
    pontos_por_dobra: dobras && dobras > 0 ? arred(Math.abs(ganho) / dobras, 1) : null,
    selo: s.selo, selo_texto: s.texto, degrau: `${fmt.esforco(baixo.esforco)} → ${fmt.esforco(alto.esforco)}`, faltam: s.faltam,
    mudancas, porque, ...veredito(s.selo, subindo),
    frase: `${subindo ? "Subir" : "Descer"} o ${f.nome} de ${fmt.esforco(de.esforco)} para ${fmt.esforco(para.esforco)}: ${mudancas}. Degrau ${fmt.esforco(baixo.esforco)} → ${fmt.esforco(alto.esforco)}: ${s.texto}, porque ${porque}.`,
  };
}

/**
 * O selo é do degrau; o veredito é do ponto de vista de quem vai mudar.
 * Ex.: no degrau medium → high com selo "Compensa", subir é "Vale subir", e descer
 * (high → medium) é "Perde mais do que economiza".
 * `tom`: "bom" (verde), "espera" (verde com relógio), "cuidado" (âmbar), "neutro" (cinza).
 */
export function veredito(seloChave, subindo) {
  const tabela = subindo ? {
    "compensa": ["Vale subir", "bom"],
    "compensa-mas-demora": ["Vale, se puder esperar", "espera"],
    "teto": ["Só se precisar do máximo", "cuidado"],
    "nao-muda": ["Não faz diferença", "neutro"],
  } : {
    "compensa": ["Perde mais do que economiza", "cuidado"],
    "compensa-mas-demora": ["Mais rápido, mas perde nota", "espera"],
    "teto": ["Boa economia", "bom"],
    "nao-muda": ["Não faz diferença", "neutro"],
  };
  const [texto, tom] = tabela[seloChave];
  return { veredito: texto, tom };
}

/* ─── respostas explicadas (o que a Coruja diz quando não há IA, e a base do que a IA vai dizer) ───
   Cada uma tem `titulo` (a conclusão, em uma frase) e `texto` (2 ou 3 frases: o que se ganha, o que
   se paga e quando vale). Os números saem do resultado da própria ferramenta. */

const pct = (r) => `${Math.round((r - 1) * 100)}%`;
function custoTexto(de, para) {
  if (!(de > 0) || !(para > 0)) return null;
  const r = para / de;
  if (r >= 1.95) return `${fmt.vezes(r)} mais por tarefa (${fmt.custo(de)} → ${fmt.custo(para)})`;
  if (r > 1) return `${pct(r)} mais por tarefa (${fmt.custo(de)} → ${fmt.custo(para)})`;
  if (r <= 1 / 1.95) return `${fmt.vezes(1 / r)} menos por tarefa (${fmt.custo(de)} → ${fmt.custo(para)})`;
  return `${Math.round((1 - r) * 100)}% menos por tarefa (${fmt.custo(de)} → ${fmt.custo(para)})`;
}
const tempoTexto = (de, para) => (de > 0 && para > 0 ? `a resposta passa de ${fmt.tempo(de)} para ${fmt.tempo(para)}` : null);
const juntar = (partes) => { const p = partes.filter(Boolean); return p.length <= 1 ? p.join("") : `${p.slice(0, -1).join(", ")} e ${p.at(-1)}`; };

function respostaDegrau(base, f, de, para, d, k) {
  const E = fmt.esforco;
  const g = Math.abs(d.ganho);
  const notas = `${fmt.nota(d.nota_de)} → ${fmt.nota(d.nota_para)}`;
  const custo = custoTexto(de.custo, para.custo), tempo = tempoTexto(de.tempo, para.tempo);
  const ref = d.pontos_por_dobra !== null ? `Aqui, cada vez que o custo dobra, a nota sobe ${virgula(d.pontos_por_dobra)} pontos; o comum entre os modelos é 6 a 7.` : null;
  let titulo, texto;
  if (d.sentido === "subir") {
    const base1 = `No ${E(para.esforco)}, a nota sobe ${virgula(g)} pontos (${notas}); ${juntar([custo && `você paga ${custo}`, tempo])}.`;
    ({
      "compensa": () => { titulo = `Vale subir para ${E(para.esforco)}.`; texto = [base1, ref, "É uma das subidas de esforço que mais rendem pelo que custam."]; },
      "compensa-mas-demora": () => { titulo = `Vale subir para ${E(para.esforco)}, se você puder esperar.`; texto = [base1, `O ganho acompanha o custo; o preço real é a espera. Para tarefas difíceis em que alguns segundos a mais não atrapalham, suba. Para idas e vindas rápidas, fique no ${E(de.esforco)}.`]; },
      "teto": () => { titulo = `Fique no ${E(de.esforco)}, a não ser que precise do máximo.`; texto = [base1, ref, `Subir só se paga em tarefas em que cada acerto a mais vale muito.`]; },
      "nao-muda": () => { titulo = `Subir para ${E(para.esforco)} não faz diferença.`; texto = [`A nota muda ${virgula(g)} ponto${g >= 2 ? "s" : ""} (${notas}), dentro da margem de empate.`, juntar([custo && `Você pagaria ${custo}`, tempo]) + "."]; },
    })[d.selo]();
  } else {
    const base1 = `No ${E(para.esforco)}, a nota cai ${virgula(g)} pontos (${notas}); ${juntar([custo && `você paga ${custo}`, tempo])}.`;
    ({
      "compensa": () => { titulo = `Descer para ${E(para.esforco)} perde mais do que economiza.`; texto = [base1, `Essa subida é uma das que mais rendem pelo que custam; só desça para tarefas simples, em que a nota mais baixa basta.`]; },
      "compensa-mas-demora": () => { titulo = `Descer para ${E(para.esforco)} deixa a resposta bem mais rápida, mas perde nota.`; texto = [base1, `Vale para idas e vindas rápidas. Em tarefas difíceis, a espera do ${E(de.esforco)} costuma compensar.`]; },
      "teto": () => { titulo = `Descer para ${E(para.esforco)} é uma boa economia.`; texto = [base1, `O ${E(de.esforco)} só se justifica quando você precisa do máximo do modelo.`]; },
      "nao-muda": () => { titulo = `Descer para ${E(para.esforco)} não muda a nota.`; texto = [`A diferença é de ${virgula(g)} ponto${g >= 2 ? "s" : ""}, dentro da margem de empate; ${juntar([custo && `você paga ${custo}`, tempo])}.`]; },
    })[d.selo]();
  }
  // Alternativa: outro modelo com nota igual ou maior que a do nível de chegada, mais barato.
  const alvo = d.sentido === "subir" ? para : de;
  if (alvo.notas[k] !== null && alvo.custo) {
    const alt = base.familias.filter((x) => x.id !== f.id).flatMap((x) => x.variantes.filter((v) => v.notas[k] !== null && v.notas[k] >= alvo.notas[k] - 0.5 && v.custo !== null && v.custo < alvo.custo * 0.6).map((v) => ({ x, v })))
      .sort((a, b) => a.v.custo - b.v.custo)[0];
    if (alt && texto.length < 3) texto.push(`Para ter a nota do ${E(alvo.esforco)} pagando menos, ${nomeVar(alt.x, alt.v)} chega a ${fmt.nota(alt.v.notas[k])} pontos e custa ${fmt.custo(alt.v.custo)} por tarefa.`);
  }
  return { titulo, texto: texto.filter(Boolean) };
}

/** "Estou no Opus 5.5 médio; vale subir para alto?" Sem `para`, mede o próximo nível acima. */
export function degrau(base, { modelo, de = null, para = null, area: a = "intelligence" } = {}) {
  const k = area(a);
  if (!k) return erro(`área desconhecida: ${a}`);
  const r0 = resolver(base, modelo, de, { area: k });
  if (!r0.ok) return r0;
  const { f, v: vDe } = r0;
  const vs = f.variantes.filter((v) => v.notas[k] !== null);
  let vPara;
  if (para) {
    const e = normalizarEsforco(para);
    vPara = vs.find((v) => v.esforco === e);
    if (!vPara) return erro(`${f.nome} não tem o nível ${fmt.esforco(e)} medido`, { esforcos: vs.map((v) => v.esforco) });
  } else {
    vPara = vs[vs.indexOf(vDe) + 1];
    if (!vPara) return erro(`${fmt.esforco(vDe.esforco)} já é o maior nível medido do ${f.nome}`);
  }
  if (vPara === vDe) return erro("os dois níveis são o mesmo");
  const d = medirDegrau(f, vDe, vPara, k);
  return { ok: true, modelo: f.id, nome: f.nome, area: k, ...d, frases: [d.frase], resposta: respostaDegrau(base, f, vDe, vPara, d, k), ver: { cartao: "degrau", params: { modelo: f.id, de: d.de, para: d.para, area: k } } };
}

/* ─── 6. comparar ─── */

/** De 2 a 4 pares modelo + esforço, lado a lado, nas áreas pedidas (padrão: as 7). */
export function comparar(base, { itens = [], areas = AREA_KEYS } = {}) {
  if (!Array.isArray(itens) || itens.length < 2 || itens.length > 4) return erro("comparar pede de 2 a 4 modelos");
  const ks = (Array.isArray(areas) && areas.length ? areas : AREA_KEYS).map(area).filter(Boolean);
  const res = [];
  for (const it of itens) {
    const r = typeof it === "string" ? resolver(base, it) : resolver(base, it.modelo, it.esforco);
    if (!r.ok) return erro(`não achei "${typeof it === "string" ? it : it.modelo}": ${r.erro}`);
    res.push(r);
  }
  const colunas = res.map(({ f, v }) => ({ modelo: f.id, nome: f.nome, empresa: f.empresa, esforco: v.esforco, custo: arred(v.custo, 4), tempo: arred(v.tempo, 1), notas: Object.fromEntries(ks.map((k) => [k, arred(v.notas[k], 1)])) }));
  const linhas = ks.map((k) => {
    const vals = res.map(({ v }) => v.notas[k]);
    const validos = vals.filter((x) => x !== null);
    const max = validos.length ? Math.max(...validos) : null;
    const lideres = res.filter(({ v }) => v.notas[k] !== null && max - v.notas[k] < EMPATE).map(({ f, v }) => nomeVar(f, v));
    // Se algum modelo não tem nota na área, ninguém "vence" nela: falta com quem comparar.
    const semDado = vals.some((x) => x === null);
    return { area: k, nome_area: AREAS[k], notas: vals.map((x) => arred(x, 1)), lider: !semDado && lideres.length === 1 ? lideres[0] : null, empate: !semDado && lideres.length > 1 ? lideres : null, sem_dado: semDado };
  });
  const vitorias = new Map(res.map(({ f, v }) => [nomeVar(f, v), 0]));
  for (const l of linhas) if (l.lider) vitorias.set(l.lider, vitorias.get(l.lider) + 1);
  const empates = linhas.filter((l) => l.empate).length;
  const nomes = res.map(({ f, v }) => nomeVar(f, v));
  const frases = [
    ks.length === 1
      ? (linhas[0].lider ? `Em ${AREAS[ks[0]].toLowerCase()}, ${linhas[0].lider} fica à frente (${linhas[0].notas.map((n, i) => `${nomes[i]} ${fmt.nota(n)}`).join(" × ")}).` : linhas[0].empate ? `Em ${AREAS[ks[0]].toLowerCase()}, empate técnico (${linhas[0].notas.map((n, i) => `${nomes[i]} ${fmt.nota(n)}`).join(" × ")}).` : `Em ${AREAS[ks[0]].toLowerCase()}, falta dado para comparar.`)
      : `Nas ${ks.length} áreas: ${[...vitorias].filter(([, c]) => c > 0).map(([n, c]) => `${n} fica à frente em ${c}`).join(", ") || "ninguém fica à frente sozinho"}${empates ? `; ${empates} ${empates === 1 ? "fica" : "ficam"} em empate técnico (menos de 1 ponto)` : ""}.`,
  ];
  const rc = res.map(({ v }) => v.custo), rt = res.map(({ v }) => v.tempo);
  if (rc.every((x) => x > 0)) { const i = rc.indexOf(Math.min(...rc)); frases.push(`O mais barato é ${nomes[i]} (${fmt.custo(rc[i])} por tarefa); o mais caro custa ${fmt.vezes(Math.max(...rc) / rc[i])} mais.`); }
  if (rt.every((x) => x > 0)) { const i = rt.indexOf(Math.min(...rt)); frases.push(`O mais rápido é ${nomes[i]} (${fmt.tempo(rt[i])}).`); }
  // Resposta explicada: quem vai melhor em quê, e a troca de custo e tempo.
  const resposta = (() => {
    const ganhou = new Map(nomes.map((n) => [n, []]));
    for (const l of linhas) if (l.lider) ganhou.get(l.lider).push(l.nome_area.toLowerCase());
    const ordem = [...ganhou].sort((a, b) => b[1].length - a[1].length);
    const [primeiro, segundo] = ordem;
    const nEmp = linhas.filter((l) => l.empate).length;
    let titulo;
    if (!primeiro[1].length) titulo = "Na prática, empatam: nenhuma diferença passa de 1 ponto.";
    else if (primeiro[1].length > ks.length / 2) titulo = `${primeiro[0]} vai melhor na maioria das áreas.`;
    else if (segundo && primeiro[1].length === segundo[1].length) titulo = `${primeiro[0]} e ${segundo[0]} dividem as áreas.`;
    else titulo = `${primeiro[0]} sai na frente, mas sem domínio claro.`;
    const texto = [];
    const ondes = ordem.filter(([, a]) => a.length).map(([n, a]) => `${n} em ${juntar(a)}`);
    if (ondes.length) texto.push(`Fica à frente: ${ondes.join("; ")}.${nEmp ? ` Em ${nEmp} ${nEmp === 1 ? "área" : "áreas"} a diferença é menor que 1 ponto, o que conta como empate.` : ""}`);
    const custos = res.map(({ v }) => v.custo), tempos = res.map(({ v }) => v.tempo);
    const partes = [];
    if (custos.every((x) => x > 0)) { const i = custos.indexOf(Math.min(...custos)), j = custos.indexOf(Math.max(...custos)); if (i !== j) partes.push(`${nomes[i]} é o mais barato (${fmt.custo(custos[i])} por tarefa, ${fmt.vezes(custos[j] / custos[i])} menos que ${nomes[j]})`); }
    if (tempos.every((x) => x > 0)) { const i = tempos.indexOf(Math.min(...tempos)), j = tempos.indexOf(Math.max(...tempos)); if (i !== j) partes.push(`${nomes[i]} responde mais rápido (${fmt.tempo(tempos[i])}, contra ${fmt.tempo(tempos[j])} do ${nomes[j]})`); }
    if (partes.length) texto.push(`${partes.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()));
    const semDado = linhas.filter((l) => l.sem_dado).map((l) => l.nome_area.toLowerCase());
    if (semDado.length) texto.push(`Sem dado para comparar em ${juntar(semDado)}.`);
    return { titulo, texto };
  })();
  return { ok: true, colunas, linhas, frases, resposta, ver: { cartao: "comparacao", params: { itens: res.map(({ f, v }) => ({ modelo: f.id, esforco: v.esforco })), areas: ks } } };
}

/* ─── 7. parecidos ─── */

/** Níveis de outros modelos com nota a até `tolerancia` pontos: quem sai mais barato e quem responde mais rápido. */
export function parecidos(base, { modelo, esforco = null, area: a = "intelligence", tolerancia = 2, limite = 5 } = {}) {
  const k = area(a);
  if (!k) return erro(`área desconhecida: ${a}`);
  const r0 = resolver(base, modelo, esforco, { area: k });
  if (!r0.ok) return r0;
  const { f, v } = r0;
  const ref = v.notas[k];
  if (ref === null) return erro("sem nota nessa área");
  const tol = Math.max(0, Math.min(10, Number(tolerancia) || 2));
  const pares = base.familias.filter((x) => x.id !== f.id).flatMap((x) => x.variantes.filter((y) => y.notas[k] !== null && Math.abs(y.notas[k] - ref) <= tol).map((y) => ({ f: x, v: y })));
  const lim = Math.max(1, Math.min(LIMITE_LINHAS, Number(limite) || 5));
  const ordenar = (campo) => pares.filter((p) => p.v[campo] !== null).sort((p, q) => p.v[campo] - q.v[campo]);
  const linha = (p) => ({ ...resumoVar(p.f, p.v, k), diferenca: arred(p.v.notas[k] - ref, 1), custo_vezes: arred(razao(v.custo, p.v.custo), 2), tempo_vezes: arred(razao(v.tempo, p.v.tempo), 2) });
  const baratos = ordenar("custo"), rapidos = ordenar("tempo");
  const b = baratos[0], r = rapidos[0];
  const ehBarato = b && v.custo !== null && v.custo <= b.v.custo, ehRapido = r && v.tempo !== null && v.tempo <= r.v.tempo;
  const faixa = `Com nota parecida (±${virgula(tol, 0)} pontos)`;
  let frase = null;
  if (b || r) {
    if (ehBarato && ehRapido) frase = `${faixa}, este já é o mais barato e o mais rápido.`;
    else if (ehBarato) frase = `${faixa}, este já é o mais barato; ${nomeVar(r.f, r.v)} responde em ${fmt.tempo(r.v.tempo)}.`;
    else if (ehRapido) frase = `${faixa}, ${nomeVar(b.f, b.v)} custa ${fmt.custo(b.v.custo)}; este já é o mais rápido.`;
    else if (b && r && b === r) frase = `${faixa}, ${nomeVar(b.f, b.v)} é o mais barato (${fmt.custo(b.v.custo)}) e o mais rápido (${fmt.tempo(b.v.tempo)}).`;
    else frase = `${faixa}, ${[b && `${nomeVar(b.f, b.v)} custa ${fmt.custo(b.v.custo)}`, r && `${nomeVar(r.f, r.v)} responde em ${fmt.tempo(r.v.tempo)}`].filter(Boolean).join(" e ")}.`;
  }
  return {
    ok: true, referencia: resumoVar(f, v, k), tolerancia: tol,
    mais_baratos: baratos.slice(0, lim).map(linha), mais_rapidos: rapidos.slice(0, lim).map(linha),
    frases: frase ? [frase] : [`Nenhum outro modelo fica a até ${virgula(tol, 0)} pontos do ${nomeVar(f, v)}.`],
    ver: { cartao: "painel_modelo", params: { modelo: f.id, esforco: v.esforco } },
  };
}

/* ─── 9. outras_fontes ─── */

const CATEGORIAS_ARENA = { coding: "código", creative_writing: "escrita criativa", instruction_following: "seguir instruções", multi_turn: "conversa longa" };

export function outras_fontes(base, { modelo } = {}) {
  if (!base.fontes) return erro("as outras fontes não foram carregadas");
  const r0 = resolver(base, modelo);
  if (!r0.ok) return r0;
  const { f } = r0;
  const dados = base.fontes.familias.get(f.id);
  const arena = dados?.lmarena?.length ? dados.lmarena.reduce((m, e) => (e.geral.nota > m.geral.nota ? e : m)) : null;
  const r = {
    ok: true, modelo: f.id, nome: f.nome,
    lmarena: arena && {
      mede: base.fontes.info.lmarena?.mede, esforco: arena.esforco,
      geral: { nota: arena.geral.nota, posicao: arena.geral.posicao, total: arena.geral.total, votos: arena.geral.votos },
      categorias: Object.entries(arena.categorias).map(([c, v]) => ({ categoria: CATEGORIAS_ARENA[c] ?? c, nota: v.nota, posicao: v.posicao, total: v.total })),
    },
    epoch: dados?.epoch && { mede: base.fontes.info.epoch?.mede, esforco: dados.epoch.esforco, testes: dados.epoch.testes.slice(0, LIMITE_LINHAS) },
  };
  r.frases = [];
  if (r.lmarena) {
    const g = r.lmarena.geral;
    r.frases.push(`No LMArena, que mede preferência de pessoas em conversas às cegas, o ${f.nome}${arena.esforco ? ` (${fmt.esforco(arena.esforco)})` : ""} fica em ${g.posicao}º de ${g.total} no geral.`);
    const cats = r.lmarena.categorias.filter((c) => c.posicao).sort((a, b) => a.posicao - b.posicao);
    if (cats.length) r.frases.push(`Por categoria: ${cats.map((c) => `${c.categoria} ${c.posicao}º`).join(", ")}.`);
  } else r.frases.push(`O LMArena não tem o ${f.nome} na base desta página.`);
  if (r.epoch) r.frases.push(`No Epoch AI${r.epoch.esforco ? ` (medido em ${fmt.esforco(r.epoch.esforco)})` : ""}: ${r.epoch.testes.slice(0, 4).map((t) => `${t.nome} ${virgula(t.nota)}`).join(", ")}.`);
  else r.frases.push(`O Epoch AI não tem o ${f.nome} na base desta página.`);
  r.ver = { cartao: "outras_fontes", params: { modelo: f.id } };
  return r;
}

/* ─── 10. abismo ─── */

/** Do menor esforço com raciocínio ao maior medido (pela ordem de esforço, não pela nota). */
export function abismo(base, { empresa = null, so_escada_completa = false, limite = LIMITE_LINHAS, area: a = "intelligence" } = {}) {
  const k = area(a) ?? "intelligence";
  const itens = base.familias.flatMap((f) => {
    if (empresa && !normal(f.empresa).includes(normal(empresa))) return [];
    const vs = f.variantes.filter((v) => RACIOCINIO.includes(v.esforco) && v.notas[k] !== null);
    if (vs.length < 2) return [];
    if (so_escada_completa && !["low", "medium", "high", "xhigh", "max"].every((e) => vs.some((v) => v.esforco === e))) return [];
    const lo = vs[0], hi = vs[vs.length - 1];
    const pico = vs.slice(1, -1).reduce((m, v) => (!m || v.notas[k] > m.notas[k] ? v : m), null);
    return [{ modelo: f.id, nome: f.nome, empresa: f.empresa, de: lo.esforco, para: hi.esforco, nota_de: arred(lo.notas[k], 1), nota_para: arred(hi.notas[k], 1), ganho: arred(hi.notas[k] - lo.notas[k], 1), custo_vezes: arred(razao(lo.custo, hi.custo), 2), tempo_vezes: arred(razao(lo.tempo, hi.tempo), 2), pico_intermediario: pico && pico.notas[k] > hi.notas[k] ? { esforco: pico.esforco, nota: arred(pico.notas[k], 1) } : null }];
  }).sort((x, y) => y.ganho - x.ganho);
  if (!itens.length) return erro("nenhum modelo com mais de um nível de esforço nesse filtro");
  const ganhos = itens.map((i) => i.ganho).sort((x, y) => x - y);
  const med = ganhos.length % 2 ? ganhos[(ganhos.length - 1) / 2] : (ganhos[ganhos.length / 2 - 1] + ganhos[ganhos.length / 2]) / 2;
  const lim = Math.max(1, Math.min(LIMITE_LINHAS, Number(limite) || LIMITE_LINHAS));
  const maior = itens[0], menor = itens[itens.length - 1];
  return {
    ok: true, total: itens.length, mediana_ganho: arred(med, 1), linhas: itens.slice(0, lim),
    frases: [
      `Entre ${itens.length} modelos com mais de um nível de esforço, o ganho do menor ao maior esforço vai de ${virgula(menor.ganho)} (${menor.nome}) a ${virgula(maior.ganho)} pontos (${maior.nome}); a mediana é ${virgula(med)}.`,
      maior.custo_vezes && maior.tempo_vezes ? `No ${maior.nome}, esse ganho custa ${fmt.vezes(maior.custo_vezes)} mais por tarefa e leva ${fmt.vezes(maior.tempo_vezes)} mais tempo.` : null,
    ].filter(Boolean),
    ver: { cartao: "abismo", params: { empresa, so_escada_completa } },
  };
}

/* ─── 11. montar_time ─── */

/** O que a pessoa tem (planos + modelos à mão) e quem do time vai melhor em cada perfil de tarefa. */
/** Versões novas que a lista de planos ainda não cobre. A lista é conferida à mão nas páginas
    oficiais (`checked_at`), e os fabricantes lançam modelo novo sem avisar quais planos o recebem.
    Regra geral, sem nome fixo: mesma empresa e mesma "linha" (o nome sem os números, ex.: "GPT Astra"),
    versão maior que a de um modelo do plano, lançada no dia da conferência ou depois, e fora de todos
    os planos daquela empresa. Quando a lista for atualizada, o aviso some sozinho. */
const linhaDoNome = (nome) => normal(String(nome).replace(/\d+(?:\.\d+)*/g, " "));
const versaoDoNome = (nome) => (String(nome).match(/\d+(?:\.\d+)*/)?.[0] ?? "").split(".").filter(Boolean).map(Number);
const versaoMaior = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return d > 0; } return false; };
export function novidades_fora_dos_planos(base, planoIds = []) {
  if (!base.planos) return [];
  const conferido = base.planos.conferidoEm || "";
  const achados = new Map();
  for (const id of planoIds) {
    const p = base.planos.planos.find((x) => x.id === id);
    if (!p) continue;
    const listados = new Set(base.planos.planos.filter((x) => x.empresa === p.empresa).flatMap((x) => x.familias.map((f) => f.id)));
    for (const pf of p.familias) {
      const velho = base.porId.get(pf.id);
      if (!velho) continue;
      const linha = linhaDoNome(velho.nome), versao = versaoDoNome(velho.nome);
      if (!linha || !versao.length) continue;
      for (const f of base.familias) {
        if (listados.has(f.id) || f.empresa !== velho.empresa || linhaDoNome(f.nome) !== linha) continue;
        if (!versaoMaior(versaoDoNome(f.nome), versao) || !f.lancamento || (conferido && f.lancamento < conferido)) continue;
        if (f.variantes.every((v) => v.notas.intelligence === null)) continue;
        const atual = achados.get(f.id);
        if (atual) { if (!atual.planos.includes(p.nome)) atual.planos.push(p.nome); continue; }
        achados.set(f.id, { modelo: f.id, nome: f.nome, lancamento: f.lancamento, no_lugar_de: velho.nome, planos: [p.nome] });
      }
    }
  }
  return [...achados.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

export function montar_time(base, { planos = [], extras = [], escolhidos = {} } = {}) {
  const membros = new Map();
  const nivel = (f, permitidos, escolhido) => {
    const pega = (e) => (e ? f.variantes.find((v) => v.esforco === e && v.notas.intelligence !== null) : null);
    if (pega(escolhido)) return { v: pega(escolhido), origem: "escolhido" };
    const noPlano = permitidos ? f.variantes.filter((v) => permitidos.includes(v.esforco) && v.notas.intelligence !== null) : [];
    if (noPlano.length) return { v: noPlano[noPlano.length - 1], origem: "plano" };
    const padrao = pega(base.planos?.padroes.get(f.id));
    if (padrao) return { v: padrao, origem: "padrão do fabricante" };
    return { v: teto(f, "intelligence") ?? f.variantes[f.variantes.length - 1], origem: "melhor nível medido" };
  };
  const desconhecidos = [];
  for (const id of planos) {
    const p = base.planos?.planos.find((x) => x.id === id);
    if (!p) { desconhecidos.push(id); continue; }
    for (const pf of p.familias) {
      const f = base.porId.get(pf.id);
      if (!f) continue;
      if (membros.has(f.id)) { membros.get(f.id).planos.push(p.id); continue; }
      const { v, origem } = nivel(f, pf.esforcos, escolhidos[f.id]);
      membros.set(f.id, { f, v, origem, planos: [p.id] });
    }
  }
  for (const extra of extras) {
    const texto = typeof extra === "string" ? extra : extra?.modelo;
    const achado = base.porId.has(texto) ? { ok: true, modelo: texto } : achar_modelo(base, { texto, esforco: extra?.esforco ?? null });
    if (!achado.ok) { desconhecidos.push(String(texto)); continue; }
    const f = base.porId.get(achado.modelo);
    if (membros.has(f.id)) continue;
    const { v, origem } = nivel(f, null, escolhidos[f.id] ?? extra?.esforco ?? achado.esforco);
    membros.set(f.id, { f, v, origem, planos: [] });
  }
  if (!membros.size) return erro("nenhum modelo reconhecido no time", { desconhecidos, planos_validos: base.planos?.planos.map((p) => p.id) ?? [] });
  const lista = [...membros.values()].sort((a, b) => (b.v.notas.intelligence ?? -1) - (a.v.notas.intelligence ?? -1));
  // Em cada tarefa: quem do time tem a maior nota, e o mais barato do time que passa no piso do perfil.
  // Cada membro entra com todos os níveis que o plano libera (não só o mais alto).
  const niveisDoMembro = (m) => {
    const libera = m.planos.flatMap((id) => base.planos?.planos.find((p) => p.id === id)?.familias.find((x) => x.id === m.f.id)?.esforcos ?? []);
    const vs = libera.length ? m.f.variantes.filter((v) => libera.includes(v.esforco)) : [m.v];
    return (vs.length ? vs : [m.v]).map((v) => ({ m, v }));
  };
  const opcoesTime = lista.flatMap(niveisDoMembro);
  const papeis = base.perfis.map((p) => {
    const notas = opcoesTime.map((x) => ({ ...x, s: nota(x.v, null, p) })).filter((x) => x.s !== null).sort((a, b) => b.s - a.s);
    if (!notas.length) return { perfil: p.chave, nome: p.nome, melhor: null, economico: null };
    const lideres = notas.filter((x) => notas[0].s - x.s < EMPATE);
    const melhor = lideres.reduce((m, x) => ((x.v.custo ?? Infinity) < (m.v.custo ?? Infinity) ? x : m));
    const passam = notas.filter((x) => p.piso === null || x.s >= p.piso).filter((x) => x.v.custo !== null);
    const eco = passam.length ? passam.reduce((m, x) => (x.v.custo < m.v.custo ? x : m)) : null;
    const desc = (x) => x && { quem: nomeVar(x.m.f, x.v), nota: arred(x.s, 1), custo: arred(x.v.custo, 4) };
    return {
      perfil: p.chave, nome: p.nome, piso: p.piso,
      melhor: desc(melhor), abaixo_do_piso: p.piso !== null && melhor.s < p.piso,
      economico: eco && (eco.m.f.id !== melhor.m.f.id || eco.v.esforco !== melhor.v.esforco) ? desc(eco) : null,
    };
  });
  const abaixo = papeis.filter((p) => p.abaixo_do_piso).map((p) => p.nome.toLowerCase());
  const novidades = novidades_fora_dos_planos(base, planos).filter((n) => !membros.has(n.modelo));
  const resposta = (() => {
    const conta = (lista) => { const c = new Map(); for (const x of lista) if (x) c.set(x.quem, (c.get(x.quem) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1]); };
    const melhores = conta(papeis.map((p) => p.melhor));
    const economicos = conta(papeis.map((p) => p.economico ?? (p.melhor && !p.abaixo_do_piso ? p.melhor : null)));
    const n = papeis.length;
    const texto = [];
    if (melhores[0]) texto.push(`Para o trabalho mais difícil, ${melhores[0][0]} tem a maior nota do time em ${melhores[0][1]} de ${n} tipos de tarefa.`);
    const eco = economicos[0] && economicos[0][0] !== melhores[0]?.[0] ? economicos[0] : null;
    if (eco) {
      const custoEco = papeis.find((p) => p.economico?.quem === eco[0])?.economico.custo;
      texto.push(`No dia a dia, ${eco[0]} já passa da nota mínima sugerida em ${eco[1]} deles${custoEco ? `, por ${fmt.custo(custoEco)} por tarefa` : ""}: use o mais forte só quando a tarefa pedir.`);
    }
    const fraco = abaixo.length > n / 2;
    if (fraco) texto.push(`Ponto fraco: em ${abaixo.length} de ${n} tipos de tarefa, nenhum modelo do time chega à nota mínima sugerida. Para trabalho importante, vale ter acesso a um modelo mais forte.`);
    else if (abaixo.length) texto.push(`Ponto fraco: em ${juntar(abaixo)}, nenhum modelo do time chega à nota mínima sugerida.`);
    if (novidades.length) {
      const nomes = juntar(novidades.map((n) => n.nome));
      const um = novidades.length === 1;
      texto.push(`${nomes} ${um ? "é mais novo" : "são mais novos"} que os modelos da lista de planos (conferida em ${fmt.data(base.planos.conferidoEm)}) e ainda não ${um ? "entra" : "entram"} nesta conta: a página oficial não diz em que plano ${um ? "está" : "estão"}. Se ${um ? "ele já aparece" : "eles já aparecem"} no seu aplicativo, inclua na conta.`);
    }
    const titulo = fraco ? "Seu time fica abaixo da nota mínima sugerida na maioria das tarefas." : eco ?`Seu time tem um modelo para o difícil (${melhores[0][0]}) e outro para o dia a dia (${eco[0]}).` : melhores[0] ? `${melhores[0][0]} resolve quase tudo no seu time.` : "Seu time não tem notas suficientes para dividir as tarefas.";
    return { titulo, texto };
  })();
  return {
    ok: true, resposta,
    membros: lista.map((m) => ({ ...resumoVar(m.f, m.v), origem_do_esforco: m.origem, planos: m.planos })),
    papeis, desconhecidos, novidades,
    frases: [
      `O time tem ${lista.length} ${lista.length === 1 ? "modelo" : "modelos"}; o de maior nota geral é ${nomeVar(lista[0].f, lista[0].v)} (${fmt.nota(lista[0].v.notas.intelligence)}).`,
      abaixo.length ? `Para ${abaixo.join(", ")}, nenhum modelo do time chega ao piso sugerido do perfil.` : null,
    ].filter(Boolean),
    ver: { cartao: "time", params: { planos, extras } },
  };
}

/* ─── 12. explicar_metodo ─── */

export const METODO = {
  aa: "A nota principal vem do Intelligence Index v5 da Artificial Analysis (AA): de 0 a 100, média de quatro blocos de 25% (trabalho de conhecimento, código, ciência e geral). Ela mede acerto em tarefas difíceis; não mede conversa nem estilo de escrita. As 7 áreas (finanças, direito, saúde etc.) são índices próprios da AA.",
  custo: "Custo por tarefa é a média, em dólares, que a AA gastou pela API em cada tarefa do índice. Serve para comparar modelos entre si, não para prever a sua conta: a sua tarefa pode ser maior ou menor, e quem usa assinatura gasta cota, não dinheiro.",
  tempo: "Tempo é o tempo típico de resposta medido pela AA numa consulta, do envio ao fim da resposta. Níveis de esforço altos pensam mais antes de responder, por isso demoram mais.",
  empate: "Diferença menor que 1 ponto na AA é empate técnico: fica dentro da variação normal das medidas e não diz quem é melhor.",
  esforco: "Esforço (low, medium, high, xhigh, max) é quanto o modelo pensa antes de responder. Mais esforço costuma dar mais nota, mas custa mais e demora mais; o ganho quase sempre se concentra nos primeiros degraus.",
  selo: "O selo de um degrau compara o que se ganha com o que se paga. Menos de 1 ponto: Não muda. Se cada dobra de custo rende pelo menos 6 pontos (a média da escada dos modelos) e a espera no máximo dobra: Compensa. Se o custo rende, mas a espera mais que dobra: Compensa, mas demora. Senão: Só se precisar do teto.",
  lmarena: "O LMArena mede preferência: pessoas comparam duas respostas às cegas e votam. Mostra de que respostas as pessoas gostam, não se estão certas. A nota é um Elo e não se soma nem se compara com a nota da AA.",
  epoch: "O Epoch AI reúne testes de fronteira em matemática, ciência, código e agentes. Cada teste foi medido num esforço próprio, nem sempre o mesmo da AA.",
  "sem-dado": "Quando uma fonte não mediu algo, a página diz \"sem dado\". Nada vira zero e nada é estimado.",
  placar: "O placar compara níveis de esforço, não famílias. O primeiro cartão é o de maior nota. Os outros dois mostram o mais barato e o mais rápido entre os que ficam até N pontos abaixo dele: com N = 0, os três tendem a mostrar o próprio topo.",
};

export function explicar_metodo(_base, { tema } = {}) {
  const chave = Object.keys(METODO).find((k) => normal(k) === normal(tema)) ?? Object.keys(METODO).find((k) => normal(tema).includes(normal(k)));
  if (!chave) return { ok: true, temas: Object.keys(METODO), frases: ["Temas disponíveis: " + Object.keys(METODO).join(", ") + "."], ver: null };
  return { ok: true, tema: chave, frases: [METODO[chave]], ver: null };
}

/* ─── opções (para a IA saber o que existe) ─── */

export function opcoes(base) {
  return {
    ok: true,
    coletado_em: base.coletadoEm,
    areas: AREAS,
    perfis: base.perfis.map((p) => ({ chave: p.chave, nome: p.nome })),
    planos: base.planos?.planos.map((p) => ({ id: p.id, nome: p.nome })) ?? [],
    modelos: base.familias.length,
    temas_de_metodo: Object.keys(METODO),
  };
}

/* ─── catálogo ─── */

export const FERRAMENTAS = {
  achar_modelo: { fn: achar_modelo, descricao: "Reconhece modelo e esforço num texto livre (\"opus 5.5 médio\").", params: { texto: "texto", esforco: "opcional" } },
  placar: { fn: placar, descricao: "Mais inteligente, e o mais barato e o mais rápido até N pontos abaixo dele.", params: { area: "padrão intelligence", tolerancia: "0 a 25, padrão 10", filtros: "pesos_abertos, empresa, custo_max, tempo_max" } },
  ranking: { fn: ranking, descricao: "Modelos ordenados por nota, custo ou tempo numa área ou perfil.", params: { area: "ou perfil", ordenar: "nota|custo|tempo", limite: "até 10", filtros: "opcional" } },
  escada: { fn: escada, descricao: "Todos os níveis de esforço de um modelo, os degraus e as frases do painel.", params: { modelo: "id ou texto", esforco: "nível atual, opcional", area: "opcional" } },
  degrau: { fn: degrau, descricao: "Vale subir (ou descer) de esforço? Ganho, custo, tempo e selo.", params: { modelo: "id ou texto", de: "nível de partida", para: "nível de chegada (padrão: o próximo)", area: "opcional" } },
  comparar: { fn: comparar, descricao: "De 2 a 4 modelos lado a lado por área, com custo e tempo.", params: { itens: "lista de textos ou {modelo, esforco}", areas: "opcional" } },
  parecidos: { fn: parecidos, descricao: "Quem tem nota parecida e sai mais barato ou mais rápido.", params: { modelo: "id ou texto", esforco: "opcional", tolerancia: "padrão 2" } },
  perfil_tarefa: { fn: perfil_tarefa, descricao: "Ranking por tipo de tarefa (pesos e piso do perfil); sem perfil, lista os perfis.", params: { perfil: "chave ou nome", ordenar: "nota|custo|tempo" } },
  outras_fontes: { fn: outras_fontes, descricao: "O que LMArena e Epoch AI dizem do modelo.", params: { modelo: "id ou texto" } },
  abismo: { fn: abismo, descricao: "Quanto a nota sobe do menor ao maior esforço, e quanto isso custa.", params: { empresa: "opcional", so_escada_completa: "opcional" } },
  montar_time: { fn: montar_time, descricao: "Time a partir dos planos assinados e modelos extras, com quem vai melhor em cada tarefa.", params: { planos: "ids de planos", extras: "modelos à mão" } },
  explicar_metodo: { fn: explicar_metodo, descricao: "Texto fixo e revisado sobre o método.", params: { tema: Object.keys(METODO).join("|") } },
  opcoes: { fn: opcoes, descricao: "Áreas, perfis, planos e temas disponíveis.", params: {} },
};

export function chamar(base, nome, params = {}) {
  const t = FERRAMENTAS[nome];
  if (!t) return erro(`ferramenta desconhecida: ${nome}`, { ferramentas: Object.keys(FERRAMENTAS) });
  try {
    const r = t.fn(base, params ?? {});
    if (r?.ok) r.fontes = fontesDe(base, nome);
    return r;
  } catch (e) { return erro(`falha em ${nome}: ${e.message}`); }
}
