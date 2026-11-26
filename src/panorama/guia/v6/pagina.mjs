import * as motor from "../motor/motor.mjs";
import perfis from "../motor/perfis.json";
import { categoriaArena, consultarLiderArena } from "../motor/arena.mjs";

const OBS_MAX_TURNS = 8;
const OBS_MAX_CHARS = 500;
const TOP_RANKING = 10;
const RANKING_NEIGHBORS = 2;
const DEFAULT_RANKING_MARGIN = 10;
const OBS_SUGGESTION_INTERVAL = 3600;
const OBS_SUGGESTIONS = [
  { key: "arena", pergunta: "Qual é o primeiro lugar em escrita criativa no LMArena?" },
  {
    key: "comparar",
    pergunta: "É melhor usar o Sonnet 5.5 no alto ou o Opus 5.5 no médio?",
    ferramenta: "comparar",
    params: { itens: ["Sonnet 5.5 no alto", "Opus 5.5 no médio"] }
  },
  {
    key: "juridico",
    pergunta: "Qual a melhor IA para questões jurídicas?",
    ferramenta: "perfil_tarefa",
    params: { perfil: "juridico" }
  },
  {
    key: "esforco",
    pergunta: "Vale subir o Sonnet 5.5 de médio para alto?",
    ferramenta: "degrau",
    params: { modelo: "claude-sonnet-5-5", de: "medium", para: "high" }
  }
];
const findObsSuggestion = (pergunta) => OBS_SUGGESTIONS.find((s) => s.pergunta === pergunta);

const MAIN_EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const DEFAULT_COMPARE = [
  { modelo: "gpt-6-1-sol", esforco: "high" },
  { modelo: "gemini-4-hydrogen", esforco: "high" }
];

const OBS_QUESTIONS = [
  { key: "esforco", label: "Vale mudar o esforço de um modelo?" },
  { key: "comparar", label: "Qual é melhor entre dois modelos?" },
  { key: "barato", label: "Qual o mais barato que é bom em…?" },
  { key: "time", label: "Como dividir as tarefas do meu time?" }
];

const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isUnknownEffort = (e) => !motor.ORDEM_ESFORCO.includes(e);
const renderEffortPill = (e) => `<span class="effort-pill${isUnknownEffort(e) ? " is-outline" : ""}">${escHtml(motor.fmt.esforco(e))}</span>`;

function guideModelKey(name) {
  return String(name == null ? "" : name).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function deviceId() {
  try {
    let id = localStorage.getItem("gm-coruja-aparelho");
    if (!id) {
      id = (crypto.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, "");
      localStorage.setItem("gm-coruja-aparelho", id);
    }
    return id;
  } catch {
    return "sem-armazenamento";
  }
}

function fmtBrDate(iso) {
  if (!iso) return "";
  const d = String(iso).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

function fmtDate(iso) {
  if (!iso) return "";
  const p = String(iso).slice(0, 10).split("-");
  return p.length === 3 ? `${parseInt(p[2], 10)} ${MONTHS_PT[parseInt(p[1], 10) - 1] || p[1]} ${p[0]}` : iso;
}

function companyInitials(name) {
  const w = String(name).trim().split(/[\s-]+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[1][0] : String(name).slice(0, 2)).toUpperCase();
}

const clockSvg12 = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/></svg>`;
const arrowLeftSvg12 = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>`;
const arrowRightSvg12 = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const bulbIconSvg = `<svg class="insight-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 12.5h4M6.5 14.5h3M8 1.5a4.2 4.2 0 0 0-2.6 7.5c.5.4.8 1 .9 1.6h3.4c.1-.6.4-1.2.9-1.6A4.2 4.2 0 0 0 8 1.5Z"/></svg>`;

export function montar(raiz, { endereco = "", carregarDados, aoEvento, corujaUrl = "" } = {}) {
  let destroyed = false;
  const cleanups = [];
  const timers = new Set();
  const rafs = new Set();

  const $ = (id) => raiz.querySelector(`#${id}`);
  const $$ = (sel) => raiz.querySelectorAll(sel);
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const later = (fn, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const cancelLater = (id) => {
    if (id != null) {
      window.clearTimeout(id);
      timers.delete(id);
    }
  };
  const nextFrame = (fn) => {
    const id = window.requestAnimationFrame((t) => {
      rafs.delete(id);
      if (!destroyed) fn(t);
    });
    rafs.add(id);
    return id;
  };
  const emit = (nome, valor = "") => {
    try { aoEvento?.(nome, String(valor ?? "")); } catch (_) {}
  };

  const hasEndpoint = Boolean(endereco);

  raiz.innerHTML = `
    <div class="obs6-container">
      <p class="obs6-context" id="hero-context"></p>
      <div id="app-root">
        <div class="status-box">Carregando dados dos modelos…</div>
      </div>
    </div>
    <div class="drawer-backdrop" id="drawer-backdrop" aria-hidden="true"></div>
    <aside class="drawer" id="model-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-model-name" aria-hidden="true" tabindex="-1">
      <div class="drawer-sheet-handle" aria-hidden="true"></div>
      <div class="drawer-top">
        <div class="drawer-header-id">
          <div id="drawer-logo"></div>
          <div style="min-width:0">
            <h2 class="drawer-model-name" id="drawer-model-name"></h2>
            <p class="drawer-model-meta" id="drawer-model-meta"></p>
          </div>
        </div>
        <button type="button" class="drawer-close" id="drawer-close" aria-label="Fechar painel">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>
        </button>
      </div>
      <div class="drawer-scroll" id="drawer-scroll"></div>
    </aside>
    <div id="metric-tooltip" class="metric-tooltip" role="tooltip" hidden></div>
  `;

  const state = {
    base: null,
    empresas: {},
    mediansByArea: {},
    area: "intelligence",
    tol: DEFAULT_RANKING_MARGIN,
    sortField: "nota",
    limitarNota: true,
    rankingSelected: null,
    expandedRanking: false,
    compareSource: "aa",
    compareItems: DEFAULT_COMPARE.map((x) => ({ ...x })),
    drawerOpen: false,
    drawerModelId: null,
    drawerEffort: null,
    areasOpen: false,
    obsQuestion: null,
    obsBlocks: [],
    obsForm: {},
    obsMemoria: null,
    obsMessages: [],
    obsFreeTurns: 0,
    obsLoading: false,
    obsMsgSeq: 0,
    lastTriggerEl: null,
    ladderPrevCoords: null,
    ladderGhostTimer: null,
    pointTimer: null
  };

  let rankingObserver = null;
  let compareResizeObserver = null;
  let lastCompareComp = null;
  let metricTipPinnedEl = null;
  let obsRequest = 0;

  function renderSourceLineHtml(sourceId = "aa", area = state.area, perfil = null) {
    const f = state.base?.fontesInfo?.[sourceId];
    if (!f) return "";
    const dataTxt = fmtBrDate(f.coletadoEm);
    const idxName = sourceId !== "aa" ? "" : perfil
      ? `média ponderada de ${Object.keys(perfil.pesos).map((k) => motor.INDICES_AA[k]).join(", ")} (perfil "${perfil.nome}")`
      : (motor.INDICES_AA[area] || motor.INDICES_AA.intelligence);
    const parts = [f.nome, idxName, dataTxt ? `dados de ${dataTxt}` : ""].filter(Boolean).join(" · ");
    const link = f.url ? ` <a href="${escHtml(f.url)}" target="_blank" rel="noopener" aria-label="Abrir ${escHtml(f.nome)} em nova aba">↗</a>` : "";
    return `<p class="source-line">Fonte: ${escHtml(parts)}${link}</p>`;
  }

  const metricTip = (key, label) => `<span class="metric-tip" tabindex="0" data-tip-key="${escHtml(key)}" aria-describedby="metric-tooltip">${escHtml(label)}</span>`;

  function setupMetricTooltip() {
    const tipEl = $("metric-tooltip");
    if (!tipEl) return;
    const getText = (key) => {
      const m = state.base?.fontesInfo?.aa?.medidas;
      if (!m) return "";
      if (key === "nota") return typeof m.nota === "function" ? m.nota(state.area) : m.nota;
      return m[key] || "";
    };
    const showTip = (target) => {
      const text = getText(target.dataset.tipKey);
      if (!text) return;
      tipEl.textContent = text;
      tipEl.hidden = false;
      const rect = target.getBoundingClientRect();
      const tipRect = tipEl.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, rect.left + rect.width / 2 - tipRect.width / 2));
      const top = rect.top - tipRect.height - 8 >= 8 ? rect.top - tipRect.height - 8 : rect.bottom + 8;
      tipEl.style.left = `${left}px`;
      tipEl.style.top = `${top}px`;
    };
    const hideTip = () => {
      tipEl.hidden = true;
      metricTipPinnedEl = null;
    };
    listen(raiz, "mouseover", (e) => {
      const t = e.target.closest(".metric-tip");
      if (t && !metricTipPinnedEl) showTip(t);
    });
    listen(raiz, "mouseout", (e) => {
      const t = e.target.closest(".metric-tip");
      if (t && !metricTipPinnedEl && (!e.relatedTarget || !t.contains(e.relatedTarget))) hideTip();
    });
    listen(raiz, "focusin", (e) => {
      const t = e.target.closest(".metric-tip");
      if (t) showTip(t);
    });
    listen(raiz, "focusout", (e) => {
      if (e.target.closest(".metric-tip") && !metricTipPinnedEl) hideTip();
    });
    listen(document, "click", (e) => {
      const t = e.target.closest?.(".metric-tip");
      if (t && raiz.contains(t)) {
        e.preventDefault();
        e.stopPropagation();
        if (metricTipPinnedEl === t && !tipEl.hidden) {
          hideTip();
        } else {
          metricTipPinnedEl = t;
          showTip(t);
        }
        return;
      }
      if (!tipEl.hidden) hideTip();
    });
    listen(document, "keydown", (e) => {
      if (e.key === "Escape" && !tipEl.hidden) hideTip();
    });
  }

  function renderLogo(empresa, large = false, sizePx = null) {
    const info = state.empresas?.[empresa] || { cor: "#61706a", logo_svg_path: null };
    const cls = large ? "logo-badge lg" : "logo-badge";
    const style = sizePx ? ` style="width:${sizePx}px;height:${sizePx}px"` : "";
    const color = info.cor || "#61706a";
    if (info.logo_svg_path) {
      return `<svg class="${cls}"${style} viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="11" fill="${escHtml(color)}"/><g transform="translate(4.95,4.95) scale(0.504)" fill="#ffffff">${info.logo_svg_path}</g></svg>`;
    }
    return `<svg class="${cls}"${style} viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="11" fill="${escHtml(color)}"/><text x="11" y="11" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="Inter, sans-serif" font-size="8.6" font-weight="800">${escHtml(companyInitials(empresa))}</text></svg>`;
  }

  const companyColor = (emp) => state.empresas?.[emp]?.cor || "#1d6650";

  function parseHash() {
    const raw = window.location.hash;
    const match = raw.match(/^#panorama\/guia\?(.+)$/);
    if (!match) return {};
    const p = new URLSearchParams(match[1]);
    return {
      area: p.get("area"),
      tol: p.get("tol"),
      modelo: p.get("modelo"),
      esforco: p.get("esforco"),
      comparar: p.get("comparar"),
      perguntar: p.has("perguntar") ? (p.get("perguntar") || true) : null
    };
  }

  function isDefaultCompare(items) {
    return items.length === 2
      && items[0].modelo === DEFAULT_COMPARE[0].modelo && items[0].esforco === DEFAULT_COMPARE[0].esforco
      && items[1].modelo === DEFAULT_COMPARE[1].modelo && items[1].esforco === DEFAULT_COMPARE[1].esforco;
  }

  function syncUrl() {
    if (destroyed) return;
    const currentHash = window.location.hash;
    if (currentHash && !currentHash.startsWith("#panorama/guia")) return;
    const p = new URLSearchParams();
    if (state.area !== "intelligence") p.set("area", state.area);
    if (!state.limitarNota) p.set("tol", "off");
    else if (state.tol !== DEFAULT_RANKING_MARGIN) p.set("tol", String(state.tol));
    if (state.drawerOpen && state.drawerModelId) {
      p.set("modelo", state.drawerModelId);
      if (state.drawerEffort) p.set("esforco", state.drawerEffort);
    }
    if (!isDefaultCompare(state.compareItems)) {
      p.set("comparar", state.compareItems.map((c) => `${c.modelo}:${c.esforco}`).join(","));
    }
    if (state.obsQuestion) p.set("perguntar", state.obsQuestion);
    const qs = p.toString();
    const nextHash = qs ? `#panorama/guia?${qs}` : "#panorama/guia";
    if (window.location.hash !== nextHash) {
      try { window.history.replaceState(null, "", nextHash); } catch (_) {}
    }
  }

  function resolveModelId(rawModelo) {
    if (!rawModelo || !state.base) return null;
    if (state.base.porId.has(rawModelo)) return rawModelo;
    const key = guideModelKey(rawModelo);
    if (!key) return null;
    const found = state.base.familias.find((f) => guideModelKey(f.nome) === key);
    return found ? found.id : null;
  }

  function computeMedians() {
    for (const k of motor.AREA_KEYS) {
      const vals = [];
      for (const f of state.base.familias) {
        let best = null;
        for (const v of f.variantes) {
          const val = v.notas[k];
          if (val != null && (best == null || val > best)) best = val;
        }
        if (best != null) vals.push(best);
      }
      vals.sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      state.mediansByArea[k] = vals.length === 0 ? null : (vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2);
    }
  }

  /* ─── Ranking ─── */

  const rankingMetrics = {
    nota: { label: "Inteligência", rule: "Maior nota de cada modelo na área selecionada." },
    custo: { label: "Preço", rule: "Menor custo por tarefa via API, entre os níveis avaliados." },
    tempo: { label: "Velocidade", rule: "Menor tempo de resposta entre os níveis avaliados." }
  };
  let rankingRows = [];
  let rankingSearchMatches = [];
  let rankingSearchIndex = -1;

  function bestAreaScore() {
    const scores = state.base.familias.flatMap((f) => f.variantes.map((v) => v.notas[state.area])).filter((v) => v != null);
    return scores.length ? Math.max(...scores) : null;
  }

  function renderRankRow(r, bestScore, isLastVisible) {
    const scorePct = bestScore > 0 ? Math.max(0, Math.min(1, r.nota / bestScore)) : 0;
    const loss = Math.max(0, Math.round(bestScore * 10) / 10 - r.nota);
    const gap = state.sortField === "nota" ? "" : `<span class="rank-score-gap">${loss > 0
      ? `<span class="sr-only">Abaixo da melhor nota </span>−${motor.fmt.nota(loss)} pts` : "melhor nota"}</span>`;
    const posHtml = `${r.empate_com_anterior ? '<span class="rank-pos-approx" title="Menos de 1 ponto abaixo do anterior">≈</span>' : ""}${r.posicao}`;
    return `
      <button type="button" class="rank-row${isLastVisible ? " is-last-visible" : ""}${state.rankingSelected === r.modelo ? " is-located" : ""}" data-rank="${r.posicao}" data-model-id="${escHtml(r.modelo)}" data-effort="${escHtml(r.esforco)}">
        <span class="rank-pos num"><span class="sr-only">Posição </span>${posHtml}</span>
        <span class="rank-model">
          ${renderLogo(r.empresa)}
          <span class="rank-model-text">
            <span class="rank-model-title-row">
              <span class="rank-model-name">${escHtml(r.nome)}</span>
              ${renderEffortPill(r.esforco)}
            </span>
            <span class="rank-model-company">${escHtml(r.empresa)}</span>
          </span>
        </span>
        <span class="rank-score-cell">
          ${r.nota != null
            ? `<span class="score-track" aria-hidden="true"><span class="score-fill" style="--scale:${scorePct.toFixed(4)}"></span></span><span class="rank-score-val num"><span class="sr-only">Nota </span>${motor.fmt.nota(r.nota)}${gap}</span>`
            : `<span class="missing-val">sem dado</span>`}
        </span>
        <span class="rank-num-cell cost-cell num"><span class="sr-only">Custo por tarefa </span>${r.custo != null ? motor.fmt.custo(r.custo) : '<span class="missing-val">sem dado</span>'}</span>
        <span class="rank-num-cell time-cell num"><span class="sr-only">Tempo de resposta </span>${r.tempo != null ? motor.fmt.tempo(r.tempo) : '<span class="missing-val">sem dado</span>'}</span>
        <span class="rank-arrow" aria-hidden="true">›</span>
      </button>
    `;
  }

  function observeRankingBars() {
    if (rankingObserver) rankingObserver.disconnect();
    const tracks = [...$$("#ranking-card .score-track")];
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      tracks.forEach((tr) => tr.querySelector(".score-fill")?.classList.add("is-visible"));
      return;
    }
    let batch = 0;
    rankingObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const fill = entry.target.querySelector(".score-fill");
        if (fill) {
          fill.style.transitionDelay = `${Math.min(batch * 20, 320)}ms`;
          batch += 1;
          fill.classList.add("is-visible");
        }
        rankingObserver.unobserve(entry.target);
      }
    }, { threshold: 0 });

    tracks.forEach((tr) => rankingObserver.observe(tr));
  }

  function renderRanking({ animate = false } = {}) {
    const card = $("ranking-card");
    if (!card) return;
    const field = state.sortField;
    const bestScore = bestAreaScore();
    const floor = state.limitarNota && field !== "nota" && bestScore !== null
      ? Math.max(0, bestScore - state.tol)
      : null;
    const result = motor.ranking(state.base, {
      area: state.area, ordenar: state.sortField,
      filtros: floor === null ? {} : { nota_min: floor - 1e-9 }
    }, { completo: true });
    rankingRows = result.linhas || [];
    const count = rankingRows.length;
    const selected = rankingRows.find((r) => r.modelo === state.rankingSelected);
    const top = state.expandedRanking ? rankingRows : rankingRows.slice(0, TOP_RANKING);
    const start = Math.max(TOP_RANKING, (selected?.posicao ?? 0) - RANKING_NEIGHBORS - 1);
    const end = (selected?.posicao ?? 0) + RANKING_NEIGHBORS;
    const context = state.expandedRanking ? [] : rankingRows.slice(start, end);
    const skipped = start === TOP_RANKING + 1 ? `Posição ${start} oculta`
      : `Posições ${TOP_RANKING + 1}–${start} ocultas`;
    const gap = start > TOP_RANKING && context.length ? `<p class="ranking-gap">${skipped}</p>` : "";
    const shown = [...top, ...context];
    const rowsHtml = (rows) => rows.map((r) => renderRankRow(r, bestScore, r === shown.at(-1))).join("");
    const html = rowsHtml(top) + gap + rowsHtml(context);
    syncTabButtons($("ranking-tabs"), field);
    $("ranking-results").setAttribute("aria-labelledby", "ranking-tab-" + field);
    $("ranking-rule").textContent = floor === null ? rankingMetrics[field].rule
      : (field === "custo" ? "Menor custo por tarefa via API dentro da margem de nota." : "Menor tempo de resposta dentro da margem de nota.");
    $("ranking-tie-note").hidden = field !== "nota";
    $("ranking-filter").hidden = field === "nota";
    $("ranking-margin").hidden = !state.limitarNota;
    $("limit-ranking").checked = state.limitarNota;
    $("tol-slider").value = state.tol;
    $("tol-readout").textContent = floor === null ? "" : `${state.tol} ${state.tol === 1 ? "ponto" : "pontos"} · nota mínima ${motor.fmt.nota(floor)}`;
    $("area-ressalva").hidden = state.area !== "legal";
    $("ranking-status").textContent = selected
      ? `${selected.nome} · ${selected.posicao}º de ${count}`
      : !count ? "Sem modelos neste recorte"
        : shown.length < count ? `${shown.length} de ${count} modelos`
        : `${count} ${count === 1 ? "modelo" : "modelos"}${floor !== null ? " na margem" : ""}`;
    $("ranking-source").innerHTML = renderSourceLineHtml("aa", state.area);
    card.dataset.metric = field;
    card.innerHTML = `
      <div class="ranking-head" aria-hidden="true">
        <span>#</span><span>Modelo</span><span data-metric="nota">Nota</span><span data-metric="custo">Custo / tarefa</span><span data-metric="tempo">Tempo</span><span></span>
      </div>
      <div id="ranking-list">${html || '<p class="status-box">Nenhum modelo com dados para esta seleção.</p>'}</div>
      ${count > TOP_RANKING ? `<div class="ranking-footer">
        ${context.length || state.expandedRanking ? '<button type="button" class="btn-pill" id="reset-ranking-btn">Voltar ao Top 10</button>' : ""}
        ${!state.expandedRanking && shown.length < count ? `<button type="button" class="btn-pill" id="toggle-ranking-btn">Ver todos os ${count} modelos</button>` : ""}
      </div>` : ""}
    `;
    if (animate && !prefersReducedMotion()) {
      $("ranking-list").animate?.([{ opacity: 0.55, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "ease-out" });
    }
    closeRankingSearch();
    observeRankingBars();
  }

  function closeRankingSearch() {
    rankingSearchMatches = [];
    rankingSearchIndex = -1;
    $("ranking-matches").hidden = true;
    $("ranking-query").setAttribute("aria-expanded", "false");
    $("ranking-query").removeAttribute("aria-activedescendant");
    $("ranking-search-status").textContent = "";
  }

  function updateRankingSearch() {
    const query = guideModelKey($("ranking-query").value);
    if (!query) { closeRankingSearch(); return; }
    rankingSearchMatches = rankingRows
      .map((r) => {
        const name = guideModelKey(r.nome);
        const match = name === query ? 0 : name.startsWith(query) ? 1
          : name.includes(query) ? 2 : guideModelKey(r.empresa).includes(query) ? 3 : null;
        return { r, match };
      })
      .filter(({ match }) => match !== null).sort((a, b) => a.match - b.match)
      .slice(0, 8).map(({ r }) => r);
    rankingSearchIndex = -1;
    const matches = $("ranking-matches");
    const noMatch = state.sortField !== "nota" && state.limitarNota
      ? "Nenhum modelo encontrado nessa margem de nota" : "Nenhum modelo encontrado neste ranking";
    matches.innerHTML = rankingSearchMatches.map((r, i) => `
      <div class="rank-match" id="rank-match-${i}" role="option" aria-selected="false" data-match="${i}">
        ${renderLogo(r.empresa, false, 20)}
        <span>${escHtml(r.nome)}<small>${escHtml(r.empresa)}</small></span>
        <strong>${r.posicao}º</strong>
      </div>
    `).join("") || `<div class="rank-match-empty" role="option" aria-disabled="true">${noMatch}</div>`;
    matches.hidden = false;
    $("ranking-query").setAttribute("aria-expanded", "true");
    $("ranking-query").removeAttribute("aria-activedescendant");
    $("ranking-search-status").textContent = rankingSearchMatches.length
      ? `${rankingSearchMatches.length} sugestões` : noMatch;
  }

  function locateRankingModel(modelo, { takeFocus = false } = {}) {
    const result = rankingRows.find((r) => r.modelo === modelo);
    if (!result) return;
    state.rankingSelected = modelo;
    $("ranking-query").value = "";
    renderRanking();
    const row = raiz.querySelector(`#ranking-card [data-rank="${result.posicao}"]`);
    if (takeFocus) row.focus({ preventScroll: true });
    [row.previousElementSibling, row, row.nextElementSibling].forEach((neighbor) => {
      neighbor?.querySelector(".score-fill")?.classList.add("is-visible");
    });
    row.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    if (!prefersReducedMotion()) {
      row.animate?.([{ boxShadow: "inset 0 0 0 2px var(--green-700)" }, { boxShadow: "inset 0 0 0 2px transparent" }], {
        duration: 850, delay: 260, easing: "ease-out"
      });
    }
    emit("ranking_locate", modelo);
  }

  function syncTabButtons(group, active) {
    group.querySelectorAll('[role="tab"]').forEach((tab) => {
      const selected = tab.dataset.tab === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  }

  function bindTabs(group, onSelect) {
    group.addEventListener("click", (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab) onSelect(tab.dataset.tab);
    });
    group.addEventListener("keydown", (e) => {
      const tabs = [...group.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(e.target);
      if (index < 0 || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1
        : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      onSelect(tabs[next].dataset.tab);
    });
  }

  function bindRankingEvents() {
    const query = $("ranking-query");
    const matches = $("ranking-matches");
    bindTabs($("ranking-tabs"), (field) => {
      if (field === state.sortField) return;
      state.sortField = field;
      state.expandedRanking = false;
      state.rankingSelected = null;
      query.value = "";
      renderRanking({ animate: true });
      emit("ranking_metric", field);
    });
    query.addEventListener("input", updateRankingSearch);
    query.addEventListener("focus", updateRankingSearch);
    query.addEventListener("blur", closeRankingSearch);
    query.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "Escape") { closeRankingSearch(); return; }
      if (e.key === "Enter" && rankingSearchMatches.length) {
        e.preventDefault();
        locateRankingModel(rankingSearchMatches[Math.max(0, rankingSearchIndex)].modelo, { takeFocus: true });
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (matches.hidden) updateRankingSearch();
      if (!rankingSearchMatches.length) return;
      e.preventDefault();
      const size = rankingSearchMatches.length;
      rankingSearchIndex = rankingSearchIndex < 0 ? (e.key === "ArrowDown" ? 0 : size - 1)
        : (rankingSearchIndex + (e.key === "ArrowDown" ? 1 : -1) + size) % size;
      matches.querySelectorAll("[data-match]").forEach((el, i) => el.setAttribute("aria-selected", String(i === rankingSearchIndex)));
      const selected = $("rank-match-" + rankingSearchIndex);
      query.setAttribute("aria-activedescendant", selected.id);
      selected.scrollIntoView({ block: "nearest" });
    });
    matches.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-match]")) e.preventDefault(); });
    matches.addEventListener("click", (e) => {
      const match = e.target.closest("[data-match]");
      if (match) locateRankingModel(rankingSearchMatches[Number(match.dataset.match)].modelo, { takeFocus: true });
    });
    $("limit-ranking").addEventListener("change", (e) => {
      state.limitarNota = e.target.checked;
      state.expandedRanking = false;
      renderRanking({ animate: true });
      syncUrl();
    });
    $("tol-slider").addEventListener("input", (e) => {
      state.tol = Number(e.target.value);
      renderRanking();
      syncUrl();
    });
    $("tol-slider").addEventListener("change", () => emit("tol", state.tol));
    $("ranking-card").addEventListener("click", (e) => {
      if (e.target.closest("#reset-ranking-btn")) {
        state.expandedRanking = false;
        state.rankingSelected = null;
        query.value = "";
        renderRanking();
        query.focus({ preventScroll: true });
        $("ranking-section").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        return;
      }
      if (e.target.closest("#toggle-ranking-btn")) {
        state.expandedRanking = true;
        renderRanking();
        const target = raiz.querySelector(`#ranking-list [data-rank="${TOP_RANKING + 1}"]`);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        return;
      }
      const row = e.target.closest(".rank-row");
      if (row) openDrawer(row.dataset.modelId, row.dataset.effort, row);
    });
  }

  /* ─── Comparar modelos ─── */

  function renderCompareTableHtml(comp, { compact = false, highlightArea = null } = {}) {
    if (!comp?.ok) return "";
    const cols = comp.colunas;
    const cls = compact ? "obs-mini-table" : "compare-table";
    const headCols = cols.map((c) => `
      <th>
        <span class="compare-th-id">
          ${compact ? "" : renderLogo(c.empresa)}
          <span>${escHtml(c.nome)}${c.esforco === "single" ? "" : ` <span class="effort-pill">${escHtml(motor.fmt.esforco(c.esforco))}</span>`}</span>
        </span>
      </th>
    `).join("");

    const areaRows = comp.linhas.map((l) => {
      const isAct = highlightArea && l.area === highlightArea;
      const cells = l.notas.map((val, idx) => {
        if (val === null) return `<td><span class="missing-italic">sem dado</span></td>`;
        const colName = cols[idx].esforco === "single" ? cols[idx].nome : `${cols[idx].nome} ${motor.fmt.esforco(cols[idx].esforco)}`;
        const isLeader = l.lider && l.lider === colName;
        const isTied = l.empate && l.empate.includes(colName);
        return `<td class="num">${isTied ? `<span class="compare-tie-mark">≈</span>` : ""}<span class="${isLeader ? "compare-leader" : ""}">${motor.fmt.nota(val)}</span></td>`;
      }).join("");
      return `<tr class="${isAct ? "is-active-area" : ""}"><td>${escHtml(l.nome_area)}</td>${cells}</tr>`;
    }).join("");

    const costCells = cols.map((c) => `<td class="num">${c.custo != null ? motor.fmt.custo(c.custo) : '<span class="missing-italic">sem dado</span>'}</td>`).join("");
    const timeCells = cols.map((c) => `<td class="num">${c.tempo != null ? motor.fmt.tempo(c.tempo) : '<span class="missing-italic">sem dado</span>'}</td>`).join("");

    const tableHtml = `
      <table class="${cls}">
        <thead><tr><th>Área</th>${headCols}</tr></thead>
        <tbody>
          ${areaRows}
          <tr class="compare-row-sep"><td>${metricTip("custo", "Custo por tarefa")}</td>${costCells}</tr>
          <tr><td>${metricTip("tempo", "Tempo de resposta")}</td>${timeCells}</tr>
        </tbody>
      </table>
    `;
    return compact ? tableHtml : `<div class="compare-table-card" style="--cmp-cols:${cols.length}">${tableHtml}</div>`;
  }

  function shortCompareName(c) {
    const eff = c.esforco === "single" ? "" : ` ${motor.fmt.esforco(c.esforco)}`;
    return `${c.nome}${eff}`;
  }

  function renderCompareAreaListHtml(comp, { highlightArea = null } = {}) {
    if (!comp?.ok) return "";
    const cols = comp.colunas;
    const colNames = cols.map((c) => c.esforco === "single" ? c.nome : `${c.nome} ${motor.fmt.esforco(c.esforco)}`);

    const areaBlocks = comp.linhas.map((l) => {
      const isAct = highlightArea && l.area === highlightArea;
      const valid = l.notas.filter((x) => x !== null);
      const maxVal = valid.length ? Math.max(...valid, 1) : 1;
      const rowsHtml = l.notas.map((val, idx) => {
        const c = cols[idx];
        const colName = colNames[idx];
        const isLeader = l.lider && l.lider === colName;
        const isTied = l.empate && l.empate.includes(colName);
        const pct = val != null ? Math.max(0, Math.min(100, (val / maxVal) * 100)) : 0;
        const valHtml = val != null
          ? `${isTied ? '<span class="compare-tie-mark">≈</span>' : ""}${motor.fmt.nota(val)}`
          : '<span class="missing-italic">sem dado</span>';
        return `
          <div class="compare-area-row${isLeader ? " is-leader" : ""}">
            <div class="compare-area-id">
              ${renderLogo(c.empresa, false, 16)}
              <span class="compare-area-name">${escHtml(shortCompareName(c))}</span>
            </div>
            <div class="compare-area-bar-track" aria-hidden="true">
              ${val != null ? `<div class="compare-area-bar-fill" style="width:${pct.toFixed(1)}%;background:${escHtml(companyColor(c.empresa))}"></div>` : ""}
            </div>
            <div class="compare-area-val num">${valHtml}</div>
          </div>
        `;
      }).join("");
      return `<div class="compare-area-block${isAct ? " is-active-area" : ""}"><h3 class="compare-area-title">${escHtml(l.nome_area)}</h3><div class="compare-area-rows">${rowsHtml}</div></div>`;
    }).join("");

    const renderMetricBlock = (titleHtml, vals, formatter) => {
      const valid = vals.filter((x) => x != null && x > 0);
      const minVal = valid.length ? Math.min(...valid) : null;
      const rowsHtml = cols.map((c, idx) => {
        const val = vals[idx];
        const isBest = minVal != null && val != null && val === minVal;
        return `
          <div class="compare-area-row is-no-bar${isBest ? " is-leader" : ""}">
            <div class="compare-area-id">
              ${renderLogo(c.empresa, false, 16)}
              <span class="compare-area-name">${escHtml(shortCompareName(c))}</span>
            </div>
            <div class="compare-area-val num">${val != null ? formatter(val) : '<span class="missing-italic">sem dado</span>'}</div>
          </div>
        `;
      }).join("");
      return `<div class="compare-area-block"><h3 class="compare-area-title">${titleHtml}</h3><div class="compare-area-rows">${rowsHtml}</div></div>`;
    };

    return `
      <div class="compare-area-list">
        ${areaBlocks}
        ${renderMetricBlock(metricTip("custo", "Custo por tarefa"), cols.map((c) => c.custo), motor.fmt.custo)}
        ${renderMetricBlock(metricTip("tempo", "Tempo de resposta"), cols.map((c) => c.tempo), motor.fmt.tempo)}
      </div>
    `;
  }

  function renderCompareResultBody(wrapEl) {
    if (!wrapEl || !lastCompareComp?.ok) return;
    if (state.compareSource !== "aa") return;
    const w = wrapEl.clientWidth || wrapEl.getBoundingClientRect().width || window.innerWidth;
    const minTableWidth = 220 + 160 * lastCompareComp.colunas.length;
    const mode = w >= minTableWidth ? "table" : "list";
    if (wrapEl.dataset.mode === mode && wrapEl.firstElementChild) return;
    wrapEl.dataset.mode = mode;
    wrapEl.innerHTML = mode === "table"
      ? renderCompareTableHtml(lastCompareComp, { highlightArea: state.area })
      : renderCompareAreaListHtml(lastCompareComp, { highlightArea: state.area });
  }

  function renderCompareSection() {
    const root = $("compare-root");
    if (!root) return;

    const aaActive = state.compareSource === "aa";
    const ids = [...new Set(state.compareItems.map((c) => c.modelo))];
    const fontes = !aaActive && ids.length >= 2
      ? motor.comparar_fontes(state.base, { itens: ids, incluirParciais: true })
      : null;
    const colsHtml = state.compareItems.map((it, idx) => {
      const f = state.base.porId.get(it.modelo) || state.base.familias[0];
      const effortsHtml = f.variantes.map((v) => `
        <button type="button" class="compare-effort-btn${v.esforco === it.esforco ? " is-active" : ""}" data-compare-col="${idx}" data-compare-effort="${escHtml(v.esforco)}">
          ${escHtml(motor.fmt.esforco(v.esforco))}
        </button>
      `).join("");
      const selectOptsHtml = f.variantes.map((v) => `
        <option value="${escHtml(v.esforco)}"${v.esforco === it.esforco ? " selected" : ""}>${escHtml(motor.fmt.esforco(v.esforco))}</option>
      `).join("");
      return `
        <div class="compare-col-card" data-compare-idx="${idx}">
          <div class="compare-col-top">
            ${renderLogo(f.empresa)}
            <div class="compare-search-wrap">
              <input type="text" class="compare-search-input" value="${escHtml(f.nome)}" data-compare-search="${idx}" aria-label="Escolher modelo ${idx + 1}" autocomplete="off">
              <div class="compare-dropdown" data-compare-dropdown="${idx}"></div>
            </div>
            ${aaActive ? `<select class="compare-effort-select" data-compare-select="${idx}" aria-label="Nível de esforço do modelo ${idx + 1}">${selectOptsHtml}</select>` : ""}
            ${state.compareItems.length > 2 ? `<button type="button" class="compare-remove" data-compare-remove="${idx}" aria-label="Remover coluna ${idx + 1}">×</button>` : ""}
          </div>
          ${aaActive ? `<div class="compare-efforts">${effortsHtml}</div>` : ""}
        </div>
      `;
    }).join("");

    const addBtnHtml = state.compareItems.length < 4
      ? `<button type="button" class="compare-add-btn" id="compare-add-btn">+ adicionar</button>`
      : "";

    const comp = aaActive ? motor.comparar(state.base, { itens: state.compareItems, areas: motor.AREA_KEYS }) : null;
    lastCompareComp = comp;
    const respostaHtml = comp?.ok && comp.resposta
      ? `<div class="compare-resposta-box">
          <div class="compare-resposta-head">${bulbIconSvg}<p class="compare-resposta-title">${escHtml(comp.resposta.titulo)}</p></div>
          <div class="compare-resposta-texts">${(comp.resposta.texto || []).map((t) => `<p class="compare-resposta-p">${escHtml(t)}</p>`).join("")}</div>
        </div>`
      : "";

    root.innerHTML = `
      <div class="compare-shell">
        <div class="guide-tabs compare-source-tabs" id="compare-source-tabs" role="tablist" aria-label="Fonte da comparação">
          ${Object.entries(compareSources).map(([key, label]) => `<button type="button" role="tab" data-tab="${key}" id="compare-tab-${key}" aria-controls="compare-panel">${label}</button>`).join("")}
        </div>
        <div id="compare-panel" role="tabpanel" aria-labelledby="compare-tab-${state.compareSource}" tabindex="0">
          <div class="compare-cols-bar">${colsHtml}${addBtnHtml}</div>
          ${aaActive ? `${respostaHtml}<div id="compare-result-wrap"></div>${renderSourceLineHtml("aa", state.area)}`
            : renderExternalCompareHtml(fontes, ids.length)}
        </div>
      </div>
    `;
    const tabGroup = $("compare-source-tabs");
    syncTabButtons(tabGroup, state.compareSource);
    bindTabs(tabGroup, (id) => {
      if (id === state.compareSource) return;
      state.compareSource = id;
      renderCompareSection();
      $("compare-tab-" + id).focus({ preventScroll: true });
      if (!prefersReducedMotion()) $("compare-panel").animate?.([{ opacity: 0.6 }, { opacity: 1 }], 220);
      emit("compare_source", id);
    });

    const resultWrap = $("compare-result-wrap");
    renderCompareResultBody(resultWrap);
    if (compareResizeObserver) compareResizeObserver.disconnect();
    if ("ResizeObserver" in window && resultWrap) {
      compareResizeObserver = new ResizeObserver(() => renderCompareResultBody(resultWrap));
      compareResizeObserver.observe(resultWrap);
    }
    bindCompareEvents();
  }

  function bindCompareEvents() {
    const root = $("compare-root");
    if (!root) return;

    root.querySelectorAll("[data-compare-effort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.compareCol);
        state.compareItems[idx].esforco = btn.dataset.compareEffort;
        renderCompareSection();
        syncUrl();
        emit("compare", state.compareItems[idx].modelo);
      });
    });

    root.querySelectorAll("[data-compare-select]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const idx = Number(sel.dataset.compareSelect);
        state.compareItems[idx].esforco = sel.value;
        renderCompareSection();
        syncUrl();
        emit("compare", state.compareItems[idx].modelo);
      });
    });

    root.querySelectorAll("[data-compare-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.compareItems.length <= 2) return;
        state.compareItems.splice(Number(btn.dataset.compareRemove), 1);
        renderCompareSection();
        syncUrl();
      });
    });

    const addBtn = $("compare-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (state.compareItems.length >= 4) return;
        const used = new Set(state.compareItems.map((c) => c.modelo));
        const nextF = state.base.familias.find((f) => !used.has(f.id)) || state.base.familias[0];
        const defEff = nextF.variantes.find((v) => v.esforco === "high")?.esforco || nextF.variantes[nextF.variantes.length - 1].esforco;
        state.compareItems.push({ modelo: nextF.id, esforco: defEff });
        renderCompareSection();
        syncUrl();
        emit("compare", nextF.id);
      });
    }

    root.querySelectorAll("[data-compare-search]").forEach((input) => {
      const idx = Number(input.dataset.compareSearch);
      const dd = root.querySelector(`[data-compare-dropdown="${idx}"]`);
      const fillList = (q) => {
        const nq = motor.normal(q);
        const matches = state.base.familias.filter((f) => !nq || motor.normal(f.nome).includes(nq) || motor.normal(f.empresa).includes(nq)).slice(0, 14);
        dd.innerHTML = matches.map((f) => `
          <button type="button" class="compare-opt" data-pick-model="${escHtml(f.id)}">
            <span>${escHtml(f.nome)}</span>
            <span class="compare-opt-emp">${escHtml(f.empresa)}</span>
          </button>
        `).join("") || `<div class="compare-opt"><span class="missing-val">nenhum modelo</span></div>`;
        dd.classList.add("is-open");
        dd.querySelectorAll("[data-pick-model]").forEach((opt) => {
          opt.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const f = state.base.porId.get(opt.dataset.pickModel);
            if (!f) return;
            const prevEff = state.compareItems[idx].esforco;
            const eff = f.variantes.some((v) => v.esforco === prevEff) ? prevEff : (f.variantes.find((v) => v.esforco === "high")?.esforco || f.variantes[f.variantes.length - 1].esforco);
            state.compareItems[idx] = { modelo: f.id, esforco: eff };
            renderCompareSection();
            syncUrl();
            emit("compare", f.id);
          });
        });
      };
      input.addEventListener("focus", () => { input.select(); fillList(""); });
      input.addEventListener("input", () => fillList(input.value));
      input.addEventListener("blur", () => {
        later(() => {
          dd.classList.remove("is-open");
          const f = state.base.porId.get(state.compareItems[idx]?.modelo);
          if (f) input.value = f.nome;
        }, 150);
      });
    });
  }

  /* ─── Painel do modelo ─── */

  function computePanelPositions(f, currentVar) {
    const k = state.area;
    const tetoDe = (fam) => fam.variantes.filter((v) => v.notas[k] != null).reduce((m, v) => (!m || v.notas[k] > m.notas[k] ? v : m), null);
    const outros = state.base.familias.filter((x) => x.id !== f.id).map(tetoDe).filter(Boolean);
    return {
      posNota: currentVar.notas[k] == null ? null : 1 + outros.filter((v) => v.notas[k] > currentVar.notas[k]).length,
      posCost: currentVar.custo == null ? null : 1 + outros.filter((v) => v.custo != null && v.custo < currentVar.custo).length,
      posTime: currentVar.tempo == null ? null : 1 + outros.filter((v) => v.tempo != null && v.tempo < currentVar.tempo).length
    };
  }

  function renderEffortSelector(f, currentVar) {
    const vs = f.variantes;
    const hasNonStandard = vs.some((v) => !motor.ORDEM_ESFORCO.slice(0, 7).includes(v.esforco));
    const helpLine = `<p class="panel-section-help">Quanto o modelo pensa antes de responder. Mais esforço costuma acertar mais, mas custa e demora mais.</p>`;
    if (vs.length === 1 || hasNonStandard) {
      return `<div><p class="panel-section-label">Nível de esforço</p>${helpLine}<div class="effort-single-wrap">${vs.map((v) => `
        <button type="button" class="effort-pill${isUnknownEffort(v.esforco) ? " is-outline" : ""}" style="${v.esforco === currentVar.esforco ? "background:var(--green-100);border-color:var(--green-700);color:var(--green-900);font-weight:700;" : "cursor:pointer;"}" data-select-effort="${escHtml(v.esforco)}">${escHtml(motor.fmt.esforco(v.esforco))}</button>
      `).join("")}</div></div>`;
    }
    const stops = [];
    if (vs.some((v) => v.esforco === "non-reasoning")) stops.push("non-reasoning");
    if (vs.some((v) => v.esforco === "minimal")) stops.push("minimal");
    stops.push(...MAIN_EFFORTS);
    const availSet = new Set(vs.map((v) => v.esforco));
    const activeIdx = Math.max(0, stops.indexOf(currentVar.esforco));
    const railInset = (50 / stops.length).toFixed(4) + "%";
    const thumbLeft = ((activeIdx / Math.max(1, stops.length - 1)) * 100).toFixed(2) + "%";
    const ariaValText = `${motor.fmt.esforco(currentVar.esforco)}, nota ${motor.fmt.nota(currentVar.notas[state.area])}`;

    return `
      <div>
        <p class="panel-section-label">Nível de esforço</p>
        ${helpLine}
        <div class="effort-ruler-box">
          <div class="effort-ruler" id="effort-ruler" data-stops="${escHtml(stops.join(","))}" data-avail="${escHtml([...availSet].join(","))}">
            <div class="effort-rail-hit" id="effort-rail-hit" style="--rail-inset:${railInset}">
              <div class="effort-rail">
                <div class="effort-thumb" id="effort-thumb" role="slider" tabindex="0"
                     aria-label="Nível de esforço" aria-valuemin="0" aria-valuemax="${stops.length - 1}"
                     aria-valuenow="${activeIdx}" aria-valuetext="${escHtml(ariaValText)}"
                     style="left:${thumbLeft}"></div>
              </div>
            </div>
            <div class="effort-stops">
              ${stops.map((st) => {
                const avail = availSet.has(st), active = st === currentVar.esforco;
                return `<button type="button" class="effort-stop${avail ? "" : " is-disabled"}${active ? " is-active" : ""}" ${avail ? `data-select-effort="${escHtml(st)}"` : 'aria-disabled="true" tabindex="-1" title="não medido ou não oferecido"'}><span class="effort-stop-dot"></span><span class="effort-stop-label">${escHtml(motor.fmt.esforco(st))}</span></button>`;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function layoutLadderLabels(points, width) {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const placed = [];
    let lastBelowX = -999, lastAboveX = -999;
    const minSameSideGap = 62;
    for (const p of sorted) {
      const lbl = motor.fmt.esforco(p.esforco);
      const halfW = Math.max(14, lbl.length * 3.4);
      const lx = Math.max(halfW, Math.min(width - halfW, p.x));
      let above = false;
      if (lx - lastBelowX < minSameSideGap) {
        above = true;
        if (lx - lastAboveX < minSameSideGap) {
          lastAboveX = Math.min(width - halfW, Math.max(lx, lastAboveX + minSameSideGap));
          placed.push({ ...p, lbl, lx: lastAboveX, above: true });
          continue;
        }
        lastAboveX = lx;
      } else {
        lastBelowX = lx;
      }
      placed.push({ ...p, lbl, lx, above });
    }
    return placed;
  }

  function buildLadderTrack(label, items, currentEffort, isLog, color, prevX, trackKey, showAllLabels) {
    const valid = items.filter((it) => it.val != null && (!isLog || it.val > 0));
    const currentItem = valid.find((it) => it.esforco === currentEffort);
    const width = 280, pad = 12, inner = width - pad * 2;
    if (!valid.length) {
      return { html: `<div class="ladder-row"><div class="ladder-name">${escHtml(label)}</div><div class="ladder-svg-wrap"><span class="missing-val">sem dado</span></div><div class="ladder-val missing-val">sem dado</div></div>`, currX: null };
    }
    const mapped = valid.map((it) => ({ ...it, m: isLog ? Math.log(it.val) : it.val }));
    const minM = Math.min(...mapped.map((x) => x.m)), maxM = Math.max(...mapped.map((x) => x.m)), span = maxM - minM;
    const pts = mapped.map((it) => ({ esforco: it.esforco, val: it.val, x: pad + (span === 0 ? 0.5 : (it.m - minM) / span) * inner }));
    const labeled = layoutLadderLabels(pts, width);
    const activePt = pts.find((p) => p.esforco === currentEffort);
    const currX = activePt ? activePt.x : null, startX = prevX != null ? prevX : currX;
    const displayVal = !currentItem ? "sem dado" : (trackKey === "nota" ? motor.fmt.nota(currentItem.val) : trackKey === "cost" ? motor.fmt.custo(currentItem.val) : motor.fmt.tempo(currentItem.val));
    const trackY = 27;

    const labelsHtml = labeled.map((p) => {
      const isAct = p.esforco === currentEffort;
      if (!showAllLabels && !isAct) return "";
      const lblX = showAllLabels ? p.lx : Math.max(18, Math.min(width - 18, p.x));
      const topPx = showAllLabels ? (p.above ? 2 : 39) : 39;
      return `<span class="ladder-tick-lbl${isAct ? " is-active" : ""}" style="left:${((lblX / width) * 100).toFixed(2)}%;top:${topPx}px">${escHtml(p.lbl)}</span>`;
    }).join("");

    return {
      currX,
      html: `
        <div class="ladder-row">
          <div class="ladder-name">${escHtml(label)}</div>
          <div class="ladder-svg-wrap">
            <svg class="ladder-svg" viewBox="0 0 ${width} 54" aria-hidden="true">
              <line x1="${pad}" y1="${trackY}" x2="${width - pad}" y2="${trackY}" stroke="#d7dfdb" stroke-width="2" stroke-linecap="round"/>
              ${labeled.map((p) => {
                const isAct = p.esforco === currentEffort;
                const connY1 = p.above ? trackY - 5 : trackY + 5;
                const connY2 = p.above ? 15 : 37;
                const tickHtml = `<line x1="${p.x.toFixed(1)}" y1="${trackY - 5}" x2="${p.x.toFixed(1)}" y2="${trackY + 5}" stroke="${isAct ? "#17231f" : "#9aa7a1"}" stroke-width="${isAct ? "2" : "1.5"}" stroke-linecap="round"/>`;
                if (!showAllLabels && !isAct) return tickHtml;
                return `${tickHtml}${showAllLabels && Math.abs(p.lx - p.x) > 4 ? `<line x1="${p.x.toFixed(1)}" y1="${connY1}" x2="${p.lx.toFixed(1)}" y2="${connY2}" stroke="#d7dfdb" stroke-width="1"/>` : ""}`;
              }).join("")}
              ${prevX != null && currX != null && Math.abs(prevX - currX) > 0.5 && !prefersReducedMotion() ? `<circle class="ladder-ghost" cx="${prevX.toFixed(1)}" cy="${trackY}" r="5.5" fill="#ffffff" stroke="#61706a" stroke-width="1.8"/>` : ""}
              ${currX != null ? `<g class="ladder-dot-group" style="transform:translateX(${(startX ?? currX).toFixed(1)}px)" data-target-x="${currX.toFixed(1)}"><circle cx="0" cy="${trackY}" r="9.8" fill="${escHtml(color)}" fill-opacity="0.25"/><circle cx="0" cy="${trackY}" r="5.8" fill="${escHtml(color)}" stroke="#ffffff" stroke-width="1.5"/></g>` : ""}
            </svg>
            ${labelsHtml}
          </div>
          <div class="ladder-val num">${escHtml(displayVal)}</div>
        </div>
      `
    };
  }

  function renderDegrauCardHtml(d, { compact = false, interactive = true } = {}) {
    if (!d?.ok) return "";
    const up = d.sentido === "subir";
    const parts = String(d.mudancas || "").split(" · ");
    const custoRaw = (parts[1] || "").replace(/^custo\s+/, "") || "sem dado";
    const tempoRaw = (parts[2] || "").replace(/^tempo\s+/, "") || "sem dado";
    const custoVal = custoRaw.includes("sem dado") ? "sem dado" : custoRaw;
    const tempoVal = tempoRaw.includes("sem dado") ? "sem dado" : tempoRaw;
    const mainTag = interactive ? "button" : "div";
    const mainAttrs = interactive ? `type="button" data-select-effort="${escHtml(d.para)}"` : "";
    const kickerHtml = up
      ? `Mais esforço · ${escHtml(motor.fmt.esforco(d.para))} ${arrowRightSvg12}`
      : `${arrowLeftSvg12} Menos esforço · ${escHtml(motor.fmt.esforco(d.para))}`;
    const tom = d.tom || "neutro";
    const resp = d.resposta || { titulo: "", texto: [] };

    return `
      <div class="step-card${compact ? " is-compact" : ""}" data-step-dir="${up ? "up" : "down"}">
        <${mainTag} class="step-card-main" ${mainAttrs}>
          <span class="step-card-kicker">${kickerHtml}</span>
          <div class="step-selo-row">
            <span class="step-badge ${escHtml(tom)}">${tom === "espera" ? clockSvg12 : ""}${escHtml(d.veredito || d.selo_texto)}</span>
          </div>
          <div class="step-sep"></div>
          <div class="step-rows">
            <div class="step-row"><span class="step-row-lbl">${metricTip("nota", "Nota")}</span><span class="step-row-val num">${escHtml(motor.fmt.pontos(d.ganho))}</span></div>
            <div class="step-row"><span class="step-row-lbl">${metricTip("custo", "Custo")}</span><span class="step-row-val num">${escHtml(custoVal)}</span></div>
            <div class="step-row"><span class="step-row-lbl">${metricTip("tempo", "Tempo")}</span><span class="step-row-val num">${escHtml(tempoVal)}</span></div>
          </div>
        </${mainTag}>
        ${compact ? "" : `
        <div class="step-explain-footer">
          <button type="button" class="step-explain-btn" aria-expanded="false">
            <span class="step-explain-lbl">Ver explicação</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div class="step-explain-wrap">
            <div class="step-explain-inner">
              <div class="step-explain-content">
                ${resp.titulo ? `<p class="step-explain-title">${escHtml(resp.titulo)}</p>` : ""}
                ${(resp.texto || []).map((p) => `<p class="step-explain-p">${escHtml(p)}</p>`).join("")}
              </div>
            </div>
          </div>
        </div>
        `}
      </div>
    `;
  }

  function renderStepsSection(f, currentVar) {
    const vs = f.variantes.filter((v) => v.notas[state.area] !== null);
    if (vs.length < 2) return "";
    const idx = vs.findIndex((v) => v.esforco === currentVar.esforco);
    if (idx === -1) return "";
    const next = idx < vs.length - 1 ? vs[idx + 1] : null;
    const prev = idx > 0 ? vs[idx - 1] : null;

    const dUp = next ? motor.degrau(state.base, { modelo: f.id, de: currentVar.esforco, para: next.esforco, area: state.area }) : null;
    const dDown = prev ? motor.degrau(state.base, { modelo: f.id, de: currentVar.esforco, para: prev.esforco, area: state.area }) : null;

    const leftHtml = dDown?.ok
      ? renderDegrauCardHtml(dDown)
      : `<div class="step-card is-empty" data-step-dir="down">Este já é o menor nível medido</div>`;
    const rightHtml = dUp?.ok
      ? renderDegrauCardHtml(dUp)
      : `<div class="step-card is-empty" data-step-dir="up">Este já é o maior nível medido</div>`;

    return `<div><p class="panel-section-label">E se mudar o esforço?</p><p class="panel-section-sub">O que acontece com este modelo um nível abaixo e um nível acima de ${escHtml(motor.fmt.esforco(currentVar.esforco))}.</p><div class="steps-grid">${leftHtml}${rightHtml}</div><p class="steps-ref">Para comparar: entre os modelos, dobrar o custo costuma render 6 a 7 pontos de nota.</p></div>`;
  }

  function renderPanelBody() {
    const f = state.base.porId.get(state.drawerModelId);
    if (!f) return;
    const currentVar = f.variantes.find((v) => v.esforco === state.drawerEffort) || f.variantes[0];
    const esc = motor.escada(state.base, { modelo: f.id, esforco: currentVar.esforco, area: state.area });
    const nivelInfo = esc.ok ? esc.niveis.find((n) => n.esforco === currentVar.esforco) : null;
    const pos = computePanelPositions(f, currentVar);
    const posNota = nivelInfo?.posicao_nota ?? pos.posNota;

    const kpisHtml = `
      <div>
        <p class="panel-section-label">Medidas em ${escHtml(motor.fmt.esforco(currentVar.esforco))} · ${escHtml(motor.AREAS[state.area])}</p>
        <div class="panel-kpis">
          <div class="kpi-box"><div class="kpi-label">${metricTip("nota", "Nota (0 a 100)")}</div><div class="kpi-val num">${motor.fmt.nota(currentVar.notas[state.area])}</div><div class="kpi-rank">${posNota != null ? `${posNota}º entre os modelos` : "—"}</div></div>
          <div class="kpi-box"><div class="kpi-label">${metricTip("custo", "Custo por tarefa")}</div><div class="kpi-val num">${motor.fmt.custo(currentVar.custo)}</div><div class="kpi-rank">${pos.posCost != null ? `${pos.posCost}º mais barato` : "—"}</div></div>
          <div class="kpi-box"><div class="kpi-label">${metricTip("tempo", "Tempo de resposta")}</div><div class="kpi-val num">${motor.fmt.tempo(currentVar.tempo)}</div><div class="kpi-rank">${pos.posTime != null ? `${pos.posTime}º mais rápido` : "—"}</div></div>
        </div>
      </div>
    `;

    const color = companyColor(f.empresa), prevCoords = state.ladderPrevCoords || {};
    let ladderHtml = "", newCoords = { nota: null, cost: null, time: null };
    if (f.variantes.length >= 2) {
      const tN = buildLadderTrack("Nota", f.variantes.map((v) => ({ esforco: v.esforco, val: v.notas[state.area] })), currentVar.esforco, false, color, prevCoords.nota, "nota", true);
      const tC = buildLadderTrack("Custo", f.variantes.map((v) => ({ esforco: v.esforco, val: v.custo })), currentVar.esforco, true, color, prevCoords.cost, "cost", false);
      const tT = buildLadderTrack("Tempo", f.variantes.map((v) => ({ esforco: v.esforco, val: v.tempo })), currentVar.esforco, true, color, prevCoords.time, "time", false);
      newCoords = { nota: tN.currX, cost: tC.currX, time: tT.currX };
      ladderHtml = `<div><p class="panel-section-label">Como o modelo muda com o esforço</p><p class="ladder-legend">Cada traço é um nível de esforço. Nos níveis altos, custo e tempo crescem tanto que as réguas deles são comprimidas.</p><div class="ladder-card">${tN.html}${tC.html}${tT.html}</div></div>`;
    }
    state.ladderPrevCoords = newCoords;

    const insights = esc.ok ? esc.frases : [];
    const insightsHtml = insights.length
      ? `<div><p class="panel-section-label">O que os dados mostram</p><ul class="insights-list">${insights.map((t) => `<li class="insight-item">${bulbIconSvg}<span>${escHtml(t)}</span></li>`).join("")}</ul></div>`
      : "";

    const areasHtml = `
      <div>
        <button type="button" class="areas-toggle" id="areas-toggle" aria-expanded="${state.areasOpen}" aria-controls="areas-panel">
          <span>Notas por área</span>
          <svg class="chevron-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform:${state.areasOpen ? "rotate(180deg)" : "none"}" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
        </button>
        <div class="areas-wrap${state.areasOpen ? " is-open" : ""}" id="areas-panel"><div class="areas-inner"><div class="areas-list">
          ${motor.AREA_KEYS.map((k) => {
            const val = currentVar.notas[k], med = state.mediansByArea[k];
            return `<div class="area-row"><span class="area-name">${escHtml(motor.AREAS[k])}</span><div class="area-track">${val != null ? `<div class="area-fill" style="width:${Math.max(0, Math.min(100, val)).toFixed(1)}%"></div>` : ""}${med != null ? `<div class="area-median" style="left:${Math.max(0, Math.min(100, med)).toFixed(1)}%" title="Mediana: ${motor.fmt.nota(med)}"></div>` : ""}</div><span class="area-val num">${val != null ? motor.fmt.nota(val) : '<span class="missing-val">sem dado</span>'}</span></div>`;
          }).join("")}
          <p class="areas-legend">Escala de 0 a 100 · traço cinza marca a mediana dos ${state.base.familias.length} modelos.</p>
        </div></div></div>
      </div>
    `;

    const compareBtnHtml = `<div class="panel-actions-row"><button type="button" class="btn-pill" id="panel-compare-btn">Comparar com outro</button></div>${renderSourceLineHtml("aa", state.area)}`;

    const bodyEl = $("drawer-body-content");
    if (!bodyEl) return;
    bodyEl.innerHTML = kpisHtml + ladderHtml + renderStepsSection(f, currentVar) + insightsHtml + areasHtml + compareBtnHtml;

    if (f.variantes.length >= 2 && !prefersReducedMotion()) {
      cancelLater(state.ladderGhostTimer);
      nextFrame(() => {
        bodyEl.querySelectorAll(".ladder-dot-group").forEach((d) => { d.style.transform = `translateX(${d.dataset.targetX}px)`; });
        bodyEl.querySelectorAll(".ladder-ghost").forEach((g) => g.classList.add("is-fading"));
      });
      state.ladderGhostTimer = later(() => bodyEl.querySelectorAll(".ladder-ghost").forEach((g) => g.remove()), 1250);
    }
    bindPanelBodyInteractive();
  }

  function updateRulerUi(stops, activeEffort) {
    const ruler = $("effort-ruler");
    const thumb = $("effort-thumb");
    if (!ruler || !thumb) return;
    const f = state.base.porId.get(state.drawerModelId);
    const v = f?.variantes.find((x) => x.esforco === activeEffort);
    const idx = Math.max(0, stops.indexOf(activeEffort));
    thumb.setAttribute("aria-valuenow", String(idx));
    if (v) thumb.setAttribute("aria-valuetext", `${motor.fmt.esforco(activeEffort)}, nota ${motor.fmt.nota(v.notas[state.area])}`);
    ruler.querySelectorAll(".effort-stop").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.selectEffort === activeEffort);
    });
  }

  function renderDrawerFull() {
    const f = state.base.porId.get(state.drawerModelId);
    if (!f) return;
    const currentVar = f.variantes.find((v) => v.esforco === state.drawerEffort) || f.variantes[0];
    $("drawer-logo").innerHTML = renderLogo(f.empresa, true);
    $("drawer-model-name").textContent = f.nome;
    $("drawer-model-meta").textContent = `${f.empresa} · lançado em ${fmtDate(f.lancamento)}`;

    const scrollEl = $("drawer-scroll");
    scrollEl.innerHTML = `${renderEffortSelector(f, currentVar)}<div id="drawer-body-content" style="display:flex;flex-direction:column;gap:22px"></div>`;
    renderPanelBody();
    bindEffortSelectorEvents();
  }

  function bindEffortSelectorEvents() {
    const scrollEl = $("drawer-scroll");
    scrollEl.querySelectorAll("[data-select-effort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.drawerEffort = btn.dataset.selectEffort;
        const ruler = $("effort-ruler");
        if (ruler) {
          const stops = ruler.dataset.stops.split(",");
          const thumb = $("effort-thumb");
          if (thumb) thumb.style.left = ((stops.indexOf(state.drawerEffort) / Math.max(1, stops.length - 1)) * 100).toFixed(2) + "%";
          updateRulerUi(stops, state.drawerEffort);
          renderPanelBody();
          syncUrl();
        } else {
          renderDrawerFull();
          syncUrl();
        }
      });
    });

    const ruler = $("effort-ruler");
    const thumb = $("effort-thumb");
    const railHit = $("effort-rail-hit");
    if (!ruler || !thumb || !railHit) return;

    const stops = ruler.dataset.stops.split(",");
    const avail = new Set(ruler.dataset.avail.split(","));
    const availIndices = stops.map((s, i) => avail.has(s) ? i : -1).filter((i) => i !== -1);

    thumb.addEventListener("keydown", (e) => {
      const currIdx = stops.indexOf(state.drawerEffort);
      const pos = availIndices.indexOf(currIdx);
      let nextPos = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") nextPos = Math.min(availIndices.length - 1, pos + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nextPos = Math.max(0, pos - 1);
      else if (e.key === "Home") nextPos = 0;
      else if (e.key === "End") nextPos = availIndices.length - 1;
      if (nextPos != null && availIndices[nextPos] !== currIdx) {
        e.preventDefault();
        state.drawerEffort = stops[availIndices[nextPos]];
        thumb.style.left = ((availIndices[nextPos] / Math.max(1, stops.length - 1)) * 100).toFixed(2) + "%";
        updateRulerUi(stops, state.drawerEffort);
        renderPanelBody();
        syncUrl();
      }
    });

    let dragging = false;
    const nearestMeasured = (pct) => {
      const approx = pct * Math.max(1, stops.length - 1);
      let bestIdx = availIndices[0], bestDist = Infinity;
      for (const idx of availIndices) {
        const d = Math.abs(idx - approx);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      }
      return bestIdx;
    };
    const onPointer = (cx, snap) => {
      const rect = railHit.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (cx - rect.left) / Math.max(1, rect.width)));
      const bestIdx = nearestMeasured(pct);
      const targetEffort = stops[bestIdx];
      thumb.style.left = snap
        ? ((bestIdx / Math.max(1, stops.length - 1)) * 100).toFixed(2) + "%"
        : (pct * 100).toFixed(2) + "%";
      if (targetEffort && targetEffort !== state.drawerEffort) {
        state.drawerEffort = targetEffort;
        updateRulerUi(stops, targetEffort);
        renderPanelBody();
        syncUrl();
      }
    };
    railHit.addEventListener("pointerdown", (e) => {
      dragging = true;
      thumb.classList.add("is-dragging");
      railHit.setPointerCapture(e.pointerId);
      onPointer(e.clientX, false);
    });
    railHit.addEventListener("pointermove", (e) => {
      if (dragging) onPointer(e.clientX, false);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      thumb.classList.remove("is-dragging");
      onPointer(e.clientX, true);
    };
    railHit.addEventListener("pointerup", endDrag);
    railHit.addEventListener("pointercancel", endDrag);
  }

  function bindPanelBodyInteractive() {
    const bodyEl = $("drawer-body-content");
    if (!bodyEl) return;
    bodyEl.querySelectorAll("[data-select-effort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.drawerEffort = btn.dataset.selectEffort;
        const ruler = $("effort-ruler");
        if (ruler) {
          const stops = ruler.dataset.stops.split(",");
          const thumb = $("effort-thumb");
          if (thumb) thumb.style.left = ((stops.indexOf(state.drawerEffort) / Math.max(1, stops.length - 1)) * 100).toFixed(2) + "%";
          updateRulerUi(stops, state.drawerEffort);
          renderPanelBody();
          syncUrl();
        } else {
          renderDrawerFull();
          syncUrl();
        }
      });
    });

    const areasToggle = $("areas-toggle");
    if (areasToggle) {
      areasToggle.addEventListener("click", () => {
        state.areasOpen = !state.areasOpen;
        $("areas-panel").classList.toggle("is-open", state.areasOpen);
        areasToggle.setAttribute("aria-expanded", String(state.areasOpen));
        const chev = areasToggle.querySelector(".chevron-icon");
        if (chev) chev.style.transform = state.areasOpen ? "rotate(180deg)" : "none";
      });
    }

    const cmpBtn = $("panel-compare-btn");
    if (cmpBtn) {
      cmpBtn.addEventListener("click", () => {
        const mId = state.drawerModelId, eff = state.drawerEffort;
        const existing = state.compareItems.findIndex((c) => c.modelo === mId);
        if (existing !== -1) state.compareItems[existing].esforco = eff;
        else if (state.compareItems.length < 4) state.compareItems.push({ modelo: mId, esforco: eff });
        else state.compareItems[state.compareItems.length - 1] = { modelo: mId, esforco: eff };
        renderCompareSection();
        closeDrawer();
        syncUrl();
        emit("compare", mId);
        $("comparar-section")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      });
    }

    bodyEl.querySelectorAll(".step-explain-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const footer = btn.closest(".step-explain-footer");
        const wrap = footer?.querySelector(".step-explain-wrap");
        if (!wrap) return;
        const open = !wrap.classList.contains("is-open");
        wrap.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        const lbl = btn.querySelector(".step-explain-lbl");
        if (lbl) lbl.textContent = open ? "Ocultar explicação" : "Ver explicação";
      });
    });
  }

  function openDrawer(modelId, effort, triggerEl = null) {
    const f = state.base.porId.get(modelId);
    if (!f) return;
    const bestInArea = f.variantes.filter((v) => v.notas[state.area] != null).sort((a, b) => b.notas[state.area] - a.notas[state.area])[0] || f.variantes[0];
    const targetVar = (effort && f.variantes.find((v) => v.esforco === effort)) || bestInArea;
    const isSameModel = state.drawerOpen && state.drawerModelId === modelId;
    if (!isSameModel) state.ladderPrevCoords = null;

    state.lastTriggerEl = triggerEl || document.activeElement;
    state.drawerOpen = true;
    state.drawerModelId = modelId;
    state.drawerEffort = targetVar.esforco;

    renderDrawerFull();
    $("drawer-backdrop").classList.add("is-open");
    $("drawer-backdrop").setAttribute("aria-hidden", "false");
    const drawer = $("model-drawer");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");

    if (!isSameModel) {
      $("drawer-scroll").scrollTop = 0;
      drawer.focus({ preventScroll: true });
      emit("model", modelId);
    }
    syncUrl();
  }

  function closeDrawer() {
    if (!state.drawerOpen) return;
    state.drawerOpen = false;
    state.ladderPrevCoords = null;
    const drawer = $("model-drawer");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    $("drawer-backdrop").classList.remove("is-open");
    $("drawer-backdrop").setAttribute("aria-hidden", "true");
    syncUrl();
    if (state.lastTriggerEl && typeof state.lastTriggerEl.focus === "function") {
      state.lastTriggerEl.focus({ preventScroll: true });
    }
  }

  /* ─── Pergunte ao Observatório ─── */

  const arrowUpSvg16 = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5"/></svg>`;
  const stopSquareSvg14 = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="2.5" y="2.5" width="9" height="9" rx="2"/></svg>`;
  const newConvSvg16 = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.5a1.6 1.6 0 0 1 2.2 2.2L6 12.4l-3 .7.7-3 7.8-7.6Z"/></svg>`;

  function defaultAaFontes() {
    const f = state.base?.fontesInfo?.aa;
    return f ? [{ nome: f.nome, url: f.url, coletado_em: f.coletadoEm }] : [];
  }

  // "O que dizem as outras fontes": cada modelo no nível mais alto que cada fonte mediu.
  // Todo número e toda frase vêm de motor.comparar_fontes.
  function renderFontesCompareHtml(r) {
    if (!r?.ok) return "";
    const nomes = r.modelos.map((m) => m.nome);
    const mede = (f) => (f.id === "aa" ? "acerto em tarefas difíceis (inteligência geral)" : f.mede || "");
    const cel = (f, v) => {
      if (v === null || v === undefined) return `<span class="missing-val">sem dado</span>`;
      if (typeof v === "object") return `<span class="num">${escHtml(motor.fmt.nota(Math.round(v.nota)).replace(/,0$/, ""))}</span>${v.posicao ? `<span class="fontes-cmp-pos">${v.posicao}º</span>` : ""}`;
      return `<span class="num">${escHtml(motor.fmt.nota(v))}</span>`;
    };
    const itens = r.fontes_comparadas.map((f) => {
      const ok = !f.faltam.length && f.linhas.length;
      const cab = nomes.map((n, i) => `<th scope="col"><span class="fontes-cmp-modelo">${escHtml(n)}</span>${f.esforcos[i] && f.esforcos[i] !== "single" ? renderEffortPill(f.esforcos[i]) : ""}</th>`).join("");
      const linhas = f.linhas.map((l) => `<tr><th scope="row">${escHtml(l.nome)}</th>${l.notas.map((v, i) => `<td class="${l.lider === nomes[i] ? "is-lead" : ""}">${cel(f, v)}</td>`).join("")}<td class="fontes-cmp-quem">${l.lider ? escHtml(l.lider) : l.empate ? "empate" : "—"}</td></tr>`).join("");
      const nota = f.id === "lmarena" ? `<p class="fontes-cmp-note">Nota do LMArena e posição entre todos os modelos. Quando as margens de erro se cruzam, conta como empate.</p>`
        : f.id === "aa" ? "" : `<p class="fontes-cmp-note">Só os testes que ${nomes.length === 2 ? "os dois fizeram" : "todos fizeram"}. Menos de 1 ponto de diferença é empate.</p>`;
      const corpo = ok
        ? `<div class="obs-table-scroll"><table class="fontes-cmp-table"><thead><tr><th scope="col"><span class="sr-only">${f.id === "lmarena" ? "Categoria" : "Teste"}</span></th>${cab}<th scope="col" class="fontes-cmp-quem">À frente</th></tr></thead><tbody>${linhas}</tbody></table></div>${nota}`
        : "";
      const res = `<span class="fontes-cmp-res${ok ? "" : " is-missing"}">${escHtml(f.resumo || "")}</span>`;
      const head = `<span class="fontes-cmp-src"><span class="fontes-cmp-nome">${escHtml(f.nome)}</span><span class="fontes-cmp-mede">${escHtml(mede(f))}</span></span>${res}`;
      return ok
        ? `<details class="fontes-cmp-item"><summary>${head}<span class="fontes-cmp-chev" aria-hidden="true"></span></summary><div class="fontes-cmp-body">${corpo}${renderSourceLineHtml(f.id, "intelligence")}</div></details>`
        : `<div class="fontes-cmp-item is-static"><div class="fontes-cmp-summary">${head}</div></div>`;
    }).join("");
    const extra = (r.resposta?.texto || []).filter((t) => /^Cada fonte mede/.test(t));
    return `
      <div class="fontes-cmp">
        <div class="fontes-cmp-list">${itens}</div>
        ${extra.length ? `<p class="fontes-cmp-note">${escHtml(extra[0])}</p>` : ""}
      </div>`;
  }

  const compareSources = { aa: "Artificial Analysis", lmarena: "LMArena", epoch: "Epoch AI" };

  function renderExternalCompareHtml(result, selectedCount) {
    const source = state.compareSource;
    const arena = source === "lmarena";
    const f = result?.fontes_comparadas.find((v) => v.id === source);
    const explanation = arena
      ? "Nota e posição a partir de votos em comparações de respostas às cegas."
      : "Resultados em testes de matemática, ciência, código e outras tarefas. Cada linha usa a escala do teste.";
    const intro = `<div class="compare-benchmark-intro">
      <p>${explanation}</p>
      <p><strong>Maior esforço medido pela fonte.</strong> A configuração usada em cada teste aparece abaixo do nome do modelo.</p>
    </div>`;
    const sourceLine = renderSourceLineHtml(source);
    if (selectedCount < 2) return intro + '<p class="compare-benchmark-empty">Escolha dois ou mais modelos diferentes para comparar nesta fonte.</p>' + sourceLine;
    if (!f?.linhas.length) return intro + '<p class="compare-benchmark-empty">A coleta desta fonte não traz resultados para os modelos selecionados.</p>' + sourceLine;
    const missing = f.faltam.length ? `<p class="compare-benchmark-note">Sem resultados na coleta para ${escHtml(f.faltam.join(", "))}.</p>` : "";
    const labels = { low: "Baixo", medium: "Médio", high: "Alto", xhigh: "Muito alto", max: "Máximo", single: "Nível único" };
    const cols = result.modelos.map((model, i) => `<th scope="col">
      <span class="benchmark-model">${renderLogo(model.empresa, false, 18)}${escHtml(model.nome)}</span>
      ${f.esforcos[i] ? `<span class="effort-pill">${escHtml(labels[f.esforcos[i]] || motor.fmt.esforco(f.esforcos[i]))}</span>`
        : '<small>Esforço não informado</small>'}
    </th>`).join("");
    const rows = f.linhas.map((row) => {
      const cells = row.notas.map((value, i) => {
        if (value === null) return '<td><span class="missing-val">Sem dado</span></td>';
        const leader = row.lider === result.modelos[i].nome;
        const score = motor.fmt.nota(arena ? Math.round(value.nota) : value).replace(/,0$/, "");
        const place = arena && value.posicao ? `<small>${value.posicao}º${value.total ? ` de ${value.total}` : ""}</small>` : "";
        const tie = row.empate?.includes(result.modelos[i].nome);
        return `<td class="${leader ? "is-lead" : ""}"><span class="num">${tie ? '<abbr title="Empate técnico">≈</abbr> ' : ""}${score}</span>${place}</td>`;
      }).join("");
      return `<tr><th scope="row">${escHtml(row.nome)}</th>${cells}</tr>`;
    }).join("");
    const note = arena ? "≈ indica que as margens de erro se sobrepõem."
      : "≈ indica menos de 1 ponto de diferença. Testes com mais modelos avaliados aparecem primeiro.";
    return `${intro}${missing}
      <div class="compare-benchmark-scroll" tabindex="0" role="region" aria-label="Resultados de ${compareSources[source]}">
        <table class="compare-benchmark-table" style="--benchmark-cols:${result.modelos.length}">
          <thead><tr><th scope="col">${arena ? "Categoria" : "Teste"}</th>${cols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="compare-benchmark-note">${note}</p>${sourceLine}`;
  }

  function cardTitleForBlock(bloco) {
    const tipo = bloco?.cartao || bloco?.tipo;
    if (tipo === "degrau") return "mudança de esforço";
    if (tipo === "comparacao") return "comparação completa";
    if (tipo === "placar") return "placar da área";
    if (tipo === "ranking") return "ranking da área";
    if (tipo === "time") return "divisão por plano";
    if (tipo === "painel_modelo") return "resumo do modelo";
    if (tipo === "outras_fontes") return "outras fontes (LMArena e Epoch AI)";
    if (tipo === "comparar_fontes") return "o que dizem as outras fontes";
    if (tipo === "abismo") return "maiores ganhos com esforço";
    return "mais dados";
  }

  function renderObsAvatarHtml(cls = "obs-msg-avatar") {
    return corujaUrl
      ? `<img class="${cls}" src="${escHtml(corujaUrl)}" alt="" width="24" height="22">`
      : `<span class="obs-msg-avatar-fallback" aria-hidden="true">O</span>`;
  }

  function renderObsCardHtml(bloco, { showAllTimeRows = false, msgId = null } = {}) {
    const tipo = bloco?.cartao || bloco?.tipo;
    const params = bloco?.params || {};
    if (tipo === "degrau") {
      const area = params.area || state.area;
      const d = motor.degrau(state.base, { modelo: params.modelo, de: params.de, para: params.para, area });
      return d.ok ? renderDegrauCardHtml(d, { compact: true, interactive: false }) : "";
    }
    if (tipo === "comparacao") {
      const comp = motor.comparar(state.base, { itens: params.itens, areas: params.areas || motor.AREA_KEYS });
      return comp.ok ? `<div class="obs-table-scroll">${renderCompareTableHtml(comp, { compact: true, highlightArea: state.area })}</div>` : "";
    }
    if (tipo === "placar") {
      const area = params.area || state.area;
      const p = motor.placar(state.base, { area, tolerancia: params.tolerancia ?? state.tol });
      if (!p.ok) return "";
      return `
        <div class="obs-mini-placar">
          <div class="obs-mini-card"><span class="obs-mini-card-lbl">Mais inteligente</span><span class="obs-mini-card-name">${escHtml(p.mais_inteligente.nome)} ${escHtml(motor.fmt.esforco(p.mais_inteligente.esforco))}</span><span class="obs-mini-card-val num">${escHtml(p.mais_inteligente.destaque)}</span></div>
          <div class="obs-mini-card"><span class="obs-mini-card-lbl">Mais barato</span><span class="obs-mini-card-name">${p.mais_barato ? `${escHtml(p.mais_barato.nome)} ${escHtml(motor.fmt.esforco(p.mais_barato.esforco))}` : "—"}</span><span class="obs-mini-card-val num">${p.mais_barato ? escHtml(p.mais_barato.destaque) : "sem dado"}</span></div>
          <div class="obs-mini-card"><span class="obs-mini-card-lbl">Mais rápido</span><span class="obs-mini-card-name">${p.mais_rapido ? `${escHtml(p.mais_rapido.nome)} ${escHtml(motor.fmt.esforco(p.mais_rapido.esforco))}` : "—"}</span><span class="obs-mini-card-val num">${p.mais_rapido ? escHtml(p.mais_rapido.destaque) : "sem dado"}</span></div>
        </div>
      `;
    }
    if (tipo === "ranking") {
      const area = params.area || state.area;
      const lim = Math.min(5, Number(params.limite) || 5);
      const r = motor.ranking(state.base, { area, perfil: params.perfil || null, ordenar: params.ordenar || "nota", limite: lim, filtros: params.filtros });
      if (!r.ok) return "";
      return `
        <div class="obs-table-scroll">
          <table class="obs-mini-table">
            <thead><tr><th>#</th><th>Modelo</th><th>${metricTip("nota", "Nota")}</th><th>${metricTip("custo", "Custo")}</th></tr></thead>
            <tbody>
              ${r.linhas.map((l) => `<tr><td class="num">${l.empate_com_anterior ? "≈" : ""}${l.posicao}</td><td>${escHtml(l.nome)} <span class="effort-pill">${escHtml(motor.fmt.esforco(l.esforco))}</span></td><td class="num">${motor.fmt.nota(l.nota)}</td><td class="num">${l.custo != null ? motor.fmt.custo(l.custo) : '<span class="missing-val">sem dado</span>'}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
    }
    if (tipo === "time") {
      const t = motor.montar_time(state.base, { planos: params.planos || [], extras: params.extras || [] });
      if (!t.ok) return `<p class="missing-val">${escHtml(t.erro)}</p>`;
      const visibleRows = showAllTimeRows ? t.papeis : t.papeis.slice(0, 4);
      const hasMore = !showAllTimeRows && t.papeis.length > 4;
      return `
        <div class="obs-table-scroll">
          <table class="obs-mini-table">
            <thead><tr><th>Tipo de tarefa</th><th>Para o difícil</th><th>Para o dia a dia</th></tr></thead>
            <tbody>
              ${visibleRows.map((p) => `
                <tr>
                  <td>${escHtml(p.nome)}</td>
                  <td>${p.melhor ? `${escHtml(p.melhor.quem)} <span class="num">(${motor.fmt.nota(p.melhor.nota)})</span>` : "—"}</td>
                  <td>${p.economico ? `${escHtml(p.economico.quem)} <span class="num">(${motor.fmt.custo(p.economico.custo)})</span>` : (p.melhor ? `<span class="missing-val">o mesmo</span>` : "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${hasMore ? `<button type="button" class="obs-inline-link" data-obs-expand-time="${escHtml(String(msgId ?? ""))}">Ver as ${t.papeis.length} tarefas</button>` : ""}
        ${t.novidades?.length ? `
          <div class="obs-novidades">
            <p>${escHtml(t.novidades.map((n) => n.nome).join(" e "))} ${t.novidades.length === 1 ? "é mais novo" : "são mais novos"} que a lista de planos (conferida em ${escHtml(motor.fmt.data(state.base.planos?.conferidoEm))}) e ${t.novidades.length === 1 ? "ficou" : "ficaram"} fora desta conta.</p>
            <button type="button" class="btn-pill" data-obs-incluir="${escHtml(JSON.stringify({ planos: params.planos || [], extras: [...(params.extras || []), ...t.novidades.map((n) => n.modelo)] }))}">Incluir na conta</button>
          </div>` : ""}
      `;
    }
    if (tipo === "painel_modelo") {
      const f = state.base.porId.get(params.modelo);
      if (!f) return "";
      const area = params.area || state.area;
      const v = (params.esforco && f.variantes.find((x) => x.esforco === params.esforco))
        || f.variantes.filter((x) => x.notas[area] != null).sort((a, b) => b.notas[area] - a.notas[area])[0]
        || f.variantes[0];
      if (!v) return "";
      const payload = JSON.stringify({ modelo: f.id, esforco: v.esforco });
      return `
        <div class="obs-mini-panel">
          <div class="obs-mini-panel-head">
            ${renderLogo(f.empresa)}
            <span class="obs-mini-panel-name">${escHtml(f.nome)}</span>
            ${renderEffortPill(v.esforco)}
          </div>
          <div class="obs-mini-panel-kpis">
            <div class="obs-mini-kpi"><span class="obs-mini-kpi-lbl">${metricTip("nota", "Nota")}</span><span class="obs-mini-kpi-val num">${v.notas[area] != null ? motor.fmt.nota(v.notas[area]) : "sem dado"}</span></div>
            <div class="obs-mini-kpi"><span class="obs-mini-kpi-lbl">${metricTip("custo", "Custo por tarefa")}</span><span class="obs-mini-kpi-val num">${v.custo != null ? motor.fmt.custo(v.custo) : "sem dado"}</span></div>
            <div class="obs-mini-kpi"><span class="obs-mini-kpi-lbl">${metricTip("tempo", "Tempo de resposta")}</span><span class="obs-mini-kpi-val num">${v.tempo != null ? motor.fmt.tempo(v.tempo) : "sem dado"}</span></div>
          </div>
          <button type="button" class="btn-pill" style="align-self:flex-start" data-obs-action="${escHtml(JSON.stringify({ estado: JSON.parse(payload) }))}">Ver o modelo inteiro</button>
        </div>
      `;
    }
    if (tipo === "comparar_fontes") {
      return renderFontesCompareHtml(motor.comparar_fontes(state.base, { itens: params.itens }));
    }
    if (tipo === "outras_fontes") {
      const o = motor.outras_fontes(state.base, { modelo: params.modelo });
      if (!o.ok) return "";
      const blocks = [];
      if (o.lmarena) {
        const g = o.lmarena.geral;
        const cats = (o.lmarena.categorias || []).filter((c) => c.posicao != null);
        blocks.push(`
          <div class="obs-other-block">
            <div class="obs-other-head">
              <span class="obs-other-title">LMArena</span>
              ${o.lmarena.esforco ? renderEffortPill(o.lmarena.esforco) : ""}
            </div>
            <div class="obs-other-main num">${g.posicao}º de ${g.total}</div>
            ${cats.length ? `<div class="obs-other-rows">${cats.map((c) => `<div class="obs-other-row"><span class="obs-other-row-lbl">${escHtml(c.categoria)}</span><span class="obs-other-row-val num">${c.posicao}º de ${c.total}</span></div>`).join("")}</div>` : ""}
          </div>
        `);
      }
      if (o.epoch) {
        const testes = (o.epoch.testes || []).slice(0, 4);
        blocks.push(`
          <div class="obs-other-block">
            <div class="obs-other-head">
              <span class="obs-other-title">Epoch AI</span>
              ${o.epoch.esforco ? renderEffortPill(o.epoch.esforco) : ""}
            </div>
            ${testes.length ? `<div class="obs-other-rows">${testes.map((t) => `<div class="obs-other-row"><span class="obs-other-row-lbl">${escHtml(t.nome)}</span><span class="obs-other-row-val num">${motor.fmt.nota(t.nota)}</span></div>`).join("")}</div>` : `<p class="missing-val">sem dado</p>`}
          </div>
        `);
      }
      if (!blocks.length) {
        return `<div class="obs-other-card"><p class="missing-val">${escHtml((o.frases || []).join(" ") || "Sem dados em outras fontes.")}</p></div>`;
      }
      return `<div class="obs-other-card">${blocks.join("")}</div>`;
    }
    if (tipo === "abismo") {
      const area = params.area || state.area;
      const ab = motor.abismo(state.base, { empresa: params.empresa || null, so_escada_completa: !!params.so_escada_completa, limite: 5, area });
      if (!ab.ok) return "";
      return `
        <div class="obs-abismo-card">
          ${ab.linhas.slice(0, 5).map((l) => `
            <div class="obs-abismo-row">
              <span><strong>${escHtml(l.nome)}</strong> <span class="missing-val">${escHtml(motor.fmt.esforco(l.de))} → ${escHtml(motor.fmt.esforco(l.para))}</span></span>
              <span class="obs-abismo-gain num">${escHtml(motor.fmt.pontos(l.ganho))}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    return "";
  }

  function renderObsFormHtml(key) {
    if (!key) return "";
    const multiModels = state.base.familias.filter((f) => f.variantes.filter((v) => v.notas[state.area] !== null).length >= 2);
    const allModels = state.base.familias;

    if (key === "esforco") {
      const defM = multiModels.find((f) => f.id === (state.obsForm.degModel || "claude-opus-5-5")) || multiModels[0];
      const dir = state.obsForm.degDir || "up";
      return `
        <div class="obs-form" data-obs-form="esforco">
          <div class="obs-form-line">
            <span>Estou usando o</span>
            <select data-form-role="deg-model" class="obs-select" aria-label="Modelo">${multiModels.map((f) => `<option value="${escHtml(f.id)}"${f.id === defM.id ? " selected" : ""}>${escHtml(f.nome)}</option>`).join("")}</select>
            <span>no nível</span>
            <select data-form-role="deg-effort" class="obs-select" aria-label="Nível de esforço"></select>
            <span>e quero</span>
            <select data-form-role="deg-dir" class="obs-select" aria-label="Direção">
              <option value="up"${dir === "up" ? " selected" : ""}>subir</option>
              <option value="down"${dir === "down" ? " selected" : ""}>descer</option>
            </select>
            <button type="button" class="obs-submit" data-form-role="deg-go">Ver resposta</button>
          </div>
        </div>
      `;
    }
    if (key === "comparar") {
      const m1Val = state.obsForm.cmpM1 || "gpt-6-1-sol";
      const m2Val = state.obsForm.cmpM2 || "gemini-4-hydrogen";
      const opts1 = allModels.map((f) => `<option value="${escHtml(f.id)}"${f.id === m1Val ? " selected" : ""}>${escHtml(f.nome)}</option>`).join("");
      const opts2 = allModels.map((f) => `<option value="${escHtml(f.id)}"${f.id === m2Val ? " selected" : ""}>${escHtml(f.nome)}</option>`).join("");
      return `
        <div class="obs-form" data-obs-form="comparar">
          <div class="obs-form-line">
            <span>Comparar</span>
            <select data-form-role="cmp-m1" class="obs-select" aria-label="Primeiro modelo">${opts1}</select>
            <select data-form-role="cmp-e1" class="obs-select" aria-label="Esforço do primeiro modelo"></select>
            <span>com</span>
            <select data-form-role="cmp-m2" class="obs-select" aria-label="Segundo modelo">${opts2}</select>
            <select data-form-role="cmp-e2" class="obs-select" aria-label="Esforço do segundo modelo"></select>
            <button type="button" class="obs-submit" data-form-role="cmp-go">Ver resposta</button>
          </div>
        </div>
      `;
    }
    if (key === "barato") {
      const areaVal = state.obsForm.barArea || state.area;
      const tolVal = Number(state.obsForm.barTol ?? 10);
      return `
        <div class="obs-form" data-obs-form="barato">
          <div class="obs-form-line">
            <span>Em</span>
            <select data-form-role="bar-area" class="obs-select" aria-label="Área">${motor.AREA_KEYS.map((k) => `<option value="${k}"${k === areaVal ? " selected" : ""}>${escHtml(motor.AREAS[k])}</option>`).join("")}</select>
            <span>, aceitando ficar até</span>
            <select data-form-role="bar-tol" class="obs-select" aria-label="Margem de pontos">
              ${[5, 10, 15].map((t) => `<option value="${t}"${t === tolVal ? " selected" : ""}>${t}</option>`).join("")}
            </select>
            <span>pontos abaixo do melhor</span>
            <button type="button" class="obs-submit" data-form-role="bar-go">Ver resposta</button>
          </div>
        </div>
      `;
    }
    if (key === "time") {
      const planos = state.base.planos?.planos || [];
      const checkedSet = new Set(state.obsForm.timePlanos || ["chatgpt-plus", "claude-pro"]);
      const byEmp = new Map();
      for (const p of planos) {
        if (!byEmp.has(p.empresa)) byEmp.set(p.empresa, []);
        byEmp.get(p.empresa).push(p);
      }
      const colsHtml = [...byEmp.entries()].map(([emp, list]) => `
        <div class="obs-plan-col">
          <span class="obs-plan-emp">${escHtml(emp)}</span>
          ${list.map((p) => `<label class="obs-plan-opt"><input type="checkbox" name="obs-plan" value="${escHtml(p.id)}"${checkedSet.has(p.id) ? " checked" : ""}><span>${escHtml(p.nome)}</span></label>`).join("")}
        </div>
      `).join("");
      return `
        <div class="obs-form" data-obs-form="time">
          <div class="obs-plans-grid">${colsHtml}</div>
          <div class="obs-plans-actions">
            <button type="button" class="obs-submit" data-form-role="time-go">Montar</button>
          </div>
        </div>
      `;
    }
    return "";
  }

  function renderObservatorioShellHtml() {
    return `
      <div class="obs-box" id="obs-box">
        <div class="obs-chat-head">
          <div class="obs-chat-head-id">
            ${corujaUrl ? `<img class="obs-owl" src="${escHtml(corujaUrl)}" alt="" width="24" height="22">` : ""}
            <h2 class="obs-chat-title" id="obs-heading">Pergunte ao Observatório</h2>
          </div>
          <button type="button" class="obs-new-conv-icon" id="obs-new-conv" aria-label="Nova conversa" title="Nova conversa" hidden>
            ${newConvSvg16}
          </button>
        </div>

        <p class="obs-empty-desc" id="obs-empty-desc">Pergunte sobre modelos, custo, esforço, seu plano ou quem lidera na Arena.</p>
        <div class="obs-chat-area" id="obs-chat-area" hidden>
          <div class="obs-chat-list" id="obs-chat-list"></div>
        </div>

        <div class="obs-composer" id="obs-composer">
          <div class="obs-composer-box" id="obs-composer-box">
            <div class="obs-input-wrap">
              <input type="text" class="obs-composer-input" id="obs-free-input" maxlength="${OBS_MAX_CHARS}" aria-label="Pergunte ao Observatório" aria-describedby="obs-suggestion-help">
              <span class="obs-input-suggestion" id="obs-input-suggestion" aria-hidden="true">${escHtml(OBS_SUGGESTIONS[0].pergunta)}</span>
            </div>
            <span class="sr-only" id="obs-suggestion-help">Com o campo vazio, pressione Tab ou ative Usar sugestão para preencher a pergunta.</span>
            <div class="obs-composer-right">
              <button type="button" class="obs-use-suggestion" id="obs-use-suggestion" aria-label="Usar sugestão" tabindex="-1">
                <kbd class="obs-suggestion-key">Tab</kbd><span class="obs-suggestion-touch">Usar</span>
              </button>
              <span class="obs-char-count num" id="obs-char-count" hidden>0 / ${OBS_MAX_CHARS}</span>
              <button type="button" class="obs-send-btn" id="obs-free-send" aria-label="Enviar pergunta" disabled>
                ${arrowUpSvg16}
              </button>
            </div>
          </div>
          <div class="obs-limit-box" id="obs-limit-box" hidden>
            <span>Esta conversa chegou ao limite.</span>
            <button type="button" class="obs-inline-link" id="obs-limit-reset">Começar nova conversa</button>
          </div>
          <p class="obs-composer-note" id="obs-composer-note"></p>
        </div>
      </div>
    `;
  }

  function buildActionFromApi(data) {
    if (!data?.apontar) return null;
    const b0 = Array.isArray(data.blocos) ? data.blocos[0] : null;
    const p = b0?.params || {};
    if (data.apontar === "painel.subir" || data.apontar === "painel.descer") {
      const modelo = p.modelo || data.memoria?.foco?.modelos?.[0];
      if (!modelo) return null;
      return { rotulo: "Ver o modelo inteiro", estado: { modelo, esforco: p.de || p.esforco || null }, apontar: data.apontar };
    }
    if (data.apontar === "comparar") {
      return { rotulo: "Abrir na comparação", estado: p.itens ? { comparar: p.itens } : {}, apontar: "comparar" };
    }
    if (data.apontar === "comparar.fontes" && Array.isArray(p.itens)) {
      // A comparação da página pede um esforço por modelo: entra o mais alto medido.
      const itens = p.itens.filter((id) => state.base.porId.has(id)).map((id) => ({ modelo: id, esforco: state.base.porId.get(id).variantes.at(-1).esforco }));
      return itens.length >= 2 ? { rotulo: "Ver os benchmarks no comparador", estado: { comparar: itens, fonte: "lmarena" }, apontar: "comparar" } : null;
    }
    if (String(data.apontar).startsWith("placar.")) {
      return { rotulo: "Ver no ranking", estado: { area: p.area || state.area, tol: p.tolerancia ?? state.tol }, apontar: data.apontar };
    }
    return null;
  }

  function pushObsMessage(msg) {
    state.obsMsgSeq += 1;
    const full = { id: state.obsMsgSeq, ...msg };
    state.obsMessages.push(full);
    return full;
  }

  function renderObsMessageHtml(msg) {
    if (msg.role === "user") {
      return `<div class="obs-msg-user" data-obs-msg-id="${msg.id}" data-obs-role="user">${escHtml(msg.text)}</div>`;
    }

    if (msg.kind === "form") {
      const intro = msg.formKey === "time"
        ? "Marque os planos que você assina para montar a divisão de tarefas:"
        : "Preencha os campos abaixo para ver a resposta calculada:";
      return `
        <div class="obs-msg-assistant" data-obs-msg-id="${msg.id}" data-obs-role="assistant">
          ${renderObsAvatarHtml()}
          <div class="obs-msg-body">
            <p class="obs-msg-p">${escHtml(intro)}</p>
            <div class="obs-msg-cards">${renderObsFormHtml(msg.formKey)}</div>
          </div>
        </div>
      `;
    }

    if (msg.kind === "error") {
      return `
        <div class="obs-msg-assistant" data-obs-msg-id="${msg.id}" data-obs-role="assistant">
          ${renderObsAvatarHtml()}
          <div class="obs-msg-body">
            <div class="obs-error-inline" role="alert">
              <p>${escHtml(msg.text)}</p>
              ${msg.retryQuestion ? `<button type="button" class="obs-inline-link" data-obs-retry="${msg.id}">Tentar de novo</button>` : ""}
            </div>
          </div>
        </div>
      `;
    }

    const textos = Array.isArray(msg.texto) ? msg.texto : (msg.texto ? [msg.texto] : []);
    const blocos = (Array.isArray(msg.blocos) ? msg.blocos : []).slice(0, 2);
    const renderedCards = blocos.map((b) => ({
      bloco: b,
      html: renderObsCardHtml(b, { showAllTimeRows: Boolean(msg.expandedTimeRows), msgId: msg.id })
    })).filter((c) => Boolean(c.html));

    const fontes = Array.isArray(msg.fontes) ? msg.fontes : [];
    const acao = msg.acao || null;
    const hasFoot = fontes.length > 0 || Boolean(acao);

    return `
      <div class="obs-msg-assistant" data-obs-msg-id="${msg.id}" data-obs-role="assistant">
        ${renderObsAvatarHtml()}
        <div class="obs-msg-body">
          ${(msg.titulo || textos.length) ? `
            <div class="obs-msg-text">
              ${msg.titulo ? `<p class="obs-msg-p"><strong>${escHtml(msg.titulo)}</strong></p>` : ""}
              ${textos.map((t) => `<p class="obs-msg-p">${escHtml(t)}</p>`).join("")}
            </div>
          ` : ""}
          ${msg.conferida === false ? `<p class="obs-unverified-note">A IA citou um número que não está nos dados; mostramos a explicação calculada pela página.</p>` : ""}
          ${renderedCards.length ? `
            <div class="obs-msg-cards">
              <div>${renderedCards[0].html}</div>
              ${renderedCards.length > 1 ? (
                msg.expandedSecondCard
                  ? `<div>${renderedCards[1].html}</div>`
                  : `<button type="button" class="obs-inline-link" data-obs-expand-card="${msg.id}">Ver também: ${escHtml(cardTitleForBlock(renderedCards[1].bloco))}</button>`
              ) : ""}
            </div>
          ` : ""}
          ${hasFoot ? `
            <div class="obs-msg-foot">
              ${fontes.length ? `
                <span class="obs-foot-sources">
                  ${fontes.map((f) => `<a class="obs-source-link" href="${escHtml(f.url || "#")}" target="_blank" rel="noopener">Fonte: ${escHtml(f.nome)}${f.coletado_em ? ` · ${escHtml(fmtBrDate(f.coletado_em))}` : ""} ↗</a>`).join(" ")}
                </span>
              ` : ""}
              ${acao ? `<button type="button" class="obs-inline-link" data-obs-action="${escHtml(JSON.stringify({ estado: acao.estado, apontar: acao.apontar }))}">${escHtml(acao.rotulo || "Abrir na página")}</button>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  function renderWaitingHtml() {
    return `
      <div class="obs-msg-assistant" id="obs-waiting-msg" data-obs-role="waiting" aria-live="polite">
        ${renderObsAvatarHtml()}
        <div class="obs-msg-body">
          <div class="obs-waiting-dots" aria-hidden="true">
            <span class="obs-waiting-dot"></span>
            <span class="obs-waiting-dot"></span>
            <span class="obs-waiting-dot"></span>
          </div>
          <p class="obs-waiting-msg">Buscando nos dados…</p>
        </div>
      </div>
    `;
  }

  function scrollChatArea(mode) {
    const area = $("obs-chat-area");
    if (!area || mode === "none") return;
    if (mode === "bottom") {
      area.scrollTop = area.scrollHeight;
      return;
    }
    if (mode === "last-assistant") {
      const list = $("obs-chat-list");
      const assistants = list ? list.querySelectorAll('[data-obs-role="assistant"]') : [];
      const target = assistants[assistants.length - 1];
      if (!target) return;
      const areaRect = area.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      area.scrollTop = Math.max(0, area.scrollTop + (targetRect.top - areaRect.top) - 6);
    }
  }

  function updateChatControls() {
    const newConvBtn = $("obs-new-conv");
    const composerBox = $("obs-composer-box");
    const limitBox = $("obs-limit-box");
    const noteEl = $("obs-composer-note");
    const sendBtn = $("obs-free-send");
    const input = $("obs-free-input");
    const atLimit = state.obsFreeTurns >= OBS_MAX_TURNS;
    const text = input?.value.trim() || "";
    const empty = !input?.value;
    // Sugestões só antes da primeira pergunta (voltam em "Nova conversa").
    // Sem o serviço (modo local), as sugestões são a única forma de perguntar.
    const inConversation = state.obsMessages.length > 0 || state.obsLoading;
    const showSuggestion = empty && (!hasEndpoint || !inConversation);

    $("obs-input-suggestion").hidden = !showSuggestion;
    $("obs-use-suggestion").hidden = !showSuggestion;

    if (newConvBtn) newConvBtn.hidden = state.obsMessages.length === 0;
    if (composerBox) composerBox.hidden = atLimit;
    if (limitBox) limitBox.hidden = !atLimit;
    if (noteEl) {
      noteEl.hidden = atLimit;
      if (!hasEndpoint) {
        noteEl.textContent = "Consulte quem lidera na Arena ou use uma das perguntas sugeridas.";
      } else if (state.obsFreeTurns >= 5 && !atLimit) {
        const left = OBS_MAX_TURNS - state.obsFreeTurns;
        noteEl.textContent = left === 1 ? "Resta 1 pergunta nesta conversa" : `Restam ${left} perguntas nesta conversa`;
      } else {
        noteEl.textContent = "As respostas usam IA para explicar os dados; os números vêm das fontes indicadas.";
      }
    }
    if (sendBtn) {
      if (state.obsLoading) {
        sendBtn.disabled = true;
        sendBtn.classList.add("is-loading");
        sendBtn.setAttribute("aria-label", "Consultando…");
        sendBtn.innerHTML = stopSquareSvg14;
      } else {
        sendBtn.disabled = !text;
        sendBtn.classList.remove("is-loading");
        sendBtn.setAttribute("aria-label", "Enviar pergunta");
        sendBtn.innerHTML = arrowUpSvg16;
      }
    }
  }

  function renderChat({ scroll = "none" } = {}) {
    const listEl = $("obs-chat-list");
    if (!listEl) return;

    const hasConversation = state.obsMessages.length > 0 || state.obsLoading;
    $("obs-empty-desc").hidden = hasConversation;
    $("obs-chat-area").hidden = !hasConversation;

    if (!hasConversation) {
      listEl.innerHTML = "";
      updateChatControls();
      return;
    }

    const prevTop = $("obs-chat-area")?.scrollTop ?? 0;
    listEl.innerHTML = state.obsMessages.map(renderObsMessageHtml).join("") + (state.obsLoading ? renderWaitingHtml() : "");
    listEl.querySelectorAll("[data-obs-form]").forEach((formEl) => {
      bindObsFormEvents(formEl.dataset.obsForm, formEl);
    });

    updateChatControls();
    if (scroll === "none") {
      const area = $("obs-chat-area");
      if (area) area.scrollTop = prevTop;
    } else {
      nextFrame(() => scrollChatArea(scroll));
    }
  }

  function resetFreeConversation() {
    obsRequest += 1;
    state.obsMemoria = null;
    state.obsMessages = [];
    state.obsFreeTurns = 0;
    state.obsLoading = false;
    state.obsQuestion = null;
    state.obsBlocks = [];
    syncUrl();
    renderChat({ scroll: "none" });
  }

  function openFormInChat(key) {
    if (!key) return;
    const label = OBS_QUESTIONS.find((q) => q.key === key)?.label || "";
    const last = state.obsMessages[state.obsMessages.length - 1];
    if (last?.kind === "form" && last.formKey === key) {
      scrollChatArea("last-assistant");
      return;
    }
    if (label) pushObsMessage({ role: "user", text: label });
    pushObsMessage({ role: "assistant", kind: "form", formKey: key });
    state.obsQuestion = key;
    syncUrl();
    emit("obs_question", key);
    renderChat({ scroll: "last-assistant" });
  }

  async function submitFreeQuestion(rawText) {
    const pergunta = String(rawText ?? "").trim().slice(0, OBS_MAX_CHARS);
    if (!pergunta || state.obsLoading || state.obsFreeTurns >= OBS_MAX_TURNS) return;
    const arena = categoriaArena(pergunta);
    const local = hasEndpoint || arena ? null : findObsSuggestion(pergunta);
    if (!hasEndpoint && !local && !arena) {
      pushObsMessage({ role: "user", text: pergunta });
      pushObsMessage({ role: "assistant", kind: "response", titulo: "A consulta aberta está indisponível neste momento.",
        texto: ["Experimente perguntar quem lidera em escrita criativa na Arena ou escolha uma pergunta sugerida."] });
      $("obs-free-input").value = "";
      renderChat({ scroll: "last-assistant" });
      return;
    }

    const input = $("obs-free-input");
    if (input) input.value = "";
    const counter = $("obs-char-count");
    if (counter) counter.hidden = true;
    if (local) {
      answerLocalSuggestion(local);
      return;
    }

    pushObsMessage({ role: "user", text: pergunta });
    state.obsLoading = true;
    renderChat({ scroll: "bottom" });
    emit("obs_free", "");
    const request = ++obsRequest;

    try {
      const res = arena ? null : await fetch(endereco, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, memoria: state.obsMemoria, idioma: "pt", aparelho: deviceId() })
      });
      if (destroyed || request !== obsRequest) return;
      const data = arena ? await consultarLiderArena(arena) : await res.json().catch(() => null);
      if (destroyed || request !== obsRequest) return;
      if (res?.status === 429) {
        state.obsLoading = false;
        pushObsMessage({
          role: "assistant",
          kind: "error",
          text: "Muitas perguntas seguidas. Tente de novo em um minuto.",
          retryQuestion: pergunta
        });
        renderChat({ scroll: "last-assistant" });
        return;
      }
      if ((res && !res.ok) || !data?.ok) {
        throw new Error(data?.erro || `HTTP ${res?.status}`);
      }
      state.obsLoading = false;
      state.obsFreeTurns += 1;
      state.obsMemoria = data.memoria ?? state.obsMemoria;
      pushObsMessage({
        role: "assistant",
        kind: "response",
        titulo: data.titulo || "",
        texto: Array.isArray(data.texto) ? data.texto : (data.texto ? [data.texto] : []),
        blocos: Array.isArray(data.blocos) ? data.blocos : [],
        fontes: Array.isArray(data.fontes) ? data.fontes : [],
        acao: buildActionFromApi(data),
        conferida: data.conferida !== false,
        expandedSecondCard: false,
        expandedTimeRows: false
      });
      renderChat({ scroll: "last-assistant" });
    } catch (_) {
      if (destroyed || request !== obsRequest) return;
      state.obsLoading = false;
      pushObsMessage({
        role: "assistant",
        kind: "error",
        text: "A IA do Observatório não respondeu agora. Você pode tentar de novo ou usar o plano guiado.",
        retryQuestion: pergunta
      });
      renderChat({ scroll: "last-assistant" });
    }
  }

  function setObsQuestion(key) {
    if (!key) {
      state.obsQuestion = null;
      syncUrl();
      return;
    }
    openFormInChat(key);
  }

  function answerLocalSuggestion({ key, pergunta, ferramenta, params }) {
    const result = motor.chamar(state.base, ferramenta, params);
    pushObsMessage({ role: "user", text: pergunta });
    if (result.ok) {
      const resposta = result.resposta || { titulo: result.frases[0], texto: result.frases.slice(1) };
      const bloco = { tipo: result.ver.cartao, params: result.ver.params };
      pushObsMessage({
        role: "assistant",
        ...resposta,
        blocos: [bloco],
        fontes: motor.fontesDe(state.base, ferramenta),
        acao: ferramenta === "comparar" ? buildActionFromApi({ apontar: "comparar", blocos: [bloco] }) : null
      });
    } else {
      pushObsMessage({ role: "assistant", kind: "error", text: result.erro });
    }
    emit("obs_question", key);
    renderChat({ scroll: "last-assistant" });
  }

  function bindObsShellEvents() {
    const input = $("obs-free-input");
    const placeholder = $("obs-input-suggestion");
    const useSuggestion = $("obs-use-suggestion");
    const counter = $("obs-char-count");
    let suggestionIndex = 0;

    const scheduleSuggestion = () => {
      later(() => {
        if (!placeholder.hidden && state.obsFreeTurns < OBS_MAX_TURNS) {
          suggestionIndex = (suggestionIndex + 1) % OBS_SUGGESTIONS.length;
          placeholder.textContent = OBS_SUGGESTIONS[suggestionIndex].pergunta;
          if (!prefersReducedMotion()) placeholder.animate?.([{ opacity: 0.35 }, { opacity: 1 }], 220);
        }
        scheduleSuggestion();
      }, OBS_SUGGESTION_INTERVAL);
    };
    const fillSuggestion = () => {
      if (input.value || $("obs-input-suggestion").hidden) return;
      input.focus({ preventScroll: true });
      input.value = OBS_SUGGESTIONS[suggestionIndex].pergunta;
      updateChatControls();
    };
    listen(useSuggestion, "click", fillSuggestion);
    updateChatControls();
    scheduleSuggestion();
    listen(input, "input", () => {
      if (counter) {
        const len = input.value.length;
        counter.hidden = len < 400;
        counter.textContent = `${len} / ${OBS_MAX_CHARS}`;
      }
      updateChatControls();
    });
    listen(input, "keydown", (e) => {
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !e.isComposing && !input.value && !placeholder.hidden) {
        e.preventDefault();
        fillSuggestion();
      } else if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        submitFreeQuestion(input.value);
      }
    });
    $("obs-free-send")?.addEventListener("click", () => {
      submitFreeQuestion(input?.value || "");
    });
    $("obs-new-conv")?.addEventListener("click", resetFreeConversation);
    $("obs-limit-reset")?.addEventListener("click", resetFreeConversation);

    const chatList = $("obs-chat-list");
    chatList?.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-obs-action]");
      if (actionBtn) {
        try {
          const payload = JSON.parse(actionBtn.dataset.obsAction);
          window.observatorio?.abrir(payload.estado || {});
          if (payload.apontar) window.observatorio?.apontar(payload.apontar);
        } catch (_) {}
        return;
      }
      const expandCardBtn = e.target.closest("[data-obs-expand-card]");
      if (expandCardBtn) {
        const msgId = Number(expandCardBtn.dataset.obsExpandCard);
        const msg = state.obsMessages.find((m) => m.id === msgId);
        if (msg) {
          msg.expandedSecondCard = true;
          renderChat({ scroll: "none" });
        }
        return;
      }
      const expandTimeBtn = e.target.closest("[data-obs-expand-time]");
      if (expandTimeBtn) {
        const msgId = Number(expandTimeBtn.dataset.obsExpandTime);
        const msg = state.obsMessages.find((m) => m.id === msgId);
        if (msg) {
          msg.expandedTimeRows = true;
          renderChat({ scroll: "none" });
        }
        return;
      }
      const retryBtn = e.target.closest("[data-obs-retry]");
      if (retryBtn) {
        const msgId = Number(retryBtn.dataset.obsRetry);
        const idx = state.obsMessages.findIndex((m) => m.id === msgId);
        if (idx !== -1) {
          const pergunta = state.obsMessages[idx].retryQuestion;
          state.obsMessages.splice(idx, 1);
          if (pergunta) submitFreeQuestion(pergunta);
        }
        return;
      }
      const explainBtn = e.target.closest(".step-explain-btn");
      if (explainBtn) {
        const footer = explainBtn.closest(".step-explain-footer");
        const explainWrap = footer?.querySelector(".step-explain-wrap");
        if (!explainWrap) return;
        const open = !explainWrap.classList.contains("is-open");
        explainWrap.classList.toggle("is-open", open);
        explainBtn.setAttribute("aria-expanded", String(open));
        const lbl = explainBtn.querySelector(".step-explain-lbl");
        if (lbl) lbl.textContent = open ? "Ocultar explicação" : "Ver explicação";
      }
    });
  }

  function bindObsFormEvents(key, scopeEl) {
    const q = (role) => scopeEl?.querySelector(`[data-form-role="${role}"]`);
    if (key === "esforco") {
      const mSel = q("deg-model");
      const eSel = q("deg-effort");
      const dSel = q("deg-dir");
      const goBtn = q("deg-go");
      if (!mSel || !eSel || !dSel || !goBtn) return;
      const syncEff = () => {
        const f = state.base.porId.get(mSel.value);
        const vs = f.variantes.filter((v) => v.notas[state.area] !== null);
        const choices = dSel.value === "up" ? vs.slice(0, -1) : vs.slice(1);
        const cur = state.obsForm.degEffort || "medium";
        const pref = choices.find((v) => v.esforco === cur)?.esforco
          || choices.find((v) => v.esforco === "medium")?.esforco
          || choices[0]?.esforco;
        eSel.innerHTML = choices.map((v) => `<option value="${escHtml(v.esforco)}"${v.esforco === pref ? " selected" : ""}>${escHtml(motor.fmt.esforco(v.esforco))}</option>`).join("");
        state.obsForm.degModel = mSel.value;
        state.obsForm.degDir = dSel.value;
        state.obsForm.degEffort = eSel.value;
      };
      syncEff();
      mSel.addEventListener("change", syncEff);
      dSel.addEventListener("change", syncEff);
      eSel.addEventListener("change", () => { state.obsForm.degEffort = eSel.value; });
      goBtn.addEventListener("click", () => {
        const f = state.base.porId.get(mSel.value);
        const vs = f.variantes.filter((v) => v.notas[state.area] !== null);
        const idx = vs.findIndex((v) => v.esforco === eSel.value);
        const dir = dSel.value;
        const target = dir === "up" ? vs[idx + 1] : vs[idx - 1];
        if (!target) return;
        const d = motor.degrau(state.base, { modelo: f.id, de: eSel.value, para: target.esforco, area: state.area });
        window.observatorio?.montar([
          { tipo: "resposta", params: d.resposta },
          { tipo: "degrau", params: { modelo: f.id, de: eSel.value, para: target.esforco, area: state.area } },
          { tipo: "acao", params: { rotulo: "Ver o modelo inteiro", estado: { modelo: f.id, esforco: eSel.value }, apontar: dir === "up" ? "painel.subir" : "painel.descer" } }
        ]);
      });
    }

    if (key === "comparar") {
      const m1 = q("cmp-m1"), e1 = q("cmp-e1");
      const m2 = q("cmp-m2"), e2 = q("cmp-e2");
      const goBtn = q("cmp-go");
      if (!m1 || !e1 || !m2 || !e2 || !goBtn) return;
      const fill = (mEl, eEl, defKey) => {
        const f = state.base.porId.get(mEl.value);
        const wanted = state.obsForm[defKey] || "high";
        const chosen = f.variantes.some((v) => v.esforco === wanted) ? wanted : (f.variantes.some((v) => v.esforco === "high") ? "high" : f.variantes[0]?.esforco);
        eEl.innerHTML = f.variantes.map((v) => `<option value="${escHtml(v.esforco)}"${v.esforco === chosen ? " selected" : ""}>${escHtml(motor.fmt.esforco(v.esforco))}</option>`).join("");
        state.obsForm[defKey] = eEl.value;
      };
      fill(m1, e1, "cmpE1");
      fill(m2, e2, "cmpE2");
      m1.addEventListener("change", () => { state.obsForm.cmpM1 = m1.value; fill(m1, e1, "cmpE1"); });
      m2.addEventListener("change", () => { state.obsForm.cmpM2 = m2.value; fill(m2, e2, "cmpE2"); });
      e1.addEventListener("change", () => { state.obsForm.cmpE1 = e1.value; });
      e2.addEventListener("change", () => { state.obsForm.cmpE2 = e2.value; });
      goBtn.addEventListener("click", () => {
        const itens = [{ modelo: m1.value, esforco: e1.value }, { modelo: m2.value, esforco: e2.value }];
        const c = motor.comparar(state.base, { itens, areas: motor.AREA_KEYS });
        window.observatorio?.montar([
          { tipo: "resposta", params: c.resposta },
          { tipo: "comparacao", params: { itens, areas: motor.AREA_KEYS } },
          { tipo: "acao", params: { rotulo: "Abrir na comparação", estado: { comparar: itens }, apontar: "comparar" } }
        ]);
      });
    }

    if (key === "barato") {
      const areaSel = q("bar-area");
      const tolSel = q("bar-tol");
      const goBtn = q("bar-go");
      if (!areaSel || !tolSel || !goBtn) return;
      areaSel.addEventListener("change", () => { state.obsForm.barArea = areaSel.value; });
      tolSel.addEventListener("change", () => { state.obsForm.barTol = Number(tolSel.value); });
      goBtn.addEventListener("click", () => {
        const a = areaSel.value;
        const selTol = Number(tolSel.value);
        const p = motor.placar(state.base, { area: a, tolerancia: selTol });
        window.observatorio?.montar([
          { tipo: "resposta", params: p.resposta },
          { tipo: "placar", params: { area: a, tolerancia: selTol } },
          { tipo: "acao", params: { rotulo: "Ver no ranking", estado: { area: a, tol: selTol }, apontar: "placar.barato" } }
        ]);
      });
    }

    if (key === "time") {
      const goBtn = q("time-go");
      if (!goBtn || !scopeEl) return;
      scopeEl.querySelectorAll('input[name="obs-plan"]').forEach((cb) => {
        cb.addEventListener("change", () => {
          state.obsForm.timePlanos = [...scopeEl.querySelectorAll('input[name="obs-plan"]:checked')].map((el) => el.value);
        });
      });
      goBtn.addEventListener("click", () => {
        const planos = [...scopeEl.querySelectorAll('input[name="obs-plan"]:checked')].map((el) => el.value);
        state.obsForm.timePlanos = planos;
        const t = motor.montar_time(state.base, { planos });
        if (!t.ok) {
          window.observatorio?.montar([{ tipo: "frase", params: { texto: t.erro } }]);
          return;
        }
        window.observatorio?.montar([
          { tipo: "resposta", params: t.resposta },
          { tipo: "time", params: { planos } }
        ]);
      });
    }
  }

  // "Incluir na conta": refaz o time com os modelos mais novos que a lista de planos ainda não cobre.
  const aoIncluirNovidades = (e) => {
    const btn = e.target.closest?.("[data-obs-incluir]");
    if (!btn || !raiz.contains(btn) || !state.base) return;
    try {
      const { planos, extras } = JSON.parse(btn.dataset.obsIncluir);
      const t = motor.montar_time(state.base, { planos, extras });
      if (!t.ok) return;
      window.observatorio?.montar([{ tipo: "resposta", params: t.resposta }, { tipo: "time", params: { planos, extras } }]);
      emit("time_incluir_novidades", extras.join(","));
    } catch (_) {}
  };
  raiz.addEventListener("click", aoIncluirNovidades);

  const observatorioApi = {
    abrir(estado = {}) {
      if (!state.base || destroyed) return;
      let areaChanged = false;
      if (estado.area && motor.AREA_KEYS.includes(estado.area) && estado.area !== state.area) {
        state.area = estado.area;
        areaChanged = true;
      }
      if (estado.tol != null && estado.tol !== "") {
        const t = Math.max(0, Math.min(25, Number(estado.tol)));
        if (!Number.isNaN(t)) {
          state.tol = t;
          state.limitarNota = true;
        }
      }
      if (estado.comparar) {
        state.compareSource = Object.hasOwn(compareSources, estado.fonte) ? estado.fonte : "aa";
        const list = Array.isArray(estado.comparar)
          ? estado.comparar
          : String(estado.comparar).split(",").map((s) => { const [m, e] = s.split(":"); return { modelo: m, esforco: e }; });
        const valid = list.filter((x) => state.base.porId.has(x.modelo)).slice(0, 4).map((x) => {
          const f = state.base.porId.get(x.modelo);
          const eff = f.variantes.some((v) => v.esforco === x.esforco) ? x.esforco : f.variantes[0].esforco;
          return { modelo: f.id, esforco: eff };
        });
        if (valid.length >= 2) state.compareItems = valid;
      }

      $$(".area-pill").forEach((b) => {
        const act = b.dataset.area === state.area;
        b.classList.toggle("is-active", act);
        b.setAttribute("aria-pressed", String(act));
      });
      if (areaChanged || estado.tol != null) renderRanking();
      renderCompareSection();

      const resolvedModel = estado.modelo ? resolveModelId(estado.modelo) : null;
      if (resolvedModel) {
        openDrawer(resolvedModel, estado.esforco || null, null);
      } else if (estado.modelo === null && state.drawerOpen) {
        closeDrawer();
      } else if (state.drawerOpen && areaChanged) {
        renderDrawerFull();
      }
      if (estado.comparar && !resolvedModel) {
        $("comparar-section")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
      syncUrl();
    },

    apontar(alvo) {
      if (destroyed) return;
      let el = null;
      if (String(alvo).startsWith("placar.")) {
        state.sortField = { "placar.barato": "custo", "placar.rapido": "tempo" }[alvo] || "nota";
        state.expandedRanking = false;
        state.rankingSelected = null;
        renderRanking();
        el = $("ranking-section");
      }
      else if (alvo === "comparar") el = $("comparar-section");
      else if (alvo === "painel.subir") el = raiz.querySelector('#model-drawer [data-step-dir="up"]');
      else if (alvo === "painel.descer") el = raiz.querySelector('#model-drawer [data-step-dir="down"]');
      else if (String(alvo).startsWith("ranking:")) {
        locateRankingModel(alvo.slice(8));
        return;
      }
      if (!el) return;
      $$(".obs-pointed").forEach((x) => x.classList.remove("obs-pointed"));
      cancelLater(state.pointTimer);
      el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      el.classList.add("obs-pointed");
      state.pointTimer = later(() => el.classList.remove("obs-pointed"), 2500);
    },

    montar(blocos = []) {
      if (destroyed) return;
      state.obsBlocks = blocos;
      if (!blocos.length) return;

      const respBloco = blocos.find((b) => b.tipo === "resposta" || b.tipo === "frase");
      const cardBlocos = blocos.filter((b) => ["degrau", "comparacao", "placar", "ranking", "time", "painel_modelo", "outras_fontes", "comparar_fontes", "abismo"].includes(b.cartao || b.tipo));
      const acaoBloco = blocos.find((b) => b.tipo === "acao");

      const titulo = respBloco?.tipo === "resposta" ? (respBloco.params?.titulo || "") : "";
      const texto = respBloco?.tipo === "resposta"
        ? (Array.isArray(respBloco.params?.texto) ? respBloco.params.texto : (respBloco.params?.texto ? [respBloco.params.texto] : []))
        : (respBloco?.tipo === "frase" ? [respBloco.params?.texto || ""] : []);
      const acao = acaoBloco
        ? {
            rotulo: acaoBloco.params?.rotulo || "Abrir na página",
            estado: acaoBloco.params?.estado || {},
            apontar: acaoBloco.params?.apontar || null
          }
        : null;

      pushObsMessage({
        role: "assistant",
        kind: "response",
        titulo,
        texto,
        blocos: cardBlocos,
        fontes: defaultAaFontes(),
        acao,
        conferida: true,
        expandedSecondCard: false,
        expandedTimeRows: false
      });
      renderChat({ scroll: "last-assistant" });
    }
  };

  window.observatorio = observatorioApi;
  // nome antigo
  window.coruja = observatorioApi;

  /* ─── App Shell & Events ─── */

  function renderApp() {
    const dataTxt = state.base.coletadoEm ? fmtDate(state.base.coletadoEm) : "";
    const ctxEl = $("hero-context");
    if (ctxEl) {
      ctxEl.textContent = dataTxt
        ? `${state.base.familias.length} modelos · dados da Artificial Analysis de ${dataTxt}`
        : `${state.base.familias.length} modelos`;
    }

    $("app-root").innerHTML = `
      <section class="obs-section" id="observatorio-section" aria-labelledby="obs-heading">
        ${renderObservatorioShellHtml()}
      </section>

      <section id="ranking-section" aria-labelledby="obs-ranking-heading">
        <div class="obs-ranking-intro">
          <h2 id="obs-ranking-heading">Top 10 de modelos</h2>
        </div>
        <nav class="area-strip" aria-label="Área do ranking">
          ${motor.AREA_KEYS.map((k) => `<button type="button" class="area-pill${k === state.area ? " is-active" : ""}" data-area="${k}" aria-pressed="${k === state.area}">${escHtml(motor.AREAS[k])}</button>`).join("")}
        </nav>
        <p class="area-ressalva" id="area-ressalva" hidden>Atenção: os testes de direito da Artificial Analysis usam exemplos sobretudo dos EUA e da Europa; não há confirmação de que meçam o direito brasileiro.</p>
        <div class="ranking-controls">
          <div class="guide-tabs" id="ranking-tabs" role="tablist" aria-label="Ordenação do ranking">
            ${Object.entries(rankingMetrics).map(([key, { label }]) => `<button type="button" role="tab" data-tab="${key}" id="ranking-tab-${key}" aria-controls="ranking-results">${label}</button>`).join("")}
          </div>
          <div class="ranking-search">
            <label for="ranking-query" class="sr-only">Buscar modelo no ranking</label>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
            <input id="ranking-query" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ranking-matches" autocomplete="off" placeholder="Buscar modelo no ranking">
            <div id="ranking-matches" class="ranking-matches" role="listbox" aria-label="Modelos encontrados" hidden></div>
            <span class="sr-only" id="ranking-search-status" role="status"></span>
          </div>
        </div>
        <div id="ranking-results" role="tabpanel" tabindex="0">
          <div class="ranking-meta"><p id="ranking-rule"></p><p id="ranking-status" role="status"></p></div>
          <div id="ranking-filter" class="ranking-filter" hidden>
            <label class="ranking-filter-label"><input type="checkbox" id="limit-ranking"> Aplicar nota mínima</label>
            <div class="tol-control" id="ranking-margin" hidden>
              <label for="tol-slider">Margem abaixo da melhor nota</label>
              <input type="range" class="tol-range" id="tol-slider" min="0" max="25" step="1" aria-describedby="tol-readout">
              <span class="tol-readout num" id="tol-readout"></span>
            </div>
          </div>
          <div class="ranking-card" id="ranking-card"></div>
          <p class="ranking-tie-note" id="ranking-tie-note">≈ indica empate técnico. A diferença para a posição acima é menor que 1 ponto.</p>
          <div id="ranking-source"></div>
        </div>
      </section>

      <section id="comparar-section" aria-labelledby="comparar-heading">
        <div class="section-head">
          <h2 id="comparar-heading">Comparar modelos</h2>
          <span class="section-sub">Selecione até quatro modelos e escolha a fonte.</span>
        </div>
        <div id="compare-root"></div>
      </section>

      <footer class="site-footer">
        <div class="site-footer-top">
          <p>Fonte: Artificial Analysis, Intelligence Index v5. O custo é a média da AA por tarefa do índice, não o custo da sua tarefa; o tempo é a resposta típica medida pela AA.</p>
          <span class="footer-curadoria">curadoria LAPIG/UFG</span>
        </div>
        <details class="about-data">
          <summary>Sobre os dados</summary>
          <div class="about-data-body">
            <ul class="about-data-list">
              ${["aa", "lmarena", "epoch"].map((id) => {
                const f = state.base.fontesInfo?.[id];
                if (!f) return "";
                return `<li><a href="${escHtml(f.url || "#")}" target="_blank" rel="noopener">${escHtml(f.nome)}</a>: ${escHtml(f.mede)} (${escHtml(fmtBrDate(f.coletadoEm))}).</li>`;
              }).join("")}
            </ul>
            <p>A Vals AI também foi consultada, mas seus números não aparecem aqui porque não há licença para republicá-los.</p>
            <p>Diferença menor que 1 ponto é empate. Quando uma fonte não mediu algo, a página mostra "sem dado".</p>
          </div>
        </details>
      </footer>
    `;

    bindAppEvents();
    bindObsShellEvents();
    renderRanking();
    renderCompareSection();
  }

  function bindAppEvents() {
    $$(".area-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.area === state.area) return;
        state.area = btn.dataset.area;
        state.expandedRanking = false;
        state.rankingSelected = null;
        $("ranking-query").value = "";
        $$(".area-pill").forEach((b) => {
          const act = b.dataset.area === state.area;
          b.classList.toggle("is-active", act);
          b.setAttribute("aria-pressed", String(act));
        });
        renderRanking({ animate: true });
        renderCompareSection();
        if (state.drawerOpen) renderDrawerFull();
        syncUrl();
        emit("area", state.area);
      });
    });

    bindRankingEvents();
  }

  function setupDrawersShell() {
    $("drawer-backdrop").addEventListener("click", closeDrawer);
    $("drawer-close").addEventListener("click", closeDrawer);

    listen(document, "keydown", (e) => {
      if (e.key === "Escape" && state.drawerOpen) {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key === "Tab" && state.drawerOpen) {
        const activeDrawer = $("model-drawer");
        const els = [...activeDrawer.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === activeDrawer)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function applyHashRoute() {
    if (destroyed) return;
    const raw = window.location.hash;
    if (raw && !raw.startsWith("#panorama/guia")) return;
    const h = parseHash();
    if (!h.comparar && !isDefaultCompare(state.compareItems)) {
      state.compareItems = DEFAULT_COMPARE.map((x) => ({ ...x }));
      renderCompareSection();
    }
    state.limitarNota = h.tol !== "off";
    state.tol = DEFAULT_RANKING_MARGIN;
    const resolvedModel = resolveModelId(h.modelo);
    window.observatorio?.abrir({
      area: h.area || "intelligence",
      tol: state.limitarNota ? h.tol : null,
      comparar: h.comparar || undefined,
      modelo: resolvedModel || null,
      esforco: h.esforco || undefined
    });
    renderRanking();
    const validKeys = ["esforco", "comparar", "barato", "time"];
    if (validKeys.includes(h.perguntar)) {
      setObsQuestion(h.perguntar);
      $("observatorio-section")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    } else if (h.perguntar === true) {
      if (state.obsQuestion) setObsQuestion(null);
      $("observatorio-section")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    } else if (state.obsQuestion) {
      setObsQuestion(null);
    }
  }

  setupDrawersShell();

  Promise.resolve().then(() => carregarDados()).then((dados) => {
    if (destroyed) return;
    const { modelos, fontes, planos, empresas } = dados || {};
    state.base = motor.carregar({ modelos, fontes, planos, perfis });
    state.empresas = empresas || {};
    computeMedians();
    setupMetricTooltip();
    renderApp();
    applyHashRoute();
    listen(window, "hashchange", applyHashRoute);
  }).catch((err) => {
    if (destroyed) return;
    const root = $("app-root");
    if (root) {
      root.innerHTML = `<div class="status-box">Não foi possível carregar os dados dos modelos (${escHtml(err?.message || "erro de rede")}).</div>`;
    }
  });

  return function desmontar() {
    destroyed = true;
    raiz.removeEventListener("click", aoIncluirNovidades);
    for (const fn of cleanups) fn();
    cleanups.length = 0;
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    for (const id of rafs) window.cancelAnimationFrame(id);
    rafs.clear();
    if (rankingObserver) {
      rankingObserver.disconnect();
      rankingObserver = null;
    }
    if (compareResizeObserver) {
      compareResizeObserver.disconnect();
      compareResizeObserver = null;
    }
    if (window.observatorio === observatorioApi) delete window.observatorio;
    if (window.coruja === observatorioApi) delete window.coruja;
    raiz.innerHTML = "";
  };
}
