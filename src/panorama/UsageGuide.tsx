import { formatPublicDate } from "../dateLabels";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, FolderGit2, MousePointerClick, ShieldCheck } from "lucide-react";
import { trackEvent } from "../analytics";
import { PANORAMA_SITE } from "../panoramaData";
import { type SceneSide, type UsageScenes } from "../panoramaEditorial";
import { loadPanoramaScenes } from "../panoramaSource";
import { EditorialExternal, EditorialState, More, Prose, useEditorialData } from "./EditorialShared";
import { XpDesktop } from "./XpDesktop";
import { OLLAMA_PLANS, OLLAMA_PLANS_CHECKED, USAGE_SECTIONS, USAGE_TEXT, USAGE_TOOLS, type UsageSectionId } from "../panoramaUsageText";
import { VERIFIED_AT } from "../panoramaCliTutorials";

/* Como usar fora do navegador: sete seções curtas, cada uma com um argumento.
   O texto é do Observatório (panoramaUsageText.ts); os exemplos medidos vêm
   do Panorama vivo; os comandos, de panoramaCliTutorials.ts. */

const SECTIONS = USAGE_SECTIONS.map((section) => section.id);
const TRANSCRIPTS_URL = "https://github.com/lapig-ufg/app-panorama-global-da-ia-generativa/tree/HEAD/automation/capturas/";
function usageHref(id: string) { return `#panorama/como-usar?secao=${encodeURIComponent(id)}`; }

function Section({ id, n, title, children }: { id: UsageSectionId; n: number; title: string; children: ReactNode }) {
  return <section className="panorama-reading-section usage-section" id={`panorama-usage-${id}`} aria-labelledby={`panorama-usage-heading-${id}`}>
    <header><span aria-hidden="true">{String(n).padStart(2, "0")}</span><h2 id={`panorama-usage-heading-${id}`} tabIndex={-1}>{title}</h2></header>
    <div className="panorama-section-content">{children}</div>
  </section>;
}

export function UsageGuide({ english = false }: { english?: boolean }) {
  const locale = english ? "en" : "pt";
  const tr = (value: { pt: string; en: string }) => value[locale];
  const scenes = useEditorialData(loadPanoramaScenes, english);
  const [hash, setHash] = useState(() => window.location.hash);
  const [active, setActive] = useState<UsageSectionId>("diferenca");
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const header = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
      document.querySelector<HTMLElement>(".panorama-usage")?.style.setProperty("--usage-sticky-top", `${header + 16}px`);
      let current: UsageSectionId = "diferenca";
      SECTIONS.forEach((id) => { const element = document.getElementById(`panorama-usage-${id}`); if (element && element.getBoundingClientRect().top <= header + 180) current = id; });
      setActive(current);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  useEffect(() => {
    const changed = () => setHash(window.location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(hash.split("?")[1] || "").get("secao");
    if (!SECTIONS.some((section) => section === id)) return;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById(`panorama-usage-heading-${id}`);
      heading?.scrollIntoView({ block: "start", behavior: "instant" });
      heading?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, scenes.data]);

  const index = <nav className="panorama-usage-toc" aria-label={english ? "On this page" : "Nesta página"}>{USAGE_SECTIONS.map((section, i) => <a key={section.id} href={usageHref(section.id)} aria-current={active === section.id ? "location" : undefined} onClick={() => { setTocOpen(false); trackEvent(english ? "panorama_usage_section_en" : "panorama_usage_section", { event_category: "navigation", event_label: section.id }); }}>{String(i + 1).padStart(2, "0")} · {tr(section.title)}</a>)}</nav>;
  const title = (id: UsageSectionId) => tr(USAGE_SECTIONS.find((section) => section.id === id)!.title);
  const n = (id: UsageSectionId) => SECTIONS.indexOf(id) + 1;
  const t = USAGE_TEXT;
  const pillarIcons = [Eye, ShieldCheck, FolderGit2];

  return <div className="panorama-usage">
    <aside className="panorama-usage-index"><div className="panorama-usage-index-desktop">{index}</div><details className="panorama-usage-index-mobile" open={tocOpen} onToggle={(event) => setTocOpen(event.currentTarget.open)}><summary>{english ? "On this page" : "Nesta página"}</summary>{index}</details></aside>
    <div className="panorama-usage-body">
      <Section id="diferenca" n={n("diferenca")} title={title("diferenca")}>
        <p className="usage-lede">{tr(t.lede)}</p>
        <div className="usage-pillars">{t.pillars.map((pillar, i) => {
          const Icon = pillarIcons[i];
          return <article key={i}>
            <h3><span aria-hidden="true"><Icon size={18} /></span>{tr(pillar.title)}</h3>
            <dl><div className="is-browser"><dt>{english ? "In the browser" : "No navegador"}</dt><dd>{tr(pillar.browser)}</dd></div><div className="is-installed"><dt>{english ? "Installed" : "Instalada"}</dt><dd>{tr(pillar.installed)}</dd></div></dl>
          </article>;
        })}</div>
        <p className="panorama-reading-note">{tr(t.sameModel)} {tr(t.cost)} </p>
      </Section>

      <Section id="tutorial" n={n("tutorial")} title={title("tutorial")}>
        <p className="usage-tutorial-intro">{tr(t.tutorialIntro)}</p>
        <XpDesktop english={english} />
      </Section>

      <Section id="pratica" n={n("pratica")} title={title("pratica")}>
        <ExecutionDiagram english={english} />
        <p>{tr(t.practiceIntro)}</p>
        {scenes.data ? <SceneComparison scenes={scenes.data} english={english} /> : <EditorialState loading={scenes.loading} error={scenes.error} retry={scenes.retry} english={english} />}
      </Section>

      <Section id="navegador" n={n("navegador")} title={title("navegador")}>
        <ul className="usage-browser-wins">{t.browserWins.map((item, i) => <li key={i}><MousePointerClick size={16} aria-hidden="true" /><span><strong>{tr(item.title)}.</strong> {tr(item.text)}</span></li>)}</ul>
        <p className="panorama-reading-rule usage-rule">{tr(t.rule)}</p>
      </Section>

      <Section id="depois" n={n("depois")} title={title("depois")}>
        <p>{tr(t.afterLede)}</p>
        <div className="panorama-reading-pair">{[{ side: t.afterChat, ok: false }, { side: t.afterAgent, ok: true }].map(({ side, ok }) => <div className={ok ? "is-installed" : "is-browser"} key={String(ok)}><h4>{tr(side.label)}</h4><ul className="usage-checklist">{side.items.map((item, i) => <li key={i} className={ok ? "is-ok" : "is-no"}><span aria-hidden="true">{ok ? "✓" : "×"}</span>{tr(item)}</li>)}</ul></div>)}</div>
        <div className="usage-rules">
          <div><h3>{tr(t.rulesTitle)}</h3><p>{tr(t.rulesText)}</p></div>
          <div className="panorama-artifact"><strong>AGENTS.md</strong><pre><code>{t.rulesFile.join("\n")}</code></pre></div>
        </div>
      </Section>

      <Section id="ferramentas" n={n("ferramentas")} title={title("ferramentas")}>
        <p>{tr(t.toolsIntro)}</p>
        <div className="usage-tools-wrap"><table className="usage-tools">
          <caption className="sr-only">{english ? "Programs that run AI on your computer" : "Programas que levam a IA ao seu computador"}</caption>
          <thead><tr><th scope="col">{english ? "Program" : "Programa"}</th><th scope="col">{english ? "Install (macOS / Linux)" : "Instalar (macOS / Linux)"}</th><th scope="col">{english ? "Install (Windows PowerShell)" : "Instalar (Windows PowerShell)"}</th><th scope="col">{english ? "Requires" : "Precisa de"}</th></tr></thead>
          <tbody>{USAGE_TOOLS.map((tool) => <tr key={tool.name}>
            <th scope="row"><a href={tool.link} target="_blank" rel="noreferrer">{tool.name} ↗</a><small>{tool.company} · {tr(tool.kind)}</small>{tool.node && <span className="usage-node">Node.js</span>}</th>
            <td><code>{tool.install.unix}</code></td>
            <td><code>{tool.install.windows}</code></td>
            <td>{tr(tool.needs)}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="panorama-reading-note">{tr(t.toolsNote)} {english ? "Commands checked on" : "Comandos conferidos em"} {formatPublicDate(VERIFIED_AT, locale)}.</p>
        <h3>{english ? "Ollama cloud plans" : "Planos de nuvem da Ollama"}</h3>
        <div className="usage-plans">{OLLAMA_PLANS.map((plan) => <article key={plan.name}><h4>{plan.name}</h4><strong>{tr(plan.price)}</strong><p>{tr(plan.detail)}</p></article>)}</div>
        <p className="panorama-reading-note">{english ? "Prices from the official plans page, checked on" : "Preços da página oficial de planos, conferidos em"} {formatPublicDate(OLLAMA_PLANS_CHECKED, locale)}. <EditorialExternal href="https://ollama.com/pricing" english={english}>ollama.com/pricing</EditorialExternal></p>
      </Section>

      <Section id="medicao" n={n("medicao")} title={title("medicao")}>
        <p>{tr(t.methodLede)}</p>
        <ul className="usage-method">{t.methodItems.map((item, i) => <li key={i}>{tr(item)}</li>)}</ul>
        <EditorialExternal href={TRANSCRIPTS_URL} english={english}>{english ? "Transcripts and reports" : "Transcrições e relatórios"}</EditorialExternal>
      </Section>

      <footer className="panorama-provenance"><span>{english ? "Text by the UFG-AI Observatory · examples from the live Panorama" : "Texto do Observatório UFG-IA · exemplos do Panorama ao vivo"}</span>
        <EditorialExternal href={`${PANORAMA_SITE}${english ? "en/" : ""}como-usar.html`} english={english}>{english ? "Open the original Panorama" : "Abrir o Panorama original"}</EditorialExternal>
      </footer>
    </div>
  </div>;
}

function SceneComparison({ scenes, english }: { scenes: UsageScenes; english: boolean }) {
  const [selected, setSelected] = useState(0);
  const scene = scenes.cenas[selected];
  const choose = (i: number) => { setSelected(i); trackEvent(english ? "panorama_usage_example_en" : "panorama_usage_example", { event_category: "content", event_label: scenes.cenas[i].id }); };
  const side = (value: SceneSide, installed: boolean) => <article className={installed ? "is-installed" : "is-browser"}><header><h4>{value.rotulo}</h4><span>{value.sub}</span></header><p><Prose text={value.narrativa} /></p><dl><dt>{english ? "What you gain" : "O que ganha"}</dt><dd><Prose text={value.bom} /></dd><dt>{english ? "What stays with you" : "O que fica com você"}</dt><dd><Prose text={value.limite} /></dd></dl></article>;
  return <div className="panorama-scenes">
    <div className="panorama-editorial-chips" role="group" aria-label={english ? "Examples" : "Exemplos"}>{scenes.cenas.map((c, i) => <button key={c.id} type="button" aria-pressed={selected === i} onClick={() => choose(i)}>{i + 1}. {c.aba}</button>)}</div>
    <article aria-live="polite"><h3>“{scene.pergunta}”</h3><div className="panorama-reading-pair">{side(scene.navegador, false)}{side(scene.instalado, true)}</div>
      <p className="usage-scene-diff"><strong>{english ? "What changes: " : "O que muda: "}</strong><Prose text={scene.diferenca} raw /></p>
      <More items={scene.saibaMais} english={english} />
    </article>
    <p className="panorama-editorial-meta">{scenes.fontes.navegador.rotulo} · {formatPublicDate(scenes.fontes.navegador.data, english ? "en" : "pt")}; {scenes.fontes.agente.rotulo} · {formatPublicDate(scenes.fontes.agente.data, english ? "en" : "pt")}. <a href={usageHref("medicao")}>{english ? "How we measured" : "Como medimos"}</a></p>
  </div>;
}

function ExecutionDiagram({ english }: { english: boolean }) {
  return <figure className="panorama-execution-figure">
    <figcaption>{english ? "Who does the work in each place" : "Quem faz o trabalho em cada lugar"}</figcaption>
    <div className="panorama-flow is-browser"><strong>{english ? "In the browser" : "No navegador"}</strong><ol><li>{english ? "AI writes" : "A IA escreve"}</li><li>{english ? "You execute" : "Você executa"}</li><li>{english ? "You report back" : "Você conta o resultado"}</li></ol></div>
    <div className="panorama-flow is-installed"><strong>{english ? "With an installed program" : "Com um programa instalado"}</strong><ol><li>{english ? "AI proposes" : "A IA propõe"}</li><li>{english ? "You authorize" : "Você autoriza"}</li><li>{english ? "AI executes and checks" : "A IA executa e confere"}</li></ol></div>
  </figure>;
}
