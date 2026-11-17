import { FileDown, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PanoramaConfig } from "../../panoramaData";
import {
  INDEX_KEYS, ceiling, effortLabel, formatCost, formatScore, formatTime,
  type Family, type GuideModels, type GuidePlans, type GuideSources, type IndexKey, type Interval, type TeamMember,
} from "../../guiaModelos";
import { indexLabel, Mark, type T } from "./comum";

export const ARENA_ROWS = [
  { id: "overall", pt: "Preferência em conversa", en: "Chat preference" },
  { id: "coding", pt: "Preferência em programação", en: "Coding preference" },
  { id: "creative_writing", pt: "Preferência em escrita", en: "Writing preference" },
];

type Props = {
  models: GuideModels;
  sources: GuideSources | null;
  plans: GuidePlans | null;
  team: TeamMember[];
  planIds: string[];
  extraIds: string[];
  config: PanoramaConfig;
  english: boolean;
  t: T;
  onPlans: (ids: string[]) => void;
  onExtras: (ids: string[]) => void;
  onEffort: (familyId: string, effort: string) => void;
  onEvent: (name: string, label: string) => void;
};

export function arenaFor(sources: GuideSources | null, family: Family, category: string): { interval: Interval; effort: string | null } | null {
  let best: { interval: Interval; effort: string | null } | null = null;
  for (const entry of sources?.families.get(family.id)?.lmarena || []) {
    const interval = category === "overall" ? entry.overall : entry.categories[category];
    if (interval && (!best || interval.rating > best.interval.rating)) best = { interval, effort: entry.effort };
  }
  return best;
}

/* "Sua equipe": a pessoa marca os planos (ou os modelos) que tem e vê cada um em
   cada medida, lado a lado. A página não escolhe: cada linha só marca quem fica
   a menos de 1 ponto do melhor da própria equipe (empate técnico). */
export function Equipe({ models, sources, plans, team, planIds, extraIds, config, english, t, onPlans, onExtras, onEffort, onEvent }: Props) {
  const [query, setQuery] = useState("");
  const providers = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof plans>["plans"]>();
    for (const plan of plans?.plans || []) {
      if (!plan.families.length) continue;
      groups.set(plan.provider, [...(groups.get(plan.provider) || []), plan]);
    }
    return [...groups.entries()];
  }, [plans]);
  const suggestions = query.trim().length < 2 ? [] : models.families
    .filter((f) => !team.some((m) => m.family.id === f.id) && `${f.name} ${f.creator}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 6);
  const togglePlan = (id: string) => { const next = planIds.includes(id) ? planIds.filter((p) => p !== id) : [...planIds, id]; onPlans(next); onEvent("team_plan", `${id}:${next.includes(id)}`); };
  const fieldMax = useMemo(() => Object.fromEntries(INDEX_KEYS.map((key) => [key, Math.max(...models.families.map((f) => ceiling(f, key)?.scores[key] ?? 0))])) as Record<IndexKey, number>, [models]);

  return <div className="gm-team">
    <div className="gm-team-pick">
      {providers.length > 0 && <div className="gm-plan-groups">
        {providers.map(([provider, list]) => <div key={provider} className="gm-plan-group">
          <span className="gm-kicker">{provider}</span>
          <div>{list.map((plan) => <button type="button" key={plan.id} className="gm-chip" aria-pressed={planIds.includes(plan.id)} onClick={() => togglePlan(plan.id)} title={plan.price}>{plan.name}</button>)}</div>
        </div>)}
      </div>}
      <div className="gm-team-search">
        <label className="gm-search" htmlFor="gm-team-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{t("Acrescentar um modelo", "Add a model")}</span>
          <input id="gm-team-search" type="search" value={query} autoComplete="off" placeholder={t("Acrescentar um modelo pelo nome…", "Add a model by name…")} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {suggestions.length > 0 && <div className="gm-suggest">{suggestions.map((f) => <button type="button" key={f.id} onClick={() => { onExtras([...extraIds, f.id]); setQuery(""); onEvent("team_model", f.id); }}><Mark company={f.creator} config={config} size={20} /><span>{f.name}<small>{f.creator}</small></span><Plus size={15} aria-hidden="true" /></button>)}</div>}
      </div>
      {plans && <p className="gm-note">{t(`Planos e modelos conferidos nas páginas oficiais em ${plans.checkedAt.split("-").reverse().join("/")}. Nenhuma delas informa o nível de esforço: cada modelo entra no esforço padrão documentado pelo fabricante, e você pode trocá-lo.`, `Plans and models checked on the official pages on ${plans.checkedAt}. None of them states the effort level: each model enters at the manufacturer's documented default effort, which you can change.`)}</p>}
    </div>

    {!team.length ? <div className="gm-team-empty">
      <p><strong>{t("Marque os planos que você tem", "Select the plans you have")}</strong> {t("ou acrescente modelos pelo nome. A tabela mostra cada um deles em todas as medidas, lado a lado.", "or add models by name. The table shows each of them in every measure, side by side.")}</p>
    </div> : <>
      <div className="gm-team-scroll" tabIndex={0} role="region" aria-label={t("Tabela da sua equipe", "Your team table")}>
        <table className="gm-team-table">
          <thead><tr>
            <th scope="col" className="gm-team-corner">{t("Medida", "Measure")}</th>
            {team.map((member) => <th scope="col" key={member.family.id}>
              <span className="gm-team-model"><Mark company={member.family.creator} config={config} size={22} /><b>{member.family.name}</b></span>
              <select aria-label={t(`Esforço de ${member.family.name}`, `${member.family.name} effort`)} value={member.variant.effort} onChange={(e) => onEffort(member.family.id, e.target.value)}>
                {member.family.variants.map((v) => <option key={v.effort} value={v.effort}>{effortLabel(v.effort, english)}{plans?.defaults.get(member.family.id)?.effort === v.effort ? t(" · padrão", " · default") : ""}</option>)}
              </select>
              {!member.planIds.length && <button type="button" className="gm-team-remove" onClick={() => onExtras(extraIds.filter((id) => id !== member.family.id))} aria-label={t(`Tirar ${member.family.name}`, `Remove ${member.family.name}`)}><X size={13} aria-hidden="true" /></button>}
            </th>)}
          </tr></thead>
          <tbody>
            <tr className="gm-team-section"><th colSpan={team.length + 1} scope="colgroup">{t("Artificial Analysis · acerto em tarefas difíceis (0–100)", "Artificial Analysis · accuracy on hard tasks (0–100)")}</th></tr>
            {INDEX_KEYS.map((key) => {
              const values = team.map((m) => m.variant.scores[key]);
              const best = Math.max(...values.filter((v): v is number => v !== null));
              return <tr key={key}>
                <th scope="row">{indexLabel(key, english)}</th>
                {team.map((member, i) => {
                  const v = values[i];
                  const near = v !== null && best - v < 1;
                  return <td key={member.family.id} className={near ? "is-near" : ""}>
                    {v === null ? <span className="gm-na">{t("sem medida", "not measured")}</span> : <>
                      <span className="gm-cell-bar"><span style={{ width: `${(v / fieldMax[key]) * 100}%` }} /></span>
                      <b>{formatScore(v, english)}</b>{near && team.length > 1 && <small>{t("topo da equipe", "team top")}</small>}
                    </>}
                  </td>;
                })}
              </tr>;
            })}
            {sources && <>
              <tr className="gm-team-section"><th colSpan={team.length + 1} scope="colgroup">{t("LMArena · preferência humana às cegas (Elo; o esforço medido aparece embaixo)", "LMArena · blind human preference (Elo; the measured effort appears below)")}</th></tr>
              {ARENA_ROWS.map((row) => {
                const cells = team.map((m) => arenaFor(sources, m.family, row.id));
                const top = cells.reduce<Interval | null>((acc, c) => c && (!acc || c.interval.rating > acc.rating) ? c.interval : acc, null);
                return <tr key={row.id}>
                  <th scope="row">{english ? row.en : row.pt}</th>
                  {cells.map((cell, i) => {
                    const overlap = cell && top && (cell.interval.upper ?? cell.interval.rating) >= (top.lower ?? top.rating);
                    return <td key={team[i].family.id} className={overlap ? "is-near" : ""}>
                      {cell ? <><b>{Math.round(cell.interval.rating)}</b><small>{cell.effort ? effortLabel(cell.effort, english) : t("esforço não informado", "effort not stated")}{overlap && team.length > 1 ? t(" · topo da equipe", " · team top") : ""}</small></> : <span className="gm-na">{t("fora do LMArena", "not on LMArena")}</span>}
                    </td>;
                  })}
                </tr>;
              })}
            </>}
            <tr className="gm-team-section"><th colSpan={team.length + 1} scope="colgroup">{t("Quanto consome (medianas da Artificial Analysis)", "What it consumes (Artificial Analysis medians)")}</th></tr>
            <tr><th scope="row">{t("Custo por tarefa (API)", "Cost per task (API)")}</th>{team.map((m) => <td key={m.family.id}><b>{formatCost(m.variant.costPerTask, english)}</b></td>)}</tr>
            <tr><th scope="row">{t("Tempo de resposta", "Response time")}</th>{team.map((m) => <td key={m.family.id}><b>{formatTime(m.variant.e2e, english)}</b></td>)}</tr>
            <tr><th scope="row">{t("De onde vem", "Comes from")}</th>{team.map((m) => <td key={m.family.id}><small>{m.planIds.length ? m.planIds.map((id) => plans?.plans.find((p) => p.id === id)?.name || id).join(", ") : t("acrescentado por você", "added by you")}</small></td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="gm-note">{t("“Topo da equipe” marca quem fica a menos de 1 ponto do melhor da sua equipe naquela linha (no LMArena, quem tem o intervalo de confiança encostando no do melhor). Não é recomendação: o que pesa mais depende do seu trabalho.", "“Team top” marks whoever is less than 1 point from your team's best on that row (on LMArena, whoever's confidence interval reaches the best one). It is not a recommendation: what matters most depends on your work.")}</p>
      <div className="gm-team-actions">
        <button type="button" className="gm-button" onClick={() => { openReport(team, sources, plans, english); onEvent("report", String(team.length)); }}><FileDown size={16} aria-hidden="true" />{t("Abrir o relatório da minha equipe", "Open my team report")}</button>
      </div>
    </>}
  </div>;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/* O relatório é montado aqui, com os mesmos números da tabela: nenhum número
   passa por IA. Abre numa aba própria, pronto para imprimir ou salvar. */
export function buildReport(team: TeamMember[], sources: GuideSources | null, plans: GuidePlans | null, english: boolean, narrative = "") {
  const t = (pt: string, en: string) => english ? en : pt;
  const date = new Date().toLocaleDateString(english ? "en-GB" : "pt-BR");
  const head = team.map((m) => `<th>${esc(m.family.name)}<br><small>${esc(effortLabel(m.variant.effort, english))}</small></th>`).join("");
  const row = (label: string, cells: string[]) => `<tr><th>${esc(label)}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  const rows = INDEX_KEYS.map((key) => row(indexLabel(key, english), team.map((m) => formatScore(m.variant.scores[key], english)))).join("")
    + (sources ? ARENA_ROWS.map((r) => row(english ? r.en : r.pt, team.map((m) => { const c = arenaFor(sources, m.family, r.id); return c ? `${Math.round(c.interval.rating)}` : "—"; }))).join("") : "")
    + row(t("Custo por tarefa (API)", "Cost per task (API)"), team.map((m) => formatCost(m.variant.costPerTask, english)))
    + row(t("Tempo de resposta", "Response time"), team.map((m) => formatTime(m.variant.e2e, english)));
  const planNames = [...new Set(team.flatMap((m) => m.planIds))].map((id) => plans?.plans.find((p) => p.id === id)?.name || id);
  return `<!doctype html><html lang="${english ? "en" : "pt-BR"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t("Minha equipe de IA", "My AI team")}</title>
<style>body{margin:0;background:#f4f7f5;color:#17231f;font:16px/1.55 Inter,system-ui,sans-serif}main{max-width:960px;margin:0 auto;padding:32px 20px}h1{font:600 2rem Georgia,serif;color:#123d31;margin:0 0 4px}p.meta{color:#61706a;margin:0 0 20px}.narr{background:#fff;border:1px solid #d7dfdb;border-left:4px solid #d76832;padding:14px 18px;margin:0 0 20px}.wrap{overflow-x:auto;background:#fff;border:1px solid #d7dfdb}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:8px 12px;border-bottom:1px solid #e6ece8;text-align:right;white-space:nowrap}thead th{background:#123d31;color:#fff;font-weight:600}tbody th{text-align:left;color:#123d31;font-weight:600}small{font-weight:400;opacity:.8}footer{margin-top:20px;color:#61706a;font-size:.85rem}@media print{body{background:#fff}main{padding:0}}</style></head>
<body><main><h1>${t("Minha equipe de IA", "My AI team")}</h1><p class="meta">${esc(planNames.length ? planNames.join(" · ") : t("Modelos escolhidos por você", "Models you chose"))} · ${date}</p>
${narrative ? `<div class="narr">${narrative}</div>` : ""}
<div class="wrap"><table><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<footer>${t("Notas da Artificial Analysis (0–100, índice v5; diferença menor que 1 ponto é empate). Preferência: Elo do LMArena, no esforço que ele mediu. Custo e tempo: medianas por tarefa do índice, não da sua tarefa. Gerado no Observatório UFG-IA, seção Panorama da IA › Qual modelo usar.", "Artificial Analysis scores (0–100, index v5; a difference below 1 point is a tie). Preference: LMArena Elo, at the effort it measured. Cost and time: medians per index task, not your own task. Generated at the UFG-AI Observatory, AI Panorama › Which model to use.")}</footer></main></body></html>`;
}

export function openReport(team: TeamMember[], sources: GuideSources | null, plans: GuidePlans | null, english: boolean, narrative = "") {
  const html = buildReport(team, sources, plans, english, narrative);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  // Sem "noopener": com ele o navegador devolve null e não dá para saber se a aba abriu.
  const opened = window.open(url, "_blank");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url; a.download = english ? "my-ai-team.html" : "minha-equipe-de-ia.html";
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
