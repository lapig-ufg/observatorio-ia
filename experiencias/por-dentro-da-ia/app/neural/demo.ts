import { buildBackwardTrace, type BackwardTrace } from "./backward";
import { activation, addVectors, rowTimesMatrix } from "./math";
import { NeuralNetwork } from "./network";

export const XOR_X = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export const XOR_Y = [0, 1, 1, 0];

export const DEMO = new NeuralNetwork([2, 3, 1], {
  hidden: "relu",
  output: "tanh",
  init: "xavier",
  seed: 42,
});

export const SAMPLE_INDEX = 1;
export const SAMPLE = XOR_X[SAMPLE_INDEX];
export const SAMPLE_TARGET = XOR_Y[SAMPLE_INDEX];

export const Z1 = addVectors(rowTimesMatrix(SAMPLE, DEMO.weightMats[0]), DEMO.biasMats[0][0]);
export const I1 = activation("relu", Z1);
export const Z2 = addVectors(rowTimesMatrix(I1, DEMO.weightMats[1]), DEMO.biasMats[1][0]);
export const I2 = activation("tanh", Z2);

export const DEMO_OUTPUT = DEMO.feedforward(SAMPLE);
export const DEMO_TRACE: BackwardTrace = buildBackwardTrace(DEMO, DEMO_OUTPUT, [SAMPLE_TARGET]);
