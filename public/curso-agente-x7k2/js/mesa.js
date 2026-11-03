// A mesa de Uno: quatro robôs jogam sozinhos, com as mãos à vista.
// As regras do jogo vêm de js/maumau.js. Cada robô tem uma ficha de três regras,
// conferidas de cima para baixo: a primeira que servir decide a jogada. Nenhuma IA
// é chamada durante a partida; o balão mostra a ficha e acende a regra usada.

(() => {
  const R = window.MAUMAU_REGRAS;
  const sala = document.querySelector(".sala");
  // ----- As fichas: cada regra devolve a carta escolhida (índice na mão) ou nada -----
  const val = (j, i) => j.mao[i].valor;
  const numero = (j, i) => R.ehNumero(j.mao[i]);
  const maior = (j, lista) => lista.sort((a, b) => val(j, b) - val(j, a))[0];
  const ESPECIAL = ["skip", "reverse", "plus2"];
  function corQueMaisTem(mao) {
    const conta = {};
    mao.forEach((c) => { if (c.cor !== "coringa") conta[c.cor] = (conta[c.cor] || 0) + 1; });
    return Object.keys(conta).sort((a, b) => conta[b] - conta[a])[0];
  }
  // Ordem de recurso de qualquer ficha: número, especial, coringa simples, +4.
  const qualquer = (j, jog) => maior(j, jog.filter((i) => numero(j, i)))
    ?? jog.find((i) => ESPECIAL.includes(val(j, i))) ?? jog.find((i) => val(j, i) === "wild") ?? jog[0];

  const BOTS = [
    { nome: "Bia", img: "bia", cor: "#c4502a", jeito: "a atacante", ficha: [
      ["Tenho +2, +4 ou pular? Jogo agora.", (s, j, jog) => jog.find((i) => ["plus2", "wild4", "skip"].includes(val(j, i)))],
      ["Senão, o maior número da cor da mesa.", (s, j, jog) => maior(j, jog.filter((i) => numero(j, i) && j.mao[i].cor === s.corAtiva))],
      ["Senão, qualquer carta que sirva.", (s, j, jog) => qualquer(j, jog)],
    ] },
    { nome: "Caio", img: "caio", cor: "#1d3f5f", jeito: "o cuidadoso", ficha: [
      ["O próximo tem 2 cartas ou menos? Seguro ele com +2, pular ou +4.", (s, j, jog) => s.jogadores[R.proximo(s, 1)].mao.length <= 2
        ? jog.find((i) => val(j, i) === "plus2") ?? jog.find((i) => val(j, i) === "skip") ?? jog.find((i) => val(j, i) === "wild4") : undefined],
      ["Senão, o maior número que servir.", (s, j, jog) => maior(j, jog.filter((i) => numero(j, i)))],
      ["Senão, carta especial; coringa só no fim.", (s, j, jog) => qualquer(j, jog)],
    ] },
    { nome: "Dani", img: "dani", cor: "#2b7055", jeito: "a colorida", ficha: [
      ["Dá para mudar para a cor que eu mais tenho? Mudo.", (s, j, jog) => {
        const minha = corQueMaisTem(j.mao);
        return minha !== s.corAtiva ? jog.find((i) => j.mao[i].cor === minha) : undefined;
      }],
      ["Senão, o maior número que servir.", (s, j, jog) => maior(j, jog.filter((i) => numero(j, i)))],
      ["Senão, especial ou coringa, pedindo a minha cor.", (s, j, jog) => qualquer(j, jog)],
    ] },
    { nome: "Edu", img: "edu", cor: "#c9971a", jeito: "o guardador", ficha: [
      ["Tenho número que sirva? Jogo e guardo as especiais.", (s, j, jog) => maior(j, jog.filter((i) => numero(j, i)))],
      ["Senão, pular, inverter ou +2.", (s, j, jog) => jog.find((i) => ESPECIAL.includes(val(j, i)))],
      ["Coringa só em último caso.", (s, j, jog) => qualquer(j, jog)],
    ] },
  ];
  // Regras do próprio Uno, iguais para todos (não são da ficha).
  const REGRA_UNO = { acumulado: (n) => `Regra do Uno: há +${n} na mesa. Quem tem +2 ou +4 devolve; quem não tem, compra.` };

  // A decisão de um robô: confere a ficha de cima para baixo.
  function decisorDe(bot) {
    return (s, j, jog) => {
      if (s.acumulado > 0) {
        const i = jog.find((k) => val(j, k) === "plus2") ?? jog[0];
        return [i, REGRA_UNO.acumulado(s.acumulado), -1];
      }
      for (let r = 0; r < bot.ficha.length; r++) {
        const i = bot.ficha[r][1](s, j, jog);
        if (i !== undefined) return [i, bot.ficha[r][0], r];
      }
    };
  }
  const COR_CSS = { vermelho: "#c4502a", azul: "#3f7bb0", verde: "#3f9a72", amarelo: "#e0b030" };
  // Onde fica a mão de cada lugar (centro, em px do quadro) e onde o balão aparece.
  const MAOS = [{ x: 400, y: 470 }, { x: 800, y: 228 }, { x: 1200, y: 470 }, { x: 800, y: 700 }];
  const BALOES = [{ left: 30, top: 614 }, { left: 990, top: 24 }, { left: 1130, top: 614 }, { left: 990, bottom: 24 }];
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
    el.innerHTML = `<div class="avatar"><img src="assets/img/bots/${b.img}.png" alt="${b.nome}, ${b.jeito}"></div><div class="nome">${b.nome}<em>${b.jeito}</em><small></small></div>`;
    sala.append(el);
    const mao = document.createElement("div"); mao.className = "mao"; sala.append(mao);
    const balao = document.createElement("div"); balao.className = "balao"; balao.style.setProperty("--cor", b.cor);
    for (const [k, v] of Object.entries(BALOES[i])) balao.style[k] = v + "px";
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
  // O balão com a ficha inteira: a regra usada acende, as outras ficam apagadas.
  // `usada` = -1 quando quem decidiu foi a regra do jogo, não a ficha.
  function mostrarFicha(i, usada, jogada, extra = "") {
    const bot = BOTS[i];
    const linhas = bot.ficha.map(([texto], r) =>
      `<li class="${r === usada ? "usada" : r < usada ? "passou" : ""}">${texto}</li>`).join("");
    falar(i, `Ficha de ${bot.nome}`, `<ol>${linhas}</ol>${extra ? `<p class="extra">${extra}</p>` : ""}<p class="jogada">${jogada}</p>`);
  }

  async function turno() {
    const i = s.vez, j = s.jogadores[i];
    desenhar();
    falar(i, j.nome, "…");
    await espera(650);
    const antes = new Set(j.mao.map((c) => c.id));
    const pos = new Map(j.mao.map((c, k) => [c.id, posMao(i, k, j.mao.length)]));
    const topoAntes = R.topo(s);
    const acumAntes = s.acumulado;
    const registro = R.turnoBot(s, decisorDe(BOTS[i]));
    const novoTopo = R.topo(s);
    const jogou = novoTopo !== topoAntes && !j.mao.includes(novoTopo) ? novoTopo : null;
    const compradas = j.mao.filter((c) => !antes.has(c.id));
    const multa = registro.some((r) => r.tipo === "multa");
    const grito = registro.find((r) => r.tipo === "grito");
    const principal = registro.find((r) => r.quem) || {};

    // Compra antes de jogar (quando não tinha carta que servisse); a multa vem depois.
    const comprasAntes = multa ? [] : compradas, comprasDepois = multa ? compradas : [];
    for (const c of comprasAntes) await voar(`<div class="carta costas" style="--w:96px"></div>`, MONTE, { ...MAOS[i], x: MAOS[i].x - 48, y: MAOS[i].y - 70, escala: .55 });
    if (grito) { falar(i, j.nome, "Uno!", true); await espera(900); }
    if (jogou) {
      const de = pos.get(jogou.id) || { x: MAOS[i].x - 25, y: MAOS[i].y - 36 };
      await voar(cartaHTML(jogou, 50), de, { x: DESCARTE.x + 30, y: DESCARTE.y + 44, escala: 2.2 }, ((jogou.id * 37) % 24 - 12) / 3);
    }
    desenhar();
    const comprou = (principal.carta || "").startsWith("compra");
    if (principal.regra >= 0) mostrarFicha(i, principal.regra, `Jogou ${principal.carta}${principal.cor ? `, pedindo ${principal.cor}` : ""}.`);
    else if (principal.regra === -1) mostrarFicha(i, -1, `Devolveu com ${principal.carta}.`, REGRA_UNO.acumulado(acumAntes));
    else if (comprou && acumAntes) mostrarFicha(i, -1, `Comprou ${acumAntes} e passou a vez.`, REGRA_UNO.acumulado(acumAntes));
    else mostrarFicha(i, -1, comprou ? "Comprou uma e passou a vez." : `Comprou uma, ela serviu: jogou ${principal.carta}.`,
      "Regra do Uno: nenhuma carta da mão servia, então comprou do monte.");
    for (const c of comprasDepois) await voar(`<div class="carta costas" style="--w:96px"></div>`, MONTE, { x: MAOS[i].x - 48, y: MAOS[i].y - 70, escala: .55 });
    if (multa) { falar(i, j.nome, "Esqueceu de dizer Uno: compra 2."); desenhar(); await espera(1400); }
    await espera(2700);
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
