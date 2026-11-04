// Fase 3, passo "a pasta": a janela do explorador com os arquivos de verdade
// do exemplo (miniaturas geradas de material/fase3 por _site/gerar_site.sh).
// Clicar num arquivo abre a lupa por cima da cena; Esc ou clique fecha.

window.PASTAS = {
  viagens: {
    caminho: "1-viagens",
    grupos: [
      { nome: "viagem-1", arquivos: ["IMG_20241014_161520.jpg", "IMG_20241015_105420.jpg", "IMG_20241016_141118.jpg", "IMG_20241017_124625.jpg",
        "Scan_20241018_105957.jpg", "bilhete.pdf", "comprovante_pix_20241010.pdf", "voucher-reserva-58213.pdf"] },
      { nome: "viagem-2", arquivos: ["IMG_20250624_152340.jpg", "IMG_20250630_145320.jpg", "IMG_20250712_214502.jpg", "IMG_20250713_014530.jpg",
        "cartao-de-embarque.pdf", "recibo-corrida-24062025.pdf"] },
    ],
    rodape: "14 itens em 2 pastas",
  },
  certificados: {
    caminho: "2-certificados", grande: true,
    grupos: [{ arquivos: [
      { arq: "inscricoes-oficina.xlsx", img: "inscricoes-oficina" },
      { arq: "modelo-certificado.docx", img: "previa-modelo" },
      { arq: "previa-modelo.png", img: "previa-modelo" },
    ] }],
    rodape: "3 itens",
  },
  mudanca: {
    caminho: "3-mudanca-de-data", paginas: true,
    grupos: [{ arquivos: ["aviso-porta.docx", "checklist-montagem.md", "comunicado-palestrantes.txt", "convite.docx", "email-aviso.txt", "lista-presenca.txt",
      "modelo-cracha.docx", "politica-certificados.docx", "programacao.docx", "regras-envio-trabalhos.docx", "roteiro-abertura.docx", "texto-site.md"] }],
    rodape: "12 itens",
  },
};

(() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ext = (a) => a.split(".").pop().toLowerCase();
  // Nomes longos quebram depois de _ e - (como no Explorador), não no meio do número.
  const quebra = (a) => esc(a).replace(/([_-])/g, "$1<wbr>");
  const miniatura = (a) => `assets/img/fase3/${a.replace(/\.[^.]+$/, "")}.jpg`;

  document.querySelectorAll(".f3-pasta[data-pasta]").forEach((el) => {
    const p = window.PASTAS[el.dataset.pasta];
    const cena = el.closest(".cena");
    let n = 0;
    el.innerHTML = `
      <div class="explorador${p.grande ? " grande" : ""}${p.paginas ? " paginas" : ""}">
        <header class="exp-barra"><i></i><i></i><i></i><span class="exp-caminho"><i class="icone-pasta"></i>${esc(p.caminho)}</span></header>
        <div class="exp-corpo">${p.grupos.map((g) => `
          <section class="exp-grupo">
            ${g.nome ? `<h4><i class="icone-pasta"></i>${esc(g.nome)}<small>${g.arquivos.length} arquivos</small></h4>` : ""}
            <div class="exp-grade">${g.arquivos.map((x) => {
              const a = typeof x === "string" ? { arq: x } : x;
              const src = a.img ? `assets/img/fase3/${a.img}.jpg` : miniatura(a.arq);
              return `<button type="button" class="exp-arq t-${ext(a.arq)}" style="--n:${n++}" data-src="${src}" data-nome="${esc(a.arq)}">
                <span class="exp-mini"><img src="${src}" alt="" loading="lazy"><i>${ext(a.arq)}</i></span>
                <span class="exp-nome">${quebra(a.arq)}</span></button>`;
            }).join("")}</div>
          </section>`).join("")}</div>
        <footer class="exp-rodape">${esc(p.rodape)}<span>clique num arquivo para ampliar</span></footer>
      </div>`;

    // A lupa mora na cena, por cima de tudo, e é um botão: o clique não vira "avançar".
    const lupa = document.createElement("button");
    lupa.type = "button"; lupa.className = "f3-lupa"; lupa.hidden = true;
    lupa.innerHTML = `<figure><img alt=""><figcaption></figcaption></figure>`;
    cena.append(lupa);
    const fechar = () => { lupa.hidden = true; };
    lupa.addEventListener("click", fechar);
    el.querySelectorAll(".exp-arq").forEach((b) => b.addEventListener("click", () => {
      lupa.querySelector("img").src = b.dataset.src;
      lupa.querySelector("figcaption").innerHTML = `<b>${esc(b.dataset.nome)}</b>Esc ou clique para fechar`;
      lupa.hidden = false;
    }));
    cena.addEventListener("tecla", (e) => {
      if (lupa.hidden) return;
      if (e.detail.key === "Escape") fechar();
      e.preventDefault(); // com a lupa aberta, as setas não trocam de passo
    });
    cena.addEventListener("passo", fechar);
    cena.addEventListener("saiu", fechar);
  });
})();
