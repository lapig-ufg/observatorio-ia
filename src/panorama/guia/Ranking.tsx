import { ChevronDown, Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { PanoramaConfig } from "../../panoramaData";
import {
  compareVariants, effortLabel, effortSteps, formatCost, formatDelta, formatRatio, formatScore, formatTime,
  type Family, type GuidePlans, type IndexKey, type RankRow,
} from "../../guiaModelos";
import { familyColor, InfoTip, Mark, niceMax, type T } from "./comum";

const DEFAULT_ROWS = 20;

type Props = {
  rows: RankRow[];
  indexKey: IndexKey;
  config: PanoramaConfig;
  plans: GuidePlans | null;
  english: boolean;
  t: T;
  compare: string[];
  maxCompare: number;
  onToggleCompare: (familyId: string) => void;
  onEvent: (name: string, label: string) => void;
};

/* A tela inicial: uma linha por família, no melhor resultado (como os outros
   sites), com a faixa de todos os esforços desenhada ao lado e a escada aberta
   com um toque. O eixo é comum a todas as linhas, de 0 até um pouco acima do
   líder, para a distância entre os modelos ser lida pelo comprimento. */
export function Ranking({ rows, indexKey, config, plans, english, t, compare, maxCompare, onToggleCompare, onEvent }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const axisMax = useMemo(() => niceMax((rows[0]?.score ?? 60) + 2), [rows]);
  const visible = showAll ? rows : rows.slice(0, DEFAULT_ROWS);
  const ticks = Array.from({ length: axisMax / 10 + 1 }, (_, i) => i * 10);
  const pct = (v: number) => `${(v / axisMax) * 100}%`;

  return <div className="gm-ranking">
    <div className="gm-rank-head" aria-hidden="true">
      <span>#</span>
      <span>{t("Modelo", "Model")}</span>
      <span className="gm-num">{t("Nota", "Score")}</span>
      <span className="gm-strip-axis">{ticks.map((tick) => <span key={tick} style={{ left: pct(tick) }}>{tick}</span>)}<em>{t("faixa de esforço", "effort range")}</em></span>
      <span className="gm-num">{t("Custo/tarefa", "Cost/task")}</span>
      <span className="gm-num">{t("Tempo", "Time")}</span>
      <span />
    </div>
    <ol className="gm-rank-list">
      {visible.map((row) => {
        const { family, top } = row;
        const color = familyColor(family.creator, config);
        const expanded = open === family.id;
        const selected = compare.includes(family.id);
        const scored = family.variants.filter((v) => v.scores[indexKey] !== null);
        return <li key={family.id} className={`gm-rank-row${expanded ? " is-open" : ""}`}>
          <div className="gm-rank-line">
            <span className="gm-pos">{row.tieWithPrevious && <abbr title={t("Menos de 1 ponto do modelo acima: empate técnico", "Less than 1 point below the model above: a statistical tie")}>≈</abbr>}{row.position}</span>
            <span className="gm-ident">
              <Mark company={family.creator} config={config} />
              <span><strong>{family.name}</strong><small>{family.creator} · <span className="gm-effort-tag">{effortLabel(top.effort, english)}</span></small></span>
            </span>
            <span className="gm-num gm-score">{formatScore(row.score, english)}</span>
            <span className="gm-strip" aria-label={t(`Esforços medidos: ${scored.map((v) => `${effortLabel(v.effort)} ${formatScore(v.scores[indexKey])}`).join(", ")}`, `Measured efforts: ${scored.map((v) => `${effortLabel(v.effort, true)} ${formatScore(v.scores[indexKey], true)}`).join(", ")}`)}>
              <span className="gm-strip-grid" aria-hidden="true">{ticks.slice(1, -1).map((tick) => <i key={tick} style={{ left: pct(tick) }} />)}</span>
              {scored.length > 1 && <span className="gm-strip-range" style={{ left: pct(row.floor), width: `calc(${pct(row.score)} - ${pct(row.floor)})`, background: color }} />}
              {scored.map((v) => {
                const isTop = v === top;
                return <span key={v.effort} className={`gm-dot${isTop ? " is-top" : ""}`} style={{ left: pct(v.scores[indexKey]!), borderColor: color, background: isTop ? color : "#fff" }} title={`${effortLabel(v.effort, english)}: ${formatScore(v.scores[indexKey], english)}`} />;
              })}
            </span>
            <span className="gm-num gm-cost"><span className="gm-mobile-label">{t("Custo ", "Cost ")}</span>{formatCost(top.costPerTask, english)}</span>
            <span className="gm-num gm-time"><span className="gm-mobile-label">{t("Tempo ", "Time ")}</span>{formatTime(top.e2e, english)}</span>
            <span className="gm-actions">
              {scored.length > 1 && <button type="button" className="gm-ladder-button" aria-expanded={expanded} aria-controls={`gm-ladder-${family.id}`} onClick={() => { setOpen(expanded ? null : family.id); if (!expanded) onEvent("ladder", family.id); }}>
                <span>{t("Escada", "Ladder")}</span><b>{scored.length}</b><ChevronDown size={15} aria-hidden="true" />
              </button>}
              <button type="button" className="gm-add" aria-pressed={selected} disabled={!selected && compare.length >= maxCompare} aria-label={`${selected ? t("Tirar da comparação", "Remove from comparison") : t("Comparar", "Compare")}: ${family.name}`} onClick={() => onToggleCompare(family.id)}>
                {selected ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              </button>
            </span>
          </div>
          {expanded && <Ladder family={family} indexKey={indexKey} color={color} plans={plans} english={english} t={t} id={`gm-ladder-${family.id}`} axisMax={axisMax} />}
        </li>;
      })}
    </ol>
    {rows.length > DEFAULT_ROWS && <button type="button" className="gm-more" onClick={() => { setShowAll(!showAll); onEvent("show_all", String(!showAll)); }}>
      {showAll ? t(`Mostrar só os ${DEFAULT_ROWS} primeiros`, `Show only the top ${DEFAULT_ROWS}`) : t(`Mostrar todos os ${rows.length} modelos`, `Show all ${rows.length} models`)}
    </button>}
  </div>;
}

/* A escada de um modelo: cada esforço com nota, custo e tempo, o que muda de um
   degrau para o outro, e a comparação do modelo com ele mesmo. */
function Ladder({ family, indexKey, color, plans, english, t, id, axisMax }: { family: Family; indexKey: IndexKey; color: string; plans: GuidePlans | null; english: boolean; t: T; id: string; axisMax: number }) {
  const scored = family.variants.filter((v) => v.scores[indexKey] !== null);
  const steps = effortSteps(family, indexKey);
  const fallback = plans?.defaults.get(family.id);
  const [a, setA] = useState(() => scored.find((v) => v.effort === fallback?.effort)?.effort || scored[Math.max(0, Math.floor(scored.length / 2) - 1)]?.effort || scored[0].effort);
  const [b, setB] = useState(() => scored[scored.length - 1].effort);
  const va = scored.find((v) => v.effort === a) || scored[0];
  const vb = scored.find((v) => v.effort === b) || scored[scored.length - 1];
  const diff = compareVariants(va, vb, indexKey);
  const pct = (v: number) => `${(v / axisMax) * 100}%`;

  return <div className="gm-ladder" id={id}>
    <div className="gm-ladder-table" role="table" aria-label={t(`Escada de esforço de ${family.name}`, `${family.name} effort ladder`)}>
      <div className="gm-ladder-row is-head" role="row">
        <span role="columnheader">{t("Esforço", "Effort")}</span>
        <span role="columnheader">{t("Nota", "Score")}</span>
        <span role="columnheader" className="gm-num">{t("Custo/tarefa", "Cost/task")}</span>
        <span role="columnheader" className="gm-num">{t("Tempo", "Time")}</span>
        <span role="columnheader">{t("Em relação ao degrau anterior", "Versus the previous step")}</span>
      </div>
      {scored.map((v, i) => {
        const step = i > 0 ? steps[i - 1] : null;
        const isDefault = fallback?.effort === v.effort;
        return <div key={v.effort} className={`gm-ladder-row${isDefault ? " is-default" : ""}`} role="row">
          <span role="cell" className="gm-ladder-effort"><b>{effortLabel(v.effort, english)}</b>{isDefault && <small>{t("padrão", "default")}</small>}</span>
          <span role="cell" className="gm-ladder-bar"><span style={{ width: pct(v.scores[indexKey]!), background: color }} /><b>{formatScore(v.scores[indexKey], english)}</b></span>
          <span role="cell" className="gm-num">{formatCost(v.costPerTask, english)}</span>
          <span role="cell" className="gm-num">{formatTime(v.e2e, english)}</span>
          <span role="cell" className="gm-ladder-step">{step ? <StepText step={step} english={english} t={t} /> : <small>{t("primeiro degrau medido", "first measured step")}</small>}</span>
        </div>;
      })}
    </div>
    <div className="gm-self">
      <p className="gm-kicker">{t("Compare o modelo com ele mesmo", "Compare the model with itself")}</p>
      <div className="gm-self-pick">
        <label>{t("De", "From")} <select value={va.effort} onChange={(e) => setA(e.target.value)}>{scored.map((v) => <option key={v.effort} value={v.effort}>{effortLabel(v.effort, english)}</option>)}</select></label>
        <label>{t("para", "to")} <select value={vb.effort} onChange={(e) => setB(e.target.value)}>{scored.map((v) => <option key={v.effort} value={v.effort}>{effortLabel(v.effort, english)}</option>)}</select></label>
      </div>
      {va === vb ? <p className="gm-self-result">{t("Escolha dois esforços diferentes.", "Pick two different efforts.")}</p> : <p className="gm-self-result">
        <b>{formatDelta(diff.points, english)} {t("pontos", "points")}</b>{Math.abs(diff.points) < 1 && <em> ({t("empate técnico", "statistical tie")})</em>}
        <span>{t("custo", "cost")} <b>{formatRatio(diff.costRatio, english)}</b></span>
        <span>{t("tempo", "time")} <b>{formatRatio(diff.timeRatio, english)}</b></span>
      </p>}
      {fallback && <p className="gm-self-note">{t("Padrão indicado pelo fabricante", "Manufacturer's default")}: <b>{effortLabel(fallback.effort, english)}</b>{fallback.sourceUrl && <> · <a href={fallback.sourceUrl} target="_blank" rel="noreferrer">{t("fonte", "source")} ↗</a></>}</p>}
      <p className="gm-self-note">{t("Custo e tempo são as medianas da Artificial Analysis por tarefa do índice, não da sua tarefa.", "Cost and time are Artificial Analysis medians per index task, not your own task.")}</p>
    </div>
  </div>;
}

function StepText({ step, english, t }: { step: { points: number; costRatio: number | null; timeRatio: number | null }; english: boolean; t: T }) {
  const tie = Math.abs(step.points) < 1;
  return <span className={tie ? "is-tie" : ""}>
    <b>{formatDelta(step.points, english)}</b> {t("pts", "pts")}{tie && <em> · {t("empate", "tie")}</em>}
    {step.costRatio !== null && <> · {t("custo", "cost")} {formatRatio(step.costRatio, english)}</>}
    {step.timeRatio !== null && <> · {t("tempo", "time")} {formatRatio(step.timeRatio, english)}</>}
  </span>;
}

export function RankingHelp({ english, t }: { english: boolean; t: T }) {
  return <span className="gm-help-inline">
    <InfoTip english={english} label={t("Custo por tarefa", "Cost per task")}>{t("Quanto custou, em média, cada tarefa do índice da Artificial Analysis pela API, somando entrada, raciocínio e saída. Quem usa assinatura não paga por tarefa: o número serve como indicador de quanto o esforço consome.", "The average API cost of each task in the Artificial Analysis index, counting input, reasoning and output. Subscribers don't pay per task: read it as a sign of how much an effort level consumes.")}</InfoTip>
  </span>;
}

