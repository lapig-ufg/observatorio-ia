// Motor do palco (v4). Cada <section class="cena"> tem passos (data-passos);
// a seta para a direita avança o passo e, no último, vai para a próxima cena.
// Endereço: #cena.passo. ?turma=CODIGO identifica a turma.
//
// Teclas: → espaço PageDown avançam; ← PageUp voltam; F tela cheia;
// B tela preta; V vira a peça (depois da revelação); Enter abre ao vivo.
// As cenas recebem os eventos "entrou", "saiu", "passo" (detail: n) e "tecla".

(() => {
  const palco = document.querySelector(".palco");
  const cenas = [...palco.querySelectorAll(".cena")];
  const params = new URLSearchParams(location.search);
  const turma = (params.get("turma") || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);

  const guardado = (k, v) => {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch { return null; }
  };

  const PALCO = window.PALCO = {
    turma, cenas, escala: 1,
    revelado: guardado("curso-revelado") === "1",
    revelar() { PALCO.revelado = true; guardado("curso-revelado", "1"); document.body.classList.add("revelado"); },
  };
  if (PALCO.revelado) document.body.classList.add("revelado");

  // ----- Escala: o quadro ocupa a janela inteira, sem barras -----
  // Na tela larga a altura fica em 900 px lógicos e a largura acompanha a janela;
  // na tela mais estreita que 16:9, a largura fica em 1600 e a altura cresce (até 1100).
  // As cenas se ancoram nas bordas e leem PALCO.W e PALCO.H para desenhar.
  function escalar() {
    const asp = innerWidth / innerHeight;
    let W, H;
    if (asp >= 16 / 9) { H = 900; W = Math.min(2400, Math.round(900 * asp)); }
    else { W = 1600; H = Math.min(1100, Math.round(1600 / asp)); }
    const s = Math.min(innerWidth / W, innerHeight / H);
    Object.assign(PALCO, { escala: s, W, H });
    palco.style.width = W + "px"; palco.style.height = H + "px";
    palco.style.setProperty("--escala", s);
    palco.dispatchEvent(new CustomEvent("escala", { detail: s }));
  }
  addEventListener("resize", escalar);
  escalar();

  // ----- Navegação -----
  let atual = -1, passo = 0;
  const passosDe = (c) => +c.dataset.passos || 0;

  function aplicarPasso(c, n) {
    c.querySelectorAll("[data-passo]").forEach((el) => el.classList.toggle("visto", n >= +el.dataset.passo));
    c.querySelectorAll("[data-ate]").forEach((el) => el.classList.toggle("passou", n > +el.dataset.ate));
    c.dispatchEvent(new CustomEvent("passo", { detail: n }));
  }

  function ir(i, p = 0, { semHistorico = false } = {}) {
    i = Math.max(0, Math.min(cenas.length - 1, i));
    p = Math.max(0, Math.min(passosDe(cenas[i]), p));
    if (i !== atual) {
      const antiga = cenas[atual];
      if (antiga) { antiga.classList.remove("ativa"); antiga.dispatchEvent(new Event("saiu")); }
      atual = i;
      cenas[i].classList.add("ativa");
      cenas[i].dispatchEvent(new Event("entrou"));
    }
    passo = p;
    aplicarPasso(cenas[i], p);
    const h = `#${cenas[i].id}${p ? "." + p : ""}`;
    if (!semHistorico && location.hash !== h) history.replaceState(null, "", h + "");
    atualizarTrilho();
  }
  const avancar = () => passo < passosDe(cenas[atual]) ? ir(atual, passo + 1) : atual < cenas.length - 1 && ir(atual + 1, 0);
  const voltar = () => passo > 0 ? ir(atual, passo - 1) : (atual > 0 && ir(atual - 1, passosDe(cenas[atual - 1])));
  PALCO.ir = ir; PALCO.avancar = avancar; PALCO.voltar = voltar;
  PALCO.atual = () => cenas[atual];

  function lerHash() {
    const [id, p] = location.hash.slice(1).split(".");
    const i = cenas.findIndex((c) => c.id === id);
    return i >= 0 ? [i, +p || 0] : [0, 0];
  }
  addEventListener("hashchange", () => { const [i, p] = lerHash(); ir(i, p, { semHistorico: true }); });

  // ----- Teclado -----
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!document.querySelector(".ao-vivo").hidden) return; // com o quadro ao vivo aberto, as teclas são dele
    const ev = new CustomEvent("tecla", { detail: { key: e.key }, cancelable: true });
    if (!cenas[atual].dispatchEvent(ev)) { e.preventDefault(); return; }
    const k = e.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(k)) { e.preventDefault(); avancar(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(k)) { e.preventDefault(); voltar(); }
    else if (k === "Home") ir(0, 0);
    else if (k === "End") ir(cenas.length - 1, 0);
    else if (k === "f" || k === "F") telaCheia();
    else if (k === "b" || k === "B" || k === ".") document.body.classList.toggle("preto");
  });
  // Clique no palco: metade direita avança, esquerda volta (como um livro). Botões e quadros não contam.
  palco.addEventListener("click", (e) => {
    if (e.target.closest("button, a, iframe, canvas.interativo, .peca, .carta, .qr, .ficha, .resultado")) return;
    const r = palco.getBoundingClientRect();
    (e.clientX - r.left) / r.width > 0.35 ? avancar() : voltar();
  });

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // ----- Trilho: três fases; a 2 e a 3 ainda estão por fazer -----
  const trilho = document.querySelector(".trilho .fases");
  const fases = [
    { nome: "Fase 1 · O que a IA já faz", cenas: cenas.filter((c) => c.dataset.fase === "1") },
    { nome: "Fase 2 · No navegador", futura: !cenas.some((c) => c.dataset.fase === "2"), cenas: cenas.filter((c) => c.dataset.fase === "2") },
    { nome: "Fase 3 · No seu computador", futura: !cenas.some((c) => c.dataset.fase === "3"), cenas: cenas.filter((c) => c.dataset.fase === "3") },
  ];
  fases.forEach((f) => {
    const el = document.createElement("div");
    el.className = "fase" + (f.futura ? " futura" : "");
    el.style.setProperty("--peso", f.futura ? 6 : Math.max(4, f.cenas.length));
    el.innerHTML = `<b>${f.nome}</b><div class="pontos"></div>`;
    const pts = el.querySelector(".pontos");
    (f.futura ? [null, null, null, null, null, null] : f.cenas).forEach((c) => {
      const i = document.createElement("i");
      if (c) { i.title = c.dataset.titulo || c.id; i.addEventListener("click", () => ir(cenas.indexOf(c), 0)); i._cena = c; }
      pts.append(i);
    });
    trilho.append(el);
  });
  function atualizarTrilho() {
    trilho.querySelectorAll("i").forEach((i) => {
      if (!i._cena) return;
      const k = cenas.indexOf(i._cena);
      i.classList.toggle("feito", k < atual);
      i.classList.toggle("agora", k === atual);
    });
  }
  document.querySelector("[data-acao=tela-cheia]")?.addEventListener("click", telaCheia);
  document.querySelector("[data-acao=voltar]")?.addEventListener("click", voltar);
  document.querySelector("[data-acao=avancar]")?.addEventListener("click", avancar);

  // Controles somem quando o mouse fica parado (no projetor não aparecem à toa).
  let quieto = 0;
  const mexeu = () => { document.body.classList.remove("quieto"); clearTimeout(quieto); quieto = setTimeout(() => document.body.classList.add("quieto"), 2200); };
  addEventListener("mousemove", mexeu); addEventListener("touchstart", mexeu, { passive: true });
  mexeu();

  // ----- Ao vivo: abre um trabalho de verdade por cima de tudo -----
  const aoVivo = document.querySelector(".ao-vivo");
  PALCO.abrirAoVivo = (url, nome) => {
    aoVivo.querySelector("strong").textContent = nome;
    aoVivo.querySelector("iframe").src = url;
    aoVivo.hidden = false;
    aoVivo.querySelector("button").focus();
  };
  const fecharAoVivo = () => { aoVivo.hidden = true; aoVivo.querySelector("iframe").src = "about:blank"; };
  aoVivo.querySelector("button").addEventListener("click", fecharAoVivo);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !aoVivo.hidden) fecharAoVivo(); }, true);

  // Começa onde o endereço manda (útil para ensaiar uma cena só), só depois que
  // todos os scripts das cenas carregaram: antes, a primeira cena entraria sem ninguém ouvindo.
  const comecar = () => { const [i, p] = lerHash(); ir(i, p); };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", comecar); else setTimeout(comecar);
})();
