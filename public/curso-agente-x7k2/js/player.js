// Player dos vídeos gravados (Fases 2 e 3). Usa o <video> do navegador, sem
// biblioteca. Parado no projetor, só a linha fina do tempo; com o mouse em
// cima ou com o vídeo pausado, sobe a faixa de controles.
//
// Na aula, espaço e setas continuam avançando os passos. Para o vídeo:
// K pausa e retoma, J volta 5 s, L avança 5 s (como no YouTube).
// Em tela cheia do vídeo, espaço e setas passam a ser do vídeo; Esc sai.

(() => {
  const ICONE = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
    rever: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 9.3l1.9-.6A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg>',
    volta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7v10l-7-5zM20 7v10l-7-5z"/></svg>',
    frente: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 7v10l7-5zM4 7v10l7-5z"/></svg>',
    cheia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3zM15 4h5v5h-2V6h-3zM20 15v5h-5v-2h3v-3zM9 20H4v-5h2v3h3z"/></svg>',
    sair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4V7h3V4zM20 9h-5V4h2v3h3zM15 20v-5h5v2h-3v3zM4 15h5v5H7v-3H4z"/></svg>',
  };
  const VELOCIDADES = [1, 1.5, 2];
  const tempo = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  document.querySelectorAll(".peca.video").forEach((peca) => {
    const cena = peca.closest(".cena"), frente = peca.querySelector(".frente"), video = frente.querySelector("video");
    const aparece = +peca.dataset.passo;
    peca.classList.add("com-player");

    const pl = document.createElement("div");
    pl.className = "pl";
    pl.innerHTML = `
      <button type="button" class="pl-grande" aria-label="Tocar o vídeo">${ICONE.play}</button>
      <div class="pl-faixa">
        <div class="pl-linha" role="slider" aria-label="Posição do vídeo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="-1">
          <i class="pl-carregado"></i><i class="pl-feito"></i><i class="pl-bola"></i><span class="pl-dica">0:00</span>
        </div>
        <div class="pl-botoes">
          <button type="button" class="pl-tocar" aria-label="Pausar" title="Pausar (K)">${ICONE.pausa}</button>
          <button type="button" class="pl-volta" aria-label="Voltar 5 segundos" title="Voltar 5 s (J)">${ICONE.volta}</button>
          <button type="button" class="pl-frente" aria-label="Avançar 5 segundos" title="Avançar 5 s (L)">${ICONE.frente}</button>
          <span class="pl-tempo"><b>0:00</b> / <span>0:00</span></span>
          <span class="pl-espaco"></span>
          <button type="button" class="pl-vel" aria-label="Velocidade" title="Velocidade">1×</button>
          <button type="button" class="pl-cheia" aria-label="Tela cheia" title="Tela cheia">${ICONE.cheia}</button>
        </div>
      </div>`;
    frente.append(pl);
    // Clique de mouse não deixa o anel de foco no botão (pelo teclado ele continua).
    pl.addEventListener("click", (e) => { if (e.detail) e.target.closest("button")?.blur(); });

    const $ = (s) => pl.querySelector(s);
    const linha = $(".pl-linha"), feito = $(".pl-feito"), bola = $(".pl-bola"), carregado = $(".pl-carregado"), dica = $(".pl-dica");
    const bTocar = $(".pl-tocar"), bGrande = $(".pl-grande"), bVel = $(".pl-vel"), bCheia = $(".pl-cheia");
    const agora = $(".pl-tempo b"), total = $(".pl-tempo span");
    // A linha fina de antes continua como a barra "em repouso".
    const barraAntiga = peca.querySelector(".progresso b");

    // ----- Tocar, pausar, pular -----
    const alternar = () => (video.paused || video.ended ? video.play().catch(() => {}) : video.pause());
    const pular = (s) => { if (video.duration) video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + s)); mostrar(); };
    bTocar.addEventListener("click", alternar);
    bGrande.addEventListener("click", alternar);
    video.addEventListener("click", alternar);
    video.addEventListener("dblclick", () => telaCheia());
    $(".pl-volta").addEventListener("click", () => pular(-5));
    $(".pl-frente").addEventListener("click", () => pular(5));
    bVel.addEventListener("click", () => {
      const i = (VELOCIDADES.indexOf(video.playbackRate) + 1) % VELOCIDADES.length;
      video.playbackRate = VELOCIDADES[i];
      bVel.textContent = `${String(VELOCIDADES[i]).replace(".", ",")}×`;
    });

    const estado = () => {
      const parado = video.paused || video.ended;
      frente.classList.toggle("pl-parado", parado);
      bTocar.innerHTML = parado ? (video.ended ? ICONE.rever : ICONE.play) : ICONE.pausa;
      bTocar.setAttribute("aria-label", parado ? "Tocar" : "Pausar");
      bTocar.title = parado ? "Tocar (K)" : "Pausar (K)";
      bGrande.innerHTML = video.ended ? ICONE.rever : ICONE.play;
      bGrande.setAttribute("aria-label", video.ended ? "Ver de novo" : "Tocar o vídeo");
    };
    ["play", "pause", "ended"].forEach((ev) => video.addEventListener(ev, estado));

    // ----- Tempo e barra -----
    const desenhar = () => {
      const d = video.duration || 0, p = d ? video.currentTime / d : 0;
      feito.style.width = bola.style.left = `${100 * p}%`;
      if (barraAntiga) barraAntiga.style.width = `${100 * p}%`;
      agora.textContent = tempo(video.currentTime);
      total.textContent = tempo(d);
      linha.setAttribute("aria-valuenow", Math.round(100 * p));
      linha.setAttribute("aria-valuetext", `${tempo(video.currentTime)} de ${tempo(d)}`);
      const b = video.buffered;
      if (d && b.length) carregado.style.width = `${(100 * b.end(b.length - 1)) / d}%`;
    };
    ["timeupdate", "loadedmetadata", "durationchange", "progress", "seeked"].forEach((ev) => video.addEventListener(ev, desenhar));

    // Clicar ou arrastar na barra. getBoundingClientRect já vem na escala do palco.
    const fracao = (e) => { const r = linha.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
    let arrastando = false, tocavaAntes = false;
    const irPara = (e) => { if (video.duration) { video.currentTime = fracao(e) * video.duration; desenhar(); } };
    linha.addEventListener("pointerdown", (e) => {
      arrastando = true; tocavaAntes = !video.paused; video.pause();
      linha.setPointerCapture(e.pointerId); frente.classList.add("pl-arrastando"); irPara(e);
    });
    linha.addEventListener("pointermove", (e) => {
      const f = fracao(e);
      dica.style.left = `${100 * f}%`;
      dica.textContent = tempo(f * (video.duration || 0));
      if (arrastando) irPara(e);
    });
    const soltar = () => {
      if (!arrastando) return;
      arrastando = false; frente.classList.remove("pl-arrastando");
      if (tocavaAntes) video.play().catch(() => {});
    };
    linha.addEventListener("pointerup", soltar);
    linha.addEventListener("pointercancel", soltar);

    // ----- A faixa aparece com o mouse e some depois de parado -----
    let some = 0;
    const mostrar = () => {
      frente.classList.add("pl-ativo");
      clearTimeout(some);
      some = setTimeout(() => { if (!arrastando) frente.classList.remove("pl-ativo"); }, 2200);
    };
    frente.addEventListener("pointermove", mostrar);
    frente.addEventListener("pointerleave", () => { clearTimeout(some); if (!arrastando) frente.classList.remove("pl-ativo"); });

    // ----- Tela cheia do vídeo (com os controles) -----
    const telaCheia = () => {
      if (document.fullscreenElement === frente) document.exitFullscreen?.();
      else frente.requestFullscreen?.().catch(() => {});
    };
    bCheia.addEventListener("click", telaCheia);
    // O botão "Ver em tela cheia" da cena e o Enter (cena-vitrine.js) usam esta mesma tela cheia.
    peca.telaCheia = telaCheia;
    document.addEventListener("fullscreenchange", () => {
      const sim = document.fullscreenElement === frente;
      frente.classList.toggle("pl-cheia-sim", sim);
      bCheia.innerHTML = sim ? ICONE.sair : ICONE.cheia;
      bCheia.setAttribute("aria-label", sim ? "Sair da tela cheia" : "Tela cheia");
      bCheia.title = sim ? "Sair da tela cheia (Esc)" : "Tela cheia";
    });

    // Em tela cheia, as teclas são do vídeo e não passam para a aula.
    addEventListener("keydown", (e) => {
      if (document.fullscreenElement !== frente || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const acao = { " ": alternar, k: alternar, arrowleft: () => pular(-5), j: () => pular(-5), arrowright: () => pular(5), l: () => pular(5), f: telaCheia }[k];
      if (!acao && !["arrowup", "arrowdown", "pageup", "pagedown", "home", "end", "b", ".", "v", "r", "enter"].includes(k)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (acao) { acao(); mostrar(); }
    }, true);

    // Na aula: K, J e L, só enquanto o vídeo está no passo em que aparece.
    cena.addEventListener("tecla", (e) => {
      if (!peca.classList.contains("visto") || peca.classList.contains("passou") || peca.classList.contains("virada")) return;
      const k = e.detail.key.toLowerCase();
      const acao = { k: alternar, j: () => pular(-5), l: () => pular(5) }[k];
      if (acao) { acao(); mostrar(); e.preventDefault(); }
    });

    // Servidor sem pedido parcial (Range), como o python -m http.server: o navegador
    // não consegue pular para o meio do vídeo. Nesse caso, quando a cena entra, o
    // vídeo vem inteiro para a memória e passa a tocar de lá. O GitHub Pages aceita
    // Range, e aí nada muda.
    let conferido = false;
    cena.addEventListener("entrou", async () => {
      if (conferido || location.protocol === "file:") return;
      conferido = true;
      try {
        const url = video.currentSrc || video.src;
        const teste = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
        teste.body?.cancel();
        if (teste.status === 206) return;
        const blob = await (await fetch(url)).blob();
        const t = video.currentTime, tocando = !video.paused;
        video.src = URL.createObjectURL(blob);
        video.addEventListener("loadedmetadata", () => {
          video.currentTime = t; video.playbackRate = VELOCIDADES.includes(video.playbackRate) ? video.playbackRate : 1;
          if (tocando) video.play().catch(() => {});
        }, { once: true });
      } catch (_) { /* sem rede ou sem permissão: fica como estava */ }
    });

    // O vídeo começa do início quando a peça aparece e para ao sair.
    cena.addEventListener("passo", (e) => {
      if (e.detail === aparece) { video.currentTime = 0; video.play().catch(() => {}); } else video.pause();
    });
    cena.addEventListener("saiu", () => { video.pause(); if (document.fullscreenElement === frente) document.exitFullscreen?.(); });

    estado(); desenhar();
  });
})();
