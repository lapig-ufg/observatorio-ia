// Capa e "a sala em pontos". Cada resposta é um ponto de luz: na capa, os
// pontos flutuam devagar enquanto a turma responde; na cena seguinte, os
// mesmos pontos voam para as colunas de cada pergunta. O brilho do ponto vem
// da frequência de uso (pergunta 1): quem usa todo dia brilha mais.

(() => {
  const Q = window.QUESTIONARIO;
  const P = window.PALCO;
  const W = 1600, H = 900;
  const BRILHO = ["#3f6455", "#5e8f78", "#7fc4a2", "#bfe6d1", "#fff6e3"];
  const pontos = new Map(); // id -> {x, y, tx, ty, vx, vy, nasceu}
  let linhas = [];

  const daTurma = () => linhas.filter((l) => l.turma !== "VISITANTE" && (!P.turma || l.turma === P.turma));

  // ----- Canvas nítido apesar da escala do palco -----
  function preparar(canvas) {
    const ctx = canvas.getContext("2d");
    const ajustar = () => {
      const d = Math.min(2.5, (devicePixelRatio || 1) * P.escala);
      canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    ajustar();
    document.querySelector(".palco").addEventListener("escala", ajustar);
    return ctx;
  }

  function desenharPontos(ctx, r, realce) {
    ctx.clearRect(0, 0, W, H);
    const agora = performance.now();
    for (const [id, pt] of pontos) {
      const cor = BRILHO[pt.f] || BRILHO[2];
      const novo = Math.max(0, 1 - (agora - pt.nasceu) / 1800); // pulso de quem acabou de chegar
      if (novo > 0) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r + 30 * (1 - novo), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224,122,69,${novo})`; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.shadowColor = cor; ctx.shadowBlur = pt.f >= 3 ? 14 : 6;
      ctx.globalAlpha = realce && !realce(pt) ? 0.25 : 1;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  async function atualizar() {
    try {
      const l = await Q.listar();
      l.forEach((x, i) => { x._id = `${x.t}|${x.turma}|${i}`; });
      linhas = l.filter((x) => Array.isArray(x.r) && x.r.length === Q.PERGUNTAS.length);
      const vivos = new Set();
      daTurma().forEach((x) => {
        vivos.add(x._id);
        if (!pontos.has(x._id)) {
          const pt = { x: 200 + Math.random() * 1200, y: H + 20, vx: (Math.random() - .5) * .3, vy: -(1.2 + Math.random()), f: x.r[0], r: x.r, nasceu: performance.now() };
          pt.tx = 120 + Math.random() * 1360; pt.ty = 120 + Math.random() * 660;
          pontos.set(x._id, pt);
        }
      });
      for (const id of [...pontos.keys()]) if (!vivos.has(id)) pontos.delete(id);
      document.dispatchEvent(new CustomEvent("sala-dados", { detail: { total: vivos.size } }));
    } catch (e) {
      console.warn("Levantamento:", e);
    }
  }
  let timer = 0;
  const ligarConsulta = () => { if (!timer) { atualizar(); timer = setInterval(atualizar, 4000); } };
  const desligarConsulta = () => { clearInterval(timer); timer = 0; };

  // ----- Capa: QR, contagem e o céu de pontos -----
  const capa = document.getElementById("capa");
  const ctxCapa = preparar(capa.querySelector("canvas.fundo"));
  // No computador local o QR aponta para o endereço público (o celular não alcança o localhost).
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const destino = new URL("responder.html", local && window.CURSO_PUBLICO ? window.CURSO_PUBLICO : location.href);
  if (P.turma) destino.searchParams.set("turma", P.turma);
  const qr = capa.querySelector(".qr");
  const codigo = qrcode(0, "M");
  codigo.addData(destino.href); codigo.make();
  qr.querySelector("div").innerHTML = codigo.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  qr.querySelector("svg").setAttribute("aria-label", "QR code para responder ao levantamento");
  qr.title = destino.href;
  if (P.turma) capa.querySelector(".turma").textContent = `Turma ${P.turma}`;

  let rafCapa = 0;
  function voarCapa() {
    const t = performance.now() / 1000;
    for (const pt of pontos.values()) {
      // Deriva lenta em volta de um ponto fixo, como vaga-lume.
      const ax = pt.tx + Math.sin(t * .23 + pt.ty) * 40, ay = pt.ty + Math.cos(t * .19 + pt.tx) * 30;
      pt.vx += (ax - pt.x) * .0009; pt.vy += (ay - pt.y) * .0009;
      pt.vx *= .985; pt.vy *= .985;
      pt.x += pt.vx; pt.y += pt.vy;
    }
    desenharPontos(ctxCapa, 6);
    rafCapa = requestAnimationFrame(voarCapa);
  }
  capa.addEventListener("entrou", () => { ligarConsulta(); if (!rafCapa) voarCapa(); });
  capa.addEventListener("saiu", () => { cancelAnimationFrame(rafCapa); rafCapa = 0; });
  document.addEventListener("sala-dados", (e) => {
    capa.querySelector(".contagem b").textContent = e.detail.total;
    sala.querySelector(".contagem-sala").textContent = `${e.detail.total} ${e.detail.total === 1 ? "pessoa" : "pessoas"}`;
    if (sala.classList.contains("ativa")) colunas();
  });

  // ----- A sala: uma pergunta por passo -----
  const sala = document.getElementById("sala");
  const ctxSala = preparar(sala.querySelector("canvas.fundo"));
  let pergunta = 0, rotulos = [], raio = 8, realce = null, rafSala = 0;

  function colunas() {
    const p = Q.PERGUNTAS[pergunta];
    const lista = daTurma();
    const total = lista.length || 1;
    const n = p.opcoes.length;
    const x0 = 110, x1 = W - 110, base = 640, topo = 250;
    const colW = (x1 - x0) / n;
    const grupos = p.opcoes.map((nome, k) => lista.filter((l) => l.r[pergunta] === k));
    const maior = Math.max(1, ...grupos.map((g) => g.length));
    raio = Math.min(24, colW / 5.5); // turma pequena: pontos grandes; o laço abaixo encolhe se não couber
    const cabe = (r) => { const porLinha = Math.max(1, Math.floor(colW * .78 / (2 * r + 4))); return Math.ceil(maior / porLinha) * (2 * r + 4) <= base - topo; };
    while (raio > 2.5 && !cabe(raio)) raio -= .5;
    const passoP = 2 * raio + 4, porLinha = Math.max(1, Math.floor(colW * .78 / passoP));
    rotulos = [];
    grupos.forEach((g, gi) => {
      const cx = x0 + colW * (gi + .5);
      [...g].sort((a, b) => b.r[0] - a.r[0] || a.t - b.t).forEach((l, k) => {
        const linha = Math.floor(k / porLinha), col = k % porLinha;
        const larg = Math.min(porLinha, g.length - linha * porLinha) * passoP;
        const pt = pontos.get(l._id); if (!pt) return;
        pt.tx = cx - larg / 2 + col * passoP + raio + 2;
        pt.ty = base - linha * passoP - raio;
      });
      rotulos.push({ x: cx, w: colW * .9, nome: p.opcoes[gi], qtd: g.length, pct: Math.round(100 * g.length / total) });
    });
    // Na pergunta 5, a coluna mais alta ganha destaque: é por ela que a Fase 2 começa.
    const destaque = sala.querySelector(".sala-destaque");
    if (pergunta === 4 && lista.length) {
      const k = grupos.reduce((m, g, i) => g.length > grupos[m].length ? i : m, 0);
      destaque.querySelector("strong").textContent = p.opcoes[k];
      destaque.hidden = false;
      realce = (pt) => pt.r[4] === k;
      document.body.dataset.comecaPor = k;
    } else { destaque.hidden = true; realce = null; }
    sala.querySelector(".titulo").textContent = p.texto.replace(" Marque o ponto mais distante.", "");
    sala.querySelector(".rotulo.num").textContent = `Pergunta ${pergunta + 1} de ${Q.PERGUNTAS.length}`;
  }

  function voarSala() {
    for (const pt of pontos.values()) {
      pt.vx = (pt.vx + (pt.tx - pt.x) * .02) * .82;
      pt.vy = (pt.vy + (pt.ty - pt.y) * .02) * .82;
      pt.x += pt.vx; pt.y += pt.vy;
    }
    desenharPontos(ctxSala, raio, realce);
    // Rótulos embaixo de cada coluna
    ctxSala.textAlign = "center"; ctxSala.textBaseline = "top";
    rotulos.forEach((r) => {
      ctxSala.fillStyle = "rgba(243,239,230,.18)"; ctxSala.fillRect(r.x - r.w / 2, 652, r.w, 1);
      ctxSala.fillStyle = "#f3efe6"; ctxSala.font = "400 44px Georgia, serif";
      ctxSala.fillText(r.qtd ? `${r.pct}%` : "–", r.x, 668);
      ctxSala.fillStyle = "#b7c6be"; ctxSala.font = "500 21px Inter, system-ui, sans-serif";
      quebrar(ctxSala, r.nome, r.w).slice(0, 3).forEach((t, i) => ctxSala.fillText(t, r.x, 724 + i * 27));
    });
    rafSala = requestAnimationFrame(voarSala);
  }
  function quebrar(ctx, texto, w) {
    const out = []; let atual = "";
    for (const p of texto.split(" ")) {
      const t = atual ? atual + " " + p : p;
      if (ctx.measureText(t).width > w && atual) { out.push(atual); atual = p; } else atual = t;
    }
    if (atual) out.push(atual);
    return out;
  }
  sala.addEventListener("entrou", () => { ligarConsulta(); colunas(); if (!rafSala) voarSala(); });
  sala.addEventListener("saiu", () => { cancelAnimationFrame(rafSala); rafSala = 0; });
  sala.addEventListener("passo", (e) => { pergunta = e.detail; colunas(); });

  // ----- Ensaio (modo de demonstração): S simula 5 respostas, 0 apaga -----
  [capa, sala].forEach((c) => c.addEventListener("tecla", (e) => {
    if (!Q.demo()) return;
    if (e.detail.key === "s" || e.detail.key === "S") { Q.simular(P.turma, 5); atualizar(); e.preventDefault(); }
    if (e.detail.key === "0") { Q.limparDemo(); pontos.clear(); atualizar(); e.preventDefault(); }
  }));
  if (Q.demo()) capa.querySelector(".demo").hidden = false;
})();
