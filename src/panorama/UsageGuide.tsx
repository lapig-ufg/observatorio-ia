import { useEffect, useState, type ReactNode } from "react";
import { trackEvent } from "../analytics";
import { PANORAMA_SITE } from "../panoramaData";
import { type EditorialLink, type SceneSide, type UsageData, type UsageScenes } from "../panoramaEditorial";
import { loadPanoramaUsage } from "../panoramaSource";
import { EditorialExternal, EditorialFooter, EditorialState, More, Prose, useEditorialData } from "./EditorialShared";
import { TerminalSimulator, TutorialText } from "./TerminalSimulator";

const SECTIONS = ["abertura", "comparacao", "permanencia", "tutorial", "catalogo", "medicao", "resumo"] as const;
type SectionId = typeof SECTIONS[number];
function sectionTitles(english: boolean) {
  return english ? ["The difference, explained", "Four questions, in both places", "What stays afterwards", "Install, step by step", "The catalog", "How this was measured", "The summary"] : ["A diferença, explicada", "Quatro perguntas, nos dois lugares", "O que fica depois", "Instalar, passo a passo", "O catálogo", "Como isto foi medido", "O resumo"];
}
function usageHref(id: string) { return `#panorama/como-usar?secao=${encodeURIComponent(id)}`; }
// As capturas estão no repositório, fora do que é publicado pelo Pages.
function referenceUrl(href: string) {
  return href.startsWith("automation/") ? `https://github.com/lapig-ufg/app-panorama-global-da-ia-generativa/tree/HEAD/${href}` : new URL(href, PANORAMA_SITE).href;
}
function UsageLink({ link, english }: { link: EditorialLink; english: boolean }) {
  return link.href.startsWith("#") ? <a href={usageHref(link.href.slice(1))}>{link.texto}</a> : <EditorialExternal href={referenceUrl(link.href)} english={english}>{link.texto}</EditorialExternal>;
}
function ReadingSection({ id, title, n, children }: { id: SectionId; title: string; n: number; children: ReactNode }) {
  return <section className="panorama-reading-section" id={`panorama-usage-${id}`} aria-labelledby={`panorama-usage-heading-${id}`}>
    <header><span aria-hidden="true">{String(n).padStart(2, "0")}</span><h2 id={`panorama-usage-heading-${id}`} tabIndex={-1}>{title}</h2></header>{children}
  </section>;
}

export function UsageGuide({ english = false }: { english?: boolean }) {
  const result = useEditorialData(loadPanoramaUsage, english);
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const changed = () => setHash(window.location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (!result.data) return;
    const id = new URLSearchParams(hash.split("?")[1] || "").get("secao");
    if (!SECTIONS.some(section => section === id)) return;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById(`panorama-usage-heading-${id}`);
      heading?.scrollIntoView({ block: "start", behavior: "instant" });
      heading?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, result.data]);
  if (result.loading || result.error || !result.data) return <EditorialState loading={result.loading} error={result.error} retry={result.retry} english={english} />;
  const { data, scenes } = result.data;
  const titles = sectionTitles(english);
  const section = (id: SectionId, children: ReactNode) => <ReadingSection id={id} title={titles[SECTIONS.indexOf(id)]} n={SECTIONS.indexOf(id) + 1}>{children}</ReadingSection>;
  return <div className="panorama-usage">
    <nav className="panorama-usage-toc" aria-label={english ? "On this page" : "Nesta página"}>{SECTIONS.map((id, i) => <a key={id} href={usageHref(id)} onClick={() => trackEvent(english ? "panorama_usage_section_en" : "panorama_usage_section", { event_category: "navigation", event_label: id })}>{String(i + 1).padStart(2, "0")} · {titles[i]}</a>)}</nav>
    {section("abertura", <Opening data={data.abertura} english={english} />)}
    {section("comparacao", <>
      <ExecutionDiagram english={english} />
      <SceneComparison scenes={scenes} english={english} />
      <h3>{data.contraponto.titulo}</h3><p><Prose text={data.contraponto.lede} raw /></p>
      <div className="panorama-reading-columns">{data.contraponto.itens.map((item, i) => <article key={i}><h4>{item.titulo}</h4><p><Prose text={item.texto} /></p></article>)}</div>
      <p className="panorama-reading-rule"><Prose text={data.contraponto.fecho} raw /></p>
    </>)}
    {section("permanencia", <Persistence data={data.permanencia} />)}
    {section("tutorial", <>
      <TerminalSimulator tutorials={data.tutoriais} english={english} />
      <details className="panorama-reading-more panorama-tutorial-plain"><summary>{english ? "Read the tutorials as text" : "Ver os tutoriais como texto"}</summary>{data.tutoriais.map(t => <TutorialText key={t.id} tutorial={t} english={english} />)}</details>
    </>)}
    {section("catalogo", <Catalog data={data} english={english} />)}
    {section("medicao", <>
      <p><Prose text={data.medicao.lede} /></p>
      <ol className="panorama-reading-method">{data.medicao.passos.map((item, i) => <li key={i}><h3><Prose text={item.titulo} /></h3><p><Prose text={item.texto} /></p></li>)}</ol>
      <h3>{data.medicao.naoMedidoTitulo}</h3><p><Prose text={data.medicao.naoMedidoLede} /></p>
      <dl className="panorama-reading-definitions">{data.medicao.naoMedido.map((item, i) => <div key={i}><dt><Prose text={item.item} /></dt><dd><Prose text={item.porque} /></dd></div>)}</dl>
      <More items={data.medicao.saibaMais} english={english} />
      <EditorialExternal href={referenceUrl("automation/capturas/")} english={english}>{english ? "Transcripts and reports" : "Transcrições e relatórios"}</EditorialExternal>
    </>)}
    {section("resumo", <>
      <span className="panorama-editorial-meta">{data.essencial.rotulo}</span><p><Prose text={data.essencial.intro} raw /></p><h3>{data.essencial.conclusoesRotulo}</h3>
      <ol className="panorama-reading-conclusions">{data.essencial.conclusoes.map(c => <li key={c.n}><h4><Prose text={c.frase} /></h4><p><Prose text={c.prova} /> <UsageLink link={c.link} english={english} /></p></li>)}</ol>
      <h3>{data.essencial.procedencia.titulo}</h3><dl className="panorama-reading-numbers">{data.essencial.procedencia.numeros.map(n => <div key={n.rotulo}><dt>{n.rotulo}</dt><dd>{n.valor}</dd></div>)}</dl>
      <p><Prose text={data.essencial.procedencia.texto} raw /> <UsageLink link={data.essencial.procedencia.link} english={english} /></p>
    </>)}
    <EditorialFooter date={data.updatedAt} page="como-usar" english={english} />
  </div>;
}

function Opening({ data, english }: { data: UsageData["abertura"]; english: boolean }) {
  return <><p className="panorama-reading-lede"><Prose text={data.lede} raw /></p>{data.paragrafos.map((text, i) => <p key={i}><Prose text={text} raw /></p>)}
    {data.eixos.map(axis => <article className="panorama-reading-axis" key={axis.n}>
      <h3>{axis.n}. {axis.nome}</h3><p>{axis.pergunta}</p>
      <div className="panorama-reading-pair">{[axis.navegador, axis.instalada].map((side, i) => <div className={i === 0 ? "is-browser" : "is-installed"} key={i}><h4>{side.titulo}</h4><p><Prose text={side.texto} raw /></p>{side.glossario && <details><summary>{side.glossario.termo}</summary><p><Prose text={side.glossario.texto} raw /></p></details>}<p><Prose text={side.consequencia} raw /></p></div>)}</div>
      <p className="panorama-reading-note"><Prose text={axis.lastro} raw /> <a href={usageHref("medicao")}>{english ? "How this was measured" : "Como isto foi medido"}</a></p>
      <p className="panorama-reading-rule"><Prose text={axis.regra} raw /></p>
    </article>)}
    <h3>{data.ganho.titulo}</h3><p><Prose text={data.ganho.lede} raw /></p><div className="panorama-reading-columns">{data.ganho.itens.map((item, i) => <div key={i}><h4>{item.titulo}</h4><p><Prose text={item.texto} raw /></p></div>)}</div><p className="panorama-reading-note"><Prose text={data.ganho.custo} raw /></p><More items={data.saibaMais} english={english} />
  </>;
}

function SceneComparison({ scenes, english }: { scenes: UsageScenes; english: boolean }) {
  const [selected, setSelected] = useState(0);
  const scene = scenes.cenas[selected];
  const choose = (i: number) => { setSelected(i); trackEvent(english ? "panorama_usage_example_en" : "panorama_usage_example", { event_category: "content", event_label: scenes.cenas[i].id }); };
  const side = (value: SceneSide, installed: boolean) => <article className={installed ? "is-installed" : "is-browser"}><header><h4>{value.rotulo}</h4><span>{value.sub}</span></header><p><Prose text={value.narrativa} /></p><dl><dt>{english ? "What you gain" : "O que ganha"}</dt><dd><Prose text={value.bom} /></dd><dt>{english ? "What stays with you" : "O que fica com você"}</dt><dd><Prose text={value.limite} /></dd></dl></article>;
  return <div className="panorama-scenes">
    <p>{english ? "Choose a work example to compare:" : "Escolha um exemplo de trabalho para comparar:"}</p>
    <div className="panorama-editorial-chips" role="group" aria-label={english ? "Examples" : "Exemplos"}>{scenes.cenas.map((c, i) => <button key={c.id} type="button" aria-pressed={selected === i} onClick={() => choose(i)}>{i + 1}. {c.aba}</button>)}</div>
    <article aria-live="polite"><h3>{scene.pergunta}</h3><div className="panorama-reading-pair">{side(scene.navegador, false)}{side(scene.instalado, true)}</div><h4>{english ? "What changes in practice" : "O que muda na prática"}</h4><p><Prose text={scene.diferenca} raw /></p>
      <h4>{english ? "When to use each" : "Quando usar cada um"}</h4><dl className="panorama-reading-definitions"><div><dt>{english ? "Browser" : "Navegador"}</dt><dd><Prose text={scene.quandoUsar.navegador} /></dd></div><div><dt>{english ? "Installed program" : "Programa instalado"}</dt><dd><Prose text={scene.quandoUsar.instalado} /></dd></div></dl><More items={scene.saibaMais} english={english} />
    </article>
    <nav className="panorama-example-nav" aria-label={english ? "Browse examples" : "Navegar pelos exemplos"}><button type="button" onClick={() => choose((selected + scenes.cenas.length - 1) % scenes.cenas.length)}>← {english ? "Previous example" : "Exemplo anterior"}</button><span>{selected + 1}/{scenes.cenas.length}</span><button type="button" onClick={() => choose((selected + 1) % scenes.cenas.length)}>{english ? "Next example" : "Próximo exemplo"} →</button></nav>
    <p className="panorama-editorial-meta">{scenes.fontes.navegador.rotulo} · {scenes.fontes.navegador.data}; {scenes.fontes.agente.rotulo} · {scenes.fontes.agente.data}. <a href={usageHref("medicao")}>{english ? "Method and provenance" : "Método e procedência"}</a></p>
  </div>;
}

function ExecutionDiagram({ english }: { english: boolean }) {
  return <figure className="panorama-execution-figure">
    <figcaption>{english ? "Who does the work in each place" : "Quem faz o trabalho em cada lugar"}</figcaption>
    <div className="panorama-flow is-browser"><strong>{english ? "In the browser" : "No navegador"}</strong><ol><li>{english ? "AI writes" : "A IA escreve"}</li><li>{english ? "You execute" : "Você executa"}</li><li>{english ? "Your files" : "Seus arquivos"}</li></ol><p>{english ? "The result returns to the AI when you describe it." : "O resultado volta para a IA quando você o descreve."}</p></div>
    <div className="panorama-flow is-installed"><strong>{english ? "With an installed program" : "Com um programa instalado"}</strong><ol><li>{english ? "AI proposes" : "A IA propõe"}</li><li>{english ? "You authorize" : "Você autoriza"}</li><li>{english ? "AI executes" : "A IA executa"}</li></ol><p>↶ {english ? "The AI reads the result in your files." : "A IA lê o resultado nos seus arquivos."}</p></div>
  </figure>;
}

function Persistence({ data }: { data: UsageData["permanencia"] }) {
  return <><p><Prose text={data.lede} raw /></p><h3>{data.restaTitulo}</h3>
    <div className="panorama-reading-pair">{[{ title: data.resta.conversaRotulo, items: data.resta.conversa }, { title: data.resta.agenteRotulo, items: data.resta.agente }].map((side, i) => <div className={i ? "is-installed" : "is-browser"} key={i}><h4>{side.title}</h4><ul>{side.items.map((item, j) => <li key={j}><span aria-hidden="true">{item.ok ? "✓ " : "× "}</span><Prose text={item.v} /></li>)}</ul></div>)}</div>
    <p className="panorama-reading-note"><Prose text={data.resta.nota} /></p>
    {data.mecanismos.map((item, i) => <article className="panorama-reading-mechanism" key={i}><div><h3>{i + 1}. {item.titulo}</h3><p><Prose text={item.texto} /></p>{item.nota && <p className="panorama-reading-note"><Prose text={item.nota} /></p>}</div><div className="panorama-artifact">{item.artefato.nome && <strong>{item.artefato.nome}</strong>}<pre><code>{item.artefato.linhas.join("\n")}</code></pre></div></article>)}
    <p className="panorama-reading-rule"><Prose text={data.fecho} raw /></p>
  </>;
}

function Catalog({ data, english }: { data: UsageData; english: boolean }) {
  const bridge = data.ponte;
  return <>{data.familias.map(family => <section key={family.id}><h3>{family.titulo}</h3><p>{family.subtitulo}</p><p><Prose text={family.explicacao} /></p>
    <details className="panorama-reading-more"><summary>{family.itens.length} {english ? "tools" : "ferramentas"} · {family.itens.map(i => i.nome).join(" · ")}</summary>
      <div className="panorama-catalog-grid">{family.itens.map((item, i) => <article key={i}><span className="panorama-editorial-meta">{item.empresa}</span><h4>{item.nome}</h4>{item.codigoAberto && <p>{item.licenca || (english ? "Open source" : "Código aberto")}</p>}
        <h5>{english ? "How to install" : "Como instalar"}</h5>{item.comando ? <pre><code>{item.instala}</code></pre> : <p>{item.instala}</p>}<p>{item.instalaAlt}</p>
        <dl><dt>{english ? "Requires" : "Precisa de"}</dt><dd><Prose text={item.precisa} /></dd><dt>{english ? "Scope" : "Alcance"}</dt><dd><Prose text={item.acesso} /></dd></dl>{item.destaque && <p>{item.destaque}</p>}
        <EditorialExternal href={item.link} english={english} label={item.nome}>{english ? "Official page" : "Página oficial"}</EditorialExternal>
      </article>)}</div>
    </details></section>)}
    <details className="panorama-reading-more"><summary>{english ? "What the AI can do on your computer: the toolkit" : "O que a IA pode fazer na sua máquina: o cinto de ferramentas"}</summary><div className="panorama-catalog-grid">{data.ferramentas.map((tool, i) => <article key={i}><h4>{tool.nome}</h4><p><Prose text={tool.oQueE} /></p><p><Prose text={tool.destrava} /></p><pre><code>{tool.exemplo}</code></pre></article>)}</div></details>
    <h3>{bridge.titulo}</h3><p><Prose text={bridge.lede} /></p>
    <dl className="panorama-reading-definitions">{bridge.comandos.map((item, i) => <div key={i}><dt><code>{item.cmd}</code></dt><dd><Prose text={item.oQueFaz} /></dd></div>)}</dl>
    <details className="panorama-reading-more"><summary><Prose text={bridge.integracoesTitulo} /> · {bridge.integracoes.length}</summary><p><Prose text={bridge.integracoesNota} /></p><ul>{bridge.integracoes.map(item => <li key={item.id}><code>{item.id}</code> · <strong>{item.nome}</strong> · {item.nota}</li>)}</ul></details>
    <h4><Prose text={bridge.planosTitulo} /></h4><div className="panorama-reading-columns">{bridge.planos.map((plan, i) => <article key={i}><h5>{plan.nome}</h5><strong>{plan.preco}</strong><p>{plan.credito}</p><p><Prose text={plan.detalhe} /></p></article>)}</div><p><Prose text={bridge.planosExtra} /></p><p className="panorama-reading-note"><Prose text={bridge.planosNota} /></p><p className="panorama-reading-rule"><Prose text={bridge.fecho} raw /></p>
  </>;
}
