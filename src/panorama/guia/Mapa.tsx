import { useMemo, useState } from "react";
import type { PanoramaConfig } from "../../panoramaData";
import {
  chartPoints, effortLabel, formatCost, formatScore, formatTime, frontier,
  type Axis, type Family, type GuideModels, type IndexKey, type Point,
} from "../../guiaModelos";
import { familyColor, indexLabel, logTicks, Mark, niceMax, useWidth, type T } from "./comum";

type Props = {
  models: GuideModels;
  highlighted: Family[];
  indexKey: IndexKey;
  axis: Axis;
  config: PanoramaConfig;
  english: boolean;
  t: T;
  onPick: (familyId: string) => void;
};

/* Nota × custo (ou × tempo). Cada modelo em destaque é uma linha que liga os
   seus esforços, do mais barato ao mais caro: a inclinação mostra quanto cada
   degrau rende. Os demais modelos ficam como pontos claros de fundo. A
   fronteira tracejada liga quem ninguém supera com nota maior e custo menor. */
export function Mapa({ models, highlighted, indexKey, axis, config, english, t, onPick }: Props) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Point | null>(null);
  const [legendFocus, setLegendFocus] = useState<string | null>(null);
  const all = useMemo(() => chartPoints(models.families, indexKey, axis), [models, indexKey, axis]);
  const front = useMemo(() => frontier(all), [all]);
  const ids = new Set(highlighted.map((f) => f.id));
  const focus = legendFocus || (hover && ids.has(hover.family.id) ? hover.family.id : null);
  const narrow = width < 560;
  const height = narrow ? 340 : 430;
  const m = { top: 18, right: narrow ? 14 : 24, bottom: 46, left: narrow ? 38 : 50 };
  const xs = all.map((p) => p.x);
  const xMin = Math.min(...xs) * 0.8, xMax = Math.max(...xs) * 1.25;
  const yMax = niceMax(Math.max(...all.map((p) => p.score)) + 3);
  const yMin = Math.max(0, Math.floor((Math.min(...all.map((p) => p.score)) - 3) / 10) * 10);
  const X = (v: number) => m.left + (Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * (width - m.left - m.right);
  const Y = (v: number) => m.top + (yMax - v) / (yMax - yMin) * (height - m.top - m.bottom);
  const ticks = logTicks(xMin, xMax);
  const fmtX = (v: number) => axis === "cost" ? formatCost(v, english).replace("US$ ", "$") : formatTime(v, english);
  const yTicks = Array.from({ length: (yMax - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);

  return <figure className="gm-figure">
    <div ref={box} className={`gm-chart-box${focus ? " has-focus" : ""}`} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={t(`Nota em ${indexLabel(indexKey, false)} contra ${axis === "cost" ? "custo por tarefa" : "tempo de resposta"}, escala logarítmica`, `${indexLabel(indexKey, true)} score versus ${axis === "cost" ? "cost per task" : "response time"}, log scale`)}>
        {yTicks.map((v) => <g key={v}><line x1={m.left} x2={width - m.right} y1={Y(v)} y2={Y(v)} className="gm-grid" /><text x={m.left - 8} y={Y(v) + 4} className="gm-tick" textAnchor="end">{v}</text></g>)}
        {ticks.map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={m.top} y2={height - m.bottom} className="gm-grid gm-grid-v" /><text x={X(v)} y={height - m.bottom + 16} className="gm-tick" textAnchor="middle">{fmtX(v)}</text></g>)}
        <text x={width - m.right} y={height - 8} className="gm-axis-title" textAnchor="end">{axis === "cost" ? t("custo por tarefa (escala log) →", "cost per task (log scale) →") : t("tempo de resposta (escala log) →", "response time (log scale) →")}</text>
        <text x={m.left} y={m.top - 6} className="gm-axis-title">{t("↑ nota", "↑ score")}</text>
        <polyline points={front.map((p) => `${X(p.x)},${Y(p.score)}`).join(" ")} className="gm-frontier" />
        {all.filter((p) => !ids.has(p.family.id)).map((p) => <circle key={`${p.family.id}-${p.variant.effort}`} cx={X(p.x)} cy={Y(p.score)} r={3.2} className="gm-bg-dot" onMouseEnter={() => setHover(p)} onClick={() => onPick(p.family.id)} />)}
        {highlighted.map((family) => {
          const pts = all.filter((p) => p.family.id === family.id).sort((a, b) => a.x - b.x);
          const color = familyColor(family.creator, config);
          return <g key={family.id} className={`gm-series${focus === family.id ? " is-focus" : ""}`}>
            <polyline points={pts.map((p) => `${X(p.x)},${Y(p.score)}`).join(" ")} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => <g key={p.variant.effort} onMouseEnter={() => setHover(p)} onClick={() => setHover(p)} className="gm-point">
              <circle cx={X(p.x)} cy={Y(p.score)} r={i === pts.length - 1 ? 6 : 4.6} fill={i === pts.length - 1 ? color : "#fff"} stroke={color} strokeWidth={2} />
              {focus === family.id && <text x={X(p.x) + 7} y={Y(p.score) - 8} className="gm-point-label">{effortLabel(p.variant.effort, english)}</text>}
            </g>)}
          </g>;
        })}
        {hover && <circle cx={X(hover.x)} cy={Y(hover.score)} r={9} className="gm-hover-ring" />}
      </svg>
      {hover && <div className="gm-tooltip" style={{ left: Math.min(width - 210, Math.max(0, X(hover.x) + 12)), top: Math.max(0, Y(hover.score) - 70) }}>
        <strong>{hover.family.name}</strong>
        <span>{t("esforço", "effort")} {effortLabel(hover.variant.effort, english)}</span>
        <span>{t("nota", "score")} <b>{formatScore(hover.score, english)}</b></span>
        <span>{t("custo", "cost")} {formatCost(hover.variant.costPerTask, english)} · {t("tempo", "time")} {formatTime(hover.variant.e2e, english)}</span>
      </div>}
    </div>
    <figcaption className="gm-legend">
      {highlighted.map((family) => <button type="button" key={family.id} onClick={() => onPick(family.id)} onMouseEnter={() => setLegendFocus(family.id)} onMouseLeave={() => setLegendFocus(null)} onFocus={() => setLegendFocus(family.id)} onBlur={() => setLegendFocus(null)} title={t("Tirar do destaque", "Remove highlight")}><Mark company={family.creator} config={config} size={18} /><span style={{ borderBottomColor: familyColor(family.creator, config) }}>{family.name}</span><span aria-hidden="true">×</span></button>)}
      <span className="gm-legend-key"><i className="gm-key-line" />{t("trajetória do low ao max", "path from low to max")}</span>
      <span className="gm-legend-key"><i className="gm-key-frontier" />{t("fronteira: ninguém faz mais por menos", "frontier: nobody does more for less")}</span>
    </figcaption>
  </figure>;
}
