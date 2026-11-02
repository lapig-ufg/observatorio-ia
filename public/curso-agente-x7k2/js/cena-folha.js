// "Quatro anos de IA no jornal": cada ponto é uma matéria da Folha que fala
// de IA (coleção do Observatório UFG-IA, 6.986 matérias desde nov/2022). As
// colunas são meses. Por cima, cada traço é um modelo ou ferramenta lançado
// (Panorama da IA). Dados em dados/folha.json e dados/modelos.json, gerados
// por curso-ia/dados-abertura/montar_dados.py.
//
// Passos: 0 nov/2022 · 1 ChatGPT · 2 a chuva até hoje · 3 por tema ·
// 4 os lançamentos · 5 os agentes.

(() => {
  const P = window.PALCO;
  const cena = document.getElementById("folha");
  const canvas = cena.querySelector("canvas.fundo");
  const ctx = canvas.getContext("2d");
  const W = 1600, H = 900;
  const X0 = 110, X1 = 1490, BASE = 770, TOPO = 300;
  const CORES_TEMA = ["#e07a45", "#7fc4a2", "#e8c26a", "#8fb3e0", "#c79bd6", "#5fae7a", "#e59a9a", "#9aa5a0"];
  const AGENTES = new Set(["Claude Code", "Codex", "Cursor 1.0", "Antigravity", "OpenClaw", "Cursor 2.0", "Antigravity 2.0"]);
  const MARCOS = new Set(["ChatGPT (GPT-3.5)", "GPT-4", "Gemini 1.0", "GPT-4o", "DeepSeek-R1", "GPT-5", "Kimi K3", "Claude Opus 5.5"]);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  let dados = null, modelos = [], meses = [], pontos = [], passo = 0;
  let cursor = 0;            // até que mês a chuva já chegou (fracionário)
  let porTema = false, raf = 0, carregando = null;
  // Câmera: nos dois primeiros passos o gráfico aparece ampliado sobre nov/dez de 2022;
  // quando a chuva começa, a câmera recua até mostrar os quatro anos.
  const ZOOM_PERTO = 7;
  let zoom = ZOOM_PERTO;
  const zx = (x) => X0 + (x - X0) * zoom;
  let colW = 0, pitch = 0, raio = 0;

  function ajustar() {
    const d = Math.min(2.5, (devicePixelRatio || 1) * P.escala);
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  document.querySelector(".palco").addEventListener("escala", ajustar);
  ajustar();

  const mesDe = (iso) => { const [a, m] = iso.split("-").map(Number); return (a - 2022) * 12 + (m - 11); }; // nov/2022 = 0
  const xDoMes = (m) => X0 + colW * (m + .5);

  async function carregar() {
    if (dados) return;
    const [f, mo] = await Promise.all([fetch("dados/folha.json").then((r) => r.json()), fetch("dados/modelos.json").then((r) => r.json())]);
    dados = f; modelos = mo;
    const inicio = new Date(f.inicio + "T12:00:00");
    const nMeses = mesDe(f.fim) + 1;
    meses = Array.from({ length: nMeses }, () => []);
    pontos = f.m.map(([dia, tema, titulo]) => {
      const d = new Date(inicio); d.setDate(d.getDate() + dia);
      const m = (d.getFullYear() - 2022) * 12 + d.getMonth() - 10;
      const pt = { m, tema, titulo, data: d, x: 0, y: -10, tx: 0, ty: 0, caiu: false };
      meses[m].push(pt);
      return pt;
    });
    colW = (X1 - X0) / nMeses;
    const maior = Math.max(...meses.map((g) => g.length));
    // O maior passo entre pontos que faz o mês mais cheio caber na altura.
    for (pitch = 14; pitch > 2; pitch -= .1) {
      const porLinha = Math.max(1, Math.floor(colW * .86 / pitch));
      if (Math.ceil(maior / porLinha) * pitch <= BASE - TOPO) break;
    }
    raio = pitch * .36;
    alvos();
    modelos.forEach((mo) => { mo.mes = mesDe(mo.d); mo.dia = +mo.d.slice(8, 10); });
    cena.querySelector(".folha-legenda").innerHTML = dados.temas
      .map((t, i) => `<span><i style="background:${CORES_TEMA[i]}"></i>${t}</span>`).join("");
  }

  function alvos() {
    const porLinha = Math.max(1, Math.floor(colW * .86 / pitch));
    meses.forEach((g, m) => {
      const lista = porTema ? [...g].sort((a, b) => a.tema - b.tema) : g;
      const larg = porLinha * pitch;
      lista.forEach((pt, k) => {
        pt.tx = xDoMes(m) - larg / 2 + (k % porLinha) * pitch + pitch / 2;
        pt.ty = BASE - Math.floor(k / porLinha) * pitch - pitch / 2;
      });
    });
  }

  // ----- Desenho -----
  function eixo() {
    ctx.fillStyle = "rgba(243,239,230,.2)"; ctx.fillRect(X0, BASE + 4, X1 - X0, 1);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let m = 0; m < meses.length; m++) {
      const ano = 2022 + Math.floor((m + 10) / 12), mes = (m + 10) % 12;
      if (mes === 0) { // nov e dez de 2022 ficam sem rótulo: não cabem antes de 2023
        ctx.fillStyle = "rgba(243,239,230,.35)"; ctx.fillRect(X0 + colW * m, BASE + 4, 1, 10);
        ctx.fillStyle = "#b7c6be"; ctx.font = "600 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "left"; ctx.fillText(String(ano), X0 + colW * m + 6, BASE + 16);
      }
    }
  }

  function desenhar() {
    ctx.clearRect(0, 0, W, H);
    if (!dados) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, (3 - zoom) / 2)); // o eixo dos anos só aparece com a câmera longe
    eixo();
    ctx.globalAlpha = 1;
    // Linha do ChatGPT
    if (passo >= 1) {
      const x = zx(X0 + colW * (29 / 30));
      ctx.strokeStyle = "rgba(224,122,69,.85)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, BASE); ctx.lineTo(x, passo >= 4 ? 238 : TOPO - 20); ctx.stroke(); ctx.setLineDash([]);
      if (passo < 3) { // no passo 3 a legenda ocupa esse lugar
        ctx.fillStyle = "#e07a45"; ctx.font = "600 18px Inter, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText("ChatGPT · 30 nov. 2022", x + 8, TOPO - 8);
      }
    }
    if (zoom > 1.5) { // rótulos dos meses enquanto a câmera está perto
      ctx.fillStyle = "#b7c6be"; ctx.font = "600 22px Inter, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("nov 2022", zx(xDoMes(0)), BASE + 16);
      if (passo >= 1) ctx.fillText("dez 2022", zx(xDoMes(1)), BASE + 16);
    }
    // Pontos (em coordenadas do gráfico; a câmera amplia em volta do canto de baixo à esquerda)
    ctx.save(); ctx.translate(X0, BASE); ctx.scale(zoom, zoom); ctx.translate(-X0, -BASE);
    let movendo = false;
    const limite = passo === 0 ? 0 : passo === 1 ? 1 : cursor;
    for (const pt of pontos) {
      if (pt.m > limite) { pt.caiu = false; continue; }
      if (!pt.caiu) { pt.caiu = true; pt.x = pt.tx + (Math.random() - .5) * 8; pt.y = TOPO - 30 - Math.random() * 60; pt.v = 0; }
      const dx = pt.tx - pt.x, dy = pt.ty - pt.y;
      if (Math.abs(dx) > .2 || Math.abs(dy) > .2) {
        pt.v = Math.min(28, (pt.v || 0) + 1.1);
        pt.x += dx * .16; pt.y += Math.sign(dy) * Math.min(Math.abs(dy), pt.v);
        movendo = true;
      } else { pt.x = pt.tx; pt.y = pt.ty; }
      ctx.fillStyle = porTema ? CORES_TEMA[pt.tema] : pt === foco ? "#fff" : "#cfe3d8";
      ctx.globalAlpha = passo >= 5 ? .35 : (porTema ? .95 : .8);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt === foco ? raio * 2 : raio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (passo >= 4) lancamentos();
    return movendo;
  }

  // Faixa dos lançamentos: um traço por modelo, empilhados no mesmo mês.
  function lancamentos() {
    const y0 = 250, porMes = {};
    ctx.textBaseline = "alphabetic";
    for (const mo of modelos) {
      if (mo.mes < 0 || mo.mes >= meses.length) continue;
      const k = porMes[mo.mes] = (porMes[mo.mes] || 0) + 1;
      const x = X0 + colW * (mo.mes + Math.min(.95, mo.dia / 31));
      const agente = AGENTES.has(mo.m);
      const y = y0 - (k - 1) * 6;
      ctx.fillStyle = passo >= 5 ? (agente ? "#e07a45" : "rgba(243,239,230,.18)") : (agente ? "#f3efe6" : "rgba(243,239,230,.7)");
      ctx.fillRect(x - 1, y - 5, agente && passo >= 5 ? 4 : 2, 5);
    }
    // Rótulos: marcos no passo 4, agentes no passo 5. Cada rótulo vai para a
    // primeira das três linhas em que não encosta no anterior. O Cursor fica
    // só no traço: o rótulo dele encostava no do Codex.
    const rotular = passo >= 5 ? modelos.filter((m) => AGENTES.has(m.m) && !/2\.0$|^Cursor/.test(m.m)) : modelos.filter((m) => MARCOS.has(m.m));
    ctx.font = (passo >= 5 ? "600 " : "500 ") + "17px Inter, system-ui, sans-serif";
    const fimDaLinha = [-Infinity, -Infinity, -Infinity];
    rotular.forEach((mo) => {
      const x = X0 + colW * (mo.mes + Math.min(.95, mo.dia / 31));
      const nome = mo.m.replace(" (GPT-3.5)", "");
      const larg = ctx.measureText(nome).width;
      const paraEsquerda = x + 5 + larg > X1 + 60; // perto da borda, o texto vai para o outro lado do traço
      const ini = paraEsquerda ? x - 5 - larg : x + 5;
      let linha = fimDaLinha.findIndex((fim) => ini > fim + 12);
      if (linha < 0) linha = fimDaLinha.indexOf(Math.min(...fimDaLinha));
      fimDaLinha[linha] = paraEsquerda ? x : ini + larg;
      const y = 216 - linha * 24;
      ctx.fillStyle = passo >= 5 ? "#e07a45" : "rgba(243,239,230,.55)";
      ctx.fillRect(x - .5, y + 4, 1, 250 - 6 - y - 4);
      ctx.fillStyle = passo >= 5 ? "#f3efe6" : "#b7c6be";
      ctx.textAlign = paraEsquerda ? "right" : "left";
      ctx.fillText(nome, paraEsquerda ? x - 5 : x + 5, y + 2);
    });
    ctx.textAlign = "left";
  }

  // ----- Animação -----
  let ultimoMes = -1;
  function quadro() {
    if (passo >= 2 && cursor < meses.length - 1) {
      cursor = Math.min(meses.length - 1, cursor + (meses.length / (9 * 60))); // ~9 s até hoje
      const m = Math.floor(cursor);
      if (m !== ultimoMes) { ultimoMes = m; mostrarMes(m); }
    }
    const alvoZoom = passo <= 1 ? ZOOM_PERTO : 1;
    const mudandoZoom = Math.abs(alvoZoom - zoom) > .005;
    zoom = mudandoZoom ? zoom + (alvoZoom - zoom) * .045 : alvoZoom;
    const movendo = desenhar();
    raf = (movendo || mudandoZoom || (passo >= 2 && cursor < meses.length - 1)) ? requestAnimationFrame(quadro) : 0;
  }
  const animar = () => { if (!raf) raf = requestAnimationFrame(quadro); };

  const contador = cena.querySelector(".folha-contador .numero");
  const contadorMes = cena.querySelector(".folha-contador small");
  const manchete = cena.querySelector(".folha-manchete");
  function mostrarMes(m) {
    const total = pontos.filter((p) => p.m <= m).length;
    contador.textContent = total.toLocaleString("pt-BR");
    const ano = 2022 + Math.floor((m + 10) / 12), mes = MESES[(m + 10) % 12];
    contadorMes.textContent = `matérias até ${mes}/${ano}`;
    const g = meses[m];
    if (g?.length) {
      const pt = g[Math.floor(Math.random() * g.length)];
      manchete.innerHTML = `<b>${mes} ${ano}</b>${esc(pt.titulo)}`;
    }
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function aplicar(n) {
    passo = n;
    if (!dados) return;
    if (n <= 1) { cursor = n; ultimoMes = -1; mostrarMes(n); }
    if (n >= 2 && cursor < 1) cursor = 1;
    if (n >= 3 && cursor < meses.length - 1) { cursor = meses.length - 1; mostrarMes(cursor); }
    const tema = n >= 3;
    if (tema !== porTema) { porTema = tema; alvos(); }
    if (n === 3) mostrarMes(meses.length - 1);
    cena.querySelector(".folha-contador").classList.toggle("modelos", n >= 4);
    if (n >= 4) { // nos dois últimos passos o contador passa a contar lançamentos
      contador.textContent = modelos.length;
      contadorMes.textContent = `lançamentos desde 2022 · ${modelos.filter((m) => m.d >= "2026").length} em 2026`;
    }
    animar();
  }

  cena.addEventListener("entrou", async () => {
    if (!dados) { carregando ||= carregar(); await carregando; }
    aplicar(passo); animar();
  });
  cena.addEventListener("saiu", () => { cancelAnimationFrame(raf); raf = 0; });
  cena.addEventListener("passo", (e) => aplicar(e.detail));

  // ----- Passar o mouse: a manchete da matéria -----
  let foco = null;
  const dica = cena.querySelector(".dica-ponto");
  canvas.addEventListener("mousemove", (e) => {
    if (!dados || passo < 2 || zoom > 1.05) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const m = Math.floor((x - X0) / colW);
    let melhor = null, dist = pitch * 1.6;
    for (const pt of meses[m] || []) {
      if (pt.m > cursor) continue;
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d < dist) { dist = d; melhor = pt; }
    }
    if (melhor !== foco) { foco = melhor; desenhar(); }
    if (!foco) { dica.classList.remove("on"); return; }
    dica.innerHTML = `<small>${foco.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} · ${dados.temas[foco.tema]}</small>${esc(foco.titulo)}`;
    dica.style.left = Math.min(W - 480, x + 16) + "px";
    dica.style.top = Math.max(20, y - 110) + "px";
    dica.classList.add("on");
  });
  canvas.addEventListener("mouseleave", () => { foco = null; dica.classList.remove("on"); desenhar(); });

  // Miniatura para a revelação: o gráfico pronto, por tema, num canvas pequeno.
  window.miniaturaFolha = async (c) => {
    if (!dados) { carregando ||= carregar(); await carregando; }
    const r = c.getBoundingClientRect();
    const d = Math.min(2.5, devicePixelRatio || 1);
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    const g = c.getContext("2d");
    const sx = c.width / (X1 - X0 + 40), sy = c.height / (BASE - TOPO + 60);
    const porLinha = Math.max(1, Math.floor(colW * .86 / pitch));
    g.fillStyle = "#0d2b22"; g.fillRect(0, 0, c.width, c.height);
    meses.forEach((grupo, m) => [...grupo].sort((a, b) => a.tema - b.tema).forEach((pt, k) => {
      g.fillStyle = CORES_TEMA[pt.tema];
      const x = (xDoMes(m) - porLinha * pitch / 2 + (k % porLinha) * pitch - X0 + 20) * sx;
      const y = (BASE - Math.floor(k / porLinha) * pitch - TOPO + 30) * sy;
      g.fillRect(x, y, Math.max(1, pitch * .7 * sx), Math.max(1, pitch * .7 * sy));
    }));
  };
})();
