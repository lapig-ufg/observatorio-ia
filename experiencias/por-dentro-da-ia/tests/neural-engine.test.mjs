import assert from "node:assert/strict";
import test from "node:test";
import { Session } from "../app/neural/engine.ts";
import { NeuralNetwork } from "../app/neural/network.ts";
import { buildBackwardTrace } from "../app/neural/backward.ts";
import { activation, addVectors, rowTimesMatrix } from "../app/neural/math.ts";
import { parseProgram } from "../app/neural/dsl.ts";
import { SourceError } from "../app/neural/errors.ts";

const HOUSE = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function build(stage = 1) {
  const session = new Session(stage);
  const result = session.run(
    `X = Features([[0, 0], [0, 1], [1, 0], [1, 1]])
y = Labels([0, 1, 1, 0])
nn = NeuralNetwork([2, 3, 1], hidden="relu", output="tanh", init="xavier", seed=42)`,
    1,
  );
  assert.equal(result.ok, true, result.error?.message);
  return session;
}

test("forward advances one explicit layer and matches the manual equation", () => {
  const session = build();
  const result = session.run(
    `I0 = X[1]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)`,
    2,
  );
  assert.equal(result.ok, true, result.error?.message);

  const nn = session.namespace.nn;
  assert.ok(nn instanceof NeuralNetwork);
  assert.equal(nn.nLayers, 2);

  const sample = HOUSE[1];
  const expectedZ1 = addVectors(rowTimesMatrix(sample, nn.weightMats[0]), nn.biasMats[0][0]);
  const expectedI1 = activation("relu", expectedZ1);
  const expectedZ2 = addVectors(rowTimesMatrix(expectedI1, nn.weightMats[1]), nn.biasMats[1][0]);
  const expectedI2 = activation("tanh", expectedZ2);

  assert.deepEqual(session.namespace.I1, expectedI1);
  assert.deepEqual(session.namespace.I2, expectedI2);
  assert.deepEqual(result.events.filter((event) => event.type === "layer_done").map((event) => event.index), [0, 1]);
});

test("backpropagation gradients match finite differences", () => {
  const nn = new NeuralNetwork([2, 3, 1], { hidden: "relu", output: "tanh", init: "xavier", seed: 42 });
  const output = nn.feedforward(HOUSE[1]);
  const target = [1];
  const trace = buildBackwardTrace(nn, output, target);

  const lossAt = () => {
    const out = nn.feedforward(HOUSE[1]);
    return 0.5 * (out[0] - target[0]) ** 2;
  };

  const epsilon = 1e-5;
  for (let layer = 0; layer < nn.nLayers; layer += 1) {
    for (let row = 0; row < nn.weightMats[layer].length; row += 1) {
      for (let col = 0; col < nn.weightMats[layer][row].length; col += 1) {
        const original = nn.weightMats[layer][row][col];
        nn.weightMats[layer][row][col] = original + epsilon;
        const plus = lossAt();
        nn.weightMats[layer][row][col] = original - epsilon;
        const minus = lossAt();
        nn.weightMats[layer][row][col] = original;
        const numeric = (plus - minus) / (2 * epsilon);
        assert.ok(
          Math.abs(numeric - trace.gradientsW[layer][row][col]) < 1e-4,
          `W[${layer}][${row}][${col}]: ${numeric} != ${trace.gradientsW[layer][row][col]}`,
        );
      }
    }
    for (let col = 0; col < nn.biasMats[layer][0].length; col += 1) {
      const original = nn.biasMats[layer][0][col];
      nn.biasMats[layer][0][col] = original + epsilon;
      const plus = lossAt();
      nn.biasMats[layer][0][col] = original - epsilon;
      const minus = lossAt();
      nn.biasMats[layer][0][col] = original;
      const numeric = (plus - minus) / (2 * epsilon);
      assert.ok(
        Math.abs(numeric - trace.gradientsB[layer][0][col]) < 1e-4,
        `B[${layer}][${col}]: ${numeric} != ${trace.gradientsB[layer][0][col]}`,
      );
    }
  }
});

test("full-batch training solves the Halloween problem and records one metric per epoch", () => {
  const session = build();
  const result = session.run(
    `loss = nn.train(X, y, epochs=800, learning_rate=0.5, momentum=0.1)
P = nn.predict(X)`,
    5,
  );
  assert.equal(result.ok, true, result.error?.message);

  const metrics = result.events.find((event) => event.type === "train_metrics");
  assert.ok(metrics);
  assert.equal(metrics.history.length, 801);
  assert.equal(metrics.history[0].epoch, 0);
  assert.ok(metrics.final_loss < metrics.initial_loss);
  assert.ok(metrics.final_loss < 0.01);
  assert.equal(metrics.accuracy, 1);

  const predictions = session.namespace.P;
  assert.equal(predictions.length, 4);
  assert.deepEqual(predictions.map((row) => (row[0] > 0.5 ? 1 : 0)), [0, 1, 1, 0]);
});

test("stage discipline blocks methods and constructors outside their stage", () => {
  const session = build();
  const blockedConstructor = session.run(`nn2 = NeuralNetwork([2, 1], seed=1)`, 2);
  assert.equal(blockedConstructor.ok, false);
  assert.match(blockedConstructor.error.message, /não está disponível nesta etapa/);

  const forward = session.run(
    `I0 = X[0]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)`,
    2,
  );
  assert.equal(forward.ok, true, forward.error?.message);

  const blockedForward = session.run(`I1 = nn.forward(X[1], 1)`, 3);
  assert.equal(blockedForward.ok, false);
  assert.match(blockedForward.error.message, /não está disponível nesta etapa/);

  const backward = session.run(
    `d2 = nn.backward(y[1], 2)
d1 = nn.backward(d2, 1)`,
    3,
  );
  assert.equal(backward.ok, true, backward.error?.message);
  assert.ok(backward.events.some((event) => event.type === "loss_done"));
  assert.ok(backward.events.some((event) => event.type === "backward_done"));

  const update = session.run(
    `nn.update_weights(0.5, 2, nn.gradient(2))
nn.update_weights(0.5, 1, nn.gradient(1))`,
    4,
  );
  assert.equal(update.ok, true, update.error?.message);
  assert.equal(update.events.filter((event) => event.type === "weights_updated").length, 2);
  assert.equal(update.events.filter((event) => event.type === "network_updated").length, 2);

  const staleBackward = session.run(`d2 = nn.backward(y[1], 2)`, 3);
  assert.equal(staleBackward.ok, false);
  assert.match(staleBackward.error.message, /passagem direta não está completa/);
});

test("a weight update applies W - lr * gradient to the chosen layer", () => {
  const session = build();
  session.run(
    `I0 = X[1]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)`,
    2,
  );
  session.run(`d2 = nn.backward(y[1], 2)`, 3);
  const nn = session.namespace.nn;
  const before = nn.weights[1];
  const gradients = nn.gradient(2);
  const result = session.run(`nn.update_weights(0.5, 2, nn.gradient(2))`, 4);
  assert.equal(result.ok, true, result.error?.message);
  const after = nn.weights[1];
  after.forEach((row, i) => {
    row.forEach((value, j) => {
      assert.ok(Math.abs(value - (before[i][j] - 0.5 * gradients[0][i][j])) < 1e-9);
    });
  });
});

test("the DSL parses assignments, calls, kwargs and indices", () => {
  const program = parseProgram(`X = Features([[0, 0], [0, 1]])
I0 = X[0]
nn = NeuralNetwork([2, 1], hidden="relu", seed=7)
I1 = nn.forward(I0, 1)`);
  assert.equal(program.statements.length, 4);
  assert.equal(program.statements[0].kind, "assign");

  assert.throws(
    () => parseProgram(`for x in X:\n  pass`),
    (error) => error instanceof SourceError && /laços for/.test(error.message),
  );
});

test("seeded networks are deterministic while different seeds differ", () => {
  const a = new NeuralNetwork([2, 3, 1], { init: "xavier", seed: 42 });
  const b = new NeuralNetwork([2, 3, 1], { init: "xavier", seed: 42 });
  const c = new NeuralNetwork([2, 3, 1], { init: "xavier", seed: 43 });
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.notDeepEqual(a.snapshot().weight_mats, c.snapshot().weight_mats);
  assert.equal(a.nParams, 13);
});

test("a new forward pass can restart at layer 1 after an incomplete attempt", () => {
  const session = new Session(1);
  const built = session.run(
    `X = Features([[0, 0], [0, 1], [1, 0], [1, 1]])
y = Labels([0, 1, 1, 0])
nn = NeuralNetwork([2, 3, 5, 1], hidden="relu", output="tanh", init="xavier", seed=42)`,
    1,
  );
  assert.equal(built.ok, true, built.error?.message);

  const partial = session.run(
    `I0 = X[1]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)`,
    2,
  );
  assert.equal(partial.ok, false);
  assert.match(partial.error.message, /passagem direta está incompleta/);

  const full = session.run(
    `I0 = X[1]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)
I3 = nn.forward(I2, 3)`,
    2,
  );
  assert.equal(full.ok, true, full.error?.message);
  assert.ok(full.events.some((event) => event.type === "forward_done"));

  const backward = session.run(
    `d3 = nn.backward(y[1], 3)
d2 = nn.backward(d3, 2)
d1 = nn.backward(d2, 1)`,
    3,
  );
  assert.equal(backward.ok, true, backward.error?.message);
  assert.ok(backward.events.some((event) => event.type === "backward_done"));
});

test("read-only attributes expose the layer count and matrices", () => {
  const session = build();
  const result = session.run(
    `n = nn.n_layers
W = nn.weights
B = nn.biases`,
    2,
  );
  assert.equal(result.ok, true, result.error?.message);
  assert.equal(session.namespace.n, 2);
  assert.equal(session.namespace.W.length, 2);
  assert.equal(session.namespace.B.length, 2);
});
