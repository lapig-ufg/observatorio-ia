// Telas da abertura: capa, levantamento (pontos chegando) e a sala em pontos.

(() => {
  const Q = window.QUESTIONARIO;
  const { turma } = window.CURSO;

  // ----- Capa: turma e data -----
  const turmaCapa = document.querySelector(".turma-capa");
  if (turma) {
    turmaCapa.hidden = false;
    turmaCapa.textContent = `Turma ${turma}, ${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`;
  }

  // ----- Levantamento: QR e pontos chegando -----
  const telaLev = document.getElementById("levantamento");
  const destino = new URL("responder.html", location.href);
  if (turma) destino.searchParams.set("turma", turma);
  const qr = qrcode(0, "M");
  qr.addData(destino.href);
  qr.make();
  telaLev.querySelector(".qr-codigo").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  telaLev.querySelector(".qr-codigo svg").setAttribute("aria-label", "QR code para responder ao levantamento");
  telaLev.querySelector(".endereco").textContent = destino.host + destino.pathname.replace(/\/index\.html$/, "/") + (turma ? `?turma=${turma}` : "");

  const chegada = window.criarSala(telaLev.querySelector(".sala"), { pergunta: -1 });
  const contador = telaLev.querySelector(".contador strong");
  const rotulo = telaLev.querySelector(".contador span");
  telaLev.querySelector(".sala").addEventListener("dados", (e) => {
    const n = e.detail.total;
    contador.textContent = n;
    rotulo.textContent = n === 1 ? "resposta" : "respostas";
  });
  telaLev.addEventListener("entrou", chegada.ligar);
  telaLev.addEventListener("saiu", chegada.desligar);

  // ----- A sala em pontos -----
  const telaSala = document.getElementById("sala");
  const raiz = telaSala.querySelector(".sala");
  const sala = window.criarSala(raiz, { pergunta: 0 });
  const titulo = telaSala.querySelector(".pergunta-titulo");
  const abas = telaSala.querySelector(".abas-perguntas");
  const legenda = telaSala.querySelector(".legenda");

  Q.PERGUNTAS.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<kbd>${i + 1}</kbd>${p.curta}`;
    b.setAttribute("aria-pressed", i === 0);
    b.addEventListener("click", () => mostrar(i));
    abas.append(b);
  });
  const mostrar = (i) => {
    sala.pergunta(i);
    titulo.textContent = Q.PERGUNTAS[i].texto;
    [...abas.children].forEach((b, k) => b.setAttribute("aria-pressed", k === i));
  };

  legenda.innerHTML = "<span>Cor do ponto: frequência de uso</span>" + Q.PERGUNTAS[0].opcoes
    .map((o, i) => `<span><i style="background:var(--f${i + 1})"></i>${o}</span>`).join("");

  const chave = telaSala.querySelectorAll(".chave button");
  if (!turma) {
    // Sem código de turma, só existe o total.
    telaSala.querySelector(".chave").hidden = true;
    sala.escopo("todas");
  }
  chave.forEach((b) => b.addEventListener("click", () => {
    chave.forEach((x) => x.setAttribute("aria-pressed", x === b));
    sala.escopo(b.dataset.escopo);
  }));

  telaSala.addEventListener("entrou", sala.ligar);
  telaSala.addEventListener("saiu", sala.desligar);
  telaSala.addEventListener("tecla", (e) => {
    const n = +e.detail.key;
    if (n >= 1 && n <= Q.PERGUNTAS.length) { mostrar(n - 1); e.preventDefault(); }
    if (e.detail.key === "t" || e.detail.key === "T") {
      const outro = [...chave].find((b) => b.getAttribute("aria-pressed") === "false");
      outro?.click(); e.preventDefault();
    }
  });

  // ----- Mau-Mau: só roda enquanto a tela está à vista -----
  const telaMM = document.getElementById("maumau");
  const mesa = window.criarMesaMauMau(telaMM.querySelector(".mm"));
  telaMM.addEventListener("entrou", mesa.ligar);
  telaMM.addEventListener("saiu", mesa.desligar);
  telaMM.addEventListener("tecla", (e) => { if (mesa.tecla(e.detail.key)) e.preventDefault(); });

  // ----- Ensaio (só no modo de demonstração): S simula 5 respostas, 0 apaga -----
  if (Q.demo()) {
    [telaLev, telaSala].forEach((t) => {
      const aviso = document.createElement("p");
      aviso.className = "aviso-demo";
      aviso.textContent = "Modo de demonstração: as respostas ficam só neste navegador. No modo aula, S simula cinco respostas e 0 apaga tudo.";
      (t.querySelector(".sala-rodape") || t.querySelector(".contador").parentElement).append(aviso);
      t.addEventListener("tecla", (e) => {
        if (e.detail.key === "s" || e.detail.key === "S") { Q.simular(turma, 5); chegada.atualizar(); sala.atualizar(); e.preventDefault(); }
        if (e.detail.key === "0") { Q.limparDemo(); chegada.atualizar(); sala.atualizar(); e.preventDefault(); }
      });
    });
  }
})();
