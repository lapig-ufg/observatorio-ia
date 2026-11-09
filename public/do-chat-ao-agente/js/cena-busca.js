// "O que o jornal noticia e o que o Brasil procura": duas faixas com a mesma
// linha do tempo (nov/2022 a out/2026). Em cima, por mês, quantos textos da
// Folha citam o termo (busca do site, sem curadoria). Embaixo, a procura no
// Google Trends (Brasil). Dados em dados/busca.json, gerados por
// curso-ia/dados-abertura/montar_busca.py.
//
// Passos: 0 o jornal cresce · 1 a procura por "inteligência artificial" parou ·
// 2 na mesma régua, o ChatGPT · 3 Gemini, Claude e DeepSeek · 4 os agentes.

(() => {
  const P = window.PALCO;
  const cena = document.getElementById("busca");
  const canvas = cena.querySelector("canvas.fundo");
  const ctx = canvas.getContext("2d");
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const COR = { // conferidas com o validador de paleta (modo escuro, fundo #0d2b22)
    chatgpt: "#10a37f", gemini: "#4a84e8", claude: "#d0704f", deepseek: "#8a78e6", agentes: "#b08a22",
    creme: "#f3efe6", creme2: "#b7c6be", creme3: "#7d958a", linha: "rgba(243, 239, 230, .12)",
  };
  const NOME = { chatgpt: "ChatGPT", gemini: "Gemini", claude: "Claude", deepseek: "DeepSeek", agentes: "Agentes" };
  const X0 = 110;
  let W = 1600, H = 900, X1 = 1490, colW = 0;
  // Faixas: jornal (barras) e busca (linhas).
  let TJ = 300, BJ = 520, TB = 600, BB = 790;

  let d = null, n = 0, carregando = null, raf = 0, passo = 0;
  // Tudo o que anima vai de `v` até `alvo`, suavemente.
  const anim = {
    cursor: { v: 0, alvo: 0 },       // até que mês as barras já subiram
    busca: { v: 0, alvo: 0 },        // a faixa de baixo aparece
    regua: { v: 0, alvo: 0 },        // 0 = "inteligência artificial" na régua própria; 1 = régua do ChatGPT
    chatgpt: { v: 0, alvo: 0 }, outras: { v: 0, alvo: 0 }, agentes: { v: 0, alvo: 0 },
    marcas: { v: 0, alvo: 0 },       // barras das marcas por cima das do jornal
    eventos: { v: 0, alvo: 0 },
    ferias: { v: 0, alvo: 0 },     // faixas de julho e dezembro
  };
  const VEL = { cursor: .045 };

  function ajustar() {
    const k = Math.min(2.5, (devicePixelRatio || 1) * P.escala);
    canvas.width = Math.round(P.W * k); canvas.height = Math.round(P.H * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    geometria();
    if (d) desenhar();
  }
  function geometria() {
    W = P.W; H = P.H; X1 = W - 250; // à direita, o nome de cada linha
    TJ = 300; BJ = Math.round(TJ + (H - 300) * .38);
    TB = BJ + 92; BB = H - 112;
    if (d) colW = (X1 - X0) / n;
  }
  document.querySelector(".palco").addEventListener("escala", ajustar);
  ajustar();

  async function carregar() {
    if (d) return;
    d = await fetch("dados/busca.json").then((r) => r.json());
    n = d.meses.length;
    // Agentes na busca: soma de "agente de IA", "Claude Code" e "Antigravity" (todos perto de zero).
    // "inteligência artificial" sozinha: 100 = mês de maior procura (a média mensal do Trends não chega a 100).
    const pico = Math.max(...d.busca.ia_propria);
    d.busca.ia_propria = d.busca.ia_propria.map((v) => +(v / pico * 100).toFixed(1));
    d.busca.agentes = d.busca.agente.map((v, i) => +(v + d.busca.claude_code[i] + d.busca.antigravity[i]).toFixed(1));
    geometria();
  }

  const xm = (i) => X0 + colW * (i + .5);
  const rotMes = (i) => { const [a, m] = d.meses[i].split("-"); return `${MESES[+m - 1]}/${a}`; };
  const MAXJ = () => Math.max(...d.jornal.ia);
  const yj = (v) => BJ - (v / MAXJ()) * (BJ - TJ);
  const yb = (v) => BB - (v / 100) * (BB - TB);

  // ---------- Desenho ----------
  function desenhar() {
    ctx.clearRect(0, 0, W, H);
    if (!d) return;
    faixaJornal();
    if (anim.busca.v > .01) faixaBusca();
    eixoTempo();
    if (anim.eventos.v > .01) eventos();
    if (foco !== null) marcarMes(foco);
  }

  function rotuloFaixa(txt, sub, y, alfa = 1) {
    ctx.globalAlpha = alfa;
    ctx.font = "600 15px Inter, sans-serif"; ctx.fillStyle = COR.creme2; ctx.textBaseline = "alphabetic";
    ctx.save(); ctx.letterSpacing = "2px"; ctx.fillText(txt, X0, y); ctx.restore();
    const w = ctx.measureText(txt).width + txt.length * 2;
    ctx.font = "400 15px Inter, sans-serif"; ctx.fillStyle = COR.creme3;
    ctx.fillText(sub, X0 + w + 14, y);
    ctx.globalAlpha = 1;
  }

  function grade(valores, y, fmt) {
    ctx.font = "400 13px Inter, sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const v of valores) {
      const yy = y(v);
      ctx.strokeStyle = COR.linha; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(X1, yy); ctx.stroke();
      ctx.fillStyle = COR.creme3; ctx.fillText(fmt(v), X0 - 10, yy);
    }
    ctx.textAlign = "left";
  }

  function faixaJornal() {
    rotuloFaixa("NO JORNAL", "textos da Folha que citam o termo, por mês", TJ - 52);
    grade([200, 400, 600], yj, (v) => v);
    const cur = anim.cursor.v, larg = Math.max(2, colW - 3);
    const apagar = 1 - .62 * Math.max(anim.marcas.v, anim.agentes.v);
    for (let i = 0; i < n; i++) {
      const parte = Math.max(0, Math.min(1, cur - i));
      if (!parte) break;
      const h = (BJ - yj(d.jornal.ia[i])) * (1 - Math.pow(1 - parte, 3));
      ctx.globalAlpha = apagar * (i >= n - 2 ? .55 : 1); // set e out/2026 incluem o site C-Level
      barra(xm(i) - larg / 2, BJ - h, larg, h, foco === i ? "#ffffff" : COR.creme);
    }
    ctx.globalAlpha = 1;
    // As marcas, empilhadas na frente: ChatGPT (passo 2) e depois as outras (passo 3).
    const camadas = [["chatgpt", anim.marcas.v * anim.chatgpt.v], ["gemini", anim.marcas.v * anim.outras.v],
      ["anthropic", anim.marcas.v * anim.outras.v], ["deepseek", anim.marcas.v * anim.outras.v], ["agentes", anim.agentes.v]];
    const base = new Array(n).fill(BJ);
    for (const [k, a] of camadas) {
      if (a < .01) continue;
      const cor = COR[k === "anthropic" ? "claude" : k];
      ctx.globalAlpha = a;
      for (let i = 0; i < Math.min(n, Math.ceil(cur)); i++) {
        const h = BJ - yj(d.jornal[k][i]);
        if (h < .5) continue;
        barra(xm(i) - larg / 2, base[i] - h, larg, h - (base[i] < BJ ? 2 : 0), cor);
        base[i] -= h;
      }
    }
    ctx.globalAlpha = 1;
    // O C-Level entra na busca da Folha em 15/09/2026 (infla set e out/2026). Aviso na margem direita.
    if (cur > n - 1.5) {
      const x = X0 + colW * (n - 2) + colW * .47;
      ctx.strokeStyle = COR.creme3; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, BJ); ctx.lineTo(x, BJ + 8); ctx.lineTo(X1 + 8, BJ + 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "400 13px Inter, sans-serif"; ctx.fillStyle = COR.creme3; ctx.textBaseline = "alphabetic";
      ["Desde 15/09/2026 a busca", "da Folha inclui o site", "C-Level: infla set e out."].forEach((t, k) => ctx.fillText(t, X1 + 14, BJ - 34 + k * 17));
    }
  }

  // Barra com a ponta de cima arredondada (4 px), presa na base.
  function barra(x, y, w, h, cor) {
    const r = Math.min(4, w / 2, h);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h);
    ctx.closePath(); ctx.fill();
  }

  function faixaBusca() {
    const a = anim.busca.v;
    const reguaPropria = anim.regua.v < .5;
    rotuloFaixa("NA BUSCA DO GOOGLE", reguaPropria ? "Brasil · 100 = mês de maior procura pelo termo (jul/2023)"
      : "Brasil · mesma régua para todos: 100 = semana de maior procura pelo ChatGPT", TB - 34, a);
    ctx.globalAlpha = a;
    grade([50, 100], yb, (v) => v);
    // Passo 2: julho e dezembro (férias) em faixas claras.
    const ferias = anim.ferias.v;
    if (ferias > .01) {
      ctx.globalAlpha = ferias * .5; ctx.fillStyle = "rgba(243, 239, 230, .1)";
      d.meses.forEach((m, i) => { if (m.endsWith("-07") || m.endsWith("-12")) ctx.fillRect(X0 + colW * i, TB - 6, colW, BB - TB + 6); });
      ctx.globalAlpha = ferias; ctx.font = "400 12px Inter, sans-serif"; ctx.fillStyle = COR.creme3; ctx.textAlign = "center";
      d.meses.forEach((m, i) => { if (m === "2024-07" || m === "2024-12") ctx.fillText(m.endsWith("07") ? "jul" : "dez", xm(i), TB - 10); });
      ctx.textAlign = "left";
    }
    ctx.globalAlpha = a;
    ctx.globalAlpha = 1;
    const fim = [];
    // "inteligência artificial": da régua própria para a régua do ChatGPT (cai para o chão).
    const ia = d.busca.ia_propria.map((v, i) => v + (d.busca.ia[i] - v) * anim.regua.v);
    const apagado = 1 - .7 * anim.agentes.v;
    linha(ia, COR.creme2, a * (1 - .45 * anim.regua.v) * apagado, 1, 2.5);
    fim.push({ txt: "“inteligência artificial”", cor: COR.creme2, y: yb(ia[n - 1]), a: a * apagado });
    for (const [k, prog] of [["chatgpt", anim.chatgpt.v], ["gemini", anim.outras.v], ["claude", anim.outras.v], ["deepseek", anim.outras.v], ["agentes", anim.agentes.v]]) {
      if (prog < .01) continue;
      const alfa = k === "agentes" ? 1 : apagado;
      linha(d.busca[k], COR[k], alfa, prog, k === "agentes" ? 3.5 : 2.5);
      if (prog > .98) fim.push({ txt: NOME[k], cor: COR[k], y: yb(d.busca[k][n - 1]), a: alfa });
    }
    rotulosFinais(fim);
  }

  // Linha que se desenha da esquerda para a direita (prog de 0 a 1).
  function linha(vals, cor, alfa, prog, larg) {
    const ate = prog * (n - 1);
    ctx.globalAlpha = alfa; ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(xm(0), yb(vals[0]));
    const inteiro = Math.floor(ate);
    for (let i = 1; i <= inteiro; i++) ctx.lineTo(xm(i), yb(vals[i]));
    const resto = ate - inteiro; // o pedaço do mês que ainda está sendo desenhado
    if (resto > 0) ctx.lineTo(xm(inteiro) + colW * resto, yb(vals[inteiro] + (vals[inteiro + 1] - vals[inteiro]) * resto));
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  // Nomes no fim de cada linha, afastados para não encostar.
  function rotulosFinais(lista) {
    lista.sort((a, b) => a.y - b.y);
    for (let i = 1; i < lista.length; i++) lista[i].y = Math.max(lista[i].y, lista[i - 1].y + 20);
    const sobra = lista.length ? lista[lista.length - 1].y - (BB + 4) : 0;
    if (sobra > 0) lista.forEach((r) => (r.y -= sobra));
    ctx.font = "600 15px Inter, sans-serif"; ctx.textBaseline = "middle";
    for (const r of lista) {
      ctx.globalAlpha = r.a; ctx.fillStyle = r.cor;
      ctx.fillRect(X1 + 10, r.y - 1, 8, 2);
      ctx.fillStyle = COR.creme; ctx.fillText(r.txt, X1 + 24, r.y);
    }
    ctx.globalAlpha = 1;
  }

  function eixoTempo() {
    ctx.font = "400 14px Inter, sans-serif"; ctx.fillStyle = COR.creme3; ctx.textBaseline = "top"; ctx.textAlign = "center";
    const y = (anim.busca.v > .5 ? BB : BJ) + 12;
    d.meses.forEach((m, i) => {
      if (i === 0) ctx.fillText("nov/2022", xm(i), y);
      else if (m.endsWith("-01") && i > 3) ctx.fillText(m.slice(0, 4), X0 + colW * i, y);
    });
    ctx.fillText("out/2026", xm(n - 1), y);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // Passos 3 e 4: pontos numerados no gráfico; o texto de cada um fica no quadro .busca-notas.
  const NOTAS = {
    2: [
      { cor: "chatgpt", mes: "2025-12", faixa: "b", serie: "chatgpt", titulo: "Férias", txt: "Os vales de julho e dezembro são as férias: todo dezembro, a procura pelo ChatGPT cai cerca de 30%." },
    ],
    3: [
      { cor: "deepseek", mes: "2025-01", faixa: "j", serie: "ia", titulo: "DeepSeek", txt: "56 textos na Folha em jan/2025. No Google, só um pico de uma semana." },
      { cor: "gemini", mes: "2025-09", faixa: "b", serie: "gemini", titulo: "Gemini", txt: "Em set/2025 a procura quadruplica (13 → 52) e não volta mais ao que era. No jornal, quase nada muda." },
      { cor: "claude", mes: "2026-03", faixa: "b", serie: "claude", titulo: "Claude", txt: "De jan a ago/2026, procura ×7 e textos sobre a Anthropic ×5. A busca salta em mar/2026, na disputa com o Pentágono." },
    ],
    4: [
      { cor: "agentes", mes: "2026-08", faixa: "j", serie: "agentes", titulo: "No jornal", txt: "“agente(s) de IA”: no máximo 7 textos por mês até jan/2026; 24 em ago/2026, antes do C-Level." },
      { cor: "agentes", mes: "2026-03", faixa: "b", serie: "agentes", titulo: "Na busca", txt: "“agente de IA”, Claude Code e Antigravity juntos: no máximo 3 (ChatGPT = 100)." },
    ],
  };
  const quadroNotas = cena.querySelector(".busca-notas");
  function mostrarNotas(k) {
    const lista = NOTAS[k] || [];
    quadroNotas.classList.toggle("on", lista.length > 0);
    if (lista.length) quadroNotas.innerHTML = lista.map((nt, i) =>
      `<p><i style="background:${COR[nt.cor]}">${i + 1}</i><b>${nt.titulo}</b> · ${nt.txt}</p>`).join("");
  }
  function eventos() {
    const lista = NOTAS[passo];
    if (!lista) return;
    ctx.globalAlpha = anim.eventos.v;
    ctx.font = "700 14px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lista.forEach((nt, k) => {
      const i = d.meses.indexOf(nt.mes);
      const y = nt.faixa === "j" ? yj(d.jornal[nt.serie][i]) - 18 : yb(d.busca[nt.serie][i]) - 18;
      ctx.fillStyle = COR[nt.cor]; ctx.strokeStyle = "#0d2b22"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(xm(i), y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillText(k + 1, xm(i), y + 1);
    });
    ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function marcarMes(i) {
    ctx.strokeStyle = "rgba(243, 239, 230, .35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xm(i), TJ - 10); ctx.lineTo(xm(i), anim.busca.v > .5 ? BB : BJ); ctx.stroke();
  }

  // ---------- Animação ----------
  function quadro() {
    let mexe = false;
    for (const [k, s] of Object.entries(anim)) {
      const dif = s.alvo - s.v;
      if (Math.abs(dif) < .002) { s.v = s.alvo; continue; }
      if (k === "cursor") s.v = dif > 0 ? Math.min(s.alvo, s.v + Math.max(.18, dif * VEL.cursor)) : s.alvo;
      else s.v += dif * .07;
      mexe = true;
    }
    if (passo === 0) contar();
    desenhar();
    raf = mexe ? requestAnimationFrame(quadro) : 0;
  }
  const animar = () => { if (!raf) raf = requestAnimationFrame(quadro); };

  const numero = cena.querySelector(".busca-contador .numero"), legenda = cena.querySelector(".busca-contador small");
  // O contador para em ago/2026: set e out incluem o site C-Level e inflam a comparação com 2022.
  const fimContador = () => { const i = d.meses.indexOf("2026-08"); return i >= 0 ? i : n - 3; };
  function contar() {
    const i = Math.max(0, Math.min(fimContador(), Math.ceil(anim.cursor.v) - 1));
    numero.textContent = d.jornal.ia[i].toLocaleString("pt-BR");
    legenda.textContent = `textos em ${rotMes(i)}`;
  }

  function aplicar(k) {
    passo = k;
    if (!d) return;
    const alvos = {
      cursor: n, busca: k >= 1 ? 1 : 0, regua: k >= 2 ? 1 : 0, chatgpt: k >= 2 ? 1 : 0,
      outras: k >= 3 ? 1 : 0, marcas: k >= 2 && k < 4 ? 1 : 0, eventos: k >= 2 ? 1 : 0, agentes: k >= 4 ? 1 : 0, ferias: k === 2 ? 1 : 0,
    };
    for (const [nome, v] of Object.entries(alvos)) anim[nome].alvo = v;
    if (NOTAS[k]) anim.eventos.v = 0; // os números entram de novo a cada passo
    mostrarNotas(k);
    if (k > 0) { anim.cursor.v = n; numero.textContent = d.jornal.ia[fimContador()].toLocaleString("pt-BR"); legenda.textContent = `textos em ${rotMes(fimContador())}`; }
    animar();
  }

  cena.addEventListener("entrou", async () => {
    if (!d) { carregando ||= carregar(); await carregando; }
    if (passo === 0) anim.cursor.v = 0; // ao entrar, as barras sobem de novo
    aplicar(passo);
  });
  cena.addEventListener("saiu", () => { cancelAnimationFrame(raf); raf = 0; });
  cena.addEventListener("passo", (e) => aplicar(e.detail));

  // ---------- Passar o mouse: os números do mês ----------
  let foco = null;
  const dica = cena.querySelector(".dica-ponto");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  canvas.addEventListener("mousemove", (e) => {
    if (!d) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const i = Math.floor((x - X0) / colW);
    if (i < 0 || i >= n || y < TJ - 30 || y > BB + 10) { if (foco !== null) { foco = null; dica.classList.remove("on"); desenhar(); } return; }
    if (i !== foco) { foco = i; desenhar(); }
    const j = d.jornal, b = Object.fromEntries(Object.entries(d.busca).map(([k, v]) => [k, v.map((x) => x.toLocaleString("pt-BR"))]));
    const linhas = [`<b>${j.ia[i]}</b> textos citam “inteligência artificial”`];
    if (passo >= 2 && passo < 4) linhas.push(`ChatGPT: ${j.chatgpt[i]} no jornal · busca ${b.chatgpt[i]}`);
    if (passo === 3) linhas.push(`Gemini: ${j.gemini[i]} · busca ${b.gemini[i]}`, `Anthropic/Claude: ${j.anthropic[i]} · busca ${b.claude[i]}`, `DeepSeek: ${j.deepseek[i]} · busca ${b.deepseek[i]}`);
    if (passo >= 4) linhas.push(`Agentes de IA: ${j.agentes[i]} no jornal · busca ${b.agentes[i]}`);
    if (passo === 1) linhas.push(`Procura por “inteligência artificial”: ${b.ia_propria[i]}`);
    dica.innerHTML = `<small>${esc(rotMes(i))}</small>${linhas.join("<br>")}`;
    dica.style.left = Math.min(W - 480, x + 16) + "px";
    dica.style.top = Math.max(20, y - 150) + "px";
    dica.classList.add("on");
  });
  canvas.addEventListener("mouseleave", () => { foco = null; dica.classList.remove("on"); desenhar(); });

  // ---------- Miniatura para a revelação ----------
  window.miniaturaBusca = async (c) => {
    if (!d) { carregando ||= carregar(); await carregando; }
    const r = c.getBoundingClientRect();
    const k = Math.min(2.5, devicePixelRatio || 1);
    c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
    const g = c.getContext("2d"), w = c.width, h = c.height, m = w * .06;
    g.fillStyle = "#0d2b22"; g.fillRect(0, 0, w, h);
    const cw = (w - 2 * m) / n, max = MAXJ();
    d.jornal.ia.forEach((v, i) => { g.fillStyle = "rgba(243, 239, 230, .75)"; const bh = v / max * h * .38; g.fillRect(m + i * cw + 1, h * .46 - bh, cw - 2, bh); });
    for (const key of ["chatgpt", "gemini", "claude"]) {
      g.strokeStyle = COR[key]; g.lineWidth = 2 * k; g.beginPath();
      d.busca[key].forEach((v, i) => { const x = m + (i + .5) * cw, y = h * .92 - v / 100 * h * .38; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
  };
})();
