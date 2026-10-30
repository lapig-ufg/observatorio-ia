export type Vector = number[];
export type Matrix = number[][];
export type ActivationName = "relu" | "tanh";
export type InitName = "random" | "xavier";

export const ACTIVATION_NAMES: ActivationName[] = ["relu", "tanh"];
export const INIT_NAMES: InitName[] = ["random", "xavier"];

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function formatMetric(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return String(Number(value.toPrecision(3)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function zeros(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

export function deepCopy(matrix: Matrix): Matrix {
  return matrix.map((row) => row.slice());
}

export function rowTimesMatrix(vector: Vector, matrix: Matrix): Vector {
  const out = new Array(matrix[0]?.length ?? 0).fill(0) as number[];
  for (let row = 0; row < matrix.length; row += 1) {
    const value = vector[row] ?? 0;
    for (let col = 0; col < matrix[row].length; col += 1) {
      out[col] += value * matrix[row][col];
    }
  }
  return out;
}

export function addVectors(a: Vector, b: Vector): Vector {
  return a.map((value, index) => value + (b[index] ?? 0));
}

export function subtractVectors(a: Vector, b: Vector): Vector {
  return a.map((value, index) => value - (b[index] ?? 0));
}

export function scaleVector(vector: Vector, factor: number): Vector {
  return vector.map((value) => value * factor);
}

export function outer(a: Vector, b: Vector): Matrix {
  return a.map((value) => b.map((other) => value * other));
}

export function addMatrices(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((value, j) => value + (b[i]?.[j] ?? 0)));
}

export function subtractMatrices(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((value, j) => value - (b[i]?.[j] ?? 0)));
}

export function scaleMatrix(matrix: Matrix, factor: number): Matrix {
  return matrix.map((row) => row.map((value) => value * factor));
}

export function transpose(matrix: Matrix): Matrix {
  return (matrix[0] ?? []).map((_, col) => matrix.map((row) => row[col]));
}

export function sumSquares(vector: Vector): number {
  return vector.reduce((sum, value) => sum + value * value, 0);
}

export function allClose(a: Vector, b: Vector, tolerance = 1e-8): boolean {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
}

export function activation(name: ActivationName, x: Vector, derivative = false): Vector {
  if (name === "relu") {
    return derivative ? x.map((value) => (value > 0 ? 1 : 0)) : x.map((value) => Math.max(0, value));
  }
  const values = x.map((value) => Math.tanh(value));
  return derivative ? values.map((value) => 1 - value * value) : values;
}

export function activationScalar(name: ActivationName, x: number, derivative = false): number {
  return activation(name, [x], derivative)[0];
}

/**
 * Small deterministic PRNG used by every seeded network on the page.
 * It is not NumPy's generator: the lesson always displays values produced by
 * this same stream, so copy and playground never disagree.
 */
export function makeRng(seed: number | null): () => number {
  if (seed === null || seed === undefined) return () => Math.random();
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeUniform(rng: () => number) {
  return (rows: number, cols: number, lower = 0, upper = 1): Matrix =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => lower + rng() * (upper - lower)));
}

export function initialMatrices(
  topology: number[],
  init: InitName,
  rng: () => number,
): { weights: Matrix[]; biases: Matrix[] } {
  const uniform = makeUniform(rng);
  const weights: Matrix[] = [];
  const biases: Matrix[] = [];
  const bound = 1 / Math.sqrt(topology[0] || 1);

  for (let layer = 0; layer < topology.length - 1; layer += 1) {
    const rows = topology[layer];
    const cols = topology[layer + 1];
    if (init === "xavier") {
      weights.push(uniform(rows, cols, -bound, bound));
      biases.push(uniform(1, cols, -bound, bound));
    } else {
      weights.push(uniform(rows, cols));
      biases.push(uniform(1, cols));
    }
  }

  return { weights, biases };
}
