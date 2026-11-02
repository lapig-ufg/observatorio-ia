// "Quatro anos de IA no jornal": cada ponto é uma matéria da Folha que fala
// de IA (coleção do Observatório UFG-IA, 6.986 matérias desde nov/2022). As
// colunas são meses. Nos dois últimos passos as colunas encolhem e, por cima,
// cada selo é um modelo ou ferramenta lançado (Panorama da IA), com a cor e o
// logo da empresa. Dados em dados/folha.json, dados/modelos.json e
// dados/empresas.json, gerados por curso-ia/dados-abertura/montar_dados.py.
//
// Passos: 0 nov/2022 · 1 ChatGPT · 2 a chuva até hoje · 3 por tema ·
// 4 os lançamentos · 5 os agentes.

(() => {
  const P = window.PALCO;
  const cena = document.getElementById("folha");
  const canvas = cena.querySelector("canvas.fundo");
  const ctx = canvas.getContext("2d");
  const X0 = 110, TOPO = 300;
  const CORES_TEMA = ["#e07a45", "#7fc4a2", "#e8c26a", "#8fb3e0", "#c79bd6", "#5fae7a", "#e59a9a", "#9aa5a0"];
  // Ferramentas que põem a IA para trabalhar no computador (os "agentes" do curso).
  const AGENTES = new Set(["Claude Code", "Codex", "Cursor 1.0", "Antigravity", "OpenClaw", "Cursor 2.0", "Antigravity 2.0"]);
  const MARCOS = new Set(["ChatGPT (GPT-3.5)", "GPT-4", "Gemini 1.0", "GPT-4o", "DeepSeek-R1", "GPT-5", "Kimi K3", "Claude Opus 5.5"]);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const ENCOLHIDO = .4; // altura das colunas quando os selos entram

  let dados = null, modelos = [], empresas = {}, meses = [], pontos = [], passo = 0;
  let cursor = 0;            // até que mês a chuva já chegou (fracionário)
  let porTema = false, raf = 0, carregando = null;
  // Câmera: nos dois primeiros passos o gráfico aparece ampliado sobre nov/dez de 2022;
  // quando a chuva começa, a câmera recua até mostrar os quatro anos.
  const ZOOM_PERTO = 7;
  let zoom = ZOOM_PERTO, altura = 1, inicioSelos = 0;
  let W = 1600, H = 900, X1 = 1490, BASE = 770, colW = 0, pitch = 0, raio = 0, rSelo = 10;
  const zx = (x) => X0 + (x - X0) * zoom;

  function ajustar() {
    const d = Math.min(2.5, (devicePixelRatio || 1) * P.escala);
    canvas.width = Math.round(P.W * d); canvas.height = Math.round(P.H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (dados) { geometria(); desenhar(); }
  }
  document.querySelector(".palco").addEventListener("escala", ajustar);
  ajustar();

  const mesDe = (iso) => { const [a, m] = iso.split("-").map(Number); return (a - 2022) * 12 + (m - 11); }; // nov/2022 = 0
  const xDoMes = (m) => X0 + colW * (m + .5);

  async function carregar() {
    if (dados) return;
    const [f, mo, em] = await Promise.all(["folha", "modelos", "empresas"].map((n) => fetch(`dados/${n}.json`).then((r) => r.json())));
    dados = f; modelos = mo; empresas = em;
    const inicio = new Date(f.inicio + "T12:00:00");
    meses = Array.from({ length: mesDe(f.fim) + 1 }, () => []);
    pontos = f.m.map(([dia, tema, titulo]) => {
      const d = new Date(inicio); d.setDate(d.getDate() + dia);
      const m = (d.getFullYear() - 2022) * 12 + d.getMonth() - 10;
      const pt = { m, tema, titulo, data: d, x: 0, y: -10, tx: 0, ty: 0, caiu: false };
      meses[m].push(pt);
      return pt;
    });
    // Logos: caminhos SVG de 24×24 viram Path2D para desenhar no canvas.
    for (const e of Object.values(empresas)) e.caminhos = e.logo.map((d) => new Path2D(d));
    modelos = modelos.filter((mo) => mesDe(mo.d) >= 0 && mesDe(mo.d) < meses.length);
    modelos.forEach((mo, i) => { mo.mes = mesDe(mo.d); mo.ordem = i; });
    cena.querySelector(".folha-legenda").innerHTML = dados.temas
      .map((t, i) => `<span><i style="background:${CORES_TEMA[i]}"></i>${t}</span>`).join("");
    geometria();
  }

  // Tudo o que depende do tamanho do palco.
  function geometria() {
    W = P.W; H = P.H; X1 = W - 110; BASE = H - 130;
    colW = (X1 - X0) / meses.length;
    const maior = Math.max(...meses.map((g) => g.length));
    // O maior passo entre pontos que faz o mês mais cheio caber na altura.
    for (pitch = 14; pitch > 2; pitch -= .1) {
      const porLinha = Math.max(1, Math.floor(colW * .86 / pitch));
      if (Math.ceil(maior / porLinha) * pitch <= BASE - TOPO) break;
    }
    raio = pitch * .36;
    alvos();
    // Selos dos lançamentos: empilhados por mês, logo acima das colunas encolhidas.
    rSelo = Math.min(11, colW * .4);
    const chao = BASE - (BASE - TOPO) * ENCOLHIDO - rSelo - 14;
    const porMes = {};
    modelos.forEach((mo) => {
      const k = porMes[mo.mes] = (porMes[mo.mes] ?? -1) + 1;
      mo.x = xDoMes(mo.mes); mo.y = chao - k * (2 * rSelo + 3);
    });
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
    ctx.textBaseline = "top";
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
    if (!dados) return false;
    ctx.globalAlpha = Math.max(0, Math.min(1, (3 - zoom) / 2)); // o eixo dos anos só aparece com a câmera longe
    eixo();
    ctx.globalAlpha = 1;
    // Linha do ChatGPT
    if (passo >= 1 && passo < 4) {
      const x = zx(X0 + colW * (29 / 30));
      ctx.strokeStyle = "rgba(224,122,69,.85)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, BASE); ctx.lineTo(x, TOPO - 20); ctx.stroke(); ctx.setLineDash([]);
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
    const r = raio * Math.max(.6, Math.sqrt(altura));
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
      ctx.globalAlpha = passo >= 4 ? .45 : (porTema ? .95 : .8);
      ctx.beginPath(); ctx.arc(pt.x, BASE + (pt.y - BASE) * altura, pt === foco ? r * 2 : r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (passo >= 4) movendo = selos() || movendo;
    return movendo;
  }

  // Um selo por lançamento: círculo na cor da empresa com o logo em branco.
  // Entram um a um, da esquerda para a direita. No passo 5, os agentes crescem e o resto apaga.
  function selos() {
    const t = performance.now() - inicioSelos;
    let entrando = false;
    for (const mo of modelos) {
      const idade = t - mo.ordem * 22;
      if (idade <= 0) { entrando = true; continue; }
      const e = empresas[mo.e] || { cor: "#7d958a", caminhos: [] };
      const agente = AGENTES.has(mo.m);
      const s = Math.min(1, idade / 260); if (s < 1) entrando = true;
      const pop = s < 1 ? 1 + Math.sin(s * Math.PI) * .35 : 1; // cresce um pouco ao entrar
      const r = rSelo * pop * (passo >= 5 && agente ? 1.35 : 1);
      ctx.globalAlpha = passo >= 5 && !agente ? .22 : 1;
      if (passo >= 5 && agente) { ctx.shadowColor = "#e07a45"; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.arc(mo.x, mo.y, r, 0, Math.PI * 2);
      ctx.fillStyle = e.cor; ctx.fill(); ctx.shadowBlur = 0;
      ctx.lineWidth = passo >= 5 && agente ? 3 : 1;
      ctx.strokeStyle = passo >= 5 && agente ? "#e07a45" : "rgba(243,239,230,.35)"; ctx.stroke();
      if (e.caminhos.length) {
        ctx.save(); ctx.translate(mo.x - r * .6, mo.y - r * .6); ctx.scale(r * 1.2 / 24, r * 1.2 / 24);
        ctx.fillStyle = "#fff"; e.caminhos.forEach((c) => ctx.fill(c, e.parimpar ? "evenodd" : "nonzero"));
        ctx.restore();
      } else {
        ctx.fillStyle = "#fff"; ctx.font = `700 ${r}px Inter, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(mo.e[0], mo.x, mo.y + 1);
      }
    }
    ctx.globalAlpha = 1;
    if (!entrando) rotulos(passo >= 5 ? modelos.filter((m) => AGENTES.has(m.m) && !/2\.0$/.test(m.m)) : modelos.filter((m) => MARCOS.has(m.m)));
    return entrando;
  }

  // Rótulos acima de cada pilha; se encostar num rótulo já posto, sobe.
  function rotulos(lista) {
    const postos = [];
    const pilhaTopo = {};
    modelos.forEach((mo) => { pilhaTopo[mo.mes] = Math.min(pilhaTopo[mo.mes] ?? Infinity, mo.y); });
    ctx.font = (passo >= 5 ? "600 " : "500 ") + "18px Inter, system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    for (const mo of lista) {
      const nome = mo.m.replace(" (GPT-3.5)", "");
      const larg = ctx.measureText(nome).width;
      const x = Math.min(X1 + 40 - larg / 2, Math.max(X0 + larg / 2, mo.x));
      let y = pilhaTopo[mo.mes] - rSelo - 14;
      const bate = (yy) => postos.some((p) => Math.abs(p.x - x) < (p.larg + larg) / 2 + 10 && Math.abs(p.y - yy) < 24);
      for (let k = 0; k < 8 && bate(y); k++) y -= 26;
      postos.push({ x, y, larg });
      ctx.strokeStyle = passo >= 5 ? "rgba(224,122,69,.7)" : "rgba(243,239,230,.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mo.x, mo.y - rSelo); ctx.lineTo(mo.x, y + 6); ctx.stroke();
      ctx.fillStyle = passo >= 5 ? "#f3efe6" : "#d5e0da"; ctx.textAlign = "center";
      ctx.fillText(nome, x, y);
    }
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
    const alvoAltura = passo >= 4 ? ENCOLHIDO : 1;
    const mudandoAltura = Math.abs(alvoAltura - altura) > .003;
    altura = mudandoAltura ? altura + (alvoAltura - altura) * .07 : alvoAltura;
    const movendo = desenhar();
    raf = (movendo || mudandoZoom || mudandoAltura || (passo >= 2 && cursor < meses.length - 1)) ? requestAnimationFrame(quadro) : 0;
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
    const antes = passo;
    passo = n;
    if (!dados) return;
    if (n <= 1) { cursor = n; ultimoMes = -1; mostrarMes(n); }
    if (n >= 2 && cursor < 1) cursor = 1;
    if (n >= 3 && cursor < meses.length - 1) { cursor = meses.length - 1; mostrarMes(cursor); }
    const tema = n >= 3;
    if (tema !== porTema) { porTema = tema; alvos(); }
    if (n === 3) mostrarMes(meses.length - 1);
    if (n === 4 && antes !== 5) inicioSelos = performance.now(); // voltando do 5, os selos já estão lá
    cena.querySelector(".folha-contador").classList.toggle("modelos", n >= 4);
    if (n >= 4) { // nos dois últimos passos o contador passa a contar lançamentos
      contador.textContent = modelos.length;
      contadorMes.textContent = `lançamentos desde 2022 · ${modelos.filter((m) => m.d >= "2026").length} em 2026`;
    }
    animar();
  }

  cena.addEventListener("entrou", async () => {
    if (!dados) { carregando ||= carregar(); await carregando; }
    inicioSelos = performance.now();
    aplicar(passo); animar();
  });
  cena.addEventListener("saiu", () => { cancelAnimationFrame(raf); raf = 0; });
  cena.addEventListener("passo", (e) => aplicar(e.detail));

  // ----- Passar o mouse: a manchete da matéria ou o lançamento -----
  let foco = null;
  const dica = cena.querySelector(".dica-ponto");
  canvas.addEventListener("mousemove", (e) => {
    if (!dados || passo < 2 || zoom > 1.05) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    let html = "";
    const selo = passo >= 4 && modelos.find((mo) => Math.hypot(mo.x - x, mo.y - y) < rSelo + 2);
    if (selo) {
      html = `<small>${new Date(selo.d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} · ${esc(selo.e)}</small><b>${esc(selo.m)}</b><br>${esc(selo.i)}`;
      if (foco) { foco = null; desenhar(); }
    } else {
      const m = Math.floor((x - X0) / colW);
      let melhor = null, dist = pitch * 1.6;
      for (const pt of meses[m] || []) {
        if (pt.m > cursor) continue;
        const d = Math.hypot(pt.x - x, BASE + (pt.y - BASE) * altura - y);
        if (d < dist) { dist = d; melhor = pt; }
      }
      if (melhor !== foco) { foco = melhor; desenhar(); }
      if (foco) html = `<small>${foco.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} · ${dados.temas[foco.tema]}</small>${esc(foco.titulo)}`;
    }
    if (!html) { dica.classList.remove("on"); return; }
    dica.innerHTML = html;
    dica.style.left = Math.min(W - 480, x + 16) + "px";
    dica.style.top = Math.max(20, y - 130) + "px";
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
