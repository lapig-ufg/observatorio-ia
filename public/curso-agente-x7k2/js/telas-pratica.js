// Telas 11 a 19: instalação, primeiro contato e segurança.

(() => {
  const guardar = (k, v) => { try { localStorage.setItem("curso-" + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem("curso-" + k)) ?? padrao; } catch { return padrao; } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Campos de digitar não mudam de tela com as setas.
  document.querySelectorAll(".tela input[type=text], .tela input[type=search]").forEach((i) => i.addEventListener("keydown", (e) => e.stopPropagation()));

  // ----- 11 · Conferências (ficam salvas para quem marcou) -----
  const marcadas = ler("conferir", {});
  document.querySelectorAll(".conferir input").forEach((c) => {
    c.checked = !!marcadas[c.dataset.chave];
    c.addEventListener("change", () => { marcadas[c.dataset.chave] = c.checked; guardar("conferir", marcadas); });
  });

  // QR para o participante abrir a apresentação no próprio computador.
  const abrir = document.querySelector(".abrir-aqui");
  if (abrir && window.qrcode) {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const url = new URL(local && window.CURSO_PUBLICO ? window.CURSO_PUBLICO : location.pathname.replace(/[^/]*$/, ""), location.href);
    if (window.CURSO?.turma) url.searchParams.set("turma", window.CURSO.turma);
    const qr = qrcode(0, "M"); qr.addData(url.href); qr.make();
    abrir.querySelector(".qr-pequeno").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    abrir.querySelector(".endereco-curso").textContent = url.host + url.pathname;
  }

  // ----- Copiar -----
  const copiar = async (texto, botao) => {
    try { await navigator.clipboard.writeText(texto); } catch { /* navegador sem permissão: a pessoa seleciona à mão */ }
    const antes = botao.textContent;
    botao.textContent = "Copiado";
    setTimeout(() => { botao.textContent = antes; }, 1600);
  };
  document.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", () => copiar(b.dataset.copiar, b)));

  // ----- 13 · Monitor do curso (busca nas perguntas frequentes; ainda sem IA) -----
  const FAQ = [
    { p: "Entrar com a conta da instituição não funciona", r: "O Antigravity só aceita conta de instituição quando ela libera o programa. Use uma conta Google pessoal, como @gmail.com, que funciona no plano gratuito.", k: "conta login entrar instituição ufg institucional workspace email falha erro acesso" },
    { p: "O Windows bloqueou o instalador", r: "Se o arquivo veio de antigravity.google/download, clique em “Mais informações” e depois em “Executar assim mesmo”. Se veio de outro lugar, não instale.", k: "windows bloqueou smartscreen protegeu instalador executar aviso antivírus" },
    { p: "Não tenho permissão para instalar programas", r: "Em computador da instituição, quem instala costuma ser o suporte de TI. Para hoje, use outro computador ou faça em dupla.", k: "permissão administrador admin senha instalar bloqueado ti suporte" },
    { p: "A cota acabou", r: "No plano gratuito, o limite renova toda semana. Na aula, faça em dupla com quem ainda tem cota, ou entre com outra conta Google pessoal.", k: "cota limite acabou quota esgotou rate limit espera" },
    { p: "O agente pediu para instalar algo", r: "Leia o pedido: o que ele quer instalar e para quê. Biblioteca para ler PDF ou planilha costuma ser normal. Na dúvida, recuse e pergunte por quê.", k: "instalar pip python biblioteca permissão comando pediu aprovar" },
    { p: "Não sei onde ficou o arquivo que ele criou", r: "Fica dentro da pasta que você abriu. Peça: “me diga o caminho completo do arquivo que você criou”.", k: "onde arquivo salvou criou achar pasta caminho resultado" },
    { p: "Ele mexeu no arquivo errado", r: "Pare o agente. Volte para a última cópia da pasta, que você guardou antes do passo grande. Depois diga a ele exatamente qual arquivo usar.", k: "errado apagou mexeu estragou desfazer voltar original" },
    { p: "No opencode: comando não encontrado", r: "Feche e abra o terminal de novo depois de instalar. Se continuar, confira se o Node.js está instalado com: node --version", k: "opencode comando não encontrado not found terminal npm node instalar" },
    { p: "Apareceu uma mensagem de erro em inglês", r: "Se a IA já está instalada, copie a mensagem inteira e cole nela: “Deu este erro, o que faço?”. Se não está, mostre ao monitor ou a quem está ao lado.", k: "erro inglês mensagem error falhou exception" },
  ];
  const campoMonitor = document.querySelector(".monitor input");
  const respostas = document.querySelector(".monitor-respostas");
  const normal = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const buscar = () => {
    const termos = normal(campoMonitor.value).split(/\W+/).filter((t) => t.length > 2);
    const achados = termos.length
      ? FAQ.map((f) => ({ f, n: termos.filter((t) => normal(f.p + " " + f.k).includes(t)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.f)
      : FAQ.slice(0, 3);
    respostas.innerHTML = achados.length
      ? achados.map((f) => `<li><b>${esc(f.p)}</b>${esc(f.r)}</li>`).join("")
      : `<li><b>Não achei nas perguntas frequentes.</b>Chame o monitor da sala ou o Victor.</li>`;
  };
  campoMonitor?.addEventListener("input", buscar);
  if (campoMonitor) buscar();

  // ----- Intervalo: hora de voltar -----
  const telaIntervalo = document.getElementById("intervalo-1");
  // A hora de voltar é marcada na primeira vez que a tela aparece; R marca de novo.
  let volta = null;
  const marcarVolta = () => {
    volta = new Date(Date.now() + 15 * 60000);
    telaIntervalo.querySelector(".intervalo-hora strong").textContent = volta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  telaIntervalo?.addEventListener("entrou", () => { if (!volta) marcarVolta(); });
  telaIntervalo?.addEventListener("tecla", (e) => { if (e.detail.key === "r" || e.detail.key === "R") { marcarVolta(); e.preventDefault(); } });

  // ----- 15 · Montador de pedido -----
  const montador = document.querySelector(".montador");
  if (montador) {
    const partes = [...montador.querySelectorAll(".parte")];
    const saida = montador.querySelector(".montado");
    const texto = () => {
      const [ler, fazer, salvar, naoMexer] = partes.map((p) => p.querySelector("input").value.trim());
      return [ler && `Leia ${ler}.`, fazer && `${fazer.charAt(0).toUpperCase() + fazer.slice(1)}.`, salvar && `Salve em ${salvar}.`, naoMexer && `${naoMexer.charAt(0).toUpperCase() + naoMexer.slice(1)}.`]
        .filter(Boolean).join(" ").replace(/\.\./g, ".");
    };
    const desenhar = () => {
      const [ler, fazer, salvar, naoMexer] = partes.map((p) => esc(p.querySelector("input").value.trim()));
      const cor = (c, t) => (t ? `<mark style="--c:var(${c})">${t}</mark>` : "");
      saida.innerHTML = [
        ler && `Leia ${cor("--p1", ler)}.`, fazer && `${cor("--p2", fazer.charAt(0).toUpperCase() + fazer.slice(1))}.`,
        salvar && `Salve em ${cor("--p3", salvar)}.`, naoMexer && `${cor("--p4", naoMexer.charAt(0).toUpperCase() + naoMexer.slice(1))}.`,
      ].filter(Boolean).join(" ");
    };
    partes.forEach((p) => p.querySelector("input").addEventListener("input", desenhar));
    montador.querySelector(".copiar-pedido").addEventListener("click", (e) => copiar(texto(), e.currentTarget));
    desenhar();
  }

  // ----- 16 · Aprovar ou recusar -----
  const explica = document.querySelector(".pp-explica");
  document.querySelectorAll("[data-resposta]").forEach((b) => b.addEventListener("click", () => {
    explica.innerHTML = b.dataset.resposta === "permitir"
      ? "<b>Permitido.</b> O <code>pip</code> instala uma biblioteca de Python neste computador. Para ler PDF, é um pedido normal. Desconfie se o comando apagar, enviar ou baixar algo que você não pediu."
      : "<b>Recusado.</b> Nada foi instalado. O agente vai tentar outro caminho ou explicar por que precisa. Na dúvida, pergunte: “para que serve isso?”.";
  }));

  // ----- 18 · Triagem de arquivos -----
  const TRIAGEM = [
    { nome: "tabela-ibge-municipios.csv", ext: "csv", certa: 0, motivo: "Dado público. Pode abrir sem medo." },
    { nome: "minuta-edital-2027.docx", ext: "docx", certa: 0, motivo: "Pode, se ainda não for sigilosa. Antes da publicação, confira as regras do seu setor." },
    { nome: "notas-turma-2026.xlsx", ext: "xlsx", certa: 1, motivo: "Tem nome de estudante junto com nota. Troque os nomes por códigos antes de abrir." },
    { nome: "processo-com-cpf.pdf", ext: "pdf", certa: 1, motivo: "CPF e endereço são dados pessoais. Tire-os antes, ou não use." },
    { nome: "senhas-dos-sistemas.txt", ext: "txt", certa: 2, motivo: "Senha nunca vai para um modelo. Nem em pedaço." },
  ];
  const ROTULOS = ["Pode abrir", "Tirar dados pessoais antes", "Nunca"];
  const triagem = document.querySelector(".triagem");
  if (triagem) {
    triagem.innerHTML = TRIAGEM.map((t, i) => `
      <div class="tri-linha" data-i="${i}">
        <span class="arquivo" data-ext="${t.ext}">${t.nome}</span>
        <div class="tri-opcoes" role="group" aria-label="Decisão sobre ${t.nome}">${ROTULOS.map((r, k) => `<button type="button" data-k="${k}">${r}</button>`).join("")}</div>
      </div>`).join("");
    triagem.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b) return;
      const linha = b.closest(".tri-linha");
      const t = TRIAGEM[+linha.dataset.i];
      const k = +b.dataset.k;
      linha.querySelectorAll("button").forEach((x) => x.classList.remove("certa", "errada"));
      linha.querySelector(`button[data-k="${t.certa}"]`).classList.add("certa");
      if (k !== t.certa) b.classList.add("errada");
      linha.classList.add("feita");
      linha.querySelector(".arquivo").dataset.veredito = k === t.certa ? "✓" : "repense";
      document.querySelector(".tela-escura .tri-motivo").innerHTML = `<b>${esc(t.nome)}:</b> ${k === t.certa ? "isso." : "repense."} ${t.motivo}`;
    });
  }
})();
