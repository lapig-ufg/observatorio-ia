import * as motor from "../motor/motor.mjs";
import perfis from "../motor/perfis.json";

const OBS_MAX_TURNS = 8;
const OBS_MAX_CHARS = 500;
const OBS_EXAMPLES = [
  "Vale subir o Opus 5.5 de médio para alto?",
  "Sonnet ou GPT-6.1 Sol para programar?",
  "O que as pessoas acham do Gemini 4 Hydrogen para escrever?"
];

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
    tol: 10,
    sortField: "nota",
    sortDir: "desc",
    expandedRanking: false,
    compareItems: DEFAULT_COMPARE.map((x) => ({ ...x })),
    drawerOpen: false,
    drawerModelId: null,
    drawerEffort: null,
    areasOpen: false,
    obsQuestion: null,
    obsBlocks: [],
    obsForm: {},
    obsMemoria: null,
    obsHistory: [],
    obsActiveTurn: -1,
    obsLoading: false,
    obsError: null,
    lastTriggerEl: null,
    prevScoreboard: { int: null, cost: null, time: null },
    ladderPrevCoords: null,
    ladderGhostTimer: null,
    pointTimer: null
  };

  let rankingObserver = null;
  let compareResizeObserver = null;
  let lastCompareComp = null;
  let metricTipPinnedEl = null;

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
    if (state.tol !== 10) p.set("tol", String(state.tol));
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

  /* ─── Placar ─── */

  function animateValue(el, fromVal, toVal, formatter) {
    if (!el) return;
    if (prefersReducedMotion() || fromVal == null || toVal == null || fromVal === toVal) {
      el.textContent = formatter(toVal);
      return;
    }
    const start = performance.now();
    function frame(now) {
      if (destroyed) return;
      const t = Math.min(1, (now - start) / 250);
      const curr = fromVal + (toVal - fromVal) * (1 - Math.pow(1 - t, 3));
      el.textContent = formatter(curr);
      if (t < 1) nextFrame(frame);
      else el.textContent = formatter(toVal);
    }
    nextFrame(frame);
  }

  function renderScoreCardContent(cardEl, { eyebrow, item, bigText, otherText, tieText, unitText, variantChanged, animate }) {
    if (!item) {
      cardEl.innerHTML = `<div class="score-card-top"><span class="score-card-eyebrow">${escHtml(eyebrow)}</span></div><div class="score-card-body"><span class="missing-val">nenhum modelo com esse dado dentro da margem</span></div>`;
      cardEl.dataset.modelId = "";
      cardEl.dataset.effort = "";
      return;
    }
    cardEl.dataset.modelId = item.modelo;
    cardEl.dataset.effort = item.esforco;

    const tradeoffHtml = String(item.abre_mao || "")
      .split(" · ")
      .map((part) => `<span class="tradeoff-part">${escHtml(part)}</span>`)
      .join('<span aria-hidden="true"> · </span>');

    const existingBig = cardEl.querySelector(".score-big");
    if (!existingBig || variantChanged) {
      const fadeCls = (animate && variantChanged && !prefersReducedMotion()) ? " is-fading" : "";
      cardEl.innerHTML = `
        <div class="score-card-top">
          <span class="score-card-eyebrow">${escHtml(eyebrow)}</span>
          <svg class="score-card-arrow" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </div>
        <div class="score-card-body${fadeCls}">
          <div class="score-identity">
            ${renderLogo(item.empresa)}
            <span class="score-model-name">${escHtml(item.nome)}</span>
            ${renderEffortPill(item.esforco)}
          </div>
          <div class="score-big-row">
            <span class="score-big num">${escHtml(bigText)}</span>
            ${unitText ? `<span class="score-unit">${escHtml(unitText)}</span>` : ""}
          </div>
          <div class="score-other num">${escHtml(otherText)}</div>
          ${tieText ? `<div class="score-tie">${escHtml(tieText)}</div>` : ""}
          <div class="score-tradeoff num">${tradeoffHtml}</div>
        </div>
      `;
      if (fadeCls) {
        const body = cardEl.querySelector(".score-card-body");
        nextFrame(() => body && body.classList.remove("is-fading"));
      }
    } else {
      cardEl.querySelector(".score-big").textContent = bigText;
      cardEl.querySelector(".score-other").textContent = otherText;
      cardEl.querySelector(".score-tradeoff").innerHTML = tradeoffHtml;
      const tieEl = cardEl.querySelector(".score-tie");
      if (tieEl) tieEl.textContent = tieText || "";
    }
  }

  function updateScoreboard(animate = true) {
    const res = motor.placar(state.base, { area: state.area, tolerancia: state.tol });
    if (!res.ok) return;
    const ptWord = state.tol === 1 ? "ponto" : "pontos";
    $("tol-readout").textContent = `margem de ${state.tol} ${ptWord} · nota mínima ${motor.fmt.nota(res.piso)}`;
    $("scoreboard-rule").textContent = `Os cartões de preço e de rapidez só consideram modelos a até ${state.tol} ${ptWord} do melhor. Diferença menor que 1 ponto é empate.`;
    const srcEl = $("scoreboard-source");
    if (srcEl) srcEl.innerHTML = renderSourceLineHtml("aa", state.area);

    const cardInt = $("card-int");
    const cardCost = $("card-cost");
    const cardTime = $("card-time");
    const prev = state.prevScoreboard;

    const intItem = res.mais_inteligente ? { ...res.mais_inteligente, abre_mao: "o melhor nesta área" } : null;
    const costItem = res.mais_barato;
    const timeItem = res.mais_rapido;

    const intKey = intItem ? `${intItem.modelo}:${intItem.esforco}` : "";
    const costKey = costItem ? `${costItem.modelo}:${costItem.esforco}` : "";
    const timeKey = timeItem ? `${timeItem.modelo}:${timeItem.esforco}` : "";
    const tieStr = intItem?.empatados_com?.length ? `empatado com ${intItem.empatados_com.join(", ")}` : "";

    const intChanged = !prev.int || prev.int.key !== intKey;
    renderScoreCardContent(cardInt, {
      eyebrow: "Mais inteligente",
      item: intItem,
      bigText: intItem ? motor.fmt.nota(intItem.nota) : "sem dado",
      unitText: "pontos",
      otherText: intItem ? `${motor.fmt.custo(intItem.custo)} · ${motor.fmt.tempo(intItem.tempo)}` : "",
      tieText: tieStr,
      variantChanged: intChanged,
      animate
    });
    if (animate && intItem && prev.int?.val != null && (intChanged || prev.int.val !== intItem.nota)) {
      animateValue(cardInt.querySelector(".score-big"), prev.int.val, intItem.nota, motor.fmt.nota);
    }

    const costChanged = !prev.cost || prev.cost.key !== costKey;
    renderScoreCardContent(cardCost, {
      eyebrow: "Mais barato dentro da margem",
      item: costItem,
      bigText: costItem ? costItem.destaque : "sem dado",
      unitText: "",
      otherText: costItem ? `nota ${motor.fmt.nota(costItem.nota)} · ${motor.fmt.tempo(costItem.tempo)}` : "",
      tieText: "",
      variantChanged: costChanged,
      animate
    });
    if (animate && costItem && prev.cost?.val != null && costChanged) {
      animateValue(cardCost.querySelector(".score-big"), prev.cost.val, costItem.custo, motor.fmt.custo);
    }

    const timeChanged = !prev.time || prev.time.key !== timeKey;
    renderScoreCardContent(cardTime, {
      eyebrow: "Mais rápido dentro da margem",
      item: timeItem,
      bigText: timeItem ? timeItem.destaque : "sem dado",
      unitText: "",
      otherText: timeItem ? `nota ${motor.fmt.nota(timeItem.nota)} · ${motor.fmt.custo(timeItem.custo)}` : "",
      tieText: "",
      variantChanged: timeChanged,
      animate
    });
    if (animate && timeItem && prev.time?.val != null && timeChanged) {
      animateValue(cardTime.querySelector(".score-big"), prev.time.val, timeItem.tempo, motor.fmt.tempo);
    }

    state.prevScoreboard = {
      int: { key: intKey, val: intItem?.nota ?? null },
      cost: { key: costKey, val: costItem?.custo ?? null },
      time: { key: timeKey, val: timeItem?.tempo ?? null }
    };
  }

  /* ─── Ranking ─── */

  function getFullRankingRows() {
    const k = state.area;
    const field = state.sortField;
    const dir = state.sortDir;

    const isDefaultDir = (field === "nota" && dir === "desc") || (field !== "nota" && dir === "asc");
    const motorRes = isDefaultDir ? motor.ranking(state.base, { area: k, ordenar: field, limite: 10 }) : null;

    const linhas = state.base.familias.flatMap((f) => {
      const vs = f.variantes.filter((v) => v.notas[k] !== null);
      if (!vs.length) return [];
      let v;
      if (field === "nota") {
        v = vs.reduce((m, x) => (x.notas[k] > m.notas[k] || (x.notas[k] === m.notas[k] && (x.custo ?? Infinity) < (m.custo ?? Infinity)) ? x : m));
      } else {
        const ok = vs.filter((x) => x[field] !== null);
        if (!ok.length) return [];
        v = ok.reduce((m, x) => (dir === "asc" ? (x[field] < m[field] ? x : m) : (x[field] > m[field] ? x : m)));
      }
      return [{ f, v, s: v.notas[k] }];
    });

    if (field === "nota") {
      linhas.sort((x, y) => dir === "desc" ? (y.s - x.s || (x.v.custo ?? Infinity) - (y.v.custo ?? Infinity)) : (x.s - y.s || (x.v.custo ?? Infinity) - (y.v.custo ?? Infinity)));
    } else {
      linhas.sort((x, y) => dir === "asc" ? (x.v[field] - y.v[field] || y.s - x.s) : (y.v[field] - x.v[field] || y.s - x.s));
    }

    const allRows = linhas.map((x, i) => ({
      posicao: i + 1,
      modelo: x.f.id,
      nome: x.f.nome,
      empresa: x.f.empresa,
      esforco: x.v.esforco,
      nota: Math.round(x.s * 10) / 10,
      custo: x.v.custo != null ? Math.round(x.v.custo * 10000) / 10000 : null,
      tempo: x.v.tempo != null ? Math.round(x.v.tempo * 10) / 10 : null,
      empate_com_anterior: field === "nota" && dir === "desc" && i > 0 && linhas[i - 1].s - x.s < motor.EMPATE
    }));

    if (motorRes?.ok && motorRes.linhas.length) {
      for (let i = 0; i < motorRes.linhas.length; i++) allRows[i] = motorRes.linhas[i];
    }
    const maxScore = Math.max(...allRows.map((r) => r.nota ?? 0), 1);
    return { rows: allRows, maxScore };
  }

  const sortIndicator = (field) => state.sortField !== field ? "" : (state.sortDir === "asc" ? "↑" : "↓");

  function renderRankRow(r, maxScore, isLastVisible) {
    const scorePct = r.nota != null ? Math.max(0, Math.min(1, r.nota / maxScore)) : 0;
    const posHtml = `${r.empate_com_anterior ? '<span class="rank-pos-approx" title="Menos de 1 ponto abaixo do anterior">≈</span>' : ""}${r.posicao}`;
    return `
      <button type="button" class="rank-row${isLastVisible ? " is-last-visible" : ""}" data-model-id="${escHtml(r.modelo)}" data-effort="${escHtml(r.esforco)}">
        <span class="rank-pos num">${posHtml}</span>
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
            ? `<span class="score-track" aria-hidden="true"><span class="score-fill" style="--scale:${scorePct.toFixed(4)}"></span></span><span class="rank-score-val num">${motor.fmt.nota(r.nota)}</span>`
            : `<span class="missing-val">sem dado</span>`}
        </span>
        <span class="rank-num-cell cost-cell num">${r.custo != null ? motor.fmt.custo(r.custo) : '<span class="missing-val">sem dado</span>'}</span>
        <span class="rank-num-cell time-cell num">${r.tempo != null ? motor.fmt.tempo(r.tempo) : '<span class="missing-val">sem dado</span>'}</span>
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

    tracks.forEach((tr, idx) => {
      const fill = tr.querySelector(".score-fill");
      if (!fill) return;
      if (state.expandedRanking && idx >= 10) {
        fill.style.transitionDelay = `${Math.min((idx - 10) * 12, 240)}ms`;
        nextFrame(() => fill.classList.add("is-visible"));
      } else {
        rankingObserver.observe(tr);
      }
    });
  }

  function renderRanking() {
    const card = $("ranking-card");
    if (!card) return;
    const sub = $("ranking-area-sub");
    if (sub) sub.textContent = `${motor.AREAS[state.area]} · melhor nível de cada modelo`;

    const { rows, maxScore } = getFullRankingRows();
    const top10 = rows.slice(0, 10), rest = rows.slice(10);
    const sA = sortIndicator("nota"), cA = sortIndicator("custo"), tA = sortIndicator("tempo");

    card.innerHTML = `
      <div class="mobile-sort-bar">
        <span class="mobile-sort-label">Ordenar:</span>
        <button type="button" class="mobile-sort-chip${state.sortField === "nota" ? " is-active" : ""}" data-sort="nota">Nota ${sA}</button>
        <button type="button" class="mobile-sort-chip${state.sortField === "custo" ? " is-active" : ""}" data-sort="custo">Custo ${cA}</button>
        <button type="button" class="mobile-sort-chip${state.sortField === "tempo" ? " is-active" : ""}" data-sort="tempo">Tempo ${tA}</button>
      </div>
      <div class="ranking-head">
        <div style="text-align:right;padding-right:4px">#</div>
        <div>Modelo</div>
        <div><button type="button" class="sort-btn" data-sort="nota" aria-sort="${state.sortField === "nota" ? (state.sortDir === "desc" ? "descending" : "ascending") : "none"}">${metricTip("nota", "Nota")} <span aria-hidden="true">${sA}</span></button></div>
        <div><button type="button" class="sort-btn" data-sort="custo" aria-sort="${state.sortField === "custo" ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}">${metricTip("custo", "Custo")} <span aria-hidden="true">${cA}</span></button></div>
        <div><button type="button" class="sort-btn" data-sort="tempo" aria-sort="${state.sortField === "tempo" ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}">${metricTip("tempo", "Tempo")} <span aria-hidden="true">${tA}</span></button></div>
        <div></div>
      </div>
      <div id="ranking-top10">${top10.map((r, i) => renderRankRow(r, maxScore, (!state.expandedRanking || !rest.length) && i === top10.length - 1)).join("")}</div>
      ${rest.length ? `
        <div class="ranking-extra-wrap${state.expandedRanking ? " is-open" : ""}" id="ranking-extra-wrap">
          <div class="ranking-extra-inner" id="ranking-rest">${rest.map((r, i) => renderRankRow(r, maxScore, i === rest.length - 1)).join("")}</div>
        </div>
        <div class="ranking-footer">
          <button type="button" class="btn-pill" id="toggle-ranking-btn" aria-expanded="${state.expandedRanking}">
            ${state.expandedRanking ? "Mostrar só os 10 primeiros" : `Ver todos os ${rows.length} modelos`}
          </button>
        </div>
      ` : ""}
    `;
    const srcEl = $("ranking-source");
    if (srcEl) srcEl.innerHTML = renderSourceLineHtml("aa", state.area);
    observeRankingBars();
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
      <table class="${cls}" style="--cmp-cols:${cols.length}">
        <thead><tr><th>Área</th>${headCols}</tr></thead>
        <tbody>
          ${areaRows}
          <tr class="compare-row-sep"><td>${metricTip("custo", "Custo por tarefa")}</td>${costCells}</tr>
          <tr><td>${metricTip("tempo", "Tempo de resposta")}</td>${timeCells}</tr>
        </tbody>
      </table>
    `;
    return compact ? tableHtml : `<div class="compare-table-card">${tableHtml}</div>`;
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
            <select class="compare-effort-select" data-compare-select="${idx}" aria-label="Nível de esforço do modelo ${idx + 1}">${selectOptsHtml}</select>
            ${state.compareItems.length > 2 ? `<button type="button" class="compare-remove" data-compare-remove="${idx}" aria-label="Remover coluna ${idx + 1}">×</button>` : ""}
          </div>
          <div class="compare-efforts">${effortsHtml}</div>
        </div>
      `;
    }).join("");

    const addBtnHtml = state.compareItems.length < 4
      ? `<button type="button" class="compare-add-btn" id="compare-add-btn">+ adicionar</button>`
      : "";

    const comp = motor.comparar(state.base, { itens: state.compareItems, areas: motor.AREA_KEYS });
    lastCompareComp = comp;
    const respostaHtml = comp.ok && comp.resposta
      ? `<div class="compare-resposta-box">
          <div class="compare-resposta-head">${bulbIconSvg}<p class="compare-resposta-title">${escHtml(comp.resposta.titulo)}</p></div>
          <div class="compare-resposta-texts">${(comp.resposta.texto || []).map((t) => `<p class="compare-resposta-p">${escHtml(t)}</p>`).join("")}</div>
        </div>`
      : "";

    root.innerHTML = `
      <div class="compare-shell">
        <div class="compare-cols-bar">${colsHtml}${addBtnHtml}</div>
        ${respostaHtml}
        <div id="compare-result-wrap"></div>
        ${renderSourceLineHtml("aa", state.area)}
      </div>
    `;
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

  function renderObsCardHtml(bloco) {
    const tipo = bloco?.cartao || bloco?.tipo;
    const params = bloco?.params || {};
    if (tipo === "degrau") {
      const area = params.area || state.area;
      const d = motor.degrau(state.base, { modelo: params.modelo, de: params.de, para: params.para, area });
      return d.ok ? `${renderDegrauCardHtml(d, { compact: true, interactive: false })}${renderSourceLineHtml("aa", area)}` : "";
    }
    if (tipo === "comparacao") {
      const comp = motor.comparar(state.base, { itens: params.itens, areas: params.areas || motor.AREA_KEYS });
      return comp.ok ? `${renderCompareTableHtml(comp, { compact: true, highlightArea: state.area })}${renderSourceLineHtml("aa", state.area)}` : "";
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
        ${renderSourceLineHtml("aa", area)}
      `;
    }
    if (tipo === "ranking") {
      const area = params.area || state.area;
      const lim = Math.min(5, Number(params.limite) || 5);
      const r = motor.ranking(state.base, { area, perfil: params.perfil || null, ordenar: params.ordenar || "nota", limite: lim, filtros: params.filtros });
      if (!r.ok) return "";
      return `
        <table class="obs-mini-table">
          <thead><tr><th>#</th><th>Modelo</th><th>${metricTip("nota", "Nota")}</th><th>${metricTip("custo", "Custo")}</th></tr></thead>
          <tbody>
            ${r.linhas.map((l) => `<tr><td class="num">${l.empate_com_anterior ? "≈" : ""}${l.posicao}</td><td>${escHtml(l.nome)} <span class="effort-pill">${escHtml(motor.fmt.esforco(l.esforco))}</span></td><td class="num">${motor.fmt.nota(l.nota)}</td><td class="num">${l.custo != null ? motor.fmt.custo(l.custo) : '<span class="missing-val">sem dado</span>'}</td></tr>`).join("")}
          </tbody>
        </table>
        ${renderSourceLineHtml("aa", area, r.perfil)}
      `;
    }
    if (tipo === "time") {
      const t = motor.montar_time(state.base, { planos: params.planos || [], extras: params.extras || [] });
      if (!t.ok) return `<p class="missing-val">${escHtml(t.erro)}</p>`;
      return `
        <table class="obs-mini-table">
          <thead><tr><th>Tipo de tarefa</th><th>Para o difícil</th><th>Para o dia a dia</th></tr></thead>
          <tbody>
            ${t.papeis.map((p) => `
              <tr>
                <td>${escHtml(p.nome)}</td>
                <td>${p.melhor ? `${escHtml(p.melhor.quem)} <span class="num">(${motor.fmt.nota(p.melhor.nota)})</span>` : "—"}</td>
                <td>${p.economico ? `${escHtml(p.economico.quem)} <span class="num">(${motor.fmt.custo(p.economico.custo)})</span>` : (p.melhor ? `<span class="missing-val">o mesmo</span>` : "—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${t.novidades?.length ? `
          <div class="obs-novidades">
            <p>${escHtml(t.novidades.map((n) => n.nome).join(" e "))} ${t.novidades.length === 1 ? "é mais novo" : "são mais novos"} que a lista de planos (conferida em ${escHtml(motor.fmt.data(state.base.planos?.conferidoEm))}) e ${t.novidades.length === 1 ? "ficou" : "ficaram"} fora desta conta.</p>
            <button type="button" class="btn-pill" data-obs-incluir="${escHtml(JSON.stringify({ planos: params.planos || [], extras: [...(params.extras || []), ...t.novidades.map((n) => n.modelo)] }))}">Incluir na conta</button>
          </div>` : ""}
        ${renderSourceLineHtml("aa", "intelligence")}
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
        ${renderSourceLineHtml("aa", area)}
      `;
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
            ${renderSourceLineHtml("lmarena")}
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
            ${renderSourceLineHtml("epoch")}
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
        ${renderSourceLineHtml("aa", area)}
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
        <div class="obs-form" id="obs-f-esforco">
          <div class="obs-form-line">
            <span>Estou usando o</span>
            <select id="obs-deg-model" class="obs-select" aria-label="Modelo">${multiModels.map((f) => `<option value="${escHtml(f.id)}"${f.id === defM.id ? " selected" : ""}>${escHtml(f.nome)}</option>`).join("")}</select>
            <span>no nível</span>
            <select id="obs-deg-effort" class="obs-select" aria-label="Nível de esforço"></select>
            <span>e quero</span>
            <select id="obs-deg-dir" class="obs-select" aria-label="Direção">
              <option value="up"${dir === "up" ? " selected" : ""}>subir</option>
              <option value="down"${dir === "down" ? " selected" : ""}>descer</option>
            </select>
            <button type="button" class="obs-submit" id="obs-deg-go">Ver resposta</button>
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
        <div class="obs-form" id="obs-f-comparar">
          <div class="obs-form-line">
            <span>Comparar</span>
            <select id="obs-cmp-m1" class="obs-select" aria-label="Primeiro modelo">${opts1}</select>
            <select id="obs-cmp-e1" class="obs-select" aria-label="Esforço do primeiro modelo"></select>
            <span>com</span>
            <select id="obs-cmp-m2" class="obs-select" aria-label="Segundo modelo">${opts2}</select>
            <select id="obs-cmp-e2" class="obs-select" aria-label="Esforço do segundo modelo"></select>
            <button type="button" class="obs-submit" id="obs-cmp-go">Ver resposta</button>
          </div>
        </div>
      `;
    }
    if (key === "barato") {
      const areaVal = state.obsForm.barArea || state.area;
      const tolVal = Number(state.obsForm.barTol ?? 10);
      return `
        <div class="obs-form" id="obs-f-barato">
          <div class="obs-form-line">
            <span>Em</span>
            <select id="obs-bar-area" class="obs-select" aria-label="Área">${motor.AREA_KEYS.map((k) => `<option value="${k}"${k === areaVal ? " selected" : ""}>${escHtml(motor.AREAS[k])}</option>`).join("")}</select>
            <span>, aceitando ficar até</span>
            <select id="obs-bar-tol" class="obs-select" aria-label="Margem de pontos">
              ${[5, 10, 15].map((t) => `<option value="${t}"${t === tolVal ? " selected" : ""}>${t}</option>`).join("")}
            </select>
            <span>pontos abaixo do melhor</span>
            <button type="button" class="obs-submit" id="obs-bar-go">Ver resposta</button>
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
        <div class="obs-form" id="obs-f-time">
          <div class="obs-form-line"><span>Eu assino:</span></div>
          <div class="obs-plans-grid">${colsHtml}</div>
          <div class="obs-plans-actions">
            <button type="button" class="obs-submit" id="obs-time-go">Ver resposta</button>
          </div>
        </div>
      `;
    }
    return "";
  }

  function renderObservatorioShellHtml() {
    const owlHtml = corujaUrl
      ? `<img class="obs-owl" src="${escHtml(corujaUrl)}" alt="" width="28" height="25">`
      : "";
    return `
      <div class="obs-box" id="obs-box">
        <div class="obs-head">
          <div class="obs-head-id">
            ${owlHtml}
            <div>
              <h2 class="obs-title" id="obs-heading">Pergunte ao Observatório</h2>
              <p class="obs-sub">${hasEndpoint ? "Escreva sua pergunta ou escolha uma pronta abaixo." : "Escolha uma pergunta pronta abaixo."}</p>
            </div>
          </div>
          <button type="button" class="obs-close" id="obs-close-btn" aria-label="Fechar pergunta" hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>
          </button>
        </div>
        <div class="obs-free-wrap" id="obs-free-wrap"${hasEndpoint ? "" : " hidden"}>
          <div class="obs-free-row" id="obs-free-row">
            <textarea class="obs-free-input" id="obs-free-input" rows="1" maxlength="${OBS_MAX_CHARS}" placeholder="Escreva sua pergunta sobre modelos, esforço, custo…" aria-label="Pergunta livre ao Observatório"></textarea>
            <button type="button" class="obs-free-send" id="obs-free-send">Enviar →</button>
          </div>
          <div class="obs-limit-box" id="obs-limit-box" hidden>
            <span>Esta conversa chegou ao limite.</span>
            <button type="button" class="obs-new-conv" id="obs-limit-reset">Começar nova conversa</button>
          </div>
          <div class="obs-free-meta">
            <div class="obs-examples">
              <span>Exemplos:</span>
              ${OBS_EXAMPLES.map((ex) => `<button type="button" class="obs-example-link" data-obs-example="${escHtml(ex)}">${escHtml(ex)}</button>`).join("")}
            </div>
            <div class="obs-free-tools">
              <span class="obs-char-count num" id="obs-char-count" hidden>0 / ${OBS_MAX_CHARS}</span>
              <button type="button" class="obs-new-conv" id="obs-new-conv" hidden>Nova conversa</button>
            </div>
          </div>
        </div>
        <p class="obs-ready-label"${hasEndpoint ? "" : " hidden"}>Ou escolha uma pergunta pronta:</p>
        <div class="obs-pills-wrap">
          <div class="obs-pills" id="obs-pills">
            ${OBS_QUESTIONS.map((q) => `<button type="button" class="obs-pill" data-obs-q="${q.key}" aria-expanded="false">${escHtml(q.label)}</button>`).join("")}
          </div>
        </div>
        <div class="obs-expand" id="obs-expand">
          <div class="obs-expand-inner">
            <div class="obs-body" id="obs-body">
              <div id="obs-form-wrap"></div>
              <div class="obs-resp" id="obs-response"></div>
            </div>
          </div>
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
    if (String(data.apontar).startsWith("placar.")) {
      return { rotulo: "Ver no placar", estado: { area: p.area || state.area, tol: p.tolerancia ?? state.tol }, apontar: data.apontar };
    }
    return null;
  }

  function renderObsTurnHtml(turn) {
    const { pergunta, data } = turn;
    const textos = Array.isArray(data.texto) ? data.texto : (data.texto ? [data.texto] : []);
    const fontes = Array.isArray(data.fontes) ? data.fontes : [];
    const acao = buildActionFromApi(data);
    const blocos = (Array.isArray(data.blocos) ? data.blocos : []).slice(0, 2);
    const renderedCards = blocos.map((b) => renderObsCardHtml(b)).filter(Boolean);
    const isWide = blocos.some((b) => (b?.cartao || b?.tipo) === "time") || !renderedCards.length;

    return `
      <p class="obs-you-asked">Você perguntou: ${escHtml(pergunta)}</p>
      <div class="obs-resp-grid${isWide ? " is-wide" : ""}">
        <div class="obs-resp-left">
          ${data.titulo ? `<h3 class="obs-resp-title">${escHtml(data.titulo)}</h3>` : ""}
          ${textos.length ? `<div class="obs-resp-text">${textos.map((t) => `<p class="obs-resp-p">${escHtml(t)}</p>`).join("")}</div>` : ""}
          ${data.conferida === false ? `<p class="obs-unverified-note">A IA citou um número que não está nos dados; mostramos a explicação calculada pela página.</p>` : ""}
          ${fontes.length ? `
            <div class="obs-source-pills">
              ${fontes.map((f) => `<a class="obs-source-pill" href="${escHtml(f.url || "#")}" target="_blank" rel="noopener">${escHtml(f.nome)}${f.coletado_em ? ` · ${escHtml(fmtBrDate(f.coletado_em))}` : ""} ↗</a>`).join("")}
            </div>
          ` : ""}
          ${acao ? `<button type="button" class="btn-pill obs-resp-action" data-obs-action="${escHtml(JSON.stringify({ estado: acao.estado, apontar: acao.apontar }))}">${escHtml(acao.rotulo)}</button>` : ""}
        </div>
        ${renderedCards.length ? `<div class="obs-resp-right">${renderedCards.map((c) => `<div>${c}</div>`).join("")}</div>` : ""}
      </div>
    `;
  }

  function bindObsResponseActions(wrap) {
    wrap.querySelectorAll("[data-obs-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          const payload = JSON.parse(btn.dataset.obsAction);
          window.observatorio?.abrir(payload.estado || {});
          if (payload.apontar) window.observatorio?.apontar(payload.apontar);
        } catch (_) {}
      });
    });
    wrap.querySelectorAll("[data-obs-turn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.obsActiveTurn = Number(btn.dataset.obsTurn);
        renderFreeConversation();
      });
    });
  }

  function renderFreeConversation() {
    const wrap = $("obs-response");
    const expand = $("obs-expand");
    const closeBtn = $("obs-close-btn");
    if (!wrap) return;

    if (expand && !expand.classList.contains("is-open")) {
      nextFrame(() => expand.classList.add("is-open"));
    }
    if (closeBtn) closeBtn.hidden = false;

    const visibleStart = Math.max(0, state.obsHistory.length - 3);
    const visible = state.obsHistory.slice(visibleStart);

    let html = "";
    if (visible.length) {
      html += `<div class="obs-history">`;
      visible.forEach((turn, i) => {
        const absIdx = visibleStart + i;
        if (absIdx === state.obsActiveTurn && !state.obsLoading) {
          html += renderObsTurnHtml(turn);
        } else {
          html += `
            <button type="button" class="obs-turn-collapsed" data-obs-turn="${absIdx}">
              <span class="obs-you-asked">Você perguntou: ${escHtml(turn.pergunta)}</span>
              <span class="obs-turn-collapsed-title">${escHtml(turn.data.titulo || "")}</span>
            </button>
          `;
        }
      });
      html += `</div>`;
    }

    if (state.obsLoading) {
      html += `
        <div class="obs-skeleton" aria-live="polite">
          <div class="obs-skeleton-line w-60"></div>
          <div class="obs-skeleton-line w-90"></div>
          <div class="obs-skeleton-line w-75"></div>
          <p class="obs-skeleton-msg">Buscando nos dados da Artificial Analysis…</p>
        </div>
      `;
    }

    if (state.obsError) {
      html += `<div class="obs-error-box" role="alert">${escHtml(state.obsError)}</div>`;
    }

    if (state.obsHistory.length || state.obsLoading) {
      html += `<p class="obs-foot-note">As respostas usam IA para escolher e explicar os dados; os números são calculados pela página a partir das fontes indicadas.</p>`;
    }

    wrap.innerHTML = html;
    bindObsResponseActions(wrap);
  }

  function updateFreeUiState() {
    const row = $("obs-free-row");
    const limitBox = $("obs-limit-box");
    const newConvBtn = $("obs-new-conv");
    const sendBtn = $("obs-free-send");
    const atLimit = state.obsHistory.length >= OBS_MAX_TURNS;

    if (row) row.hidden = atLimit;
    if (limitBox) limitBox.hidden = !atLimit;
    if (newConvBtn) newConvBtn.hidden = state.obsHistory.length === 0 || atLimit;
    if (sendBtn) {
      sendBtn.disabled = state.obsLoading;
      sendBtn.innerHTML = state.obsLoading
        ? `Consultando<span class="obs-dots" aria-hidden="true"><span class="obs-dot">.</span><span class="obs-dot">.</span><span class="obs-dot">.</span></span>`
        : "Enviar →";
    }
  }

  function resetFreeConversation() {
    state.obsMemoria = null;
    state.obsHistory = [];
    state.obsActiveTurn = -1;
    state.obsError = null;
    state.obsLoading = false;
    updateFreeUiState();
    if (!state.obsQuestion) {
      const resp = $("obs-response");
      if (resp) resp.innerHTML = "";
      $("obs-expand")?.classList.remove("is-open");
      const closeBtn = $("obs-close-btn");
      if (closeBtn) closeBtn.hidden = true;
    }
  }

  async function submitFreeQuestion(rawText) {
    if (!hasEndpoint) return;
    const pergunta = String(rawText ?? "").trim().slice(0, OBS_MAX_CHARS);
    if (!pergunta || state.obsLoading || state.obsHistory.length >= OBS_MAX_TURNS) return;

    if (state.obsQuestion) {
      state.obsQuestion = null;
      $$("#obs-pills .obs-pill").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-expanded", "false");
      });
      const fw = $("obs-form-wrap");
      if (fw) fw.innerHTML = "";
      syncUrl();
    }

    state.obsLoading = true;
    state.obsError = null;
    updateFreeUiState();
    renderFreeConversation();
    emit("obs_free", "");

    try {
      const res = await fetch(endereco, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, memoria: state.obsMemoria, idioma: "pt", aparelho: deviceId() })
      });
      if (destroyed) return;
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (destroyed) return;
      if (res.status === 429) {
        state.obsLoading = false;
        state.obsError = "Muitas perguntas seguidas. Tente de novo em um minuto.";
        updateFreeUiState();
        renderFreeConversation();
        return;
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.erro || `HTTP ${res.status}`);
      }
      state.obsLoading = false;
      state.obsMemoria = data.memoria ?? null;
      state.obsHistory.push({ pergunta, data });
      state.obsActiveTurn = state.obsHistory.length - 1;
      const input = $("obs-free-input");
      if (input) {
        input.value = "";
        input.style.height = "auto";
      }
      const counter = $("obs-char-count");
      if (counter) counter.hidden = true;
      updateFreeUiState();
      renderFreeConversation();
    } catch (_) {
      if (destroyed) return;
      state.obsLoading = false;
      state.obsError = "A IA do Observatório não respondeu agora. As perguntas prontas abaixo funcionam sem ela.";
      updateFreeUiState();
      renderFreeConversation();
    }
  }

  function setObsQuestion(key, { keepBlocks = false } = {}) {
    const expand = $("obs-expand");
    const closeBtn = $("obs-close-btn");
    const formWrap = $("obs-form-wrap");
    const respEl = $("obs-response");
    if (!expand || !formWrap || !respEl) return;

    state.obsQuestion = key;
    $$("#obs-pills .obs-pill").forEach((btn) => {
      const act = btn.dataset.obsQ === key;
      btn.classList.toggle("is-active", act);
      btn.setAttribute("aria-expanded", String(act));
    });

    if (!key) {
      expand.classList.remove("is-open");
      if (closeBtn) closeBtn.hidden = true;
      state.obsBlocks = [];
      respEl.innerHTML = "";
      formWrap.innerHTML = "";
      syncUrl();
      return;
    }

    if (closeBtn) closeBtn.hidden = false;
    formWrap.innerHTML = renderObsFormHtml(key);
    if (!keepBlocks) {
      state.obsBlocks = [];
      respEl.innerHTML = "";
    }
    bindObsFormEvents(key);
    nextFrame(() => expand.classList.add("is-open"));
    syncUrl();
    emit("obs_question", key);
  }

  function bindObsShellEvents() {
    $$("#obs-pills .obs-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.obsQ;
        setObsQuestion(state.obsQuestion === k ? null : k);
      });
    });
    $("obs-close-btn")?.addEventListener("click", () => {
      setObsQuestion(null);
    });

    const input = $("obs-free-input");
    const counter = $("obs-char-count");
    const syncInputSize = () => {
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${Math.min(84, input.scrollHeight)}px`;
      if (counter) {
        const len = input.value.length;
        counter.hidden = len < 400;
        counter.textContent = `${len} / ${OBS_MAX_CHARS}`;
      }
    };
    input?.addEventListener("input", syncInputSize);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitFreeQuestion(input.value);
      }
    });
    $("obs-free-send")?.addEventListener("click", () => {
      submitFreeQuestion(input?.value || "");
    });
    $$("[data-obs-example]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ex = btn.dataset.obsExample || "";
        if (input) {
          input.value = ex;
          syncInputSize();
        }
        submitFreeQuestion(ex);
      });
    });
    $("obs-new-conv")?.addEventListener("click", resetFreeConversation);
    $("obs-limit-reset")?.addEventListener("click", resetFreeConversation);
  }

  function bindObsFormEvents(key) {
    if (key === "esforco") {
      const mSel = $("obs-deg-model");
      const eSel = $("obs-deg-effort");
      const dSel = $("obs-deg-dir");
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
      $("obs-deg-go").addEventListener("click", () => {
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
      const m1 = $("obs-cmp-m1"), e1 = $("obs-cmp-e1");
      const m2 = $("obs-cmp-m2"), e2 = $("obs-cmp-e2");
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
      $("obs-cmp-go").addEventListener("click", () => {
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
      const areaSel = $("obs-bar-area");
      const tolSel = $("obs-bar-tol");
      areaSel.addEventListener("change", () => { state.obsForm.barArea = areaSel.value; });
      tolSel.addEventListener("change", () => { state.obsForm.barTol = Number(tolSel.value); });
      $("obs-bar-go").addEventListener("click", () => {
        const a = areaSel.value;
        const selTol = Number(tolSel.value);
        const p = motor.placar(state.base, { area: a, tolerancia: selTol });
        window.observatorio?.montar([
          { tipo: "resposta", params: p.resposta },
          { tipo: "placar", params: { area: a, tolerancia: selTol } },
          { tipo: "acao", params: { rotulo: "Ver no placar", estado: { area: a, tol: selTol }, apontar: "placar.barato" } }
        ]);
      });
    }

    if (key === "time") {
      $$('input[name="obs-plan"]').forEach((cb) => {
        cb.addEventListener("change", () => {
          state.obsForm.timePlanos = [...$$('input[name="obs-plan"]:checked')].map((el) => el.value);
        });
      });
      $("obs-time-go").addEventListener("click", () => {
        const planos = [...$$('input[name="obs-plan"]:checked')].map((el) => el.value);
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
        if (!Number.isNaN(t)) state.tol = t;
      }
      if (estado.comparar) {
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
      const slider = $("tol-slider");
      if (slider) slider.value = String(state.tol);

      updateScoreboard(true);
      if (areaChanged) renderRanking();
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
      if (alvo === "placar.inteligente") el = $("card-int");
      else if (alvo === "placar.barato") el = $("card-cost");
      else if (alvo === "placar.rapido") el = $("card-time");
      else if (alvo === "comparar") el = $("comparar-section");
      else if (alvo === "painel.subir") el = raiz.querySelector('#model-drawer [data-step-dir="up"]');
      else if (alvo === "painel.descer") el = raiz.querySelector('#model-drawer [data-step-dir="down"]');
      else if (String(alvo).startsWith("ranking:")) {
        const id = alvo.slice(8);
        el = raiz.querySelector(`#ranking-card .rank-row[data-model-id="${CSS.escape(id)}"]`);
        if (el && el.closest(".ranking-extra-wrap") && !state.expandedRanking) {
          state.expandedRanking = true;
          $("ranking-extra-wrap")?.classList.add("is-open");
        }
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
      const expand = $("obs-expand");
      const closeBtn = $("obs-close-btn");
      const wrap = $("obs-response");
      if (!wrap) return;
      if (expand && !expand.classList.contains("is-open")) {
        nextFrame(() => expand.classList.add("is-open"));
      }
      if (closeBtn) closeBtn.hidden = false;

      const respBloco = blocos.find((b) => b.tipo === "resposta" || b.tipo === "frase");
      const cardBloco = blocos.find((b) => ["degrau", "comparacao", "placar", "ranking", "time"].includes(b.tipo));
      const acaoBloco = blocos.find((b) => b.tipo === "acao");

      const buildHtml = () => {
        if (!blocos.length) return "";
        let leftHtml = "";
        if (respBloco?.tipo === "resposta") {
          const titulo = respBloco.params?.titulo || "";
          const textos = Array.isArray(respBloco.params?.texto) ? respBloco.params.texto : (respBloco.params?.texto ? [respBloco.params.texto] : []);
          leftHtml += titulo ? `<h3 class="obs-resp-title obs-anim">${escHtml(titulo)}</h3>` : "";
          leftHtml += textos.length ? `<div class="obs-resp-text obs-anim">${textos.map((t) => `<p class="obs-resp-p">${escHtml(t)}</p>`).join("")}</div>` : "";
        } else if (respBloco?.tipo === "frase") {
          leftHtml += `<p class="obs-resp-p obs-anim">${escHtml(respBloco.params?.texto || "")}</p>`;
        }
        if (acaoBloco) {
          const payload = { estado: acaoBloco.params?.estado || {}, apontar: acaoBloco.params?.apontar || null };
          leftHtml += `<button type="button" class="btn-pill obs-resp-action obs-anim" data-obs-action="${escHtml(JSON.stringify(payload))}">${escHtml(acaoBloco.params?.rotulo || "Abrir na página")}</button>`;
        }

        const cardHtml = cardBloco ? renderObsCardHtml(cardBloco) : "";
        const isWide = (cardBloco?.cartao || cardBloco?.tipo) === "time";

        return `
          <div class="obs-resp-grid${isWide || !cardHtml ? " is-wide" : ""}">
            <div class="obs-resp-left">${leftHtml}</div>
            ${cardHtml ? `<div class="obs-resp-right obs-anim">${cardHtml}</div>` : ""}
          </div>
          <p class="obs-foot-note">As respostas usam IA para escolher e explicar os dados; os números são calculados pela página a partir das fontes indicadas.</p>
        `;
      };

      const bindAndReveal = () => {
        wrap.innerHTML = buildHtml();
        wrap.querySelectorAll("[data-obs-action]").forEach((btn) => {
          btn.addEventListener("click", () => {
            try {
              const payload = JSON.parse(btn.dataset.obsAction);
              window.observatorio?.abrir(payload.estado || {});
              if (payload.apontar) window.observatorio?.apontar(payload.apontar);
            } catch (_) {}
          });
        });
        wrap.querySelectorAll(".step-explain-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const footer = btn.closest(".step-explain-footer");
            const explainWrap = footer?.querySelector(".step-explain-wrap");
            if (!explainWrap) return;
            const open = !explainWrap.classList.contains("is-open");
            explainWrap.classList.toggle("is-open", open);
            btn.setAttribute("aria-expanded", String(open));
            const lbl = btn.querySelector(".step-explain-lbl");
            if (lbl) lbl.textContent = open ? "Ocultar explicação" : "Ver explicação";
          });
        });
        const els = [...wrap.querySelectorAll(".obs-anim")];
        if (prefersReducedMotion()) {
          els.forEach((el) => el.classList.add("is-in"));
        } else {
          els.forEach((el, i) => {
            later(() => nextFrame(() => el.classList.add("is-in")), i * 60);
          });
        }
      };

      const hadContent = wrap.innerHTML.trim() !== "";
      if (hadContent && !prefersReducedMotion()) {
        wrap.classList.add("is-fading");
        later(() => {
          bindAndReveal();
          nextFrame(() => wrap.classList.remove("is-fading"));
        }, 150);
      } else {
        bindAndReveal();
      }
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

      <nav class="area-strip" aria-label="Área de avaliação">
        ${motor.AREA_KEYS.map((k) => `<button type="button" class="area-pill${k === state.area ? " is-active" : ""}" data-area="${k}" aria-pressed="${k === state.area}">${escHtml(motor.AREAS[k])}</button>`).join("")}
      </nav>

      <section aria-labelledby="placar-heading">
        <h2 id="placar-heading" class="sr-only">Placar de comparação</h2>
        <div class="tol-bar">
          <label class="tol-label" for="tol-slider">Quanto abaixo do melhor você aceita ficar?</label>
          <div class="tol-control">
            <input type="range" class="tol-range" id="tol-slider" min="0" max="25" step="1" value="${state.tol}">
            <span class="tol-readout num" id="tol-readout"></span>
          </div>
        </div>
        <p class="tol-explain">Em 0, os três cartões mostram o mais inteligente. Aumentar a régua revela opções bem mais baratas ou rápidas que ficam poucos pontos atrás.</p>
        <div class="scoreboard" id="scoreboard">
          <button type="button" class="score-card" id="card-int"></button>
          <button type="button" class="score-card" id="card-cost"></button>
          <button type="button" class="score-card" id="card-time"></button>
        </div>
        <p class="scoreboard-rule" id="scoreboard-rule"></p>
        <div id="scoreboard-source"></div>
      </section>

      <section aria-labelledby="ranking-heading">
        <div class="section-head">
          <h2 id="ranking-heading">Ranking</h2>
          <span class="section-sub" id="ranking-area-sub"></span>
        </div>
        <div class="ranking-card" id="ranking-card"></div>
        <p class="ranking-tie-note">≈ indica empate: menos de 1 ponto de diferença para o modelo acima.</p>
        <div id="ranking-source"></div>
      </section>

      <section id="comparar-section" aria-labelledby="comparar-heading">
        <div class="section-head">
          <h2 id="comparar-heading">Comparar modelos</h2>
          <span class="section-sub">Lado a lado nas 7 áreas, custo e tempo</span>
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
    updateScoreboard(false);
    renderRanking();
    renderCompareSection();
  }

  function bindAppEvents() {
    $$(".area-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.area === state.area) return;
        state.area = btn.dataset.area;
        state.sortField = "nota";
        state.sortDir = "desc";
        $$(".area-pill").forEach((b) => {
          const act = b.dataset.area === state.area;
          b.classList.toggle("is-active", act);
          b.setAttribute("aria-pressed", String(act));
        });
        updateScoreboard(true);
        renderRanking();
        renderCompareSection();
        if (state.drawerOpen) renderDrawerFull();
        syncUrl();
        emit("area", state.area);
      });
    });

    const slider = $("tol-slider");
    slider.addEventListener("input", () => {
      state.tol = parseInt(slider.value, 10);
      updateScoreboard(true);
      syncUrl();
    });
    slider.addEventListener("change", () => {
      emit("tol", state.tol);
    });

    ["card-int", "card-cost", "card-time"].forEach((id) => {
      const btn = $(id);
      btn.addEventListener("click", () => {
        if (btn.dataset.modelId) openDrawer(btn.dataset.modelId, btn.dataset.effort, btn);
      });
    });

    $("ranking-card").addEventListener("click", (e) => {
      const sortBtn = e.target.closest("[data-sort]");
      if (sortBtn) {
        const f = sortBtn.dataset.sort;
        state.sortDir = state.sortField === f ? (state.sortDir === "asc" ? "desc" : "asc") : (f === "nota" ? "desc" : "asc");
        state.sortField = f;
        renderRanking();
        return;
      }
      const toggleBtn = e.target.closest("#toggle-ranking-btn");
      if (toggleBtn) {
        state.expandedRanking = !state.expandedRanking;
        $("ranking-extra-wrap").classList.toggle("is-open", state.expandedRanking);
        toggleBtn.setAttribute("aria-expanded", String(state.expandedRanking));
        const rowsLen = $$("#ranking-card .rank-row").length;
        toggleBtn.textContent = state.expandedRanking ? "Mostrar só os 10 primeiros" : `Ver todos os ${rowsLen} modelos`;
        const top10Last = raiz.querySelector("#ranking-top10 .rank-row:last-child");
        if (top10Last) top10Last.classList.toggle("is-last-visible", !state.expandedRanking);
        if (state.expandedRanking) observeRankingBars();
        return;
      }
      const row = e.target.closest(".rank-row");
      if (row) openDrawer(row.dataset.modelId, row.dataset.effort, row);
    });
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
    const resolvedModel = resolveModelId(h.modelo);
    window.observatorio?.abrir({
      area: h.area || "intelligence",
      tol: h.tol != null && h.tol !== "" ? h.tol : 10,
      comparar: h.comparar || undefined,
      modelo: resolvedModel || null,
      esforco: h.esforco || undefined
    });
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
