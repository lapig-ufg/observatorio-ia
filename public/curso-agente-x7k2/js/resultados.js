// Painel de resultado da Fase 2 (passo 3 de cada exemplo): a resposta real do
// Gemini, grande e legível, ao lado do que serve para conferi-la (a foto, o
// cupom, a cláusula do contrato). O vídeo mostra que aconteceu; o painel mostra
// o que saiu. Clicar numa linha ou cartão troca o que aparece à direita.

window.RESULTADOS = {
  lousa: {
    titulo: "As 7 linhas, conferidas com a foto",
    fonte: "Resposta do Gemini, copiada da conversa · 3 nov. 2026",
    tipo: "lousa",
    foto: "assets/img/resultado/lousa.jpg",
    colunas: ["Tarefa", "Responsável", "Prazo"],
    linhas: [
      ["Confirmar salão", "Ana", "12/11"], ["Comprar café e copos", "Bruno", "10/11"],
      ["Revisar convidados", "Carla", "11/11"], ["Imprimir crachás", "Diego", "13/11"],
      ["Fechar o caixa", "Elisa", "14/11"], ["Orçamento do ônibus", "Ana", "17/11"],
      ["Organizar depósito", "Bruno", "18/11"],
    ],
    placar: "7 de 7 iguais à foto",
  },

  contrato: {
    titulo: "Cada resposta, conferida no contrato",
    fonte: "Trechos da resposta do Gemini, copiados da conversa · 3 nov. 2026",
    tipo: "contrato",
    itens: [
      { tema: "Valor", disse: "“O serviço custa R$ 4.850,00 por mês, valor que já inclui a mão de obra, os equipamentos, os produtos de limpeza e todos os encargos trabalhistas.”", clausula: "3.1",
        texto: "O valor mensal dos serviços é de <mark>R$ 4.850,00</mark> (quatro mil, oitocentos e cinquenta reais), com mão de obra, materiais, produtos de limpeza, equipamentos e encargos trabalhistas já incluídos.", ok: true },
      { tema: "Pagamento", disse: "“O pagamento da mensalidade deve ser feito até o dia 10 do mês seguinte ao da prestação do serviço, mediante transferência bancária […].”", clausula: "3.2",
        texto: "O pagamento é feito <mark>até o dia 10 do mês seguinte</mark> ao mês em que o serviço foi prestado, por transferência bancária, com o comprovante enviado ao e-mail da contratada.", ok: true },
      { tema: "Multa por atraso", disse: "“Caso ocorra atraso na mensalidade, será cobrada multa de 2% sobre o valor em aberto, mais juros de 1% ao mês calculados proporcionalmente aos dias de atraso.”", clausula: "3.3",
        texto: "Em caso de atraso no pagamento, a contratante paga <mark>multa de 2%</mark> sobre o valor devido, mais <mark>juros de 1% ao mês</mark>, calculados proporcionalmente aos dias de atraso (pro rata die).", ok: true },
      { tema: "Cancelamento", disse: "“Se a Contratante (Padaria) rescindir sem justa causa, pagará multa de 3 mensalidades, totalizando R$ 14.550,00.”", clausula: "9.1",
        texto: "A contratante pode rescindir o contrato sem justa causa antes do fim do prazo, a qualquer tempo, com o pagamento de <mark>multa de 3 mensalidades, no valor de R$ 14.550,00</mark>. Nesse caso, não há aviso prévio.", ok: true },
      { tema: "Produtos ecológicos?", disse: "“O contrato não especifica se os produtos de limpeza utilizados são ecológicos ou sustentáveis.”", clausula: "4.2",
        texto: "A contratada deve fornecer <mark>todos os materiais, produtos e equipamentos necessários</mark>, inclusive aspirador, carrinho, panos e produtos de higiene.<br><br>É a cláusula que ele citou. Ela não diz de que tipo são os produtos, e nenhuma outra fala em produto ecológico.", ok: true, semResposta: true },
    ],
    nota: "Ele citou também outras cláusulas (reajuste, serviços extras, faltas, renovação e rescisão). Conferimos todas no contrato: nenhuma inventada.",
  },

  cupons: {
    titulo: "Cada linha, conferida com o cupom",
    fonte: "Resposta do Gemini, copiada da conversa · 3 nov. 2026",
    tipo: "cupons",
    colunas: ["Data", "Estabelecimento", "Categoria", "Valor (R$)"],
    linhas: [
      { c: ["19/07/2025", "FL Empreendimentos Comerciais LTDA", "Alimentação", "88,00"], img: 1, estado: "erro",
        nota: "No cupom, o dia está apagado: dá para ler só <b>1?/07/2025</b>. Na tabela, ele escreveu <b>19/07/2025</b> sem avisar, embora o pedido mandasse escrever “ilegível”.", lupa: "assets/img/resultado/cupom-01-data.jpg" },
      { c: ["12/07/2025", "Espeto do Vizinho", "Alimentação", "30,00"], img: 2, estado: "atencao",
        nota: "Valor e data certos. Mas o papel diz “não é documento fiscal” (é a conferência da conta), e ele não avisou." },
      { c: ["24/06/2025", "Valente e Calife Comércio de Alimentos", "Alimentação", "30,90"], img: 3, estado: "ok",
        nota: "Certo: R$ 30,90, mesmo com a coluna do valor cortada na foto." },
      { c: ["30/06/2025", "Dufry do Brasil Duty Free Shop Ltda", "Alimentação", "65,70"], img: 4, estado: "ok",
        nota: "Certo: usou o total impresso, R$ 65,70. Os quatro itens somam R$ 65,72." },
      { c: ["14/10/2024", "Nico Panificadora", "Alimentação", "39,90"], img: 5, estado: "ok", nota: "Certo." },
      { c: ["15/10/2024", "Nico Panificadora", "Alimentação", "51,34"], img: 6, estado: "ok", nota: "Certo, inclusive o item vendido por quilo." },
      { c: ["16/10/2024", "Nico Panificadora", "Alimentação", "40,90"], img: 7, estado: "ok", nota: "Certo, inclusive o almoço por quilo." },
      { c: ["17/10/2024", "Vila do Grão", "Alimentação", "73,70"], img: 8, estado: "ok",
        nota: "Certo: R$ 73,70 com os 10% de serviço, apesar de o cupom escrever “serviço (0%)”." },
      { c: ["18/10/2024", "Village Residence Hotelaria LTDA - ME", "Hospedagem", "15,00"], img: 9, estado: "ok",
        nota: "Certo. Não é um cupom: é a nota fiscal de serviço do hotel, em folha A4." },
    ],
    total: "435,44",
    nota: "Antes disso, na primeira vez, ele recusou: “Sou uma IA com base em texto.” Ao pedir de novo, fez a tabela.",
  },

  // Entram depois da regravação, com a resposta nova.
  relatorio: { titulo: "A tabela de correções e o Word devolvido", tipo: "depois",
    plano: "Aqui entra a tabela de correções que ele fizer, com cada um dos 10 problemas plantados marcado como achado ou não, e o Word devolvido aberto ao lado, com o que ele acrescentou sem ninguém pedir em destaque." },
  planilha: { titulo: "As contagens, conferidas com a planilha", tipo: "depois",
    plano: "Aqui entram as contagens que ele fizer (por cidade, por canal e por oficina) ao lado das contagens certas, com 150 pessoas e não 159 linhas, e a fórmula que ele ensinar." },
  canvas: { titulo: "A calculadora, funcionando aqui", tipo: "depois",
    plano: "Aqui entra a própria calculadora que o Gemini criar, copiada do Canvas e funcionando dentro da aula: dá para trocar o valor do almoço ao vivo e ver tudo recalcular." },
};

(() => {
  const R = window.RESULTADOS;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icone = { ok: "✓", atencao: "!", erro: "?" };

  const cabeca = (d) => `
    <header class="res-cabeca">
      <div><span class="rotulo">O resultado</span><h2 class="titulo">${esc(d.titulo)}</h2></div>
      <div class="res-acoes">${d.fonte ? `<span class="res-fonte">${esc(d.fonte)}</span>` : ""}
        <button type="button" class="res-rever">▶ Rever a gravação</button></div>
    </header>`;

  const montar = {
    lousa: (d) => `
      <div class="res-corpo res-lousa">
        <figure class="res-foto"><img src="${d.foto}" alt="Foto da lousa com as tarefas da semana"><figcaption>A foto enviada</figcaption></figure>
        <div class="res-papel">
          <table class="res-tabela"><thead><tr>${d.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}<th></th></tr></thead>
          <tbody>${d.linhas.map((l, i) => `<tr style="--i:${i}">${l.map((c) => `<td>${esc(c)}</td>`).join("")}<td class="marca ok">✓</td></tr>`).join("")}</tbody></table>
          <p class="res-placar ok">${esc(d.placar)}</p>
        </div>
      </div>`,

    contrato: (d) => `
      <div class="res-corpo res-contrato">
        <div class="res-lista">${d.itens.map((it, i) => `
          <button type="button" class="res-item${it.semResposta ? " sem" : ""}" data-i="${i}">
            <b>${esc(it.tema)}</b><span>${esc(it.disse)}</span>
            <em>${it.clausula ? `cláusula ${it.clausula}` : "nenhuma cláusula"}</em></button>`).join("")}
          <p class="res-nota">${esc(d.nota)}</p>
        </div>
        <div class="res-papel res-clausula" aria-live="polite"></div>
      </div>`,

    cupons: (d) => `
      <div class="res-corpo res-cupons">
        <div class="res-papel">
          <table class="res-tabela clicavel"><thead><tr><th></th>${d.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${d.linhas.map((l, i) => `<tr class="${l.estado}" data-i="${i}" tabindex="0"><td class="marca ${l.estado}">${icone[l.estado]}</td>${l.c.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
          <tfoot><tr><td class="marca ok">✓</td><td>Total</td><td></td><td></td><td>${d.total}</td></tr></tfoot></table>
          <p class="res-nota">${esc(d.nota)}</p>
        </div>
        <div class="res-cupom" aria-live="polite"></div>
      </div>`,

    depois: (d) => `
      <div class="res-corpo res-depois"><div class="res-papel"><span class="res-selo">entra depois da regravação</span><p>${esc(d.plano)}</p></div></div>`,
  };

  document.querySelectorAll(".resultado[data-resultado]").forEach((el) => {
    const d = R[el.dataset.resultado];
    const cena = el.closest(".cena");
    el.innerHTML = cabeca(d) + montar[d.tipo](d);
    el.querySelector(".res-rever").addEventListener("click", () => window.PALCO.ir(window.PALCO.cenas.indexOf(cena), 2));

    if (d.tipo === "contrato") {
      const alvo = el.querySelector(".res-clausula"), itens = [...el.querySelectorAll(".res-item")];
      const mostrar = (i) => {
        const it = d.itens[i];
        itens.forEach((b, k) => b.classList.toggle("sel", k === i));
        alvo.innerHTML = `<span class="res-onde">${it.clausula ? `No contrato, cláusula ${it.clausula}` : "No contrato"}</span>
          <p class="res-texto">${it.texto}</p>
          <p class="res-veredito ok">✓ ${it.semResposta ? "Certo: o contrato não fala disso, e ele não inventou." : "Confere com o contrato."}</p>`;
      };
      itens.forEach((b, i) => b.addEventListener("click", () => mostrar(i)));
      mostrar(0);
    }

    if (d.tipo === "cupons") {
      const alvo = el.querySelector(".res-cupom"), linhas = [...el.querySelectorAll("tbody tr")];
      const mostrar = (i) => {
        const l = d.linhas[i];
        linhas.forEach((tr, k) => tr.classList.toggle("sel", k === i));
        alvo.innerHTML = `<div class="res-cupom-img"><img src="assets/img/resultado/cupom-${String(l.img).padStart(2, "0")}.jpg" alt="Comprovante ${l.img}, com dados pessoais cobertos">
            ${l.lupa ? `<div class="res-lupa"><img src="${l.lupa}" alt="A data do cupom, ampliada"></div>` : ""}</div>
          <div class="res-cupom-nota ${l.estado}"><span>Comprovante ${l.img} de 9</span><p>${l.nota}</p></div>`;
      };
      linhas.forEach((tr, i) => {
        tr.addEventListener("click", () => mostrar(i));
        tr.addEventListener("keydown", (e) => { if (e.key === "Enter") { mostrar(i); e.stopPropagation(); } });
      });
      mostrar(0);
    }

    // R na cena leva ao resultado; o botão "Ver o resultado" do exemplo gravado faz o mesmo.
    const ir = () => window.PALCO.ir(window.PALCO.cenas.indexOf(cena), 3);
    cena.querySelector(".ver-resultado")?.addEventListener("click", ir);
    cena.addEventListener("tecla", (e) => { if (e.detail.key === "r" || e.detail.key === "R") { ir(); e.preventDefault(); } });
  });
})();
