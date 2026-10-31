import {
  Features,
  Labels,
  NeuralNetwork,
  asMatrix,
  asVector,
  type Snapshot,
  type TrainingHistoryPoint,
} from "./network";
import { NNError, SourceError } from "./errors";
import { parseProgram, type Arg, type Expr, type Statement } from "./dsl";
import type { Chains } from "./backward";
import type { Matrix } from "./math";

export interface MatrixItem {
  label: string;
  shape: [number, number];
  values: Matrix;
}

export interface MatrixGroup {
  label?: string;
  items: MatrixItem[];
  ops?: string[];
}

export type NeuralEvent =
  | { type: "network_built"; snapshot: Snapshot }
  | { type: "features_built"; name: string; values: Matrix }
  | { type: "labels_built"; name: string; values: Matrix }
  | { type: "line"; line: number }
  | { type: "forward_start"; input: number[] }
  | {
      type: "layer_done";
      index: number;
      inputs: number[];
      net_in: number[];
      net_out: number[];
      matrices: MatrixItem[];
    }
  | { type: "forward_done"; output: number[] }
  | { type: "predict_done"; outputs: Matrix; shape: [number, number] }
  | { type: "backward_start"; target: number[]; output: number[] | null; activations: number[][] }
  | { type: "loss_done"; value: number }
  | { type: "backward_layer"; index: number; delta: number[]; inputs: number[]; matrices: MatrixItem[] }
  | { type: "backward_done"; chains: Chains; n_chains: number }
  | {
      type: "weights_updated";
      layer: number;
      learning_rate: number;
      matrices: { weight: MatrixItem[]; bias: MatrixItem[] };
    }
  | { type: "network_updated"; snapshot: Snapshot }
  | {
      type: "train_metrics";
      epochs: number;
      learning_rate: number;
      momentum: number;
      history: TrainingHistoryPoint[];
      initial_loss: number;
      final_loss: number;
      accuracy: number | null;
    };

export interface RunResult {
  ok: boolean;
  error: { message: string; line: number | null; col: number | null } | null;
  events: NeuralEvent[];
  namespace: Record<string, unknown>;
}

export class Sandbox {
  allowedConstructors: Set<string> | null;
  allowedMethods: Set<string> | null;
  hints: Record<string, string>;

  constructor(constructors?: string[] | null, methods?: string[] | null, hints: Record<string, string> = {}) {
    this.allowedConstructors = constructors ? new Set(constructors) : null;
    this.allowedMethods = methods ? new Set(methods) : null;
    this.hints = hints;
  }

  constructorAllowed(name: string) {
    return this.allowedConstructors === null || this.allowedConstructors.has(name);
  }

  methodAllowed(name: string) {
    return this.allowedMethods === null || this.allowedMethods.has(name);
  }

  blockedMessage(kind: "constructor" | "method", name: string) {
    const base =
      kind === "constructor"
        ? `${name}(...) não está disponível nesta etapa.`
        : `nn.${name}(...) não está disponível nesta etapa.`;
    const hint = this.hints[name];
    return hint ? `${base} ${hint}` : base;
  }
}

export const STAGE_BLOCKED_HINTS: Record<string, string> = {
  NeuralNetwork:
    "As redes são construídas na etapa ① (e reconstruídas na etapa ⑤) — volte ao playground de construção para criar ou mudar uma.",
  forward: "A passagem direta acontece na etapa ② — volte ao playground de passagem direta e execute.",
  predict: "A previsão está disponível nas etapas ② e ⑤ — termine esta etapa e siga para a próxima.",
  backward: "A passagem de volta acontece na etapa ③ — volte ao playground de retropropagação e execute.",
  gradient: "Os gradientes estão disponíveis nas etapas ③ e ④ — termine a passagem de volta primeiro.",
  update_weights: "O passo do gradiente acontece na etapa ④ — volte ao playground de atualização e execute.",
  train: "O treino completo acontece na etapa ⑤ — termine a etapa ④ e siga para o treino.",
};

export function sandboxForStage(stage: number): Sandbox {
  if (stage === 1) return new Sandbox(["Features", "Labels", "NeuralNetwork"], [], STAGE_BLOCKED_HINTS);
  if (stage === 2) return new Sandbox([], ["forward", "predict"], STAGE_BLOCKED_HINTS);
  if (stage === 3) return new Sandbox([], ["backward", "gradient"], STAGE_BLOCKED_HINTS);
  if (stage === 4) return new Sandbox([], ["gradient", "update_weights"], STAGE_BLOCKED_HINTS);
  return new Sandbox(["Features", "Labels", "NeuralNetwork"], ["train", "predict"], STAGE_BLOCKED_HINTS);
}

export function matrixItem(label: string, values: unknown): MatrixItem {
  let rows: Matrix;
  if (typeof values === "number") {
    rows = [[values]];
  } else if (Array.isArray(values) && values.every((item) => typeof item === "number")) {
    rows = [values.slice() as number[]];
  } else {
    rows = asMatrix(values) ?? [[]];
  }
  return {
    label,
    shape: [rows.length, rows[0]?.length ?? 0],
    values: rows.map((row) => row.slice()),
  };
}

function asTarget(value: unknown): number[] {
  if (value instanceof Labels) return value.data[0].slice();
  if (value instanceof Features) return value.data[0].slice();
  const vector = asVector(value);
  if (!vector) throw new NNError("o valor precisa ser um vetor numérico.");
  return vector;
}

export class Session {
  sandbox: Sandbox;
  namespace: Record<string, unknown> = {};
  records: NeuralEvent[] = [];

  constructor(stage = 1) {
    this.sandbox = sandboxForStage(stage);
  }

  setStage(stage: number) {
    this.sandbox = sandboxForStage(stage);
  }

  run(source: string, stage = 1): RunResult {
    this.records = [];
    this.setStage(stage);

    let program;
    try {
      program = parseProgram(source);
    } catch (error) {
      const sourceError = error instanceof SourceError ? error : new SourceError(String(error));
      return { ok: false, error: sourceError.asDict(), events: this.records, namespace: this.namespace };
    }

    let error: SourceError | null = null;
    for (const statement of program.statements) {
      try {
        this.exec(statement);
      } catch (caught) {
        error =
          caught instanceof SourceError
            ? caught
            : new SourceError(caught instanceof Error ? caught.message : String(caught));
        break;
      }
    }

    if (!error && stage === 2) {
      const nn = this.namespace.nn;
      const hadForward = this.records.some((event) => event.type === "forward_start" || event.type === "layer_done");
      if (nn instanceof NeuralNetwork && hadForward && !nn.passComplete) {
        const total = nn.nLayers;
        const processed = Math.min(nn.stepCursor, total);
        error = new SourceError(
          `a passagem direta está incompleta: ${processed} de ${total} camadas foram processadas. Acrescente a chamada da camada ${processed + 1} e execute o script de novo.`,
        );
      }
    }

    return {
      ok: error === null,
      error: error ? error.asDict() : null,
      events: this.records,
      namespace: this.namespace,
    };
  }

  private emit(event: NeuralEvent) {
    this.records.push(event);
  }

  private exec(statement: Statement) {
    this.emit({ type: "line", line: statement.line });

    if (statement.kind === "assign") {
      const value = this.evalExpr(statement.value);
      this.namespace[statement.target] = value;
      if (value instanceof NeuralNetwork) {
        this.emit({ type: "network_built", snapshot: value.snapshot() });
      } else if (value instanceof Features) {
        this.emit({ type: "features_built", name: statement.target, values: value.data.map((row) => row.slice()) });
      } else if (value instanceof Labels) {
        this.emit({ type: "labels_built", name: statement.target, values: value.data.map((row) => row.slice()) });
      }
      return;
    }

    this.evalExpr({
      kind: "method",
      obj: statement.obj,
      method: statement.method,
      args: statement.args,
      line: statement.line,
      col: statement.col,
    });
  }

  private evalExpr(expr: Expr): unknown {
    switch (expr.kind) {
      case "literal":
        return expr.value;
      case "list":
        return expr.items.map((item) => this.evalExpr(item));
      case "name":
        if (!(expr.id in this.namespace)) {
          throw new SourceError(`nome não definido '${expr.id}'`, expr.line, expr.col);
        }
        return this.namespace[expr.id];
      case "construct":
        return this.construct(expr);
      case "method":
        return this.methodCall(expr);
      case "attribute":
        return this.readAttribute(expr);
      case "index": {
        const base = this.evalExpr(expr.base);
        const index = this.evalExpr(expr.index);
        try {
          if (Array.isArray(base)) {
            if (typeof index !== "number" || !Number.isInteger(index)) {
              throw new NNError("o índice precisa ser um número inteiro.");
            }
            if (index < 0 || index >= base.length) throw new NNError(`o índice ${index} está fora da lista.`);
            return base[index];
          }
          if (base instanceof Features || base instanceof Labels) {
            return base.data[Number(index)];
          }
          throw new NNError("este valor não pode ser indexado.");
        } catch (error) {
          throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
        }
      }
    }
  }

  private construct(expr: Extract<Expr, { kind: "construct" }>): unknown {
    if (!this.sandbox.constructorAllowed(expr.name)) {
      throw new SourceError(this.sandbox.blockedMessage("constructor", expr.name), expr.line, expr.col);
    }

    const { positional, kwargs } = this.evaluateArgs(expr.args);

    if (expr.name === "Features" || expr.name === "Labels") {
      if (positional.length !== 1 || Object.keys(kwargs).length > 0) {
        throw new SourceError(`${expr.name}(...) recebe exatamente um argumento posicional.`, expr.line, expr.col);
      }
      return expr.name === "Features" ? new Features(positional[0]) : new Labels(positional[0]);
    }

    if (expr.name === "NeuralNetwork") {
      if (positional.length !== 1) {
        throw new SourceError(
          "NeuralNetwork(...) recebe a topologia como primeiro argumento, por exemplo NeuralNetwork([2, 3, 1]).",
          expr.line,
          expr.col,
        );
      }
      const allowed = new Set(["hidden", "output", "init", "seed", "learning_rate", "momentum"]);
      for (const key of Object.keys(kwargs)) {
        if (!allowed.has(key)) throw new SourceError(`NeuralNetwork(...) não reconhece o argumento '${key}'.`, expr.line, expr.col);
      }
      try {
        return new NeuralNetwork(positional[0], {
          hidden: kwargs.hidden as "relu" | "tanh" | undefined,
          output: kwargs.output as "relu" | "tanh" | undefined,
          init: kwargs.init as "random" | "xavier" | undefined,
          seed: kwargs.seed as number | null | undefined,
          learning_rate: kwargs.learning_rate as number | undefined,
          momentum: kwargs.momentum as number | undefined,
        });
      } catch (error) {
        throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
      }
    }

    throw new SourceError(
      `construtor desconhecido '${expr.name}'. Disponíveis: Features, Labels, NeuralNetwork.`,
      expr.line,
      expr.col,
    );
  }

  private methodCall(expr: Extract<Expr, { kind: "method" }>): unknown {
    if (!(expr.obj in this.namespace)) {
      throw new SourceError(`nome não definido '${expr.obj}'`, expr.line, expr.col);
    }
    const obj = this.namespace[expr.obj];

    if (obj instanceof NeuralNetwork) return this.nnMethod(expr, obj);

    if (obj instanceof Features || obj instanceof Labels) {
      throw new SourceError(
        `${obj instanceof Features ? "Features" : "Labels"} não tem métodos — use o valor diretamente, por exemplo nn.forward(${expr.obj}[0]).`,
        expr.line,
        expr.col,
      );
    }

    throw new SourceError(`'${expr.obj}' não tem métodos aqui.`, expr.line, expr.col);
  }

  private nnMethod(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): unknown {
    if (!this.sandbox.methodAllowed(expr.method)) {
      throw new SourceError(this.sandbox.blockedMessage("method", expr.method), expr.line, expr.col);
    }

    if (expr.method === "forward") return this.nnForward(expr, nn);
    if (expr.method === "backward") return this.nnBackward(expr, nn);
    if (expr.method === "gradient") return this.nnGradient(expr, nn);
    if (expr.method === "update_weights") return this.nnUpdateWeights(expr, nn);
    if (expr.method === "train") return this.nnTrain(expr, nn);
    if (expr.method === "predict") return this.nnPredict(expr, nn);

    throw new SourceError(
      `NeuralNetwork não tem o método '${expr.method}'. Disponíveis: forward, predict, backward, gradient, update_weights, train.`,
      expr.line,
      expr.col,
    );
  }

  private nnForward(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): number[] {
    if (expr.args.length !== 2 || expr.args.some(([name]) => name !== null)) {
      throw new SourceError(
        "nn.forward(...) agora recebe (valor, camada), por exemplo nn.forward(I, 1).",
        expr.line,
        expr.col,
      );
    }
    const value = this.evalExpr(expr.args[0][1]);
    if (value instanceof Features) {
      throw new SourceError(
        "nn.forward(...) avança uma camada — passe uma amostra como X[0], não o conjunto inteiro (predict(...) aceita uma matriz).",
        expr.line,
        expr.col,
      );
    }
    const vector = asVector(value);
    if (!vector) throw new SourceError("nn.forward(...) espera um único vetor 1-D.", expr.line, expr.col);

    const layer = this.evalExpr(expr.args[1][1]);
    if (typeof layer !== "number" || !Number.isInteger(layer)) {
      throw new SourceError("a camada precisa ser um número inteiro.", expr.line, expr.col);
    }

    let out: number[];
    try {
      out = nn.forward(vector, layer);
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }

    const step = nn.lastStep!;
    const activationName = step.layer === nn.nLayers - 1 ? nn.output : nn.hidden;

    if (step.started) this.emit({ type: "forward_start", input: vector.slice() });
    this.emit({
      type: "layer_done",
      index: step.layer,
      inputs: vector.slice(),
      net_in: step.net_in.slice(),
      net_out: out.slice(),
      matrices: [
        matrixItem(`I · camada ${step.layer + 1} entrada`, vector),
        matrixItem(`W · camada ${step.layer + 1}`, nn.weights[step.layer]),
        matrixItem(`B · camada ${step.layer + 1}`, nn.biases[step.layer]),
        matrixItem("z = I·W + B", step.net_in),
        matrixItem(`I′ = ${activationName}(z)`, out),
      ],
    });
    if (step.finished) this.emit({ type: "forward_done", output: out.slice() });
    return out;
  }

  private nnPredict(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): Matrix {
    if (expr.args.length !== 1 || expr.args[0][0] !== null) {
      throw new SourceError("nn.predict(...) recebe exatamente um argumento posicional.", expr.line, expr.col);
    }
    const value = this.evalExpr(expr.args[0][1]);
    let outputs: Matrix;
    try {
      outputs = nn.predict(value);
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }
    this.emit({
      type: "predict_done",
      outputs: outputs.map((row) => row.slice()),
      shape: [outputs.length, outputs[0]?.length ?? 0],
    });
    return outputs;
  }

  private nnBackward(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): number[] {
    if (expr.args.length !== 2 || expr.args.some(([name]) => name !== null)) {
      throw new SourceError(
        "nn.backward(...) recebe (valor, camada), por exemplo d2 = nn.backward(y[0], 2) e depois d1 = nn.backward(d2, 1).",
        expr.line,
        expr.col,
      );
    }
    const value = asTarget(this.evalExpr(expr.args[0][1]));
    const layer = this.evalExpr(expr.args[1][1]);
    if (typeof layer !== "number" || !Number.isInteger(layer)) {
      throw new SourceError("a camada precisa ser um número inteiro.", expr.line, expr.col);
    }

    const isSeed = layer === nn.nLayers;
    let delta: number[];
    try {
      delta = nn.backward(value, layer);
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }

    const trace = nn.lastTrace!;
    const walked = nn.lastBackwardLayer!;

    if (isSeed) {
      const activations = nn.netOuts.map((values) => values.slice());
      if (nn.lastOutput) activations.push(nn.lastOutput.slice());
      this.emit({
        type: "backward_start",
        target: value.slice(),
        output: nn.lastOutput ? nn.lastOutput.slice() : null,
        activations,
      });
      this.emit({ type: "loss_done", value: trace.loss });
    }

    this.emit({
      type: "backward_layer",
      index: walked,
      delta: trace.deltas[walked].slice(),
      inputs: nn.netOuts[walked].slice(),
      matrices: [
        matrixItem(`W · camada ${walked + 1}`, nn.weights[walked]),
        matrixItem(`a · entrada da camada ${walked + 1}`, nn.netOuts[walked]),
        matrixItem(`δ · camada ${walked + 1}`, trace.deltas[walked]),
        matrixItem("∂L/∂W = aᵀ·δ", trace.gradientsW[walked]),
        matrixItem("∂L/∂b = δ", trace.gradientsB[walked]),
      ],
    });

    if (nn.backwardComplete) {
      this.emit({
        type: "backward_done",
        chains: trace.chains,
        n_chains: Object.keys(trace.chains).length,
      });
    }

    return delta;
  }

  private nnGradient(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): [Matrix, Matrix] {
    if (expr.args.length !== 1 || expr.args[0][0] !== null) {
      throw new SourceError("nn.gradient(...) recebe um argumento posicional: a camada, por exemplo nn.gradient(2).", expr.line, expr.col);
    }
    const layer = this.evalExpr(expr.args[0][1]);
    try {
      return nn.gradient(layer);
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }
  }

  private nnUpdateWeights(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): Matrix {
    if (expr.args.length !== 3 || expr.args.some(([name]) => name !== null)) {
      throw new SourceError(
        "nn.update_weights(...) recebe (taxa_de_aprendizado, camada, gradientes), por exemplo nn.update_weights(0.5, 2, nn.gradient(2)).",
        expr.line,
        expr.col,
      );
    }
    const lr = this.evalExpr(expr.args[0][1]);
    const layer = this.evalExpr(expr.args[1][1]);
    const gradients = this.evalExpr(expr.args[2][1]);
    const oldWeights = nn.weights;
    const oldBiases = nn.biases;

    let updated: Matrix;
    try {
      updated = nn.updateWeights(lr, layer, gradients);
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }

    const index = nn.lastUpdateLayer!;
    this.emit({
      type: "weights_updated",
      layer: index,
      learning_rate: nn.lastUpdateLr!,
      matrices: {
        weight: [
          matrixItem(`W · camada ${index + 1}`, oldWeights[index]),
          matrixItem("lr", nn.lastUpdateLr!),
          matrixItem("∂L/∂W", nn.lastUpdateGradW!),
          matrixItem("W′ · atualizado", updated),
        ],
        bias: [
          matrixItem(`B · camada ${index + 1}`, oldBiases[index]),
          matrixItem("lr", nn.lastUpdateLr!),
          matrixItem("∂L/∂b", nn.lastUpdateGradB!),
          matrixItem("B′ · atualizado", nn.biases[index]),
        ],
      },
    });
    this.emit({ type: "network_updated", snapshot: nn.snapshot() });
    return updated;
  }

  private nnTrain(expr: Extract<Expr, { kind: "method" }>, nn: NeuralNetwork): number {
    const { positional, kwargs } = this.evaluateArgs(expr.args);
    if (positional.length !== 2) {
      throw new SourceError(
        "nn.train(...) recebe os dados e os rótulos, por exemplo nn.train(X, y, epochs=800, learning_rate=0.5).",
        expr.line,
        expr.col,
      );
    }
    const allowed = new Set(["epochs", "learning_rate", "momentum"]);
    for (const key of Object.keys(kwargs)) {
      if (!allowed.has(key)) throw new SourceError(`nn.train(...) não reconhece o argumento '${key}'.`, expr.line, expr.col);
    }

    let loss: number;
    try {
      loss = nn.train(
        positional[0],
        positional[1],
        (kwargs.epochs as number | undefined) ?? 800,
        kwargs.learning_rate as number | undefined,
        kwargs.momentum as number | undefined,
      );
    } catch (error) {
      throw new SourceError(error instanceof Error ? error.message : String(error), expr.line, expr.col);
    }

    const training = nn.lastTraining!;
    const history = training.history;
    this.emit({
      type: "train_metrics",
      epochs: training.epochs,
      learning_rate: training.learning_rate,
      momentum: training.momentum,
      history,
      initial_loss: history[0].loss,
      final_loss: history[history.length - 1].loss,
      accuracy: history[history.length - 1].accuracy,
    });
    this.emit({ type: "network_updated", snapshot: nn.snapshot() });
    return loss;
  }

  private readAttribute(expr: Extract<Expr, { kind: "attribute" }>): unknown {
    if (!(expr.obj in this.namespace)) {
      throw new SourceError(`nome não definido '${expr.obj}'`, expr.line, expr.col);
    }
    const obj = this.namespace[expr.obj];
    if (obj instanceof NeuralNetwork && (expr.attr === "n_layers" || expr.attr === "weights" || expr.attr === "biases")) {
      if (expr.attr === "n_layers") return obj.nLayers;
      if (expr.attr === "weights") return obj.weights;
      return obj.biases;
    }
    throw new SourceError(
      `'${expr.obj}.${expr.attr}' não está disponível. Disponíveis: nn.n_layers, nn.weights, nn.biases.`,
      expr.line,
      expr.col,
    );
  }

  private evaluateArgs(args: Arg[]): { positional: unknown[]; kwargs: Record<string, unknown> } {
    const positional: unknown[] = [];
    const kwargs: Record<string, unknown> = {};
    for (const [name, expression] of args) {
      const value = this.evalExpr(expression);
      if (name === null) positional.push(value);
      else kwargs[name] = value;
    }
    return { positional, kwargs };
  }
}
