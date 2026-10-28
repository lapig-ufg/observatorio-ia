// Telas de exemplo: atalhos para outras telas, vitrines que só carregam ao clicar,
// o app de tarefas sob medida e o número do acervo do Observatório.

(() => {
  const { ir, emAula, telas } = window.CURSO;

  // ----- "Ver a tela": pula para outra tela da apresentação -----
  document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => {
    const i = telas.findIndex((t) => t.id === b.dataset.ir);
    if (i < 0) return;
    emAula() ? ir(i) : telas[i].scrollIntoView({ behavior: "smooth" });
  }));

  // ----- Vitrines: a página pesada só entra quando alguém clica, e sai quando a tela sai -----
  const telaPesquisa = document.getElementById("pesquisa");
  const vitrines = [...telaPesquisa.querySelectorAll(".vitrine")];
  vitrines.forEach((v) => {
    const capa = v.querySelector(".vitrine-abrir");
    capa.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = v.dataset.src;
      f.title = capa.querySelector("img").alt;
      f.allow = "fullscreen";
      capa.hidden = true;
      v.prepend(f);
      f.addEventListener("load", () => { try { f.focus(); } catch { /* outra origem */ } });
    });
  });
  telaPesquisa.addEventListener("saiu", () => vitrines.forEach((v) => {
    v.querySelector("iframe")?.remove();   // libera o WebGL do diorama
    v.querySelector(".vitrine-abrir").hidden = false;
  }));

  // ----- App de tarefas sob medida: entende datas, horas, #caixas e ! -----
  const telaApp = document.getElementById("sob-medida");
  const campo = telaApp.querySelector("input");
  const leitura = telaApp.querySelector(".app-leitura");
  const lista = telaApp.querySelector(".app-lista");
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const exemplos = [
    { texto: "Enviar planilha de amostras para a Ana", quando: "hoje", caixa: "campo" },
    { texto: "Revisar o relatório parcial", quando: "quinta", caixa: "projeto" },
    { texto: "Renovar o empréstimo da biblioteca", quando: "", caixa: "" },
  ];

  function ler(frase) {
    let resto = " " + frase + " ";
    const r = {};
    const hoje = new Date();
    const m = (re, f) => { const x = resto.match(re); if (x) { f(x); resto = resto.replace(x[0], " "); } };
    m(/\s!\s?/, () => { r.urgente = true; });
    m(/#([\p{L}\d-]+)/u, (x) => { r.caixa = x[1].toLowerCase(); });
    m(/\b(\d{1,2})[:h](\d{2})?\b/i, (x) => { r.hora = `${x[1].padStart(2, "0")}h${x[2] && x[2] !== "00" ? x[2] : ""}`; });
    m(/\b(hoje|amanhã|amanha)\b/i, (x) => {
      const d = new Date(hoje); if (!/hoje/i.test(x[1])) d.setDate(d.getDate() + 1); r.data = d;
    });
    m(/\b(?:na |no |nesta |neste |próxima |proxima )?(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?\b/i, (x) => {
      const alvo = DIAS.indexOf(x[1].toLowerCase().replace("terca", "terça").replace("sabado", "sábado"));
      const d = new Date(hoje); const dif = (alvo - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + dif); r.data = d;
    });
    m(/\b(\d{1,2})\/(\d{1,2})\b/, (x) => {
      const d = new Date(hoje.getFullYear(), +x[2] - 1, +x[1]); if (d < hoje) d.setFullYear(d.getFullYear() + 1); r.data = d;
    });
    r.texto = resto.replace(/\s+/g, " ").replace(/\s(às|as)\s*$/i, "").trim();
    r.texto = r.texto.charAt(0).toUpperCase() + r.texto.slice(1);
    return r;
  }
  const quando = (r) => {
    if (!r.data && !r.hora) return "";
    const d = r.data ? r.data.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "numeric" }) : "";
    return [d, r.hora].filter(Boolean).join(", ");
  };

  function mostrarLeitura(r) {
    const partes = [];
    if (r.texto) partes.push(`<span><b>tarefa</b>${esc(r.texto)}</span>`);
    if (r.data) partes.push(`<span><b>data</b>${r.data.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>`);
    if (r.hora) partes.push(`<span><b>hora</b>${r.hora}</span>`);
    if (r.caixa) partes.push(`<span><b>caixa</b>${esc(r.caixa)}</span>`);
    if (r.urgente) partes.push(`<span class="urgente">urgente</span>`);
    leitura.innerHTML = partes.join("");
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function item(r, nova) {
    const li = document.createElement("li");
    if (nova) li.className = "nova";
    li.innerHTML = `<span>${r.urgente ? '<span class="urg">! </span>' : ""}${esc(r.texto)}${r.caixa ? ` <span class="caixa">#${esc(r.caixa)}</span>` : ""}</span><span class="quando">${esc(r.quandoTexto ?? quando(r))}</span>`;
    return li;
  }
  exemplos.forEach((e) => lista.append(item({ texto: e.texto, caixa: e.caixa, quandoTexto: e.quando }, false)));

  campo.addEventListener("input", () => mostrarLeitura(ler(campo.value)));
  campo.addEventListener("keydown", (e) => {
    e.stopPropagation(); // as setas e o Enter não mudam de tela enquanto se digita
    if (e.key !== "Enter" || !campo.value.trim()) return;
    const r = ler(campo.value);
    lista.querySelector(".nova")?.classList.remove("nova");
    lista.prepend(item(r, true));
    campo.value = ""; leitura.innerHTML = "";
  });

  // Ao entrar, a tela digita um exemplo sozinha (uma vez), para mostrar o que acontece.
  let digitou = false;
  telaApp.addEventListener("entrou", () => {
    if (digitou) return;
    digitou = true;
    const frase = "Reunião com a coordenação sexta 14h #projeto !";
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { campo.value = frase; mostrarLeitura(ler(frase)); return; }
    let k = 0;
    const passo = () => {
      campo.value = frase.slice(0, ++k);
      mostrarLeitura(ler(campo.value));
      if (k < frase.length) setTimeout(passo, 55);
    };
    setTimeout(passo, 600);
  });
})();
