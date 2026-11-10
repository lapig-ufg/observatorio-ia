// Telas "De graça no navegador" (Fase 2) e "De graça no computador" (Fase 3).
// Os cartões vêm da página "IAs gratuitas" do Observatório: o mesmo gratuitos.json,
// para a aula e a página nunca dizerem coisas diferentes. Sem internet, usa a cópia
// dados/gratuitos.json (atualizar junto quando o Observatório mudar).
(() => {
  const PAGINA = "https://lapig-ufg.github.io/observatorio-ia/#panorama/gratuitos";
  const FONTES = ["https://lapig-ufg.github.io/observatorio-ia/gratuitos/gratuitos.json", "dados/gratuitos.json"];
  const ICONES = {
    horas: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    semana: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    mes: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h8M8 16.5h5"/>',
    rede: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1"/>',
    aberto: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="17" r=".6"/>',
  };
  // Na aula, o cartão "Codex" do Observatório aparece com o nome do app que a Fase 3 usa.
  const NOME_NA_AULA = { codex: "ChatGPT para desktop" };
  const icone = (tipo) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[tipo] || ""}</svg>`;
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const data = (iso) => {
    const [a, m, d] = iso.split("-").map(Number);
    return `${d} ${["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."][m - 1]} ${a}`;
  };

  async function carregar() {
    for (const url of FONTES) {
      try {
        const r = await fetch(url, { cache: "no-cache" });
        if (r.ok) return { dados: await r.json(), reserva: url !== FONTES[0] };
      } catch { /* tenta a próxima */ }
    }
    return null;
  }

  function montar(tela, dados, reserva) {
    const secao = tela.dataset.secao;
    const tipos = Object.fromEntries(dados.limitTypes.map((l) => [l.id, l.label.pt]));
    const itens = dados.items.filter((i) => i.section === secao);
    const grande = secao === "instalada";
    tela.querySelector(".gratis-grade").innerHTML = itens.map((i, n) => `
      <li class="gratis-cartao lim-${esc(i.limitType)}" style="--n:${n}">
        <div class="gratis-nome"><b>${esc(NOME_NA_AULA[i.id] || i.name)}</b><small>${esc(i.company)}</small></div>
        <span class="gratis-selo">${icone(i.limitType)}${esc(tipos[i.limitType] || i.limitType)}</span>
        ${grande ? `<p class="gratis-modelo">${esc(i.model.pt)}</p><p class="gratis-cota">${esc(i.quota.pt)}</p>` : ""}
        <p class="gratis-porem"><span>O porém</span>${esc(i.catch.pt)}</p>
      </li>`).join("");
    const sec = dados.sections.find((s) => s.id === secao);
    const fora = tela.querySelector(".gratis-fora");
    if (fora && sec?.leftOut) fora.innerHTML = `<span>Ficaram de fora</span>${sec.leftOut.map((l) => `<b>${esc(l.name)}</b> ${esc(l.why.pt)}`).join(" · ")}`;
    tela.querySelector(".gratis-rodape").textContent =
      `Conferido nas páginas oficiais em ${data(dados.checked)} · Observatório UFG-IA › Panorama › IAs gratuitas${reserva ? " (cópia guardada; sem internet)" : ""}`;
  }

  function falhou(tela) {
    tela.querySelector(".gratis-grade").innerHTML = "";
    tela.querySelector(".gratis-rodape").textContent = "Sem internet agora. A lista completa está no Observatório: Panorama › IAs gratuitas.";
  }

  const telas = [...document.querySelectorAll(".gratis")];
  carregar().then((r) => telas.forEach((t) => (r ? montar(t, r.dados, r.reserva) : falhou(t))));

  const abrir = () => window.PALCO?.abrirAoVivo(PAGINA, "IAs gratuitas · Observatório");
  telas.forEach((t) => {
    t.querySelector(".abrir").addEventListener("click", abrir);
    t.closest(".cena").addEventListener("tecla", (e) => {
      if (e.detail.key === "Enter") { abrir(); e.preventDefault(); }
    });
  });
})();
