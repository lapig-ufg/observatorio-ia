// A mesa de Mau-Mau: quatro robôs jogam sozinhos, com as mãos à vista.
// As regras e as decisões dos bots vêm de js/maumau.js (regras fixas, escritas
// por uma IA; nenhuma IA é chamada durante a partida). Aqui só se encena:
// a carta voa da mão para o monte e o balão diz o motivo da jogada.

(() => {
  const R = window.MAUMAU_REGRAS;
  const sala = document.querySelector(".sala");
  const BOTS = [
    { nome: "Bia", img: "bia", cor: "#c4502a", jeito: "confiante" },
    { nome: "Caio", img: "caio", cor: "#1d3f5f", jeito: "pensativo" },
    { nome: "Dani", img: "dani", cor: "#2b7055", jeito: "alegre" },
    { nome: "Edu", img: "edu", cor: "#c9971a", jeito: "desconfiado" },
  ];
  const COR_CSS = { vermelho: "#c4502a", azul: "#3f7bb0", verde: "#3f9a72", amarelo: "#e0b030" };
  // Onde fica a mão de cada lugar (centro, em px do quadro) e onde o balão aparece.
  const MAOS = [{ x: 400, y: 470 }, { x: 800, y: 228 }, { x: 1200, y: 470 }, { x: 800, y: 700 }];
  const BALOES = [{ left: 40, top: 590 }, { left: 990, top: 40 }, { left: 1140, top: 590 }, { left: 990, top: 760 }];
  const MONTE = { x: 690, y: 395 }, DESCARTE = { x: 830, y: 390 };

  let s = null, vel = 1, pausado = false, timer = 0;
  const espera = (ms) => new Promise((ok) => { timer = setTimeout(ok, ms / vel); });

  // ----- Escala -----
  const escalar = () => sala.style.setProperty("--e", Math.min(innerWidth / 1600, innerHeight / 900));
  addEventListener("resize", escalar); escalar();

  // ----- Lugares -----
  const lugares = BOTS.map((b, i) => {
    const el = document.createElement("div");
    el.className = `lugar l${i}`;
    el.style.setProperty("--cor", b.cor);
    el.innerHTML = `<div class="avatar"><img src="assets/img/bots/${b.img}.png" alt="${b.nome}, o robô ${b.jeito}"></div><div class="nome">${b.nome}<small></small></div>`;
    sala.append(el);
    const mao = document.createElement("div"); mao.className = "mao"; sala.append(mao);
    const balao = document.createElement("div"); balao.className = "balao"; balao.style.setProperty("--cor", b.cor);
    Object.assign(balao.style, { left: BALOES[i].left + "px", top: BALOES[i].top + "px" });
    sala.append(balao);
    return { el, mao, balao, qtd: el.querySelector("small") };
  });

  function cartaHTML(c, w) {
    const sim = R.ehNumero(c) ? c.valor : R.SIMBOLO[c.valor];
    return `<div class="carta ${c.cor}" style="--w:${w}px" aria-label="${R.nomeCarta(c)}"><b>${sim}</b></div>`;
  }
  // Posição de cada carta na mão (leque horizontal centrado em MAOS[i]).
  function posMao(i, k, n) {
    const passo = Math.min(40, 300 / Math.max(1, n));
    return { x: MAOS[i].x - ((n - 1) * passo) / 2 + k * passo - 25, y: MAOS[i].y - 36 };
  }

  function desenhar() {
    s.jogadores.forEach((j, i) => {
      const l = lugares[i];
      l.qtd.textContent = `${j.mao.length} carta${j.mao.length === 1 ? "" : "s"}`;
      l.el.classList.toggle("vez", s.vez === i && !s.fim);
      l.mao.innerHTML = j.mao.map((c, k) => {
        const p = posMao(i, k, j.mao.length);
        return cartaHTML(c, 50).replace('style="', `style="left:${p.x}px;top:${p.y}px;`);
      }).join("");
    });
    const desc = sala.querySelector(".descarte");
    desc.innerHTML = s.descarte.slice(-3).map((c, k, arr) => {
      const giro = ((c.id * 37) % 24) - 12; // cada carta com um giro fixo, como num monte de verdade
      return cartaHTML(c, 110).replace('style="', `style="transform:rotate(${k === arr.length - 1 ? giro / 3 : giro}deg);`);
    }).join("");
    sala.querySelector(".anel").style.setProperty("--cor-mesa", COR_CSS[s.corAtiva] || "#fff");
    sala.querySelector(".sentido").classList.toggle("anti", s.sentido < 0);
    sala.querySelector(".acumulado").textContent = s.acumulado ? `+${s.acumulado}` : "";
  }

  // Uma carta voa de um ponto a outro do quadro.
  async function voar(html, de, para, giro = 0) {
    const t = document.createElement("div");
    t.innerHTML = html; const c = t.firstElementChild;
    c.style.left = de.x + "px"; c.style.top = de.y + "px";
    sala.append(c);
    c.getBoundingClientRect();
    c.classList.add("voando");
    c.style.transitionDuration = `${0.5 / vel}s`;
    c.style.left = para.x + "px"; c.style.top = para.y + "px"; c.style.transform = `rotate(${giro}deg) scale(${para.escala || 1})`;
    await espera(520);
    c.remove();
  }

  function falar(i, titulo, texto, grito = false) {
    lugares.forEach((l) => l.balao.classList.remove("on"));
    const b = lugares[i].balao;
    b.classList.toggle("grito", grito);
    b.innerHTML = grito ? texto : `<b>${titulo}</b>${texto}`;
    b.classList.add("on");
  }

  async function turno() {
    const i = s.vez, j = s.jogadores[i];
    desenhar();
    falar(i, j.nome, "…");
    await espera(650);
    const antes = new Set(j.mao.map((c) => c.id));
    const pos = new Map(j.mao.map((c, k) => [c.id, posMao(i, k, j.mao.length)]));
    const topoAntes = R.topo(s);
    const registro = R.turnoBot(s);
    const novoTopo = R.topo(s);
    const jogou = novoTopo !== topoAntes && !j.mao.includes(novoTopo) ? novoTopo : null;
    const compradas = j.mao.filter((c) => !antes.has(c.id));
    const multa = registro.some((r) => r.tipo === "multa");
    const grito = registro.find((r) => r.tipo === "grito");
    const principal = registro.find((r) => r.quem) || {};

    // Compra antes de jogar (quando não tinha carta que servisse); a multa vem depois.
    const comprasAntes = multa ? [] : compradas, comprasDepois = multa ? compradas : [];
    for (const c of comprasAntes) await voar(`<div class="carta costas" style="--w:96px"></div>`, MONTE, { ...MAOS[i], x: MAOS[i].x - 48, y: MAOS[i].y - 70, escala: .55 });
    if (grito) { falar(i, j.nome, "Mau-Mau!", true); await espera(900); }
    if (jogou) {
      const de = pos.get(jogou.id) || { x: MAOS[i].x - 25, y: MAOS[i].y - 36 };
      await voar(cartaHTML(jogou, 50), de, { x: DESCARTE.x + 30, y: DESCARTE.y + 44, escala: 2.2 }, ((jogou.id * 37) % 24 - 12) / 3);
    }
    desenhar();
    falar(i, `${j.nome} · ${principal.carta || ""}`, principal.motivo || "");
    for (const c of comprasDepois) await voar(`<div class="carta costas" style="--w:96px"></div>`, MONTE, { x: MAOS[i].x - 48, y: MAOS[i].y - 70, escala: .55 });
    if (multa) { falar(i, j.nome, "Esqueceu de dizer Mau-Mau: compra 2."); desenhar(); }
    await espera(principal.motivo && principal.motivo.length > 40 ? 2600 : 1900);
  }

  async function partida() {
    s = R.novaPartida(BOTS.map((b) => ({ nome: b.nome, bot: true })));
    sala.querySelector(".fim").classList.remove("on");
    desenhar();
    await espera(800);
    while (!s.fim) {
      while (pausado || document.hidden) await new Promise((ok) => setTimeout(ok, 300));
      await turno();
    }
    desenhar();
    const k = s.jogadores.indexOf(s.fim);
    const fim = sala.querySelector(".fim");
    fim.querySelector("img").src = `assets/img/bots/${BOTS[k].img}.png`;
    fim.querySelector("h2").textContent = `${BOTS[k].nome} venceu`;
    fim.classList.add("on");
    await espera(4500);
    partida();
  }

  // ----- Controles -----
  const botaoPausa = sala.querySelector(".pausa");
  const pausar = () => { pausado = !pausado; botaoPausa.textContent = pausado ? "Continuar" : "Pausar"; };
  botaoPausa.addEventListener("click", pausar);
  sala.querySelectorAll("[data-vel]").forEach((b) => b.addEventListener("click", () => {
    vel = +b.dataset.vel;
    sala.querySelectorAll("[data-vel]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  }));
  addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P") pausar(); });

  partida();
})();
