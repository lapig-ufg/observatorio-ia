// Vitrine e revelação. Cada peça da vitrine é uma carta: a frente mostra o
// trabalho; o verso, o pedido feito à IA. Antes da revelação o verso não
// existe para quem assiste. Na revelação, todas as cartas viram em cascata.
// Depois dela, V (ou o botão) vira a peça de qualquer cena.

(() => {
  const P = window.PALCO;

  // ----- Peças: quadro ao vivo carrega só quando a cena entra -----
  document.querySelectorAll(".cena .peca").forEach((peca) => {
    const cena = peca.closest(".cena");
    const quadro = peca.querySelector("iframe[data-src]");
    const url = peca.dataset.aoVivo, nome = cena.dataset.titulo;
    cena.addEventListener("entrou", () => { if (quadro && quadro.src !== new URL(quadro.dataset.src, location.href).href) quadro.src = quadro.dataset.src; });
    cena.addEventListener("saiu", () => {
      if (quadro) quadro.src = "about:blank"; // jogo e 3D não ficam rodando escondidos
      peca.classList.remove("virada");
    });
    const virar = () => { if (P.revelado) peca.classList.toggle("virada"); };
    cena.querySelector(".virar")?.addEventListener("click", virar);
    cena.querySelector(".abrir")?.addEventListener("click", () => P.abrirAoVivo(url, nome));
    cena.addEventListener("tecla", (e) => {
      const k = e.detail.key;
      if ((k === "v" || k === "V") && P.revelado) { virar(); e.preventDefault(); }
      if (k === "Enter" && url) { P.abrirAoVivo(url, nome); e.preventDefault(); }
    });
  });

  // ----- Revelação -----
  const cena = document.getElementById("revelacao");
  const cartas = [...cena.querySelectorAll(".carta")];
  let miniaturaFeita = false;

  // O verso de cada carta vem do verso da peça correspondente (uma fonte só).
  cartas.forEach((c) => {
    const origem = document.querySelector(`#${c.dataset.de} .verso`);
    if (!origem) return;
    const v = c.querySelector(".verso");
    const q = origem.querySelector("blockquote"), quem = origem.querySelector(".quem"), feito = origem.querySelector("[data-resumo]");
    v.innerHTML = `<span class="rotulo">O pedido</span>${q ? q.outerHTML : ""}${quem ? quem.outerHTML : ""}${feito ? `<p class="feito">${feito.dataset.resumo}</p>` : ""}`;
  });

  let cascata = [];
  function virarTodas(sim) {
    cascata.forEach(clearTimeout); cascata = [];
    cartas.forEach((c, i) => {
      const atraso = sim ? 220 * i + 200 : 0;
      cascata.push(setTimeout(() => c.classList.toggle("virada", sim), atraso));
    });
  }
  cena.addEventListener("entrou", () => {
    if (!miniaturaFeita && window.miniaturaFolha) { miniaturaFeita = true; window.miniaturaFolha(cena.querySelector(".mini-folha canvas")); }
  });
  cena.addEventListener("passo", (e) => {
    virarTodas(e.detail >= 1);
    if (e.detail >= 1) P.revelar();
  });
  cena.addEventListener("saiu", () => virarTodas(false));
  // Depois de virar todas, cada carta pode ser virada à mão.
  cartas.forEach((c) => c.addEventListener("click", () => { if (P.revelado) c.classList.toggle("virada"); }));
})();
