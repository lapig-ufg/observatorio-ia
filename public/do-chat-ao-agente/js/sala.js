// "A sala em pontos": cada resposta é um ponto. O ponto é a mesma pessoa em
// todas as perguntas; a cor vem da frequência de uso (pergunta 1).
// Desenha em canvas e só anima enquanto algo se move.

(() => {
  const Q = window.QUESTIONARIO;
  const cores = () => {
    const s = getComputedStyle(document.documentElement);
    return ["--f1", "--f2", "--f3", "--f4", "--f5"].map((v) => s.getPropertyValue(v).trim());
  };

  function criarSala(raiz, opcoes = {}) {
    const canvas = raiz.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const estado = {
      pergunta: opcoes.pergunta ?? 0,   // índice da pergunta agrupada; -1 = pilha única (chegada)
      escopo: "turma",                  // "turma" ou "todas"
      linhas: [],
      pontos: new Map(),                // chave da linha -> {x, y, tx, ty, cor}
      larg: 0, alt: 0, dpr: 1,
      rotulos: [],
      raf: 0,
    };
    const paleta = cores();

    const chave = (l, i) => `${l.t}-${l.turma}-${i}`;

    function medir() {
      const r = canvas.getBoundingClientRect();
      estado.dpr = Math.min(2, devicePixelRatio || 1);
      estado.larg = r.width; estado.alt = r.height;
      canvas.width = Math.round(r.width * estado.dpr);
      canvas.height = Math.round(r.height * estado.dpr);
      calcularAlvos();
    }

    // Respostas de quem visitou a página sem turma ficam fora das contas da sala.
    function visiveis() {
      const turma = window.CURSO?.turma;
      if (estado.escopo === "turma" && turma) return estado.linhas.filter((l) => l.turma === turma);
      return estado.linhas.filter((l) => l.turma !== "VISITANTE");
    }

    // Distribui os pontos de cada opção em colunas, empilhados de baixo para cima.
    function calcularAlvos() {
      const W = estado.larg, H = estado.alt;
      if (!W || !H) return;
      const linhas = visiveis();
      // Rótulos legíveis a 6 m no projetor: nunca abaixo de 15 px no modo aula.
      const fonte = Math.max(window.CURSO?.emAula?.() ? 15 : 12, Math.min(20, W / 58));
      estado.fonte = fonte;
      estado.rotulos = [];

      const p = estado.pergunta;
      const grupos = p < 0 ? [{ nome: "", itens: linhas }] :
        Q.PERGUNTAS[p].opcoes.map((nome, k) => ({ nome, itens: linhas.filter((l) => l.r[p] === k) }));
      const n = grupos.length;
      const maior = Math.max(1, ...grupos.map((g) => g.itens.length));

      // Tela estreita (celular): uma linha por opção, rótulo à esquerda e pontos à direita.
      estado.deitado = p >= 0 && W < 560;
      if (estado.deitado) return alvosDeitados(grupos, linhas, W, H, fonte, maior);

      const base = p < 0 ? H - 6 : H - fonte * 4.2;   // espaço dos rótulos embaixo
      const colW = W / n;

      // Na chegada (pilha única) o monte é estreito, para crescer para cima e encher o palco.
      const largUtil = p < 0 ? Math.min(colW * 0.82, Math.max(180, Math.sqrt(maior) * 34)) : colW * 0.82;
      // Raio: o maior que faz a coluna mais cheia caber na altura disponível.
      let raio = Math.min(colW / 6, 24);
      const caber = (r) => {
        const porLinha = Math.max(1, Math.floor(largUtil / (2 * r + 2)));
        return Math.ceil(maior / porLinha) * (2 * r + 2) <= base - 10;
      };
      while (raio > 2 && !caber(raio)) raio -= 0.5;
      estado.raio = raio;
      const passoP = 2 * raio + 2;
      const porLinha = Math.max(1, Math.floor(largUtil / passoP));

      const vivos = new Set();
      grupos.forEach((g, gi) => {
        const cx = colW * (gi + 0.5);
        // Ordena por frequência para que as cores formem faixas legíveis.
        const itens = [...g.itens].sort((a, b) => a.r[0] - b.r[0] || a.t - b.t);
        itens.forEach((l, k) => {
          const linha = Math.floor(k / porLinha), col = k % porLinha;
          const larguraLinha = Math.min(porLinha, itens.length - linha * porLinha) * passoP;
          const tx = cx - larguraLinha / 2 + col * passoP + raio + 1;
          const ty = base - linha * passoP - raio - 1;
          const id = l._id;
          vivos.add(id);
          let pt = estado.pontos.get(id);
          if (!pt) {
            pt = { x: tx + (Math.random() - 0.5) * 30, y: -20 - Math.random() * 120, tx, ty, cor: paleta[l.r[0]] || paleta[2] };
            estado.pontos.set(id, pt);
          }
          pt.tx = tx; pt.ty = ty;
        });
        const total = linhas.length || 1;
        estado.rotulos.push({ x: cx, w: colW * 0.92, nome: g.nome, qtd: g.itens.length, pct: Math.round((100 * g.itens.length) / total) });
      });
      for (const id of [...estado.pontos.keys()]) if (!vivos.has(id)) estado.pontos.delete(id);
      animar();
    }

    function alvosDeitados(grupos, linhas, W, H, fonte, maior) {
      const rotW = Math.min(150, W * 0.4);
      const linhaH = H / grupos.length;
      const largUtil = W - rotW - 8;
      let raio = Math.min(10, linhaH / 3);
      const caber = (r) => Math.ceil(maior / Math.max(1, Math.floor(largUtil / (2 * r + 2)))) * (2 * r + 2) <= linhaH - 8;
      while (raio > 2 && !caber(raio)) raio -= 0.5;
      estado.raio = raio;
      const passoP = 2 * raio + 2;
      const porLinha = Math.max(1, Math.floor(largUtil / passoP));
      const vivos = new Set();
      const total = linhas.length || 1;
      grupos.forEach((g, gi) => {
        const y0 = gi * linhaH + 4;
        [...g.itens].sort((a, b) => a.r[0] - b.r[0] || a.t - b.t).forEach((l, k) => {
          const tx = rotW + 8 + (k % porLinha) * passoP + raio;
          const ty = y0 + Math.floor(k / porLinha) * passoP + raio;
          vivos.add(l._id);
          let pt = estado.pontos.get(l._id);
          if (!pt) { pt = { x: tx, y: -20, tx, ty, cor: paleta[l.r[0]] || paleta[2] }; estado.pontos.set(l._id, pt); }
          pt.tx = tx; pt.ty = ty;
        });
        estado.rotulos.push({ y: y0, w: rotW, nome: g.nome, qtd: g.itens.length, pct: Math.round((100 * g.itens.length) / total) });
      });
      for (const id of [...estado.pontos.keys()]) if (!vivos.has(id)) estado.pontos.delete(id);
      animar();
    }

    function desenhar() {
      const { dpr } = estado;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, estado.larg, estado.alt);
      const r = estado.raio || 6;
      for (const pt of estado.pontos.values()) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = pt.cor;
        ctx.fill();
      }
      if (estado.pergunta < 0) return;
      const f = estado.fonte;
      ctx.textBaseline = "top";
      if (estado.deitado) {
        ctx.textAlign = "left";
        estado.rotulos.forEach((rt) => {
          ctx.fillStyle = "#114d3b";
          ctx.font = `700 ${f * 1.05}px Georgia, serif`;
          ctx.fillText(rt.qtd ? `${rt.pct}%` : "–", 0, rt.y);
          ctx.fillStyle = "#10211b";
          ctx.font = `500 ${f * 0.9}px Inter, system-ui, sans-serif`;
          quebrar(rt.nome, rt.w).slice(0, 2).forEach((t, i) => ctx.fillText(t, 0, rt.y + f * 1.3 + i * f * 1.05));
        });
        return;
      }
      const base = estado.alt - f * 4.2;
      ctx.textAlign = "center";
      estado.rotulos.forEach((rt) => {
        ctx.fillStyle = "#ccd9d2";
        ctx.fillRect(rt.x - rt.w / 2, base + 4, rt.w, 1);
        ctx.fillStyle = "#114d3b";
        ctx.font = `700 ${f * 1.2}px Georgia, serif`;
        ctx.fillText(rt.qtd ? `${rt.pct}%` : "–", rt.x, base + 10);
        ctx.fillStyle = "#10211b";
        ctx.font = `500 ${f * 0.92}px Inter, system-ui, sans-serif`;
        quebrar(rt.nome, rt.w).slice(0, 2).forEach((t, i) => ctx.fillText(t, rt.x, base + 10 + f * 1.5 + i * f * 1.08));
      });
    }

    function quebrar(texto, w) {
      const palavras = texto.split(" ");
      const linhas = [];
      let atual = "";
      for (const p of palavras) {
        const tenta = atual ? atual + " " + p : p;
        if (ctx.measureText(tenta).width > w && atual) { linhas.push(atual); atual = p; } else atual = tenta;
      }
      if (atual) linhas.push(atual);
      return linhas;
    }

    function animar() {
      if (estado.raf) return;
      const passo = () => {
        let movendo = false;
        const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
        for (const pt of estado.pontos.values()) {
          const dx = pt.tx - pt.x, dy = pt.ty - pt.y;
          if (reduzido || (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3)) { pt.x = pt.tx; pt.y = pt.ty; continue; }
          pt.x += dx * 0.12; pt.y += dy * 0.12; movendo = true;
        }
        desenhar();
        estado.raf = movendo ? requestAnimationFrame(passo) : 0;
      };
      estado.raf = requestAnimationFrame(passo);
    }

    let vez = 0;
    async function atualizar() {
      try {
        const linhas = await Q.listar();
        linhas.forEach((l, i) => { l._id = `${l.t}|${l.turma}|${i}`; });
        estado.linhas = linhas.filter((l) => Array.isArray(l.r) && l.r.length === 4);
        raiz.dispatchEvent(new CustomEvent("dados", { detail: { total: visiveis().length } }));
        calcularAlvos();
      } catch (e) {
        raiz.dispatchEvent(new CustomEvent("falha", { detail: e }));
      }
    }

    let timer = 0;
    // Na sala, a tela consulta a cada 4 s; quem lê no Observatório consulta a cada minuto.
    const ligar = () => { if (timer) return; medir(); atualizar(); timer = setInterval(atualizar, window.CURSO?.emAula?.() ? 4000 : 60000); };
    const desligar = () => { clearInterval(timer); timer = 0; cancelAnimationFrame(estado.raf); estado.raf = 0; };

    new ResizeObserver(() => { if (timer) medir(); }).observe(canvas);

    return {
      ligar, desligar, atualizar,
      pergunta(p) { estado.pergunta = p; calcularAlvos(); },
      escopo(e) { estado.escopo = e; calcularAlvos(); raiz.dispatchEvent(new CustomEvent("dados", { detail: { total: visiveis().length } })); },
      get estado() { return estado; },
    };
  }

  window.criarSala = criarSala;
})();
