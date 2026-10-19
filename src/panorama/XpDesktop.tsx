import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { trackEvent } from "../analytics";
import { commandMirror } from "../panoramaEditorial";
import {
  CLI_TUTORIALS, NODE_LTS_MAJOR, OS_LABELS, SHELL, STALE_AFTER_DAYS, VERIFIED_AT,
  commandMatches, detectOs, pick, projectDir, resolveSteps, stepCommand, stepOutput, verificationAgeDays, wrongCommandOutput,
  type CliStep, type CliTutorial, type Line, type Locale, type OsId, type Profile,
} from "../panoramaCliTutorials";
import { formatPublicDate } from "../dateLabels";
import "./xp.css";

/* Um computador com cara de Windows XP, de propósito: a nostalgia baixa a
   guarda de quem nunca abriu um terminal. Dentro dele, o terminal tem a cara
   do sistema de QUEM LÊ (PowerShell, Terminal do macOS ou bash), porque é
   essa janela que a pessoa vai reencontrar no próprio computador.
   Nada aqui executa comandos de verdade. */

type WinId = "terminal" | "browser" | "dialog" | "notepad";
type WinState = { open: boolean; min: boolean; max: boolean; x: number; y: number; z: number };
type Phase = "guide" | "typing" | "running" | "done" | "end";

const INITIAL_WINDOWS: Record<WinId, WinState> = {
  terminal: { open: false, min: false, max: false, x: 104, y: 12, z: 1 },
  browser: { open: false, min: false, max: false, x: 190, y: 30, z: 2 },
  dialog: { open: false, min: false, max: false, x: 260, y: 110, z: 3 },
  notepad: { open: true, min: false, max: false, x: 150, y: 40, z: 4 },
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function XpDesktop({ english }: { english: boolean }) {
  const locale: Locale = english ? "en" : "pt";
  const tr = (value: { pt: string; en: string }) => value[locale];
  const [profile, setProfile] = useState<Profile>(() => ({ os: typeof navigator === "undefined" ? "windows" : detectOs(navigator.userAgent, navigator.platform), node: "no" }));
  // No celular o sistema é só um palpite (o tutorial é para o computador): sem selo.
  const [detected] = useState(() => typeof navigator !== "undefined" && /android|iphone|ipad/i.test(navigator.userAgent) ? null : profile.os);
  const [tutorialId, setTutorialId] = useState<CliTutorial["id"] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("guide");
  const [input, setInput] = useState("");
  const [attempts, setAttempts] = useState<Array<{ command: string; lines: Line[] }>>([]);
  const [revealed, setRevealed] = useState(0);
  const [windows, setWindows] = useState(INITIAL_WINDOWS);
  const [startOpen, setStartOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [booting, setBooting] = useState(false);
  const [copied, setCopied] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 899px)").matches);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 899px)");
    if (!query) return;
    const changed = () => setMobile(query.matches);
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  const shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#panorama/como-usar?secao=tutorial`;
    try {
      if (canShare) await navigator.share({ title: english ? "AI beyond the browser: tutorial" : "IA fora do navegador: tutorial", url });
      else { await navigator.clipboard.writeText(url); setCopied("link"); window.setTimeout(() => setCopied(""), 2000); }
      event("mobile_link", canShare ? "share" : "copy");
    } catch { /* o leitor cancelou o compartilhamento */ }
  };
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalBody = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const zTop = useRef(10);
  const clock = useClock();

  const tutorial = CLI_TUTORIALS.find((item) => item.id === tutorialId) || null;
  const steps = useMemo(() => tutorial ? resolveSteps(tutorial, profile) : [], [tutorial, profile]);
  const step: CliStep | null = steps[stepIndex] || null;
  const command = step ? stepCommand(step, profile.os, locale) : "";
  const output = useMemo(() => step ? stepOutput(step, { ...profile, locale }) : [], [step, profile, locale]);
  const age = verificationAgeDays(Date.now());

  /* Liga o computador quando a tela entra na vista, uma vez só. */
  useEffect(() => {
    const element = screenRef.current;
    if (!element || booted) return;
    if (reducedMotion() || typeof IntersectionObserver === "undefined") { setBooted(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setBooting(true);
        window.setTimeout(() => { setBooting(false); setBooted(true); }, 2200);
      }
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [booted, mobile]);

  useEffect(() => {
    const element = screenRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 720));
    observer.observe(element);
    return () => observer.disconnect();
  }, [mobile]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* A janela do passo atual aparece (derivada do passo, abaixo) e vem para a
     frente; minimizar só vale até o próximo passo. */
  useEffect(() => {
    if (!step) return;
    zTop.current += 1;
    const focus: WinId = step.window;
    const z = zTop.current;
    setWindows((current) => ({
      ...current,
      terminal: { ...current.terminal, min: focus === "terminal" ? false : current.terminal.min },
      browser: { ...current.browser, min: false },
      dialog: { ...current.dialog, min: false },
      [focus]: { ...current[focus], min: false, z },
    }));
  }, [step, stepIndex]);

  useEffect(() => {
    if (step?.window === "terminal" && phase === "guide" && tutorialId) inputRef.current?.focus({ preventScroll: true });
  }, [step, phase, tutorialId]);

  useEffect(() => {
    const body = terminalBody.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [revealed, phase, stepIndex, attempts, input]);

  const event = (name: string, label: string) => trackEvent(`panorama_xp_${name}${english ? "_en" : ""}`, { event_category: "tutorial", event_label: label });

  function resetTutorial(id: CliTutorial["id"] | null) {
    window.clearTimeout(timer.current);
    setTutorialId(id);
    setStepIndex(0);
    setPhase("guide");
    setInput("");
    setAttempts([]);
    setRevealed(0);
    setStartOpen(false);
    setWindows((current) => ({ ...INITIAL_WINDOWS, notepad: { ...current.notepad, open: id ? false : current.notepad.open } }));
    if (id) event("open", id);
  }

  function focusWindow(id: WinId) {
    zTop.current += 1;
    setWindows((current) => ({ ...current, [id]: { ...current[id], open: true, min: false, z: zTop.current } }));
  }
  function updateWindow(id: WinId, patch: Partial<WinState>) {
    setWindows((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function changeProfile(patch: Partial<Profile>) {
    setProfile((current) => ({ ...current, ...patch }));
    if (tutorialId) resetTutorial(tutorialId);
    event("profile", JSON.stringify(patch));
  }

  function run() {
    if (!step) return;
    setPhase("running");
    setRevealed(0);
    const lines = output;
    if (!lines.length || reducedMotion()) { setRevealed(lines.length); setPhase("done"); return; }
    let index = 0;
    const tick = () => {
      index += 1;
      setRevealed(index);
      if (index >= lines.length) { setPhase("done"); return; }
      const next = lines[index];
      timer.current = window.setTimeout(tick, lines[index - 1].t === "progress" ? 1400 : next.t === "agent" ? 380 : 230);
    };
    timer.current = window.setTimeout(tick, 350);
  }

  function submit() {
    if (!step || phase !== "guide") return;
    if (!input.trim()) return;
    if (commandMatches(input, command, profile.os)) { setInput(command); run(); event("run", `${tutorialId}:${step.id}`); return; }
    setAttempts((current) => [...current, { command: input, lines: wrongCommandOutput(input, command, profile.os, step.prompt === "agent", locale) }]);
    setInput("");
    event("wrong", `${tutorialId}:${step.id}`);
  }

  /* "Digitar por mim": digita letra por letra, depressa, e executa. */
  function demonstrate() {
    if (!step || phase !== "guide") return;
    if (reducedMotion()) { setInput(command); run(); return; }
    setPhase("typing");
    let index = input && command.startsWith(input) ? input.length : 0;
    const type = () => {
      index = Math.min(command.length, index + Math.max(1, Math.round(command.length / 28)));
      setInput(command.slice(0, index));
      if (index >= command.length) { timer.current = window.setTimeout(run, 250); return; }
      timer.current = window.setTimeout(type, 28);
    };
    type();
    event("demonstrate", `${tutorialId}:${step.id}`);
  }

  function next() {
    window.clearTimeout(timer.current);
    if (stepIndex >= steps.length - 1) { setPhase("end"); event("finish", tutorialId || ""); return; }
    setStepIndex((value) => value + 1);
    setPhase("guide");
    setInput("");
    setAttempts([]);
    setRevealed(0);
  }
  function back() {
    window.clearTimeout(timer.current);
    if (phase === "end") { setPhase("done"); return; }
    if (stepIndex === 0) return;
    setStepIndex((value) => value - 1);
    setPhase("guide");
    setInput("");
    setAttempts([]);
    setRevealed(0);
  }

  /* Terminal: os passos de terminal já feitos desde a última vez que ele foi
   aberto, mais o atual. A pasta muda depois do `cd`. */
  const sessionStart = (() => {
    let start = 0;
    steps.forEach((item, index) => { if (item.freshTerminal && index <= stepIndex) start = index + 1; });
    return start;
  })();
  const cwdAt = (index: number) => steps.slice(0, index).some((item) => item.cwd === "project") ? projectDir(profile.os) : SHELL[profile.os].home;
  const promptFor = (item: CliStep, index: number) => item.prompt === "agent" ? "› " : SHELL[profile.os].prompt(cwdAt(index));
  const history = steps.slice(sessionStart, stepIndex).map((item, offset) => ({ item, index: sessionStart + offset })).filter(({ item }) => item.window === "terminal");
  const currentIsTerminal = step?.window === "terminal";
  const terminalOpen = !!tutorial && (stepIndex > 0 || currentIsTerminal);
  const doneStep = phase === "done" || phase === "end";

  const primaryLabel = !step ? "" : phase === "end" ? (english ? "Start again" : "Recomeçar")
    : step.window !== "terminal" ? tr((step.dialog?.button || step.browser?.button)!)
    : doneStep ? (english ? "Next step" : "Próximo passo")
    : phase === "guide" ? (english ? "Type it for me" : "Digitar por mim") : (english ? "Running…" : "Executando…");
  const primary = () => {
    if (!step) return;
    if (phase === "end") { resetTutorial(tutorialId); return; }
    if (step.window !== "terminal" || doneStep) { next(); return; }
    demonstrate();
  };

  const mirror = commandMirror(input, command);
  const shell = SHELL[profile.os];
  const startTutorial = (id: CliTutorial["id"]) => { resetTutorial(id); };
  const allCommands = steps.map((item, index) => ({ item, index, cmd: stepCommand(item, profile.os, locale) }));

  const copy = async (value: string, key: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); event("copy", key); window.setTimeout(() => setCopied(""), 1800); } catch { setCopied(""); }
  };

  const profileBar = <>
    <div className="xp-profile" role="group" aria-label={english ? "Your computer" : "O seu computador"}>
      <div>
        <span className="xp-profile-label">{english ? "Your system" : "Seu sistema"}</span>
        <div className="xp-seg">{(Object.keys(OS_LABELS) as OsId[]).map((os) => <button key={os} type="button" aria-pressed={profile.os === os} onClick={() => changeProfile({ os })}>{tr(OS_LABELS[os])}{os === detected && <small>{english ? "detected" : "detectado"}</small>}</button>)}</div>
      </div>
      <div>
        <span className="xp-profile-label">Node.js <small>({english ? `version ${NODE_LTS_MAJOR - 4}+ · used by the Ollama tutorial` : `versão ${NODE_LTS_MAJOR - 4}+ · usado no tutorial do Ollama`})</small></span>
        <div className="xp-seg">
          <button type="button" aria-pressed={profile.node === "yes"} onClick={() => changeProfile({ node: "yes" })}>{english ? "I have it" : "Já tenho"}</button>
          <button type="button" aria-pressed={profile.node === "no"} onClick={() => changeProfile({ node: "no" })}>{english ? "I don’t / not sure" : "Não tenho / não sei"}</button>
        </div>
      </div>
    </div>

  </>;
  const scriptBlock = <>
    {tutorial ? <section className="xp-script" aria-labelledby="xp-script-title">
      <header>
        <h3 id="xp-script-title">{english ? "Now on your computer" : "Agora no seu computador"} · {tutorial.name} · {tr(OS_LABELS[profile.os])}</h3>
        <p>{tr(tutorial.goal)}</p>
      </header>
      <ol>{allCommands.map(({ item, index, cmd }) => <li key={item.id} className={index === stepIndex && phase !== "end" ? "is-current" : index < stepIndex || phase === "end" ? "is-done" : ""}>
        <div className="xp-script-title"><span>{index + 1}</span><strong>{tr(item.title)}</strong></div>
        {cmd ? <div className="xp-script-cmd"><code>{cmd}</code><button type="button" onClick={() => copy(cmd, `${tutorial.id}:${item.id}`)}>{copied === `${tutorial.id}:${item.id}` ? (english ? "Copied" : "Copiado") : (english ? "Copy" : "Copiar")}</button></div>
          : item.dialog ? <p>{pick(item.dialog.lines, profile.os).map((line) => tr(line)).join(" ")}</p>
          : item.browser ? <p>{tr(pick(item.explain, profile.os))}</p> : null}
        {item.prompt === "agent" && <small>{english ? "Typed inside the agent, not in the system terminal." : "Escrito dentro do agente, não no terminal do sistema."}</small>}
      </li>)}</ol>
      <footer>{english ? "Official sources:" : "Fontes oficiais:"} {tutorial.sources.map((source, i) => <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></span>)}</footer>
    </section> : <p className="xp-script-empty">{english ? "Open a program on the simulated desktop: the commands for your system will appear here, ready to copy." : "Abra um programa na área de trabalho simulada: os comandos para o seu sistema aparecem aqui, prontos para copiar."}</p>}
  </>;

  /* Em tela estreita o computador simulado não cabe, e o tutorial só serve
     para quem vai repetir os comandos num computador. Fica o convite para
     abrir no computador e, para quem quiser, o roteiro em texto. */
  if (mobile) return <div className="xp-sim is-mobile">
    <div className="xp-mobile-card">
      <div className="xp-mobile-art" aria-hidden="true"><div className="xp-mobile-screen"><span className="xp-mobile-win"><i />{tr(SHELL[profile.os].title)}</span><span className="xp-mobile-bar"><span className="xp-flag" /></span></div><div className="xp-mobile-stand" /></div>
      <div>
        <h3>{english ? "This tutorial is made for a computer" : "Este tutorial é para fazer no computador"}</h3>
        <p>{english ? "It simulates a real installation, step by step, so you can repeat it right away on Windows, macOS or Linux. Open this page on the computer where you will install the tools." : "Ele simula uma instalação de verdade, passo a passo, para você repetir em seguida no Windows, no macOS ou no Linux. Abra esta página no computador onde vai instalar as ferramentas."}</p>
        <div className="xp-mobile-actions">
          <button type="button" className="is-primary" onClick={shareLink}>{canShare ? (english ? "Send the link to myself" : "Enviar o link para mim") : (english ? "Copy the link" : "Copiar o link")}</button>
          {copied === "link" && <span role="status">{english ? "Link copied." : "Link copiado."}</span>}
        </div>
      </div>
    </div>
    <details className="xp-mobile-more" onToggle={(e) => { if (e.currentTarget.open) event("mobile_script", profile.os); }}>
      <summary>{english ? "See the commands as text anyway" : "Ver os comandos em texto mesmo assim"}</summary>
      {profileBar}
      <div className="xp-seg xp-mobile-tutorials" role="group" aria-label={english ? "Tutorial" : "Tutorial"}>{CLI_TUTORIALS.map((item) => <button key={item.id} type="button" aria-pressed={tutorialId === item.id} onClick={() => resetTutorial(item.id)}>{item.name}</button>)}</div>
      {tutorial ? scriptBlock : null}
    </details>
  </div>;

  return <div className="xp-sim">
    {profileBar}
    <div className={`xp-screen${narrow ? " is-narrow" : ""}`} ref={screenRef} aria-label={english ? "Simulated computer. No command runs on your machine." : "Computador simulado. Nenhum comando roda na sua máquina."} role="region">
      {booting && <div className="xp-boot" aria-hidden="true"><div className="xp-boot-logo"><span className="xp-flag" /><strong>Windows<sup>xp</sup></strong></div><div className="xp-boot-bar"><i /><i /><i /></div><small>{english ? "Starting the simulated computer…" : "Iniciando o computador simulado…"}</small></div>}
      <div className="xp-wallpaper" onClick={() => setStartOpen(false)}>
        <ul className="xp-icons">
          {CLI_TUTORIALS.map((item) => <li key={item.id}><button type="button" className="xp-icon" onClick={() => startTutorial(item.id)} aria-label={`${english ? "Open the tutorial" : "Abrir o tutorial"} ${item.name}`}>
            <span className={`xp-icon-img is-${item.icon}`} aria-hidden="true">{item.icon === "ollama" ? <OllamaGlyph /> : <AntigravityGlyph />}</span><span>{item.name}</span>
          </button></li>)}
          <li><button type="button" className="xp-icon" onClick={() => focusWindow("notepad")}><span className="xp-icon-img is-txt" aria-hidden="true"><TxtGlyph /></span><span>{english ? "Read-me.txt" : "Leia-me.txt"}</span></button></li>
          <li aria-hidden="true"><span className="xp-icon is-decor"><span className="xp-icon-img is-bin"><BinGlyph /></span><span>{english ? "Recycle Bin" : "Lixeira"}</span></span></li>
        </ul>

        {!tutorial && booted && !windows.notepad.open && <div className="xp-hint" role="note">{english ? "Pick a program on the desktop (or in Start) to begin." : "Escolha um programa na área de trabalho (ou em Iniciar) para começar."}</div>}

        {windows.notepad.open && !windows.notepad.min && <XpWindow english={english} id="notepad" state={windows.notepad} narrow={narrow} title={english ? "Read-me.txt - Notepad" : "Leia-me.txt - Bloco de notas"} icon={<TxtGlyph />} onFocus={focusWindow} onUpdate={updateWindow} onClose={() => updateWindow("notepad", { open: false })} className="xp-notepad" menu={english ? ["File", "Edit", "Format", "View", "Help"] : ["Arquivo", "Editar", "Formatar", "Exibir", "Ajuda"]}>
          <div className="xp-notepad-body">
            <p>{english ? "WHAT IS THIS SCREEN" : "O QUE É ESTA TELA"}</p>
            <p>{english ? "A pretend computer. The commands are the real ones, for the system you chose above, but nothing runs here." : "Um computador de mentira. Os comandos são os de verdade, para o sistema que você escolheu acima, mas nada é executado aqui."}</p>
            <p>{english ? "1. Choose your system and whether you have Node.js." : "1. Escolha o seu sistema e se você tem o Node.js."}<br />{english ? "2. Open Ollama or Antigravity CLI on the desktop." : "2. Abra o Ollama ou o Antigravity CLI na área de trabalho."}<br />{english ? "3. Type each command (or click “Type it for me”)." : "3. Digite cada comando (ou clique em “Digitar por mim”)."}<br />{english ? "4. Repeat on your computer using the script below the screen." : "4. Repita no seu computador com o roteiro abaixo da tela."}</p>
            <p>{english ? "Commands checked on" : "Comandos conferidos em"} {formatPublicDate(VERIFIED_AT, locale)} {english ? "on the official pages. These tools change fast: if something differs, the official page wins." : "nas páginas oficiais. Essas ferramentas mudam rápido: se algo não bater, vale a página oficial."}</p>
          </div>
        </XpWindow>}

        {terminalOpen && !windows.terminal.min && <XpWindow english={english} id="terminal" state={windows.terminal} narrow={narrow} title={tr(shell.title)} icon={<TerminalGlyph />} onFocus={focusWindow} onUpdate={updateWindow} onClose={() => updateWindow("terminal", { min: true })} className={`xp-terminal-window is-${profile.os}`}>
          <div className={`xp-term is-${profile.os}`} ref={terminalBody} onClick={() => inputRef.current?.focus({ preventScroll: true })}>
            {profile.os === "windows" && sessionStart === 0 && <div className="xp-term-line is-dim">Windows PowerShell{"\n"}Copyright (C) Microsoft Corporation. {english ? "All rights reserved." : "Todos os direitos reservados."}{"\n"} </div>}
            {profile.os === "linux" && sessionStart === 0 && <div className="xp-term-line is-dim">Ubuntu 24.04 LTS{"\n"} </div>}
            {profile.os === "mac" && sessionStart === 0 && <div className="xp-term-line is-dim">Last login: {english ? "today" : "hoje"} on ttys000{"\n"} </div>}
            {history.map(({ item, index }) => <div key={item.id}>
              <div className="xp-term-line"><span className="xp-term-prompt">{promptFor(item, index)}</span>{stepCommand(item, profile.os, locale)}</div>
              {stepOutput(item, { ...profile, locale }).map((line, i) => <TermLine key={i} line={line} done />)}
            </div>)}
            {currentIsTerminal && step && <>
              {attempts.map((attempt, i) => <div key={i}><div className="xp-term-line"><span className="xp-term-prompt">{promptFor(step, stepIndex)}</span>{attempt.command}</div>{attempt.lines.map((line, j) => <TermLine key={j} line={line} done />)}</div>)}
              {phase === "guide" || phase === "typing" ? <form className="xp-term-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <span className="xp-term-prompt">{promptFor(step, stepIndex)}</span>
                <span className="xp-term-field">
                  <span className="xp-term-mirror" aria-hidden="true"><span className="is-ok">{mirror.correct}</span><span className="is-bad">{mirror.incorrect}</span><span className="xp-caret" /><span className="is-ghost">{mirror.remaining}</span></span>
                  <input ref={inputRef} value={input} readOnly={phase === "typing"} onChange={(e) => setInput(e.target.value)} aria-label={english ? `Type the command: ${command}` : `Digite o comando: ${command}`} autoComplete="off" autoCapitalize="off" spellCheck={false} />
                </span>
              </form> : <>
                <div className="xp-term-line"><span className="xp-term-prompt">{promptFor(step, stepIndex)}</span>{command}</div>
                {output.slice(0, revealed).map((line, i) => <TermLine key={i} line={line} done={phase !== "running" || i < revealed - 1} />)}
                {phase === "running" && <div className="xp-term-line"><span className="xp-caret is-blink" /></div>}
                {doneStep && <div className="xp-term-line"><span className="xp-term-prompt">{step.prompt === "agent" && step.id !== "codex-exit" ? "› " : shell.prompt(cwdAt(stepIndex + 1))}</span><span className="xp-caret is-blink" /></div>}
              </>}
            </>}
          </div>
        </XpWindow>}

        {tutorial && step?.window === "browser" && step.browser && !windows.browser.min && <XpWindow english={english} id="browser" state={windows.browser} narrow={narrow} title={`${tr(step.browser.title)} - Internet Explorer`} icon={<IeGlyph />} onFocus={focusWindow} onUpdate={updateWindow} onClose={() => updateWindow("browser", { min: true })} className="xp-browser" menu={english ? ["File", "Edit", "View", "Favorites", "Tools", "Help"] : ["Arquivo", "Editar", "Exibir", "Favoritos", "Ferramentas", "Ajuda"]}>
          <div className="xp-address"><span>{english ? "Address" : "Endereço"}</span><code>{step.browser.url}</code><b>{english ? "Go" : "Ir"}</b></div>
          <div className="xp-page">
            <h4>{tr(step.browser.title)}</h4>
            <p>{tr(step.browser.body)}</p>
            {step.browser.options && <ul>{step.browser.options.map((option, i) => <li key={i} className={i === 0 ? "is-selected" : ""}>{tr(option)}</li>)}</ul>}
            <button type="button" className="xp-page-button" onClick={next}>{tr(step.browser.button)}</button>
          </div>
        </XpWindow>}

        {tutorial && step?.window === "dialog" && step.dialog && !windows.dialog.min && <XpWindow english={english} id="dialog" state={windows.dialog} narrow={narrow} title={tr(step.dialog.title)} onFocus={focusWindow} onUpdate={updateWindow} onClose={() => updateWindow("dialog", { min: true })} className="xp-dialog" small>
          <div className="xp-dialog-body">
            <span className={`xp-dialog-icon is-${step.dialog.icon || "info"}`} aria-hidden="true">{step.dialog.icon === "warn" ? "!" : step.dialog.icon === "question" ? "?" : "i"}</span>
            <ul>{pick(step.dialog.lines, profile.os).map((line, i) => <li key={i}>{tr(line)}</li>)}</ul>
          </div>
          <div className="xp-dialog-actions"><button type="button" className="xp-button is-default" onClick={next}>{tr(step.dialog.button)}</button></div>
        </XpWindow>}

        {tutorial && step && <aside className="xp-balloon" aria-live="polite" aria-label={english ? "Tutorial guide" : "Guia do tutorial"}>
          <header><span className="xp-balloon-icon" aria-hidden="true">i</span><strong>{phase === "end" ? (english ? "Tutorial completed" : "Tutorial concluído") : tr(step.title)}</strong><button type="button" className="xp-balloon-close" onClick={() => resetTutorial(null)} aria-label={english ? "Close tutorial" : "Fechar tutorial"}>×</button></header>
          <p className="xp-balloon-meta">{tutorial.name} · {tr(step.act)} · {english ? "step" : "passo"} {stepIndex + 1}/{steps.length}</p>
          <div className="xp-progress" aria-hidden="true"><i style={{ width: `${((stepIndex + (doneStep ? 1 : 0)) / steps.length) * 100}%` }} /></div>
          <p>{phase === "end" ? tr(tutorial.closing) : renderInline(tr(pick(step.explain, profile.os)))}</p>
          {doneStep && phase !== "end" && step.note && <p className="xp-balloon-note">{renderInline(tr(pick(step.note, profile.os)))}</p>}
          {attempts.length > 0 && phase === "guide" && <p className="xp-balloon-warn">{step.prompt === "agent" ? (english ? "Type the suggested request, shown in grey." : "Escreva o pedido sugerido, em cinza.") : (english ? "Compare with the grey text: every character counts." : "Compare com o texto em cinza: cada caractere conta.")}</p>}
          <div className="xp-balloon-actions">
            <button type="button" className="xp-button" onClick={back} disabled={stepIndex === 0 && phase !== "end"}>{english ? "Back" : "Voltar"}</button>
            <button type="button" className="xp-button is-default" onClick={primary} disabled={phase === "running" || phase === "typing"}>{primaryLabel}</button>
          </div>
        </aside>}

        {startOpen && <div className="xp-start-menu" onClick={(e) => e.stopPropagation()}>
          <header><span className="xp-avatar" aria-hidden="true" /><strong>{english ? "you" : "voce"}</strong></header>
          <div className="xp-start-cols">
            <ul>
              {CLI_TUTORIALS.map((item) => <li key={item.id}><button type="button" onClick={() => startTutorial(item.id)}><span className={`xp-icon-img is-${item.icon} is-small`} aria-hidden="true">{item.icon === "ollama" ? <OllamaGlyph /> : <AntigravityGlyph />}</span><span><strong>{item.name}</strong><em>{tr(item.tagline)}</em></span></button></li>)}
              <li><button type="button" onClick={() => { setStartOpen(false); focusWindow("notepad"); }}><span className="xp-icon-img is-txt is-small" aria-hidden="true"><TxtGlyph /></span><span><strong>{english ? "Read-me.txt" : "Leia-me.txt"}</strong><em>{english ? "What this screen is" : "O que é esta tela"}</em></span></button></li>
            </ul>
            <ul className="is-side" aria-hidden="true"><li>{english ? "My Documents" : "Meus documentos"}</li><li>{english ? "My Computer" : "Meu computador"}</li><li>{english ? "Control Panel" : "Painel de controle"}</li></ul>
          </div>
          <footer><button type="button" onClick={() => resetTutorial(null)}><span className="xp-power" aria-hidden="true" />{english ? "Restart" : "Reiniciar"}</button></footer>
        </div>}
      </div>

      <div className="xp-taskbar">
        <button type="button" className="xp-start" aria-expanded={startOpen} onClick={() => setStartOpen((value) => !value)}><span className="xp-flag" aria-hidden="true" />{english ? "start" : "Iniciar"}</button>
        <div className="xp-tasks">
          {terminalOpen && <button type="button" className={`xp-task${!windows.terminal.min && windows.terminal.z >= zTop.current ? " is-active" : ""}`} onClick={() => focusWindow("terminal")}><TerminalGlyph />{tr(shell.title)}</button>}
          {tutorial && step?.window === "browser" && <button type="button" className="xp-task" onClick={() => focusWindow("browser")}><IeGlyph />Internet Explorer</button>}
          {tutorial && step?.window === "dialog" && step.dialog && <button type="button" className="xp-task" onClick={() => focusWindow("dialog")}>{tr(step.dialog.title)}</button>}
          {windows.notepad.open && <button type="button" className="xp-task" onClick={() => focusWindow("notepad")}><TxtGlyph />{english ? "Read-me.txt" : "Leia-me.txt"}</button>}
        </div>
        <div className="xp-tray"><span className="xp-tray-net" aria-hidden="true" /><time>{clock}</time></div>
      </div>
    </div>

    <p className="xp-caption">{english ? "Simulation: nothing runs on your computer. The commands are the real ones for" : "Simulação: nada roda no seu computador. Os comandos são os de verdade para"} {tr(OS_LABELS[profile.os])}{english ? ", checked on " : ", conferidos em "}{formatPublicDate(VERIFIED_AT, locale)}.</p>
    {age > STALE_AFTER_DAYS && <p className="xp-stale" role="note">{english ? `These commands were checked ${age} days ago. Tools like these change often: if your screen differs, follow the official page linked below.` : `Estes comandos foram conferidos há ${age} dias. Ferramentas assim mudam com frequência: se a sua tela for diferente, siga a página oficial indicada abaixo.`}</p>}

    {scriptBlock}
  </div>;
}

function renderInline(value: string): ReactNode {
  return value.split(/(`[^`]+`)/g).map((part, i) => part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part);
}

function TermLine({ line, done }: { line: Line; done: boolean }) {
  if (line.t === "progress") return <div className="xp-term-line is-progress"><span className={`xp-bar${done ? " is-full" : ""}`}><i /></span><span>{done ? "100%" : ""} {line.v}</span></div>;
  return <div className={`xp-term-line is-${line.t}`}>{line.v || " "}</div>;
}

function XpWindow({ id, state, title, icon, children, onFocus, onUpdate, onClose, className = "", menu, small = false, narrow, english = false }: {
  english?: boolean; id: WinId; state: WinState; title: string; icon?: ReactNode; children: ReactNode; className?: string; menu?: string[]; small?: boolean; narrow: boolean;
  onFocus: (id: WinId) => void; onUpdate: (id: WinId, patch: Partial<WinState>) => void; onClose: () => void;
}) {
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const maximized = state.max || (narrow && !small);
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized || (e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, y: e.clientY, left: state.x, top: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    onFocus(id);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const parent = (e.currentTarget.closest(".xp-wallpaper") as HTMLElement | null)?.getBoundingClientRect();
    const maxX = parent ? parent.width - 160 : 600;
    const maxY = parent ? parent.height - 40 : 400;
    onUpdate(id, { x: Math.max(-40, Math.min(maxX, drag.current.left + e.clientX - drag.current.x)), y: Math.max(0, Math.min(maxY, drag.current.top + e.clientY - drag.current.y)) });
  };
  const up = () => { drag.current = null; };
  return <section className={`xp-window ${className}${maximized ? " is-max" : ""}${small ? " is-small" : ""}`} style={maximized ? { zIndex: state.z } : { left: state.x, top: state.y, zIndex: state.z }} onPointerDown={() => onFocus(id)} aria-label={title}>
    <div className="xp-titlebar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={() => !small && onUpdate(id, { max: !state.max })}>
      {icon && <span className="xp-title-icon" aria-hidden="true">{icon}</span>}
      <span className="xp-title">{title}</span>
      <span className="xp-title-buttons">
        {!small && <button type="button" className="xp-tb is-min" onClick={() => onUpdate(id, { min: true })} aria-label={english ? "Minimize" : "Minimizar"} />}
        {!small && <button type="button" className="xp-tb is-max" onClick={() => onUpdate(id, { max: !state.max })} aria-label={english ? "Maximize" : "Maximizar"} />}
        <button type="button" className="xp-tb is-close" onClick={onClose} aria-label={english ? "Close" : "Fechar"} />
      </span>
    </div>
    {menu && <div className="xp-menubar" aria-hidden="true">{menu.map((item) => <span key={item}>{item}</span>)}</div>}
    <div className="xp-window-body">{children}</div>
  </section>;
}

/* Ícones desenhados aqui, sem marcas registradas: só sugerem o programa. */
function OllamaGlyph() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="6" fill="#fff" stroke="#222" strokeWidth="1.6" /><path d="M11 23v-8c0-3 2-6 5-6s5 3 5 6v8" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" /><path d="M12 9l-1.5-4M20 9l1.5-4" stroke="#222" strokeWidth="2" strokeLinecap="round" /><circle cx="14" cy="16" r="1.2" fill="#222" /><circle cx="18" cy="16" r="1.2" fill="#222" /></svg>;
}
function AntigravityGlyph() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="6" fill="#1a1d24" /><path d="M9 23l7-14 7 14" fill="none" stroke="url(#agy-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><defs><linearGradient id="agy-g" x1="0" x2="1"><stop offset="0" stopColor="#4285f4" /><stop offset=".5" stopColor="#ea4335" /><stop offset="1" stopColor="#fbbc04" /></linearGradient></defs></svg>;
}
function TxtGlyph() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#6b7a99" strokeWidth="1.4" /><path d="M20 3v6h6" fill="#dfe6f3" stroke="#6b7a99" strokeWidth="1.4" /><path d="M10 14h12M10 18h12M10 22h8" stroke="#4a66b0" strokeWidth="1.4" /></svg>;
}
function BinGlyph() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 9h16l-1.5 19h-13z" fill="#e8eef8" stroke="#5b6f93" strokeWidth="1.4" /><path d="M6 8h20M13 5h6" stroke="#5b6f93" strokeWidth="1.6" /><path d="M13 13v11M16 13v11M19 13v11" stroke="#8aa0c4" strokeWidth="1.2" /></svg>;
}
function TerminalGlyph() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1" y="2" width="14" height="12" rx="1.5" fill="#1d2b4f" /><path d="M4 6l2.5 2L4 10M8 10.5h4" stroke="#fff" strokeWidth="1.3" fill="none" /></svg>;
}
function IeGlyph() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8.5" r="5.5" fill="none" stroke="#2a7de1" strokeWidth="2.2" /><path d="M3.5 8.5h9" stroke="#2a7de1" strokeWidth="1.8" /><path d="M1 6c3-4 11-5 14-3" fill="none" stroke="#f0b400" strokeWidth="1.4" /></svg>;
}
