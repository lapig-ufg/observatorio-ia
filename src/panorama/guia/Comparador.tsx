import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PanoramaConfig } from "../../panoramaData";
import {
  INDEX_KEYS, ceiling, effortLabel, fieldMedians, formatCost, formatDelta, formatRatio, formatScore, formatTime, indexPositions, similarTo,
  type Family, type GuideModels, type GuidePlans, type GuideSources, type IndexKey,
} from "../../guiaModelos";
import { familyColor, indexLabel, Mark, niceMax, useWidth, type T } from "./comum";
import { ARENA_ROWS, arenaFor } from "./Equipe";

type Props = { families: Family[]; models: GuideModels; sources: GuideSources | null; plans: GuidePlans | null; indexKey: IndexKey; config: PanoramaConfig; english: boolean; t: T; onClose: () => void; onAdd: (id: string) => void };

/* Mesmo padrão do diálogo antigo: <dialog> nativo, foco preso na folha, fundo
   inerte e o foco devolvido ao fechar. */
export function Comparador({ families, models, sources, plans, indexKey, config, english, t, onClose, onAdd }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [relative, setRelative] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  const medians = useMemo(() => fieldMedians(models), [models]);
  const positions = useMemo(() => indexPositions(models), [models]);
  const colors = families.map((f, i) => {
    const base = familyColor(f.creator, config);
    return families.findIndex((g) => g.creator === f.creator) === i ? base : ["#1d6650", "#d76832", "#243a5a", "#8a5a0c"][i];
  });
  const first = families[0];
  const firstRef = first ? (plans?.defaults.get(first.id) && first.variants.find((v) => v.effort === plans.defaults.get(first.id)!.effort)) || ceiling(first, indexKey) : null;
  const similar = first && firstRef ? similarTo(models, first, firstRef, indexKey, 2).filter((s) => !families.some((f) => f.id === s.family.id)).slice(0, 6) : [];

  return <dialog ref={ref} className="gm-dialog" aria-labelledby="gm-compare-title" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="gm-dialog-body">
      <header className="gm-dialog-head">
        <h2 id="gm-compare-title">{t("Comparar modelos", "Compare models")}</h2>
        <button type="button" className="gm-icon-button" onClick={onClose} aria-label={t("Fechar comparação", "Close comparison")} autoFocus><X size={20} aria-hidden="true" /></button>
      </header>

      <div className="gm-compare-cards" style={{ gridTemplateColumns: `repeat(${families.length}, minmax(0, 1fr))` }}>
        {families.map((f, i) => {
          const top = ceiling(f, "intelligence");
          const def = plans?.defaults.get(f.id);
          return <section key={f.id} className="gm-compare-card" style={{ borderTopColor: colors[i] }}>
            <Mark company={f.creator} config={config} size={30} />
            <h3>{f.name}</h3>
            <small>{f.creator}{f.releaseDate ? ` · ${f.releaseDate.slice(0, 7).split("-").reverse().join("/")}` : ""}</small>
            <p><b>{formatScore(top?.scores.intelligence ?? null, english)}</b> {t("no melhor resultado", "at its best")} ({effortLabel(top?.effort || "", english)})</p>
            {def && <p className="gm-note">{t("padrão do fabricante", "manufacturer default")}: {effortLabel(def.effort, english)}</p>}
          </section>;
        })}
      </div>

      <section className="gm-compare-block">
        <div className="gm-block-head">
          <h3>{t("Os 7 índices, no melhor resultado de cada modelo", "The 7 indices, at each model's best")}</h3>
          <div className="gm-segmented gm-segmented-sm" role="group" aria-label={t("Como ler o índice", "How to read the index")}>
            <button type="button" aria-pressed={!relative} onClick={() => setRelative(false)}>{t("nota", "score")}</button>
            <button type="button" aria-pressed={relative} onClick={() => setRelative(true)}>{t("em relação à mediana", "versus the median")}</button>
          </div>
        </div>
        <DotPlot families={families} colors={colors} medians={medians} relative={relative} english={english} t={t} positions={positions} />
        <p className="gm-note">{relative ? t("Pontos à direita da linha central estão acima da mediana dos modelos medidos naquele índice. Assim aparece o que é próprio de cada modelo: “Estratégia” costuma ter as notas mais altas para todos, e a escala crua faria todos parecerem estrategistas.", "Dots to the right of the center line are above the median of measured models on that index. This shows what is specific to each model: “Strategy” tends to score highest for everyone, and the raw scale would make all of them look like strategists.") : t("Mesma escala de 0 a 100 em todos os índices. A Artificial Analysis não publica a composição dos índices de domínio; só a do índice geral.", "The same 0–100 scale for every index. Artificial Analysis doesn't publish how the domain indices are built; only the overall index.")}</p>
      </section>

      <section className="gm-compare-block">
        <h3>{t("A escada de esforço de cada um", "Each model's effort ladder")}</h3>
        <div className="gm-compare-ladders" style={{ gridTemplateColumns: `repeat(${families.length}, minmax(0, 1fr))` }}>
          {families.map((f, i) => <div key={f.id}>
            <p className="gm-kicker" style={{ color: colors[i] }}>{f.name}</p>
            <table className="gm-mini-table"><thead><tr><th>{t("esforço", "effort")}</th><th>{t("nota", "score")}</th><th>{t("custo", "cost")}</th><th>{t("tempo", "time")}</th></tr></thead>
              <tbody>{f.variants.filter((v) => v.scores[indexKey] !== null).map((v) => <tr key={v.effort}><th>{effortLabel(v.effort, english)}</th><td>{formatScore(v.scores[indexKey], english)}</td><td>{formatCost(v.costPerTask, english)}</td><td>{formatTime(v.e2e, english)}</td></tr>)}</tbody>
            </table>
          </div>)}
        </div>
        <p className="gm-note">{t(`Nota em ${indexLabel(indexKey, false)}.`, `Score in ${indexLabel(indexKey, true)}.`)}</p>
      </section>

      {sources && <section className="gm-compare-block">
        <h3>{t("O que dizem as outras fontes", "What the other sources say")}</h3>
        <div className="gm-sources-grid" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${families.length}, minmax(0, 1fr))` }}>
          <span />{families.map((f, i) => <b key={f.id} style={{ color: colors[i] }}>{f.name}</b>)}
          {ARENA_ROWS.map((row) => <Row key={row.id} label={`LMArena · ${english ? row.en : row.pt}`} cells={families.map((f) => {
            const c = arenaFor(sources, f, row.id);
            return c ? <>{Math.round(c.interval.rating)}<small>{c.interval.lower !== null ? ` ±${Math.round((c.interval.upper! - c.interval.lower) / 2)}` : ""} · {c.effort ? effortLabel(c.effort, english) : "—"}</small></> : <span className="gm-na">—</span>;
          })} />)}
          {epochRows(families, sources).map((row) => <Row key={row.key} label={`Epoch · ${row.label}`} cells={row.cells.map((v) => v === null ? <span className="gm-na">—</span> : <>{formatScore(v, english)}%</>)} />)}
        </div>
        <p className="gm-note">{t("Cada fonte mede outra coisa e, em geral, num esforço só: o LMArena mede preferência em conversas às cegas; o Epoch, acerto em testes de ciência e matemática. As notas não se somam. O Vals AI não permite republicar os números: veja no site dele.", "Each source measures something else, usually at a single effort: LMArena measures preference in blind chats; Epoch, accuracy on science and math tests. The scores don't add up. Vals AI doesn't allow its numbers to be republished: see its site.")} <a href="https://www.vals.ai/benchmarks" target="_blank" rel="noreferrer">Vals AI ↗</a></p>
      </section>}

      {first && firstRef && <section className="gm-compare-block">
        <h3>{t(`Entregam parecido com ${first.name} (${effortLabel(firstRef.effort)})`, `Similar to ${first.name} (${effortLabel(firstRef.effort, true)})`)}</h3>
        <p className="gm-note">{t(`Até 2 pontos de diferença em ${indexLabel(indexKey, false)}, em qualquer esforço. Custo e tempo em vezes o do modelo de referência; a última coluna mostra o índice em que cada um fica mais abaixo.`, `Up to 2 points apart in ${indexLabel(indexKey, true)}, at any effort. Cost and time as multiples of the reference model; the last column shows the index where each one falls furthest behind.`)}</p>
        {similar.length ? <table className="gm-similar"><thead><tr><th>{t("Modelo", "Model")}</th><th>{t("Nota", "Score")}</th><th>{t("Custo", "Cost")}</th><th>{t("Tempo", "Time")}</th><th>{t("Onde fica mais abaixo", "Where it trails most")}</th><th /></tr></thead>
          <tbody>{similar.map((s) => <tr key={`${s.family.id}-${s.variant.effort}`}>
            <th><Mark company={s.family.creator} config={config} size={18} /> {s.family.name} <small>{effortLabel(s.variant.effort, english)}</small></th>
            <td>{formatDelta(s.delta, english)}</td><td>{formatRatio(s.costRatio, english)}</td><td>{formatRatio(s.timeRatio, english)}</td>
            <td>{s.worst && s.worst.delta < 0 ? `${indexLabel(s.worst.key, english, true)} ${formatDelta(s.worst.delta, english)}` : t("nenhum", "none")}</td>
            <td>{families.length < 4 && <button type="button" className="gm-link-button" onClick={() => onAdd(s.family.id)}>{t("comparar", "compare")}</button>}</td>
          </tr>)}</tbody></table> : <p className="gm-empty">{t("Nenhum outro modelo fica a até 2 pontos.", "No other model is within 2 points.")}</p>}
      </section>}
    </div>
  </dialog>;
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return <><span className="gm-sources-label">{label}</span>{cells.map((c, i) => <span key={i} className="gm-sources-cell">{c}</span>)}</>;
}

function epochRows(families: Family[], sources: GuideSources) {
  const counts = new Map<string, { label: string; n: number }>();
  for (const f of families) for (const b of sources.families.get(f.id)?.epoch?.benchmarks || []) counts.set(b.key, { label: b.label, n: (counts.get(b.key)?.n || 0) + 1 });
  return [...counts.entries()].filter(([, v]) => v.n >= Math.min(2, families.length)).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([key, v]) => ({
    key, label: v.label,
    cells: families.map((f) => sources.families.get(f.id)?.epoch?.benchmarks.find((b) => b.key === key)?.score ?? null),
  }));
}

function DotPlot({ families, colors, medians, relative, english, t, positions }: { families: Family[]; colors: string[]; medians: Record<IndexKey, number | null>; relative: boolean; english: boolean; t: T; positions: ReturnType<typeof indexPositions> }) {
  const [box, width] = useWidth<HTMLDivElement>(640);
  const labelW = width < 520 ? 92 : 170;
  const rowH = 34;
  const values = families.map((f) => INDEX_KEYS.map((k) => ceiling(f, k)?.scores[k] ?? null));
  const deltas = values.map((vs) => vs.map((v, i) => v === null || medians[INDEX_KEYS[i]] === null ? null : v - medians[INDEX_KEYS[i]]!));
  const raw = values.flat().filter((v): v is number => v !== null);
  const span = relative ? Math.max(5, ...deltas.flat().filter((v): v is number => v !== null).map(Math.abs)) + 2 : niceMax(Math.max(...raw) + 2);
  // Na nota crua, o eixo começa perto do menor valor (marcado no eixo), para os pontos não se amontoarem.
  const floor = relative ? 0 : Math.max(0, Math.floor((Math.min(...raw) - 5) / 10) * 10);
  const x0 = labelW + 8, x1 = width - 14;
  const X = (v: number) => relative ? x0 + (v + span) / (2 * span) * (x1 - x0) : x0 + (v - floor) / (span - floor) * (x1 - x0);
  const height = INDEX_KEYS.length * rowH + 26;
  return <div ref={box} className="gm-chart-box">
    <svg width={width} height={height} role="img" aria-label={t("Os sete índices de cada modelo em pontos", "Each model's seven indices as dots")}>
      {relative ? <line x1={X(0)} x2={X(0)} y1={4} y2={height - 22} className="gm-median" /> : [floor, (floor + span) / 2, span].map((v) => <text key={v} x={X(v)} y={height - 6} className="gm-tick" textAnchor="middle">{Math.round(v)}</text>)}
      {relative && <><text x={X(-span)} y={height - 6} className="gm-tick">{t("abaixo da mediana", "below median")}</text><text x={X(span)} y={height - 6} className="gm-tick" textAnchor="end">{t("acima", "above")}</text></>}
      {INDEX_KEYS.map((key, r) => {
        const y = 14 + r * rowH;
        return <g key={key}>
          <line x1={x0} x2={x1} y1={y} y2={y} className="gm-grid" />
          <text x={labelW} y={y + 4} className="gm-row-label" textAnchor="end">{indexLabel(key, english, width < 520)}</text>
          {families.map((f, i) => {
            const v = relative ? deltas[i][r] : values[i][r];
            const pos = positions.get(f.id)?.[key];
            if (v === null) return <text key={f.id} x={x1} y={y + 4} className="gm-tick" textAnchor="end">{i === 0 ? t("sem medida", "not measured") : ""}</text>;
            return <circle key={f.id} cx={X(v)} cy={y + (i - (families.length - 1) / 2) * 3} r={6} fill={colors[i]} stroke="#fff" strokeWidth={1.5}>
              <title>{`${f.name} · ${indexLabel(key, english)}: ${formatScore(values[i][r], english)}${pos ? ` · ${pos.position}/${pos.total}` : ""}`}</title>
            </circle>;
          })}
        </g>;
      })}
    </svg>
  </div>;
}
