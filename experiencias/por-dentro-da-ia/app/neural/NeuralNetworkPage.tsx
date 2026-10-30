import { useEffect, useMemo, useState } from "react";
import { LessonHeader } from "../lesson-header";
import { CHAPTERS } from "./content";
import { PlaygroundCard, PlaygroundPreamble } from "./PlaygroundCard";
import { useNeuralPlayground } from "./playground-state";

export function NeuralNetworkPage() {
  const [active, setActive] = useState(0);
  const controller = useNeuralPlayground();
  const chapter = CHAPTERS[active];

  const modules = useMemo(() => {
    const groups: { name: string; chapters: typeof CHAPTERS }[] = [];
    for (const item of CHAPTERS) {
      const group = groups.find((entry) => entry.name === item.module);
      if (group) group.chapters.push(item);
      else groups.push({ name: item.module, chapters: [item] });
    }
    return groups;
  }, []);

  const go = (index: number) => {
    const target = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    controller.stop();
    setActive(target);
    window.history.replaceState(null, "", `#${CHAPTERS[target].id}`);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    requestAnimationFrame(() => document.getElementById(CHAPTERS[target].id)?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const fromHash = () => {
      const index = CHAPTERS.findIndex((item) => `#${item.id}` === window.location.hash);
      if (index >= 0) {
        controller.stop();
        setActive(index);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const previousPlayground = chapter.playground ? CHAPTERS.find((item) => item.playground === chapter.playground! - 1) : null;

  return (
    <main className="site-root friendly-site nn-page">
      <LessonHeader />

      <div className="site-layout nn-layout">
        <aside className="chapter-menu nn-chapter-menu" aria-label="Capítulos da aula de redes neurais">
          <p>REDES NEURAIS · {CHAPTERS.length} CAPÍTULOS</p>
          {modules.map((group) => (
            <div className="nn-menu-group" key={group.name}>
              <span>{group.name}</span>
              {group.chapters.map((item) => {
                const index = CHAPTERS.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className={active === index ? "active" : ""}
                    aria-current={active === index ? "step" : undefined}
                    onClick={() => go(index)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{item.label}</b>
                    {item.playground && (
                      <i
                        className={`nn-menu-play ${
                          controller.completed.has(item.playground)
                            ? "is-done"
                            : controller.canRun(item.playground)
                              ? "is-ready"
                              : "is-locked"
                        }`}
                        title={
                          controller.completed.has(item.playground)
                            ? "Etapa concluída"
                            : controller.canRun(item.playground)
                              ? "Playground disponível"
                              : "Conclua o playground anterior"
                        }
                      >
                        {controller.completed.has(item.playground) ? "✓" : controller.canRun(item.playground) ? "▶" : "⊘"}
                      </i>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="menu-scope">
            <b>Cálculo no navegador</b>
            <span>Pesos, gradientes e treino.<br />Nenhum dado sai da página.</span>
          </div>
        </aside>

        <div className="chapter-stage nn-chapter-stage">
          <div className="lesson-wayfinding">
            <div>
              <span className="travel-dot" />
              <b>{chapter.module}</b>
              <span>{chapter.label}</span>
            </div>
            <label className="mobile-chapters">
              Capítulo
              <select value={active} onChange={(event) => go(Number(event.target.value))}>
                {CHAPTERS.map((item, index) => (
                  <option key={item.id} value={index}>
                    {index + 1}. {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="nn-progress-label">
              {String(active + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
            </div>
          </div>

          <section className="chapter active-chapter nn-chapter" id={chapter.id} tabIndex={-1}>
            <header className="section-title nn-section-title">
              <div className="scope-pill">
                <span>aula 1</span>
                <b>REDES NEURAIS · CÁLCULO LOCAL</b>
              </div>
              <p className="eyebrow">{chapter.kicker}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.lead}</p>
            </header>

            <div className="nn-chapter-body">{chapter.content}</div>

            {chapter.playground && (
              <>
                <PlaygroundPreamble
                  stage={chapter.playground}
                  snapshot={controller.viz.snapshot}
                  observation={chapter.observation}
                />
                <PlaygroundCard
                  stage={chapter.playground}
                  controller={controller}
                  onGoChapter={(id) => go(CHAPTERS.findIndex((item) => item.id === id))}
                  previousLabel={previousPlayground?.label ?? "o playground anterior"}
                  previousId={previousPlayground?.id ?? "construir"}
                />
              </>
            )}

            <nav className="chapter-controls" aria-label="Navegação entre capítulos">
              <button onClick={() => go(active - 1)} disabled={active === 0}>
                ← Anterior
              </button>
              <div>
                <span>
                  {String(active + 1).padStart(2, "0")} / {CHAPTERS.length}
                </span>
                <b>{chapter.label}</b>
                <progress value={active + 1} max={CHAPTERS.length} aria-label="Progresso pela aula" />
              </div>
              <button onClick={() => go(active + 1)} disabled={active === CHAPTERS.length - 1}>
                Próximo →
              </button>
            </nav>
          </section>
        </div>
      </div>
    </main>
  );
}
