// Exercícios da Fase 2: uma fonte só para a tela "Sua vez" da aula e para a
// página pratica.html, que a turma abre no notebook. Cada exercício tem os
// arquivos para baixar, o pedido para copiar e o que conferir na resposta.

window.EXERCICIOS = [
  {
    id: "lousa", problema: "No fim da reunião, você fotografou a lousa com as tarefas da semana. Precisa mandar a tabela para a equipe, e ninguém quer digitar.",
    nome: "A lousa", minutos: 5,
    arquivos: [{ arq: "foto-lousa.png", tam: "1,7 MB" }],
    previas: ["assets/img/pratica/lousa.jpg"],
    pedidos: ["Transforma essa foto do quadro numa tabela com as colunas tarefa, responsável e prazo."],
    conferir: ["Conte se a tabela tem 7 linhas.", "Compare cada nome e prazo com a foto."],
  },
  {
    id: "contrato", problema: "Você vai assinar o contrato de limpeza da sua padaria, de 5 páginas, e precisa entender valor, pagamento, multa e cancelamento antes de assinar.",
    nome: "O contrato", minutos: 10,
    arquivos: [{ arq: "contrato-servico-limpeza.pdf", tam: "12 KB" }],
    previas: ["assets/img/pratica/contrato.jpg"],
    pedidos: [
      "Vou assinar esse contrato de limpeza. Me explica em linguagem simples o que ele diz sobre o valor, o pagamento, a multa e o cancelamento, citando a cláusula de cada coisa.",
      "A empresa usa produtos ecológicos?",
    ],
    conferir: ["Abra o PDF na cláusula citada e veja se ela diz aquilo.", "Veja se a IA avisa quando o contrato não responde à pergunta."],
  },
  {
    id: "relatorio", problema: "A coordenadora de um programa de oficinas precisa mandar amanhã o relatório anual para a direção, e ninguém revisou o texto.",
    nome: "O relatório", minutos: 10,
    arquivos: [{ arq: "relatorio-mapas-na-escola.docx", tam: "37 KB" }],
    pedidos: [
      "Coordeno este programa e preciso mandar este relatório para a direção amanhã. Revise o texto: corrija os erros de português e me mostre numa tabela o que mudou (trecho original, correção e motivo). Depois, aponte qualquer informação que não bate entre uma parte e outra do relatório.",
      "Agora me devolva o relatório inteiro já corrigido, num arquivo do Word para eu baixar. Onde houver informação que não bate, deixe destacado entre colchetes para eu conferir antes de enviar.",
    ],
    conferir: ["Leia a tabela de correções: cada mudança tem motivo?", "Abra o Word gerado e veja se ele não acrescentou nada."],
  },
  {
    id: "planilha", problema: "A organizadora de um evento online recebeu a planilha do formulário de inscrição com cidades escritas de vários jeitos e gente inscrita duas vezes. Precisa saber quantas pessoas vêm de cada cidade.",
    nome: "A planilha", minutos: 10,
    arquivos: [{ arq: "inscricoes-evento.xlsx", tam: "12 KB" }],
    pedidos: [
      "Quero saber: quantas pessoas se inscreveram de cada cidade, por onde souberam do evento e em cada oficina? Tem alguém inscrito duas vezes? Faça um gráfico com as cidades. E me ensine a fórmula para eu fazer essa contagem sozinho no Excel da próxima vez.",
      "Ótimo. Agora me devolva a planilha arrumada para eu baixar: com as cidades padronizadas, sem as inscrições repetidas e com uma aba de resumo com as contagens de pessoas únicas.",
    ],
    conferir: ["A pergunta é quantas pessoas, não quantas linhas: veja se ele tirou os repetidos.", "Abra a planilha gerada e confira o gráfico."],
  },
  {
    id: "canvas", problema: "Seis colegas dividiram as despesas da confraternização de fim de ano do setor. A Elisa não foi ao almoço, e ninguém sabe quem deve quanto a quem.",
    nome: "A calculadora da confraternização", minutos: 10,
    arquivos: [],
    semArquivo: "Sem arquivo: as 8 despesas já vão no pedido.",
    pedidos: [
      "Quero uma calculadora interativa no Canvas pra dividir os gastos da confraternização de fim de ano do nosso setor. Já deixa preenchida com a lista abaixo, mas com os valores e as pessoas editáveis. Quero ver quanto cada um pagou, quanto deveria ter pago e quem transfere quanto pra quem, com uma conferência de que a conta fecha no final.\n\nDados:\n\nPessoas: Ana, Bruno, Carla, Diego, Elisa e Fábio.\n\nDespesas:\n- Almoço no restaurante — pagou Ana — R$ 780,00 — participaram Ana, Bruno, Carla, Diego e Fábio; Elisa não foi ao almoço.\n- Bolo e salgados — pagou Bruno — R$ 246,00 — todos os 6 participaram.\n- Refrigerantes e sucos — pagou Carla — R$ 89,40 — todos os 6 participaram.\n- Decoração da sala — pagou Diego — R$ 64,80 — todos os 6 participaram.\n- Presente de despedida da Lúcia, que se aposenta — pagou Elisa — R$ 210,00 — todos os 6 participaram.\n- Sorvete da sobremesa do almoço — pagou Fábio — R$ 72,00 — participaram Ana, Bruno, Carla, Diego e Fábio; Elisa não foi ao almoço.\n- Copos, pratos e guardanapos — pagou Elisa — R$ 38,40 — todos os 6 participaram.\n- Amigo secreto: embrulhos e etiquetas — pagou Carla — R$ 27,60 — todos os 6 participaram.\n\nCada despesa deve ser dividida em partes iguais só entre quem participou dela.",
    ],
    conferir: ["Mude um valor na tela e veja se tudo recalcula.", "Some as cotas: o resultado tem de ser o total da festa."],
  },
  {
    id: "cupons", problema: "Você precisa prestar contas de 9 comprovantes de viagem fotografados com o celular, e um dos cupons está desbotado.",
    nome: "Os comprovantes", minutos: 10,
    arquivos: [{ arq: "comprovantes.zip", tam: "1,6 MB", nota: "9 fotos; descompacte antes de anexar" }],
    previas: ["assets/img/pratica/cupom-03.jpg", "assets/img/pratica/cupom-05.jpg", "assets/img/pratica/cupom-01.jpg", "assets/img/pratica/cupom-08.jpg"],
    pedidos: ["Tenho 9 comprovantes de despesas de uma viagem. Quero uma tabela com data, estabelecimento, categoria e valor de cada um, e o total no final. Se algum nome ou valor estiver ilegível, escreva \"ilegível\" em vez de chutar."],
    conferir: ["Compare cada data e valor com o cupom, começando pelo desbotado.", "Some os valores e compare com o total da tabela."],
  },
];

(() => {
  const EX = window.EXERCICIOS;
  const porId = Object.fromEntries(EX.map((e) => [e.id, e]));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tipo = (arq) => arq.split(".").pop().toLowerCase();

  // Arquivo para baixar: ícone com a extensão, nome e tamanho.
  const chipArquivo = (a, base) =>
    `<a class="arquivo t-${tipo(a.arq)}" href="${base}pratica/${a.arq}" download>` +
    `<i>${tipo(a.arq)}</i><span><b>${esc(a.arq)}</b><small>${a.tam}${a.nota ? " · " + esc(a.nota) : ""}</small></span></a>`;

  async function copiar(botao, texto) {
    try { await navigator.clipboard.writeText(texto); }
    catch {
      const t = document.createElement("textarea"); t.value = texto; document.body.append(t); t.select();
      try { document.execCommand("copy"); } catch {} t.remove();
    }
    const antes = botao.textContent;
    botao.textContent = "Copiado"; botao.classList.add("ok");
    setTimeout(() => { botao.textContent = antes; botao.classList.remove("ok"); }, 1600);
  }

  // Bloco do pedido: o primeiro inteiro; os seguintes como "depois, peça".
  const blocoPedidos = (e) => e.pedidos.map((p, i) =>
    `<div class="pedido${i ? " depois" : ""}">` +
    (i ? `<span class="depois-rotulo">Depois, peça</span>` : "") +
    `<blockquote>${esc(p).replace(/\n/g, "<br>")}</blockquote>` +
    `<button type="button" class="copiar" data-i="${i}">Copiar</button></div>`).join("");

  // ----- Página da turma (pratica.html) -----
  window.montarPratica = (raiz) => {
    raiz.innerHTML = EX.map((e, n) => `
      <article class="exercicio" id="${e.id}">
        <header><span class="num">${n + 1}</span><h2>${esc(e.nome)}</h2><span class="tempo">${e.minutos} min</span></header>
        <p class="problema-texto">${esc(e.problema)}</p>
        <h3>1. Baixe</h3>
        <div class="arquivos">${e.arquivos.length ? e.arquivos.map((a) => chipArquivo(a, "")).join("") : `<p class="sem-arquivo">${esc(e.semArquivo)}</p>`}</div>
        <h3>2. Peça no chat de IA que você usa</h3>
        ${blocoPedidos(e)}
        <h3>3. Confira a resposta</h3>
        <ul class="conferir">${e.conferir.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      </article>`).join("");
    raiz.querySelectorAll(".exercicio").forEach((art) => {
      const e = porId[art.id];
      art.querySelectorAll(".copiar").forEach((b) => b.addEventListener("click", () => copiar(b, e.pedidos[+b.dataset.i])));
    });
  };

  // ----- Tela "Sua vez" da aula -----
  // O QR leva à página da prática no endereço público, já no exercício certo.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  const basePublica = local && window.CURSO_PUBLICO ? window.CURSO_PUBLICO : new URL(".", location.href).href;

  document.querySelectorAll(".sua-vez[data-exercicio]").forEach((el) => {
    const e = porId[el.dataset.exercicio];
    const cena = el.closest(".cena");
    const destino = new URL(`pratica.html#${e.id}`, basePublica);
    el.innerHTML = `
      <div class="sv-lado">
        <span class="rotulo">Sua vez · no seu notebook</span>
        <h2 class="titulo">Faça você</h2>
        <button type="button" class="relogio" aria-label="Cronômetro de ${e.minutos} minutos">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trilho-r" cx="60" cy="60" r="54"/><circle class="arco" cx="60" cy="60" r="54" pathLength="100"/></svg>
          <span class="leitura"><b>${e.minutos}:00</b><small>clique para começar · T</small></span>
        </button>
        <div class="sv-qr"><div class="qr-svg"></div><p>Arquivos e pedido no notebook:${[destino.host + "/", ...destino.pathname.slice(1).split(/(?<=\/)/)].map((t) => `<b>${esc(t)}</b>`).join("")}</p></div>
      </div>
      <div class="ficha">
        <div class="ficha-passo"><span class="n">1</span><div><h3>Baixe</h3>
          <div class="arquivos">${e.arquivos.length ? e.arquivos.map((a) => chipArquivo(a, "")).join("") : `<p class="sem-arquivo">${esc(e.semArquivo)}</p>`}</div></div>
          ${e.previas ? `<div class="previas n${e.previas.length}" aria-hidden="true">${e.previas.map((src) => `<img src="${src}" alt="">`).join("")}</div>` : ""}</div>
        <div class="ficha-passo"><span class="n">2</span><div><h3>Peça</h3>${blocoPedidos(e)}</div></div>
        <div class="ficha-passo"><span class="n">3</span><div><h3>Confira</h3><ul class="conferir">${e.conferir.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div></div>
      </div>`;

    if (window.qrcode) {
      const qr = qrcode(0, "M"); qr.addData(destino.href); qr.make();
      el.querySelector(".qr-svg").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }
    el.querySelectorAll(".copiar").forEach((b) => b.addEventListener("click", () => copiar(b, e.pedidos[+b.dataset.i])));

    // Cronômetro: clique (ou T) começa e pausa; dois cliques zeram. O arco esvazia até o fim.
    const relogio = el.querySelector(".relogio"), leitura = relogio.querySelector("b"), dica = relogio.querySelector("small");
    const arco = relogio.querySelector(".arco");
    const total = e.minutos * 60;
    let resta = total, rodando = false, ultimo = 0, raf = 0;
    const mostrar = () => {
      const s = Math.max(0, Math.ceil(resta));
      leitura.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      arco.style.strokeDashoffset = 100 - (100 * resta) / total;
      relogio.classList.toggle("acabou", resta <= 0);
      relogio.classList.toggle("rodando", rodando);
      dica.textContent = resta <= 0 ? "tempo!" : rodando ? "clique para pausar" : resta < total ? "pausado · clique para seguir" : "clique para começar · T";
    };
    const passo = (t) => {
      if (!rodando) return;
      resta -= (t - ultimo) / 1000; ultimo = t;
      if (resta <= 0) { resta = 0; rodando = false; }
      mostrar();
      if (rodando) raf = requestAnimationFrame(passo);
    };
    const alternar = () => {
      if (resta <= 0) resta = total;
      rodando = !rodando;
      if (rodando) { ultimo = performance.now(); raf = requestAnimationFrame(passo); } else cancelAnimationFrame(raf);
      mostrar();
    };
    const zerar = () => { rodando = false; cancelAnimationFrame(raf); resta = total; mostrar(); };
    relogio.addEventListener("click", alternar);
    relogio.addEventListener("dblclick", zerar);
    cena.addEventListener("tecla", (ev) => {
      if ((ev.detail.key === "t" || ev.detail.key === "T") && el.classList.contains("visto") && !el.classList.contains("passou")) { alternar(); ev.preventDefault(); }
    });
    cena.addEventListener("saiu", zerar);
    mostrar();
  });
})();
