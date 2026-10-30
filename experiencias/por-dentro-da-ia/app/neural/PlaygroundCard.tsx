import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { NetworkCanvas } from "./NetworkCanvas";
import { MatrixPanel } from "./Matrix";
import { ResultsTable, TrainingChart } from "./TrainingChart";
import type { PlaygroundController } from "./playground-state";
import { STAGES } from "./scripts";

export function PlaygroundCard({
  stage,
  controller,
  onGoChapter,
  onNext,
  nextLabel,
  previousLabel,
  previousId,
  observation,
}: {
  stage: number;
  controller: PlaygroundController;
  onGoChapter: (id: string) => void;
  onNext: () => void;
  nextLabel: string;
  previousLabel: string;
  previousId: string;
  observation?: ReactNode;
}) {
  const source = controller.draftFor(stage);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lines = source.split("\n");
  const active = controller.activeLine;
  const visibleBand =
    active !== null && active > 0 && active <= lines.length
      ? 12 + (active - 1) * 20 - scrollTop
      : null;
  const locked = !controller.canRun(stage);
  const complete = controller.completed.has(stage);

  useEffect(() => {
    controller.enterStage(stage);
    setScrollTop(0);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, [stage]);

  useEffect(() => {
    if (controller.activeLine === null) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineTop = (controller.activeLine - 1) * 20;
    if (lineTop < textarea.scrollTop) textarea.scrollTop = lineTop;
    else if (lineTop + 20 > textarea.scrollTop + textarea.clientHeight) {
      textarea.scrollTop = lineTop + 20 - textarea.clientHeight;
    }
  }, [controller.activeLine]);

  const run = () => controller.runStage(stage, source);

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      run();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = `${source.slice(0, start)}  ${source.slice(end)}`;
      controller.updateDraft(stage, next);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  if (locked) {
    return (
      <div className="nn-playground nn-playground-locked">
        <div className="nn-playground-head">
          <div>
            <p className="mini-label">playground {stage} · {STAGES[stage].name}</p>
            <h3>{STAGES[stage].title}</h3>
          </div>
          <span className="nn-lock-badge">etapa bloqueada</span>
        </div>
        <div className="nn-lock-copy">
          <b>Este playground continua o cálculo do playground anterior.</b>
          <p>
            Conclua o playground anterior — <strong>{previousLabel}</strong> — primeiro. A rede, os dados e os valores
            intermediários ficam guardados durante esta aula; o cálculo acontece no navegador.
          </p>
          <button onClick={() => onGoChapter(previousId)}>Ir para o playground anterior →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="nn-playground">
      <div className="nn-playground-head">
        <div>
          <p className="mini-label">playground {stage} · {STAGES[stage].name}</p>
          <h3>{STAGES[stage].title}</h3>
        </div>
        <div className="nn-playground-state">
          {complete && <span className="nn-complete-badge">etapa concluída</span>}
          <button
            className="nn-reset"
            onClick={() => {
              controller.resetTour();
              onGoChapter("construir");
            }}
          >
            Reiniciar tour
          </button>
        </div>
      </div>

      <div className="nn-visual">
        <div className={`nn-status ${controller.statusKind}`} role="status">
          {controller.status}
        </div>
        <NetworkCanvas
          snapshot={controller.viz.snapshot}
          values={controller.viz.values}
          deltas={controller.viz.deltas}
          loss={controller.viz.loss}
          chains={controller.viz.chains}
          hotLayer={controller.viz.hotLayer}
          errLayers={controller.viz.errLayers}
          lossHot={controller.viz.lossHot}
          selection={controller.viz.selection}
          onSelect={controller.select}
          onClear={controller.clearSelection}
        />
        <div className="nn-legend">
          <span><i className="nn-legend-line is-pos" /> peso positivo</span>
          <span><i className="nn-legend-line is-neg" /> peso negativo</span>
          <span>Passe o mouse nos pesos para ler a regra da cadeia; clique em um neurônio ou camada para ver as matrizes.</span>
        </div>

        {controller.viz.panel && (
          <MatrixPanel title={controller.viz.panel.title} groups={controller.viz.panel.groups} />
        )}
        {controller.viz.metrics && <TrainingChart metrics={controller.viz.metrics} />}
        {controller.viz.results && (
          <ResultsTable
            results={controller.viz.results}
            features={controller.viz.features}
            labels={controller.viz.labels}
          />
        )}
      </div>

      {observation && (
        <div className="nn-observe">
          <p className="mini-label">O que observar</p>
          {observation}
        </div>
      )}

      <div className="nn-editor-head">
        <div>
          <h4>Script do playground</h4>
          <span>Edite e execute. <kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
        </div>
        <div className="nn-editor-actions">
          <button className="nn-run" onClick={run}>Executar</button>
          <button onClick={controller.paused ? controller.resume : controller.pause} disabled={!controller.playing}>
            {controller.paused ? "Retomar" : "Pausar"}
          </button>
          <button onClick={onNext} title={nextLabel}>Próximo →</button>
        </div>
      </div>

      <div className="nn-editor">
        <div className="nn-line-numbers" aria-hidden="true">
          <div className="nn-line-numbers-inner" style={{ transform: `translateY(${-scrollTop}px)` }}>
            {lines.map((_, index) => (
              <span key={index} className={controller.activeLine === index + 1 ? "is-active" : ""}>
                {index + 1}
              </span>
            ))}
          </div>
        </div>
        <div className="nn-code-wrap">
          {visibleBand !== null && <div className="nn-line-band" style={{ top: `${visibleBand}px`, height: 20 }} />}
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(event) => controller.updateDraft(stage, event.target.value)}
            onKeyDown={handleEditorKeyDown}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            wrap="off"
            aria-label={`Script do playground de ${STAGES[stage].name}`}
          />
        </div>
      </div>

      {controller.error && (
        <div className="nn-error" role="alert">
          {controller.error.line !== null
            ? `Linha ${controller.error.line}${controller.error.col !== null ? `, coluna ${controller.error.col}` : ""}: `
            : ""}
          {controller.error.message}
        </div>
      )}
    </div>
  );
}
