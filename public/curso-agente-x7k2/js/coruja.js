// Pergunte ao Observatório: a coruja do logo, que responde dúvidas do curso.
//
// Uma linha em qualquer página liga tudo:
//   <script src="js/coruja.js" defer></script>
// A coruja fica no canto. No modo apresentação (body.aula) ela some e volta
// quando o mouse mexe. Clicar abre a conversa ao lado dela.
//
// <body data-coruja="pagina"> abre a conversa já aberta, ocupando a página
// (é o que monitor.html faz). ?coruja=apresentar, ou Coruja.apresentar(),
// mostra a coruja grande no meio da tela e a leva voando para o canto: é a
// apresentação do início do curso.
//
// Duas coisas respondem. A busca nas entradas da base (dados/monitor-base.json)
// sempre roda, não usa IA e não inventa: mostra as próprias entradas, com o
// link. A IA, quando há um endereço em ENDERECO_IA e um código de turma, escreve
// a resposta a partir da mesma base. Se a IA recusar ou cair, a busca responde
// e a resposta diz isso. A IA nunca escreve um link: termina com
// "FONTES: id, id", e os ids viram botões a partir da base. Id inventado não vira nada.
(() => {
  if (window.Coruja) return;

  /**
   * Onde a IA responde. Vazio = sem IA (é o desligador: a busca continua).
   * No PC do Victor aponta para o servidor de teste (curso-ia/monitor/); no
   * site público, para o Worker da Cloudflare que guarda a chave.
   */
  const ENDERECO_IA = ["127.0.0.1", "localhost"].includes(location.hostname)
    ? "http://127.0.0.1:4895"
    : "https://coruja-observatorio.observatorio-ufg-ia.workers.dev";

  // Tudo é relativo ao próprio script, para funcionar em qualquer página do site.
  const RAIZ = new URL("..", document.currentScript?.src ?? location.href).href;
  const naRaiz = (p) => new URL(p, RAIZ).href;

  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sessao = {
    ler: (k, p) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? p; } catch { return p; } },
    guardar: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: só não lembra */ } },
  };
  const local = {
    ler: (k, p) => { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch { return p; } },
    guardar: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* idem */ } },
  };

  const estilo = document.createElement("link");
  estilo.rel = "stylesheet";
  estilo.href = naRaiz("css/coruja.css");
  document.head.append(estilo);

  // ===================== A coruja (o logo, com os olhos soltos) =====================

  const svgTexto = fetch(naRaiz("assets/brand/observatorio-coruja.svg")).then((r) => r.text());

  /**
   * Os olhos do logo. O olho grande (íris laranja + pupila) anda inteiro dentro
   * do branco; no olho da direita só a pupila anda. Posições em fração do
   * desenho, medidas no SVG; o deslocamento máximo, em unidades do SVG.
   */
  const OLHOS = [
    { pecas: [2, 4], fx: 0.248, fy: 0.477, max: 15 },
    { pecas: [3], fx: 0.657, fy: 0.585, max: 38 },
  ];
  const corujas = new Set();

  async function criarCoruja(lugar) {
    lugar.innerHTML = await svgTexto;
    const svg = lugar.querySelector("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const caminhos = [...svg.querySelectorAll("path")];
    const olhos = OLHOS.map((o) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      caminhos[o.pecas[0]].before(g);
      o.pecas.forEach((i) => g.append(caminhos[i]));
      return { ...o, g, x: 0, y: 0, ax: 0, ay: 0 };
    });
    const c = { lugar, svg, olhos, modo: "seguir" };
    corujas.add(c);
    return c;
  }

  // Para onde as corujas olham: o mouse, o campo de texto, ou "pensando".
  let alvo = null;
  addEventListener("pointermove", (e) => { alvo = { x: e.clientX, y: e.clientY }; }, { passive: true });

  function olhar(c, t) {
    const r = c.svg.getBoundingClientRect();
    if (!r.width) return;
    for (const o of c.olhos) {
      let dx = 0, dy = 0;
      if (c.modo === "pensando") {
        // Olhar para cima, devagar, de um lado para o outro.
        const a = t / 900;
        dx = Math.sin(a) * 0.8; dy = -0.75;
      } else if (c.modo === "frente") {
        dx = 0; dy = 0.15;
      } else {
        const p = c.modo === "campo" ? campoAlvo() : alvo;
        if (p) {
          const ex = r.left + r.width * o.fx, ey = r.top + r.height * o.fy;
          const vx = p.x - ex, vy = p.y - ey;
          const d = Math.hypot(vx, vy) || 1;
          const forca = Math.min(1, d / (r.width * 1.5));
          dx = (vx / d) * forca; dy = (vy / d) * forca;
        }
      }
      o.ax = dx * o.max; o.ay = dy * o.max;
      // Movimento com respiro: sempre um pedaço do caminho por quadro, nunca um salto.
      const k = reduzido ? 1 : 0.12;
      o.x += (o.ax - o.x) * k; o.y += (o.ay - o.y) * k;
      o.g.setAttribute("transform", `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`);
    }
  }
  let campoAlvo = () => null;
  const animar = (t) => { corujas.forEach((c) => olhar(c, t)); requestAnimationFrame(animar); };
  requestAnimationFrame(animar);

  // ===================== Turma, aparelho, base =====================

  const normalizarTurma = (t) => String(t ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  let turma = normalizarTurma(new URLSearchParams(location.search).get("turma")) || local.ler("coruja-turma", "");
  local.guardar("coruja-turma", turma);

  /** Um número sorteado por navegador: o limite por pessoa sem saber quem é a pessoa. */
  const aparelho = (() => {
    let id = local.ler("coruja-aparelho", "");
    if (!id) { id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, ""); local.guardar("coruja-aparelho", id); }
    return id;
  })();

  let basePromessa = null;
  const base = () => (basePromessa ??= fetch(naRaiz("dados/monitor-base.json")).then((r) => {
    if (!r.ok) throw new Error(`base ${r.status}`);
    return r.json();
  }).catch((e) => { basePromessa = null; throw e; }));

  const buscar = async (pergunta) => regras.procurar(await base(), pergunta);

  // ---------- regras (testadas por monitor/testes/regras.test.mjs, que lê este trecho) ----------
  const regras = (() => {
    // ----- Busca sem IA -----
    const PARADAS = new Set("a o as os um uma uns umas de da do das dos em no na nos nas por para pra com sem que e ou se eu meu minha me mim voce vc ele ela isso esse essa este esta aqui la como qual quais quando onde porque por que nao sim ja mais muito pode posso devo tem ter ta esta estou foi ser sou faz fazer fazendo faco coisa quero preciso alguem quem".split(" "));
    // Palavras que aparecem em todo canto do curso: sozinhas, não dizem o assunto.
    const GENERICAS = new Set("curso usar uso missao missoes ia pagina site computador arquivo arquivos funciona serve dia bom".split(" "));
    // Pequena ponte entre o jeito de perguntar e o jeito das páginas. Não é tradução.
    const PONTE = { baixar: "download", baixo: "download", baixei: "download", instalo: "instalar", instalacao: "instalar", instalador: "instalar", entrar: "conta", login: "conta", logar: "conta", senha: "conta", gratis: "gratuitas", gratuita: "gratuitas", gratuito: "gratuitas", arquivos: "kit", zip: "kit", planilhas: "planilha", sumiu: "onde", achei: "onde", erro: "errado", travou: "errado", bloqueou: "protegeu", virus: "antivirus" };
    /** Abaixo disto, a melhor entrada não é resposta: é coincidência de palavra. */
    const NOTA_MINIMA = 5;
    const palavras = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const pesosPorBase = new WeakMap();
    const pesos = (b) => {
      if (pesosPorBase.has(b)) return pesosPorBase.get(b);
      const freq = new Map();
      for (const e of b.entradas) for (const w of new Set(palavras(`${e.titulo} ${e.texto} ${e.palavras ?? ""}`))) freq.set(w, (freq.get(w) ?? 0) + 1);
      const p = new Map([...freq].map(([w, c]) => [w, Math.log(b.entradas.length / c)]));
      pesosPorBase.set(b, p);
      return p;
    };

    /**
     * As entradas que respondem, no máximo três, ou nenhuma. Uma entrada só
     * conta se: tem nota mínima; bate com duas palavras da pergunta (ou com a
     * única que ela tem); e uma delas não é genérica ("curso", "missão"…).
     * "Quem ganhou o jogo do Goiás?" bate só com "Goiás" num texto do
     * Observatório: melhor dizer que não achou do que mostrar isso.
     */
    function procurar(b, pergunta, limite = 3) {
      const peso = pesos(b);
      const termos = new Map(); // termo procurado → palavra da pergunta de onde veio
      for (const w of palavras(pergunta)) {
        if (w.length < 2 || PARADAS.has(w)) continue;
        termos.set(w, w);
        if (PONTE[w]) termos.set(PONTE[w], w);
        if (w.length > 5) termos.set(w.slice(0, -1), w); // plural simples: "planilhas" acha "planilha"
      }
      const doPergunta = new Set(termos.values());
      const precisa = Math.min(2, doPergunta.size);
      const achados = [];
      for (const e of b.entradas) {
        const titulo = new Set(palavras(e.titulo)), chave = new Set(palavras(e.palavras ?? "")), corpo = new Set(palavras(e.texto));
        let nota = 0;
        const bateu = new Set();
        let especifica = false;
        for (const [t, origem] of termos) {
          const v = peso.get(t);
          if (v === undefined) continue;
          const onde = titulo.has(t) ? 3 : chave.has(t) ? 2 : corpo.has(t) ? 1 : 0;
          if (!onde) continue;
          nota += v * onde;
          bateu.add(origem);
          if (!GENERICAS.has(t) && !GENERICAS.has(origem) && v >= 1) especifica = true;
        }
        // A apresentação antiga (index.html) repete o que as páginas novas dizem melhor.
        if (e.id.startsWith("index-")) nota *= 0.8;
        if (nota >= NOTA_MINIMA && bateu.size >= precisa && especifica) achados.push({ e, nota });
      }
      achados.sort((a, b) => b.nota - a.nota);
      const melhor = achados[0]?.nota ?? 0;
      return achados.filter((a) => a.nota >= melhor * 0.45).slice(0, limite).map((a) => a.e);
    }

    // ----- Dados pessoais saem antes de a pergunta sair do navegador -----
    // Oito dígitos soltos não são telefone: são códigos de erro ("80070005") e
    // anos ("2024-2025"). Telefone precisa de DDD, +55 ou do 9 de celular com hífen.
    const MASCARAS = [
      ["e-mail", /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[e-mail]"],
      ["senha", /\b(senha|password|pwd)(\s*[:=]\s*|\s+(?:é|eh)\s+)\S+/gi, "$1$2[senha]"],
      ["telefone", /(?:\+55\s?)?\(\d{2}\)\s?9?\d{4}[-\s]?\d{4}\b|(?:\+55\s?)\d{2}\s?9?\d{4}[-\s]?\d{4}\b|\b\d{2}\s9\d{4}[-\s]?\d{4}\b|\b9\d{4}-\d{4}\b/g, "[telefone]"],
      ["CPF", /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/g, "[CPF]"],
      ["nome de usuário do Windows", /([A-Za-z]:[\\/](?:Users|Usuários)[\\/])[^\\/\s"']+/gi, "$1[usuário]"],
    ];
    function mascarar(texto) {
      const tirados = [];
      for (const [nome, re, troca] of MASCARAS) {
        const novo = texto.replace(re, troca);
        if (novo !== texto) tirados.push(nome);
        texto = novo;
      }
      return { texto, tirados };
    }

    // ----- A linha FONTES do fim da resposta da IA -----
    /** Separa a linha FONTES do texto e troca os ids pelas entradas da base. */
    function separarFontes(texto, b) {
      const m = /\n?[ \t]*FONTES:\s*(.*)\s*$/i.exec(texto);
      if (!m) return { texto: texto.trim(), fontes: [] };
      const vistos = new Set();
      const fontes = m[1].split(/[,;\s]+/)
        .map((s) => s.replace(/^[\[("'`*]+|[\])"'`*.,;:]+$/g, ""))
        .map((id) => b.entradas.find((e) => e.id === id))
        .filter((e) => e && !vistos.has(e.id) && vistos.add(e.id))
        .slice(0, 3);
      return { texto: texto.slice(0, m.index).trim(), fontes };
    }
    /**
     * Enquanto a resposta chega, esconde o que já é a linha FONTES, inclusive
     * pela metade ("FON"). Só no começo de uma linha: "PDF" não perde o F.
     */
    const semFontes = (t) => t.replace(/(^|\n)[ \t]*F(?:O(?:N(?:T(?:E(?:S(?::.*)?)?)?)?)?)?$/s, "$1").replace(/[ \t]+FONTES:.*$/s, "");

    return { procurar, mascarar, separarFontes, semFontes };
  })();
  // ---------- fim das regras ----------
  const { mascarar, separarFontes, semFontes } = regras;

  // ===================== O painel =====================

  const pagina = document.body.dataset.coruja === "pagina";
  const raiz = document.createElement("div");
  raiz.className = "coruja" + (pagina ? " coruja-pagina" : "");
  raiz.innerHTML = `
    <div class="coruja-painel" role="dialog" aria-modal="false" aria-labelledby="coruja-titulo" ${pagina ? "" : "hidden"}>
      <header class="coruja-cabeca">
        <span class="coruja-retrato"></span>
        <div>
          <h2 id="coruja-titulo">Pergunte ao Observatório</h2>
          <p class="coruja-estado" aria-live="polite"></p>
        </div>
        ${pagina ? "" : '<button class="coruja-fechar" type="button" aria-label="Fechar">×</button>'}
      </header>
      <ol class="coruja-conversa" aria-live="polite">
        <li class="dela boas-vindas"><p>Oi! Eu sou o Observatório. Pergunte sobre o curso, os exercícios ou a instalação: respondo e levo você à página certa.</p></li>
      </ol>
      <div class="coruja-sugestoes" aria-label="Perguntas comuns">
        <button type="button">Como instalo o Antigravity?</button>
        <button type="button">O Windows bloqueou o instalador</button>
        <button type="button">A conta da universidade funciona?</button>
        <button type="button">O que a IA lê sai do meu computador?</button>
      </div>
      <form class="coruja-form">
        <label class="sr" for="coruja-pergunta">Sua pergunta</label>
        <div class="coruja-linha">
          <textarea id="coruja-pergunta" rows="1" maxlength="700" placeholder="Escreva sua dúvida ou cole o erro" required></textarea>
          <button class="coruja-enviar" type="submit" aria-label="Perguntar">
            <svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg class="quadrado" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="coruja-aviso">Não escreva nome, e-mail, CPF ou senha. Com a IA ligada, a pergunta vai para um serviço fora da UFG, que não guarda o texto.</p>
        <details class="coruja-turma">
          <summary>Código da turma</summary>
          <div class="coruja-linha">
            <input id="coruja-codigo" aria-label="Código da turma" autocomplete="off" spellcheck="false" maxlength="24">
            <button class="coruja-usar" type="button">Usar</button>
          </div>
          <small>Quem dá a aula informa o código. Sem ele, eu só busco nas páginas, sem IA.</small>
        </details>
      </form>
    </div>
    ${pagina ? "" : `
    <button class="coruja-botao" type="button" aria-label="Pergunte ao Observatório" aria-expanded="false">
      <span class="coruja-rotulo">Pergunte ao Observatório</span>
      <span class="coruja-poleiro"><span class="coruja-desenho"></span></span>
    </button>`}`;

  const montar = () => {
    if (pagina) (document.querySelector("main") ?? document.body).append(raiz);
    else document.body.append(raiz);
  };
  if (document.body) montar(); else addEventListener("DOMContentLoaded", montar);

  const $ = (s) => raiz.querySelector(s);
  const painel = $(".coruja-painel");
  const conversa = $(".coruja-conversa");
  const estadoEl = $(".coruja-estado");
  const campo = $("#coruja-pergunta");
  const enviarBtn = $(".coruja-enviar");
  const botao = $(".coruja-botao");

  let corujaCanto = null, corujaPainel = null;
  criarCoruja($(".coruja-retrato")).then((c) => { corujaPainel = c; });
  const cantoPronto = botao ? criarCoruja($(".coruja-desenho")).then((c) => { corujaCanto = c; }) : Promise.resolve();

  campoAlvo = () => {
    const r = campo.getBoundingClientRect();
    return r.width ? { x: r.left + Math.min(r.width, 40 + campo.value.length * 7), y: r.top + r.height / 2 } : null;
  };
  const modo = (m) => { if (corujaPainel) corujaPainel.modo = m; if (corujaCanto) corujaCanto.modo = m; };
  campo.addEventListener("focus", () => modo("campo"));
  campo.addEventListener("blur", () => modo("seguir"));

  let restam = null;
  const mostrarEstado = () => {
    if (!ENDERECO_IA) estadoEl.textContent = "Busco nas páginas do curso (IA desligada).";
    else if (!turma) estadoEl.textContent = "Sem código de turma: busco nas páginas, sem IA.";
    else estadoEl.textContent = `Turma ${turma}` + (restam === null ? "" : ` · restam ${restam} perguntas hoje`);
  };
  mostrarEstado();

  $("#coruja-codigo").value = turma;
  $(".coruja-usar").addEventListener("click", () => {
    turma = normalizarTurma($("#coruja-codigo").value);
    $("#coruja-codigo").value = turma;
    local.guardar("coruja-turma", turma);
    restam = null;
    mostrarEstado();
    $(".coruja-turma").open = false;
  });

  // Projeção: a aula (aula.html, com .palco) ou uma página do curso no modo apresentação (body.aula).
  const projecao = () => document.body.classList.contains("aula") || !!document.querySelector(".palco");

  // ----- Abrir e fechar -----
  function abrir() {
    if (pagina || !painel.hidden) return;
    painel.hidden = false;
    raiz.classList.add("aberta");
    botao.setAttribute("aria-expanded", "true");
    base().catch(() => {});
    requestAnimationFrame(() => { conversa.lastElementChild?.scrollIntoView({ block: "end" }); campo.focus(); });
  }
  function fechar({ foco = true } = {}) {
    if (pagina || painel.hidden) return;
    painel.hidden = true;
    raiz.classList.remove("aberta");
    botao.setAttribute("aria-expanded", "false");
    if (foco) botao.focus();
  }
  botao?.addEventListener("click", () => (painel.hidden ? abrir() : fechar()));
  $(".coruja-fechar")?.addEventListener("click", fechar);
  // As teclas de dentro do painel não vão para a apresentação (setas, espaço, L…).
  painel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); fechar(); }
    e.stopPropagation();
  });
  // A conversa que estava aberta na página anterior reabre, menos na projeção:
  // ali ela cobriria o slide sem ninguém ter pedido.
  if (sessao.ler("coruja-aberta", false) && !projecao()) abrir();
  addEventListener("pagehide", () => sessao.guardar("coruja-aberta", !pagina && !painel.hidden));

  // ----- No modo apresentação, a coruja só aparece quando o mouse mexe -----
  let dormir = null;
  const acordar = () => {
    if (!projecao()) { raiz.classList.remove("escondida"); return; }
    raiz.classList.remove("escondida");
    clearTimeout(dormir);
    dormir = setTimeout(() => { if (painel.hidden) raiz.classList.add("escondida"); }, 2500);
  };
  addEventListener("pointermove", acordar, { passive: true });
  // Só a troca de modo conta: na projeção o body troca de classe a cada
  // movimento do mouse (o cursor que some), e isso não pode esconder a coruja.
  let emProjecao = projecao();
  new MutationObserver(() => {
    if (projecao() === emProjecao) return;
    emProjecao = projecao();
    raiz.classList.toggle("escondida", emProjecao);
    if (emProjecao) fechar({ foco: false });
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  if (emProjecao) raiz.classList.add("escondida");

  // ===================== Conversa =====================

  const externo = (href) => /^https?:/.test(href);
  const dominio = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
  /** Links da base são relativos à raiz do site; a página pode estar em outra pasta. */
  const destino = (href) => (externo(href) ? href : naRaiz(href));

  /**
   * Um botão por página de destino. Uma pergunta frequente leva à página do
   * curso que trata dela; a fonte oficial dela vai num link menor, embaixo.
   */
  function botoesDeFonte(entradas, b) {
    if (!entradas.length) return "";
    const tituloDe = new Map(b.entradas.filter((e) => e.tipo === "curso").map((e) => [e.href, e.titulo]));
    const vistos = new Set();
    const botoes = entradas.filter((e) => !vistos.has(e.href) && vistos.add(e.href)).map((e) => {
      const rotulo = e.tipo === "faq" ? (tituloDe.get(e.href) ?? "Página do curso") : e.titulo;
      const fora = externo(e.href);
      return `<a class="coruja-ir${e.tipo === "observatorio" ? " obs" : ""}" href="${esc(destino(e.href))}"${fora ? ' target="_blank" rel="noopener"' : ""}>${esc(rotulo)}${fora ? '<span class="sr"> (abre outra aba)</span>' : ""}</a>`;
    });
    const porDominio = new Map();
    for (const e of entradas) if (e.fonte && !porDominio.has(dominio(e.fonte))) porDominio.set(dominio(e.fonte), e.fonte);
    const fontes = [...porDominio].map(([d, f]) => `<a href="${esc(f)}" target="_blank" rel="noopener">${esc(d)}</a>`);
    return `<div class="coruja-fontes">${botoes.join("")}</div>` + (fontes.length ? `<p class="coruja-oficial">Fonte oficial: ${fontes.join(", ")}</p>` : "");
  }

  // Seguir um botão para a página onde já estamos: fecha o painel para ver o lugar.
  conversa.addEventListener("click", (e) => {
    const a = e.target.closest("a.coruja-ir");
    if (!a || a.target) return;
    const u = new URL(a.href);
    if (u.pathname === location.pathname && u.hash) fechar();
  });

  let historico = sessao.ler("coruja-historico", []);
  const salvar = () => sessao.guardar("coruja-historico", historico.slice(-20));

  function balaoPessoa(texto, tirados = []) {
    const li = document.createElement("li");
    li.className = "eu";
    li.innerHTML = `<p>${esc(texto)}</p>` + (tirados.length ? `<small>Tirei antes de enviar: ${esc(tirados.join(", "))}.</small>` : "");
    conversa.append(li);
  }
  function balaoDela() {
    const li = document.createElement("li");
    li.className = "dela";
    li.innerHTML = `<p class="texto"><span class="pensando"><i></i><i></i><i></i><span class="sr">Pensando</span></span></p>`;
    conversa.append(li);
    li.scrollIntoView({ block: "nearest", behavior: reduzido ? "auto" : "smooth" });
    return li;
  }
  const NOTA_IA = "Resposta da IA, a partir das páginas do curso. Confira na página.";
  const NOTA_BUSCA = "Achei isto nas páginas do curso (busca, sem IA):";
  /** `motivo` diz por que foi a busca e não a IA (a IA caiu, demorou…); pode ser vazio. */
  function desenharBusca(li, achados, motivo, b) {
    li.classList.add("busca");
    const aviso = achados.length ? [motivo, NOTA_BUSCA].filter(Boolean).join(" ") : motivo;
    const lista = achados.length
      ? `<ul class="coruja-achados">${achados.map((e) => `<li><b>${esc(e.titulo)}</b><span>${esc(e.texto.length > 240 ? e.texto.slice(0, 240).replace(/\s\S*$/, "") + "…" : e.texto)}</span></li>`).join("")}</ul>`
      : `<p>Não achei isso nas páginas do curso. Pergunte a quem está dando a aula.</p>`;
    li.innerHTML = (aviso ? `<p class="quem">${esc(aviso)}</p>` : "") + lista + botoesDeFonte(achados, b);
  }

  const paragrafos = (t) => `<p class="texto">${esc(t).replace(/\n{2,}/g, "</p><p class=\"texto\">").replace(/\n/g, "<br>")}</p>`;

  /** O pedido em andamento, para o botão Parar. */
  let pedido = null;
  /** O navegador desiste depois disto. O servidor desiste antes (40 s). */
  const PRAZO_IA_MS = 45_000;

  /**
   * Pede a resposta à IA e a desenha em `li` enquanto chega. Só é resposta
   * se chegar o [FIM] do servidor: conexão que cai no meio é falha, e quem
   * chamou cai na busca. Nunca lança.
   */
  async function perguntarIA(perguntas, li) {
    const controle = new AbortController();
    pedido = controle;
    const prazo = setTimeout(() => controle.abort("demorou"), PRAZO_IA_MS);
    const porQueParou = (padrao) => (!controle.signal.aborted ? padrao
      : controle.signal.reason === "parou" ? "Você parou a resposta." : "A IA demorou demais para responder.");
    try {
      let resposta;
      try {
        resposta = await fetch(ENDERECO_IA, {
          method: "POST",
          signal: controle.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turma, aparelho, perguntas }),
        });
      } catch {
        return { ok: false, motivo: porQueParou("A IA não respondeu agora.") };
      }
      if (!resposta.ok || !resposta.body) {
        const dito = await resposta.json().then((j) => j.erro).catch(() => null);
        return { ok: false, motivo: dito ?? "A IA não respondeu agora." };
      }
      const r = resposta.headers.get("X-Restam");
      if (r !== null) { restam = Number(r); mostrarEstado(); }

      const leitor = resposta.body.getReader();
      const dec = new TextDecoder();
      let sobra = "", texto = "", fim = false, erro = null;
      try {
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          sobra += dec.decode(value, { stream: true });
          const linhas = sobra.split("\n");
          sobra = linhas.pop() ?? "";
          for (const linha of linhas) {
            if (!linha.startsWith("data: ")) continue;
            const dado = linha.slice(6);
            if (dado === "[FIM]") { fim = true; continue; }
            let quadro;
            try { quadro = JSON.parse(dado); } catch { continue; /* quadro quebrado: pula */ }
            if (quadro.erro) erro = quadro.erro;
            if (quadro.texto) texto += quadro.texto;
            if (semFontes(texto).trim()) { li.innerHTML = paragrafos(semFontes(texto)); modo("frente"); }
          }
        }
      } catch {
        return { ok: false, motivo: porQueParou("A conexão caiu no meio da resposta.") };
      }
      if (!fim) return { ok: false, motivo: erro ?? "A resposta parou no meio." };
      return { ok: true, texto };
    } finally {
      clearTimeout(prazo);
      pedido = null;
    }
  }

  async function responder(pergunta, tirados) {
    balaoPessoa(pergunta, tirados);
    const li = balaoDela();
    modo("pensando");
    historico.push({ eu: pergunta, tirados });
    let b;
    try { b = await base(); } catch {
      li.innerHTML = `<p>Não consegui carregar as páginas do curso. Recarregue a página.</p>`;
      return;
    }

    let motivo = "";
    if (ENDERECO_IA && turma) {
      // Contexto: as perguntas anteriores que a IA respondeu (não as respostas:
      // o servidor não aceita fala da coruja vinda do navegador). Uma pergunta
      // que ficou com a busca, se fosse junto, seria respondida de novo.
      const perguntas = [...historico.slice(0, -1).filter((h) => h.ia).map((h) => h.eu), pergunta];
      const r = await perguntarIA(perguntas, li);
      const { texto, fontes } = r.ok ? separarFontes(r.texto, b) : { texto: "", fontes: [] };
      if (texto) {
        li.innerHTML = paragrafos(texto) + botoesDeFonte(fontes, b) + `<p class="quem">${NOTA_IA}</p>`;
        Object.assign(historico.at(-1), { ia: r.texto, fontes: fontes.map((f) => f.id) });
        salvar();
        return;
      }
      motivo = r.ok ? "A IA respondeu em branco." : r.motivo;
    }
    const achados = await buscar(pergunta);
    desenharBusca(li, achados, motivo, b);
    Object.assign(historico.at(-1), { busca: achados.map((e) => e.id), aviso: motivo || undefined });
    salvar();
  }

  // Ao chegar numa página, a conversa que já existia continua.
  if (historico.length) {
    base().then((b) => {
      const porId = (id) => b.entradas.find((e) => e.id === id);
      for (const h of historico) {
        balaoPessoa(h.eu, h.tirados);
        const li = balaoDela();
        if (h.ia) {
          const { texto } = separarFontes(h.ia, b);
          li.innerHTML = paragrafos(texto) + botoesDeFonte((h.fontes ?? []).map(porId).filter(Boolean), b) + `<p class="quem">${NOTA_IA}</p>`;
        } else {
          desenharBusca(li, (h.busca ?? []).map(porId).filter(Boolean), h.aviso ?? "", b);
        }
      }
      $(".coruja-sugestoes").hidden = true;
      if (!painel.hidden) conversa.lastElementChild?.scrollIntoView({ block: "end" });
    }).catch(() => {});
  }

  // Enquanto a coruja responde, o botão de enviar vira o de parar.
  let ocupado = false;
  const botaoParar = (sim) => {
    enviarBtn.classList.toggle("parar", sim);
    enviarBtn.setAttribute("aria-label", sim ? "Parar a resposta" : "Perguntar");
  };
  async function enviar(textoBruto) {
    const limpo = textoBruto.trim();
    if (!limpo || ocupado) return;
    ocupado = true;
    if (ENDERECO_IA && turma) botaoParar(true); else enviarBtn.disabled = true;
    campo.value = "";
    campo.style.height = "";
    $(".coruja-sugestoes").hidden = true;
    const { texto, tirados } = mascarar(limpo);
    try {
      await responder(texto, tirados);
    } catch {
      const li = conversa.lastElementChild;
      if (li?.classList.contains("dela")) li.innerHTML = `<p>Algo deu errado aqui. Tente perguntar de novo.</p>`;
    } finally {
      ocupado = false;
      botaoParar(false);
      enviarBtn.disabled = false;
      modo(document.activeElement === campo ? "campo" : "seguir");
      // Volta ao campo só se o foco não foi para outro lugar (um link da resposta, por exemplo).
      const foco = document.activeElement;
      if (!foco || foco === document.body || foco === enviarBtn) campo.focus();
    }
  }
  $(".coruja-form").addEventListener("submit", (e) => { e.preventDefault(); enviar(campo.value); });
  // Parar vem pelo clique, não pelo envio: com o campo vazio, o navegador nem envia o formulário.
  enviarBtn.addEventListener("click", (e) => {
    if (!ocupado) return;
    e.preventDefault();
    pedido?.abort("parou");
  });
  campo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(campo.value); }
  });
  // O campo cresce com o texto (um erro colado tem várias linhas), até um limite.
  campo.addEventListener("input", () => { campo.style.height = ""; campo.style.height = Math.min(campo.scrollHeight, 140) + "px"; });
  raiz.querySelectorAll(".coruja-sugestoes button").forEach((b) => b.addEventListener("click", () => enviar(b.textContent)));

  // ===================== A apresentação =====================

  /**
   * A coruja grande no meio da tela, que olha em volta, se apresenta e voa
   * para o canto; sozinha em uns 13 s. Devolve uma promessa que se cumpre
   * quando ela pousa. Chamar de novo enquanto ela se apresenta devolve a
   * mesma promessa.
   *
   * Teclas: Escape pula sempre. Enter e espaço pulam só fora da projeção. As
   * setas e o PageDown nunca: são do palco, que chama Coruja.pular() se quiser
   * que a tecla dele também pule a coruja. Clicar na coruja grande pula.
   */
  let apresentacao = null;
  let pularApresentacao = () => {};
  function apresentar() {
    if (pagina || !botao) return Promise.resolve();
    apresentacao ??= mostrarApresentacao().finally(() => { apresentacao = null; pularApresentacao = () => {}; });
    return apresentacao;
  }
  /** Leva a coruja direto para o voo até o canto. Sem apresentação, não faz nada. */
  const pular = () => pularApresentacao();

  async function mostrarApresentacao() {
    let pulou;
    const avancou = new Promise((ok) => { pulou = ok; });
    pularApresentacao = pulou;
    await cantoPronto;
    fechar({ foco: false });
    // A pequena precisa estar no lugar dela (não escondida) quando a grande pousar.
    clearTimeout(dormir);
    raiz.classList.add("pousando");
    raiz.classList.remove("escondida");
    const palco = document.createElement("div");
    palco.className = "coruja-apresentacao";
    palco.setAttribute("role", "dialog");
    palco.setAttribute("aria-label", "Apresentação do Observatório");
    palco.innerHTML = `
      <div class="ca-coruja"></div>
      <div class="ca-texto">
        <p class="ca-1">Este é o Observatório.</p>
        <p class="ca-2">Travou? Pergunte a ele.</p>
        <p class="ca-3">Ele responde sobre o curso e a instalação, e leva você à página certa. Fica aqui no canto da tela.</p>
      </div>`;
    document.body.append(palco);
    const grande = await criarCoruja(palco.querySelector(".ca-coruja"));
    raiz.classList.add("pousando");

    const esperar = (ms) => new Promise((ok) => setTimeout(ok, reduzido ? 0 : ms));
    const tecla = (e) => {
      const minhas = projecao() ? ["Escape"] : ["Escape", "Enter", " "];
      if (minhas.includes(e.key)) { e.preventDefault(); e.stopPropagation(); pulou(); }
    };
    addEventListener("keydown", tecla, true);
    palco.addEventListener("click", () => pulou());

    requestAnimationFrame(() => palco.classList.add("visivel"));
    // Olhar em volta antes de falar: esquerda, direita, e então para a sala.
    grande.modo = "pensando";
    await Promise.race([esperar(1600), avancou]);
    grande.modo = "frente";
    palco.classList.add("fala-1");
    await Promise.race([esperar(1300), avancou]);
    palco.classList.add("fala-2");
    await Promise.race([esperar(1300), avancou]);
    palco.classList.add("fala-3");
    grande.modo = "seguir";
    await Promise.race([esperar(9000), avancou]);
    removeEventListener("keydown", tecla, true);

    // O voo: o disco grande vai até o lugar exato do pequeno e encolhe até ele.
    const voo = grande.lugar;
    const de = voo.getBoundingClientRect();
    const para = $(".coruja-poleiro").getBoundingClientRect();
    voo.style.transformOrigin = "0 0";
    const dx = para.left - de.left, dy = para.top - de.top, s = para.width / de.width;
    palco.classList.add("saindo");
    const anim = voo.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 60}px) scale(${(1 + s) / 2.4})`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], { duration: reduzido ? 1 : 1100, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" });
    await anim.finished.catch(() => {});
    // Troca no mesmo quadro, sem esmaecer: o grande some exatamente onde o pequeno aparece.
    botao.style.transition = "none";
    raiz.classList.remove("pousando", "escondida");
    void botao.offsetWidth;
    botao.style.transition = "";
    raiz.classList.add("pousou");
    corujas.delete(grande);
    palco.remove();
    setTimeout(() => raiz.classList.remove("pousou"), 1400);
    acordar();
  }

  window.Coruja = {
    abrir, fechar, apresentar, pular,
    get apresentando() { return !!apresentacao; },
  };
  if (new URLSearchParams(location.search).get("coruja") === "apresentar") apresentar().catch(() => {});
})();
