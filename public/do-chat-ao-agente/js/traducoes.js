// As traduções da Fase 3 (10/11/2026).
// 1. Cena "protecoes": a linha de código que o agente quer rodar vira chinês na
//    frente da turma (passo 1) e, no modo Aprovar por mim, vira português (passo 2).
// 2. Cena "traducao": a máquina do passo 2 alterna o teste de 2017 (inglês → alemão)
//    e o pedido de hoje (português → código), com os fios da atenção.
(() => {
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- A troca de letras: cada caractere embaralha e assenta no novo -----
  const SINAIS = "$'=/?&;-_.:{}()[]<>#*+%";
  const HANZI = "的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很业最间新什打便位因重被走电四第门相次东";
  const LATIM = "abcdefghijklmnopqrstuvwxyzáãçéêíóõúABCDEFGHIJKLMNOPRSTUV";

  function morfar(el, de, para, { atraso = 0, dur = 2400, alfabeto = HANZI, aoFim } = {}) {
    if (el._morfa) el._morfa.parar();
    const A = Array.from(de), B = Array.from(para);
    const N = Math.max(A.length, B.length);
    const pool = Array.from(alfabeto + SINAIS);
    const sorteio = () => pool[(Math.random() * pool.length) | 0];
    const espalhar = dur * 0.62, assentar = dur * 0.38;
    let raf = 0, t0 = 0, ultimo = -1, vivo = true;
    const ruido = new Array(N).fill("");

    const terminar = () => {
      cancelAnimationFrame(raf);
      vivo = false;
      el.textContent = para;
      el.classList.remove("morfando");
      el.classList.add("morfado");
      if (aoFim) aoFim();
    };
    const quadro = (agora) => {
      if (!vivo) return;
      if (!t0) t0 = agora;
      const t = agora - t0 - atraso;
      if (t < 0) { raf = requestAnimationFrame(quadro); return; }
      el.classList.add("morfando");
      const fatia = Math.floor(t / 70);
      const novoRuido = fatia !== ultimo;
      ultimo = fatia;
      let s = "";
      for (let i = 0; i < N; i++) {
        const comeco = (i / N) * espalhar;
        if (t < comeco) { s += A[i] || ""; continue; }
        if (t > comeco + assentar) { s += B[i] || ""; continue; }
        if (novoRuido || !ruido[i]) ruido[i] = sorteio();
        // As posições que sobram (a linha de código é mais longa) somem pelo caminho.
        s += (i >= B.length && t > comeco + assentar * 0.55) ? "" : ruido[i];
      }
      el.textContent = s;
      if (t >= espalhar + assentar) terminar();
      else raf = requestAnimationFrame(quadro);
    };

    el.classList.remove("morfado");
    el.textContent = de;
    el._morfa = { parar() { vivo = false; cancelAnimationFrame(raf); }, terminar };
    if (calmo) { terminar(); return; }
    raf = requestAnimationFrame(quadro);
  }
  window.morfarTexto = morfar;

  // ----- Cena "protecoes" -----
  (() => {
    const cena = document.getElementById("protecoes");
    if (!cena) return;
    const brinca = cena.querySelector(".prot-brinca");
    const cartoes = [...brinca.querySelectorAll(".prot-brinca-cartao")];
    const volta = cena.querySelector(".prot-volta");
    const vMorfa = volta.querySelector(".prot-volta-morfa");
    const vCartao = volta.querySelector(".prot-volta-cartao");
    const vRotulo = volta.querySelector(".prot-volta-rotulo");
    const RESPOSTA = vMorfa.textContent.trim();
    const ROTULO_ANTES = vRotulo.textContent;
    const ROTULO_DEPOIS = "o revisor automático, em português";
    let timerVolta = 0;

    cartoes.forEach((c) => {
      const p = c.querySelector(".prot-chines");
      p.dataset.alvo = p.textContent.trim();
    });

    const mostrarFinal = (c) => {
      const p = c.querySelector(".prot-chines");
      if (p._morfa) p._morfa.parar();
      p.textContent = p.dataset.alvo;
      p.classList.remove("morfando", "codigo");
      p.classList.add("morfado");
      c.classList.remove("esperando");
    };

    const virarChines = (c) => {
      const p = c.querySelector(".prot-chines");
      c.classList.add("esperando");
      p.classList.add("codigo");
      p.classList.remove("morfado");
      morfar(p, p.dataset.codigo, p.dataset.alvo, {
        atraso: 1400, dur: 2600,
        aoFim: () => { p.classList.remove("codigo"); c.classList.remove("esperando"); },
      });
    };

    const ativo = (el) => el.classList.contains("visto") && !el.classList.contains("passou");

    // O segundo pedido aparece quando a pessoa pede "Outro pedido": a linha dele também vira chinês.
    // Só o atributo "hidden" (dos cartões e das respostas) e a classe "final" da
    // brincadeira interessam; as classes das frases mudam a cada quadro e ficam de fora.
    const olhar = () => {
      const [c1, c2] = cartoes;
      if (brinca.classList.contains("final")) { cartoes.forEach(mostrarFinal); return; }
      if (!c2.hidden && c2.dataset.vez !== "1") { c2.dataset.vez = "1"; virarChines(c2); }
      if (c2.hidden) c2.dataset.vez = "";
      if (!c1.hidden && c1.querySelector(".prot-brinca-resposta").hidden === false) mostrarFinal(c1);
    };
    new MutationObserver(olhar).observe(brinca, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
    new MutationObserver(olhar).observe(brinca, { attributes: true, attributeFilter: ["class"] });

    const comecarVolta = () => {
      clearTimeout(timerVolta);
      vCartao.classList.remove("traduzido");
      vRotulo.textContent = ROTULO_ANTES;
      vMorfa.classList.add("codigo");
      morfar(vMorfa, vMorfa.dataset.codigo, RESPOSTA, {
        atraso: 1500, dur: 3000, alfabeto: LATIM,
        aoFim: () => vMorfa.classList.remove("codigo"),
      });
      timerVolta = setTimeout(() => {
        vCartao.classList.add("traduzido");
        vRotulo.textContent = ROTULO_DEPOIS;
      }, calmo ? 0 : 1900);
    };
    const pararVolta = () => {
      clearTimeout(timerVolta);
      if (vMorfa._morfa) vMorfa._morfa.parar();
    };

    cena.addEventListener("passo", (e) => {
      const n = e.detail;
      if (n === 1) { cartoes[1].dataset.vez = ""; virarChines(cartoes[0]); }
      if (n === 2) comecarVolta(); else pararVolta();
    });
    cena.addEventListener("saiu", () => {
      pararVolta();
      cartoes.forEach((c) => { const p = c.querySelector(".prot-chines"); if (p._morfa) p._morfa.parar(); });
    });
    // Se a pessoa responder antes de a linha terminar de virar, ela termina na hora.
    brinca.addEventListener("click", (e) => {
      const c = e.target.closest(".prot-brinca-cartao");
      if (c && e.target.closest("[data-escolha]")) mostrarFinal(c);
    }, true);
    cena.addEventListener("tecla", (e) => {
      if (!ativo(cena.querySelector(".prot-jogo"))) return;
      const k = e.detail.key.toLowerCase();
      if (k === "p" || k === "r") cartoes.filter((c) => !c.hidden).forEach(mostrarFinal);
    }, true);
  })();

  // ----- Cena "traducao", passo 0: as 37 palavras são lidas, uma a uma -----
  (() => {
    const cena = document.getElementById("traducao");
    const pedido = cena && cena.querySelector(".trad-pedido");
    if (!pedido) return;
    const palavras = pedido.textContent.trim().split(/\s+/);
    pedido.innerHTML = palavras.map((p) => `<span class="pal">${p}</span>`).join(" ");
    const spans = [...pedido.querySelectorAll(".pal")];
    let timers = [];
    const limpar = () => { timers.forEach(clearTimeout); timers = []; spans.forEach((s) => s.classList.remove("lida")); };
    const ler = () => {
      limpar();
      if (calmo) return;
      // As palavras acendem em onda (0,7 s a 2,4 s) e voltam ao normal quando o código começa.
      spans.forEach((s, i) => {
        timers.push(setTimeout(() => s.classList.add("lida"), 700 + i * 46));
        timers.push(setTimeout(() => s.classList.remove("lida"), 2500 + i * 22));
      });
    };
    cena.addEventListener("passo", (e) => { if (e.detail === 0) ler(); else limpar(); });
    cena.addEventListener("saiu", limpar);
  })();

  // ----- Cena "traducao": a máquina de 2017 e a de hoje -----
  (() => {
    const cena = document.getElementById("traducao");
    if (!cena) return;
    const maq = cena.querySelector(".trad-maquina");
    if (!maq) return;
    const fases = [...maq.querySelectorAll(".trad-maq-fase")];
    const fios = maq.querySelector(".trad-maq-fios");
    const NS = "http://www.w3.org/2000/svg";
    let fase = 0, timer = 0, ligado = false;

    function desenhar() {
      const esc = (window.PALCO && PALCO.escala) || 1;
      const base = maq.getBoundingClientRect();
      const W = base.width / esc, H = base.height / esc;
      fios.setAttribute("viewBox", `0 0 ${W} ${H}`);
      fios.replaceChildren();
      const f = fases[fase];
      const entra = [...f.querySelectorAll(".trad-maq-entra span")];
      const sai = [...f.querySelectorAll(".trad-maq-sai span")];
      // Cada palavra que sai olha para todas as que entraram: um fio forte para a
      // principal e fios fracos, que enfraquecem com a distância, para as outras.
      // Os fios saem de baixo do bloco de entrada e chegam em cima do bloco de saída,
      // para não cruzar a segunda linha de texto quando a frase quebra.
      const yEntra = f.querySelector(".trad-maq-entra").getBoundingClientRect().bottom + 8;
      const ySai = f.querySelector(".trad-maq-sai").getBoundingClientRect().top - 8;
      const ponto = (el, emBaixo) => {
        const r = el.getBoundingClientRect();
        return [(r.left + r.width / 2 - base.left) / esc, ((emBaixo ? yEntra : ySai) - base.top) / esc];
      };
      const pontosEntra = entra.map((e) => ponto(e, true));
      sai.forEach((s, k) => {
        const principal = +s.dataset.liga;
        const [x2, y2] = ponto(s, false);
        s.style.setProperty("--k", k);
        pontosEntra.forEach(([x1, y1], j) => {
          const dist = Math.abs(j - principal);
          if (dist > 3) return;
          const meio = (y1 + y2) / 2;
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", `M${x1} ${y1} C${x1} ${meio} ${x2} ${meio} ${x2} ${y2}`);
          p.setAttribute("pathLength", "1");
          p.style.setProperty("--k", k);
          p.style.setProperty("--forca", dist === 0 ? .95 : [0, .3, .16, .08][dist]);
          p.style.setProperty("--grossura", dist === 0 ? 2.6 : 1.2);
          fios.append(p);
        });
        const alvo = entra[principal];
        if (alvo) { alvo.classList.add("ligada"); alvo.style.setProperty("--k", k); }
      });
    }

    function mostrar(n) {
      fase = n;
      fases.forEach((f, i) => {
        f.classList.toggle("on", i === n);
        f.querySelectorAll(".ligada").forEach((s) => s.classList.remove("ligada"));
      });
      maq.classList.remove("rodando");
      void maq.offsetWidth;
      desenhar();
      maq.classList.add("rodando");
    }

    function ligar() {
      if (ligado) return;
      ligado = true;
      mostrar(0);
      if (calmo) return;
      timer = setInterval(() => mostrar((fase + 1) % fases.length), 7000);
    }
    function desligar() {
      ligado = false;
      clearInterval(timer);
      maq.classList.remove("rodando");
    }

    cena.addEventListener("passo", (e) => { if (e.detail === 2) setTimeout(ligar, 350); else desligar(); });
    cena.addEventListener("saiu", desligar);
    const palco = document.querySelector(".palco");
    if (palco) palco.addEventListener("escala", () => { if (ligado) desenhar(); });
  })();
})();
