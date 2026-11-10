// A tela da mesa de dominó. O motor está em domino-motor.js; aqui ficam o palco,
// as fichas, a corrente em serpente, o voo das pedras e os controles da aula.

(() => {
  "use strict";

  const M = window.DominoMotor;
  const L = 100;            // comprimento da pedra na mesa
  const W = 50;             // largura da pedra
  const OUTER = 400;        // a fileira vira quando a próxima pedra passaria daqui (x)
  const FATOR = { devagar: 0.62, normal: 1, rapido: 1.85 };

  const BOTS = [
    { ...M.BOTS[0], img: "bene", cor: "#d9a05b", corEscura: "#8c5a21" },
    { ...M.BOTS[1], img: "cida", cor: "#c9a0df", corEscura: "#7b4f96" },
    { ...M.BOTS[2], img: "nina", cor: "#7fd4c0", corEscura: "#2f7f70" },
    { ...M.BOTS[3], img: "tiao", cor: "#ef8b3e", corEscura: "#a5501c" },
  ];
  const ICONE = { 1: "peso", 2: "carroca", 3: "guardar", 4: "trancar", 5: "parceiro", 6: "numero" };

  const palco = document.getElementById("palco");
  const feltro = document.getElementById("feltro");
  const mesa = document.getElementById("mesa");
  const correnteEl = document.getElementById("corrente");
  const juntasEl = document.getElementById("juntas");
  const brilhoEl = document.getElementById("brilho-ponta");
  const embaralhoEl = document.getElementById("embaralho");
  const lugaresEl = document.getElementById("lugares");
  const maosEl = document.getElementById("maos");
  const fichasEl = document.getElementById("fichas");
  const statusCompactoEl = document.getElementById("status-compacto");
  const statusRegraEl = document.getElementById("status-regra");
  const baloesEl = document.getElementById("baloes");
  const vooCamada = document.getElementById("voo-camada");
  const seletorCamada = document.getElementById("seletor-camada");
  const seletorEl = document.getElementById("seletor");
  const painelCamada = document.getElementById("painel-fechamento-camada");
  const painelEl = document.getElementById("painel-fechamento");
  const faixaFim = document.getElementById("faixa-fim");
  const toastEl = document.getElementById("toast");
  const placar0 = document.getElementById("placar-0");
  const placar1 = document.getElementById("placar-1");
  const maoNumeroEl = document.getElementById("mao-numero");
  const aoVivoEl = document.getElementById("ao-vivo");
  const vivoTextoEl = document.getElementById("vivo-texto");

  const estadoInicial = () => ({
    estado: null,
    epoca: 0,
    pausado: false,
    passoUnico: false,
    velocidade: "normal",
    mostrarMaos: false,
    seletorAberto: false,
    seletorBot: 0,
    seletorSlot: 0,
    pausadoAntes: false,
    pedidoNovaMao: false,
    segurarFim: false,
    teste: "",
    mapaPedras: new Map(),
    camera: { s: 1, cx: 0, cy: 0, bounds: null },
    badges: [-9, -9, -9, -9],
    regraDaVez: -9,
    vooAtual: null,
    ultimoEvento: null,
    vooLento: false,
    jogavel: false,
    logs: [],
    pronto: false,
  });
  const S = estadoInicial();
  // Atalhos de leitura; o estado do jogo em si fica em S.estado.
  const getEstado = () => S.estado;

  // ---------- utilidades ----------

  const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const reduzirMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esperar = (ms) =>
    dormir(Math.max(30, (reduzirMovimento() ? ms * 0.35 : ms) / FATOR[S.velocidade]));
  const vivo = (minha) => minha === S.epoca;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v) => v.toLocaleString("pt-BR");
  const escalaPalco = () => palco.getBoundingClientRect().width / 1600;

  function centroPalco(rect) {
    const p = palco.getBoundingClientRect();
    const e = p.width / 1600;
    return {
      x: (rect.left + rect.width / 2 - p.left) / e,
      y: (rect.top + rect.height / 2 - p.top) / e,
    };
  }

  function noPalco(elOuRect) {
    const r =
      elOuRect && typeof elOuRect.getBoundingClientRect === "function"
        ? elOuRect.getBoundingClientRect()
        : elOuRect;
    return centroPalco(r);
  }

  function somarPontos(p) {
    return p.a + p.b;
  }

  const POSICOES = {
    0: [],
    1: [3],
    2: [1, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 4, 5, 7, 8],
  };

  function pontosHTML(n) {
    const ativos = new Set(POSICOES[n] || []);
    let s = "";
    for (let k = 1; k <= 9; k++) s += `<span class="ponto p${k}${ativos.has(k) ? " mostra" : ""}"></span>`;
    return s;
  }

  function htmlPedra(p, nEsq, nDir, extra = "") {
    return (
      `<div class="pedra ${extra}" data-a="${p.a}" data-b="${p.b}" role="img" aria-label="pedra ${p.a} e ${p.b}">` +
      `<div class="metade">${pontosHTML(nEsq)}</div>` +
      `<div class="risco"></div>` +
      `<div class="metade">${pontosHTML(nDir)}</div>` +
      `</div>`
    );
  }

  function htmlCosta() {
    return `<div class="pedra costas" role="img" aria-label="pedra virada para baixo"></div>`;
  }

  function nomeCurtoRegra(id) {
    return M.REGRA_POR_ID[id] ? M.REGRA_POR_ID[id].curto : "vazia";
  }

  function nomeDaRegra(id) {
    return M.REGRA_POR_ID[id] ? M.REGRA_POR_ID[id].nome : "vazia";
  }

  // ---------- montagem ----------

  function montarLugares() {
    BOTS.forEach((b) => {
      const el = document.createElement("div");
      el.className = "lugar";
      el.dataset.bot = b.i;
      el.style.setProperty("--cor", b.cor);
      el.style.setProperty("--ritmo", `${3.5 + b.i * 0.37}s`);
      el.style.setProperty("--atraso", `${-b.i * 0.63}s`);
      el.innerHTML =
        `<img src="assets/img/bots-domino/${b.img}.png" alt="${b.nome}, ${b.jeito}">` +
        `<span class="placa">${b.nome}</span>` +
        `<span class="pensando-pontos" aria-hidden="true"><i></i><i></i><i></i></span>` +
        `<button type="button" class="regra-ativa" data-bot="${b.i}" title="Abrir a ficha de ${b.nome}"><b>1</b><span></span></button>`;
      lugaresEl.append(el);
    });
    lugaresEl.addEventListener("click", (e) => {
      const b = e.target.closest(".regra-ativa");
      if (!b) return;
      const bot = +b.dataset.bot;
      const f = getEstado().fichas[bot];
      const usada = S.badges[bot];
      const slot = usada >= 0 && f[usada] ? usada : f.findIndex((x) => x);
      abrirSeletor(bot, slot >= 0 ? slot : 0);
    });
  }

  function montarFichas() {
    fichasEl.innerHTML = "";
    BOTS.forEach((b) => {
      const f = document.createElement("article");
      f.className = "ficha";
      f.dataset.bot = b.i;
      f.style.setProperty("--cor", b.cor);
      f.style.setProperty("--cor-escura", b.corEscura);
      f.innerHTML =
        `<header><span class="ficha-nome">${b.nome}</span><span class="ficha-sub">ficha de regras</span></header>` +
        [0, 1, 2]
          .map(
            (slot) =>
              `<button type="button" class="linha" data-bot="${b.i}" data-slot="${slot}">` +
              `<span class="num">${slot + 1}</span>` +
              `<svg class="ico"><use href="#ico-peso"/></svg>` +
              `<span class="texto"></span>` +
              `</button>`
          )
          .join("");
      fichasEl.append(f);
    });
    fichasEl.addEventListener("click", (e) => {
      const linha = e.target.closest(".linha");
      if (!linha) return;
      abrirSeletor(+linha.dataset.bot, +linha.dataset.slot);
    });
  }

  function montarMaos() {
    maosEl.innerHTML = "";
    BOTS.forEach((b) => {
      const m = document.createElement("div");
      m.className = "mao";
      m.dataset.bot = b.i;
      m.style.setProperty("--cor", b.cor);
      m.innerHTML =
        `<div class="mao-costa">${htmlCosta()}${htmlCosta()}${htmlCosta()}</div>` +
        `<div class="mao-leque"></div>` +
        `<span class="mao-qtd" title="7 pedras na mão" aria-label="7 pedras na mão"><b>7</b></span>`;
      maosEl.append(m);
    });
  }

  function montarBaloes() {
    baloesEl.innerHTML = "";
    BOTS.forEach((b) => {
      const el = document.createElement("div");
      el.className = "balao";
      el.dataset.bot = b.i;
      el.style.setProperty("--cor", b.cor);
      el.innerHTML = `<span class="balao-titulo"></span><p class="balao-texto"></p><p class="balao-sub" hidden></p>`;
      baloesEl.append(el);
    });
  }

  // ---------- escala e palco ----------

  function ajustarEscala() {
    const e = Math.min(innerWidth / 1600, innerHeight / 900);
    document.documentElement.style.setProperty("--e", e);
    document.body.classList.toggle("compacto", e < 0.62);
    if (getEstado() && getEstado().corrente.length) {
      requestAnimationFrame(() => renderCorrente());
    }
  }

  // ---------- corrente: geometria da serpente ----------

  // Cada ramo anda como no dominó de verdade: em fileira até perto da borda,
  // e ali uma pedra fica de pé, encostada na ponta, e a fileira seguinte volta
  // por cima (ramo da direita) ou por baixo (ramo da esquerda), sem vãos.
  // Carroças atravessam a fileira; logo depois de uma curva, ficam deitadas.
  function angDe(dx, dy) {
    return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  function andarLado(est, { lado, lista, x0 }) {
    const pedacos = [];
    let px = x0;
    let py = 0;
    let dx = lado;
    let dy = 0;
    const tx = 0;
    const ty = lado > 0 ? -1 : 1; // direita sobe, esquerda desce
    let depoisDaCurva = false;

    for (const c of lista) {
      const p = est.pedras[c.pedraId];
      const carroca = p.a === p.b;
      const interno = lado > 0 ? c.esq : c.dir;
      const exposto = lado > 0 ? c.dir : c.esq;
      const base = { pedraId: c.pedraId, carroca, numeroEsq: interno, numeroDir: exposto };
      const ao = px * dx; // avanço já feito nesta fileira, medido no sentido dela

      if (carroca && !depoisDaCurva) {
        // atravessada: ocupa W no sentido da fileira
        pedacos.push({ ...base, x: px + (dx * W) / 2, y: py + (dy * W) / 2, ang: angDe(dx, dy) + 90,
          avanco: W, dirX: dx, dirY: dy, contato: { x: px, y: py } });
        px += dx * W;
        py += dy * W;
        continue;
      }

      if (!carroca && ao + L > OUTER) {
        // curva: a pedra fica de pé, com a metade de dentro encostada na ponta
        const cx = px + dx * (W / 2) + tx * (L / 2 - W / 2);
        const cy = py + dy * (W / 2) + ty * (L / 2 - W / 2);
        pedacos.push({ ...base, x: cx, y: cy, ang: angDe(tx, ty), avanco: L, dirX: tx, dirY: ty,
          contato: { x: px, y: py } });
        px = px + dx * W + tx * L;
        py = py + dy * W + ty * L;
        dx = -dx;
        dy = -dy;
        depoisDaCurva = true;
        continue;
      }

      // deitada na fileira (inclusive a carroça logo depois da curva)
      pedacos.push({ ...base, x: px + (dx * L) / 2, y: py + (dy * L) / 2, ang: angDe(dx, dy),
        avanco: L, dirX: dx, dirY: dy, contato: { x: px, y: py } });
      px += dx * L;
      py += dy * L;
      depoisDaCurva = false;
    }

    return { pedacos, juntas: [] };
  }

  function calcularCorrente(est) {
    if (!est || !est.corrente.length) return { pedacos: [], juntas: [], bounds: null };
    const idx = est.corrente.findIndex((c) => c.pedraId === est.primeiraPedraId);
    if (idx < 0) return { pedacos: [], juntas: [], bounds: null };
    const primeira = est.corrente[idx];
    const p0 = est.pedras[primeira.pedraId];
    const carroca0 = p0.a === p0.b;
    const meia = carroca0 ? W / 2 : L / 2;
    const pedacos = [
      {
        pedraId: primeira.pedraId,
        x: 0,
        y: 0,
        ang: carroca0 ? 90 : 0,
        carroca: carroca0,
        numeroEsq: primeira.esq,
        numeroDir: primeira.dir,
        avanco: carroca0 ? W : L,
        dirX: 1,
        dirY: 0,
        contato: { x: 0, y: 0 },
      },
    ];
    const direita = andarLado(est, { lado: 1, lista: est.corrente.slice(idx + 1), x0: meia });
    const esquerda = andarLado(est, { lado: -1, lista: est.corrente.slice(0, idx).reverse(), x0: -meia });
    pedacos.push(...esquerda.pedacos, ...direita.pedacos);
    return { pedacos, juntas: [], bounds: limites(pedacos, []) };
  }

  function limites(pedacos, juntas) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const incluir = (x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    for (const p of pedacos) {
      const a = (p.ang * Math.PI) / 180;
      const co = Math.cos(a);
      const si = Math.sin(a);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          incluir(
            p.x + co * (sx * L) / 2 - si * (sy * W) / 2,
            p.y + si * (sx * L) / 2 + co * (sy * W) / 2
          );
        }
      }
    }
    for (const j of juntas) {
      incluir(j.de.x, j.de.y);
      incluir(j.para.x, j.para.y);
    }
    if (!isFinite(minX)) return null;
    const pad = 22;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function svgJuntas(juntas, bounds) {
    if (!juntas.length || !bounds) return "";
    const vbX = bounds.minX;
    const vbY = bounds.minY;
    const vbW = Math.max(1, bounds.maxX - bounds.minX);
    const vbH = Math.max(1, bounds.maxY - bounds.minY);
    let caminho = "";
    for (const j of juntas) {
      const g = Math.hypot(j.para.x - j.de.x, j.para.y - j.de.y);
      const c1x = j.de.x + j.dirA.x * g * 0.58;
      const c1y = j.de.y + j.dirA.y * g * 0.58;
      const c2x = j.para.x - j.dirB.x * g * 0.58;
      const c2y = j.para.y - j.dirB.y * g * 0.58;
      const d = `M ${j.de.x.toFixed(2)} ${j.de.y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${j.para.x.toFixed(2)} ${j.para.y.toFixed(2)}`;
      caminho += `<path d="${d}" fill="none" stroke="rgba(43,26,8,.55)" stroke-width="11" stroke-linecap="round"/>`;
      caminho += `<path d="${d}" fill="none" stroke="#b9853b" stroke-width="7" stroke-linecap="round"/>`;
      caminho += `<path d="${d}" fill="none" stroke="#f0cf8b" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
      caminho += `<circle cx="${j.de.x}" cy="${j.de.y}" r="5" fill="#f2d393" stroke="#7c501c" stroke-width="1.4"/>`;
      caminho += `<circle cx="${j.para.x}" cy="${j.para.y}" r="5" fill="#f2d393" stroke="#7c501c" stroke-width="1.4"/>`;
    }
    return (
      `<svg class="juntas-svg" viewBox="${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}" style="left:${vbX.toFixed(2)}px;top:${vbY.toFixed(2)}px;width:${vbW.toFixed(2)}px;height:${vbH.toFixed(2)}px" aria-hidden="true">` +
      `${caminho}</svg>`
    );
  }

  function atualizarCamera(calc) {
    const felt = feltro.getBoundingClientRect();
    const e = escalaPalco();
    const fw = felt.width / e;
    const fh = felt.height / e;
    const b = calc.bounds;
    if (!b) return;
    const sideInset = document.body.classList.contains("compacto") ? 100 : 60;
    const topInset = S.mostrarMaos ? 118 : document.body.classList.contains("compacto") ? 92 : 100;
    const bottomInset = 74;
    const safeW = Math.max(280, fw - sideInset * 2);
    const safeH = Math.max(190, fh - topInset - bottomInset);
    const largura = Math.max(1, b.maxX - b.minX);
    const altura = Math.max(1, b.maxY - b.minY);
    const s = clamp(Math.min(1.25, safeW / largura, safeH / altura), 0.34, 1.25);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const oy = (topInset - bottomInset) / 2;
    S.camera = { s, cx, cy, bounds: b };
    correnteEl.style.transitionDuration = `${(1.05 / FATOR[S.velocidade]).toFixed(2)}s`;
    correnteEl.style.transform = `translate(0px, ${oy.toFixed(1)}px) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)}px, ${(-cy).toFixed(2)}px)`;
  }

  function resetarCameraVazia() {
    const compacto = document.body.classList.contains("compacto");
    const top = S.mostrarMaos ? 118 : compacto ? 92 : 100;
    const oy = (top - 74) / 2;
    correnteEl.style.transform = `translate(0px, ${oy.toFixed(1)}px) scale(1.25)`;
  }

  function escalaDaCamera() {    const t = getComputedStyle(correnteEl).transform;
    if (!t || t === "none") return S.camera.s || 1;
    try {
      const m = new DOMMatrixReadOnly(t);
      return Math.hypot(m.a, m.b) || 1;
    } catch {
      return S.camera.s || 1;
    }
  }

  function limparCorrente() {
    for (const el of S.mapaPedras.values()) el.remove();
    S.mapaPedras.clear();
    juntasEl.innerHTML = "";
    brilhoEl.classList.remove("on");
  }

  function renderCorrente({ novaId = null } = {}) {
    const est = getEstado();
    const calc = calcularCorrente(est);
    const ids = new Set(calc.pedacos.map((p) => p.pedraId));
    for (const [id, el] of S.mapaPedras) {
      if (!ids.has(id)) {
        el.remove();
        S.mapaPedras.delete(id);
      }
    }
    let alvoEl = null;
    let alvoPedaco = null;
    for (const p of calc.pedacos) {
      let el = S.mapaPedras.get(p.pedraId);
      if (!el) {
        el = document.createElement("div");
        el.className = "pedra-corrente" + (p.pedraId === novaId ? " entrando" : "");
        el.dataset.pedraId = p.pedraId;
        const pedra = est.pedras[p.pedraId];
        el.innerHTML = htmlPedra(pedra, p.numeroEsq, p.numeroDir);
        correnteEl.append(el);
        S.mapaPedras.set(p.pedraId, el);
      }
      el.style.left = `${p.x.toFixed(2)}px`;
      el.style.top = `${p.y.toFixed(2)}px`;
      el.style.transform = `rotate(${p.ang}deg)`;
      el._pedaco = p;
      if (p.pedraId === novaId) {
        alvoEl = el;
        alvoPedaco = p;
      }
    }
    juntasEl.innerHTML = svgJuntas(calc.juntas, calc.bounds);
    atualizarCamera(calc);
    return { pedaco: alvoPedaco, el: alvoEl, calc };
  }

  function pontoDaPonta(pedaco) {
    if (!pedaco) return { x: 0, y: 0 };
    if (pedaco.contato) return pedaco.contato;
    return {
      x: pedaco.x - pedaco.dirX * (pedaco.avanco / 2),
      y: pedaco.y - pedaco.dirY * (pedaco.avanco / 2),
    };
  }

  function acenderPonta(pedaco) {
    if (!pedaco || getEstado().corrente.length <= 1) return;
    const p = pontoDaPonta(pedaco);
    brilhoEl.style.left = `${p.x}px`;
    brilhoEl.style.top = `${p.y}px`;
    brilhoEl.classList.add("on");
  }

  // ---------- fichas e placar ----------

  function renderFichas() {
    const est = getEstado();
    if (!est) return;
    BOTS.forEach((b, i) => {
      const card = fichasEl.querySelector(`.ficha[data-bot="${b.i}"]`);
      if (!card) return;
      const f = est.fichas[i];
      card.querySelectorAll(".linha").forEach((linha) => {
        const slot = +linha.dataset.slot;
        const id = f[slot];
        const texto = linha.querySelector(".texto");
        const use = linha.querySelector("use");
        if (id) {
          linha.classList.remove("vazia");
          texto.textContent = M.REGRA_POR_ID[id].nome;
          use.setAttribute("href", `#ico-${ICONE[id]}`);
        } else {
          linha.classList.add("vazia");
          texto.textContent = "vazia";
          use.setAttribute("href", "#ico-vazio");
        }
      });
      const faltas = est.jogadores[i].faltas.map((x, n) => (x ? n : -1)).filter((n) => n >= 0);
      const sub = card.querySelector(".ficha-sub");
      if (faltas.length) {
        sub.textContent = "sem " + faltas.join(" e ");
        sub.classList.add("sem");
      } else {
        sub.textContent = "ficha de regras";
        sub.classList.remove("sem");
      }
    });
    atualizarBadges();
  }

  function atualizarBadges() {
    const est = getEstado();
    if (!est) return;
    BOTS.forEach((b, i) => {
      const badge = lugaresEl.querySelector(`.lugar[data-bot="${b.i}"] .regra-ativa`);
      if (!badge) return;
      const f = est.fichas[i];
      let slot = S.badges[i];
      if (slot < 0 || (slot >= 0 && !f[slot])) {
        slot = f.findIndex((x) => x);
      }
      let numero = "!";
      let texto = "ficha vazia";
      if (S.badges[i] === -1) {
        numero = "!";
        texto = "nenhuma regra serviu";
      } else if (S.badges[i] === -2) {
        numero = "★";
        texto = "regra da mesa";
      } else if (slot >= 0 && f[slot]) {
        numero = String(slot + 1);
        texto = M.REGRA_POR_ID[f[slot]].curto;
      }
      badge.innerHTML = `<b>${numero}</b><span>${texto}</span>`;
      badge.title = `Abrir a ficha de ${b.nome}`;
    });
  }

  function renderPlacar() {
    const est = getEstado();
    if (!est) return;
    placar0.textContent = String(est.placar[0]);
    placar1.textContent = String(est.placar[1]);
    maoNumeroEl.textContent = `mão ${est.maoNumero}`;
    atualizarStatus();
    atualizarBotoes();
  }

  function atualizarStatus() {
    const est = getEstado();
    if (!est || !statusCompactoEl || !statusRegraEl) return;
    if (est.fase === "bateu" && est.resultado) {
      const j = est.jogadores[est.resultado.jogador];
      statusRegraEl.innerHTML = `Bateu: <b>${BOTS[j.i].nome}</b> · ${M.nomeDaDupla(j.dupla)}`;
      statusCompactoEl.style.setProperty("--cor", BOTS[j.i].cor);
      return;
    }
    if (est.fase === "fechou" && est.resultado) {
      const r = est.resultado;
      statusRegraEl.innerHTML = `A mão fechou · <b>${r.duplas[0]} × ${r.duplas[1]}</b> pontos`;
      statusCompactoEl.style.setProperty(
        "--cor",
        r.vencedorDupla === null ? "#e3b15c" : BOTS[r.vencedorDupla === 0 ? 0 : 1].cor
      );
      return;
    }
    const bot = est.vez;
    const f = est.fichas[bot];
    let slot = S.regraDaVez;
    if (slot < 0) slot = f.findIndex((x) => x);
    let regra = "ficha vazia";
    if (S.regraDaVez === -1) regra = "recurso, nenhuma regra serviu";
    else if (S.regraDaVez === -2) regra = "regra da mesa";
    else if (slot >= 0 && f[slot]) regra = `regra ${slot + 1}: ${M.REGRA_POR_ID[f[slot]].curto}`;
    const apelido = BOTS[bot].nome.replace(/^(Seu|Dona)\s+/, "");
    statusRegraEl.innerHTML = `<b>${apelido}</b> · ${regra}`;
    statusCompactoEl.style.setProperty("--cor", BOTS[bot].cor);
  }

  function destacarRegra(bot, slot, acender = false) {
    const card = fichasEl.querySelector(`.ficha[data-bot="${bot}"]`);
    if (!card) return;
    card.querySelectorAll(".linha").forEach((l) => l.classList.remove("usada", "acendeu"));
    if (slot >= 0) {
      const linha = card.querySelector(`.linha[data-slot="${slot}"]`);
      if (linha) {
        linha.classList.add("usada");
        if (acender) {
          // Reinicia a animação de acender.
          void linha.offsetWidth;
          linha.classList.add("acendeu");
        }
      }
    }
    S.badges[bot] = slot;
    if (getEstado() && bot === getEstado().vez) S.regraDaVez = slot;
    atualizarBadges();
    atualizarStatus();
  }

  function limparUsadas() {
    fichasEl.querySelectorAll(".linha").forEach((l) => l.classList.remove("usada", "acendeu"));
  }

  function renderMaos() {
    const est = getEstado();
    if (!est) return;
    BOTS.forEach((b, i) => {
      const mao = maosEl.querySelector(`.mao[data-bot="${b.i}"]`);
      if (!mao) return;
      const ids = est.jogadores[i].mao;
      const qtd = mao.querySelector(".mao-qtd");
      qtd.innerHTML = `<b>${ids.length}</b>`;
      qtd.title = `${ids.length} ${ids.length === 1 ? "pedra" : "pedras"} na mão`;
      qtd.setAttribute("aria-label", qtd.title);
      mao.classList.toggle("vazia", ids.length === 0);
      mao.classList.toggle("revelada", S.mostrarMaos);
      const leque = mao.querySelector(".mao-leque");
      const assinatura = S.mostrarMaos ? ids.join(",") : "";
      if (leque.dataset.assinatura === assinatura) return;
      leque.dataset.assinatura = assinatura;
      leque.innerHTML = "";
      if (!S.mostrarMaos) return;
      const n = ids.length;
      ids.forEach((id, k) => {
        const p = est.pedras[id];
        const wrap = document.createElement("div");
        wrap.innerHTML = htmlPedra(p, p.a, p.b);
        const el = wrap.firstElementChild;
        el.dataset.pedraId = id;
        // lado a lado, sem se cobrir: de pé para quem está em cima e embaixo,
        // deitadas para quem está nos lados (Claude, 10/11/2026)
        const desloc = (k - (n - 1) / 2) * 36;
        const emPe = b.i === 0 || b.i === 2;
        if (emPe) el.style.setProperty("--dx", `${desloc}px`);
        else el.style.setProperty("--dy", `${desloc}px`);
        const rot = emPe ? "90deg" : "0deg";
        el.style.setProperty("--rot", rot);
        el.style.setProperty("--atraso", `${k * 35}ms`);
        el.style.transform = `rotate(${rot})`;
        leque.append(el);
      });
    });
  }

  function prepararProximoTurno() {
    const est = getEstado();
    lugaresEl.querySelectorAll(".lugar").forEach((l) => {
      l.classList.remove("vez", "pensando");
    });
    if (!est || est.fase !== "jogando") {
      atualizarStatus();
      atualizarBotoes();
      return;
    }
    const l = lugaresEl.querySelector(`.lugar[data-bot="${est.vez}"]`);
    if (l) l.classList.add("vez");
    S.regraDaVez = -9;
    atualizarStatus();
    atualizarBotoes();
  }

  function atualizarBotoes() {
    const est = getEstado();
    const btPausar = document.getElementById("bt-pausar");
    const btPasso = document.getElementById("bt-passo");
    const btNova = document.getElementById("bt-nova");
    const btMaos = document.getElementById("bt-maos");
    const rotulo = btPausar.querySelector(".rotulo-pausa");
    const use = btPausar.querySelector("use");
    rotulo.textContent = S.pausado ? "Continuar" : "Pausar";
    use.setAttribute("href", S.pausado ? "#ico-play" : "#ico-pausa");
    btPausar.setAttribute("aria-pressed", String(S.pausado));
    btPausar.setAttribute("aria-label", S.pausado ? "Continuar a partida" : "Pausar a partida");
    btPasso.disabled = !S.pausado || !est || est.fase !== "jogando" || S.seletorAberto;
    btNova.disabled = !est || est.fase === "jogando";
    btMaos.setAttribute("aria-pressed", String(S.mostrarMaos));
    document.querySelectorAll("#velocidade button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.vel === S.velocidade));
    });
    aoVivoEl.classList.toggle("pausado", S.pausado);
    vivoTextoEl.textContent = S.pausado ? "Pausado" : "Ao vivo";
    document.body.classList.toggle("pausado", S.pausado);
    if (est) {
      const passo = document.getElementById("bt-passo");
      passo.title = S.pausado ? "Jogar uma vez" : "Pause a partida para jogar uma vez";
    }
  }

  // ---------- balões ----------

  function esconderBaloes() {
    baloesEl.querySelectorAll(".balao").forEach((b) => b.classList.remove("on"));
  }

  function mostrarBalao(bot, { titulo, texto, sub = "", tipo = "" }) {
    esconderBaloes();
    const el = baloesEl.querySelector(`.balao[data-bot="${bot}"]`);
    if (!el) return;
    el.className = "balao" + (tipo ? ` ${tipo}` : "");
    el.style.setProperty("--cor", BOTS[bot].cor);
    el.querySelector(".balao-titulo").textContent = titulo || "";
    el.querySelector(".balao-texto").textContent = texto || "";
    const subEl = el.querySelector(".balao-sub");
    if (sub) {
      subEl.textContent = sub;
      subEl.hidden = false;
    } else {
      subEl.hidden = true;
    }
    requestAnimationFrame(() => el.classList.add("on"));
  }

  function mostrarBalaoDecisao(bot, d) {
    const partes = d.porque.split(/:\s*/);
    const texto = partes.length > 1 ? partes.slice(1).join(": ") : d.porque;
    mostrarBalao(bot, {
      titulo: d.nomeRegra,
      texto,
      tipo: d.regra === -2 ? "mesa" : d.regra === -1 ? "recurso" : "",
    });
  }

  function mostrarBalaoPasso(bot, jogador) {
    const pontas = getEstado().pontas;
    const faltas = pontas ? [...new Set([pontas.esq, pontas.dir])] : [];
    mostrarBalao(bot, {
      titulo: "Passou a vez",
      texto: "Passo",
      sub: faltas.length
        ? `Não tinha pedra que encaixa nas pontas ${faltas.join(" e ")}.`
        : "Não tinha pedra que encaixa.",
      tipo: "passo",
    });
  }

  // ---------- embaralhar e distribuir ----------

  async function animarEmbaralho(minha) {
    const est = getEstado();
    embaralhoEl.innerHTML = "";
    mesa.classList.add("embaralhando");
    const backs = [];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement("div");
      el.className = "pedra-embaralho";
      el.innerHTML = `<div class="pedra costas" style="--comp:64px"></div>`;
      el.style.left = "50%";
      el.style.top = "50%";
      embaralhoEl.append(el);
      backs.push(el);
    }
    const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzir) {
      backs.forEach((el, i) => {
        const a = (i / 28) * Math.PI * 2;
        el.style.transform = `translate(${Math.cos(a) * 40}px, ${Math.sin(a) * 30}px) rotate(${i % 8}deg)`;
      });
      await dormir(120);
      return;
    }
    const animacoes = [];
    backs.forEach((el, i) => {
      const ang = (i / 28) * Math.PI * 2 + (i % 3) * 0.29;
      const raio = 32 + (i % 7) * 16;
      const x0 = Math.cos(ang) * raio;
      const y0 = Math.sin(ang) * raio * 0.66;
      const volta = 180 + (i % 4) * 46;
      const dir = i % 2 ? 1 : -1;
      const r0 = (i * 37) % 36 - 18;
      el.style.transform = `translate(${x0}px, ${y0}px) rotate(${r0}deg)`;
      const frames = [
        { transform: `translate(${x0}px, ${y0}px) rotate(${r0}deg)`, offset: 0 },
        {
          transform: `translate(${Math.cos(ang + 0.75) * volta}px, ${Math.sin(ang + 0.75) * volta * 0.62}px) rotate(${r0 + dir * 26}deg)`,
          offset: 0.34,
        },
        {
          transform: `translate(${Math.cos(ang + 1.55) * (volta * 0.78)}px, ${Math.sin(ang + 1.55) * volta * 0.58}px) rotate(${r0 - dir * 18}deg)`,
          offset: 0.7,
        },
        { transform: `translate(${x0 * 0.16}px, ${y0 * 0.16}px) rotate(${r0 + dir * 6}deg)`, offset: 1 },
      ];
      const anim = el.animate(frames, {
        duration: 1500,
        delay: (i % 8) * 22,
        easing: "cubic-bezier(.38,.06,.25,1)",
        fill: "both",
      });
      animacoes.push(anim.finished.catch(() => {}));
    });
    await Promise.all(animacoes);
    await dormir(80);
  }

  async function distribuir(minha) {
    if (!vivo(minha)) return;
    const backs = [...embaralhoEl.querySelectorAll(".pedra-embaralho")];
    if (!backs.length) return;
    const felt = feltro.getBoundingClientRect();
    const e = escalaPalco();
    const fw = felt.width / e;
    const fh = felt.height / e;
    const alvos = [];
    for (const b of BOTS) {
      const costa = maosEl.querySelector(`.mao[data-bot="${b.i}"] .mao-costa`);
      const r = costa.getBoundingClientRect();
      alvos.push({
        x: (r.left + r.width / 2 - felt.left) / e - fw / 2,
        y: (r.top + r.height / 2 - felt.top) / e - fh / 2,
      });
    }
    maosEl.classList.add("distribuindo");
    const fim = [];
    backs.forEach((el, i) => {
      const jogador = i % 4;
      const dentro = Math.floor(i / 4);
      const alvo = alvos[jogador];
      const dx = (dentro - 3) * 3.2;
      const dy = (dentro - 3) * 2.4;
      const r0 = ((i * 41) % 40) - 20;
      const atual = getComputedStyle(el).transform;
      const frames = [
        { transform: atual && atual !== "none" ? atual : "translate(0px, 0px) rotate(0deg)", opacity: 1, offset: 0 },
        {
          transform: `translate(${(alvo.x * 0.52).toFixed(1)}px, ${(alvo.y * 0.52 - 58).toFixed(1)}px) rotate(${r0 * 0.5}deg)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translate(${(alvo.x + dx).toFixed(1)}px, ${(alvo.y + dy).toFixed(1)}px) rotate(${r0}deg) scale(.92)`,
          opacity: 1,
          offset: 1,
        },
      ];
      const anim = el.animate(frames, {
        duration: reduzirMovimento() ? 180 : 660,
        delay: reduzirMovimento() ? 0 : i * 28,
        easing: "cubic-bezier(.3,.55,.3,1)",
        fill: "both",
      });
      fim.push(anim.finished.catch(() => {}));
    });
    await Promise.all(fim);
    await dormir(80);
    if (!vivo(minha)) return;
    embaralhoEl.innerHTML = "";
    maosEl.classList.remove("distribuindo");
    renderMaos();
    await esperar(260);
  }

  // ---------- balões de fim ----------

  function soltarFaiscas(centro, cor, quantidade = 9) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < quantidade; i++) {
      const el = document.createElement("i");
      el.className = "faisca";
      el.style.left = `${centro.x}px`;
      el.style.top = `${centro.y}px`;
      el.style.background = `radial-gradient(circle, #fff8d8, ${cor} 45%, rgba(255,180,40,0) 72%)`;
      vooCamada.append(el);
      const ang = (i / quantidade) * Math.PI * 2 + Math.random() * 0.5;
      const d = 42 + Math.random() * 74;
      el.animate(
        [
          { transform: "translate(0,0) scale(.6)", opacity: 1 },
          {
            transform: `translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d - 30}px) scale(1.1)`,
            opacity: 0,
          },
        ],
        { duration: 800 + Math.random() * 350, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }
      ).finished.then(() => el.remove());
    }
  }

  function mostrarFaixa(titulo, sub) {
    faixaFim.innerHTML = `${titulo}${sub ? `<small>${sub}</small>` : ""}`;
    faixaFim.classList.add("on");
  }

  function esconderFaixa() {
    faixaFim.classList.remove("on");
  }

  async function celebrarBate(jogador, minha) {
    const est = getEstado();
    const j = est.jogadores[jogador];
    const parceiro = (jogador + 2) % 4;
    const dupla = j.dupla;
    mesa.classList.add("tocando");
    const faiscas = [];
    [jogador, parceiro].forEach((i) => {
      const l = lugaresEl.querySelector(`.lugar[data-bot="${i}"]`);
      if (l) {
        l.classList.add("venceu");
        const r = l.getBoundingClientRect();
        faiscas.push(noPalco(r));
      }
    });
    const perdedores = [0, 1, 2, 3].filter((i) => i !== jogador && i !== parceiro);
    perdedores.forEach((i) => lugaresEl.querySelector(`.lugar[data-bot="${i}"]`)?.classList.add("perdeu"));
    faiscas.forEach((c, k) => setTimeout(() => soltarFaiscas(c, "#ffd76a", 7 + k * 2), k * 160));
    const duplaEl = document.querySelector(`.dupla[data-dupla="${dupla}"]`);
    duplaEl.classList.remove("pontuou");
    void duplaEl.offsetWidth;
    duplaEl.classList.add("pontuou");
    placar0.textContent = String(est.placar[0]);
    placar1.textContent = String(est.placar[1]);
    mostrarBalao(jogador, {
      titulo: "Bateu",
      texto: "Bati!",
      sub: `${M.nomeDaDupla(dupla)} ganham a mão.`,
      tipo: "bate",
    });
    mostrarFaixa(`${M.nomeDaDupla(dupla)} ganham a mão`, `${j.nome} bateu. A dupla soma mais uma no placar.`);
    await esperar(1600);
    mesa.classList.remove("tocando");
    if (!vivo(minha)) return;
  }

  // ---------- fechamento ----------

  function somarAnimado(el, alvo, minha, duracao = 700) {
    const dur = reduzirMovimento() ? 220 : duracao;
    const inicio = performance.now();
    const passo = (agora) => {
      if (!vivo(minha)) return;
      const t = clamp((agora - inicio) / dur, 0, 1);
      el.textContent = String(Math.round(alvo * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  async function mostrarFechamento(minha) {
    const est = getEstado();
    const r = est.resultado;
    if (!r || r.tipo !== "fechou") return;
    const jogadores = est.jogadores;
    const times = [0, 1].map((dupla) => {
      const membros = jogadores.filter((j) => j.dupla === dupla);
      const pontosJog = membros.map((j) => M.pontosNaMao(est, j.i));
      const total = pontosJog.reduce((s, p) => s + p, 0);
      return { dupla, membros, pontosJog, total };
    });
    const vencedor = r.vencedorDupla;
    const htmlTimes = times
      .map(
        (t) =>
          `<div class="time-fechado ${vencedor === t.dupla ? "ganhou" : ""}">` +
          `<div class="time-nome"><b>${M.nomeDaDupla(t.dupla)}</b><span>${vencedor === t.dupla ? "menos pontos" : vencedor === null ? "empate" : ""}</span></div>` +
          `<div class="total" data-total="${t.total}"><span class="total-num">0</span><small>pontos</small></div>` +
          `<div class="time-jogadores">` +
          t.membros
            .map(
              (j, k) =>
                `<div class="jogador-fechado"><div class="jog-nome">${j.nome}</div><div class="pedras-fechadas">` +
                j.mao
                  .map((id, m) => {
                    const p = est.pedras[id];
                    return `<span class="pedra-mini" style="--atraso:${(k * 3 + m) * 55}ms">${htmlPedra(p, p.a, p.b)}</span>`;
                  })
                  .join("") +
                `</div><div class="jog-pontos">${t.pontosJog[k]} pontos</div></div>`
            )
            .join("") +
          `</div></div>`
      )
      .join("");
    painelEl.innerHTML =
      `<div class="painel-topo"><div><h2 id="fechamento-titulo">A mão fechou</h2><p>Ninguém tinha pedra que encaixasse. Somam-se os pontos que sobraram em cada mão.</p></div><span class="painel-selo">mão ${est.maoNumero}</span></div>` +
      `<div class="fechamento-times">${htmlTimes}</div>` +
      `<div class="painel-rodape"><p>Ganha a dupla com menos pontos. Empate: ninguém ganha.</p><button type="button" class="botao-nova" id="bt-nova-painel">Nova mão <kbd>N</kbd></button></div>`;
    painelCamada.hidden = false;
    renderPlacar();
    painelEl.querySelectorAll(".total").forEach((el) => {
      const alvo = +el.dataset.total;
      const numero = el.querySelector(".total-num");
      if (numero) somarAnimado(numero, alvo, minha, 760);
    });
    painelEl.querySelector("#bt-nova-painel")?.addEventListener("click", () => pedirNovaMao());
    await esperar(700);
  }

  // ---------- voo ----------

  function criarVoo(p, pedaco) {
    const el = document.createElement("div");
    el.className = "voo-pedra";
    el.innerHTML = htmlPedra(p, pedaco.numeroEsq, pedaco.numeroDir);
    const sombra = document.createElement("div");
    sombra.className = "voo-sombra";
    vooCamada.append(sombra, el);
    S.vooAtual = { el, sombra };
    return { el, sombra };
  }

  function voarPedra(inicio, alvo, p, pedaco, minha) {
    return new Promise((ok) => {
      const { el, sombra } = criarVoo(p, pedaco);
      const dur = (S.vooLento ? 3400 : reduzirMovimento() ? 240 : 640) / FATOR[S.velocidade];
      const t0 = performance.now();
      const startScale = clamp(Math.min(inicio.largura / 50, inicio.altura / 100), 0.4, 1.2);
      const startAng = inicio.ang + (pedaco.numeroEsq === p.a ? 0 : 180);
      const delta = ((pedaco.ang - startAng) % 360 + 360) % 360 + 360;
      const fimPonto = noPalco(alvo.el);
      const dxTotal = fimPonto.x - inicio.x;
      const dyTotal = fimPonto.y - inicio.y;
      const dist = Math.hypot(dxTotal, dyTotal);
      const alturaArco = Math.min(170, 62 + dist * 0.17);
      const passo = (agora) => {
        if (!vivo(minha)) {
          el.remove();
          sombra.remove();
          S.vooAtual = null;
          ok();
          return;
        }
        const bruto = clamp((agora - t0) / dur, 0, 1);
        const t = bruto < 0.5 ? 4 * bruto * bruto * bruto : 1 - Math.pow(-2 * bruto + 2, 3) / 2;
        const fim = noPalco(alvo.el);
        const sAtual = escalaDaCamera();
        const x = inicio.x + (fim.x - inicio.x) * t;
        const y = inicio.y + (fim.y - inicio.y) * t - alturaArco * 4 * t * (1 - t);
        const ang = startAng + delta * t;
        const sc = startScale + (sAtual - startScale) * t;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${ang.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        const shX = x;
        const shY = y + 24 + 12 * t;
        sombra.style.transform = `translate(${shX.toFixed(2)}px, ${shY.toFixed(2)}px) scale(${(0.55 + 0.65 * t).toFixed(2)})`;
        sombra.style.opacity = String(0.12 + 0.38 * t);
        if (bruto < 1) requestAnimationFrame(passo);
        else {
          el.style.transform = `translate(${fim.x.toFixed(2)}px, ${fim.y.toFixed(2)}px) rotate(${(startAng + delta).toFixed(2)}deg) scale(${sAtual.toFixed(3)})`;
          el.remove();
          sombra.remove();
          S.vooAtual = null;
          ok();
        }
      };
      requestAnimationFrame(passo);
    });
  }

  // ---------- turno ----------

  async function turno(minha) {
    const est = getEstado();
    if (!est || est.fase !== "jogando" || !vivo(minha)) return;
    const jogador = est.vez;
    const seat = lugaresEl.querySelector(`.lugar[data-bot="${jogador}"]`);
    esconderBaloes();
    limparUsadas();
    prepararProximoTurno();
    seat?.classList.add("pensando");
    await esperar(380);
    if (!vivo(minha) || getEstado() !== est) return;
    const decisao = M.decidir(est, jogador, est.fichas[jogador]);
    seat?.classList.remove("pensando");
    if (!decisao) {
      await animarPasso(jogador, minha);
      return;
    }
    destacarRegra(jogador, decisao.regra, true);
    mostrarBalaoDecisao(jogador, decisao);
    await esperar(360);
    if (!vivo(minha)) return;
    await animarJogada(jogador, decisao, minha);
  }

  async function animarPasso(jogador, minha) {
    const est = getEstado();
    const seat = lugaresEl.querySelector(`.lugar[data-bot="${jogador}"]`);
    mostrarBalaoPasso(jogador, jogador);
    await esperar(380);
    if (!vivo(minha)) return;
    mesa.classList.add("tocando");
    seat?.classList.add("tocando");
    const pedras = [...correnteEl.querySelectorAll(".pedra-corrente")];
    pedras.forEach((el, i) => {
      el.style.setProperty("--atraso", `${(i % 6) * 28}ms`);
      el.classList.add("tremendo");
    });
    await esperar(560);
    if (!vivo(minha)) return;
    mesa.classList.remove("tocando");
    seat?.classList.remove("tocando");
    pedras.forEach((el) => el.classList.remove("tremendo"));
    if (!vivo(minha) || getEstado() !== est) return;
    M.passar(est, jogador);
    S.ultimoEvento = est.fase === "fechou" ? "fechou" : "passo";
    renderFichas();
    renderPlacar();
    await esperar(620);
    if (!vivo(minha)) return;
    esconderBaloes();
    seat?.classList.remove("vez");
    if (est.fase === "fechou") {
      await mostrarFechamento(minha);
      atualizarBotoes();
      return;
    }
    prepararProximoTurno();
  }

  function medirInicioMao(jogador, pedraId) {
    const mao = maosEl.querySelector(`.mao[data-bot="${jogador}"]`);
    let el = null;
    if (S.mostrarMaos) {
      el = mao.querySelector(`.mao-leque .pedra[data-pedra-id="${pedraId}"]`);
    }
    if (!el) el = mao.querySelector(".mao-costa .pedra");
    const r = el.getBoundingClientRect();
    const c = centroPalco(r);
    return { x: c.x, y: c.y, ang: 90, largura: r.width / escalaPalco(), altura: r.height / escalaPalco() };
  }

  async function animarJogada(jogador, d, minha) {
    const est = getEstado();
    const seat = lugaresEl.querySelector(`.lugar[data-bot="${jogador}"]`);
    const p = M.pedra(est, d.pedraId);
    const inicio = medirInicioMao(jogador, d.pedraId);
    if (!vivo(minha) || getEstado() !== est) return;
    M.jogar(est, jogador, d);
    if (!vivo(minha)) return;
    S.ultimoEvento = est.fase === "bateu" ? "bateu" : est.fase === "fechou" ? "fechou" : "jogada";
    S.logs.push({
      tipo: "voo",
      t: performance.now(),
      jogador,
      pedraId: d.pedraId,
      corrente: est.corrente.length,
      regra: d.regra,
    });
    const alvo = renderCorrente({ novaId: d.pedraId });
    if (!alvo || !alvo.el || !alvo.pedaco) return;
    renderMaos();
    renderPlacar();
    if (!vivo(minha)) return;
    // deixa a câmera começar a andar e a ponta acender
    await dormir(60);
    acenderPonta(alvo.pedaco);
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    await voarPedra(inicio, alvo, p, alvo.pedaco, minha);
    if (!vivo(minha)) return;
    brilhoEl.classList.remove("on");
    alvo.el.classList.remove("entrando");
    alvo.el.classList.add("assentou");
    if (est.fase !== "jogando") {
      esconderBaloes();
      if (est.fase === "bateu") {
        await celebrarBate(jogador, minha);
      } else if (est.fase === "fechou") {
        await mostrarFechamento(minha);
      }
      atualizarBotoes();
      return;
    }
    await esperar(220);
    if (!vivo(minha)) return;
    esconderBaloes();
    seat?.classList.remove("vez");
    prepararProximoTurno();
  }

  // ---------- fim de mão e próxima ----------

  async function esperarFim(minha) {
    const est = getEstado();
    const total = 7000;
    let restante = total;
    while (vivo(minha)) {
      if (S.pedidoNovaMao) break;
      if (!S.pausado && !S.segurarFim) restante -= 100;
      if (restante <= 0) break;
      await dormir(100);
    }
    if (!vivo(minha)) return false;
    return true;
  }

  async function proximaMaoUI(minha) {
    S.pedidoNovaMao = false;
    const est = getEstado();
    painelCamada.hidden = true;
    esconderFaixa();
    esconderBaloes();
    lugaresEl.querySelectorAll(".lugar").forEach((l) => l.classList.remove("venceu", "perdeu", "vez", "pensando", "tocando"));
    limparUsadas();
    S.badges = [-9, -9, -9, -9];
    M.proximaMao(est);
    prepararMaoUI();
    renderPlacar();
    atualizarBotoes();
    await animarEmbaralho(minha);
    if (!vivo(minha)) return;
    await distribuir(minha);
    if (!vivo(minha)) return;
    prepararProximoTurno();
    S.jogavel = true;
  }

  function preAquecerPrimeiraPedra() {
    if (!getEstado() || S.mapaPedras.size) return;
    const p = getEstado().pedras[27];
    if (!p || p.a !== 6 || p.b !== 6) return;
    const el = document.createElement("div");
    el.className = "pedra-corrente entrando";
    el.dataset.pedraId = "27";
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.transform = "rotate(90deg)";
    el.innerHTML = htmlPedra(p, 6, 6);
    correnteEl.append(el);
    S.mapaPedras.set(27, el);
  }

  function prepararMaoUI() {
    S.jogavel = false;
    limparCorrente();
    resetarCameraVazia();
    embaralhoEl.innerHTML = "";
    maosEl.classList.add("distribuindo");
    esconderBaloes();
    painelCamada.hidden = true;
    esconderFaixa();
    renderFichas();
    renderPlacar();
    renderMaos();
  }

  async function laco() {
    const minha = S.epoca;
    while (vivo(minha)) {
      const est = getEstado();
      if (!est) return;
      if (est.fase !== "jogando") {
        const pode = await esperarFim(minha);
        if (!pode) return;
        await proximaMaoUI(minha);
        if (!vivo(minha)) return;
        continue;
      }
      if ((S.pausado && !S.passoUnico) || document.hidden) {
        await dormir(90);
        continue;
      }
      S.passoUnico = false;
      await turno(minha);
    }
  }

  // ---------- partida ----------

  function novaPartida({ semente, fichas, manterFichas = true } = {}) {
    const fichasAtuais = manterFichas && getEstado() ? getEstado().fichas.map((f) => f.slice()) : M.fichasOriginais();
    S.estado = M.novaPartida({
      semente,
      fichas: fichasAtuais,
    });
    S.mapaPedras.clear();
    S.badges = [-9, -9, -9, -9];
  }

  async function iniciar() {
    montarLugares();
    montarFichas();
    montarMaos();
    montarBaloes();
    ligarControles();
    ajustarEscala();
    addEventListener("resize", ajustarEscala);

    const params = new URLSearchParams(location.search);
    const semente = params.get("semente") ? Number(params.get("semente")) : undefined;
    const teste = params.get("teste") || "";
    S.teste = teste;
    S.segurarFim = params.get("segurar") === "1" || teste === "fechar" || teste === "bate";
    S.mostrarMaos = params.get("maos") === "1";
    S.velocidade = FATOR[params.get("vel")] ? params.get("vel") : "normal";
    novaPartida({ semente, manterFichas: false });
    S.epoca++;
    const minha = S.epoca;
    preAquecerPrimeiraPedra();
    renderFichas();
    renderPlacar();
    renderMaos();
    maosEl.classList.add("distribuindo");
    resetarCameraVazia();
    atualizarBotoes();
    esconderBaloes();
    S.pronto = true;

    await animarEmbaralho(minha);
    if (!vivo(minha)) return;
    await distribuir(minha);
    if (!vivo(minha)) return;
    prepararProximoTurno();
    S.jogavel = true;
    if (params.get("pausado") === "1") S.pausado = true;
    atualizarBotoes();
    laco();
  }

  // ---------- reiniciar e nova mão ----------

  async function reiniciar(semente) {
    S.epoca++;
    const minha = S.epoca;
    S.pausado = false;
    S.passoUnico = false;
    S.pedidoNovaMao = false;
    S.seletorAberto = false;
    seletorCamada.hidden = true;
    painelCamada.hidden = true;
    esconderFaixa();
    esconderBaloes();
    vooCamada.innerHTML = "";
    S.vooAtual = null;
    lugaresEl.querySelectorAll(".lugar").forEach((l) => l.classList.remove("venceu", "perdeu", "vez", "pensando", "tocando"));
    limparCorrente();
    S.badges = [-9, -9, -9, -9];
    novaPartida({ semente, manterFichas: true });
    preAquecerPrimeiraPedra();
    renderFichas();
    renderPlacar();
    renderMaos();
    maosEl.classList.add("distribuindo");
    resetarCameraVazia();
    atualizarBotoes();
    await animarEmbaralho(minha);
    if (!vivo(minha)) return;
    await distribuir(minha);
    if (!vivo(minha)) return;
    prepararProximoTurno();
    S.jogavel = true;
    laco();
  }

  function pedirNovaMao() {
    const est = getEstado();
    if (!est || est.fase === "jogando") return;
    S.pedidoNovaMao = true;
    atualizarBotoes();
  }

  function setPausado(v) {
    S.pausado = !!v;
    if (!S.pausado) S.passoUnico = false;
    atualizarBotoes();
  }

  function setMostrarMaos(v) {
    S.mostrarMaos = !!v;
    renderMaos();
    if (getEstado()?.corrente.length) renderCorrente();
    atualizarBotoes();
  }

  // ---------- seletor ----------

  function opcaoHTML(id, bot, atual) {
    const regra = M.REGRA_POR_ID[id];
    return (
      `<button type="button" class="opcao ${atual === id ? "atual" : ""}" data-regra="${id}" style="--cor:${BOTS[bot].cor}">` +
      `<svg class="ico"><use href="#ico-${ICONE[id]}"/></svg>` +
      `<span class="texto"><b>${regra.nome}</b><span>${regra.descricao}</span></span>` +
      `<svg class="ico check"><use href="#ico-check"/></svg>` +
      `</button>`
    );
  }

  function abrirSeletor(bot, slot) {
    const est = getEstado();
    if (!est) return;
    S.seletorAberto = true;
    S.seletorBot = bot;
    S.seletorSlot = clamp(slot, 0, 2);
    S.pausadoAntes = S.pausado;
    setPausado(true);
    renderSeletor();
    seletorCamada.hidden = false;
    requestAnimationFrame(() => seletorCamada.classList.add("aberto"));
    atualizarBotoes();
    setTimeout(() => seletorEl.querySelector(".seletor-x")?.focus(), 30);
  }

  function renderSeletor() {
    const est = getEstado();
    const bot = S.seletorBot;
    const slot = S.seletorSlot;
    const f = est.fichas[bot];
    const atual = f[slot];
    const nome = BOTS[bot].nome;
    const cor = BOTS[bot].cor;
    seletorEl.style.setProperty("--cor", cor);
    seletorEl.innerHTML =
      `<div class="seletor-topo">` +
      `<div><h2 id="seletor-titulo">Ficha de ${nome}</h2><p>linha ${slot + 1} de 3 · ${BOTS[bot].jeito}</p></div>` +
      `<div class="seletor-acoes">` +
      `<button type="button" class="seletor-seta" data-acao="sobe" title="Subir esta linha" ${slot === 0 ? "disabled" : ""}><svg class="ico"><use href="#ico-sobe"/></svg></button>` +
      `<button type="button" class="seletor-seta" data-acao="desce" title="Descer esta linha" ${slot === 2 ? "disabled" : ""}><svg class="ico"><use href="#ico-desce"/></svg></button>` +
      `<button type="button" class="seletor-x" data-acao="fecha" title="Fechar"><svg class="ico"><use href="#ico-fechar"/></svg></button>` +
      `</div></div>` +
      `<p class="seletor-dica">A mudança vale a partir da próxima jogada de ${nome}. A regra usada acende na ficha.</p>` +
      `<div class="opcoes">` +
      M.REGRAS.map((r) => opcaoHTML(r.id, bot, atual)).join("") +
      `<button type="button" class="opcao vazia ${atual === null ? "atual" : ""}" data-regra="" style="--cor:${cor}">` +
      `<svg class="ico"><use href="#ico-vazio"/></svg>` +
      `<span class="texto"><b>Deixar vazia</b><span>Esta linha não decide nada; o robô passa para a próxima.</span></span>` +
      `<svg class="ico check"><use href="#ico-check"/></svg>` +
      `</button>` +
      `</div>` +
      `<div class="seletor-rodape"><p>As três linhas são lidas de cima para baixo.</p>` +
      `<button type="button" class="botao-creme" data-acao="originais">Voltar às fichas originais</button></div>`;
    seletorEl.querySelectorAll("[data-regra]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.regra === "" ? null : +b.dataset.regra;
        aplicarRegra(bot, slot, id);
      });
    });
    seletorEl.querySelectorAll("[data-acao]").forEach((b) => {
      b.addEventListener("click", () => {
        const acao = b.dataset.acao;
        if (acao === "fecha") fecharSeletor();
        else if (acao === "sobe") moverLinha(bot, slot, -1);
        else if (acao === "desce") moverLinha(bot, slot, 1);
        else if (acao === "originais") voltarOriginais();
      });
    });
  }

  function fecharSeletor() {
    if (!S.seletorAberto) return;
    S.seletorAberto = false;
    seletorCamada.classList.remove("aberto");
    const eraPausado = S.pausadoAntes;
    setTimeout(() => {
      if (!S.seletorAberto) seletorCamada.hidden = true;
    }, 220);
    if (!eraPausado) {
      setTimeout(() => {
        if (!S.seletorAberto) setPausado(false);
      }, 550);
    } else {
      setPausado(true);
    }
    atualizarBotoes();
  }

  function aplicarRegra(bot, slot, id) {
    const est = getEstado();
    if (!est) return;
    est.fichas[bot][slot] = id;
    renderFichas();
    piscarLinha(bot, slot);
    S.badges[bot] = -9;
    atualizarBadges();
    const nome = BOTS[bot].nome;
    mostrarToast(id ? `${nome}: linha ${slot + 1} agora é ${M.REGRA_POR_ID[id].curto}.` : `${nome}: linha ${slot + 1} ficou vazia.`);
    fecharSeletor();
  }

  function moverLinha(bot, slot, delta) {
    const est = getEstado();
    const novo = slot + delta;
    if (novo < 0 || novo > 2) return;
    const f = est.fichas[bot];
    const troca = f[slot];
    f[slot] = f[novo];
    f[novo] = troca;
    renderFichas();
    S.seletorSlot = novo;
    S.badges[bot] = -9;
    atualizarBadges();
    renderSeletor();
    piscarLinha(bot, novo);
    mostrarToast(`Linha ${novo === 0 ? "1" : novo === 1 ? "2" : "3"} de ${BOTS[bot].nome} movida.`);
  }

  function voltarOriginais() {
    const est = getEstado();
    if (!est) return;
    const originais = M.fichasOriginais();
    const mudadas = [];
    est.fichas.forEach((f, i) => {
      for (let s = 0; s < 3; s++) {
        if (f[s] !== originais[i][s]) mudadas.push([i, s]);
        f[s] = originais[i][s];
      }
    });
    renderFichas();
    S.badges = [-9, -9, -9, -9];
    atualizarBadges();
    mudadas.forEach(([i, s]) => piscarLinha(i, s));
    document.querySelectorAll(".ficha").forEach((f) => {
      f.classList.remove("ajustada");
      void f.offsetWidth;
      f.classList.add("ajustada");
    });
    mostrarToast("As quatro fichas voltaram ao original.");
    if (S.seletorAberto) renderSeletor();
  }

  function piscarLinha(bot, slot) {
    const linha = fichasEl.querySelector(`.ficha[data-bot="${bot}"] .linha[data-slot="${slot}"]`);
    if (!linha) return;
    linha.classList.remove("mudou");
    void linha.offsetWidth;
    linha.classList.add("mudou");
    setTimeout(() => linha.classList.remove("mudou"), 800);
  }

  let toastTimer = 0;
  function mostrarToast(texto) {
    toastEl.textContent = texto;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }

  // ---------- controles ----------

  function ligarControles() {
    document.getElementById("bt-reiniciar").addEventListener("click", (e) => {
      e.currentTarget.blur();
      reiniciar();
    });
    document.getElementById("bt-nova").addEventListener("click", (e) => {
      e.currentTarget.blur();
      pedirNovaMao();
    });
    document.getElementById("bt-pausar").addEventListener("click", (e) => {
      e.currentTarget.blur();
      setPausado(!S.pausado);
    });
    document.getElementById("bt-passo").addEventListener("click", (e) => {
      e.currentTarget.blur();
      if (S.pausado && getEstado()?.fase === "jogando") S.passoUnico = true;
      atualizarBotoes();
    });
    document.querySelectorAll("#velocidade button").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.currentTarget.blur();
        S.velocidade = b.dataset.vel;
        correnteEl.style.transitionDuration = `${(1.05 / FATOR[S.velocidade]).toFixed(2)}s`;
        atualizarBotoes();
      });
    });
    document.getElementById("bt-maos").addEventListener("click", (e) => {
      e.currentTarget.blur();
      setMostrarMaos(!S.mostrarMaos);
    });
    document.getElementById("bt-originais").addEventListener("click", (e) => {
      e.currentTarget.blur();
      voltarOriginais();
    });
    seletorCamada.addEventListener("click", (e) => {
      if (e.target === seletorCamada) fecharSeletor();
    });
    addEventListener("keydown", tecla);
  }

  function tecla(e) {
    const k = e.key;
    if (!document.hasFocus()) return;
    if (S.seletorAberto) {
      if (k === "Escape") {
        fecharSeletor();
        e.preventDefault();
      }
      return;
    }
    if (k === "Escape" && !painelCamada.hidden) {
      // O fechamento espera a nova mão; Esc não esconde o resultado.
      return;
    }
    const alvo = e.target instanceof Element ? e.target.closest("button, input, textarea, select, a") : null;
    if (k === "r" || k === "R") {
      if (e.repeat) return;
      reiniciar();
      e.preventDefault();
      return;
    }
    if (k === "n" || k === "N") {
      if (e.repeat) return;
      pedirNovaMao();
      e.preventDefault();
      return;
    }
    if (e.code === "Space") {
      if (alvo) return;
      if (e.repeat) return;
      setPausado(!S.pausado);
      e.preventDefault();
      return;
    }
    if (k === "ArrowRight") {
      if (S.pausado && getEstado()?.fase === "jogando") {
        S.passoUnico = true;
        atualizarBotoes();
        e.preventDefault();
      }
      return;
    }
    if (k === "m" || k === "M") {
      if (e.repeat) return;
      setMostrarMaos(!S.mostrarMaos);
      e.preventDefault();
    }
  }

  // ---------- ponte de teste ----------

  function ligarTeste() {
    window.__domino = {
      estado: () => (getEstado() ? M.retrato(getEstado()) : null),
      diagnostico: () => {
        const calc = calcularCorrente(getEstado());
        return {
          camera: { ...S.camera },
          pedacos: calc.pedacos,
          juntas: calc.juntas,
          bounds: calc.bounds,
          voando: !!S.vooAtual,
          fase: getEstado()?.fase,
          vez: getEstado()?.vez,
          ultimoEvento: S.ultimoEvento,
        };
      },
      pausar: () => setPausado(true),
      continuar: () => setPausado(false),
      umaJogada: () => {
        setPausado(true);
        S.passoUnico = true;
        atualizarBotoes();
      },
      reiniciar: (semente) => reiniciar(semente),
      novaMao: () => pedirNovaMao(),
      mostrarMaos: (v) => setMostrarMaos(v),
      velocidade: (v) => {
        if (FATOR[v]) {
          S.velocidade = v;
          atualizarBotoes();
        }
      },
      vooLento: (v) => {
        S.vooLento = !!v;
      },
      fichas: () => getEstado().fichas.map((f) => f.slice()),
      fichasOriginais: () => voltarOriginais(),
      definirRegra: (bot, slot, id) => {
        getEstado().fichas[bot][slot] = id == null ? null : +id;
        renderFichas();
        S.badges[bot] = -9;
        atualizarBadges();
      },
      abrirSeletor: (bot, slot) => abrirSeletor(bot, slot),
      fecharSeletor: () => fecharSeletor(),
      segurarFim: (v) => {
        S.segurarFim = !!v;
      },
      pronto: () => S.pronto,
      jogavel: () => S.jogavel,
      pausado: () => S.pausado,
      logs: () => S.logs.slice(),
    };
    window.__DOMINO_PRONTO = true;
  }

  // Começa.
  ligarTeste();
  iniciar().catch((e) => {
    console.error("Falha ao iniciar a mesa de dominó:", e);
    mostrarToast("Não foi possível iniciar a mesa. Veja o console.");
  });
})();
