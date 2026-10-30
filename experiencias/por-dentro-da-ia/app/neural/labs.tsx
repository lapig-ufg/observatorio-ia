import { useState } from "react";
import { activationScalar, formatNumber } from "./math";

function Plot({
  title,
  fn,
  minY,
  maxY,
  pointX,
  pointY,
  color,
}: {
  title: string;
  fn: (x: number) => number;
  minY: number;
  maxY: number;
  pointX: number;
  pointY: number;
  color: string;
}) {
  const width = 320;
  const height = 200;
  const left = 38;
  const right = 14;
  const top = 22;
  const bottom = 28;
  const x0 = -3;
  const x3 = 3;
  const xMap = (x: number) => left + ((x - x0) / (x3 - x0)) * (width - left - right);
  const yMap = (y: number) => height - bottom - ((y - minY) / (maxY - minY)) * (height - top - bottom);
  const points = Array.from({ length: 81 }, (_, index) => {
    const x = x0 + (index / 80) * (x3 - x0);
    return `${xMap(x).toFixed(1)},${yMap(fn(x)).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="nn-plot">
      <b>{title}</b>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Gráfico de ${title}`}>
        <rect x={left} y={top} width={width - left - right} height={height - top - bottom} className="nn-plot-frame" />
        <line x1={xMap(0)} y1={top} x2={xMap(0)} y2={height - bottom} className="nn-plot-axis" />
        <line
          x1={left}
          y1={yMap(0)}
          x2={width - right}
          y2={yMap(0)}
          className="nn-plot-axis"
        />
        <line x1={left} y1={yMap(1)} x2={width - right} y2={yMap(1)} className="nn-plot-grid" />
        <line x1={left} y1={yMap(-1)} x2={width - right} y2={yMap(-1)} className="nn-plot-grid" />
        <line x1={xMap(-2)} y1={top} x2={xMap(-2)} y2={height - bottom} className="nn-plot-grid" />
        <line x1={xMap(2)} y1={top} x2={xMap(2)} y2={height - bottom} className="nn-plot-grid" />
        <polyline points={points} fill="none" stroke={color} strokeWidth={4} />
        <circle cx={xMap(pointX)} cy={yMap(pointY)} r={8} fill="#f2a900" stroke="#102a43" strokeWidth={2} />
        <text x={width - right} y={height - 6} textAnchor="end" className="nn-plot-label">
          z
        </text>
        <text x={left - 5} y={yMap(maxY) + 10} textAnchor="end" className="nn-plot-label">
          {formatNumber(maxY, 1)}
        </text>
        <text x={left - 5} y={yMap(minY)} textAnchor="end" className="nn-plot-label">
          {formatNumber(minY, 1)}
        </text>
        <text x={xMap(0)} y={height - 6} textAnchor="middle" className="nn-plot-label">
          0
        </text>
      </svg>
    </div>
  );
}

export function NeuronLab() {
  const [x1, setX1] = useState(0.8);
  const [x2, setX2] = useState(-0.4);
  const [w1, setW1] = useState(1.2);
  const [w2, setW2] = useState(0.7);
  const [bias, setBias] = useState(-0.2);
  const [kind, setKind] = useState<"relu" | "tanh">("relu");
  const z = x1 * w1 + x2 * w2 + bias;
  const out = activationScalar(kind, z);

  return (
    <div className="nn-lab">
      <div className="nn-lab-head">
        <p className="mini-label">laboratório · um neurônio</p>
        <h3>Multiplique, some, ative</h3>
        <p>Mova os controles e acompanhe como o mesmo neurônio muda de resposta.</p>
      </div>
      <div className="nn-lab-grid">
        <div className="nn-lab-controls">
          {[
            ["x₁", x1, setX1, -2, 2],
            ["x₂", x2, setX2, -2, 2],
            ["w₁", w1, setW1, -2, 2],
            ["w₂", w2, setW2, -2, 2],
            ["b", bias, setBias, -2, 2],
          ].map(([label, value, setter, min, max]) => (
            <label key={String(label)}>
              <span>{String(label)}</span>
              <input
                type="range"
                min={Number(min)}
                max={Number(max)}
                step={0.1}
                value={Number(value)}
                onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))}
              />
              <output>{formatNumber(Number(value), 1)}</output>
            </label>
          ))}
          <div className="nn-activation-switch" role="group" aria-label="Função de ativação">
            <button className={kind === "relu" ? "is-active" : ""} onClick={() => setKind("relu")}>ReLU</button>
            <button className={kind === "tanh" ? "is-active" : ""} onClick={() => setKind("tanh")}>tanh</button>
          </div>
        </div>
        <div className="nn-neuron-machine">
          <span>pré-ativação</span>
          <code>z = ({formatNumber(x1, 2)} × {formatNumber(w1, 1)}) + ({formatNumber(x2, 2)} × {formatNumber(w2, 1)}) + {formatNumber(bias, 1)}</code>
          <strong>z = {formatNumber(z, 3)}</strong>
          <span>ativação escolhida</span>
          <code>a = {kind}(z)</code>
          <strong className="nn-machine-output">a = {formatNumber(out, 3)}</strong>
        </div>
      </div>
    </div>
  );
}

export function ActivationLab() {
  const [z, setZ] = useState(0.7);
  const relu = activationScalar("relu", z);
  const tanh = activationScalar("tanh", z);

  return (
    <div className="nn-lab">
      <div className="nn-lab-head">
        <p className="mini-label">laboratório · ativações</p>
        <h3>A mesma pré-ativação, duas curvas diferentes</h3>
        <p>O ponto amarelo é o valor de z que entra na função.</p>
      </div>
      <div className="nn-activation-slider">
        <label>
          <span>z</span>
          <input type="range" min={-3} max={3} step={0.05} value={z} onChange={(event) => setZ(Number(event.target.value))} />
          <output>{formatNumber(z, 2)}</output>
        </label>
      </div>
      <div className="nn-plots">
        <Plot
          title="ReLU"
          fn={(value) => Math.max(0, value)}
          minY={-0.5}
          maxY={3}
          pointX={z}
          pointY={relu}
          color="#12847b"
        />
        <Plot
          title="tanh"
          fn={(value) => Math.tanh(value)}
          minY={-1.1}
          maxY={1.1}
          pointX={z}
          pointY={tanh}
          color="#6754b8"
        />
      </div>
      <div className="nn-activation-results">
        <div><span>ReLU(z)</span><strong>{formatNumber(relu)}</strong><small>{z < 0 ? "entrada negativa desligada" : "entrada positiva preservada"}</small></div>
        <div><span>tanh(z)</span><strong>{formatNumber(tanh)}</strong><small>comprime para o intervalo −1 … 1</small></div>
      </div>
    </div>
  );
}
