import { activation, type ActivationName, type Matrix, type Vector } from "./math";
import { NNError } from "./errors";

export interface ChainHop {
  symbol: string;
  value: number;
}

export interface ParameterChain {
  kind: "weight" | "bias" | "activation" | "loss";
  key: string;
  label: string;
  hops: ChainHop[];
  gradient: number;
}

export type Chains = Record<string, ParameterChain>;

export interface BackwardTrace {
  loss: number;
  dLoss: Vector;
  deltas: Vector[];
  gradientsW: Matrix[];
  gradientsB: Matrix[];
  chains: Chains;
}

export interface BackwardNetwork {
  topology: number[];
  size: number;
  weightMats: Matrix[];
  netIns: Vector[];
  netOuts: Vector[];
  hidden: ActivationName;
  output: ActivationName;
  passComplete: boolean;
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function hop(symbol: string, value: number): ChainHop {
  return { symbol, value };
}

function activationPrime(net: BackwardNetwork, layer: number): Vector {
  const name = layer === net.size - 1 ? net.output : net.hidden;
  return activation(name, net.netIns[layer], true);
}

function activationName(name: ActivationName) {
  return name === "relu" ? "relu" : "tanh";
}

function chainHopsToZ(
  net: BackwardNetwork,
  layer: number,
  neuron: number,
  dLoss: Vector,
  deltas: Vector[],
): ChainHop[] {
  const hops: ChainHop[] = [];

  if (layer === net.size - 1) {
    hops.push(
      hop(
        `dL/dŷ[${neuron}] = (saída − alvo) = ${signed(dLoss[neuron])}`,
        dLoss[neuron],
      ),
    );
    const prime = activationPrime(net, layer);
    hops.push(
      hop(
        `dŷ/dz (derivada da ativação de saída) = ${prime[neuron].toFixed(3)}`,
        prime[neuron],
      ),
    );
    return hops;
  }

  const deltaNext = deltas[layer + 1];
  const wNext = net.weightMats[layer + 1];
  for (let k = 0; k < deltaNext.length; k += 1) {
    const weight = wNext[neuron][k];
    hops.push(
      hop(
        `w[${neuron},${k}]·δ[${layer + 1},${k}] = ${signed(weight)}·${signed(deltaNext[k])}`,
        weight * deltaNext[k],
      ),
    );
  }
  const total = deltaNext.reduce((sum, value, k) => sum + value * wNext[neuron][k], 0);
  hops.push(hop(`Σ = dL/dz vindo da próxima camada = ${signed(total)}`, total));

  const prime = activationPrime(net, layer);
  hops.push(
    hop(
      `${activationName(net.hidden)}′ (derivada da ativação oculta) = ${prime[neuron].toFixed(3)}`,
      prime[neuron],
    ),
  );
  return hops;
}

export function buildBackwardTrace(
  net: BackwardNetwork,
  outputValue: unknown,
  targetValue: unknown,
): BackwardTrace {
  const output = (Array.isArray(outputValue) ? outputValue : []).slice() as Vector;
  const target = (Array.isArray(targetValue) ? targetValue : []).slice() as Vector;

  if (!net.passComplete || net.netIns.length !== net.size) {
    throw new NNError(
      "a passagem direta não está completa — execute todos os nn.forward(...) (uma chamada por camada) antes de calcular os gradientes.",
    );
  }
  if (target.length !== output.length) {
    throw new NNError(`o alvo tem ${target.length} valor(es), mas a saída da rede tem ${output.length}.`);
  }

  const size = net.size;
  const activationsIn = net.netOuts.map((values) => values.slice());
  const dLoss = output.map((value, index) => value - target[index]);
  const deltas: Vector[] = Array.from({ length: size }, () => []);

  for (let layer = size - 1; layer >= 0; layer -= 1) {
    const z = net.netIns[layer];
    const signal =
      layer === size - 1
        ? dLoss
        : deltas[layer + 1].reduce(
            (acc, delta, k) => {
              for (let neuron = 0; neuron < acc.length; neuron += 1) {
                acc[neuron] += delta * net.weightMats[layer + 1][neuron][k];
              }
              return acc;
            },
            new Array(net.topology[layer + 1]).fill(0) as number[],
          );
    const prime = activation(layer === size - 1 ? net.output : net.hidden, z, true);
    deltas[layer] = signal.map((value, index) => value * prime[index]);
  }

  const loss =
    output.reduce((sum, value, index) => sum + 0.5 * (value - target[index]) ** 2, 0);
  const gradientsW = activationsIn.map((entering, layer) =>
    entering.map((value) => deltas[layer].map((delta) => value * delta)),
  );
  const gradientsB = deltas.map((delta) => [delta.slice()]);

  return {
    loss,
    dLoss,
    deltas,
    gradientsW,
    gradientsB,
    chains: buildChains(net, activationsIn, output, target, dLoss, deltas),
  };
}

function buildChains(
  net: BackwardNetwork,
  activationsIn: Vector[],
  output: Vector,
  target: Vector,
  dLoss: Vector,
  deltas: Vector[],
): Chains {
  const chains: Chains = {};

  const lossTerms = output.map((value, k) =>
    hop(
      `0.5·(ŷ[${k}] − t[${k}])² = 0.5·(${signed(value)} − ${signed(target[k])})²`,
      0.5 * (value - target[k]) ** 2,
    ),
  );
  const lossValue = output.reduce((sum, value, k) => sum + 0.5 * (value - target[k]) ** 2, 0);
  chains.loss = {
    kind: "loss",
    key: "loss",
    label: `L = 0.5·Σ(ŷ − t)² = ${lossValue.toFixed(4)} (o erro da amostra escolhida)`,
    hops: lossTerms,
    gradient: lossValue,
  };

  for (let layer = net.size - 1; layer >= 0; layer -= 1) {
    const delta = deltas[layer];
    const entering = activationsIn[layer];

    for (let j = 0; j < net.topology[layer]; j += 1) {
      for (let k = 0; k < net.topology[layer + 1]; k += 1) {
        const key = `edge:${layer}-${j}-${k}`;
        const hops = chainHopsToZ(net, layer, k, dLoss, deltas);
        hops.push(
          hop(
            `dz[${layer + 1},${k}]/dw[${j},${k}] = a[${layer},${j}] = ${signed(entering[j])}`,
            entering[j],
          ),
        );
        chains[key] = {
          kind: "weight",
          key,
          label: `cadeia até w[${layer}: ${j} → ${k}]`,
          hops,
          gradient: entering[j] * delta[k],
        };
      }
    }

    for (let k = 0; k < net.topology[layer + 1]; k += 1) {
      const key = `bias:${layer}-${k}`;
      const hops = chainHopsToZ(net, layer, k, dLoss, deltas);
      hops.push(hop(`dz[${layer + 1},${k}]/db[${layer},${k}] = 1`, 1));
      chains[key] = {
        kind: "bias",
        key,
        label: `cadeia até b[${layer},${k}]`,
        hops,
        gradient: delta[k],
      };
    }
  }

  for (let col = 1; col <= net.size; col += 1) {
    const isOutput = col === net.size;
    for (let n = 0; n < net.topology[col]; n += 1) {
      const key = `node:${col}-${n}`;
      let gradient: number;
      const hops: ChainHop[] = [];

      if (isOutput) {
        gradient = dLoss[n];
        hops.push(hop(`dL/dŷ[${n}] = (saída − alvo) = ${signed(dLoss[n])}`, dLoss[n]));
      } else {
        const deltaNext = deltas[col];
        const wNext = net.weightMats[col];
        for (let k = 0; k < deltaNext.length; k += 1) {
          hops.push(
            hop(
              `w[${n},${k}]·δ[${col},${k}] = ${signed(wNext[n][k])}·${signed(deltaNext[k])}`,
              wNext[n][k] * deltaNext[k],
            ),
          );
        }
        gradient = deltaNext.reduce((sum, value, k) => sum + value * wNext[n][k], 0);
        hops.push(hop(`Σ = dL/da[${col},${n}] = ${signed(gradient)}`, gradient));
      }

      const deltaValue = deltas[col - 1][n];
      hops.push(hop(`dL/dz[${col},${n}] = ${signed(deltaValue)} (a′ aplicada)`, deltaValue));

      chains[key] = {
        kind: "activation",
        key,
        label: `cadeia até a[${col},${n}]`,
        hops,
        gradient,
      };
    }
  }

  return chains;
}
