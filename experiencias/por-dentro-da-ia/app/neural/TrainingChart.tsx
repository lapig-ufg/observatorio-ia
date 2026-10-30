import { formatMetric } from "./math";
import type { MetricsState, ResultsState } from "./playground-state";

export function TrainingChart({ metrics }: { metrics: MetricsState }) {
  const history = metrics.history;
  if (history.length === 0) return null;

  const width = 640;
  const height = 170;
  const left = 52;
  const right = 18;
  const top = 18;
  const bottom = 24;
  const losses = history.map((point) => point.loss);
  let min = Math.min(...losses);
  let max = Math.max(...losses);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (max === min) max = min + 1;
  const span = max - min;
  const total = Math.max(1, metrics.epochs);
  const stride = Math.max(1, Math.ceil(history.length / 400));
  const points: string[] = [];

  const pointAt = (epoch: number, loss: number) => {
    const x = left + (epoch / total) * (width - left - right);
    const y = height - bottom - ((loss - min) / span) * (height - top - bottom);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  };

  for (let index = 0; index < history.length; index += stride) {
    pointAt(history[index].epoch, history[index].loss);
  }
  if ((history.length - 1) % stride !== 0) {
    pointAt(history[history.length - 1].epoch, history[history.length - 1].loss);
  }

  const accuracy =
    metrics.accuracy === null || metrics.accuracy === undefined
      ? ""
      : ` · acurácia ${Math.round(metrics.accuracy * 100)}%`;

  return (
    <div className="nn-training">
      <div className="nn-training-head">
        {metrics.epochs} épocas · lr {formatMetric(metrics.learning_rate)} · momentum {formatMetric(metrics.momentum)} · perda{" "}
        {formatMetric(metrics.initial_loss)} → {formatMetric(metrics.final_loss)}
        {accuracy}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="nn-loss-chart" role="img" aria-label="Perda por época">
        <line className="nn-chart-axis" x1={left} y1={top} x2={left} y2={height - bottom} />
        <line className="nn-chart-axis" x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        <polyline className="nn-loss-line" points={points.join(" ")} vectorEffect="non-scaling-stroke" />
        <text className="nn-chart-label" x={left} y={12}>
          perda
        </text>
        <text className="nn-chart-label" x={left - 7} y={top + 6} textAnchor="end">
          {formatMetric(max)}
        </text>
        <text className="nn-chart-label" x={left - 7} y={height - bottom - 2} textAnchor="end">
          {formatMetric(min)}
        </text>
        <text className="nn-chart-label" x={left} y={height - 4}>
          0
        </text>
        <text className="nn-chart-label" x={width - right} y={height - 4} textAnchor="end">
          {metrics.epochs}
        </text>
      </svg>
    </div>
  );
}

export function ResultsTable({
  results,
  features,
  labels,
}: {
  results: ResultsState;
  features: { name: string; values: number[][] } | null;
  labels: { name: string; values: number[][] } | null;
}) {
  const featureRows = features?.values ?? null;
  const labelRows = labels?.values ?? null;
  const headers = ["#"]
    .concat(featureRows ? ["x"] : [])
    .concat(["ŷ"])
    .concat(labelRows ? ["alvo", "✓"] : []);

  return (
    <div className="nn-results">
      <div className="nn-results-title">
        {features ? `Previsões de ${features.name}` : "Previsões da rede"}
      </div>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.outputs.map((row, index) => {
            const target = labelRows?.[index];
            const correct =
              target !== undefined &&
              row.length === target.length &&
              row.every((value, col) => Math.round(value) === Math.round(target[col]));
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                {featureRows?.[index] && <td>{featureRows[index].map((value) => formatCell(value)).join(", ")}</td>}
                <td>{row.map((value) => formatCell(value)).join(", ")}</td>
                {target && (
                  <>
                    <td>{target.map((value) => formatCell(value)).join(", ")}</td>
                    <td className={correct ? "is-ok" : "is-bad"}>{correct ? "✓" : "✗"}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: number) {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
