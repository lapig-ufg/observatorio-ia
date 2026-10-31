import { useEffect, useRef, useState } from "react";
import { Session, matrixItem, type MatrixGroup, type MatrixItem, type NeuralEvent, type RunResult } from "./engine";
import type { Chains } from "./backward";
import type { Snapshot, TrainingHistoryPoint } from "./network";
import type { Matrix } from "./math";
import { formatNumber } from "./math";
import { DEFAULT_SCRIPTS, STAGES } from "./scripts";

export type Selection = { kind: "node"; col: number; n: number } | { kind: "layer"; col: number } | null;

export interface PanelState {
  title: string;
  groups: MatrixGroup[];
}

export interface MetricsState {
  epochs: number;
  learning_rate: number;
  momentum: number;
  history: TrainingHistoryPoint[];
  initial_loss: number;
  final_loss: number;
  accuracy: number | null;
}

export interface ResultsState {
  outputs: Matrix;
  shape: [number, number];
}

export interface VizState {
  snapshot: Snapshot | null;
  values: Record<string, number>;
  deltas: Record<string, number>;
  loss: number | null;
  chains: Chains | null;
  panel: PanelState | null;
  stepPanel: PanelState | null;
  metrics: MetricsState | null;
  results: ResultsState | null;
  features: { name: string; values: Matrix } | null;
  labels: { name: string; values: Matrix } | null;
  hotLayer: number | null;
  errLayers: number[];
  lossHot: boolean;
  selection: Selection;
}

export type StatusKind = "" | "ok" | "err" | "info";

export interface Step {
  line: number;
  events: NeuralEvent[];
  visual: boolean;
  minDuration: number;
  duration: number;
}

const LINE_MS = 2000;
const NOOP_MS = 400;
const TRAIN_MS = 3200;

export function initialViz(snapshot: Snapshot | null = null): VizState {
  return {
    snapshot,
    values: {},
    deltas: {},
    loss: null,
    chains: null,
    panel: null,
    stepPanel: null,
    metrics: null,
    results: null,
    features: null,
    labels: null,
    hotLayer: null,
    errLayers: [],
    lossHot: false,
    selection: null,
  };
}

function nodeKey(col: number, n: number) {
  return `${col}-${n}`;
}

function valuesFromActivations(activations: number[][]): Record<string, number> {
  const values: Record<string, number> = {};
  activations.forEach((column, col) => {
    column.forEach((value, n) => {
      values[nodeKey(col, n)] = value;
    });
  });
  return values;
}

function forwardTitle(viz: VizState, ev: Extract<NeuralEvent, { type: "layer_done" }>) {
  const total = viz.snapshot ? viz.snapshot.topology.length - 1 : 1;
  const activation = viz.snapshot
    ? ev.index === total - 1
      ? viz.snapshot.output
      : viz.snapshot.hidden
    : "ativação";
  return `Passagem direta · camada ${ev.index + 1} de ${total} · ${activation}`;
}

function backwardTitle(viz: VizState, ev: Extract<NeuralEvent, { type: "backward_layer" }>) {
  const total = viz.snapshot ? viz.snapshot.topology.length - 1 : 1;
  return `Passagem de volta · camada ${ev.index + 1} de ${total}`;
}

function updateTitle(viz: VizState, ev: Extract<NeuralEvent, { type: "weights_updated" }>) {
  const total = viz.snapshot ? viz.snapshot.topology.length - 1 : 1;
  return `Atualização · camada ${ev.layer + 1} de ${total}`;
}

interface Applied {
  viz: VizState;
  status?: string;
  kind?: StatusKind;
}

export function applyEvent(viz: VizState, ev: NeuralEvent): Applied {
  switch (ev.type) {
    case "network_built":
      return { viz: { ...viz, snapshot: ev.snapshot } };

    case "features_built":
      return { viz: { ...viz, features: { name: ev.name, values: ev.values.map((row) => row.slice()) } } };

    case "labels_built":
      return { viz: { ...viz, labels: { name: ev.name, values: ev.values.map((row) => row.slice()) } } };

    case "forward_start":
      return {
        viz: { ...viz, hotLayer: null, errLayers: [], lossHot: false },
        status: `Passagem direta · entrada [${ev.input.map((value) => formatNumber(value)).join(", ")}]`,
        kind: "info",
      };

    case "layer_done": {
      const values = { ...viz.values };
      ev.inputs.forEach((value, n) => {
        values[nodeKey(ev.index, n)] = value;
      });
      ev.net_out.forEach((value, n) => {
        values[nodeKey(ev.index + 1, n)] = value;
      });
      const panel = { title: forwardTitle(viz, ev), groups: [{ items: ev.matrices, ops: ["×", "+", "=", "→"] }] };
      return {
        viz: {
          ...viz,
          values,
          hotLayer: ev.index,
          panel,
          stepPanel: panel,
        },
        status: `Passagem direta · camada ${ev.index + 1}`,
        kind: "info",
      };
    }

    case "forward_done":
      return {
        viz,
        status: `Saída da rede: [${ev.output.map((value) => formatNumber(value)).join(", ")}]`,
        kind: "ok",
      };

    case "backward_start":
      return {
        viz: {
          ...viz,
          values: valuesFromActivations(ev.activations),
          hotLayer: null,
          errLayers: [],
          loss: null,
          lossHot: false,
        },
        status: `A passagem de volta começa pelo erro. Alvo: [${ev.target.map((value) => formatNumber(value)).join(", ")}]`,
        kind: "info",
      };

    case "loss_done":
      return {
        viz: { ...viz, loss: ev.value, lossHot: true },
        status:
          ev.value === 0
            ? "A perda é 0: a resposta coincide com o alvo."
            : `Perda = ${formatNumber(ev.value, 4)} para esta amostra.`,
        kind: ev.value === 0 ? "ok" : "info",
      };

    case "backward_layer": {
      const deltas = { ...viz.deltas };
      ev.delta.forEach((value, n) => {
        deltas[nodeKey(ev.index + 1, n)] = value;
      });
      const panel = { title: backwardTitle(viz, ev), groups: [{ items: ev.matrices, ops: ["", "ᵀ×", "=", ","] }] };
      return {
        viz: {
          ...viz,
          deltas,
          errLayers: Array.from(new Set([...viz.errLayers, ev.index])),
          panel,
          stepPanel: panel,
        },
        status: `Retropropagação · camada ${ev.index + 1}`,
        kind: "info",
      };
    }

    case "backward_done":
      return {
        viz: { ...viz, chains: ev.chains },
        status: `${ev.n_chains} cadeias de derivadas prontas. Passe o mouse nos pesos para inspecionar.`,
        kind: "ok",
      };

    case "weights_updated": {
      const panel = {
        title: updateTitle(viz, ev),
        groups: [
          { label: "pesos", items: ev.matrices.weight, ops: ["−", "×", "="] },
          { label: "vieses", items: ev.matrices.bias, ops: ["−", "×", "="] },
        ],
      };
      return {
        viz: {
          ...viz,
          panel,
          stepPanel: panel,
        },
        status: `Atualização · camada ${ev.layer + 1} · lr = ${formatNumber(ev.learning_rate)}`,
        kind: "ok",
      };
    }

    case "network_updated":
      return {
        viz: {
          ...viz,
          snapshot: ev.snapshot,
          loss: null,
          chains: null,
          deltas: {},
          lossHot: false,
          errLayers: [],
          selection: null,
        },
      };

    case "train_metrics": {
      const accuracy =
        ev.accuracy === null || ev.accuracy === undefined ? "" : ` · acurácia ${Math.round(ev.accuracy * 100)}%`;
      return {
        viz: {
          ...viz,
          metrics: {
            epochs: ev.epochs,
            learning_rate: ev.learning_rate,
            momentum: ev.momentum,
            history: ev.history,
            initial_loss: ev.initial_loss,
            final_loss: ev.final_loss,
            accuracy: ev.accuracy,
          },
        },
        status: `Treino · ${ev.epochs} épocas · perda ${formatNumber(ev.initial_loss)} → ${formatNumber(ev.final_loss)}${accuracy}`,
        kind: "ok",
      };
    }

    case "predict_done": {
      const panel = { title: "Previsões da rede treinada", groups: [{ items: [matrixItem("P · previsões", ev.outputs)] }] };
      return {
        viz: {
          ...viz,
          results: { outputs: ev.outputs.map((row) => row.slice()), shape: ev.shape },
          panel,
          stepPanel: panel,
        },
        status: `Previsões [${ev.shape[0]}×${ev.shape[1]}] prontas. Compare com os alvos na tabela.`,
        kind: "ok",
      };
    }

    case "line":
    default:
      return { viz };
  }
}

export function applyStep(viz: VizState, step: Step): { viz: VizState; status?: string; kind?: StatusKind } {
  let next = viz;
  let status: string | undefined;
  let kind: StatusKind | undefined;
  for (const event of step.events) {
    const result = applyEvent(next, event);
    next = result.viz;
    if (result.status) {
      status = result.status;
      kind = result.kind;
    }
  }
  return { viz: next, status, kind };
}

export function buildSteps(events: NeuralEvent[], reducedMotion = false): Step[] {
  const built: Step[] = [];
  let current: Step | null = null;

  for (const event of events) {
    if (event.type === "line") {
      current = { line: event.line, events: [], visual: false, minDuration: 0, duration: 0 };
      built.push(current);
      continue;
    }
    if (!current) continue;
    current.events.push(event);
    if (
      event.type === "network_built" ||
      event.type === "layer_done" ||
      event.type === "forward_done" ||
      event.type === "predict_done" ||
      event.type === "backward_start" ||
      event.type === "loss_done" ||
      event.type === "backward_layer" ||
      event.type === "backward_done" ||
      event.type === "weights_updated" ||
      event.type === "network_updated"
    ) {
      current.visual = true;
    }
    if (event.type === "train_metrics") {
      current.visual = true;
      current.minDuration = TRAIN_MS;
    }
  }

  for (const step of built) {
    const base = step.visual ? Math.max(LINE_MS, step.minDuration) : NOOP_MS;
    step.duration = reducedMotion ? 0 : base;
  }
  return built;
}

function prepareViz(previous: VizState, events: NeuralEvent[]): VizState {
  let snapshot = previous.snapshot;
  let features = previous.features;
  let labels = previous.labels;
  let values: Record<string, number> = {};

  for (const event of events) {
    if (event.type === "network_built") snapshot = event.snapshot;
    if (event.type === "features_built") features = { name: event.name, values: event.values };
    if (event.type === "labels_built") labels = { name: event.name, values: event.values };
    if (event.type === "backward_start" && event.activations.length > 0) {
      values = valuesFromActivations(event.activations);
    }
  }

  return {
    ...initialViz(snapshot),
    features,
    labels,
    values,
  };
}

function inspectSelection(viz: VizState, selection: Exclude<Selection, null>): VizState {
  if (!viz.snapshot) return viz;
  const snapshot = viz.snapshot;
  const last = snapshot.topology.length - 1;
  const name = (col: number) => (col === 0 ? "entrada" : col === last ? "saída" : `oculta ${col}`);

  if (selection.kind === "node") {
    const { col, n } = selection;
    const items = [];
    const title = `Neurônio ${n + 1} · ${name(col)}`;
    if (col === 0) {
      const value = viz.values[`0-${n}`];
      if (value !== undefined) items.push(matrixItem("valor de entrada", value));
      items.push(matrixItem("pesos de saída", snapshot.weight_mats[0][n]));
    } else {
      items.push(matrixItem(`pesos que chegam · ${name(col)}`, snapshot.weight_mats[col - 1].map((row) => row[n])));
      items.push(matrixItem("viés", snapshot.bias_mats[col - 1][0][n]));
      const value = viz.values[`${col}-${n}`];
      if (value !== undefined) items.push(matrixItem("ativação", value));
    }
    return { ...viz, selection, panel: { title, groups: [{ items }] } };
  }

  const { col } = selection;
  const items = [];
  let title = `Camada ${name(col)} · W e B`;
  if (col === 0) {
    if (viz.features) items.push(matrixItem(`${viz.features.name} · Features`, viz.features.values));
    const row = Array.from({ length: snapshot.topology[0] }, (_, n) => viz.values[`0-${n}`]);
    if (row.every((value) => value !== undefined)) {
      items.push(matrixItem("linha de entrada atual", row as number[]));
    }
    title = viz.features ? `Camada de entrada · ${viz.features.name}` : "Camada de entrada";
  } else {
    items.push(matrixItem(`W · ${name(col)}`, snapshot.weight_mats[col - 1]));
    items.push(matrixItem(`B · ${name(col)}`, snapshot.bias_mats[col - 1]));
  }
  return { ...viz, selection, panel: { title, groups: [{ items }] } };
}

export function useNeuralPlayground() {
  const sessionRef = useRef<Session | null>(null);
  if (!sessionRef.current) sessionRef.current = new Session(1);

  const [viz, setViz] = useState<VizState>(() => initialViz());
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [status, setStatus] = useState("Execute o script da etapa para começar.");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const [error, setError] = useState<RunResult["error"]>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const appliedRef = useRef(-1);
  const outcomeRef = useRef<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!playing || paused) return;

    if (stepIndex >= steps.length) {
      setPlaying(false);
      setPaused(false);
      setActiveLine(null);
      const outcome = outcomeRef.current;
      if (outcome) {
        setStatus(outcome.message);
        setStatusKind(outcome.ok ? "ok" : "err");
      }
      return;
    }

    const step = steps[stepIndex];
    if (appliedRef.current !== stepIndex) {
      appliedRef.current = stepIndex;
      setActiveLine(step.line);
      const result = applyStep(viz, step);
      setViz(result.viz);
      if (result.status) {
        setStatus(result.status);
        setStatusKind(result.kind ?? "");
      }
    }

    const id = window.setTimeout(() => setStepIndex((index) => index + 1), step.duration);
    return () => window.clearTimeout(id);
  }, [playing, paused, stepIndex, steps]);

  const canRun = (stage: number) => stage === 1 || completed.has(stage - 1);

  const draftFor = (stage: number) => drafts[stage] ?? DEFAULT_SCRIPTS[stage] ?? "";

  const updateDraft = (stage: number, text: string) => {
    setDrafts((current) => ({ ...current, [stage]: text }));
    setCompleted((current) => {
      if (![...current].some((value) => value >= stage)) return current;
      const next = new Set<number>();
      for (const value of current) if (value < stage) next.add(value);
      return next;
    });
    setStatus("Script alterado. Execute para atualizar o cálculo.");
    setStatusKind("");
  };

  const runStage = (stage: number, source: string) => {
    if (!canRun(stage)) return;
    updateDraft(stage, source);
    setError(null);
    setPlaying(false);
    setPaused(false);
    setActiveLine(null);

    const result = sessionRef.current!.run(source, stage);
    if (result.error) setError(result.error);

    if (result.events.length > 0) {
      setViz((previous) => prepareViz(previous, result.events));
      const reducedMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setSteps(buildSteps(result.events, reducedMotion));
      setStepIndex(0);
      appliedRef.current = -1;
      setPlaying(true);
      setPaused(false);
      setStatus("Executando o script…");
      setStatusKind("info");
    } else if (result.error) {
      setStatus("O script não pôde ser executado.");
      setStatusKind("err");
      setSteps([]);
    } else {
      setStatus(STAGES[stage]?.hint ?? "Etapa concluída.");
      setStatusKind("ok");
      setSteps([]);
    }

    if (result.ok) {
      setCompleted((current) => {
        const next = new Set<number>();
        for (const value of current) if (value <= stage) next.add(value);
        next.add(stage);
        return next;
      });
      outcomeRef.current = { ok: true, message: STAGES[stage]?.hint ?? "Etapa concluída." };
    } else {
      setCompleted((current) => {
        const next = new Set<number>();
        for (const value of current) if (value < stage) next.add(value);
        return next;
      });
      outcomeRef.current = { ok: false, message: "O script parou antes do fim. Leia o erro e tente de novo." };
    }
  };

  const pause = () => {
    if (!playing) return;
    setPaused(true);
    setStatus("Animação pausada. Use Retomar para continuar.");
    setStatusKind("info");
  };

  const resume = () => {
    if (!playing) return;
    setPaused(false);
    setViz((current) => ({ ...current, selection: null, panel: current.stepPanel }));
    setStatus("Executando o script…");
    setStatusKind("info");
  };

  const stop = () => {
    setPlaying(false);
    setPaused(false);
    setActiveLine(null);
    setSteps([]);
    setStepIndex(0);
    appliedRef.current = -1;
  };

  const enterStage = (stage: number) => {
    stop();
    setViz((current) => ({
      ...current,
      panel: null,
      stepPanel: null,
      metrics: null,
      results: null,
      selection: null,
    }));
    setError(null);
    if (completed.has(stage)) {
      setStatus("Esta etapa já foi concluída nesta sessão. Execute novamente para atualizar o cálculo.");
      setStatusKind("ok");
    } else {
      setStatus("Execute o script da etapa para começar.");
      setStatusKind("");
    }
  };

  const select = (selection: Exclude<Selection, null>) => {
    if (playing) {
      setPaused(true);
      setStatus("Animação pausada para inspeção.");
      setStatusKind("info");
    }
    setViz((current) => inspectSelection(current, selection));
  };

  const clearSelection = () => {
    setViz((current) => ({ ...current, selection: null, panel: current.stepPanel }));
  };

  const resetTour = () => {
    sessionRef.current = new Session(1);
    setViz(initialViz());
    setCompleted(new Set());
    setDrafts({});
    setSteps([]);
    setStepIndex(0);
    setPlaying(false);
    setPaused(false);
    setActiveLine(null);
    setError(null);
    setStatus("Tour reiniciado. Execute o script da etapa 1 para começar.");
    setStatusKind("");
    appliedRef.current = -1;
    outcomeRef.current = null;
  };

  return {
    viz,
    completed,
    status,
    statusKind,
    error,
    steps,
    stepIndex,
    playing,
    paused,
    activeLine,
    canRun,
    draftFor,
    updateDraft,
    runStage,
    pause,
    resume,
    resetTour,
    enterStage,
    stop,
    select,
    clearSelection,
  };
}

export type PlaygroundController = ReturnType<typeof useNeuralPlayground>;
