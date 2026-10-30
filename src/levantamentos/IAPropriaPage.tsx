import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { siteAssetUrl } from "../locale";
import "./ia-propria.css";

// O texto e os números vêm prontos de levantamentos/ia-propria/artigo.json, gerado pelo script do levantamento.
// Aqui o portal só desenha o topo e liga os cartões de público (seletor de cenário e detalhe de cada linha).
type Linha = { nome: string; det: string; v?: string; a?: string; c?: string };
type Cenario = {
  compra: Linha[]; oper: Linha[]; compra_tot: string; oper_ano: string; oper_5: string; total: string; total_faixa: string;
  pp: string; maq: string; maq_sub: string; falha: string; nac: string;
};
type Artigo = { titulo: string; abertura: string; minutos: number; corpo: string; dados: Record<string, Record<string, Cenario>> };

const linha = (id: string, celulas: string, det: string) =>
  `<tr class="linha" tabindex="0" role="button" aria-expanded="false" aria-controls="${id}">${celulas}</tr>` +
  `<tr class="det" id="${id}" hidden><td colspan="3">${det}</td></tr>`;

function desenhar(card: HTMLElement, dados: Artigo["dados"]) {
  const k = card.dataset.k!, res = card.dataset.res || "0", c = dados[k][res];
  const compra = c.compra.map((r, i) => linha(`ip-${k}-c${i}`, `<td>${r.nome}</td><td class="n">${r.v}</td>`, r.det)).join("");
  const oper = c.oper.map((r, i) => linha(`ip-${k}-o${i}`, `<td>${r.nome}</td><td class="n">${r.a}</td><td class="n">${r.c}</td>`, r.det)).join("");
  card.querySelector(".pub-body")!.innerHTML = `
  <div class="kpis">
    <div class="kpi total"><div class="r">Total em 5 anos</div><div class="v">${c.total}</div><div class="s">compra + operação</div></div>
    <div class="kpi"><div class="r">Por pessoa, por mês</div><div class="v">${c.pp}</div><div class="s">de quem usa no dia</div></div>
    <div class="kpi"><div class="r">Máquina de IA</div><div class="v">${c.maq}</div><div class="s">${c.maq_sub}</div></div>
    <div class="kpi"><div class="r">Se um servidor parar</div><div class="v v-texto">${c.falha}</div></div>
  </div>
  <div class="blocos">
    <div class="bloco"><h4>Compra, uma vez</h4>
      <table><thead><tr><th>Item</th><th>Valor</th></tr></thead><tbody>${compra}
      <tr class="soma"><td>Total da compra</td><td class="n">${c.compra_tot}</td></tr></tbody></table></div>
    <div class="bloco"><h4>Operação</h4>
      <table><thead><tr><th>Item</th><th>Por ano</th><th>Em 5 anos</th></tr></thead><tbody>${oper}
      <tr class="soma"><td>Total</td><td class="n">${c.oper_ano}</td><td class="n">${c.oper_5}</td></tr></tbody></table></div>
  </div>
  <div class="total-linha"><span>Compra ${c.compra_tot} + operação em 5 anos ${c.oper_5}</span><b>${c.total}</b></div>
  <div class="rodape">
    <p>Valores de importação direta do servidor, arredondados; cada um é o meio de uma faixa (${c.total_faixa} no total). Com o servidor comprado no Brasil, por licitação, o total seria ${c.nac}.</p>
  </div>`;
  card.querySelectorAll<HTMLButtonElement>(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.res === res)));
}

function abrir(tr: HTMLElement) {
  const det = document.getElementById(tr.getAttribute("aria-controls")!)!, aberto = tr.getAttribute("aria-expanded") === "true";
  tr.setAttribute("aria-expanded", String(!aberto));
  det.hidden = aberto;
}

type Secao = { id: string; rotulo: string };

// Sumário lateral: os títulos da matéria viram atalhos. Rolagem por botão, e não por link,
// porque o portal usa o # do endereço para navegar entre páginas.
function rotular(raiz: HTMLElement): Secao[] {
  const alvos = [...raiz.querySelectorAll<HTMLElement>(".texto > h2, .opiniao > h2, .metodo summary")];
  return alvos.map((el, i) => {
    el.id = el.id || `ip-secao-${i}`;
    const rotulo = el.closest(".opiniao") ? "Ponderações do autor" : (el.textContent || "").trim();
    return { id: el.id, rotulo };
  });
}

export function IAPropriaPage() {
  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [atual, setAtual] = useState("");
  const corpo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(siteAssetUrl("levantamentos/ia-propria/artigo.json"), { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setArtigo)
      .catch(e => { if (e.name !== "AbortError") setFalhou(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const raiz = corpo.current;
    if (!artigo || !raiz) return;
    // O miolo entra aqui, e não por dangerouslySetInnerHTML: assim um novo render do portal (ao girar o celular,
    // por exemplo) não apaga os cartões já desenhados.
    raiz.innerHTML = artigo.corpo;
    const cartoes = [...raiz.querySelectorAll<HTMLElement>(".pub")];
    cartoes.forEach(card => desenhar(card, artigo.dados));
    const lista = rotular(raiz);
    setSecoes(lista);
    const visiveis = new Map<string, boolean>();
    const observador = new IntersectionObserver(entradas => {
      entradas.forEach(e => visiveis.set(e.target.id, e.isIntersecting));
      const primeira = lista.find(s => visiveis.get(s.id));
      if (primeira) setAtual(primeira.id);
    }, { rootMargin: "-96px 0px -55% 0px" });
    lista.forEach(s => observador.observe(document.getElementById(s.id)!));
    const clique = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement, card = alvo.closest<HTMLElement>(".pub");
      if (!card) return;
      const b = alvo.closest<HTMLButtonElement>(".seg button");
      if (b) { card.dataset.res = b.dataset.res; desenhar(card, artigo.dados); return; }
      const tr = alvo.closest<HTMLElement>(".linha");
      if (tr) abrir(tr);
    };
    const tecla = (e: KeyboardEvent) => {
      const tr = (e.target as HTMLElement).closest<HTMLElement>(".linha");
      if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(tr); }
    };
    raiz.addEventListener("click", clique);
    raiz.addEventListener("keydown", tecla);
    return () => { observador.disconnect(); raiz.removeEventListener("click", clique); raiz.removeEventListener("keydown", tecla); };
  }, [artigo]);

  const ir = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SUMMARY") (el.parentElement as HTMLDetailsElement).open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const resumo = artigo ? [["Docentes", "doc"], ["Docentes e técnicos", "doctae"], ["Comunidade toda", "todos"]]
    .map(([nome, k]) => ({ nome, total: artigo.dados[k]["0"].total })) : [];

  return <article id="levantamento" className="ip-page" aria-labelledby="ip-title" lang="pt-BR">
    <header className="ip-hero">
      <div className="ip-moldura">
        <p className="ip-eyebrow">Levantamento do Observatório · Outubro de 2026</p>
        <h1 id="ip-title">{artigo?.titulo || "Quanto custa ter uma IA própria rodando dentro da universidade?"}</h1>
        {artigo && <div className="ip-abertura" dangerouslySetInnerHTML={{ __html: artigo.abertura }} />}
        {artigo && <p className="ip-leitura"><Clock3 size={16} aria-hidden="true" />Leitura de {artigo.minutos} minutos</p>}
      </div>
    </header>
    <div className="ip-moldura ip-grade">
      <aside className="ip-trilho" aria-label="Nesta página">
        {secoes.length > 0 && <nav>
          <p className="ip-trilho-titulo">Nesta página</p>
          <ol>{secoes.map(s => <li key={s.id}><button type="button" aria-current={atual === s.id ? "true" : undefined} onClick={() => ir(s.id)}>{s.rotulo}</button></li>)}</ol>
        </nav>}
        {resumo.length > 0 && <div className="ip-resumo">
          <p className="ip-trilho-titulo">Total em 5 anos</p>
          <p className="ip-resumo-sub">IA própria, cenário básico</p>
          <dl>{resumo.map(r => <div key={r.nome}><dt>{r.nome}</dt><dd dangerouslySetInnerHTML={{ __html: r.total }} /></div>)}</dl>
        </div>}
      </aside>
      {falhou ? <p className="ip-aviso" role="alert">Não foi possível carregar o levantamento. Tente recarregar a página.</p>
        : !artigo ? <p className="ip-aviso" aria-live="polite">Carregando o levantamento…</p>
        : <div className="ip-artigo" ref={corpo} />}
    </div>
  </article>;
}
