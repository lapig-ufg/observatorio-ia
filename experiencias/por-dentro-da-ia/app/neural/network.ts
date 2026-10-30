import {
  activation,
  addVectors,
  type ActivationName,
  type InitName,
  type Matrix,
  type Vector,
  allClose,
  deepCopy,
  initialMatrices,
  makeRng,
  rowTimesMatrix,
  scaleMatrix,
  subtractMatrices,
  sumSquares,
  zeros,
} from "./math";
import { NNError } from "./errors";
import { buildBackwardTrace, type BackwardTrace } from "./backward";

export interface Snapshot {
  topology: number[];
  weight_mats: Matrix[];
  bias_mats: Matrix[];
  hidden: ActivationName;
  output: ActivationName;
  init: InitName;
  seed: number | null;
  learning_rate: number;
  momentum: number;
  n_params: number;
}

export interface StepResult {
  out: Vector;
  layer: number;
  net_in: Vector;
  started: boolean;
  finished: boolean;
}

export interface TrainingHistoryPoint {
  epoch: number;
  loss: number;
  accuracy: number | null;
}

export interface TrainingResult {
  epochs: number;
  learning_rate: number;
  momentum: number;
  history: TrainingHistoryPoint[];
}

export class Features {
  data: Matrix;

  constructor(rows: unknown) {
    const data = asMatrix(rows);
    if (!data) {
      throw new NNError(
        "Features(...) espera uma matriz com uma linha por amostra, por exemplo Features([[0, 0], [0, 1]]). Faltou um par de colchetes?",
      );
    }
    if (data.length === 0 || data[0].length === 0) {
      throw new NNError("Features(...) precisa de pelo menos uma amostra e um atributo.");
    }
    this.data = data;
  }

  get nSamples() {
    return this.data.length;
  }

  get nFeatures() {
    return this.data[0].length;
  }

  row(index: number) {
    return this.data[index];
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}

export class Labels {
  data: Matrix;

  constructor(values: unknown) {
    const matrix = asMatrix(values);
    if (matrix) {
      this.data = matrix;
      return;
    }
    const flat = asVector(values);
    if (!flat) {
      throw new NNError("Labels(...) espera uma lista de valores, por exemplo Labels([0, 1, 1, 0]).");
    }
    this.data = flat.map((value) => [value]);
  }

  get nSamples() {
    return this.data.length;
  }

  row(index: number) {
    return this.data[index];
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}

export interface NeuralNetworkOptions {
  hidden?: ActivationName;
  output?: ActivationName;
  init?: InitName;
  seed?: number | null;
  learning_rate?: number;
  momentum?: number;
}

export class NeuralNetwork {
  topology: number[];
  hidden: ActivationName;
  output: ActivationName;
  init: InitName;
  seed: number | null;
  learning_rate: number;
  momentum: number;

  weightMats: Matrix[];
  biasMats: Matrix[];
  netIns: Vector[] = [];
  netOuts: Vector[] = [];
  size: number;
  stepCursor = 0;
  passComplete = false;

  lastStep: StepResult | null = null;
  lastOutput: Vector | null = null;
  lastTrace: BackwardTrace | null = null;
  lastBackwardLayer: number | null = null;
  backwardNext: number | null = null;

  lastUpdateLayer: number | null = null;
  lastUpdateLr: number | null = null;
  lastUpdateGradW: Matrix | null = null;
  lastUpdateGradB: Matrix | null = null;
  lastTraining: TrainingResult | null = null;

  constructor(topology: unknown, options: NeuralNetworkOptions = {}) {
    const parsed = asVector(topology)?.map((value) => Math.trunc(value));
    if (!parsed || parsed.length < 2) {
      throw new NNError("a topologia precisa de pelo menos uma camada de entrada e uma de saída.");
    }
    if (parsed.some((value) => value <= 0)) {
      throw new NNError("cada camada precisa de pelo menos um neurônio.");
    }

    const hidden = options.hidden ?? "relu";
    const output = options.output ?? "tanh";
    const init = options.init ?? "random";
    const seed = options.seed ?? null;
    if (hidden !== "relu" && hidden !== "tanh") {
      throw new NNError(`ativação oculta desconhecida: ${String(hidden)}. Disponíveis: relu, tanh.`);
    }
    if (output !== "relu" && output !== "tanh") {
      throw new NNError(`ativação de saída desconhecida: ${String(output)}. Disponíveis: relu, tanh.`);
    }
    if (init !== "random" && init !== "xavier") {
      throw new NNError(`inicialização desconhecida: ${String(init)}. Disponíveis: random, xavier.`);
    }

    this.topology = parsed;
    this.hidden = hidden;
    this.output = output;
    this.init = init;
    this.seed = seed;
    this.learning_rate = options.learning_rate ?? 0.01;
    this.momentum = options.momentum ?? 0.1;

    const { weights, biases } = initialMatrices(this.topology, this.init, makeRng(this.seed));
    this.weightMats = weights;
    this.biasMats = biases;
    this.size = this.weightMats.length;
  }

  get nLayers() {
    return this.topology.length - 1;
  }

  get nParams() {
    return this.weightMats.reduce(
      (total, matrix, index) => total + matrix.length * matrix[0].length + this.biasMats[index][0].length,
      0,
    );
  }

  get weights() {
    return this.weightMats.map(deepCopy);
  }

  get biases() {
    return this.biasMats.map(deepCopy);
  }

  get backwardStarted() {
    return this.backwardNext !== null;
  }

  get backwardComplete() {
    return this.backwardNext !== null && this.backwardNext < 0;
  }

  forward(sample: unknown, layer: unknown): Vector {
    const vector = asVector(sample);
    if (!vector) {
      throw new NNError(
        "forward(...) espera um único vetor 1-D (uma amostra como X[0] ou as ativações do passo anterior). Use predict(...) para uma matriz inteira.",
      );
    }
    if (typeof layer !== "number" || !Number.isInteger(layer) || layer < 1 || layer > this.nLayers) {
      throw new NNError(`a camada precisa ser um número inteiro de 1 a ${this.nLayers}.`);
    }

    // Starting again at layer 1 is always a fresh pass. This lets the learner
    // recover after an incomplete forward attempt (for example, a custom
    // network with more processing layers than the default script).
    if (layer === 1 && this.stepCursor !== 0) {
      this.stepCursor = 0;
      this.passComplete = false;
    }

    const expectedLayer = this.stepCursor + 1;
    if (layer !== expectedLayer) {
      throw new NNError(`a passagem direta acontece camada por camada — esperava a camada ${expectedLayer}, recebeu ${layer}.`);
    }

    const expected = this.topology[layer - 1];
    if (vector.length !== expected) {
      throw new NNError(`a camada ${layer} espera ${expected} valor(es) de entrada, recebeu ${vector.length}.`);
    }

    const result = this.stepForward(vector);
    this.lastStep = result;
    this.lastOutput = result.out.slice();

    if (result.started) {
      this.lastTrace = null;
      this.lastBackwardLayer = null;
      this.backwardNext = null;
    }

    return this.lastOutput;
  }

  stepForward(inputVector: Vector): StepResult {
    const started = this.stepCursor === 0;
    if (started) {
      this.netIns = [];
      this.netOuts = [];
      this.passComplete = false;
    }

    const index = this.stepCursor;
    const weights = this.weightMats[index];
    const bias = this.biasMats[index][0];

    this.netOuts.push(inputVector.slice());
    const netIn = addVectors(rowTimesMatrix(inputVector, weights), bias);
    this.netIns.push(netIn);

    const isOutput = index === this.weightMats.length - 1;
    const out = activation(isOutput ? this.output : this.hidden, netIn);

    if (isOutput) {
      this.passComplete = true;
      this.stepCursor = 0;
    } else {
      this.passComplete = false;
      this.stepCursor = index + 1;
    }

    return { out, layer: index, net_in: netIn, started, finished: isOutput };
  }

  feedforward(inputVector: Vector): Vector {
    this.stepCursor = 0;
    let current = inputVector.slice();
    let result: StepResult | null = null;
    for (let layer = 0; layer < this.size; layer += 1) {
      result = this.stepForward(current);
      current = result.out;
    }
    return result ? result.out : current;
  }

  predict(value: unknown): Matrix {
    const matrix = asSamples(value);
    if (!matrix) {
      throw new NNError("predict(...) espera uma matriz de amostras, por exemplo predict(X) com X = Features([...]).");
    }
    const outputs = matrix.map((row) => this.feedforward(row).slice());
    this.lastOutput = null;
    this.lastTrace = null;
    this.lastBackwardLayer = null;
    this.backwardNext = null;
    return outputs;
  }

  backward(value: unknown, layer: unknown): Vector {
    if (!this.passComplete) {
      throw new NNError(
        "a passagem direta não está completa — execute todos os nn.forward(...) primeiro e só então comece a passagem de volta.",
      );
    }
    if (typeof layer !== "number" || !Number.isInteger(layer) || layer < 1 || layer > this.nLayers) {
      throw new NNError(`a camada precisa ser um número inteiro de 1 a ${this.nLayers}.`);
    }

    if (layer === this.nLayers) {
      if (!this.lastOutput) {
        throw new NNError("a passagem de volta precisa de uma passagem direta completa feita com nn.forward(...).");
      }
      const target = asVector(value);
      if (!target || target.length !== this.topology[this.topology.length - 1]) {
        throw new NNError(
          `o rótulo precisa de ${this.topology[this.topology.length - 1]} valor(es), um por neurônio de saída.`,
        );
      }

      this.lastTrace = buildBackwardTrace(this, this.lastOutput, target);
      this.backwardNext = this.nLayers - 2;
      this.lastBackwardLayer = this.nLayers - 1;
      return this.lastTrace.deltas[this.nLayers - 1].slice();
    }

    if (!this.lastTrace || this.backwardNext === null) {
      throw new NNError(
        `comece a passagem de volta pela camada de saída (${this.nLayers}) antes da camada ${layer}.`,
      );
    }
    if (this.backwardNext < 0) {
      throw new NNError("a passagem de volta terminou — comece de novo pela camada de saída.");
    }

    const expectedLayer = this.backwardNext + 1;
    if (layer !== expectedLayer) {
      throw new NNError(`a passagem de volta corre da saída para a entrada — esperava a camada ${expectedLayer}, recebeu ${layer}.`);
    }

    const index = layer - 1;
    const incoming = asVector(value);
    const expected = this.topology[layer + 1];
    if (!incoming || incoming.length !== expected) {
      throw new NNError(`nn.backward(...) espera um δ com ${expected} valor(es) para a camada ${layer + 1}.`);
    }
    if (!allClose(incoming, this.lastTrace.deltas[index + 1])) {
      throw new NNError("o δ não coincide com a camada anterior — devolva o valor retornado pela chamada anterior de nn.backward(...).");
    }

    this.backwardNext = index - 1;
    this.lastBackwardLayer = index;
    return this.lastTrace.deltas[index].slice();
  }

  gradient(layer: unknown): [Matrix, Matrix] {
    if (!this.lastTrace) {
      throw new NNError("ainda não há gradientes — termine a passagem de volta primeiro.");
    }
    if (typeof layer !== "number" || !Number.isInteger(layer) || layer < 1 || layer > this.nLayers) {
      throw new NNError(`a camada precisa ser um número inteiro de 1 a ${this.nLayers}.`);
    }
    const index = layer - 1;
    return [deepCopy(this.lastTrace.gradientsW[index]), deepCopy(this.lastTrace.gradientsB[index])];
  }

  updateWeights(lr: unknown, layer: unknown, gradients: unknown): Matrix {
    if (typeof layer !== "number" || !Number.isInteger(layer) || layer < 1 || layer > this.nLayers) {
      throw new NNError(`a camada precisa ser um número inteiro de 1 a ${this.nLayers}.`);
    }
    if (typeof lr !== "number" || !Number.isFinite(lr) || lr <= 0) {
      throw new NNError("a taxa de aprendizado precisa ser um número positivo.");
    }
    if (!Array.isArray(gradients) || gradients.length !== 2) {
      throw new NNError(
        "nn.update_weights(...) precisa dos gradientes da camada como [dW, dB], por exemplo nn.update_weights(0.5, 2, nn.gradient(2)).",
      );
    }

    const index = layer - 1;
    const gradW = asMatrix(gradients[0]);
    const gradB = asMatrix(gradients[1]);
    const weight = this.weightMats[index];
    const bias = this.biasMats[index];
    if (!gradW || !gradB || gradW.length !== weight.length || gradW[0].length !== weight[0].length) {
      throw new NNError(`os gradientes da camada ${layer} têm formato incompatível com W.`);
    }
    if (gradB.length !== bias.length || gradB[0].length !== bias[0].length) {
      throw new NNError(`os gradientes da camada ${layer} têm formato incompatível com B.`);
    }

    this.weightMats[index] = subtractMatrices(weight, scaleMatrix(gradW, lr));
    this.biasMats[index] = subtractMatrices(bias, scaleMatrix(gradB, lr));
    this.passComplete = false;
    this.lastOutput = null;

    this.lastUpdateLayer = index;
    this.lastUpdateLr = lr;
    this.lastUpdateGradW = gradW;
    this.lastUpdateGradB = gradB;
    return deepCopy(this.weightMats[index]);
  }

  train(
    features: unknown,
    labels: unknown,
    epochs = 800,
    learningRate?: number,
    momentum?: number,
  ): number {
    const X = asSamples(features);
    if (!X) throw new NNError("nn.train(...) espera uma matriz de amostras como Features([...]).");
    const Y = this.asTargets(labels, X.length);

    if (typeof epochs !== "number" || !Number.isInteger(epochs) || epochs < 1) {
      throw new NNError("epochs precisa ser um número inteiro positivo.");
    }
    const rate = learningRate ?? this.learning_rate;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new NNError("a taxa de aprendizado precisa ser um número positivo.");
    }
    const mom = momentum ?? this.momentum;
    if (typeof mom !== "number" || !Number.isFinite(mom) || mom < 0) {
      throw new NNError("momentum precisa ser um número não negativo.");
    }

    const history: TrainingHistoryPoint[] = [];
    const evaluate = (epoch: number) => {
      const predictions = X.map((row) => this.feedforward(row));
      const loss =
        predictions.reduce(
          (sum, row, index) => sum + 0.5 * sumSquares(row.map((value, col) => value - Y[index][col])),
          0,
        ) / Math.max(1, predictions.length);
      let accuracy: number | null = null;
      if (Y[0].length === 1) {
        const hits = predictions.filter(
          (row, index) => (row[0] > 0.5 ? 1 : 0) === (Y[index][0] > 0.5 ? 1 : 0),
        ).length;
        accuracy = hits / Math.max(1, predictions.length);
      }
      history.push({ epoch, loss, accuracy });
      return predictions;
    };

    evaluate(0);

    let lastChangeW = this.weightMats.map((matrix) => zeros(matrix.length, matrix[0].length));
    let lastChangeB = this.biasMats.map((matrix) => zeros(matrix.length, matrix[0].length));

    for (let epoch = 1; epoch <= epochs; epoch += 1) {
      const gradW = this.weightMats.map((matrix) => zeros(matrix.length, matrix[0].length));
      const gradB = this.biasMats.map((matrix) => zeros(matrix.length, matrix[0].length));

      for (let sample = 0; sample < X.length; sample += 1) {
        const output = this.feedforward(X[sample]);
        const trace = buildBackwardTrace(this, output, Y[sample]);
        for (let layer = 0; layer < this.nLayers; layer += 1) {
          for (let row = 0; row < gradW[layer].length; row += 1) {
            for (let col = 0; col < gradW[layer][row].length; col += 1) {
              gradW[layer][row][col] += trace.gradientsW[layer][row][col];
            }
          }
          for (let col = 0; col < gradB[layer][0].length; col += 1) {
            gradB[layer][0][col] += trace.gradientsB[layer][0][col];
          }
        }
      }

      const count = X.length;
      const nextChangeW: Matrix[] = [];
      const nextChangeB: Matrix[] = [];
      for (let layer = 0; layer < this.nLayers; layer += 1) {
        const changeW = this.weightMats[layer].map((row, i) =>
          row.map((_, j) => mom * lastChangeW[layer][i][j] - rate * (gradW[layer][i][j] / count)),
        );
        const changeB = this.biasMats[layer].map((row, i) =>
          row.map((_, j) => mom * lastChangeB[layer][i][j] - rate * (gradB[layer][i][j] / count)),
        );
        this.weightMats[layer] = this.weightMats[layer].map((row, i) => row.map((value, j) => value + changeW[i][j]));
        this.biasMats[layer] = this.biasMats[layer].map((row, i) => row.map((value, j) => value + changeB[i][j]));
        nextChangeW.push(changeW);
        nextChangeB.push(changeB);
      }
      lastChangeW = nextChangeW;
      lastChangeB = nextChangeB;

      evaluate(epoch);
    }

    this.lastOutput = null;
    this.lastTrace = null;
    this.lastBackwardLayer = null;
    this.backwardNext = null;
    this.lastTraining = {
      epochs,
      learning_rate: rate,
      momentum: mom,
      history,
    };
    return history[history.length - 1].loss;
  }

  snapshot(): Snapshot {
    return {
      topology: this.topology.slice(),
      weight_mats: this.weightMats.map(deepCopy),
      bias_mats: this.biasMats.map(deepCopy),
      hidden: this.hidden,
      output: this.output,
      init: this.init,
      seed: this.seed,
      learning_rate: this.learning_rate,
      momentum: this.momentum,
      n_params: this.nParams,
    };
  }

  private asTargets(labels: unknown, samples: number): Matrix {
    const data = labels instanceof Labels ? labels.data : asMatrix(labels) ?? asVector(labels)?.map((value) => [value]);
    if (!data) throw new NNError("os rótulos precisam ser uma matriz 2-D.");
    if (data.length !== samples) {
      throw new NNError(`Features e Labels têm quantidades diferentes de amostras (${samples} vs ${data.length}).`);
    }
    if (data[0].length !== this.topology[this.topology.length - 1]) {
      throw new NNError(
        `os rótulos precisam de ${this.topology[this.topology.length - 1]} valor(es) por amostra, um por neurônio de saída.`,
      );
    }
    return data.map((row) => row.slice());
  }
}

export function asVector(value: unknown): Vector | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "number" && Number.isFinite(item))) return null;
  return value.slice() as number[];
}

export function asMatrix(value: unknown): Matrix | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!Array.isArray(value[0])) return null;
  const matrix: Matrix = [];
  for (const row of value) {
    const parsed = asVector(row);
    if (!parsed) return null;
    matrix.push(parsed);
  }
  return matrix;
}

export function asSamples(value: unknown): Matrix | null {
  if (value instanceof Features) return value.data.map((row) => row.slice());
  return asMatrix(value);
}
