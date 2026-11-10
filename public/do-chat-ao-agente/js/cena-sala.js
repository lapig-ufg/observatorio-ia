// Capa e "a sala em pontos". Cada resposta é um ponto de luz.
// Na capa, os pontos formam uma rede viva (a turma): linhas ligam vizinhos,
// sinais correm pelas linhas e quem acaba de responder aparece com uma
// etiqueta. Na cena seguinte, os mesmos pontos caem em montes, um monte por
// opção, como bolinhas num pote. O brilho vem da pergunta 1: quem usa IA todo
// dia brilha mais.
//
// Quem respondeu "Nunca usei" pulou as perguntas 2 e 3 (valor -1): nelas, esses
// pontos ficam num monte à parte, apagado, em vez de entrar numa opção.
// Desde 09/11/2026 não há código de turma: a tela escolhe as respostas pelo
// período. Abre em "hoje" (o dia da aula); T alterna hoje / últimos 7 dias / todas.

(() => {
  const Q = window.QUESTIONARIO;
  const P = window.PALCO;
  const BRILHO = ["#4b6e60", "#6f9e87", "#8fd0b0", "#c9eedb", "#fff6e3"];
  const pontos = new Map(); // id -> {x, y, vx, vy, f, r, nasceu, etiqueta, casa, monte}
  let linhas = [];
  const PERIODOS = [
    { nome: "hoje", desde: () => new Date().setHours(0, 0, 0, 0) },
    { nome: "últimos 7 dias", desde: () => new Date().setHours(0, 0, 0, 0) - 6 * 864e5 },
    { nome: "todas as respostas", desde: () => 0 },
  ];
  let periodo = 0;

  const visiveis = () => { const d = PERIODOS[periodo].desde(); return linhas.filter((l) => l.t >= d); };

  // ----- Canvas nítido apesar da escala do palco -----
  function preparar(canvas) {
    const ctx = canvas.getContext("2d");
    const ajustar = () => {
      const d = Math.min(2.5, (devicePixelRatio || 1) * P.escala);
      canvas.width = Math.round(P.W * d); canvas.height = Math.round(P.H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    ajustar();
    document.querySelector(".palco").addEventListener("escala", ajustar);
    return ctx;
  }

  function bola(ctx, x, y, r, cor, brilho) {
    if (brilho) { ctx.shadowColor = cor; ctx.shadowBlur = brilho; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill();
    ctx.shadowBlur = 0;
  }

  const etiquetaDe = (r) => {
    const freq = ["nunca usou IA", "já testou", "algumas vezes por mês", "toda semana", "todo dia"][r[0]];
    return r[1] >= 0 ? `${Q.PERGUNTAS[1].opcoes[r[1]]} · ${freq}` : freq;
  };

  async function atualizar() {
    try {
      const l = await Q.listar();
      l.forEach((x, i) => { x._id = `${x.t}|${x.turma}|${i}`; });
      linhas = l.filter((x) => Array.isArray(x.r) && x.r.length === Q.PERGUNTAS.length);
      const vivos = new Set();
      const primeiraLeitura = !pontos.size;
      visiveis().forEach((x) => {
        vivos.add(x._id);
        if (pontos.has(x._id)) return;
        pontos.set(x._id, {
          x: 120 + Math.random() * (P.W - 240), y: P.H + 30, vx: (Math.random() - .5) * 2, vy: -(4 + Math.random() * 3),
          f: x.r[0], r: x.r, nasceu: primeiraLeitura ? -1e9 : performance.now(), etiqueta: etiquetaDe(x.r),
          casa: { x: 140 + Math.random() * (P.W - 280), y: 120 + Math.random() * (P.H - 240) },
        });
      });
      for (const id of [...pontos.keys()]) if (!vivos.has(id)) pontos.delete(id);
      document.dispatchEvent(new CustomEvent("sala-dados", { detail: { total: vivos.size } }));
    } catch (e) {
      console.warn("Levantamento:", e);
    }
  }
  let timer = 0;
  const ligarConsulta = () => { if (!timer) { atualizar(); timer = setInterval(atualizar, 4000); } };

  // ===================== Capa: a rede da turma =====================
  const capa = document.getElementById("capa");
  const ctxCapa = preparar(capa.querySelector("canvas.fundo"));
  // Poeira: pontos fracos que não são pessoas, para a tela já estar viva antes da primeira resposta.
  const poeira = Array.from({ length: 70 }, () => ({ x: Math.random() * 2400, y: Math.random() * 1100, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 }));
  const sinais = []; // {a, b, t}

  // No computador local o QR aponta para o endereço público (o celular não alcança o localhost).
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const destino = new URL("responder.html", local && window.CURSO_PUBLICO ? window.CURSO_PUBLICO : location.href);
  const qr = capa.querySelector(".qr");
  const codigo = qrcode(0, "M");
  codigo.addData(destino.href); codigo.make();
  qr.querySelector("div").innerHTML = codigo.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  qr.querySelector("svg").setAttribute("aria-label", "QR code para responder ao levantamento");
  qr.title = destino.href;
  const mostrarPeriodo = () => { document.querySelectorAll("#capa .turma, #sala .turma").forEach((el) => { el.textContent = PERIODOS[periodo].nome; }); };

  let rafCapa = 0, ultimoSinal = 0;
  function quadroCapa(agora) {
    const W = P.W, H = P.H, ctx = ctxCapa;
    ctx.clearRect(0, 0, W, H);
    const pessoas = [...pontos.values()];
    // Cada pessoa sobe do pé da tela até a sua "casa" e passa a vagar em volta dela.
    const t = agora / 1000;
    for (const pt of pessoas) {
      const ax = pt.casa.x + Math.sin(t * .21 + pt.casa.y) * 50, ay = pt.casa.y + Math.cos(t * .17 + pt.casa.x) * 36;
      pt.vx = (pt.vx + (ax - pt.x) * .0012) * .975; pt.vy = (pt.vy + (ay - pt.y) * .0012) * .975;
      pt.x += pt.vx; pt.y += pt.vy;
    }
    for (const p of poeira) { p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H; }
    // Linhas entre vizinhos (pessoas e poeira)
    const todos = [...pessoas, ...poeira];
    const LIG = 170;
    for (let i = 0; i < todos.length; i++) {
      for (let j = i + 1; j < todos.length; j++) {
        const a = todos[i], b = todos[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > LIG) continue;
        const forte = a.f !== undefined && b.f !== undefined;
        ctx.strokeStyle = `rgba(143,208,176,${(1 - d / LIG) * (forte ? .38 : .1)})`;
        ctx.lineWidth = forte ? 1.2 : .8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // Sinais correndo entre pessoas vizinhas, como numa rede
    if (pessoas.length > 1 && agora - ultimoSinal > 260) {
      ultimoSinal = agora;
      const a = pessoas[Math.floor(Math.random() * pessoas.length)];
      const viz = pessoas.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LIG * 1.4);
      if (viz.length) sinais.push({ a, b: viz[Math.floor(Math.random() * viz.length)], t: 0 });
    }
    for (let k = sinais.length - 1; k >= 0; k--) {
      const s = sinais[k]; s.t += .022;
      if (s.t >= 1) { sinais.splice(k, 1); continue; }
      bola(ctx, s.a.x + (s.b.x - s.a.x) * s.t, s.a.y + (s.b.y - s.a.y) * s.t, 2.6, "#e07a45", 10);
    }
    for (const p of poeira) bola(ctx, p.x, p.y, 1.6, "rgba(243,239,230,.35)");
    for (const pt of pessoas) {
      const idade = (agora - pt.nasceu) / 1000;
      if (idade < 2) { // anel de quem acabou de chegar
        ctx.strokeStyle = `rgba(224,122,69,${1 - idade / 2})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 8 + idade * 34, 0, Math.PI * 2); ctx.stroke();
      }
      bola(ctx, pt.x, pt.y, 7, BRILHO[pt.f] || BRILHO[2], pt.f >= 3 ? 18 : 8);
      if (idade < 5) { // etiqueta com as respostas, que some aos poucos
        ctx.globalAlpha = Math.min(1, (5 - idade) / 1.2) * Math.min(1, idade * 3);
        ctx.font = "600 19px Inter, system-ui, sans-serif";
        const w = ctx.measureText(pt.etiqueta).width + 26;
        const ex = Math.max(20, Math.min(W - w - 20, pt.x + 14)), ey = Math.max(16, pt.y - 46);
        ctx.fillStyle = "rgba(243,239,230,.95)";
        ctx.beginPath(); ctx.roundRect(ex, ey, w, 34, 17); ctx.fill();
        ctx.fillStyle = "#10211b"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
        ctx.fillText(pt.etiqueta, ex + 13, ey + 17);
        ctx.globalAlpha = 1;
      }
    }
    rafCapa = requestAnimationFrame(quadroCapa);
  }
  capa.addEventListener("entrou", () => { ligarConsulta(); if (!rafCapa) rafCapa = requestAnimationFrame(quadroCapa); });
  capa.addEventListener("saiu", () => { cancelAnimationFrame(rafCapa); rafCapa = 0; });

  let totalAnterior = 0;
  document.addEventListener("sala-dados", (e) => {
    const n = e.detail.total;
    const el = capa.querySelector(".contagem b");
    el.textContent = n;
    capa.querySelector(".contagem small").textContent = n === 1 ? "pessoa respondeu" : "pessoas responderam";
    if (n > totalAnterior) { el.classList.remove("pulo"); void el.offsetWidth; el.classList.add("pulo"); }
    totalAnterior = n;
    sala.querySelector(".contagem-sala").textContent = `${n} ${n === 1 ? "pessoa" : "pessoas"} · ${PERIODOS[periodo].nome}`;
    if (sala.classList.contains("ativa")) montes();
  });

  // ===================== A sala: montes de bolinhas =====================
  const sala = document.getElementById("sala");
  const ctxSala = preparar(sala.querySelector("canvas.fundo"));
  let pergunta = 0, grupos = [], raio = 14, realce = [], rafSala = 0;

  // Monta os grupos da pergunta e diz a cada ponto em que monte ele cai.
  function montes() {
    const p = Q.PERGUNTAS[pergunta];
    const lista = visiveis();
    const respondeu = lista.filter((l) => l.r[pergunta] >= 0);
    const pulou = lista.filter((l) => l.r[pergunta] < 0);
    grupos = p.opcoes.map((nome, k) => ({ nome, itens: respondeu.filter((l) => l.r[pergunta] === k) }));
    if (pulou.length) grupos.push({ nome: "Nunca usou IA (pulou esta)", itens: pulou, aparte: true });
    const total = respondeu.length || 1;
    grupos.forEach((g) => { g.pct = g.aparte ? null : Math.round(100 * g.itens.length / total); });
    raio = Math.max(6, Math.min(17, 190 / Math.sqrt(Math.max(1, lista.length))));
    const x0 = 130, x1 = P.W - 130;
    const passo = (x1 - x0) / grupos.length;
    grupos.forEach((g, i) => {
      g.cx = x0 + passo * (i + .5); g.larg = passo * .86;
      g.itens.forEach((l) => { const pt = pontos.get(l._id); if (pt) { pt.monte = g; pt.apagado = !!g.aparte; } });
    });
    realce = []; // sem destaque: a ordem da aula não depende das respostas
    sala.querySelector(".titulo").textContent = p.texto.replace(" Marque o ponto mais distante.", "");
    sala.querySelector(".rotulo.num").textContent = `Pergunta ${pergunta + 1} de ${Q.PERGUNTAS.length}`;
  }

  function quadroSala() {
    const W = P.W, H = P.H, ctx = ctxSala, chao = H - 250;
    const pts = [...pontos.values()].filter((pt) => pt.monte);
    // Física simples: gravidade, mola para o centro do monte, chão, paredes e choque entre bolinhas.
    for (const pt of pts) {
      pt.vy += .55;
      pt.vx += (pt.monte.cx - pt.x) * .004;
      pt.vx *= .9; pt.vy *= .985;
      pt.x += pt.vx; pt.y += pt.vy;
      if (pt.y > chao - raio) { pt.y = chao - raio; pt.vy *= -.25; }
      const meia = pt.monte.larg / 2 - raio;
      if (pt.x < pt.monte.cx - meia) { pt.x = pt.monte.cx - meia; pt.vx *= -.3; }
      if (pt.x > pt.monte.cx + meia) { pt.x = pt.monte.cx + meia; pt.vx *= -.3; }
    }
    const minimo = 2 * raio + 1.5;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          if (a.monte !== b.monte) continue;
          const dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy;
          if (dd >= minimo * minimo || dd === 0) continue;
          const d = Math.sqrt(dd), em = (minimo - d) / 2, nx = dx / d, ny = dy / d;
          a.x -= nx * em; a.y -= ny * em; b.x += nx * em; b.y += ny * em;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { a.vx += nx * rv * .5; a.vy += ny * rv * .5; b.vx -= nx * rv * .5; b.vy -= ny * rv * .5; }
        }
      }
    }
    ctx.clearRect(0, 0, W, H);
    for (const g of grupos) {
      const destacado = realce.includes(g);
      ctx.fillStyle = destacado ? "rgba(224,122,69,.6)" : "rgba(243,239,230,.16)";
      ctx.fillRect(g.cx - g.larg / 2, chao + 3, g.larg, destacado ? 3 : 1.5);
    }
    for (const pt of pts) {
      const destacado = realce.includes(pt.monte);
      ctx.globalAlpha = pt.apagado ? .3 : realce.length && !destacado ? .32 : 1;
      if (destacado) { ctx.strokeStyle = "#e07a45"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pt.x, pt.y, raio + 3, 0, Math.PI * 2); ctx.stroke(); }
      bola(ctx, pt.x, pt.y, raio, BRILHO[pt.f] || BRILHO[2], pt.f >= 3 ? 14 : 5);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const g of grupos) {
      const destacado = realce.includes(g);
      ctx.fillStyle = g.aparte ? "#7d958a" : destacado ? "#e07a45" : "#f3efe6";
      ctx.font = `400 ${g.aparte ? 30 : 48}px Georgia, serif`;
      ctx.fillText(g.aparte ? `${g.itens.length}` : g.itens.length ? `${g.pct}%` : "–", g.cx, chao + 18);
      ctx.fillStyle = g.aparte ? "#7d958a" : "#b7c6be"; ctx.font = "500 21px Inter, system-ui, sans-serif";
      quebrar(ctx, g.nome, g.larg).slice(0, 3).forEach((t, i) => ctx.fillText(t, g.cx, chao + 76 + i * 27));
    }
    rafSala = requestAnimationFrame(quadroSala);
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
  // Ao mudar de pergunta, as bolinhas saltam antes de cair no monte novo.
  const saltar = () => { for (const pt of pontos.values()) { pt.vy = -(10 + Math.random() * 9); pt.vx = (Math.random() - .5) * 8; } };
  sala.addEventListener("entrou", () => { ligarConsulta(); montes(); saltar(); if (!rafSala) rafSala = requestAnimationFrame(quadroSala); });
  sala.addEventListener("saiu", () => { cancelAnimationFrame(rafSala); rafSala = 0; });
  sala.addEventListener("passo", (e) => { if (e.detail !== pergunta) { pergunta = e.detail; montes(); saltar(); } });

  // ----- Teclas: T alterna o período (hoje / 7 dias / todas); no ensaio, S simula 5 respostas e 0 apaga -----
  [capa, sala].forEach((c) => c.addEventListener("tecla", (e) => {
    const k = e.detail.key;
    if (k === "t" || k === "T") { periodo = (periodo + 1) % PERIODOS.length; mostrarPeriodo(); pontos.clear(); atualizar(); e.preventDefault(); return; }
    if (!Q.demo()) return;
    if (k === "s" || k === "S") { Q.simular(P.turma, 5); atualizar(); e.preventDefault(); }
    if (k === "0") { Q.limparDemo(); pontos.clear(); atualizar(); e.preventDefault(); }
  }));
  if (Q.demo()) capa.querySelector(".demo").hidden = false;
  // O céu de pontos da capa, sem as pessoas: a poeira e as linhas fracas,
  // reaproveitadas no obrigado do fim do curso.
  window.criarCeuDePontos = function (canvas) {
    const ctx = preparar(canvas);
    const poeira = Array.from({ length: 90 }, () => ({
      x: Math.random() * P.W, y: Math.random() * P.H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
    }));
    let raf = 0;
    function quadro(agora) {
      const W = P.W, H = P.H, t = agora / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of poeira) {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
      }
      const LIG = 190;
      for (let i = 0; i < poeira.length; i++) {
        for (let j = i + 1; j < poeira.length; j++) {
          const a = poeira[i], b = poeira[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LIG) continue;
          ctx.strokeStyle = `rgba(143, 208, 176, ${((1 - d / LIG) * .12).toFixed(3)})`;
          ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const p of poeira) {
        const brilho = .28 + .12 * Math.sin(t * .8 + p.x * .01 + p.y * .013);
        bola(ctx, p.x, p.y, 1.7, `rgba(243, 239, 230, ${brilho.toFixed(3)})`);
      }
      raf = requestAnimationFrame(quadro);
    }
    return {
      ligar() { if (!raf) raf = requestAnimationFrame(quadro); },
      desligar() { cancelAnimationFrame(raf); raf = 0; },
    };
  };
})();
