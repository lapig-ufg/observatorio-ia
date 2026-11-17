import { useMemo, useState } from "react";
import type { PanoramaConfig } from "../../panoramaData";
import { effortLabel, formatScore, median, voices, type GuideModels, type GuideSources, type VoicePoint } from "../../guiaModelos";
import { familyColor, Mark, niceMax, useWidth, type T } from "./comum";

const CATEGORIES = [
  { id: "overall", pt: "Conversa em geral", en: "Overall chat" },
  { id: "coding", pt: "Programação", en: "Coding" },
  { id: "creative_writing", pt: "Escrita criativa", en: "Creative writing" },
  { id: "instruction_following", pt: "Seguir instruções", en: "Instruction following" },
];

type Props = { models: GuideModels; sources: GuideSources; config: PanoramaConfig; english: boolean; t: T; onPick: (familyId: string) => void };

/* Duas perguntas diferentes, lado a lado, sem somar: a Artificial Analysis mede
   o acerto em tarefas difíceis; o LMArena mede qual resposta as pessoas
   preferem em comparações às cegas. As linhas de mediana dividem o plano em
   quatro quadrantes; a lista ao lado mostra onde as duas fontes mais discordam. */
export function Vozes({ models, sources, config, english, t, onPick }: Props) {
  const [category, setCategory] = useState("overall");
  const [hover, setHover] = useState<VoicePoint | null>(null);
  const { points, rho } = useMemo(() => voices(models, sources, category), [models, sources, category]);
  const [box, width] = useWidth<HTMLDivElement>();
  const arena = sources.sources.find((s) => s.id === "lmarena");
  if (points.length < 5) return <p className="gm-empty">{t("O LMArena ainda não tem modelos suficientes nesta categoria.", "LMArena doesn't have enough models in this category yet.")}</p>;

  const narrow = width < 560;
  const height = narrow ? 360 : 440;
  const m = { top: 20, right: 18, bottom: 46, left: narrow ? 44 : 54 };
  const xMax = niceMax(Math.max(...points.map((p) => p.aa)) + 3);
  const xMin = Math.max(0, Math.floor((Math.min(...points.map((p) => p.aa)) - 3) / 10) * 10);
  const lows = points.map((p) => p.arena.lower ?? p.arena.rating), highs = points.map((p) => p.arena.upper ?? p.arena.rating);
  const yMin = Math.floor((Math.min(...lows) - 10) / 25) * 25, yMax = Math.ceil((Math.max(...highs) + 10) / 25) * 25;
  const X = (v: number) => m.left + (v - xMin) / (xMax - xMin) * (width - m.left - m.right);
  const Y = (v: number) => m.top + (yMax - v) / (yMax - yMin) * (height - m.top - m.bottom);
  const mx = median(points.map((p) => p.aa))!, my = median(points.map((p) => p.arena.rating))!;
  const yTicks = Array.from({ length: (yMax - yMin) / 25 + 1 }, (_, i) => yMin + i * 25).filter((v, i, arr) => arr.length < 10 || i % 2 === 0);
  const xTicks = Array.from({ length: (xMax - xMin) / 10 + 1 }, (_, i) => xMin + i * 10);
  const liked = [...points].sort((a, b) => b.shift - a.shift).slice(0, 5).filter((p) => p.shift > 2);
  const scored = [...points].sort((a, b) => a.shift - b.shift).slice(0, 5).filter((p) => p.shift < -2);
  const rhoText = rho === null ? "—" : english ? rho.toFixed(2) : rho.toFixed(2).replace(".", ",");
  /* Rótulos só nos casos extremos (os da lista ao lado; no celular, os três de cada lado).
     Cada rótulo vai para o lado com mais espaço e desce quando encosta num vizinho. */
  const labeled = narrow ? [...liked.slice(0, 3), ...scored.slice(0, 3)] : [...liked, ...scored];
  const labels = labeled.map((p) => {
    const px = X(p.aa), py = Y(p.arena.rating), left = px > width - 150;
    return { p, px, py, left, x: px + (left ? -9 : 9), y: py + 4 };
  }).sort((a, b) => a.y - b.y);
  labels.forEach((l, i) => {
    for (let j = 0; j < i; j++) {
      const o = labels[j];
      if (o.left === l.left && Math.abs(o.x - l.x) < 130 && l.y - o.y < 13) l.y = o.y + 13;
    }
  });

  return <div className="gm-voices">
    <div className="gm-segmented" role="group" aria-label={t("Categoria do LMArena", "LMArena category")}>
      {CATEGORIES.map((c) => <button type="button" key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{english ? c.en : c.pt}</button>)}
    </div>
    <div className="gm-voices-grid">
      <figure className="gm-figure">
        <div ref={box} className="gm-chart-box" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={t("Nota da Artificial Analysis contra o Elo do LMArena, um ponto por modelo", "Artificial Analysis score versus LMArena Elo, one dot per model")}>
            <rect x={X(mx)} y={m.top} width={width - m.right - X(mx)} height={Y(my) - m.top} className="gm-quad is-both" />
            {yTicks.map((v) => <g key={v}><line x1={m.left} x2={width - m.right} y1={Y(v)} y2={Y(v)} className="gm-grid" /><text x={m.left - 8} y={Y(v) + 4} className="gm-tick" textAnchor="end">{v}</text></g>)}
            {xTicks.map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={m.top} y2={height - m.bottom} className="gm-grid gm-grid-v" /><text x={X(v)} y={height - m.bottom + 16} className="gm-tick" textAnchor="middle">{v}</text></g>)}
            <line x1={X(mx)} x2={X(mx)} y1={m.top} y2={height - m.bottom} className="gm-median" />
            <line x1={m.left} x2={width - m.right} y1={Y(my)} y2={Y(my)} className="gm-median" />
            {!narrow && <>
              <text x={width - m.right - 6} y={m.top + 14} className="gm-quad-label" textAnchor="end">{t("acima da mediana nas duas", "above the median in both")}</text>
              <text x={m.left + 6} y={m.top + 14} className="gm-quad-label">{t("preferido além da nota", "preferred beyond its score")}</text>
              <text x={width - m.right - 6} y={height - m.bottom - 8} className="gm-quad-label" textAnchor="end">{t("nota além da preferência", "score beyond preference")}</text>
            </>}
            <text x={width - m.right} y={height - 8} className="gm-axis-title" textAnchor="end">{t("capacidade · nota da Artificial Analysis →", "capability · Artificial Analysis score →")}</text>
            <text x={m.left} y={m.top - 6} className="gm-axis-title">{t("↑ preferência · Elo do LMArena", "↑ preference · LMArena Elo")}</text>
            {points.map((p) => {
              const color = familyColor(p.family.creator, config);
              return <g key={p.family.id} className="gm-point" onMouseEnter={() => setHover(p)} onClick={() => { setHover(p); onPick(p.family.id); }}>
                {p.arena.lower !== null && p.arena.upper !== null && <line x1={X(p.aa)} x2={X(p.aa)} y1={Y(p.arena.lower)} y2={Y(p.arena.upper)} stroke={color} strokeWidth={1.4} opacity={0.55} />}
                <circle cx={X(p.aa)} cy={Y(p.arena.rating)} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
              </g>;
            })}
            {labels.map((l) => <g key={`l-${l.p.family.id}`}>
              {Math.abs(l.y - l.py) > 3 && <line x1={l.px} y1={l.py} x2={l.x + (l.left ? 2 : -2)} y2={l.y - 4} className="gm-leader" />}
              <text x={l.x} y={l.y} textAnchor={l.left ? "end" : "start"} className="gm-voice-label">{l.p.family.name}</text>
            </g>)}
            {hover && <circle cx={X(hover.aa)} cy={Y(hover.arena.rating)} r={9} className="gm-hover-ring" />}
          </svg>
          {hover && <div className="gm-tooltip" style={{ left: Math.min(width - 230, Math.max(0, X(hover.aa) + 12)), top: Math.max(0, Y(hover.arena.rating) - 80) }}>
            <strong>{hover.family.name}</strong>
            <span>{t("AA", "AA")} <b>{formatScore(hover.aa, english)}</b> ({effortLabel(hover.aaVariant.effort, english)}) · {t(`${hover.aaRank}º`, `#${hover.aaRank}`)}</span>
            <span>LMArena <b>{Math.round(hover.arena.rating)}</b>{hover.arena.lower !== null && ` (${Math.round(hover.arena.lower)}–${Math.round(hover.arena.upper!)})`}{hover.arenaEffort ? ` · ${effortLabel(hover.arenaEffort, english)}` : ""} · {t(`${hover.arenaRank}º`, `#${hover.arenaRank}`)}</span>
          </div>}
        </div>
        <figcaption className="gm-caption">{t(`${points.length} modelos com as duas medidas. Correlação de postos entre as fontes: ${rhoText} (1 seria a mesma ordem). A cor de cada ponto é a da empresa; a barra vertical é o intervalo de confiança do LMArena; cada fonte aparece no esforço em que mediu.`, `${points.length} models with both measures. Rank correlation between the sources: ${rhoText} (1 would be the same order). Each dot takes its company's color; the vertical bar is LMArena's confidence interval; each source appears at the effort it measured.`)}</figcaption>
      </figure>
      <div className="gm-disagree">
        <h4>{t("Mais preferido do que a nota indica", "Preferred more than the score suggests")}</h4>
        <ol>{liked.map((p) => <li key={p.family.id}><button type="button" onClick={() => onPick(p.family.id)}><Mark company={p.family.creator} config={config} size={20} /><span>{p.family.name}</span><b className="is-up">↑{p.shift}</b></button></li>)}</ol>
        <h4>{t("Nota maior do que a preferência", "Scores higher than its preference")}</h4>
        <ol>{scored.map((p) => <li key={p.family.id}><button type="button" onClick={() => onPick(p.family.id)}><Mark company={p.family.creator} config={config} size={20} /><span>{p.family.name}</span><b className="is-down">↓{-p.shift}</b></button></li>)}</ol>
        <p className="gm-note">{t("Posições ganhas ou perdidas no LMArena em relação à ordem da Artificial Analysis, entre os modelos do gráfico.", "Positions gained or lost on LMArena relative to the Artificial Analysis order, among the models in the chart.")}{arena?.url && <> <a href={arena.url} target="_blank" rel="noreferrer">{"LMArena\u00a0↗"}</a></>}</p>
      </div>
    </div>
  </div>;
}
