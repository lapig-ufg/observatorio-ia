// Vitrine e revelação. Cada peça da vitrine é uma carta: a frente mostra o
// trabalho; o verso, o pedido feito à IA. Antes da revelação o verso não
// existe para quem assiste. Na revelação, todas as cartas viram em cascata.
// Depois dela, V (ou o botão) vira a peça de qualquer cena.

(() => {
  const P = window.PALCO;

  // Vira uma carta em 2D: encolhe na horizontal, troca a face e abre de novo.
  // (A virada em 3D deixava o exemplo borrado; ver palco.css.)
  function virarCarta(carta, sim = !carta.classList.contains("virada")) {
    if (carta.classList.contains("virada") === sim) return;
    const giro = carta.querySelector(".peca-giro");
    const curva = "cubic-bezier(.55, 0, .45, 1)";
    giro.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0) scaleY(.96)" }], { duration: 260, easing: curva })
      .finished.then(() => {
        carta.classList.toggle("virada", sim);
        giro.animate([{ transform: "scaleX(0) scaleY(.96)" }, { transform: "scaleX(1)" }], { duration: 320, easing: "cubic-bezier(.2, .8, .2, 1)" });
      });
  }

  // ----- Peças: quadro ao vivo carrega só quando a cena entra -----
  document.querySelectorAll(".cena .peca").forEach((peca) => {
    const cena = peca.closest(".cena");
    const quadro = peca.querySelector("iframe[data-src]");
    const url = peca.dataset.aoVivo, nome = cena.dataset.titulo, passo = +peca.dataset.passo;
    // Numa cena com duas peças (as duas partes das viagens), só a do passo atual responde.
    const naVez = () => peca.classList.contains("visto") && !peca.classList.contains("passou");
    cena.addEventListener("entrou", () => { if (quadro && quadro.src !== new URL(quadro.dataset.src, location.href).href) quadro.src = quadro.dataset.src; });
    cena.addEventListener("saiu", () => {
      if (quadro) quadro.src = "about:blank"; // jogo e 3D não ficam rodando escondidos
      peca.classList.remove("virada");
    });
    const virar = () => { if (P.revelado && naVez()) virarCarta(peca); };
    cena.querySelector(".virar")?.addEventListener("click", virar);
    // Vídeo gravado: abre a tela cheia do player (js/player.js), com os mesmos controles da miniatura.
    // Os outros (jogo, página, 3D): abrem ao vivo no quadro grande.
    const abrir = () => (peca.telaCheia ? peca.telaCheia() : url && P.abrirAoVivo(url, nome));
    // O botão do texto que acompanha esta peça (cada passo pode ter o seu).
    cena.querySelector(`.vitrine-texto[data-passo="${passo}"] .abrir`)?.addEventListener("click", abrir);
    cena.addEventListener("tecla", (e) => {
      const k = e.detail.key;
      if ((k === "v" || k === "V") && P.revelado && naVez()) { virarCarta(peca); e.preventDefault(); }
      if (k === "Enter" && naVez() && (peca.telaCheia || url)) { abrir(); e.preventDefault(); }
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
      cascata.push(setTimeout(() => (sim ? virarCarta(c, true) : c.classList.remove("virada")), atraso));
    });
  }
  cena.addEventListener("entrou", () => {
    if (!miniaturaFeita && window.miniaturaBusca) { miniaturaFeita = true; window.miniaturaBusca(cena.querySelector(".mini-folha canvas")); }
  });
  cena.addEventListener("passo", (e) => {
    virarTodas(e.detail >= 1);
    if (e.detail >= 1) P.revelar();
  });
  cena.addEventListener("saiu", () => virarTodas(false));
  // Depois de virar todas, cada carta pode ser virada à mão.
  cartas.forEach((c) => c.addEventListener("click", () => { if (P.revelado) virarCarta(c); }));
})();
