// Motor da apresentação: modo leitura (rolagem) e modo aula (uma tela por vez).
// Endereço: #id-da-tela ou #id-da-tela.passo. ?aula abre no modo aula; ?turma=CODIGO
// identifica a turma (vai para o levantamento e para a capa).

(() => {
  const telas = [...document.querySelectorAll(".tela")];
  const params = new URLSearchParams(location.search);
  const turma = (params.get("turma") || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  window.CURSO = { turma, telas };

  let atual = 0;
  let passo = 0;

  const passosDe = (tela) => {
    const n = [...tela.querySelectorAll("[data-passo]")].map((el) => +el.dataset.passo || 0);
    return n.length ? Math.max(...n) : 0;
  };

  // ----- Trilha das 8 h (barra fina no topo) -----
  const trilha = document.querySelector(".trilha");
  const blocos = [];
  telas.forEach((t) => {
    const nome = t.dataset.bloco;
    if (!blocos.length || blocos[blocos.length - 1].nome !== nome) {
      blocos.push({ nome, min: +t.dataset.min || 0, telas: [] });
    }
    blocos[blocos.length - 1].telas.push(t);
  });
  if (trilha) {
    blocos.forEach((b, i) => {
      if (b.nome === "Intervalo") {
        const p = document.createElement("i"); p.className = "pausa"; trilha.append(p); return;
      }
      const el = document.createElement("div");
      el.className = "trecho";
      el.style.setProperty("--peso", Math.max(b.min, 5));
      el.innerHTML = `<span>${b.nome}</span>`;
      b.el = el;
      trilha.append(el);
    });
  }
  const atualizarTrilha = () => {
    const i = blocos.findIndex((b) => b.telas.includes(telas[atual]));
    blocos.forEach((b, k) => {
      if (!b.el) return;
      b.el.classList.toggle("feito", k < i);
      b.el.classList.toggle("agora", k === i);
    });
  };

  // ----- Passos -----
  const aplicarPassos = (tela, p) => {
    tela.querySelectorAll("[data-passo]").forEach((el) => {
      el.classList.toggle("oculto", +el.dataset.passo > p);
    });
    tela.dataset.passoAtual = p;
    tela.dispatchEvent(new CustomEvent("passo", { detail: { passo: p } }));
  };

  // ----- Modo aula -----
  const emAula = () => document.body.classList.contains("aula");

  const ir = (i, p = 0, origem = "nav") => {
    i = Math.max(0, Math.min(telas.length - 1, i));
    const anterior = telas[atual];
    if (anterior !== telas[i]) {
      anterior.classList.remove("atual");
      anterior.dispatchEvent(new CustomEvent("saiu"));
    }
    atual = i;
    passo = Math.max(0, Math.min(passosDe(telas[i]), p));
    const t = telas[i];
    t.classList.add("atual");
    aplicarPassos(t, passo);
    t.dispatchEvent(new CustomEvent("entrou", { detail: { origem } }));
    atualizarTrilha();
    const hash = `#${t.id}${passo ? "." + passo : ""}`;
    if (location.hash !== hash) history.replaceState(null, "", hash + "");
  };

  const avancar = () => {
    if (passo < passosDe(telas[atual])) { passo++; aplicarPassos(telas[atual], passo); history.replaceState(null, "", `#${telas[atual].id}.${passo}`); }
    else if (atual < telas.length - 1) ir(atual + 1, 0);
  };
  const voltar = () => {
    if (passo > 0) { passo--; aplicarPassos(telas[atual], passo); history.replaceState(null, "", `#${telas[atual].id}${passo ? "." + passo : ""}`); }
    else if (atual > 0) ir(atual - 1, passosDe(telas[atual - 1]));
  };

  const lerHash = () => {
    const [id, p] = location.hash.slice(1).split(".");
    const i = telas.findIndex((t) => t.id === id);
    return { i: i < 0 ? 0 : i, p: +p || 0 };
  };

  const entrarAula = () => {
    document.body.classList.add("aula");
    const { i, p } = location.hash ? lerHash() : { i: telaVisivel(), p: 0 };
    telas.forEach((t) => t.classList.remove("atual"));
    ir(i, p, "entrada");
    window.dispatchEvent(new Event("modo"));
  };
  const sairAula = () => {
    document.body.classList.remove("aula");
    telas.forEach((t) => { t.classList.remove("atual"); aplicarPassos(t, passosDe(t)); });
    telas[atual].scrollIntoView({ block: "start" });
    window.dispatchEvent(new Event("modo"));
  };
  const telaVisivel = () => {
    let melhor = 0;
    telas.forEach((t, i) => { if (t.getBoundingClientRect().top < innerHeight * 0.4) melhor = i; });
    return melhor;
  };

  // ----- Índice -----
  const indice = document.querySelector(".indice");
  const lista = indice.querySelector("ol");
  telas.forEach((t, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.innerHTML = `<span class="n">${i + 1}</span><span>${t.dataset.titulo || t.querySelector("h1,h2")?.textContent || t.id}</span>`;
    b.addEventListener("click", () => { fecharIndice(); emAula() ? ir(i) : telas[i].scrollIntoView({ behavior: "smooth" }); });
    li.append(b); lista.append(li);
  });
  let sel = 0;
  const marcar = () => [...lista.querySelectorAll("button")].forEach((b, k) => {
    b.classList.toggle("sel", k === sel); b.classList.toggle("atual", k === atual);
    if (k === sel) b.scrollIntoView({ block: "nearest" });
  });
  const abrirIndice = () => { sel = atual; indice.classList.add("aberto"); marcar(); };
  const fecharIndice = () => indice.classList.remove("aberto");
  indice.addEventListener("click", (e) => { if (e.target === indice) fecharIndice(); });

  // ----- Teclado -----
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (indice.classList.contains("aberto")) {
      const n = lista.children.length;
      if (e.key === "Escape") fecharIndice();
      else if (e.key === "ArrowDown") { sel = (sel + 1) % n; marcar(); }
      else if (e.key === "ArrowUp") { sel = (sel - 1 + n) % n; marcar(); }
      else if (e.key === "Enter") { fecharIndice(); ir(sel); }
      else return;
      e.preventDefault(); return;
    }
    if (!emAula()) return;
    // Uma tela pode capturar teclas próprias (ex.: 1–4 na sala em pontos).
    const ev = new CustomEvent("tecla", { detail: { key: e.key }, cancelable: true });
    if (!telas[atual].dispatchEvent(ev)) { e.preventDefault(); return; }
    switch (e.key) {
      case "ArrowRight": case "PageDown": case " ": case "Enter": avancar(); break;
      case "ArrowLeft": case "PageUp": case "Backspace": voltar(); break;
      case "Home": ir(0); break;
      case "End": ir(telas.length - 1); break;
      case "Escape": abrirIndice(); break;
      case "f": case "F":
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); break;
      case "l": case "L": sairAula(); break;
      default: return;
    }
    e.preventDefault();
  });

  // Cursor some depois de 2 s parado no modo aula.
  let tCursor;
  document.addEventListener("mousemove", () => {
    document.body.classList.remove("sem-cursor");
    clearTimeout(tCursor);
    if (emAula()) tCursor = setTimeout(() => document.body.classList.add("sem-cursor"), 2000);
  });

  document.querySelectorAll("[data-acao='aula']").forEach((b) => b.addEventListener("click", entrarAula));

  // No modo leitura, cada tela avisa quando entra na vista (para iniciar ou pausar o que for pesado).
  const vigia = new IntersectionObserver((itens) => {
    if (emAula()) return;
    itens.forEach((it) => it.target.dispatchEvent(new CustomEvent(it.isIntersecting ? "entrou" : "saiu", { detail: { origem: "rolagem" } })));
  }, { rootMargin: "10% 0px" });
  telas.forEach((t) => vigia.observe(t));

  // Início: espera os scripts das telas registrarem seus eventos.
  document.addEventListener("DOMContentLoaded", () => {
    telas.forEach((t) => aplicarPassos(t, passosDe(t)));
    if (params.has("aula")) entrarAula();
    else if (location.hash) { const { i } = lerHash(); atual = i; requestAnimationFrame(() => telas[i].scrollIntoView()); }
  });

  window.CURSO.ir = ir;
  window.CURSO.emAula = emAula;
})();
