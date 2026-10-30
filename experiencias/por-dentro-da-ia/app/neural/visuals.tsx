import { useState, type ReactNode } from "react";
import { MatrixTable } from "./Matrix";
import { DEMO, DEMO_OUTPUT, DEMO_TRACE, I1, SAMPLE, SAMPLE_TARGET, Z1, Z2 } from "./demo";
import { activationScalar, formatNumber } from "./math";

const DEFAULT_HIDDEN = DEMO_TRACE.deltas[0].reduce(
  (best, value, index) => (Math.abs(value) > Math.abs(DEMO_TRACE.deltas[0][best]) ? index : best),
  0,
);

function VisualShell({
  kicker,
  title,
  text,
  children,
}: {
  kicker: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="nn-visual-lab">
      <div className="nn-visual-head">
        <p className="mini-label">{kicker}</p>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}

export function LossLab() {
  const [prediction, setPrediction] = useState(Number(DEMO_OUTPUT[0].toFixed(2)));
  const [target, setTarget] = useState(SAMPLE_TARGET);
  const error = prediction - target;
  const loss = 0.5 * error * error;
  const position = (value: number) => ((value + 1) / 2) * 100;

  return (
    <VisualShell
      kicker="laboratório visual · perda"
      title="O erro vira um único número"
      text="Compare a saída ŷ com o alvo t. A perda cresce com o quadrado da diferença."
    >
      <div className="nn-loss-gauges">
        <div className="nn-loss-gauge">
          <div className="nn-gauge-title"><span>saída da rede</span><b>ŷ = {formatNumber(prediction)}</b></div>
          <div className="nn-gauge-track">
            <i className="nn-gauge-marker is-output" style={{ left: `${position(prediction)}%` }} />
          </div>
          <div className="nn-gauge-ends"><span>−1</span><span>0</span><span>1</span></div>
        </div>
        <div className="nn-loss-gauge">
          <div className="nn-gauge-title"><span>alvo</span><b>t = {formatNumber(target)}</b></div>
          <div className="nn-gauge-track">
            <i className="nn-gauge-marker is-target" style={{ left: `${position(target)}%` }} />
          </div>
          <div className="nn-gauge-ends"><span>−1</span><span>0</span><span>1</span></div>
        </div>
      </div>

      <div className="nn-loss-equation">
        <div><span>erro</span><code>e = ŷ − t = {formatNumber(error)}</code></div>
        <div><span>perda</span><code>L = ½e² = {formatNumber(loss, 4)}</code></div>
      </div>

      <div className="nn-loss-controls">
        <label>
          <span>ŷ</span>
          <input type="range" min={-1} max={1} step={0.01} value={prediction} onChange={(event) => setPrediction(Number(event.target.value))} />
          <output>{formatNumber(prediction)}</output>
        </label>
        <label>
          <span>t</span>
          <input type="range" min={0} max={1} step={0.01} value={target} onChange={(event) => setTarget(Number(event.target.value))} />
          <output>{formatNumber(target)}</output>
        </label>
      </div>
    </VisualShell>
  );
}

export function DeltaVisual() {
  const output = DEMO_OUTPUT[0];
  const rawError = output - SAMPLE_TARGET;
  const derivative = activationScalar("tanh", Z2[0], true);
  const delta = DEMO_TRACE.deltas[1][0];

  return (
    <VisualShell
      kicker="figura viva · delta da saída"
      title="O erro bruto encontra a derivada"
      text="O delta da saída é o produto do erro pela sensibilidade da ativação naquele ponto."
    >
      <div className="nn-factor-flow">
        <div className="nn-factor-card">
          <span>erro bruto</span>
          <b>{formatNumber(rawError)}</b>
          <small>ŷ − t</small>
        </div>
        <i>×</i>
        <div className="nn-factor-card">
          <span>derivada da tanh</span>
          <b>{formatNumber(derivative)}</b>
          <small>1 − tanh(z)²</small>
        </div>
        <i>=</i>
        <div className="nn-factor-card is-result">
          <span>delta da saída</span>
          <b>{formatNumber(delta)}</b>
          <small>δ_out</small>
        </div>
      </div>
      <p className="nn-visual-note">
        Quando a saída satura perto de −1 ou 1, a derivada fica pequena. O neurônio ainda erra, mas aprende devagar.
      </p>
    </VisualShell>
  );
}

export function ChainRuleVisual() {
  const [selected, setSelected] = useState(DEFAULT_HIDDEN);
  const outputDelta = DEMO_TRACE.deltas[1][0];
  const weight = DEMO.weightMats[1][selected][0];
  const contribution = weight * outputDelta;
  const derivative = Z1[selected] > 0 ? 1 : 0;
  const hiddenDelta = DEMO_TRACE.deltas[0][selected];

  return (
    <VisualShell
      kicker="figura viva · regra da cadeia"
      title="A culpa volta por cada conexão"
      text="Escolha um neurônio oculto. O delta dele é a soma ponderada dos deltas da saída, moldada pela derivada da ativação."
    >
      <div className="nn-chain-picker" role="group" aria-label="Escolha do neurônio oculto">
        {[0, 1, 2].map((index) => (
          <button key={index} className={selected === index ? "is-active" : ""} onClick={() => setSelected(index)}>
            neurônio {index + 1}
          </button>
        ))}
      </div>

      <div className="nn-factor-flow is-chain">
        <div className="nn-factor-card">
          <span>δ da saída</span>
          <b>{formatNumber(outputDelta)}</b>
          <small>o erro que chega</small>
        </div>
        <i>×</i>
        <div className="nn-factor-card">
          <span>peso da conexão</span>
          <b>{formatNumber(weight)}</b>
          <small>W₂[{selected + 1}, 1]</small>
        </div>
        <i>=</i>
        <div className="nn-factor-card">
          <span>contribuição</span>
          <b>{formatNumber(contribution)}</b>
          <small>peso × δ</small>
        </div>
        <i>×</i>
        <div className="nn-factor-card">
          <span>derivada da ReLU</span>
          <b>{formatNumber(derivative)}</b>
          <small>{derivative === 0 ? "neurônio desligado" : "neurônio ativo"}</small>
        </div>
        <i>=</i>
        <div className="nn-factor-card is-result">
          <span>δ oculto</span>
          <b>{formatNumber(hiddenDelta)}</b>
          <small>quanta culpa cabe a este neurônio</small>
        </div>
      </div>
    </VisualShell>
  );
}

export function GradientVisual() {
  const [layer, setLayer] = useState(0);
  const entering = layer === 0 ? [SAMPLE] : [I1];
  const delta = DEMO_TRACE.deltas[layer];
  const gradientW = DEMO_TRACE.gradientsW[layer];
  const gradientB = DEMO_TRACE.gradientsB[layer];
  const label = layer === 0 ? "camada 1 · oculta" : "camada 2 · saída";

  return (
    <VisualShell
      kicker="figura viva · gradientes"
      title="Uma linha de ativações encontra uma coluna de deltas"
      text="O gradiente de cada peso é o produto da ativação que entra nele pelo delta que sai dele."
    >
      <div className="nn-gradient-tabs" role="group" aria-label="Camada do gradiente">
        <button className={layer === 0 ? "is-active" : ""} onClick={() => setLayer(0)}>camada 1</button>
        <button className={layer === 1 ? "is-active" : ""} onClick={() => setLayer(1)}>camada 2</button>
        <span>{label}</span>
      </div>

      <div className="nn-gradient-flow">
        <MatrixTable label="a · entrada" values={entering} />
        <i>ᵀ×</i>
        <MatrixTable label="δ · saída" values={[delta]} />
        <i>=</i>
        <MatrixTable label="∂L/∂W" values={gradientW} />
      </div>

      <div className="nn-gradient-bias">
        <span>o viés recebe o delta diretamente</span>
        <MatrixTable label="∂L/∂b = δ" values={gradientB} />
      </div>
    </VisualShell>
  );
}

export function BackpropVisual() {
  const [selected, setSelected] = useState(DEFAULT_HIDDEN);
  const loss = DEMO_TRACE.loss;
  const outputDelta = DEMO_TRACE.deltas[1][0];
  const hiddenDelta = DEMO_TRACE.deltas[0][selected];
  const weight = DEMO.weightMats[1][selected][0];
  const contribution = weight * outputDelta;
  const derivative = Z1[selected] > 0 ? 1 : 0;

  return (
    <VisualShell
      kicker="figura viva · retropropagação"
      title="Da perda até o gradiente, em uma direção só"
      text="O erro nasce na comparação com o alvo, atravessa os deltas e termina nos gradientes de cada parâmetro."
    >
      <div className="nn-backprop-flow">
        <div className="nn-backprop-card is-loss">
          <span>perda</span>
          <b>{formatNumber(loss, 4)}</b>
          <small>(ŷ − t)² / 2</small>
        </div>
        <i>→</i>
        <div className="nn-backprop-card">
          <span>δ da saída</span>
          <b>{formatNumber(outputDelta)}</b>
          <small>erro × derivada</small>
        </div>
        <i>→</i>
        <div className="nn-backprop-card is-selected">
          <span>δ oculto {selected + 1}</span>
          <b>{formatNumber(hiddenDelta)}</b>
          <small>{formatNumber(contribution)} × {formatNumber(derivative)}</small>
        </div>
        <i>→</i>
        <div className="nn-backprop-card is-gradient">
          <span>gradiente do viés</span>
          <b>{formatNumber(DEMO_TRACE.gradientsB[0][0][selected])}</b>
          <small>∂L/∂b₁[{selected + 1}]</small>
        </div>
      </div>

      <div className="nn-backprop-gradient">
        <MatrixTable label="∂L/∂W₁ · 2×3" values={DEMO_TRACE.gradientsW[0]} />
        <MatrixTable label="∂L/∂b₁ · 1×3" values={DEMO_TRACE.gradientsB[0]} />
      </div>

      <div className="nn-backprop-selector" role="group" aria-label="Neurônio oculto da retropropagação">
        {[0, 1, 2].map((index) => (
          <button key={index} className={selected === index ? "is-active" : ""} onClick={() => setSelected(index)}>
            neurônio oculto {index + 1}
          </button>
        ))}
      </div>
      <p className="nn-visual-note">
        O caminho é sempre o mesmo: a perda gera o delta da saída, a saída distribui culpa para as camadas anteriores e
        cada parâmetro recebe um gradiente.
      </p>
    </VisualShell>
  );
}

function lossAt(w: number) {
  return (w - 1) ** 2 + 0.2;
}

const W_START = -1.5;
const MIN_W = -2.6;
const MAX_W = 3.2;
const MAX_LOSS = 14;

function ToyLossChart({
  series,
  maxW = MAX_W,
}: {
  series: { label: string; color: string; points: number[] }[];
  maxW?: number;
}) {
  const width = 380;
  const height = 210;
  const left = 36;
  const right = 14;
  const top = 18;
  const bottom = 28;
  const xMin = MIN_W;
  const xMax = maxW;
  const xMap = (w: number) => left + ((Math.max(xMin, Math.min(xMax, w)) - xMin) / (xMax - xMin)) * (width - left - right);
  const yMap = (loss: number) => height - bottom - (Math.min(MAX_LOSS, loss) / MAX_LOSS) * (height - top - bottom);
  const curve = Array.from({ length: 100 }, (_, index) => {
    const w = xMin + (index / 99) * (xMax - xMin);
    return `${xMap(w).toFixed(1)},${yMap(lossAt(w)).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="nn-toy-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva de perda e trajetória dos passos">
        <rect x={left} y={top} width={width - left - right} height={height - top - bottom} className="nn-plot-frame" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="nn-plot-axis" />
        <line x1={left} y1={top} x2={left} y2={height - bottom} className="nn-plot-axis" />
        <polyline points={curve} className="nn-toy-curve" />
        {series.map((entry) => (
          <g key={entry.label}>
            <polyline
              points={entry.points.map((w) => `${xMap(w).toFixed(1)},${yMap(lossAt(w)).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={entry.color}
              strokeWidth={2.5}
            />
            {entry.points.map((w, index) => (
              <circle
                key={`${entry.label}-${index}`}
                cx={xMap(w)}
                cy={yMap(lossAt(w))}
                r={index === 0 ? 4.5 : 3}
                fill={index === entry.points.length - 1 ? "#f2a900" : entry.color}
                stroke="#102a43"
                strokeWidth={1}
              />
            ))}
          </g>
        ))}
        <line x1={xMap(1)} y1={top} x2={xMap(1)} y2={height - bottom} className="nn-plot-grid" />
        <text x={xMap(1)} y={height - 5} textAnchor="middle" className="nn-plot-label">mínimo</text>
        <text x={left + 5} y={top + 12} className="nn-plot-label">perda</text>
        <text x={width - right} y={height - 5} textAnchor="end" className="nn-plot-label">w</text>
      </svg>
      <div className="nn-toy-legend">
        {series.map((entry) => (
          <span key={entry.label}><i style={{ background: entry.color }} />{entry.label}</span>
        ))}
      </div>
    </div>
  );
}

function rateTrajectory(eta: number) {
  let w = W_START;
  const points = [w];
  for (let step = 0; step < 8; step += 1) {
    const gradient = 2 * (w - 1);
    w -= eta * gradient;
    points.push(w);
  }
  return points;
}

export function LearningRateLab() {
  const [eta, setEta] = useState(0.3);
  const points = rateTrajectory(eta);
  const final = points[points.length - 1];
  const lastStep = Math.abs(points[points.length - 1] - points[points.length - 2]);
  const label = lastStep < 0.2 ? "passo pequeno" : lastStep < 1.2 ? "passo moderado" : "passo grande";

  return (
    <VisualShell
      kicker="laboratório visual · taxa de aprendizado"
      title="O tamanho do passo muda o caminho"
      text="A curva é uma perda de brinquedo. Cada ponto é uma atualização; mude η e veja a trajetória."
    >
      <div className="nn-rate-layout">
        <ToyLossChart series={[{ label: "trajetória", color: "#12847b", points }]} />
        <div className="nn-rate-panel">
          <label>
            <span>taxa de aprendizado η</span>
            <input type="range" min={0.05} max={1.15} step={0.05} value={eta} onChange={(event) => setEta(Number(event.target.value))} />
            <output>{formatNumber(eta, 2)}</output>
          </label>
          <div className="nn-rate-status">
            <span>{label}</span>
            <b>w final ≈ {formatNumber(final, 2)}</b>
            <small>último passo: {formatNumber(lastStep, 3)}</small>
          </div>
          <p>
            Perto de <code>η = 1</code>, o passo pode oscilar em torno do mínimo. Acima disso, pode divergir.
          </p>
        </div>
      </div>
    </VisualShell>
  );
}

function momentumTrajectory(momentum: number) {
  let w = W_START;
  let velocity = 0;
  const points = [w];
  for (let step = 0; step < 8; step += 1) {
    const gradient = 2 * (w - 1);
    velocity = momentum * velocity - 0.25 * gradient;
    w += velocity;
    points.push(w);
  }
  return points;
}

export function MomentumVisual() {
  const [momentum, setMomentum] = useState(0.1);
  const series = [
    { label: "sem momentum", color: "#8fa3b6", points: momentumTrajectory(0) },
    { label: `momentum ${formatNumber(momentum, 1)}`, color: "#6754b8", points: momentumTrajectory(momentum) },
  ];
  const finalWith = momentumTrajectory(momentum).at(-1) ?? W_START;

  return (
    <VisualShell
      kicker="laboratório visual · momentum"
      title="A velocidade acumulada suaviza o caminho"
      text="O momentum guarda uma fração do passo anterior. Compare a trajetória sem e com velocidade na mesma perda de brinquedo."
    >
      <div className="nn-momentum-layout">
        <ToyLossChart series={series} />
        <div className="nn-momentum-panel">
          <div className="nn-momentum-tabs" role="group" aria-label="Valor de momentum">
            {[0, 0.1, 0.5, 0.9].map((value) => (
              <button key={value} className={momentum === value ? "is-active" : ""} onClick={() => setMomentum(value)}>
                μ = {value}
              </button>
            ))}
          </div>
          <div className="nn-rate-status">
            <span>com momentum</span>
            <b>w final ≈ {formatNumber(finalWith, 2)}</b>
            <small>a linha escura é a trajetória com o μ escolhido</small>
          </div>
          <p>Com μ = 0, a trajetória é a descida do gradiente pura. Com μ &gt; 0, o passo ganha inércia.</p>
        </div>
      </div>
    </VisualShell>
  );
}
