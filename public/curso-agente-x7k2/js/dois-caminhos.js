// Tela 10: a mesma tarefa pelo chat e pelo agente.
// O lado do agente reproduz uma gravação real (opencode, modelo gratuito DeepSeek V4.1 Flash,
// 28/10/2026; log em curso-ia/material/gravacao-2026-10-28/). Os tempos são os da gravação;
// o texto de cada linha é o passo traduzido e resumido. O lado do chat são passos típicos.
//
// Passos: 1 = começa o chat; 2 = o agente recebe o pedido e trabalha; 3 = o chat termina.

(() => {
  const tela = document.getElementById("dois-caminhos");
  if (!tela) return;

  // Contagem conservadora: anexar as 12 planilhas conta como uma ação só.
  const CHAT_1 = [
    ["1×", "anexa as 12 planilhas"],
    ["1×", "explica que julho veio em CSV (texto simples) e que há valores digitados como texto"],
  ];
  const CHAT_2 = [
    ["1×", "copia a tabela da resposta"],
    ["5×", "cola no Excel e arruma colunas, datas e formatos"],
    ["2×", "pede o gráfico e baixa a imagem"],
    ["3×", "confere os totais na calculadora"],
  ];
  const conta = (lista) => lista.reduce((s, [n]) => s + parseInt(n, 10), 0);

  // [segundo da gravação, texto, "fala" quando é o agente explicando]
  const GRAVACAO = [
    [0, "lista os arquivos da pasta"],
    [9, "confere se o Python tem as bibliotecas de planilha e gráfico"],
    [12, "abre as 11 planilhas e olha as primeiras linhas de cada uma"],
    [23, "abre o CSV de julho"],
    [42, "Os 12 meses estão aqui; julho é CSV. Vou juntar, acertando datas, valores em reais e cabeçalhos diferentes.", "fala"],
    [42, "escreve o programa que junta tudo"],
    [45, "roda: cria despesas-2026-completo.xlsx"],
    [51, "escreve e roda o programa do gráfico"],
    [59, "abre a imagem para ver o gráfico"],
    [64, "O subtítulo está encostando no título. Vou ajustar.", "fala"],
    [68, "corrige o espaçamento e gera o gráfico de novo"],
    [78, "confere a planilha e se os originais continuam intactos"],
    [84, "confere de novo, por outro caminho, os meses com valor em texto e o CSV"],
    [90, "Pronto. Total do ano: R$ 79.466,18.", "fala"],
  ];
  // No fim, o registro vira estes marcos (a gravação inteira fica na leitura).
  const MARCOS = [
    [0, "olhou a pasta e as 12 planilhas"],
    [42, "escreveu e rodou o programa que junta tudo"],
    [59, "olhou o próprio gráfico e corrigiu o título"],
    [78, "conferiu os totais e os originais, por dois caminhos"],
    [90, "entregou a planilha, o gráfico e o total", "fala"],
  ];
  const ACELERA = 7; // 90 s de gravação viram ~13 s na tela

  const acoes = tela.querySelector(".acoes");
  const nChat = tela.querySelector(".chat-lado .contador-acoes strong");
  const registro = tela.querySelector(".registro-vivo");
  const pedido = tela.querySelector(".pedido-mini");
  const resultado = tela.querySelector(".agente-resultado");
  const relogio = tela.querySelector(".relogio");
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  let timers = [];
  let tocou = false;
  const parar = () => { timers.forEach(clearTimeout); timers = []; };

  function desenharChat(passo) {
    const lista = passo >= 3 ? [...CHAT_1, ...CHAT_2] : passo >= 1 ? CHAT_1 : [];
    acoes.innerHTML = lista.map(([n, t]) => `<li><b>${n}</b>${t}</li>`).join("");
    nChat.textContent = conta(lista);
  }

  function linha([s, texto, tipo]) {
    const li = document.createElement("li");
    if (tipo) li.className = tipo;
    li.innerHTML = `<span class="t">${mmss(s)}</span>${texto}`;
    return li;
  }

  function mostrarTudo() {
    parar();
    registro.replaceChildren(...GRAVACAO.map(linha));
    relogio.textContent = mmss(90);
    resultado.classList.remove("esperando");
    tocou = true;
  }

  function tocar() {
    parar();
    registro.replaceChildren();
    resultado.classList.add("esperando");
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) { mostrarTudo(); return; }
    const inicio = performance.now();
    const tique = () => {
      const s = Math.min(90, ((performance.now() - inicio) / 1000) * ACELERA);
      relogio.textContent = mmss(s);
      if (s < 90) timers.push(setTimeout(tique, 100));
    };
    tique();
    GRAVACAO.forEach((g, i) => timers.push(setTimeout(() => {
      registro.append(linha(g));
      // No projetor cabem as últimas linhas; as antigas saem por cima.
      while (document.body.classList.contains("aula") && registro.scrollHeight > registro.clientHeight && registro.children.length > 1) registro.firstChild.remove();
      if (i === GRAVACAO.length - 1) resultado.classList.remove("esperando");
    }, (g[0] * 1000) / ACELERA)));
    tocou = true;
  }

  const corpo = tela.querySelector(".agente-corpo");
  const lado = tela.querySelector(".agente-lado");

  function resumir() {
    parar();
    registro.replaceChildren(...MARCOS.map(linha));
    relogio.textContent = mmss(90);
    resultado.classList.remove("esperando");
    corpo.classList.add("resumo");
  }

  function aplicar(passo) {
    desenharChat(passo);
    pedido.style.visibility = passo >= 2 ? "visible" : "hidden";
    lado.classList.toggle("com-pedido", passo >= 2);
    // Na leitura, quem dispara a gravação é a rolagem (evento "entrou"), não o carregamento.
    if (!document.body.classList.contains("aula")) { lado.classList.add("com-pedido"); return; }
    corpo.classList.toggle("resumo", passo >= 3);
    if (passo < 2) { parar(); registro.replaceChildren(); relogio.textContent = "0:00"; resultado.classList.add("esperando"); tocou = false; }
    else if (passo >= 3) { resumir(); tocou = true; }
    else if (!tocou) tocar();
  }

  tela.addEventListener("passo", (e) => aplicar(e.detail.passo));
  // Ao sair da tela na aula, a gravação volta ao começo: quem voltar à tela vê de novo.
  tela.addEventListener("saiu", () => { parar(); if (document.body.classList.contains("aula")) tocou = false; });
  // Na leitura, a gravação toca uma vez quando a tela aparece.
  tela.addEventListener("entrou", (e) => { if (e.detail?.origem === "rolagem" && !tocou) tocar(); });
  aplicar(0);
})();
