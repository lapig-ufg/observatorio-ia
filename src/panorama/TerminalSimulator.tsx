import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../analytics";
import { commandMirror, initialSimulatorState, simulatorTransition, type SimulatorAction, type TerminalLine, type Tutorial, type TutorialStep } from "../panoramaEditorial";
import { Prose } from "./EditorialShared";

function Transcript({ lines }: { lines: TerminalLine[] }) {
  return <>{lines.map((line, i) => <div key={i} className={`panorama-terminal-line is-${line.t}`}><code>{line.t === "cmd" ? "$ " : line.t === "cont" ? "> " : line.t === "mais" ? "+ " : line.t === "menos" ? "− " : ""}{line.v || " "}</code></div>)}</>;
}

export function TutorialText({ tutorial, english }: { tutorial: Tutorial; english: boolean }) {
  return <section className="panorama-tutorial-text"><h3>{tutorial.nome} · {tutorial.legenda}</h3><p><Prose text={tutorial.objetivo} /></p>
    <ol>{tutorial.passos.map((step, i) => <li key={i}>
      {(i === 0 || step.ato !== tutorial.passos[i - 1].ato) && <p className="panorama-tutorial-act">{step.ato}</p>}
      <h4>{step.titulo}</h4><p><Prose text={step.explicacao} /></p>
      {step.prompt && <p><strong>{english ? "Task given to the agent: " : "Tarefa dada ao agente: "}</strong><Prose text={step.prompt} /></p>}
      {step.cmd && <pre><code>{step.cmd}</code></pre>}
      {step.saida && <div className="panorama-transcript"><Transcript lines={step.saida} /></div>}
      {step.dialogo && <><h5>{step.dialogo.titulo}</h5><ul>{step.dialogo.linhas.map((l, j) => <li key={j}>{l}</li>)}</ul><p>{step.dialogo.botao}</p></>}
      {step.navegador && <><p>{step.navegador.url}</p><h5>{step.navegador.titulo}</h5><p>{step.navegador.texto}</p><ul>{step.navegador.opcoes?.map((option, j) => <li key={j}>{option}</li>)}</ul><p>{step.navegador.botao}</p></>}
      {step.diff && <><p>{step.diff.arquivo}</p><div className="panorama-transcript"><Transcript lines={step.diff.linhas} /></div><p>{step.diff.botoes?.join(" · ")}</p></>}
      {step.nota && <p className="panorama-reading-note"><Prose text={step.nota} /></p>}
    </li>)}</ol><p><Prose text={tutorial.fecho} /></p>
  </section>;
}

export function TerminalSimulator({ tutorials, english }: { tutorials: Tutorial[]; english: boolean }) {
  const [tutorialId, setTutorialId] = useState(tutorials[0].id);
  const tutorial = tutorials.find(t => t.id === tutorialId) || tutorials[0];
  const [state, setState] = useState(initialSimulatorState);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputScroll, setInputScroll] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const interacted = useRef(false);
  const step = tutorial.passos[state.step];
  const finished = state.phase === "end";
  const done = state.phase === "done";
  const mirror = commandMirror(state.input, step.cmd || "");

  function act(action: SimulatorAction, surface: string) {
    interacted.current = true;
    setState(current => simulatorTransition(current, action, tutorial.passos, english));
    if (action.type !== "type") trackEvent(english ? "panorama_simulator_action_en" : "panorama_simulator_action", { event_category: "tutorial", event_label: `${tutorial.id}:${state.step}:${action.type}:${surface}` });
  }
  useEffect(() => {
    setInputScroll(0);
    setCopyStatus("");
    // Só depois de uma ação: visitar a aba não pode puxar o leitor até o
    // terminal, várias seções abaixo do começo da narrativa.
    if (interacted.current && state.phase === "guide") inputRef.current?.focus({ preventScroll: true });
  }, [state.step, state.phase, tutorial.id]);

  const actionLabel = finished ? (english ? "Start again" : "Recomeçar") : done ? (english ? "Next step" : "Próximo passo") : step.cmd ? (english ? "Type and run for me" : "Digitar e executar por mim") : step.dialogo?.botao || step.navegador?.botao || step.diff?.botoes?.[0] || (english ? "Continue" : "Continuar");
  const primary = (surface: string) => act({ type: finished ? "restart" : done || step.janela !== "terminal" ? "next" : "demonstrate" }, surface);
  const controls = (surface: string) => <div className="panorama-sim-actions">
    <button type="button" disabled={state.step === 0 && !finished} onClick={() => act({ type: "back" }, surface)}>{english ? "Back" : "Voltar"}</button>
    <button type="button" onClick={() => primary(surface)}>{actionLabel}</button>
  </div>;

  // Um terminal guarda os passos contíguos da mesma sessão. As tentativas
  // erradas pertencem ao passo atual e vêm ANTES da linha viva, como no shell.
  let sessionStart = state.step;
  while (sessionStart > 0 && tutorial.passos[sessionStart - 1].janela === "terminal") sessionStart--;
  const history = tutorial.passos.slice(sessionStart, state.step).flatMap(p => [{ t: "cmd", v: p.cmd || "" }, ...(p.saida || [])]);

  return <div className="panorama-simulator">
    <p className="panorama-reading-note">{english ? "Simulation · no commands run on your computer" : "Simulação · nenhum comando é executado no seu computador"}</p>
    <div className="panorama-editorial-chips" role="group" aria-label={english ? "Choose a tutorial" : "Escolher tutorial"}>{tutorials.map(t => <button key={t.id} type="button" aria-pressed={t.id === tutorial.id} onClick={() => {
      interacted.current = true; setTutorialId(t.id); setState(initialSimulatorState());
      trackEvent(english ? "panorama_simulator_tutorial_en" : "panorama_simulator_tutorial", { event_category: "tutorial", event_label: t.id });
    }}>{t.nomeCurto}</button>)}</div>
    <h3>{tutorial.nome}</h3><p>{tutorial.legenda} · {tutorial.minutos} min</p><p><Prose text={tutorial.objetivo} /></p>
    <div className="panorama-sim-screen">
      <section className={`panorama-sim-window is-${step.janela}`} aria-label={english ? "Simulated application window" : "Janela de aplicativo simulada"}>
        <header><span aria-hidden="true">● ● ●</span><strong>{step.dialogo?.titulo || step.navegador?.titulo || step.diff?.arquivo || tutorial.nomeCurto}</strong></header>
        {step.janela === "terminal" ? <div className="panorama-terminal">
          <Transcript lines={history} />
          {step.prompt && <p><Prose text={step.prompt} /></p>}
          {state.attempts.map((attempt, i) => <div className="panorama-terminal-attempt" key={i}><Transcript lines={[{ t: "cmd", v: attempt.command }, { t: "err", v: attempt.error }]} /></div>)}
          {done || finished ? <Transcript lines={[{ t: "cmd", v: step.cmd || "" }, ...(step.saida || [])]} /> : <form onSubmit={event => { event.preventDefault(); act({ type: "submit" }, "window"); }}>
            <label className="panorama-live-command"><span aria-hidden="true">$ </span><span className="panorama-command-field">
              <span className="panorama-command-mirror" aria-hidden="true" style={{ transform: `translateX(-${inputScroll}px)` }}><span className="is-correct">{mirror.correct}</span><span className="is-incorrect">{mirror.incorrect}</span><span className="is-suggestion">{mirror.remaining}</span></span>
              <input ref={inputRef} aria-label={english ? "Type the command" : "Digite o comando"} aria-describedby="panorama-sim-explanation panorama-command-hint" value={state.input} onChange={e => act({ type: "type", value: e.target.value }, "window")} onScroll={e => setInputScroll(e.currentTarget.scrollLeft)} autoComplete="off" autoCapitalize="off" spellCheck={false} onFocus={() => { interacted.current = true; }} />
            </span></label>
            <button type="submit">{english ? "Run command" : "Executar comando"} ↵</button>
          </form>}
          <p className="sr-only" id="panorama-command-hint">{english ? "Expected command: " : "Comando esperado: "}{step.cmd}</p>
        </div> : <StepWindow step={step} complete={done || finished} onAction={() => primary("window")} label={actionLabel} />}
        {(done || finished) && <div className="panorama-sim-window-actions"><button type="button" onClick={() => primary("window")}>{actionLabel}</button></div>}
      </section>
      {/* No celular este balão entra no fluxo abaixo da janela: sua altura
          amplia a tela em vez de comprimir o terminal ou sobrepor os comandos. */}
      <aside className="panorama-sim-balloon" aria-label={english ? "Tutorial guide" : "Guia do tutorial"}>
        <span className="panorama-tutorial-act">{step.ato} · {state.step + 1}/{tutorial.passos.length}</span>
        <h4>{finished ? (english ? "Tutorial completed" : "Tutorial concluído") : step.titulo}</h4>
        <p><Prose text={finished ? tutorial.fecho : step.explicacao} /></p>
        {state.attempts.length > 0 && !done && !finished && <p>{english ? "Check the command and try again." : "Confira o comando e tente de novo."}</p>}
        {controls("balloon")}
      </aside>
    </div>
    <div className="panorama-sim-panel">
      <p id="panorama-sim-explanation"><strong>{state.step + 1}/{tutorial.passos.length} · {step.titulo}.</strong> <Prose text={step.explicacao} /></p>
      {step.cmd && !finished && <><pre><code>{step.cmd}</code></pre><button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(step.cmd || "");
          setCopyStatus(english ? "Command copied." : "Comando copiado.");
          trackEvent(english ? "panorama_simulator_copy_en" : "panorama_simulator_copy", { event_category: "tutorial", event_label: `${tutorial.id}:${state.step}` });
        } catch { setCopyStatus(english ? "Select and copy the command above." : "Selecione e copie o comando acima."); }
      }}>{english ? "Copy command" : "Copiar comando"}</button><span role="status"> {copyStatus}</span></>}
      {(done || finished) && step.nota && <p className="panorama-reading-note"><Prose text={step.nota} /></p>}
      {controls("panel")}
      <p className="panorama-sim-status" role="status" aria-live="polite">{finished ? (english ? "Tutorial completed." : "Tutorial concluído.") : done ? (english ? "Step completed. You can continue." : "Passo concluído. Você pode avançar.") : state.attempts.at(-1)?.error || `${english ? "Current step" : "Passo atual"}: ${step.titulo}`}</p>
    </div>
  </div>;
}

function StepWindow({ step, complete, onAction, label }: { step: TutorialStep; complete: boolean; onAction: () => void; label: string }) {
  return <div className="panorama-sim-window-body">
    {step.janela === "dialogo" && <><h4>{step.dialogo?.titulo}</h4><ul>{step.dialogo?.linhas.map((l, i) => <li key={i}>{l}</li>)}</ul></>}
    {step.janela === "navegador" && <><p className="panorama-sim-address">{step.navegador?.url}</p><h4>{step.navegador?.titulo}</h4><p>{step.navegador?.texto}</p><ul>{step.navegador?.opcoes?.map((option, i) => <li key={i}>{option}</li>)}</ul></>}
    {step.janela === "diff" && <><h4>{step.diff?.arquivo}</h4><div className="panorama-transcript"><Transcript lines={step.diff?.linhas || []} /></div></>}
    {!complete && <button type="button" onClick={onAction}>{label}</button>}
  </div>;
}
