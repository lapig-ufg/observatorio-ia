import { FileText, MessageCircle, Send, Sparkles, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../../catalog";
import {
  effortLabel, formatCost, formatScore, formatTime, isTie,
  type Axis, type GuideModels, type GuidePlans, type GuideSources, type IndexKey, type RankRow, type TeamMember,
} from "../../guiaModelos";
import { indexLabel, type T } from "./comum";
import { openReport } from "./Equipe";

/* Endereço do Worker da coruja desta página. Vazio = coruja sem IA: as três
   ações continuam funcionando com textos montados aqui, a partir dos números. */
export const CORUJA_GUIA_URL = (import.meta.env.VITE_CORUJA_GUIA_URL as string | undefined) || "";

export type ViewState = { indexKey: IndexKey; axis: Axis; rows: RankRow[]; compare: string[]; team: TeamMember[]; models: GuideModels; sources: GuideSources | null; plans: GuidePlans | null };

type Message = { from: "coruja" | "pessoa"; text: string; ai?: boolean };

/* ─── textos sem IA (determinísticos) ─── */

export function explainView(state: ViewState, english: boolean): string {
  const t = (pt: string, en: string) => english ? en : pt;
  const { rows, indexKey, axis } = state;
  if (!rows.length) return t("Ainda não há dados nesta visão.", "There's no data in this view yet.");
  const leader = rows[0];
  const ties = rows.slice(1).filter((r) => isTie(leader.score, r.score)).map((r) => r.family.name);
  const label = indexLabel(indexKey, english);
  const parts: string[] = [];
  parts.push(t(`Você está vendo ${label}, no melhor resultado de cada modelo. ${leader.family.name} aparece em primeiro, com ${formatScore(leader.score)} pontos (esforço ${effortLabel(leader.top.effort)}).`,
    `You're looking at ${label}, at each model's best. ${leader.family.name} comes first with ${formatScore(leader.score, true)} points (effort ${effortLabel(leader.top.effort, true)}).`));
  if (ties.length) parts.push(t(`${ties.join(", ")} ${ties.length > 1 ? "ficam" : "fica"} a menos de 1 ponto: é empate técnico.`, `${ties.join(", ")} ${ties.length > 1 ? "are" : "is"} less than 1 point behind: a statistical tie.`));
  const value = axis === "cost" ? (r: RankRow) => r.top.costPerTask : (r: RankRow) => r.top.e2e;
  const near = rows.filter((r) => leader.score - r.score <= 3 && value(r) !== null && value(leader) !== null);
  const cheap = near.sort((a, b) => value(a)! - value(b)!)[0];
  if (cheap && cheap !== leader) parts.push(axis === "cost"
    ? t(`A até 3 pontos do primeiro, o de menor custo por tarefa é ${cheap.family.name}: ${formatCost(cheap.top.costPerTask)} contra ${formatCost(leader.top.costPerTask)}.`, `Within 3 points of the leader, the lowest cost per task is ${cheap.family.name}: ${formatCost(cheap.top.costPerTask, true)} versus ${formatCost(leader.top.costPerTask, true)}.`)
    : t(`A até 3 pontos do primeiro, o que responde mais rápido é ${cheap.family.name}: ${formatTime(cheap.top.e2e)} contra ${formatTime(leader.top.e2e)}.`, `Within 3 points of the leader, the fastest is ${cheap.family.name}: ${formatTime(cheap.top.e2e, true)} versus ${formatTime(leader.top.e2e, true)}.`));
  const ladders = rows.slice(0, 15).filter((r) => r.family.variants.filter((v) => v.scores[indexKey] !== null).length > 2);
  const widest = ladders.sort((a, b) => (b.score - b.floor) - (a.score - a.floor))[0];
  if (widest) parts.push(t(`O esforço muda muito o resultado: ${widest.family.name} vai de ${formatScore(widest.floor)} a ${formatScore(widest.score)} pontos entre o menor e o maior esforço. Abra a “Escada” de qualquer modelo para ver quanto cada degrau custa.`, `Effort changes results a lot: ${widest.family.name} goes from ${formatScore(widest.floor, true)} to ${formatScore(widest.score, true)} points between its lowest and highest effort. Open any model's “Ladder” to see what each step costs.`));
  return parts.join(" ");
}

const PLAN_WORDS: Array<[RegExp, string]> = [
  [/chat\s*gpt|openai/i, "chatgpt"], [/claude|anthropic/i, "claude"], [/gemini|google/i, "gemini"],
  [/deepseek/i, "deepseek"], [/kimi|moonshot/i, "kimi"], [/grok|xai/i, "grok"], [/copilot/i, "copilot"],
  [/le\s*chat|mistral/i, "mistral"], [/qwen/i, "qwen"], [/ollama/i, "ollama"],
];

/** Entende frases como "tenho o ChatGPT grátis e o Claude Pro" sem IA: procura o
    nome do produto e, perto dele, o nome do plano. Na dúvida, fica com o grátis. */
export function plansFromText(text: string, plans: GuidePlans | null): string[] {
  if (!plans) return [];
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const [re, product] of PLAN_WORDS) {
    const m = lower.match(re);
    if (!m) continue;
    const near = lower.slice(m.index!, m.index! + 40);
    const candidates = plans.plans.filter((p) => p.id.startsWith(product) && p.families.length);
    if (!candidates.length) continue;
    const pick = candidates.find((p) => {
      const tier = p.id.slice(product.length + 1).replace(/-/g, " ");
      return tier && near.includes(tier.split(" ").pop()!);
    }) || candidates.find((p) => /free|gratis/.test(p.id)) || candidates[0];
    found.add(pick.id);
  }
  return [...found];
}

function teamNarrative(team: TeamMember[], english: boolean) {
  const t = (pt: string, en: string) => english ? en : pt;
  if (!team.length) return "";
  const top = (key: IndexKey) => [...team].filter((m) => m.variant.scores[key] !== null).sort((a, b) => b.variant.scores[key]! - a.variant.scores[key]!);
  const g = top("intelligence");
  const lines = [t(`Sua equipe tem ${team.length} ${team.length > 1 ? "modelos" : "modelo"}.`, `Your team has ${team.length} ${team.length > 1 ? "models" : "model"}.`)];
  if (g.length > 1) {
    const ties = g.filter((m) => isTie(g[0].variant.scores.intelligence, m.variant.scores.intelligence)).map((m) => m.family.name);
    lines.push(ties.length > 1
      ? t(`Em inteligência geral, ${ties.join(" e ")} empatam no topo (menos de 1 ponto entre eles).`, `In overall intelligence, ${ties.join(" and ")} tie at the top (less than 1 point apart).`)
      : t(`Em inteligência geral, ${g[0].family.name} (${effortLabel(g[0].variant.effort)}) fica na frente, com ${formatScore(g[0].variant.scores.intelligence)} pontos.`, `In overall intelligence, ${g[0].family.name} (${effortLabel(g[0].variant.effort, true)}) leads with ${formatScore(g[0].variant.scores.intelligence, true)} points.`));
    const fast = [...team].filter((m) => m.variant.e2e !== null).sort((a, b) => a.variant.e2e! - b.variant.e2e!)[0];
    if (fast && fast !== g[0]) lines.push(t(`O que responde mais rápido é ${fast.family.name} (${formatTime(fast.variant.e2e)}).`, `The fastest to respond is ${fast.family.name} (${formatTime(fast.variant.e2e, true)}).`));
  }
  lines.push(t("Os números são da tabela; o que pesa mais depende do seu trabalho.", "The numbers come from the table; what matters most depends on your work."));
  return lines.join(" ");
}

/* ─── a coruja ─── */

const OLHOS = [{ pecas: [2, 4], fx: 0.248, fy: 0.477, max: 15 }, { pecas: [3], fx: 0.657, fy: 0.585, max: 38 }];

function OwlArt({ thinking }: { thinking: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const thinkingRef = useRef(thinking);
  thinkingRef.current = thinking;
  useEffect(() => {
    let frame = 0, active = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target: { x: number; y: number } | null = null;
    const move = (e: PointerEvent) => { target = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointermove", move, { passive: true });
    void fetch(assetUrl("brand/observatorio-coruja.svg")).then((r) => r.text()).then((text) => {
      if (!active || !host.current) return;
      host.current.innerHTML = text;
      const svg = host.current.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      const paths = [...svg.querySelectorAll("path")];
      if (paths.length < 5) return;
      const eyes = OLHOS.map((o) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        paths[o.pecas[0]].before(g);
        o.pecas.forEach((i) => g.append(paths[i]));
        return { ...o, g, x: 0, y: 0 };
      });
      const tick = (time: number) => {
        const r = svg.getBoundingClientRect();
        for (const o of eyes) {
          let dx = 0, dy = 0;
          if (thinkingRef.current) { dx = Math.sin(time / 900) * 0.8; dy = -0.75; }
          else if (target && r.width) {
            const vx = target.x - (r.left + r.width * o.fx), vy = target.y - (r.top + r.height * o.fy);
            const d = Math.hypot(vx, vy) || 1, f = Math.min(1, d / (r.width * 1.5));
            dx = vx / d * f; dy = vy / d * f;
          }
          const k = reduced ? 1 : 0.12;
          o.x += (dx * o.max - o.x) * k; o.y += (dy * o.max - o.y) * k;
          o.g.setAttribute("transform", `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`);
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }).catch(() => undefined);
    return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); };
  }, []);
  return <span className="gm-owl-art" ref={host} aria-hidden="true" />;
}

type CorujaProps = { state: ViewState; english: boolean; t: T; onTeam: (planIds: string[]) => void; onEvent: (name: string, label: string) => void };

export function Coruja({ state, english, t, onTeam, onEvent }: CorujaProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"menu" | "equipe" | "pergunta">("menu");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const aiOn = Boolean(CORUJA_GUIA_URL);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const say = (m: Message) => setMessages((all) => [...all, m]);
  const askAI = async (payload: Record<string, unknown>) => {
    if (!aiOn) return null;
    try {
      const response = await fetch(CORUJA_GUIA_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idioma: english ? "en" : "pt", aparelho: deviceId() }) });
      if (!response.ok) return null;
      const data = await response.json() as { texto?: string; planos?: string[] };
      return data;
    } catch { return null; }
  };

  const explain = async () => {
    onEvent("owl_explain", state.indexKey);
    say({ from: "pessoa", text: t("Explique o que estou vendo.", "Explain what I'm looking at.") });
    const base = explainView(state, english);
    setBusy(true);
    const ai = await askAI({ modo: "leitura", resumo: base, estado: compactState(state) });
    setBusy(false);
    say({ from: "coruja", text: ai?.texto || base, ai: Boolean(ai?.texto) });
  };

  const team = async () => {
    const said = text.trim();
    if (!said) return;
    onEvent("owl_team", "");
    say({ from: "pessoa", text: said });
    setText("");
    setBusy(true);
    const local = plansFromText(said, state.plans);
    const ai = await askAI({ modo: "equipe", texto: said, planos: (state.plans?.plans || []).filter((p) => p.families.length).map((p) => ({ id: p.id, nome: `${p.provider} ${p.name}` })) });
    setBusy(false);
    const valid = new Set((state.plans?.plans || []).map((p) => p.id));
    const ids = (ai?.planos || []).filter((id) => valid.has(id));
    const chosen = ids.length ? ids : local;
    if (!chosen.length) {
      say({ from: "coruja", text: t("Não reconheci nenhum plano na frase. Diga o nome do produto e do plano, como “ChatGPT Plus” ou “Claude grátis”, ou marque os planos na seção “Sua equipe”.", "I didn't recognize any plan. Name the product and the plan, like “ChatGPT Plus” or “free Claude”, or select the plans in “Your team”.") });
      return;
    }
    onTeam(chosen);
    const names = chosen.map((id) => state.plans?.plans.find((p) => p.id === id)).filter(Boolean).map((p) => `${p!.provider} ${p!.name}`);
    say({ from: "coruja", text: t(`Marquei: ${names.join(", ")}. A tabela de “Sua equipe” já mostra os modelos desses planos. Confira se é isso e ajuste o esforço de cada um, se quiser.`, `Selected: ${names.join(", ")}. The “Your team” table now shows those plans' models. Check it and adjust each one's effort if you like.`), ai: Boolean(ids.length) });
    document.getElementById("gm-equipe")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const report = async () => {
    onEvent("owl_report", String(state.team.length));
    if (!state.team.length) {
      say({ from: "coruja", text: t("Primeiro monte a equipe: diga quais planos você tem, ou marque na seção “Sua equipe”.", "Build your team first: tell me your plans, or select them in “Your team”.") });
      setMode("equipe");
      return;
    }
    const base = teamNarrative(state.team, english);
    setBusy(true);
    const ai = await askAI({ modo: "relatorio", resumo: base, equipe: compactTeam(state) });
    setBusy(false);
    const narrative = ai?.texto || base;
    openReport(state.team, state.sources, state.plans, english, escapeHtml(narrative));
    say({ from: "coruja", text: t("Abri o relatório numa aba nova, com a tabela da sua equipe e um resumo. Os números são os mesmos da página.", "I opened the report in a new tab, with your team table and a summary. The numbers are the same as on the page."), ai: Boolean(ai?.texto) });
  };

  const question = async () => {
    const said = text.trim();
    if (!said) return;
    onEvent("owl_question", "");
    say({ from: "pessoa", text: said });
    setText("");
    setBusy(true);
    const ai = await askAI({ modo: "pergunta", texto: said, estado: compactState(state) });
    setBusy(false);
    say({ from: "coruja", text: ai?.texto || glossaryAnswer(said, english), ai: Boolean(ai?.texto) });
  };

  return <>
    <button type="button" className={`gm-owl-button${open ? " is-open" : ""}`} aria-expanded={open} aria-controls="gm-owl-panel" onClick={() => { setOpen(!open); onEvent("owl_open", String(!open)); }}>
      <OwlArt thinking={busy} />
      <span className="gm-owl-hint">{t("Pergunte à coruja", "Ask the owl")}</span>
    </button>
    {open && <section id="gm-owl-panel" className="gm-owl-panel" aria-label={t("Coruja do Observatório", "Observatory owl")}>
      <header><OwlArt thinking={busy} /><div><strong>{t("Coruja do Observatório", "Observatory owl")}</strong><small>{aiOn ? t("Leio os números desta página com você. Nenhum número vem de mim.", "I read this page's numbers with you. None of them comes from me.") : t("Leio os números desta página com você (modo sem IA).", "I read this page's numbers with you (no-AI mode).")}</small></div><button type="button" className="gm-icon-button" onClick={() => setOpen(false)} aria-label={t("Fechar", "Close")}><X size={18} aria-hidden="true" /></button></header>
      <div className="gm-owl-messages" ref={list} aria-live="polite">
        {!messages.length && <p className="gm-owl-intro">{t("Posso explicar o que está na tela, montar a sua equipe a partir dos planos que você tem e abrir um relatório para guardar.", "I can explain what's on screen, build your team from the plans you have, and open a report you can keep.")}</p>}
        {messages.map((m, i) => <p key={i} className={`gm-owl-msg is-${m.from}`}>{m.text}{m.ai && <small>{t("redação da IA · números da página", "wording by AI · numbers from the page")}</small>}</p>)}
        {busy && <p className="gm-owl-msg is-coruja is-busy">{t("Lendo os números…", "Reading the numbers…")}</p>}
      </div>
      <div className="gm-owl-actions">
        <button type="button" onClick={explain} disabled={busy}><Sparkles size={15} aria-hidden="true" />{t("Explique o que estou vendo", "Explain what I'm seeing")}</button>
        <button type="button" onClick={() => setMode(mode === "equipe" ? "menu" : "equipe")} aria-pressed={mode === "equipe"} disabled={busy}><Users size={15} aria-hidden="true" />{t("Montar minha equipe", "Build my team")}</button>
        <button type="button" onClick={report} disabled={busy}><FileText size={15} aria-hidden="true" />{t("Relatório da equipe", "Team report")}</button>
        <button type="button" onClick={() => setMode(mode === "pergunta" ? "menu" : "pergunta")} aria-pressed={mode === "pergunta"} disabled={busy}><MessageCircle size={15} aria-hidden="true" />{t("Perguntar", "Ask")}</button>
      </div>
      {mode !== "menu" && <form className="gm-owl-form" onSubmit={(e) => { e.preventDefault(); void (mode === "equipe" ? team() : question()); }}>
        <label className="sr-only" htmlFor="gm-owl-text">{mode === "equipe" ? t("Quais planos você tem?", "Which plans do you have?") : t("Sua pergunta", "Your question")}</label>
        <textarea id="gm-owl-text" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "equipe" ? t("Ex.: tenho o ChatGPT grátis e o Claude Pro", "E.g.: I have free ChatGPT and Claude Pro") : t("Ex.: o que é custo por tarefa?", "E.g.: what is cost per task?")} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <button type="submit" className="gm-icon-button" disabled={busy || !text.trim()} aria-label={t("Enviar", "Send")}><Send size={17} aria-hidden="true" /></button>
      </form>}
      {aiOn && <p className="gm-owl-privacy">{t("O texto que você escreve vai à Cloudflare e ao Ollama Cloud, sem ser guardado. Não escreva dados pessoais.", "What you type goes to Cloudflare and Ollama Cloud, without being stored. Don't type personal data.")}</p>}
    </section>}
  </>;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function deviceId() {
  try {
    let id = localStorage.getItem("gm-coruja-aparelho");
    if (!id) { id = (crypto.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, ""); localStorage.setItem("gm-coruja-aparelho", id); }
    return id;
  } catch { return "sem-armazenamento"; }
}

function compactState(state: ViewState) {
  return {
    indice: state.indexKey, eixo: state.axis,
    primeiros: state.rows.slice(0, 12).map((r) => ({ modelo: r.family.name, esforco: r.top.effort, nota: r.score, menor_esforco_nota: r.floor, custo: r.top.costPerTask, tempo_s: r.top.e2e })),
    comparando: state.compare,
  };
}

function compactTeam(state: ViewState) {
  return state.team.map((m) => ({ modelo: m.family.name, esforco: m.variant.effort, notas: m.variant.scores, custo: m.variant.costPerTask, tempo_s: m.variant.e2e }));
}

const GLOSSARY: Array<{ words: RegExp; pt: string; en: string }> = [
  { words: /custo|cost|pre[çc]o|price/i, pt: "Custo por tarefa é quanto custou, em média, cada tarefa do índice da Artificial Analysis pela API, somando entrada, raciocínio e saída. Não é o preço da assinatura nem o custo da sua tarefa: serve como indicador de quanto cada nível de esforço consome.", en: "Cost per task is the average API cost of each task in the Artificial Analysis index, counting input, reasoning and output. It isn't a subscription price nor the cost of your own task: read it as a sign of how much each effort level consumes." },
  { words: /esfor[çc]o|effort|reasoning|racioc/i, pt: "Esforço é quanto o modelo “pensa” antes de responder (low, medium, high, xhigh, max). Mais esforço costuma dar nota maior, mas gasta mais e demora mais. A página mostra o melhor resultado de cada modelo; o botão “Escada” abre todos os níveis medidos.", en: "Effort is how much the model “thinks” before answering (low, medium, high, xhigh, max). More effort usually scores higher, but costs and takes more. The page shows each model's best result; the “Ladder” button opens every measured level." },
  { words: /empate|tie|1 ponto|ru[ií]do|noise/i, pt: "Diferença menor que 1 ponto na nota da Artificial Analysis é empate técnico: está dentro da variação da própria medição. Por isso a página marca esses casos com ≈ em vez de dar posição.", en: "A difference below 1 point in the Artificial Analysis score is a statistical tie: it's within the measurement's own variation. The page marks these cases with ≈ instead of giving a position." },
  { words: /lmarena|elo|prefer/i, pt: "O LMArena mostra a mesma pergunta a dois modelos sem dizer quais são, e a pessoa escolhe a melhor resposta. O Elo resume milhares dessas escolhas. Mede preferência, não acerto, e cada modelo aparece no esforço em que foi testado.", en: "LMArena shows the same prompt to two unnamed models and people pick the better answer. The Elo summarizes thousands of those choices. It measures preference, not accuracy, and each model appears at the effort it was tested." },
  { words: /tempo|time|demora|r[áa]pido|fast|speed/i, pt: "Tempo de resposta é a mediana, medida pela Artificial Analysis, do tempo entre enviar a pergunta e receber a resposta inteira, por consulta do índice. Em esforço alto, boa parte é o modelo pensando antes de escrever.", en: "Response time is the Artificial Analysis median of the time between sending a prompt and getting the whole answer, per index query. At high effort, much of it is the model thinking before it writes." },
  { words: /intelig|intelligence|[íi]ndice|index|nota|score/i, pt: "A nota geral é o Intelligence Index v5 da Artificial Analysis: a média de quatro blocos de 25% (trabalho de conhecimento, código, ciência e geral), com nove testes rodados pela própria AA. Não mede conversa nem escrita.", en: "The overall score is the Artificial Analysis Intelligence Index v5: the average of four 25% blocks (knowledge work, coding, science and general), with nine tests run by AA itself. It doesn't measure chat or writing." },
];

function glossaryAnswer(question: string, english: boolean) {
  const hit = GLOSSARY.find((g) => g.words.test(question));
  if (hit) return english ? hit.en : hit.pt;
  return english
    ? "Without AI, I only answer about the terms on this page: score, effort, cost per task, response time, ties and LMArena. Try one of them, or use “Explain what I'm seeing”."
    : "Sem IA, eu só respondo sobre os termos desta página: nota, esforço, custo por tarefa, tempo de resposta, empate e LMArena. Tente um deles, ou use “Explique o que estou vendo”.";
}
