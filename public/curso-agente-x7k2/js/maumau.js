// Mau-Mau do curso: regras e bots do jogo do Tabuleiro de Bolso (Pacman/client/maumau.js),
// reescritos para mostrar o motivo de cada jogada. Os bots seguem regras fixas,
// escritas por uma IA generativa; nenhum modelo é chamado durante a partida.
//
// Dois modos: "assistir" (4 bots, mãos à vista) e "jogar" (você contra 3 bots).

(() => {
  const CORES = ["vermelho", "azul", "verde", "amarelo"];
  const NOME_COR = { vermelho: "vermelho", azul: "azul", verde: "verde", amarelo: "amarelo" };
  const SIMBOLO = { skip: "⊘", reverse: "⇄", plus2: "+2", wild: "★", wild4: "+4" };

  // ---------- Regras (sem interface) ----------

  function baralho() {
    const b = [];
    let id = 1;
    for (const cor of CORES) {
      b.push({ id: id++, cor, valor: "0" });
      for (let k = 0; k < 2; k++) {
        for (let n = 1; n <= 9; n++) b.push({ id: id++, cor, valor: String(n) });
        for (const v of ["skip", "reverse", "plus2"]) b.push({ id: id++, cor, valor: v });
      }
    }
    for (let k = 0; k < 4; k++) {
      b.push({ id: id++, cor: "coringa", valor: "wild" });
      b.push({ id: id++, cor: "coringa", valor: "wild4" });
    }
    return embaralhar(b);
  }
  function embaralhar(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const ehNumero = (c) => /^\d$/.test(c.valor);
  const nomeCarta = (c) => c.cor === "coringa" ? (c.valor === "wild4" ? "+4" : "coringa")
    : ehNumero(c) ? `${c.valor} ${NOME_COR[c.cor]}`
    : `${{ skip: "pular", reverse: "inverter", plus2: "+2" }[c.valor]} ${NOME_COR[c.cor]}`;

  function novaPartida(jogadores) {
    const s = {
      monte: baralho(), descarte: [], jogadores: jogadores.map((j, i) => ({ ...j, i, mao: [] })),
      vez: 0, sentido: 1, acumulado: 0, corAtiva: null, gritou: {}, fim: null, comprouNaVez: false,
    };
    s.jogadores.forEach((j) => { j.mao = s.monte.splice(0, 7); });
    let primeira = s.monte.pop();
    while (primeira.valor === "wild4") { s.monte.unshift(primeira); primeira = s.monte.pop(); }
    s.descarte.push(primeira);
    s.corAtiva = primeira.cor === "coringa" ? CORES[Math.floor(Math.random() * 4)] : primeira.cor;
    if (primeira.valor === "skip") s.vez = proximo(s, 1);
    if (primeira.valor === "reverse") { s.sentido = -1; s.vez = proximo(s, 1); }
    if (primeira.valor === "plus2") s.acumulado = 2;
    return s;
  }
  const proximo = (s, passos = 1) => {
    const n = s.jogadores.length;
    return ((s.vez + passos * s.sentido) % n + n) % n;
  };
  const topo = (s) => s.descarte[s.descarte.length - 1];

  function jogavel(s, c) {
    if (s.acumulado > 0) return c.valor === "plus2" || c.valor === "wild4";
    if (c.cor === "coringa") return true;
    return c.cor === s.corAtiva || c.valor === topo(s).valor;
  }

  function comprar(s, j, n) {
    let k = 0;
    for (; k < n; k++) {
      if (!s.monte.length) {
        if (s.descarte.length <= 1) break;
        const t = s.descarte.pop();
        s.monte = embaralhar(s.descarte);
        s.descarte = [t];
      }
      j.mao.push(s.monte.pop());
    }
    if (k) delete s.gritou[j.i];
    return k;
  }

  // Joga a carta e devolve os eventos para o registro.
  function jogar(s, j, idx, corEscolhida) {
    const ev = [];
    const c = j.mao[idx];
    if (j.mao.length === 2 && j.bot && Math.random() < 0.85) { s.gritou[j.i] = true; ev.push({ tipo: "grito", texto: `${j.nome}: "Mau-Mau!"` }); }
    j.mao.splice(idx, 1);
    s.descarte.push(c);
    s.comprouNaVez = false;
    if (j.mao.length === 1 && !s.gritou[j.i]) {
      comprar(s, j, 2);
      ev.push({ tipo: "multa", texto: `${j.nome} esqueceu de dizer Mau-Mau: compra 2.` });
    }
    if (!j.mao.length) { s.fim = j; return ev; }
    if (c.cor === "coringa") s.corAtiva = corEscolhida;
    else s.corAtiva = c.cor;
    if (c.valor === "plus2") { s.acumulado += 2; s.vez = proximo(s, 1); }
    else if (c.valor === "wild4") { s.acumulado += 4; s.vez = proximo(s, 1); }
    else if (c.valor === "skip") s.vez = proximo(s, 2);
    else if (c.valor === "reverse") {
      if (s.jogadores.length === 2) s.vez = proximo(s, 2);
      else { s.sentido *= -1; s.vez = proximo(s, 1); }
    } else s.vez = proximo(s, 1);
    return ev;
  }

  // ---------- Os bots: regras fixas, cada uma com o seu motivo ----------

  function corPreferida(j) {
    const conta = { vermelho: 0, azul: 0, verde: 0, amarelo: 0 };
    j.mao.forEach((c) => { if (c.cor !== "coringa") conta[c.cor]++; });
    return Object.keys(conta).reduce((a, b) => (conta[a] >= conta[b] ? a : b));
  }

  function decidir(s, j, jogaveis) {
    const mao = j.mao;
    const prox = s.jogadores[proximo(s, 1)];
    const ameaca = prox.mao.length <= 2;
    const nc = `${prox.nome} tem ${prox.mao.length} carta${prox.mao.length > 1 ? "s" : ""}`;

    if (s.acumulado > 0) {
      const w4 = jogaveis.find((i) => mao[i].valor === "wild4");
      const p2 = jogaveis.find((i) => mao[i].valor === "plus2");
      if (ameaca && w4 !== undefined) return [w4, `Há +${s.acumulado} na mesa e ${nc}: empilha o +4.`];
      if (p2 !== undefined) return [p2, `Há +${s.acumulado} na mesa: devolve com +2 em vez de comprar.`];
      return [jogaveis[0], `Há +${s.acumulado} na mesa: devolve com +4 em vez de comprar.`];
    }
    const numeros = jogaveis.filter((i) => ehNumero(mao[i]));
    const especiais = jogaveis.filter((i) => mao[i].valor === "skip" || mao[i].valor === "reverse");
    const mais2 = jogaveis.filter((i) => mao[i].valor === "plus2");
    const coringas = jogaveis.filter((i) => mao[i].cor === "coringa");

    if (ameaca && mais2.length) return [mais2[0], `${nc}: segura com +2.`];
    if (ameaca) { const w4 = coringas.find((i) => mao[i].valor === "wild4"); if (w4 !== undefined) return [w4, `${nc}: segura com +4.`]; }
    const daCor = numeros.filter((i) => mao[i].cor === s.corAtiva).sort((a, b) => mao[b].valor - mao[a].valor);
    if (daCor.length) return [daCor[0], `Joga o maior número da cor da mesa e guarda os coringas.`];
    if (especiais.length) return [especiais[0], `Nenhum número da cor: usa uma carta especial.`];
    if (numeros.length) return [numeros[0], `Troca de cor com um número igual ao da mesa.`];
    const simples = coringas.find((i) => mao[i].valor === "wild");
    if (simples !== undefined) return [simples, `Só restam coringas: usa o simples e guarda o +4.`];
    return [jogaveis[0], `Só resta o +4.`];
  }

  // Um turno de bot. Devolve as linhas do registro.
  function turnoBot(s) {
    const j = s.jogadores[s.vez];
    const registro = [];
    const jogaveis = j.mao.map((c, i) => (jogavel(s, c) ? i : -1)).filter((i) => i >= 0);
    if (jogaveis.length) {
      const [idx, motivo] = decidir(s, j, jogaveis);
      const carta = j.mao[idx];
      let cor;
      if (carta.cor === "coringa") cor = corPreferida({ mao: j.mao.filter((_, k) => k !== idx) });
      registro.push({ quem: j.nome, carta: nomeCarta(carta), motivo: motivo + (cor ? ` Escolhe ${cor}, a cor que mais tem na mão.` : "") });
      registro.push(...jogar(s, j, idx, cor));
      return registro;
    }
    if (s.acumulado > 0) {
      const n = s.acumulado;
      comprar(s, j, n);
      s.acumulado = 0;
      s.vez = proximo(s, 1);
      registro.push({ quem: j.nome, carta: `compra ${n}`, motivo: `Não tem +2 nem +4 para devolver: compra ${n} e passa a vez.` });
      return registro;
    }
    comprar(s, j, 1);
    const nova = j.mao[j.mao.length - 1];
    if (nova && jogavel(s, nova)) {
      let cor;
      if (nova.cor === "coringa") cor = corPreferida({ mao: j.mao.slice(0, -1) });
      registro.push({ quem: j.nome, carta: nomeCarta(nova), motivo: `Nenhuma carta servia; comprou uma e ela serve.` + (cor ? ` Escolhe ${cor}.` : "") });
      registro.push(...jogar(s, j, j.mao.length - 1, cor));
    } else {
      s.vez = proximo(s, 1);
      registro.push({ quem: j.nome, carta: "compra 1", motivo: `Nenhuma carta servia; comprou uma e passou.` });
    }
    return registro;
  }

  // ---------- Interface ----------

  function criarMesa(raiz) {
    const el = (sel) => raiz.querySelector(sel);
    const lugares = [...raiz.querySelectorAll(".mm-lugar")];
    const registroEl = el(".mm-registro ol");
    const centro = el(".mm-centro");
    let s = null;
    let modo = "assistir";
    let velocidade = 1;
    let timer = 0;
    let ativo = false;
    let pausado = false;

    const nomesBots = ["Bia", "Caio", "Dani", "Edu"];

    function iniciar() {
      clearTimeout(timer);
      const js = modo === "assistir"
        ? nomesBots.map((n) => ({ nome: n, bot: true }))
        : [{ nome: "Você", bot: false }, ...nomesBots.slice(0, 3).map((n) => ({ nome: n, bot: true }))];
      s = novaPartida(js);
      registroEl.innerHTML = "";
      anotar({ quem: "Mesa", carta: nomeCarta(topo(s)), motivo: "Primeira carta do descarte." });
      desenhar();
      agendar();
    }

    function cartaHTML(c, extra = "") {
      const sim = ehNumero(c) ? c.valor : SIMBOLO[c.valor];
      return `<span class="mm-carta mm-${c.cor} ${extra}" aria-label="${nomeCarta(c)}"><b>${sim}</b></span>`;
    }

    function desenhar() {
      const humano = modo === "jogar";
      s.jogadores.forEach((j, k) => {
        const lugar = lugares[k];
        lugar.hidden = false;
        lugar.classList.toggle("mm-vez", s.vez === j.i && !s.fim);
        const visivel = !j.bot || modo === "assistir";
        const podeJogar = humano && !j.bot && s.vez === j.i && !s.fim;
        lugar.querySelector(".mm-nome").textContent = `${j.nome}${j.bot ? "" : ""}`;
        lugar.querySelector(".mm-qtd").textContent = `${j.mao.length} carta${j.mao.length === 1 ? "" : "s"}`;
        lugar.querySelector(".mm-mao").innerHTML = visivel
          ? j.mao.map((c, i) => podeJogar && jogavel(s, c)
              ? `<button type="button" class="mm-btn" data-i="${i}">${cartaHTML(c, "mm-pode")}</button>`
              : cartaHTML(c, podeJogar ? "mm-nao" : "")).join("")
          : `<span class="mm-verso">${j.mao.length}</span>`;
      });
      lugares.slice(s.jogadores.length).forEach((l) => { l.hidden = true; });
      centro.querySelector(".mm-topo").innerHTML = cartaHTML(topo(s), "mm-grande");
      centro.querySelector(".mm-cor").dataset.cor = s.corAtiva;
      centro.querySelector(".mm-cor").textContent = `cor da mesa: ${s.corAtiva}`;
      centro.querySelector(".mm-acum").textContent = s.acumulado ? `+${s.acumulado} acumulado` : "";
      centro.querySelector(".mm-sentido").textContent = s.sentido === 1 ? "a vez desce ↓" : "a vez sobe ↑";

      const voce = s.jogadores[0];
      const minhaVez = humano && s.vez === 0 && !s.fim;
      el(".mm-acoes").hidden = !humano;
      el(".mm-comprar").disabled = !minhaVez;
      el(".mm-comprar").textContent = s.acumulado && minhaVez ? `Comprar ${s.acumulado}` : s.comprouNaVez ? "Passar a vez" : "Comprar";
      el(".mm-gritar").disabled = !(minhaVez && voce.mao.length === 2 && !s.gritou[0]);
      el(".mm-gritar").classList.toggle("mm-gritou", !!s.gritou[0]);
      el(".mm-placar").textContent = s.fim
        ? `${s.fim.nome === "Você" ? "Você venceu" : s.fim.nome + " venceu"}. Nova partida em instantes.`
        : minhaVez ? (s.acumulado ? `Sua vez: devolva com +2 ou +4, ou compre ${s.acumulado}.` : "Sua vez: jogue uma das cartas em destaque.") : "";
    }

    function anotar(l) {
      const li = document.createElement("li");
      li.className = l.tipo ? `mm-${l.tipo}` : "";
      li.innerHTML = l.tipo ? `<span>${l.texto}</span>` : `<strong>${l.quem}</strong> <em>${l.carta}</em><span>${l.motivo}</span>`;
      registroEl.prepend(li);
      while (registroEl.children.length > 40) registroEl.lastChild.remove();
    }

    function agendar() {
      clearTimeout(timer);
      if (!ativo || pausado) return;
      if (s.fim) { timer = setTimeout(iniciar, 4200); return; }
      const j = s.jogadores[s.vez];
      if (!j.bot) return;
      const espera = (modo === "assistir" ? 1700 : 1100) / velocidade;
      timer = setTimeout(() => {
        turnoBot(s).forEach(anotar);
        desenhar();
        agendar();
      }, espera);
    }

    // Jogadas da pessoa
    raiz.addEventListener("click", (e) => {
      const b = e.target.closest(".mm-btn");
      if (!b || modo !== "jogar" || s.vez !== 0 || s.fim) return;
      const idx = +b.dataset.i;
      const c = s.jogadores[0].mao[idx];
      if (c.cor === "coringa") { escolherCor(idx); return; }
      jogarHumano(idx);
    });
    function escolherCor(idx) {
      const caixa = el(".mm-escolha");
      caixa.hidden = false;
      caixa.onclick = (e) => {
        const cor = e.target.closest("[data-cor]")?.dataset.cor;
        if (!cor) return;
        caixa.hidden = true;
        jogarHumano(idx, cor);
      };
    }
    function jogarHumano(idx, cor) {
      const voce = s.jogadores[0];
      const c = voce.mao[idx];
      anotar({ quem: "Você", carta: nomeCarta(c), motivo: cor ? `Escolheu ${cor}.` : "" });
      jogar(s, voce, idx, cor).forEach(anotar);
      desenhar(); agendar();
    }
    el(".mm-comprar").addEventListener("click", () => {
      if (modo !== "jogar" || s.vez !== 0 || s.fim) return;
      const voce = s.jogadores[0];
      if (s.acumulado) {
        const n = s.acumulado; comprar(s, voce, n); s.acumulado = 0; s.vez = proximo(s, 1);
        anotar({ quem: "Você", carta: `compra ${n}`, motivo: "" });
      } else if (s.comprouNaVez) {
        s.comprouNaVez = false; s.vez = proximo(s, 1);
        anotar({ quem: "Você", carta: "passa", motivo: "" });
      } else {
        comprar(s, voce, 1); s.comprouNaVez = true;
        if (!jogavel(s, voce.mao[voce.mao.length - 1])) { s.comprouNaVez = false; s.vez = proximo(s, 1); anotar({ quem: "Você", carta: "compra 1", motivo: "A carta não serve; passa a vez." }); }
      }
      desenhar(); agendar();
    });
    el(".mm-gritar").addEventListener("click", () => {
      if (s.vez !== 0) return;
      s.gritou[0] = true;
      anotar({ tipo: "grito", texto: `Você: "Mau-Mau!"` });
      desenhar();
    });

    // Controles
    raiz.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
      modo = b.dataset.modo;
      raiz.querySelectorAll("[data-modo]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      raiz.dataset.modo = modo;
      iniciar();
    }));
    raiz.querySelectorAll("[data-vel]").forEach((b) => b.addEventListener("click", () => {
      velocidade = +b.dataset.vel;
      raiz.querySelectorAll("[data-vel]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      agendar();
    }));
    el(".mm-pausa").addEventListener("click", () => {
      pausado = !pausado;
      el(".mm-pausa").textContent = pausado ? "Continuar" : "Pausar";
      agendar();
    });

    return {
      ligar() { ativo = true; if (!s) iniciar(); else agendar(); },
      desligar() { ativo = false; clearTimeout(timer); },
      tecla(k) {
        if (k === "p" || k === "P") { el(".mm-pausa").click(); return true; }
        if (k === "j" || k === "J") { raiz.querySelector(`[data-modo="${modo === "jogar" ? "assistir" : "jogar"}"]`).click(); return true; }
        return false;
      },
    };
  }

  window.criarMesaMauMau = criarMesa;
  window.MAUMAU_REGRAS = { novaPartida, turnoBot, jogavel }; // para testes
})();
