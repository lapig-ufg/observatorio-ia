import assert from "node:assert/strict";
import test from "node:test";
import { Session } from "../app/neural/engine.ts";
import { applyEvent, buildSteps, initialViz } from "../app/neural/playground-state.ts";

function build() {
  const session = new Session(1);
  const result = session.run(
    `X = Features([[0, 0], [0, 1], [1, 0], [1, 1]])
y = Labels([0, 1, 1, 0])
nn = NeuralNetwork([2, 3, 1], hidden="relu", output="tanh", init="xavier", seed=42)`,
    1,
  );
  assert.equal(result.ok, true);
  return { session, events: result.events };
}

test("buildSteps groups events by source line and marks visual holds", () => {
  const { events } = build();
  const steps = buildSteps(events);
  assert.equal(steps.length, 3);
  assert.equal(steps[0].duration, 400);
  assert.equal(steps[1].duration, 400);
  assert.equal(steps[2].duration, 2000);
  assert.equal(steps[2].visual, true);
  assert.equal(buildSteps(events, true).every((step) => step.duration === 0), true);
});

test("network construction and a forward step populate the canvas state", () => {
  const { session, events } = build();
  const network = events.find((event) => event.type === "network_built");
  let viz = applyEvent(initialViz(), network).viz;
  assert.ok(viz.snapshot);
  assert.equal(viz.snapshot.topology.join(","), "2,3,1");

  const forward = session.run(
    `I0 = X[1]
I1 = nn.forward(I0, 1)
I2 = nn.forward(I1, 2)`,
    2,
  );
  assert.equal(forward.ok, true);
  const layer = forward.events.find((event) => event.type === "layer_done");
  viz = applyEvent(viz, layer).viz;
  assert.equal(viz.values["1-0"], layer.net_out[0]);
  assert.equal(viz.values["0-0"], 0);
  assert.ok(viz.panel?.title.includes("camada 1 de 2"));
  assert.ok(viz.stepPanel);
  assert.equal(viz.hotLayer, 0);
});

test("loss, deltas and chain rules reach the visualization state", () => {
  const { session, events } = build();
  let viz = applyEvent(initialViz(), events.find((event) => event.type === "network_built")).viz;
  session.run(`I0 = X[0]\nI1 = nn.forward(I0, 1)\nI2 = nn.forward(I1, 2)`, 2);

  const backward = session.run(`d2 = nn.backward(y[0], 2)\nd1 = nn.backward(d2, 1)`, 3);
  assert.equal(backward.ok, true);
  for (const event of backward.events) {
    if (event.type === "line") continue;
    viz = applyEvent(viz, event).viz;
  }
  assert.ok(viz.loss !== null);
  assert.equal(viz.lossHot, true);
  assert.equal(viz.errLayers.length, 2);
  assert.ok(Object.keys(viz.deltas).length >= 4);
  assert.ok(viz.chains && Object.keys(viz.chains).length > 0);
  assert.ok(viz.panel?.title.includes("Passagem de volta"));
});

test("a network update clears stale loss, deltas and chains but keeps the snapshot", () => {
  const { session, events } = build();
  let viz = applyEvent(initialViz(), events.find((event) => event.type === "network_built")).viz;
  session.run(`I0 = X[0]\nI1 = nn.forward(I0, 1)\nI2 = nn.forward(I1, 2)`, 2);
  const backward = session.run(`d2 = nn.backward(y[0], 2)`, 3);
  for (const event of backward.events) if (event.type !== "line") viz = applyEvent(viz, event).viz;
  assert.ok(viz.loss !== null);

  const update = session.run(`nn.update_weights(0.5, 2, nn.gradient(2))`, 4);
  const updated = update.events.find((event) => event.type === "network_updated");
  viz = applyEvent(viz, updated).viz;
  assert.equal(viz.loss, null);
  assert.equal(viz.chains, null);
  assert.deepEqual(viz.deltas, {});
  assert.ok(viz.snapshot);
});
