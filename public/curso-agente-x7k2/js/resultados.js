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
      { tema: "Valor", disse: "“O valor do serviço é de R$ 4.850,00 por mês, já cobrindo a mão de obra, produtos, equipamentos e encargos.”", clausula: "3.1",
        texto: "O valor mensal dos serviços é de <mark>R$ 4.850,00</mark> (quatro mil, oitocentos e cinquenta reais), com mão de obra, materiais, produtos de limpeza, equipamentos e encargos trabalhistas já incluídos.", ok: true },
      { tema: "Pagamento", disse: "“Deve ser quitado até o dia 10 do mês seguinte ao serviço realizado, via transferência bancária, com o comprovante enviado por e-mail.”", clausula: "3.2",
        texto: "O pagamento é feito <mark>até o dia 10 do mês seguinte</mark> ao mês em que o serviço foi prestado, por transferência bancária, com o comprovante enviado ao e-mail da contratada.", ok: true },
      { tema: "Multa por atraso", disse: "“Aplica-se multa de 2% sobre o valor em atraso, mais juros de 1% ao mês calculados proporcionalmente por dia de atraso.”", clausula: "3.3",
        texto: "Em caso de atraso no pagamento, a contratante paga <mark>multa de 2%</mark> sobre o valor devido, mais <mark>juros de 1% ao mês</mark>, calculados proporcionalmente aos dias de atraso (pro rata die).", ok: true },
      { tema: "Cancelamento", disse: "“Pode cancelar a qualquer momento sem aviso prévio, mas pagando uma multa equivalente a 3 mensalidades (R$ 14.550,00).”", clausula: "9.1",
        texto: "A contratante pode rescindir o contrato sem justa causa antes do fim do prazo, a qualquer tempo, com o pagamento de <mark>multa de 3 mensalidades, no valor de R$ 14.550,00</mark>. Nesse caso, não há aviso prévio.", ok: true },
      { tema: "Produtos ecológicos?", disse: "“O contrato não menciona nem exige a utilização de produtos ecológicos, sustentáveis ou biodegradáveis.”", clausula: "4.2",
        texto: "A contratada deve fornecer <mark>todos os materiais, produtos e equipamentos necessários</mark>, inclusive aspirador, carrinho, panos e produtos de higiene.<br><br>É a cláusula que ele citou. Ela não diz de que tipo são os produtos, e nenhuma outra fala em produto ecológico.", ok: true, semResposta: true },
    ],
    nota: "Ele citou também outras cláusulas (reajuste, serviços extras, faltas, abatimento de multas, renovação e rescisão). Conferimos todas no contrato: nenhuma inventada.",
  },

  cupons: {
    titulo: "Cada linha, conferida com o cupom",
    fonte: "Resposta do Gemini, copiada da conversa · 3 nov. 2026",
    tipo: "cupons",
    colunas: ["Data", "Estabelecimento", "Categoria", "Valor (R$)"],
    linhas: [
      { c: ["13/07/2025", "FL Empreendimentos Comerciais Ltda", "Alimentação", "88,00"], img: 1, estado: "ok",
        nota: "Certo: o dia está desbotado, mas dá para ler <b>13/07/2025</b>. Num teste anterior, a mesma foto virou <b>19/07</b>, sem nenhum aviso. Por isso vale abrir o cupom quando a foto é ruim.", lupa: "assets/img/resultado/cupom-01-data.jpg" },
      { c: ["12/07/2025", "Espeto do Vizinho", "Alimentação", "30,00"], img: 2, estado: "atencao",
        nota: "Valor e data certos. Mas o papel diz “não é documento fiscal” (é a conferência da conta), e ele não avisou." },
      { c: ["24/06/2025", "Valente e Calife Comércio de Alimento", "Alimentação", "30,90"], img: 3, estado: "ok",
        nota: "Certo: R$ 30,90, mesmo com a coluna do valor cortada na foto." },
      { c: ["30/06/2025", "Dufry do Brasil Duty Free Shop Ltda", "Alimentação", "65,70"], img: 4, estado: "ok",
        nota: "Certo: usou o total impresso, R$ 65,70. Os quatro itens somam R$ 65,72." },
      { c: ["14/10/2024", "Nico Panificadora", "Alimentação", "39,90"], img: 5, estado: "ok", nota: "Certo." },
      { c: ["15/10/2024", "Nico Panificadora", "Alimentação", "51,34"], img: 6, estado: "ok", nota: "Certo, inclusive o item vendido por quilo." },
      { c: ["16/10/2024", "Nico Panificadora", "Alimentação", "40,90"], img: 7, estado: "ok", nota: "Certo, inclusive o almoço por quilo." },
      { c: ["17/10/2024", "Vila do Grão", "Alimentação", "73,70"], img: 8, estado: "ok",
        nota: "Certo: R$ 73,70 com os 10% de serviço, apesar de o cupom escrever “serviço (0%)”." },
      { c: ["18/10/2024", "Village Residence Hotelaria Ltda", "Hospedagem", "15,00"], img: 9, estado: "ok",
        nota: "Certo. Não é um cupom: é a nota fiscal de serviço do hotel, em folha A4." },
    ],
    total: "435,44",
    nota: "Desta vez ele não recusou. Em testes anteriores, a primeira resposta foi “Sou uma IA com base em texto”, e ele fez a tabela quando pedimos de novo.",
  },

  relatorio: {
    titulo: "Os 10 problemas, conferidos",
    fonte: "Respostas do Gemini, copiadas da conversa · 3 nov. 2026",
    tipo: "lista",
    itens: [
      { tema: "Erros de português", marca: "7 de 7", estado: "ok",
        disse: "Achou os 7 e mostrou cada um numa tabela, com o motivo.",
        onde: "O que ele corrigiu",
        detalhe: `<table class="res-tabela texto"><thead><tr><th>No relatório</th><th>Correção</th><th></th></tr></thead><tbody>
          <tr><td>Fazem dois anos</td><td>Faz dois anos</td><td class="marca ok">✓</td></tr>
          <tr><td>as oficinas aconteceu</td><td>as oficinas aconteceram</td><td class="marca ok">✓</td></tr>
          <tr><td>Concerteza</td><td>Com certeza</td><td class="marca ok">✓</td></tr>
          <tr><td>previlégio</td><td>privilégio</td><td class="marca ok">✓</td></tr>
          <tr><td>mau atendidos</td><td>mal atendidos</td><td class="marca ok">✓</td></tr>
          <tr><td>Haviam muitas dúvidas</td><td>Havia muitas dúvidas</td><td class="marca ok">✓</td></tr>
          <tr><td>excessão</td><td>exceção</td><td class="marca ok">✓</td></tr></tbody></table>`,
        veredito: "São os 7 erros que deixamos no texto. Ele não inventou nenhum outro." },
      { tema: "Informações que não batem", marca: "3 de 3", estado: "ok",
        disse: "Achou as 3: o número de escolas, o de estudantes e o mês em que as oficinas acabaram.",
        onde: "O que ele apontou",
        detalhe: `<ul class="res-pontos">
          <li><b>Escolas:</b> 12 na Apresentação, 14 nos Resultados. A tabela lista 12.</li>
          <li><b>Estudantes:</b> 480 na Apresentação, mas a tabela soma 452. Ele mostrou a conta.</li>
          <li><b>Período:</b> “entre março e setembro” na Apresentação; “encerradas em outubro” nas Dificuldades.</li></ul>`,
        veredito: "As 3 que deixamos no relatório." },
      { tema: "O texto revisado, na 1ª resposta", marca: "confira", estado: "atencao",
        disse: "Sem ninguém pedir, já entregou o texto inteiro corrigido. Nele, escolheu sozinho 12 escolas, 452 estudantes e outubro.",
        onde: "Trecho do texto que ele devolveu",
        detalhe: `<p class="res-texto">“Faz dois anos que a equipe percorre escolas da região metropolitana e, em 2026, as oficinas aconteceram em <mark>12 escolas</mark>, entre março e <mark>outubro</mark>. Ao todo, <mark>452 estudantes</mark> participaram das atividades.”</p>`,
        veredito: "Logo acima ele avisou das 3 divergências, mas no texto pronto decidiu qual número vale, sem marcar. Quem copiasse esse texto mandaria números que ninguém conferiu." },
      { tema: "O Word devolvido", marca: "2º pedido", estado: "ok",
        disse: "Deixou as 3 divergências entre colchetes, em vermelho, para quem vai assinar decidir.",
        onde: "Primeira página do Word, como apareceu no Gemini",
        detalhe: `<div class="res-folha"><h3>Relatório de Atividades 2026</h3><p class="sub">Programa “Mapas na Escola”: oficinas de leitura de mapas para o ensino médio</p>
          <h4>1. Apresentação</h4><p>O programa Mapas na Escola leva oficinas de leitura de mapas para turmas do ensino médio da rede pública. Faz dois anos que a equipe percorre escolas da região metropolitana, e em 2026 as oficinas aconteceram em <span class="res-colchete">[12 escolas — DIVERGÊNCIA: a Seção 3 menciona 14 escolas]</span>, entre março e <span class="res-colchete">[setembro — DIVERGÊNCIA: a Seção 4 cita encerramento em outubro]</span>. Ao todo, <span class="res-colchete">[480 estudantes — DIVERGÊNCIA: a soma dos dados da tabela resulta em 452 estudantes]</span> participaram das atividades.</p></div>`,
        veredito: "Com o pedido explícito, ele deixou a decisão com você." },
    ],
    nota: "Deixamos 10 problemas no relatório: 7 de português e 3 de informação. Ele achou os 10.",
  },

  planilha: {
    titulo: "As contagens, conferidas com a planilha",
    fonte: "Respostas do Gemini, copiadas da conversa · 3 nov. 2026",
    tipo: "lista",
    itens: [
      { tema: "Pessoas por cidade", marca: "6 de 6", estado: "ok",
        disse: "Juntou SP, Sampa, BH, DF, Ctba e as outras grafias, e separou inscrições de pessoas: 159 e 150.",
        onde: "O que ele contou × a conta certa",
        detalhe: `<table class="res-tabela"><thead><tr><th>Cidade</th><th>Inscrições</th><th>Pessoas</th><th>Certo</th><th></th></tr></thead><tbody>
          <tr><td>São Paulo</td><td>73</td><td>70</td><td>70</td><td class="marca ok">✓</td></tr>
          <tr><td>Belo Horizonte</td><td>31</td><td>30</td><td>30</td><td class="marca ok">✓</td></tr>
          <tr><td>Brasília</td><td>24</td><td>22</td><td>22</td><td class="marca ok">✓</td></tr>
          <tr><td>Salvador</td><td>13</td><td>12</td><td>12</td><td class="marca ok">✓</td></tr>
          <tr><td>Curitiba</td><td>12</td><td>10</td><td>10</td><td class="marca ok">✓</td></tr>
          <tr><td>Recife</td><td>6</td><td>6</td><td>6</td><td class="marca ok">✓</td></tr></tbody>
          <tfoot><tr><td>Total</td><td>159</td><td>150</td><td>150</td><td class="marca ok">✓</td></tr></tfoot></table>`,
        veredito: "Certo nas duas colunas." },
      { tema: "Por onde souberam", marca: "159, não 150", estado: "atencao",
        disse: "E-mail 37, Instagram 36, Indicação de colega 34, WhatsApp 27, Site 25.",
        onde: "O que ele contou × pessoas",
        detalhe: `<table class="res-tabela"><thead><tr><th>Canal</th><th>Ele contou</th><th>Pessoas</th><th></th></tr></thead><tbody>
          <tr><td>E-mail</td><td>37</td><td>36</td><td class="marca atencao">!</td></tr>
          <tr><td>Instagram</td><td>36</td><td>36</td><td class="marca ok">✓</td></tr>
          <tr><td>Indicação de colega</td><td>34</td><td>32</td><td class="marca atencao">!</td></tr>
          <tr><td>WhatsApp</td><td>27</td><td>24</td><td class="marca atencao">!</td></tr>
          <tr><td>Site</td><td>25</td><td>22</td><td class="marca atencao">!</td></tr></tbody>
          <tfoot><tr><td>Total</td><td>159</td><td>150</td><td></td></tr></tfoot></table>`,
        veredito: "Aqui ele contou inscrições, com as repetidas, e não avisou. A pergunta era quantas pessoas." },
      { tema: "Por oficina", marca: "159, não 150", estado: "atencao",
        disse: "Escrita de projetos 50, Mapas no celular 43, Planilhas sem medo 34, IA no dia a dia 32.",
        onde: "O que ele contou × pessoas",
        detalhe: `<table class="res-tabela"><thead><tr><th>Oficina</th><th>Ele contou</th><th>Pessoas</th><th></th></tr></thead><tbody>
          <tr><td>Escrita de projetos</td><td>50</td><td>46</td><td class="marca atencao">!</td></tr>
          <tr><td>Mapas no celular</td><td>43</td><td>41</td><td class="marca atencao">!</td></tr>
          <tr><td>Planilhas sem medo</td><td>34</td><td>33</td><td class="marca atencao">!</td></tr>
          <tr><td>IA no dia a dia</td><td>32</td><td>30</td><td class="marca atencao">!</td></tr></tbody>
          <tfoot><tr><td>Total</td><td>159</td><td>150</td><td></td></tr></tfoot></table>`,
        veredito: "O mesmo deslize. No arquivo do 2º pedido, já sem as repetidas, as oficinas vieram certas: 46, 41, 33 e 30." },
      { tema: "Inscritos duas vezes", marca: "9 de 9", estado: "ok",
        disse: "9 pessoas, com o nome e o e-mail de cada uma.",
        onde: "Os 9 que ele listou",
        detalhe: `<ul class="res-pontos colunas"><li>Amanda Rocha Silva</li><li>Ana Ribeiro Pereira</li><li>Bruno Ribeiro Almeida</li><li>Débora Martins Oliveira</li><li>Rafael Lima Costa</li><li>Samuel Teixeira Almeida</li><li>Thiago Moura Ribeiro</li><li>Vitor Barbosa Gomes</li><li>Wesley Ferreira Moura</li></ul>`,
        veredito: "Os 9 certos. Só a frase “totalizando 18 linhas duplicadas” confunde: são 18 linhas de 9 pessoas, ou seja, 9 linhas a mais." },
      { tema: "A fórmula", marca: "ensinou", estado: "ok",
        disse: "CONT.SE para contar uma oficina ou um canal; CONT.VALORES(ÚNICO(...)) para contar pessoas.",
        onde: "As fórmulas que ele ensinou",
        detalhe: `<p class="res-formula">=CONT.SE(F:F; "Escrita de projetos")</p><p class="res-formula">=CONT.VALORES(ÚNICO(C2:C160))</p>
          <p class="res-texto pequeno">A primeira conta linhas: com as repetidas, dá 50, não 46. A segunda conta e-mails diferentes: dá as 150 pessoas.</p>`,
        veredito: "As duas funcionam no Excel em português. Vale saber o que cada uma conta." },
      { tema: "A planilha devolvida", marca: "abra no Excel", estado: "atencao",
        disse: "Aba de resumo com as 150 pessoas e a lista sem as repetidas.",
        onde: "A aba Resumo, no visualizador do Gemini",
        detalhe: `<img class="res-print" src="assets/img/resultado/planilha-resumo.jpg" alt="Aba Resumo da planilha devolvida: 150 inscritos, cartão de cidades com #NAME? e gráfico sem barras">`,
        veredito: "O cartão “Cidades atendidas” mostrou #NAME? e o gráfico veio sem barras. Pode ser só o visualizador: abra o arquivo no Excel antes de mandar para alguém." },
    ],
    nota: "A planilha tem 159 linhas e 150 pessoas: 9 se inscreveram duas vezes.",
  },

  canvas: {
    titulo: "A calculadora dele, funcionando aqui",
    fonte: "Código do Gemini, copiado do Canvas · 3 nov. 2026",
    tipo: "canvas",
    app: "assets/canvas/calculadora.html",
    chaves: ["confra_people", "confra_expenses"],
    conferido: [
      "Total de R$ 1.528,20",
      "Os 6 saldos (Ana recebe R$ 496,90; Elisa, R$ 135,70)",
      "Cinco transferências, e a conta fecha em zero",
      "A Elisa ficou fora do almoço e do sorvete",
    ],
    teste: "Na aba de lançamentos, edite o almoço e troque R$ 780 por R$ 900.",
    esperado: "Certo: total de R$ 1.648,20. Só os 5 do almoço pagam R$ 24,00 a mais: a Ana passa a receber R$ 592,90, e a Elisa continua com R$ 135,70. Foi o que ele mostrou na gravação.",
    nota: "Do código dele, só fixamos as versões das bibliotecas que ele carrega, para não quebrar com o tempo.",
  },

  // ----- Fase 3: o resultado ESPERADO, montado a partir dos gabaritos de material/fase3.
  // A gravação no app ChatGPT ainda não foi feita; quando for, o que ele fez entra aqui. -----

  viagens: {
    rotulo: "O resultado esperado",
    titulo: "O hotel entra uma vez só",
    fonte: "Montado com o gabarito, antes da gravação no app ChatGPT",
    rever: "◀ Voltar à gravação",
    tipo: "viagens",
    colunas: ["Data", "Estabelecimento", "Categoria", "Valor (R$)"],
    viagens: [
      { nome: "Viagens a trabalho", sub: "Campinas · out. 2024 · parte A",
        linhas: [
          { c: ["10/10/2024", "Hotel Portal das Águas", "Hospedagem", "1.240,00"], arq: "voucher-reserva-58213.pdf", img: ["voucher-reserva-58213"], estado: "ok",
            nota: "Voucher da reserva 58213: 4 diárias, de 14 a 18/10, pagas por Pix. É a despesa do hotel." },
          { c: ["10/10/2024", "Hotel Portal das Águas", "Hospedagem", "1.240,00"], arq: "comprovante_pix_20241010.pdf", img: ["voucher-reserva-58213", "comprovante_pix_20241010"], estado: "erro", fora: true,
            nota: "<b>A armadilha.</b> O Pix pagou a mesma reserva 58213, no mesmo valor. Somar os dois cobra o hotel em dobro, e o total vai para <b>R$ 2.790,74</b>. O certo é uma linha só, citando os dois arquivos." },
          { c: ["14/10/2024", "Viação Serra Azul", "Transporte", "89,90"], arq: "bilhete.pdf", img: ["bilhete"], estado: "ok",
            nota: "Ônibus de ida, de Vila Nova do Campo para Campinas. Não há bilhete de volta na pasta." },
          { c: ["14/10/2024", "Nico Panificadora", "Alimentação", "39,90"], arq: "IMG_20241014_161520.jpg", img: ["IMG_20241014_161520"], estado: "ok", nota: "Sem dificuldade de leitura." },
          { c: ["15/10/2024", "Nico Panificadora", "Alimentação", "51,34"], arq: "IMG_20241015_105420.jpg", img: ["IMG_20241015_105420"], estado: "ok", nota: "Tem um item vendido por quilo (0,182 kg × 79,90)." },
          { c: ["16/10/2024", "Nico Panificadora", "Alimentação", "40,90"], arq: "IMG_20241016_141118.jpg", img: ["IMG_20241016_141118"], estado: "ok", nota: "Almoço por quilo (0,286 kg × 104,90)." },
          { c: ["17/10/2024", "Vila do Grão", "Alimentação", "73,70"], arq: "IMG_20241017_124625.jpg", img: ["IMG_20241017_124625"], estado: "atencao",
            nota: "Subtotal de R$ 67,00 mais R$ 6,70 de serviço. O cupom escreve “serviço (0%)”, mas cobra 10%. Quem ler 0% chega a R$ 1.544,04." },
          { c: ["18/10/2024", "Village Residence Hotelaria", "Hospedagem", "15,00"], arq: "Scan_20241018_105957.jpg", img: ["Scan_20241018_105957"], estado: "atencao",
            nota: "Nota fiscal de serviço em folha A4, de um consumo no hotel. É outra despesa, diferente da diária do Portal das Águas. Se ficar de fora, o total cai para R$ 1.535,74." },
        ],
        total: "1.550,74", errado: { rotulo: "Com o Pix somado de novo", valor: "2.790,74" },
        nota: "Depois da parte A, a pasta Viagens a trabalho tem pastas por tipo de gasto, a planilha com o total, a lista de dúvidas e o passo a passo que a parte B vai seguir." },
      { nome: "Nova viagem", sub: "Rio de Janeiro e Mato Grosso · jun. e jul. 2025 · parte B",
        linhas: [
          { c: ["24/06/2025", "Valente e Califé", "Alimentação", "30,90"], arq: "IMG_20250624_152340.jpg", img: ["IMG_20250624_152340"], estado: "atencao",
            nota: "A coluna da direita está cortada (0,0… e 30,8…). Vale o total impresso, R$ 30,90. Quem ler 30,80 chega a R$ 253,40." },
          { c: ["24/06/2025", "Move Fácil", "Transporte", "38,90"], arq: "recibo-corrida-24062025.pdf", img: ["recibo-corrida-24062025"], estado: "ok", nota: "Corrida por aplicativo, do Galeão para Botafogo." },
          { c: ["30/06/2025", "Dufry Duty Free Shop", "Compras", "65,70"], arq: "IMG_20250630_145320.jpg", img: ["IMG_20250630_145320"], estado: "atencao",
            nota: "Os quatro itens de 16,43 somam 65,72, mas vale o total impresso, R$ 65,70." },
          { c: ["30/06/2025", "Aero Vale, voo AV 4821", "Não é despesa", "—"], arq: "cartao-de-embarque.pdf", img: ["cartao-de-embarque"], estado: "erro", fora: true,
            nota: "<b>O intruso.</b> Cartão de embarque não tem valor e não entra na prestação de contas. Se virar uma linha com valor, o total fica errado." },
          { c: ["12/07/2025", "Espeto do Vizinho", "Alimentação", "30,00"], arq: "IMG_20250712_214502.jpg", img: ["IMG_20250712_214502"], estado: "atencao",
            nota: "O papel diz “não é documento fiscal”: é a conferência da conta. A despesa foi paga, mas a observação precisa dizer o que ele é." },
          { c: ["13/07/2025", "FL Empreendimentos Comerciais", "Alimentação", "88,00"], arq: "IMG_20250713_014530.jpg", img: ["IMG_20250713_014530"], estado: "atencao",
            nota: "O topo está desbotado. O rodapé mostra 13/07/2025 01:41:30, então 13/07 é a data provável. A dúvida vai para a lista de dúvidas que o pedido manda fazer." },
        ],
        total: "253,50",
        nota: "Na parte B o pedido é “organize do mesmo jeito”: o agente segue o passo a passo que ele mesmo escreveu na parte A, agora na viagem nova, numa pasta separada dentro do mesmo projeto." },
    ],
  },

  certificados: {
    rotulo: "O resultado esperado",
    titulo: "Vinte linhas, dezesseis certificados",
    fonte: "Montado com o gabarito, antes da gravação no app ChatGPT",
    rever: "◀ Voltar à gravação",
    tipo: "certificados",
    modelo: "assets/img/fase3/previa-modelo.jpg",
    oficina: "Oficina de Planilhas para o Dia a Dia", data: "23 de maio de 2026", carga: "8 horas",
    linhas: [
      [2, "02/04/2026", "Ana Júlia Conceição", "ana.conceicao@exemplo.com"],
      [3, "02/04/2026", "Bruno Tavares Lima", "bruno.lima@exemplo.com"],
      [4, "03/04/2026", "Camila Ferreira dos Santos", "camila.santos@exemplo.com"],
      [5, "03/04/2026", "Diego Nogueira Alves", "diego.alves@exemplo.com"],
      [6, "04/04/2026", "Elisa Martins Rocha", "elisa.rocha@exemplo.com"],
      [7, "05/04/2026", "Fábio Ribeiro de Souza", "fabio.souza@exemplo.com"],
      [8, "05/04/2026", "Gabriela Nunes Pereira", "gabriela.pereira@exemplo.com"],
      [9, "06/04/2026", "Henrique Oliveira Castro", "henrique.castro@exemplo.com"],
      [10, "07/04/2026", "Isabela Ramos Cardoso", "isabela.cardoso@exemplo.com"],
      [11, "07/04/2026", "João Pedro Almeida", "joao.almeida@exemplo.com"],
      [12, "08/04/2026", "Karina Lopes Mendes", "karina.mendes@exemplo.com"],
      [13, "09/04/2026", "Leonardo Prado Vieira", "leonardo.vieira@exemplo.com"],
      [14, "10/04/2026", "Mariana Costa Batista", "mariana.batista@exemplo.com"],
      [15, "10/04/2026", "Natália Gomes Faria", "natalia.faria@exemplo.com"],
      [16, "11/04/2026", "Otávio Siqueira Braga", "otavio.braga@exemplo.com"],
      [17, "12/04/2026", "Patrícia Melo Andrade", "patricia.andrade@exemplo.com"],
      [18, "14/04/2026", "ana júlia conceição", "ana.conceicao@exemplo.com"],
      [19, "15/04/2026", "Fabio Ribeiro de Souza", "fabio.souza@exemplo.com"],
      [20, "16/04/2026", "Mariana  Costa Batista", "mariana.batista@exemplo.com"],
      [21, "17/04/2026", "Otávio Siqueira Braga", "otavio.braga@exemplo.com"],
    ],
    // Linha repetida → linha original, o que mudou e o que se vê se a IA errar.
    repetidas: {
      18: { de: 2, como: "nome todo em minúsculas", nota: "Se a IA não juntar as duas linhas, sai um 17º certificado, com o nome em minúsculas. Ou um arquivo sobrescreve o outro e fica a versão errada." },
      19: { de: 7, como: "nome sem acento", nota: "O mesmo e-mail da linha 7. Se virar certificado, o Fábio recebe dois, e um deles sem acento." },
      20: { de: 14, como: "espaço a mais", nota: "Há dois espaços entre “Mariana” e “Costa”. Para quem lê, parece igual; para a máquina, é outro nome." },
      21: { de: 16, como: "mesmo nome, outra data", nota: "A mais difícil: o nome é idêntico. A pista é o e-mail repetido. Se passar, o Otávio ganha dois certificados." },
    },
    nota: "Também vale abrir um PDF e ler a frase inteira: se algum campo ficou entre colchetes, o agente esqueceu de trocar.",
  },

  mudanca: {
    rotulo: "O resultado esperado",
    titulo: "Quatro datas mudam, não uma",
    fonte: "Montado com o gabarito, antes da gravação no app ChatGPT",
    rever: "◀ Voltar à gravação",
    tipo: "mudanca",
    mudou: [
      { tema: "Data do seminário", antes: "10 de maio", depois: "17 de maio", porque: "de 2027" },
      { tema: "Local", antes: "Auditório 2", depois: "Auditório 1" },
      { tema: "Trabalhos até", antes: "5 de maio", depois: "12 de maio", porque: "5 dias antes do evento", armadilha: true },
      { tema: "Inscrições até", antes: "8 de maio", depois: "15 de maio", porque: "2 dias antes do evento", armadilha: true },
    ],
    arquivos: [
      { arq: "regras-envio-trabalhos.docx", conta: "3 datas · 2 auditórios · 1 prazo", prazo: true,
        trecho: "<p>O envio de trabalhos vai até <del>5 de maio</del> <ins>12 de maio</ins>, cinco dias antes do evento.</p><p>Os trabalhos aprovados serão apresentados no <del>Auditório 2</del> <ins>Auditório 1</ins>, em <del>10 de maio</del> <ins>17 de maio</ins>, dentro da programação.</p>",
        armadilha: "“Até 5 de maio, cinco dias antes do evento”, num evento em 17 de maio. São 12 dias, não 5, e a contradição fica na mesma página." },
      { arq: "convite.docx", conta: "1 data · 1 auditório · 1 prazo", prazo: true,
        trecho: "<p><del>10 de maio</del> <ins>17 de maio</ins> de 2027, das 9h às 17h.</p><p><del>Auditório 2</del> <ins>Auditório 1</ins> do Instituto Horizonte.</p><p>As inscrições vão até <del>8 de maio</del> <ins>15 de maio</ins> e podem ser feitas pelo site do Instituto.</p>",
        armadilha: "Inscrições até 8 de maio num evento em 17 de maio: terminariam 9 dias antes, e não 2." },
      { arq: "email-aviso.txt", conta: "1 data · 1 auditório · 1 prazo", prazo: true,
        trecho: "<p>O Seminário Horizonte 2027 acontece em <del>10 de maio</del> <ins>17 de maio</ins> de 2027, no <del>Auditório 2</del> <ins>Auditório 1</ins>.</p><p>Quem quiser apresentar um trabalho precisa enviar a proposta até <del>5 de maio</del> <ins>12 de maio</ins>.</p>",
        armadilha: "Envio até 5 de maio num evento em 17 de maio: 12 dias antes, e não 5." },
      { arq: "aviso-porta.docx", conta: "1 data · 1 auditório, em maiúsculas",
        trecho: "<p class=\"caixa\"><del>10 DE MAIO DE 2027</del><br><ins>17 DE MAIO DE 2027</ins></p><p class=\"caixa\"><del>AUDITÓRIO 2</del> <ins>AUDITÓRIO 1</ins></p>",
        cuidado: "O cartaz está em maiúsculas. Quem procurar só “10 de maio” deixa a porta com a data antiga." },
      { arq: "programacao.docx", conta: "2 datas · 7 auditórios",
        trecho: "<p><del>10 de maio</del> <ins>17 de maio</ins> de 2027 | <del>Auditório 2</del> <ins>Auditório 1</ins></p><p class=\"miudo\">09:00 Abertura · 09:30 Palestra · 11:00 Mesa-redonda · 16:00 Roda de conversa · 17:00 Encerramento: <del>Auditório 2</del> <ins>Auditório 1</ins></p>",
        cuidado: "O auditório está no subtítulo, em 5 linhas da tabela e no rodapé. Trocar só o subtítulo deixa a tabela no lugar antigo." },
      { arq: "roteiro-abertura.docx", conta: "2 datas · 4 auditórios",
        trecho: "<p>Conferir som, microfone e projetor no <del>Auditório 2</del> <ins>Auditório 1</ins>.</p><p>Bom dia. Sejam bem-vindos ao Seminário Horizonte 2027. Estamos no <del>Auditório 2</del> <ins>Auditório 1</ins> do Instituto Horizonte.</p>" },
      { arq: "checklist-montagem.md", conta: "1 data · 4 auditórios",
        trecho: "<p><b>Data:</b> <del>10 de maio</del> <ins>17 de maio</ins> de 2027</p><p>Sinalizar a entrada do <del>Auditório 2</del> <ins>Auditório 1</ins>.</p><p>Fechar o <del>Auditório 2</del> <ins>Auditório 1</ins> e devolver a chave na recepção.</p>" },
      { arq: "comunicado-palestrantes.txt", conta: "1 data · 2 auditórios",
        trecho: "<p>O Seminário Horizonte 2027 será realizado em <del>10 de maio</del> <ins>17 de maio</ins> de 2027, no <del>Auditório 2</del> <ins>Auditório 1</ins>.</p><p>Recursos disponíveis no <del>Auditório 2</del> <ins>Auditório 1</ins>: projetor, computador com HDMI e microfones.</p>" },
      { arq: "politica-certificados.docx", conta: "2 datas · 1 auditório",
        trecho: "<p>Seminário Horizonte 2027 | <del>10 de maio</del> <ins>17 de maio</ins> de 2027</p><p class=\"miudo\">Rodapé: <del>Auditório 2</del> <ins>Auditório 1</ins> | <del>10 de maio</del> <ins>17 de maio</ins> de 2027</p>",
        cuidado: "O auditório só aparece no rodapé. Vale abrir o arquivo inteiro." },
      { arq: "texto-site.md", conta: "1 data · 1 auditório",
        trecho: "<p><b>Data:</b> <del>10 de maio</del> <ins>17 de maio</ins> de 2027</p><p><b>Local:</b> <del>Auditório 2</del> <ins>Auditório 1</ins> do Instituto Horizonte</p>" },
      { arq: "modelo-cracha.docx", conta: "1 data · 1 auditório",
        trecho: "<p class=\"caixa\">SEMINÁRIO HORIZONTE 2027</p><p><del>10 de maio</del> <ins>17 de maio</ins> de 2027 | <del>Auditório 2</del> <ins>Auditório 1</ins></p>" },
      { arq: "lista-presenca.txt", conta: "1 data · 1 auditório",
        trecho: "<p>Data: <del>10 de maio</del> <ins>17 de maio</ins> de 2027</p><p>Local: <del>Auditório 2</del> <ins>Auditório 1</ins></p>" },
    ],
    nota: "No fim, procure “10 de maio”, “Auditório 2”, “5 de maio” e “8 de maio” na pasta: não pode sobrar nenhum. O pedido não citou os prazos: se o agente os mudou, a lista dele tem de dizer isso.",
  },
};

(() => {
  const R = window.RESULTADOS;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icone = { ok: "✓", atencao: "!", erro: "?" };

  const cabeca = (d) => `
    <header class="res-cabeca">
      <div><span class="rotulo">${esc(d.rotulo || "O resultado")}</span><h2 class="titulo">${esc(d.titulo)}</h2></div>
      <div class="res-acoes">${d.fonte ? `<span class="res-fonte">${esc(d.fonte)}</span>` : ""}
        <button type="button" class="res-rever">${esc(d.rever || "▶ Rever a gravação")}</button></div>
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

    lista: (d) => `
      <div class="res-corpo res-conferir">
        <div class="res-lista">${d.itens.map((it, i) => `
          <button type="button" class="res-item ${it.estado}" data-i="${i}">
            <b>${esc(it.tema)}</b><span>${esc(it.disse)}</span>
            <em>${icone[it.estado]} ${esc(it.marca)}</em></button>`).join("")}
          <p class="res-nota">${esc(d.nota)}</p>
        </div>
        <div class="res-papel res-detalhe" aria-live="polite"></div>
      </div>`,

    canvas: (d) => `
      <div class="res-corpo res-canvas">
        <div class="res-app"><iframe title="A calculadora criada pelo Gemini"></iframe></div>
        <div class="res-lado">
          <div class="res-cartao"><span class="res-onde">Conferido com a conta feita à mão</span>
            <ul>${d.conferido.map((c) => `<li><b class="marca ok">✓</b>${esc(c)}</li>`).join("")}</ul></div>
          <div class="res-cartao teste"><span class="res-onde">Teste aqui</span>
            <p class="res-pede">${esc(d.teste)}</p><p class="res-espera">${esc(d.esperado)}</p>
            <button type="button" class="res-restaurar">↺ Voltar aos dados do pedido</button></div>
          <p class="res-nota">${esc(d.nota)}</p>
        </div>
      </div>`,


    // Viagens: uma aba por viagem; a tabela esperada; clicar numa linha mostra o documento.
    viagens: (d) => `
      <div class="res-corpo res-cupons res-viagens">
        <div class="res-papel">
          <div class="res-abas" role="tablist">${d.viagens.map((v, i) => `<button type="button" role="tab" data-v="${i}"><b>${esc(v.nome)}</b><small>${esc(v.sub)}</small></button>`).join("")}</div>
          <div class="res-tabela-lugar"></div>
        </div>
        <div class="res-cupom" aria-live="polite"></div>
      </div>`,

    // Certificados: as 20 linhas da planilha; clicar numa linha preenche o modelo.
    certificados: (d) => `
      <div class="res-corpo res-certificados">
        <div class="res-papel">
          <table class="res-tabela clicavel compacta"><thead><tr><th></th><th>Linha</th><th>Nome na planilha</th><th>E-mail</th></tr></thead>
          <tbody>${d.linhas.map(([n, , nome, mail], i) => {
            const r = d.repetidas[n];
            return `<tr class="${r ? "erro" : ""}" data-i="${i}" tabindex="0"><td class="marca ${r ? "erro" : "ok"}">${r ? "×" : "✓"}</td><td>${n}</td><td class="nome">${esc(nome).replace(/ {2}/g, '<span class="dois-espacos">&nbsp;&nbsp;</span>')}${r ? `<em>= linha ${r.de}</em>` : ""}</td><td>${esc(mail)}</td></tr>`;
          }).join("")}</tbody></table>
          <p class="res-placar-trio"><span><b>20</b> linhas</span><span><b>4</b> repetidas</span><span class="ok"><b>16</b> PDFs</span></p>
        </div>
        <div class="res-cert-lado">
          <figure class="res-cert"><img src="${d.modelo}" alt="O modelo do certificado, com o timbre do Instituto Horizonte">
            <div class="res-cert-texto"></div><span class="res-cert-selo"></span></figure>
          <div class="res-cupom-nota" aria-live="polite"></div>
        </div>
      </div>`,

    // Mudança de data: o que muda (com os dois prazos derivados) e, arquivo por arquivo, o antes e o depois.
    mudanca: (d) => `
      <div class="res-corpo res-mudanca">
        <div class="res-mudou">${d.mudou.map((m) => `
          <div class="res-mudou-item${m.armadilha ? " armadilha" : ""}"><span>${esc(m.tema)}${m.armadilha ? `<i>depende da data</i>` : ""}</span>
            <p><del>${esc(m.antes)}</del> <ins>${esc(m.depois)}</ins></p>${m.porque ? `<small>${esc(m.porque)}</small>` : ""}</div>`).join("")}</div>
        <div class="res-mudanca-baixo">
          <div class="res-arquivos">${d.arquivos.map((a, i) => `
            <button type="button" class="res-arq${a.prazo ? " prazo" : ""}" data-i="${i}"><i class="t-${a.arq.split(".").pop()}">${a.arq.split(".").pop()}</i>
              <span><b>${esc(a.arq)}</b><small>${esc(a.conta)}</small></span></button>`).join("")}</div>
          <div class="res-papel res-trecho" aria-live="polite"></div>
        </div>
      </div>`,
  };

  document.querySelectorAll(".resultado[data-resultado]").forEach((el) => {
    const d = R[el.dataset.resultado];
    const cena = el.closest(".cena");
    el.innerHTML = cabeca(d) + montar[d.tipo](d);
    // O resultado aparece no passo dele; "rever" volta ao passo da gravação (a peça).
    const passoRes = +el.dataset.passo, passoGravacao = +(cena.querySelector(".peca")?.dataset.passo ?? passoRes - 1);
    el.querySelector(".res-rever").addEventListener("click", () => window.PALCO.ir(window.PALCO.cenas.indexOf(cena), passoGravacao));
    const img3 = (n) => `assets/img/fase3/${n}.jpg`;

    if (d.tipo === "viagens") {
      const lugar = el.querySelector(".res-tabela-lugar"), alvo = el.querySelector(".res-cupom"), abas = [...el.querySelectorAll(".res-abas button")];
      const mostrar = (v, i) => {
        const l = d.viagens[v].linhas[i];
        lugar.querySelectorAll("tbody tr").forEach((tr, k) => tr.classList.toggle("sel", k === i));
        alvo.innerHTML = `<div class="res-cupom-img${l.img.length > 1 ? " par" : ""}">${l.img.map((n) => `<img src="${img3(n)}" alt="${esc(n)}">`).join("")}</div>
          <div class="res-cupom-nota ${l.estado}"><span>${esc(l.arq)}</span><p>${l.nota}</p></div>`;
      };
      const aba = (v) => {
        const via = d.viagens[v];
        abas.forEach((b, k) => b.setAttribute("aria-selected", k === v));
        lugar.innerHTML = `<table class="res-tabela clicavel"><thead><tr><th></th>${d.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${via.linhas.map((l, i) => `<tr class="${l.estado}${l.fora ? " fora" : ""}" data-i="${i}" tabindex="0"><td class="marca ${l.estado}">${l.fora ? "×" : icone[l.estado]}</td>${l.c.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
          <tfoot><tr><td class="marca ok">✓</td><td>Total certo</td><td></td><td></td><td>${via.total}</td></tr>
          ${via.errado ? `<tr class="total-errado"><td class="marca erro">×</td><td colspan="3">${esc(via.errado.rotulo)}</td><td>${via.errado.valor}</td></tr>` : ""}</tfoot></table>
          <p class="res-nota">${esc(via.nota)}</p>`;
        lugar.querySelectorAll("tbody tr").forEach((tr, i) => {
          tr.addEventListener("click", () => mostrar(v, i));
          tr.addEventListener("keydown", (e) => { if (e.key === "Enter") { mostrar(v, i); e.stopPropagation(); } });
        });
        // Abre na armadilha da viagem, que é o que vale mostrar primeiro.
        mostrar(v, Math.max(0, via.linhas.findIndex((l) => l.estado === "erro")));
      };
      abas.forEach((b, v) => b.addEventListener("click", () => aba(v)));
      aba(0);
    }

    if (d.tipo === "certificados") {
      const linhas = [...el.querySelectorAll("tbody tr")], texto = el.querySelector(".res-cert-texto");
      const selo = el.querySelector(".res-cert-selo"), nota = el.querySelector(".res-cupom-nota"), fig = el.querySelector(".res-cert");
      const mostrar = (i) => {
        const [n, , nome] = d.linhas[i], r = d.repetidas[n];
        linhas.forEach((tr, k) => tr.classList.toggle("sel", k === i));
        fig.classList.toggle("errado", !!r);
        texto.innerHTML = `<span>Certificamos que</span><b class="nome">${esc(nome).replace(/ {2}/g, '<span class="dois-espacos">&nbsp;&nbsp;</span>')}</b>
          <span>concluiu a <b>${esc(d.oficina)}</b>,</span><span>realizada em <b>${esc(d.data)}</b>, com carga horária de <b>${esc(d.carga)}</b>.</span>`;
        selo.textContent = r ? `não deveria existir · ${r.como}` : "";
        nota.className = `res-cupom-nota ${r ? "erro" : "ok"}`;
        nota.innerHTML = r
          ? `<span>Linha ${n} · repete a linha ${r.de}</span><p>${esc(r.nota)}</p>`
          : `<span>Linha ${n} · um PDF por pessoa</span><p>O nome entra com maiúsculas e acentos. A data e a carga horária são as da oficina, e não a da inscrição.</p>`;
      };
      linhas.forEach((tr, i) => {
        tr.addEventListener("click", () => mostrar(i));
        tr.addEventListener("keydown", (e) => { if (e.key === "Enter") { mostrar(i); e.stopPropagation(); } });
      });
      mostrar(0);
    }

    if (d.tipo === "mudanca") {
      const botoes = [...el.querySelectorAll(".res-arq")], alvo = el.querySelector(".res-trecho");
      const mostrar = (i) => {
        const a = d.arquivos[i];
        botoes.forEach((b, k) => b.classList.toggle("sel", k === i));
        alvo.innerHTML = `<span class="res-onde">${esc(a.arq)} · antes e depois</span>
          <div class="res-trecho-grade"><div class="res-texto res-diff">${a.trecho}</div>
            <figure class="res-pagina"><img src="${img3(a.arq.replace(/\.[^.]+$/, ""))}" alt="${esc(a.arq)} antes da mudança"><figcaption>o arquivo, antes</figcaption></figure></div>
          ${a.armadilha ? `<p class="res-veredito erro"><b>Se trocar só a data do evento:</b> ${esc(a.armadilha)}</p>` : ""}
          ${a.cuidado ? `<p class="res-veredito atencao">${esc(a.cuidado)}</p>` : ""}
          ${!a.armadilha && !a.cuidado ? `<p class="res-veredito ok">✓ ${esc(a.conta)} para trocar.</p>` : ""}`;
      };
      botoes.forEach((b, i) => b.addEventListener("click", () => mostrar(i)));
      mostrar(0);
    }

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

    if (d.tipo === "lista") {
      const alvo = el.querySelector(".res-detalhe"), itens = [...el.querySelectorAll(".res-item")];
      const mostrar = (i) => {
        const it = d.itens[i];
        itens.forEach((b, k) => b.classList.toggle("sel", k === i));
        alvo.innerHTML = `<span class="res-onde">${esc(it.onde)}</span>
          <div class="res-conteudo">${it.detalhe}</div>
          <p class="res-veredito ${it.estado}">${icone[it.estado]} ${esc(it.veredito)}</p>`;
      };
      itens.forEach((b, i) => b.addEventListener("click", () => mostrar(i)));
      mostrar(0);
    }

    if (d.tipo === "canvas") {
      // A calculadora (React + Babel, ~2 MB) só carrega quando o painel aparece.
      const quadro = el.querySelector("iframe");
      const carregar = () => { if (el.classList.contains("visto") && !quadro.getAttribute("src")) quadro.src = d.app; };
      new MutationObserver(carregar).observe(el, { attributes: true, attributeFilter: ["class"] });
      carregar();
      el.querySelector(".res-restaurar").addEventListener("click", () => {
        try { d.chaves.forEach((k) => quadro.contentWindow.localStorage.removeItem(k)); } catch (_) {}
        quadro.src = d.app;
      });
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
    const ir = () => window.PALCO.ir(window.PALCO.cenas.indexOf(cena), passoRes);
    cena.querySelector(".ver-resultado")?.addEventListener("click", ir);
    cena.addEventListener("tecla", (e) => { if (e.detail.key === "r" || e.detail.key === "R") { ir(); e.preventDefault(); } });
  });
})();
