import { useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Chains } from "./backward";
import { formatNumber } from "./math";
import type { Snapshot } from "./network";
import type { Selection } from "./playground-state";

const NODE_R = 18;
const COL_GAP = 170;
const ROW_GAP = 60;
const MARGIN = 46;

function nodeY(count: number, index: number, rows: number) {
  const mid = (rows * ROW_GAP) / 2;
  return mid + (index - (count - 1) / 2) * ROW_GAP;
}

function columnName(snapshot: Snapshot, col: number) {
  if (col === 0) return "entrada";
  if (col === snapshot.topology.length - 1) return "saída";
  return `oculta ${col}`;
}

interface TooltipState {
  x: number;
  y: number;
  lines: string[];
}

export function NetworkCanvas({
  snapshot,
  values,
  deltas,
  loss,
  chains,
  hotLayer,
  errLayers,
  lossHot,
  selection,
  onSelect,
  onClear,
}: {
  snapshot: Snapshot | null;
  values: Record<string, number>;
  deltas: Record<string, number>;
  loss: number | null;
  chains: Chains | null;
  hotLayer: number | null;
  errLayers: number[];
  lossHot: boolean;
  selection: Selection;
  onSelect: (selection: Exclude<Selection, null>) => void;
  onClear: () => void;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  if (!snapshot) {
    return (
      <div className="nn-canvas-empty">
        <b>A rede ainda não foi construída.</b>
        <span>Execute o script da etapa 1 para desenhar as camadas, os pesos e os vieses.</span>
      </div>
    );
  }

  const t = snapshot.topology;
  const rows = Math.max(...t);
  const withLoss = loss !== null;
  const columns = t.length + (withLoss ? 1 : 0);
  const height = rows * ROW_GAP + MARGIN * 2;
  const width = (columns - 1) * COL_GAP + MARGIN * 2 + (withLoss ? NODE_R : 0);
  const displayWidth = Math.max(width, 720);

  const biasFor = (column: number, n: number) => {
    const bias = snapshot.bias_mats[column - 1];
    return bias ? bias[0][n] : null;
  };

  const columnX = (col: number) => MARGIN + col * COL_GAP;

  const chainFor = (kind: string, dataset: DOMStringMap): Chains[string] | null => {
    if (!chains) return null;
    if (kind === "loss-node") return chains.loss ?? null;
    if (kind === "edge") {
      const i = dataset.i;
      const j = dataset.j;
      const k = dataset.k;
      return i !== undefined && j !== undefined && k !== undefined ? chains[`edge:${i}-${j}-${k}`] ?? null : null;
    }
    if (kind === "node") {
      const col = Number(dataset.col);
      const n = Number(dataset.n);
      const node = chains[`node:${col}-${n}`];
      if (node) return node;
      return col > 0 ? chains[`bias:${col - 1}-${n}`] ?? null : null;
    }
    return null;
  };

  const tooltipLines = (kind: string, dataset: DOMStringMap): string[] | null => {
    const chain = chainFor(kind, dataset);
    if (chain) {
      return [
        chain.label,
        ...chain.hops.map((hop) => `  ${hop.symbol}`),
        `gradiente = ${formatNumber(chain.gradient)}`,
      ];
    }

    if (kind === "layer") {
      return [`Clique para ver as matrizes W e B da camada ${columnName(snapshot, Number(dataset.col))}.`];
    }
    if (kind === "loss-node") {
      return ["A perda aparece depois da primeira chamada de nn.backward(...)."];
    }
    if (kind === "edge") {
      const weight = Number(dataset.w);
      return [
        `w = ${weight >= 0 ? "+" : ""}${formatNumber(weight)}`,
        `camada ${Number(dataset.i) + 1} · neurônio ${Number(dataset.j) + 1} → ${Number(dataset.k) + 1}`,
      ];
    }
    if (kind === "loss-edge") {
      return [`O neurônio de saída ${Number(dataset.out) + 1} envia seu erro ao nó de perda.`];
    }
    if (kind === "node") {
      const col = Number(dataset.col);
      const n = Number(dataset.n);
      const lines: string[] = [];
      const value = values[`${col}-${n}`];
      if (value !== undefined) lines.push(`ativação = ${formatNumber(value)}`);
      const bias = col > 0 ? biasFor(col, n) : null;
      if (bias !== null) lines.push(`viés = ${formatNumber(bias)}`);
      if (lines.length === 0) lines.push("Ainda sem valor nesta execução.");
      lines.push("Clique para inspecionar este neurônio.");
      return lines;
    }
    return null;
  };

  const showTooltip = (event: ReactMouseEvent, kind: string, dataset: DOMStringMap) => {
    const lines = tooltipLines(kind, dataset);
    if (!lines) {
      setTooltip(null);
      return;
    }
    const left = Math.min(event.clientX + 14, window.innerWidth - 320);
    const top = Math.min(event.clientY + 14, window.innerHeight - 180);
    setTooltip({ x: Math.max(8, left), y: Math.max(8, top), lines });
  };

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = (event.target as Element).closest("[data-kind]") as SVGElement | null;
    if (!target) {
      setTooltip(null);
      setHoveredEdge(null);
      return;
    }
    const kind = target.dataset.kind ?? "";
    const edgeId = kind === "edge" || kind === "loss-edge" ? target.dataset.edge ?? null : null;
    setHoveredEdge(edgeId);
    showTooltip(event, kind, target.dataset);
  };

  const handleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = (event.target as Element).closest("[data-kind]") as SVGElement | null;
    if (!target) {
      onClear();
      return;
    }
    const kind = target.dataset.kind;
    if (kind === "node") {
      onSelect({ kind: "node", col: Number(target.dataset.col), n: Number(target.dataset.n) });
    } else if (kind === "layer") {
      onSelect({ kind: "layer", col: Number(target.dataset.col) });
    } else {
      onClear();
    }
  };

  return (
    <div className="nn-canvas-wrap">
      <svg
        className="nn-canvas"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: `${displayWidth}px` }}
        role="group"
        aria-label="Rede neural: camadas, neurônios e pesos"
        onMouseMove={handleMove}
        onMouseLeave={() => {
          setTooltip(null);
          setHoveredEdge(null);
        }}
        onClick={handleClick}
      >
        {t.map((_, col) => (
          <rect
            key={`hit-${col}`}
            className={`nn-layer-hit ${selection?.kind === "layer" && selection.col === col ? "is-selected" : ""}`}
            data-kind="layer"
            data-col={col}
            x={columnX(col) - 70}
            y={0}
            width={140}
            height={height}
            rx={12}
          />
        ))}

        {snapshot.weight_mats.map((matrix, i) =>
          matrix.map((row, j) =>
            row.map((weight, k) => {
              const id = `edge-${i}-${j}-${k}`;
              const x1 = columnX(i) + NODE_R;
              const x2 = columnX(i + 1) - NODE_R;
              const y1 = MARGIN + nodeY(t[i], j, rows);
              const y2 = MARGIN + nodeY(t[i + 1], k, rows);
              const color = weight >= 0 ? "var(--nn-pos)" : "var(--nn-neg)";
              const strokeWidth = Math.min(4.5, 0.7 + Math.abs(weight) * 1.6);
              return (
                <g key={id}>
                  <line
                    className={`nn-edge ${hotLayer === i ? "is-hot" : ""} ${errLayers.includes(i) ? "is-err" : ""} ${
                      hoveredEdge === id ? "is-hover" : ""
                    }`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth={strokeWidth}
                  />
                  <line
                    className="nn-edge-hit"
                    data-kind="edge"
                    data-edge={id}
                    data-i={i}
                    data-j={j}
                    data-k={k}
                    data-w={weight}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                </g>
              );
            }),
          ),
        )}

        {withLoss && (
          <>
            {Array.from({ length: t[t.length - 1] }, (_, k) => {
              const x1 = columnX(t.length - 1) + NODE_R;
              const x2 = columnX(t.length) + NODE_R - NODE_R;
              const y1 = MARGIN + nodeY(t[t.length - 1], k, rows);
              const y2 = MARGIN + (rows * ROW_GAP) / 2;
              return (
                <g key={`loss-edge-${k}`}>
                  <line
                    className={`nn-loss-edge ${lossHot ? "is-hot" : ""}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                  <line
                    className="nn-edge-hit"
                    data-kind="loss-edge"
                    data-edge={`loss-edge-${k}`}
                    data-out={k}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                </g>
              );
            })}
            <g
              className={`nn-node nn-loss-node ${lossHot ? "is-lit" : ""}`}
              data-kind="loss-node"
              transform={`translate(${columnX(t.length) + NODE_R}, ${MARGIN + (rows * ROW_GAP) / 2})`}
            >
              <circle r={NODE_R} />
              <text y={4}>{loss !== null ? formatNumber(loss) : ""}</text>
            </g>
            <text className="nn-layer-label" x={columnX(t.length) + NODE_R} y={MARGIN - NODE_R - 12}>
              perda
            </text>
          </>
        )}

        {t.map((count, col) => {
          const isInput = col === 0;
          const isOutput = col === t.length - 1;
          return (
            <g key={`column-${col}`}>
              {Array.from({ length: count }, (_, n) => {
                const key = `${col}-${n}`;
                const value = values[key];
                const delta = deltas[key];
                const selected = selection?.kind === "node" && selection.col === col && selection.n === n;
                return (
                  <g
                    key={key}
                    className={`nn-node ${value !== undefined ? "is-lit" : ""} ${delta !== undefined ? "is-signaled" : ""} ${
                      selected ? "is-selected" : ""
                    } ${hotLayer === col - 1 ? "is-hot" : ""}`}
                    data-kind="node"
                    data-col={col}
                    data-n={n}
                    transform={`translate(${columnX(col)}, ${MARGIN + nodeY(count, n, rows)})`}
                  >
                    <circle r={NODE_R} />
                    <text y={4}>{value !== undefined ? formatNumber(value) : ""}</text>
                    <text className="nn-delta-tag" y={NODE_R + 11}>
                      {delta !== undefined ? `δ ${formatNumber(delta)}` : ""}
                    </text>
                  </g>
                );
              })}
              <text
                className={`nn-layer-label ${selection?.kind === "layer" && selection.col === col ? "is-selected" : ""}`}
                data-kind="layer"
                data-col={col}
                x={columnX(col)}
                y={MARGIN - NODE_R - 12}
              >
                {isInput ? `entrada · ${count}` : isOutput ? `saída · ${count}` : `oculta ${col} · ${count}`}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div className="nn-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="status">
          {tooltip.lines.map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </div>
      )}
    </div>
  );
}
