// Motor do dominó de duplas: pedras, regras, fichas e decisões. Sem nada de tela.
// Roda no navegador (window.DominoMotor) e no Node (module.exports).
// Cada robô lê a ficha de cima para baixo e usa a primeira regra que serve.
// Nenhum modelo de IA é chamado: são seis funções pequenas, sempre iguais.

(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.DominoMotor = fabrica();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NUM = 7; // números 0 a 6
  const NOME_DUPLA = ["Seu Bené e Nina", "Dona Cida e Tião"];

  // As seis regras, na mesma ordem em que aparecem na ficha e no seletor.
  const REGRAS = [
    {
      id: 1,
      nome: "Jogar a pedra mais pesada",
      curto: "Pedra mais pesada",
      descricao: "Escolhe a pedra com a maior soma de pontos.",
    },
    {
      id: 2,
      nome: "Jogar carroça quando puder",
      curto: "Jogar carroça",
      descricao: "Se uma carroça encaixa, joga a carroça mais pesada.",
    },
    {
      id: 3,
      nome: "Guardar as carroças",
      curto: "Guardar carroças",
      descricao: "Joga uma pedra comum e deixa a carroça para depois.",
    },
    {
      id: 4,
      nome: "Trancar quem passou",
      curto: "Trancar quem passou",
      descricao: "Deixa nas pontas um número que o próximo adversário não tem.",
    },
    {
      id: 5,
      nome: "Ajudar o parceiro",
      curto: "Ajudar o parceiro",
      descricao: "Deixa nas pontas o número que o parceiro jogou por último.",
    },
    {
      id: 6,
      nome: "Jogar o número que mais tenho",
      curto: "Número que mais tenho",
      descricao: "Deixa nas pontas o número que mais aparece na mão.",
    },
  ];
  const REGRA_POR_ID = Object.fromEntries(REGRAS.map((r) => [r.id, r]));

  // Assento 0 embaixo, 1 à direita, 2 em cima, 3 à esquerda.
  // Dupla 0: 0 e 2. Dupla 1: 1 e 3.
  const BOTS = [
    {
      i: 0,
      nome: "Seu Bené",
      artigo: "o",
      jeito: "o veterano da praça",
      dupla: 0,
      assento: "embaixo",
      ficha: [4, 3, 1],
    },
    {
      i: 1,
      nome: "Dona Cida",
      artigo: "a",
      jeito: "a que conta os pontos",
      dupla: 1,
      assento: "à direita",
      ficha: [1, 4, 6],
    },
    {
      i: 2,
      nome: "Nina",
      artigo: "a",
      jeito: "a parceira",
      dupla: 0,
      assento: "em cima",
      ficha: [5, 6, 3],
    },
    {
      i: 3,
      nome: "Tião",
      artigo: "o",
      jeito: "o afobado",
      dupla: 1,
      assento: "à esquerda",
      ficha: [2, 1, null],
    },
  ];

  // ---------- utilidades ----------

  function copiarFicha(f) {
    if (!Array.isArray(f)) return [null, null, null];
    const saida = [null, null, null];
    for (let k = 0; k < 3; k++) {
      const v = f[k];
      saida[k] = v === null || v === undefined || v === "" ? null : Number(v);
      if (saida[k] !== null && !REGRA_POR_ID[saida[k]]) saida[k] = null;
    }
    return saida;
  }

  function fichasOriginais() {
    return BOTS.map((b) => b.ficha.slice());
  }

  function nomeDaDupla(dupla) {
    return NOME_DUPLA[dupla] || "";
  }

  function criarBaralho() {
    const pedras = [];
    let id = 0;
    for (let a = 0; a < NUM; a++) {
      for (let b = a; b < NUM; b++) pedras.push({ id: id++, a, b });
    }
    return pedras;
  }

  // Mulberry32: o sorteio fica guardado no estado; a mesma semente repete a mão.
  function sortear(estado) {
    estado.rngEstado = (estado.rngEstado + 0x6d2b79f5) | 0;
    let t = estado.rngEstado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function embaralhar(estado, lista) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(sortear(estado) * (i + 1));
      const troca = lista[i];
      lista[i] = lista[j];
      lista[j] = troca;
    }
    return lista;
  }

  function pedra(estado, id) {
    return estado.pedras[id];
  }

  function ehCarroca(p) {
    return p.a === p.b;
  }

  function somaDaPedra(p) {
    return p.a + p.b;
  }

  function contarNumeros(estado, mao) {
    const cont = new Array(NUM).fill(0);
    for (const id of mao) {
      const p = pedra(estado, id);
      cont[p.a]++;
      cont[p.b]++;
    }
    return cont;
  }

  // ---------- começo de partida e de mão ----------

  function novaPartida(opcoes = {}) {
    const semente =
      opcoes.semente === undefined || opcoes.semente === null
        ? Math.floor(Math.random() * 0x7fffffff)
        : opcoes.semente >>> 0;

    const estado = {
      semente,
      rngEstado: semente >>> 0,
      fichas: opcoes.fichas ? opcoes.fichas.map(copiarFicha) : fichasOriginais(),
      jogadores: BOTS.map((b) => ({
        i: b.i,
        nome: b.nome,
        artigo: b.artigo,
        jeito: b.jeito,
        dupla: b.dupla,
        mao: [],
        faltas: new Array(NUM).fill(false),
        ultimoExposto: [],
      })),
      pedras: criarBaralho(),
      corrente: [],
      pontas: null,
      primeiraPedraId: null,
      vez: 0,
      primeiroDaMao: 0,
      maoNumero: 0,
      placar: [0, 0],
      fase: "jogando",
      resultado: null,
      obrigada: null,
      passesSeguidos: 0,
      historico: [],
      ultimaJogada: null,
      reduzir: !!opcoes.reduzir,
    };

    iniciarMao(estado, { primeira: true });
    return estado;
  }

  function iniciarMao(estado, opcoes) {
    estado.maoNumero += 1;
    estado.corrente = [];
    estado.pontas = null;
    estado.primeiraPedraId = null;
    estado.fase = "jogando";
    estado.resultado = null;
    estado.obrigada = null;
    estado.passesSeguidos = 0;
    estado.ultimaJogada = null;
    estado.historico = [];
    estado.jogadores.forEach((j) => {
      j.mao = [];
      j.faltas = new Array(NUM).fill(false);
      j.ultimoExposto = [];
    });

    const baralho = embaralhar(estado, criarBaralho());
    for (let rodada = 0; rodada < 7; rodada++) {
      for (let p = 0; p < 4; p++) estado.jogadores[p].mao.push(baralho.pop().id);
    }

    if (opcoes.primeira) {
      const achei = estado.jogadores.findIndex((j) =>
        j.mao.some((id) => {
          const p = pedra(estado, id);
          return p.a === 6 && p.b === 6;
        })
      );
      if (achei < 0) throw new Error("A mão não tem a carroça de sena.");
      estado.vez = achei;
      estado.primeiroDaMao = achei;
      estado.obrigada = estado.jogadores[achei].mao.find((id) => {
        const p = pedra(estado, id);
        return p.a === 6 && p.b === 6;
      });
    } else {
      estado.vez = opcoes.primeiro ?? 0;
      estado.primeiroDaMao = estado.vez;
    }
  }

  function proximaMao(estado) {
    if (estado.fase === "jogando") throw new Error("A mão ainda está jogando.");
    let primeiro = estado.primeiroDaMao;
    if (estado.resultado && estado.resultado.tipo === "bateu") primeiro = estado.resultado.jogador;
    iniciarMao(estado, { primeira: false, primeiro });
    return estado;
  }

  // ---------- jogadas possíveis ----------

  function movimento(estado, p, ponta, esq, dir) {
    return {
      pedraId: p.id,
      ponta,
      esq,
      dir,
      soma: somaDaPedra(p),
      carroca: ehCarroca(p),
    };
  }

  function jogadasLegais(estado, jogador) {
    if (estado.fase !== "jogando") return [];
    if (jogador !== estado.vez) return [];
    const j = estado.jogadores[jogador];

    if (estado.obrigada !== null && estado.obrigada !== undefined) {
      const p = pedra(estado, estado.obrigada);
      const unica = ehCarroca(p);
      return [movimento(estado, p, unica ? "unica" : "a", p.a, p.b)];
    }

    const movs = [];
    if (estado.corrente.length === 0) {
      for (const id of j.mao) {
        const p = pedra(estado, id);
        if (ehCarroca(p)) movs.push(movimento(estado, p, "unica", p.a, p.b));
        else {
          movs.push(movimento(estado, p, "a", p.a, p.b));
          movs.push(movimento(estado, p, "b", p.b, p.a));
        }
      }
      return movs;
    }

    const esq = estado.pontas.esq;
    const dir = estado.pontas.dir;
    for (const id of j.mao) {
      const p = pedra(estado, id);
      if (ehCarroca(p)) {
        if (p.a === esq) movs.push(movimento(estado, p, "esq", p.a, dir));
        if (p.a === dir) movs.push(movimento(estado, p, "dir", esq, p.a));
      } else {
        if (p.a === esq) movs.push(movimento(estado, p, "esq", p.b, dir));
        if (p.b === esq) movs.push(movimento(estado, p, "esq", p.a, dir));
        if (p.a === dir) movs.push(movimento(estado, p, "dir", esq, p.b));
        if (p.b === dir) movs.push(movimento(estado, p, "dir", esq, p.a));
      }
    }
    return movs;
  }

  function mesmaJogada(a, b) {
    return a.pedraId === b.pedraId && a.ponta === b.ponta && a.esq === b.esq && a.dir === b.dir;
  }

  function jogar(estado, jogador, mov) {
    if (estado.fase !== "jogando") throw new Error("A mão já acabou.");
    if (jogador !== estado.vez) throw new Error("Não é a vez desse jogador.");
    const legais = jogadasLegais(estado, jogador);
    const achou = legais.find((m) => mesmaJogada(m, mov));
    if (!achou) throw new Error("Jogada ilegal: a pedra não encaixa nessa ponta.");
    const j = estado.jogadores[jogador];
    const idx = j.mao.indexOf(mov.pedraId);
    if (idx < 0) throw new Error("A pedra não está na mão.");
    j.mao.splice(idx, 1);

    if (estado.corrente.length === 0) {
      estado.corrente.push({ pedraId: mov.pedraId, esq: mov.esq, dir: mov.dir });
      estado.primeiraPedraId = mov.pedraId;
    } else if (mov.ponta === "esq") {
      estado.corrente.unshift({ pedraId: mov.pedraId, esq: mov.esq, dir: estado.pontas.esq });
    } else if (mov.ponta === "dir") {
      estado.corrente.push({ pedraId: mov.pedraId, esq: estado.pontas.dir, dir: mov.dir });
    } else {
      throw new Error("Ponta inválida.");
    }

    estado.pontas = {
      esq: estado.corrente[0].esq,
      dir: estado.corrente[estado.corrente.length - 1].dir,
    };

    let numeroExposto = null;
    if (estado.corrente.length === 1) {
      numeroExposto = [mov.esq, mov.dir];
    } else if (mov.ponta === "esq") {
      numeroExposto = [mov.esq];
    } else {
      numeroExposto = [mov.dir];
    }
    const unicos = [...new Set(numeroExposto)];
    j.ultimoExposto = unicos;
    estado.ultimaJogada = {
      por: jogador,
      pedraId: mov.pedraId,
      ponta: mov.ponta,
      expostos: unicos,
      pedra: { a: pedra(estado, mov.pedraId).a, b: pedra(estado, mov.pedraId).b },
    };
    estado.passesSeguidos = 0;
    estado.obrigada = null;

    const ev = {
      tipo: "jogada",
      jogador,
      pedraId: mov.pedraId,
      ponta: mov.ponta,
      pontas: { ...estado.pontas },
      expostos: unicos,
    };

    if (j.mao.length === 0) {
      estado.fase = "bateu";
      estado.resultado = {
        tipo: "bateu",
        jogador,
        dupla: j.dupla,
        placar: estado.placar.slice(),
      };
      estado.placar[j.dupla] += 1;
      estado.resultado.placar = estado.placar.slice();
    } else {
      estado.vez = (estado.vez + 1) % 4;
    }
    estado.historico.push(ev);
    return ev;
  }

  // ---------- passar e fechar ----------

  function passar(estado, jogador) {
    if (estado.fase !== "jogando") throw new Error("A mão já acabou.");
    if (jogador !== estado.vez) throw new Error("Não é a vez desse jogador.");
    if (jogadasLegais(estado, jogador).length) {
      throw new Error("Passou tendo jogada.");
    }
    if (!estado.pontas) throw new Error("Não dá para passar sem pedra na mesa.");
    const j = estado.jogadores[jogador];
    const faltas = [...new Set([estado.pontas.esq, estado.pontas.dir])];
    for (const n of faltas) j.faltas[n] = true;
    j.ultimoExposto = [];
    estado.passesSeguidos += 1;
    estado.ultimaJogada = null;

    const ev = {
      tipo: "passo",
      jogador,
      faltas,
      pontas: { ...estado.pontas },
      passesSeguidos: estado.passesSeguidos,
    };
    estado.historico.push(ev);

    if (estado.passesSeguidos >= 4) {
      fecharMao(estado);
      ev.fechou = true;
      return ev;
    }

    estado.vez = (estado.vez + 1) % 4;
    return ev;
  }

  function pontosNaMao(estado, jogador) {
    return estado.jogadores[jogador].mao.reduce((s, id) => s + somaDaPedra(pedra(estado, id)), 0);
  }

  function pontosPorDupla(estado) {
    const jogadores = estado.jogadores.map((j) => pontosNaMao(estado, j.i));
    return [jogadores[0] + jogadores[2], jogadores[1] + jogadores[3]];
  }

  function fecharMao(estado) {
    if (estado.fase !== "jogando") return estado.resultado;
    const pontos = estado.jogadores.map((j) => pontosNaMao(estado, j.i));
    const duplas = pontosPorDupla(estado);
    let vencedorDupla = null;
    if (duplas[0] < duplas[1]) vencedorDupla = 0;
    else if (duplas[1] < duplas[0]) vencedorDupla = 1;
    if (vencedorDupla !== null) estado.placar[vencedorDupla] += 1;
    estado.fase = "fechou";
    estado.resultado = {
      tipo: "fechou",
      pontos,
      duplas,
      vencedorDupla,
      placar: estado.placar.slice(),
    };
    estado.historico.push({ tipo: "fechou", pontos, duplas, vencedorDupla });
    return estado.resultado;
  }

  // ---------- as seis regras ----------

  function maisPesada(movs) {
    let melhor = movs[0];
    for (const m of movs) if (m.soma > melhor.soma) melhor = m;
    return melhor;
  }

  function nomeDoProximo(estado, jogador) {
    const j = estado.jogadores[(jogador + 1) % 4];
    return `${j.artigo} ${j.nome}`;
  }

  function nomeDoParceiro(estado, jogador) {
    const j = estado.jogadores[(jogador + 2) % 4];
    return `${j.artigo} ${j.nome}`;
  }

  function frasePedra(p) {
    return ehCarroca(p) ? `a carroça de ${p.a}, ${somaDaPedra(p)} pontos` : `${p.a} e ${p.b}, ${somaDaPedra(p)} pontos`;
  }

  function escolherRegra(idRegra, estado, jogador, movs) {
    const j = estado.jogadores[jogador];

    if (idRegra === 1) {
      const m = maisPesada(movs);
      const p = pedra(estado, m.pedraId);
      return {
        ...m,
        nomeRegra: REGRA_POR_ID[1].nome,
        porque: `Jogar a pedra mais pesada: ${frasePedra(p)}.`,
      };
    }

    if (idRegra === 2) {
      const carrocas = movs.filter((m) => m.carroca);
      if (!carrocas.length) return null;
      const m = maisPesada(carrocas);
      const p = pedra(estado, m.pedraId);
      return {
        ...m,
        nomeRegra: REGRA_POR_ID[2].nome,
        porque: `Jogar carroça quando puder: ${frasePedra(p)}.`,
      };
    }

    if (idRegra === 3) {
      const comuns = movs.filter((m) => !m.carroca);
      if (!comuns.length) return null;
      const m = maisPesada(comuns);
      const p = pedra(estado, m.pedraId);
      const temCarroca = j.mao.some((id) => {
        if (id === m.pedraId) return false;
        return ehCarroca(pedra(estado, id));
      });
      return {
        ...m,
        nomeRegra: REGRA_POR_ID[3].nome,
        porque: temCarroca
          ? `Guardar as carroças: joguei ${frasePedra(p)} e deixei a carroça para depois.`
          : `Guardar as carroças: joguei ${frasePedra(p)}.`,
      };
    }

    if (idRegra === 4) {
      const proximo = estado.jogadores[(jogador + 1) % 4];
      const faltas = proximo.faltas;
      const bons = movs.filter((m) => faltas[m.esq] || faltas[m.dir]);
      if (!bons.length) return null;
      const m = maisPesada(bons);
      const nums = [...new Set([m.esq, m.dir])].filter((n) => faltas[n]);
      const nome = ` ${proximo.artigo} ${proximo.nome}`.trim();
      let porque;
      if (nums.length >= 2) {
        porque = `Trancar quem passou: deixei o ${nums[0]} e o ${nums[1]} nas pontas, e ${nome} não tem ${nums[0]} nem ${nums[1]}.`;
      } else {
        porque = `Trancar quem passou: deixei o ${nums[0]} nas pontas, e ${nome} não tem ${nums[0]}.`;
      }
      return { ...m, nomeRegra: REGRA_POR_ID[4].nome, porque };
    }

    if (idRegra === 5) {
      const parceiro = estado.jogadores[(jogador + 2) % 4];
      const numeros = parceiro.ultimoExposto || [];
      if (!numeros.length) return null;
      const bons = movs.filter((m) => numeros.includes(m.esq) || numeros.includes(m.dir));
      if (!bons.length) return null;
      const m = maisPesada(bons);
      const n = [...new Set([m.esq, m.dir])].find((x) => numeros.includes(x));
      return {
        ...m,
        nomeRegra: REGRA_POR_ID[5].nome,
        porque: `Ajudar o parceiro: deixei o ${n} nas pontas, o número que ${parceiro.artigo} ${parceiro.nome} jogou por último.`,
      };
    }

    if (idRegra === 6) {
      let melhor = null;
      let melhorNota = null;
      for (const m of movs) {
        const maoDepois = j.mao.filter((id) => id !== m.pedraId);
        const cont = contarNumeros(estado, maoDepois);
        const a = cont[m.esq];
        const b = cont[m.dir];
        const nota = [Math.max(a, b), Math.min(a, b), m.soma];
        if (
          !melhorNota ||
          nota[0] > melhorNota[0] ||
          (nota[0] === melhorNota[0] && nota[1] > melhorNota[1]) ||
          (nota[0] === melhorNota[0] && nota[1] === melhorNota[1] && nota[2] > melhorNota[2])
        ) {
          melhor = m;
          melhorNota = nota;
        }
      }
      if (!melhor) return null;
      const n = contagemDe(melhor, estado, jogador) >= contagemDe2(melhor, estado, jogador) ? melhor.esq : melhor.dir;
      const qtd = melhorQtd(melhor, estado, jogador, n);
      const palavra = ["nenhum", "um", "dois", "três", "quatro", "cinco", "seis"][qtd] || String(qtd);
      return {
        ...melhor,
        nomeRegra: REGRA_POR_ID[6].nome,
        porque:
          qtd === 0
            ? `Jogar o número que mais tenho: deixei o ${n} nas pontas, e não tenho outro ${n} na mão.`
            : `Jogar o número que mais tenho: deixei o ${n} nas pontas, e ainda tenho ${palavra} ${n} na mão.`,
      };
    }

    return null;
  }

  // Auxiliares da regra 6, para a frase e o desempate.
  function contagemDe(m, estado, jogador) {
    const j = estado.jogadores[jogador];
    const cont = contarNumeros(estado, j.mao.filter((id) => id !== m.pedraId));
    return cont[m.esq];
  }
  function contagemDe2(m, estado, jogador) {
    const j = estado.jogadores[jogador];
    const cont = contarNumeros(estado, j.mao.filter((id) => id !== m.pedraId));
    return cont[m.dir];
  }
  function melhorQtd(m, estado, jogador, n) {
    const j = estado.jogadores[jogador];
    const cont = contarNumeros(estado, j.mao.filter((id) => id !== m.pedraId));
    return cont[n];
  }

  function decidir(estado, jogador, ficha) {
    const movs = jogadasLegais(estado, jogador);
    if (!movs.length) return null;

    if (estado.obrigada !== null && estado.obrigada !== undefined) {
      return {
        ...movs[0],
        regra: -2,
        regraId: null,
        nomeRegra: "Regra da mesa",
        porque: "Primeira mão: a carroça de sena abre o jogo.",
      };
    }

    const f = copiarFicha(ficha || estado.fichas[jogador]);
    for (let slot = 0; slot < 3; slot++) {
      const idRegra = f[slot];
      if (!idRegra) continue;
      const escolha = escolherRegra(idRegra, estado, jogador, movs);
      if (escolha) {
        return { ...escolha, regra: slot, regraId: idRegra };
      }
    }

    const m = movs[0];
    return {
      ...m,
      regra: -1,
      regraId: null,
      nomeRegra: "Nenhuma regra serviu",
      porque: "Nenhuma regra serviu: joguei a primeira que encaixa.",
    };
  }

  // ---------- leitura para a tela e para os testes ----------

  function retrato(estado) {
    return {
      semente: estado.semente,
      maoNumero: estado.maoNumero,
      fase: estado.fase,
      vez: estado.vez,
      placar: estado.placar.slice(),
      pontas: estado.pontas ? { ...estado.pontas } : null,
      corrente: estado.corrente.map((c) => ({ ...c })),
      primeiraPedraId: estado.primeiraPedraId,
      obrigada: estado.obrigada,
      jogadores: estado.jogadores.map((j) => ({
        i: j.i,
        nome: j.nome,
        dupla: j.dupla,
        mao: j.mao.slice(),
        faltas: j.faltas.slice(),
        ultimoExposto: j.ultimoExposto.slice(),
      })),
      resultado: estado.resultado
        ? {
            ...estado.resultado,
            pontos: estado.resultado.pontos ? estado.resultado.pontos.slice() : undefined,
            duplas: estado.resultado.duplas ? estado.resultado.duplas.slice() : undefined,
            placar: estado.resultado.placar ? estado.resultado.placar.slice() : undefined,
          }
        : null,
      fichas: estado.fichas.map((f) => f.slice()),
    };
  }

  function jogadaDaVez(estado) {
    const j = estado.jogadores[estado.vez];
    return { jogador: j.i, nome: j.nome, movs: jogadasLegais(estado, j.i) };
  }

  function textoDaPedra(p) {
    return p.a === p.b ? `carroça de ${p.a}` : `${p.a} e ${p.b}`;
  }

  return {
    NUM,
    REGRAS,
    REGRA_POR_ID,
    BOTS,
    NOME_DUPLA,
    criarBaralho,
    fichasOriginais,
    nomeDaDupla,
    novaPartida,
    iniciarMao,
    proximaMao,
    jogadasLegais,
    jogar,
    passar,
    fecharMao,
    pontosNaMao,
    pontosPorDupla,
    decidir,
    escolherRegra,
    retrato,
    jogadaDaVez,
    textoDaPedra,
    ehCarroca,
    somaDaPedra,
    pedra,
  };
});
