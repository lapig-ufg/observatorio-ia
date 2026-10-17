import { ArrowUpRight, Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "../analytics";
import { formatPublicDate } from "../dateLabels";
import { benchmarkModelKey, canonicalCompany, companyColor, emptyPanoramaConfig, launchForModel, type PanoramaBenchmarks, type PanoramaConfig } from "../panoramaData";
import { loadPanoramaBenchmarks, loadPanoramaConfig, loadPanoramaLaunches } from "../panoramaSource";
import { CompanyMark } from "./CompanyMark";
import {
  AA_METHOD_URL, GUIDE_CATEGORIES, GUIDE_SORTS, MAX_COMPARE, barPercent, buildModelIndex,
  categoryHasData, comparisonTable, firstCategoryWithData, formatGuidePrice, formatGuideScore,
  formatGuideSpeed, overlapBits, primaryBench, rankedList, rulerCompanyHref, rulerModelHref,
  parseGuideDeepLink, searchSuggestions, supportMaps, toggleCompareKey,
  type GuideCategory, type GuideProfile, type GuideSortId,
} from "../panoramaGuide";

type LaunchData = Awaited<ReturnType<typeof loadPanoramaLaunches>>;

/* Os únicos fragmentos HTML daqui são texto editorial LOCAL das categorias.
   Nomes, descrições e quaisquer outros dados da rede são nós de texto React. */
function Editorial({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

/* Selo da empresa no guia: o MESMO CompanyMark da régua (círculo na cor da
   empresa + logo na proporção do Panorama original), só o tamanho muda pela
   classe do guia. Nada de "bolinha" com a letra onde o Panorama tem vetor. */
function GuideCompanyMark({ company, config }: { company: string; config: PanoramaConfig }) {
  return (
    <CompanyMark
      company={company}
      color={companyColor(company, config)}
      logoPath={config.logoPaths[config.logoMap[company]] || ""}
      size={24}
      className="guide-company-mark"
    />
  );
}

export function ModelGuide({ english = false }: { english?: boolean }) {
  const locale = english ? "en" : "pt";
  const [data, setData] = useState<PanoramaBenchmarks | null>(null);
  const [config, setConfig] = useState(emptyPanoramaConfig);
  const [launchData, setLaunchData] = useState<LaunchData | null>(null);
  const [launchFailed, setLaunchFailed] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [categoryId, setCategoryId] = useState<GuideCategory["id"]>("geral");
  const [sort, setSort] = useState<GuideSortId>("best");
  const [query, setQuery] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [extras, setExtras] = useState(false);
  const compareButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [hash, setHash] = useState(() => window.location.hash);
  const handledLink = useRef("");
  useEffect(() => {
    const changed = () => setHash(window.location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(false);
    setLaunchData(null);
    setLaunchFailed(false);
    setCompare([]);
    setCompareOpen(false);
    handledLink.current = "";
    // A planilha é complementar: sua demora ou falha não bloqueia o ranking.
    void loadPanoramaLaunches(locale, controller.signal).then((result) => {
      if (active) setLaunchData(result);
    }).catch(() => { if (active) setLaunchFailed(true); });
    void Promise.all([loadPanoramaBenchmarks(locale, controller.signal), loadPanoramaConfig()])
      .then(([result, settings]) => {
        if (!active) return;
        setData(result);
        setConfig(settings.config);
        setCategoryId(firstCategoryWithData(result)?.id || "geral");
      }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [locale, attempt]);

  const index = useMemo(() => data ? buildModelIndex(data) : new Map<string, GuideProfile>(), [data]);
  useEffect(() => {
    if (loading || error || handledLink.current === hash) return;
    handledLink.current = hash;
    const key = parseGuideDeepLink(hash);
    if (!key) return;
    const profile = index.get(key);
    if (profile) {
      setCompare((current) => current.includes(key) ? current : toggleCompareKey(current, key));
      setQuery(profile.name);
    }
  }, [hash, index, loading, error]);
  const profiles = compare.flatMap((key) => index.get(key) || []);
  const category = GUIDE_CATEGORIES.find((item) => item.id === categoryId)!;
  const cat = category[locale];
  const bench = data ? primaryBench(data, category) : null;
  const rows = useMemo(() => bench ? rankedList(bench, sort) : [], [bench, sort]);
  const supports = useMemo(() => data ? supportMaps(data, category) : [], [data, category]);
  const overlap = data ? overlapBits(data, category, english) : null;
  const maxMetric = Math.max(0, ...rows.map((row) => row.metric));
  const suggestions = searchSuggestions(index, query, compare);
  const sortText = GUIDE_SORTS.find((item) => item.id === sort)![locale];
  const score = (isFraction: boolean, value: number) => formatGuideScore(isFraction, value, english);
  const event = (name: string, label: string) => trackEvent(`panorama_guide_${name}${english ? "_en" : ""}`, { event_category: "guide", event_label: label });
  const toggleModel = (key: string) => {
    if (!index.has(key)) return;
    const next = toggleCompareKey(compare, key);
    setCompare(next);
    setQuery("");
    event("compare", `${next.includes(key) ? "add" : "remove"}:${key}:${next.length}`);
  };
  const launchHref = (model: string, company: string) => {
    if (!launchData) return null;
    const launch = launchForModel(model, company, launchData.launches, launchData.config);
    return launch ? rulerModelHref(launch.model, launch.company, launch.date) : null;
  };
  const coverage = bench && launchData ? bench.top.filter((entry) => launchHref(entry.model, entry.company)).length : null;
  const fetched = data?.fetchedAt ? new Date(data.fetchedAt) : null;
  const collected = fetched && Number.isFinite(fetched.getTime()) ? formatPublicDate(fetched.toISOString().slice(0, 10), english ? "en" : "pt") : "—";

  if (loading) return <div className="panorama-state" role="status"><LoaderCircle className="spinning" aria-hidden="true" size={24} />{english ? "Loading model benchmarks…" : "Carregando os testes dos modelos…"}</div>;
  if (error) return <div className="panorama-state panorama-state--error" role="alert"><p>{english ? "The benchmarks could not be loaded." : "Não foi possível carregar os benchmarks."}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>{english ? "Try again" : "Tentar de novo"}</button></div>;
  if (!data) return null;

  return (
    <div className="panorama-guide">
      <header className="guide-heading">
        <h2>{english ? "Which model to use today?" : "Qual modelo usar hoje?"}</h2>
        <p>{english ? "Compare measured capability, API price and response speed for each task." : "Compare a capacidade medida, o preço da API e a velocidade de resposta para cada tarefa."}</p>
        <small>{data.modelsTotal} {english ? "models tracked" : "modelos rastreados"} · {english ? "Collected on" : "Coleta de"} {collected}</small>
      </header>

      <div className="guide-categories" role="group" aria-label={english ? "Choose a task" : "Selecione um uso"}>
        {GUIDE_CATEGORIES.map((item) => <button type="button" key={item.id} aria-pressed={categoryId === item.id} onClick={() => { setCategoryId(item.id); setExtras(false); event("category", item.id); }}>
          {item[locale].label}{!categoryHasData(data, item) && <small> · {english ? "No data" : "Sem dados"}</small>}
        </button>)}
      </div>

      <section className="guide-panel" aria-labelledby="guide-category-title">
        <h3 id="guide-category-title">{cat.label}</h3>
        <p className="guide-question">{cat.question}</p>
        <div className="guide-controls">
          <div className="guide-sorts" role="group" aria-label={english ? "Sort by" : "Ordenar por"}>
            {GUIDE_SORTS.map((item) => <button type="button" key={item.id} aria-pressed={sort === item.id} onClick={() => { setSort(item.id); event("sort", `${categoryId}:${item.id}`); }}>{item[locale].label}</button>)}
          </div>
          <label className="guide-search" htmlFor="guide-search">
            <Search size={17} aria-hidden="true" /><span className="sr-only">{english ? "Find a model to compare, including outside the top 20" : "Buscar modelo para comparar, inclusive fora do top 20"}</span>
            <input ref={searchInput} id="guide-search" type="search" value={query} placeholder={english ? "Find a model to compare…" : "Buscar modelo para comparar…"} autoComplete="off" onChange={(event) => setQuery(event.target.value)} aria-describedby="guide-search-hint" />
          </label>
        </div>
        <p id="guide-search-hint" className="guide-search-hint">{english ? `Use + or search all evaluated models to compare up to ${MAX_COMPARE}.` : `Use + ou busque em todos os modelos avaliados para comparar até ${MAX_COMPARE}.`}</p>
        {query.trim() && <div className="guide-suggestions">
          <p role="status">{suggestions.length ? (english ? "Add to comparison:" : "Adicionar à comparação:") : (english ? "No other models found." : "Nenhum outro modelo encontrado.")}</p>
          {suggestions.map((profile) => <button type="button" key={profile.key} disabled={compare.length >= MAX_COMPARE} onClick={() => { toggleModel(profile.key); searchInput.current?.focus(); }}><GuideCompanyMark company={profile.company} config={config} /><span><strong>{profile.name}</strong><small>{profile.company}</small></span><Plus size={16} aria-hidden="true" /></button>)}
        </div>}

        {!bench?.top.length ? <p className="panorama-state" role="status">{english ? "No data for this category in the latest collection." : "Sem dados nesta rodada para esta categoria."}</p> : <>
          <p className="guide-sort-hint">{sortText.hint}</p>
          <details className="guide-method" key={categoryId} onToggle={(e) => { if (e.currentTarget.open) event("method", categoryId); }}>
            <summary>{english ? "How we measure this category" : "Como medimos esta categoria"}</summary>
            <div>
              <p><strong>{english ? "The score. " : "O número. "}</strong>{english ? "Each model’s score comes from " : "A pontuação de cada modelo é sua nota no "}<b>{bench.label}</b>: <Editorial text={cat.compositionIntro} />. {english ? "Scale" : "Escala"}: {bench.unit} ({bench.isFraction ? (english ? "accuracy percentage" : "porcentagem de acerto") : (english ? "composite index, 0–100" : "índice composto, 0–100")}), {english ? "higher is better." : "quanto mais alto, melhor."}</p>
              <p><strong>{english ? "Composition and weights" : "Composição e pesos"}</strong></p>
              <ul className="guide-composition">{cat.compositionParts.map((part) => <li key={part.part}><b>{part.weight}</b><span><strong>{part.part}</strong>: {part.tests}</span></li>)}</ul>
              {cat.caveat && <p className="guide-caveat"><strong>{english ? "Not measured. " : "Não mede. "}</strong><Editorial text={cat.caveat} /></p>}
              {overlap && <div className="guide-overlap"><p><strong>{english ? "Overlap. " : "Sobreposição. "}</strong><Editorial text={cat.overlapWhy} /> {english ? "Rank correlations, calculated from the current data:" : "Correlações de postos, calculadas com os dados atuais:"}</p><ul>{overlap.map((bit) => <li key={bit.label}><b>{bit.label}</b>: ρ = {bit.rho.toFixed(2).replace(".", english ? "." : ",")} ({bit.n} {english ? "models in common" : "modelos em comum"}; {bit.on}/{bit.total} {english ? "top models overlap" : "primeiros se repetem"})</li>)}</ul><p>{english ? "The distance between models can change more than their order: a model may lead one block by a wide margin and tie in another." : "A distância entre os modelos pode mudar mais que a ordem: um modelo pode liderar com folga num bloco e empatar no outro."}</p></div>}
              {supports.length > 0 && <p><strong>{english ? "Supporting tests. " : "Apoio. "}</strong>{supports.map(({ bench: support }) => support.label).join(", ")}. {english ? "They measure the same area in other ways and do not determine the ranking. Use ‘Other tests’ to see each model’s scores." : "Medem a mesma área de outras formas e não entram na posição do ranking. Use ‘Outros testes’ para ver as notas de cada modelo."}</p>}
              {cat.note && <p>{cat.note}</p>}
              <p>{english ? "Artificial Analysis runs the tests itself with the same protocol for all models; these are not manufacturer-reported scores." : "A Artificial Analysis roda os testes por conta própria, com o mesmo protocolo para todos os modelos; não republica números informados pelo fabricante."} {bench.modelsEvaluated} {english ? "models evaluated in this index." : "modelos avaliados neste índice."}{coverage !== null && ` ${coverage}/${bench.top.length} ${english ? "models in this ranking also appear on the timeline." : "modelos deste ranking também estão na régua."}`} <a href={AA_METHOD_URL} target="_blank" rel="noreferrer">{english ? "Full methodology" : "Metodologia completa"} ↗</a></p>
            </div>
          </details>
          {supports.length > 0 && <button type="button" className="guide-extras-toggle" aria-pressed={extras} onClick={() => { setExtras(!extras); event("extras", `${categoryId}:${!extras}`); }}>{extras ? (english ? "Hide other tests" : "Ocultar outros testes") : (english ? "Other tests in this category" : "Ver outros testes desta categoria")}</button>}
          <div className="guide-ranking-head" aria-hidden="true"><span>#</span><span>{english ? "Model" : "Modelo"}</span><span>{english ? "Score" : "Nota"}</span><span>{english ? "Price · USD/M tokens" : "Preço · USD/M tokens"}</span><span>{english ? "Speed" : "Velocidade"}</span><span>+</span></div>
          <ol className="guide-ranking">
            {rows.map((row, position) => {
              const entry = row.entry;
              const key = benchmarkModelKey(entry.model);
              const selected = compare.includes(key);
              const href = launchHref(entry.model, entry.company);
              return <li key={key} className={`guide-row${row.belowFloor ? " is-below-floor" : ""}`}>
                <span className="guide-position" aria-label={`${english ? "Position" : "Posição"} ${position + 1}`}>{position + 1}</span>
                <div className="guide-identity"><GuideCompanyMark company={entry.company} config={config} /><div>
                  {href ? <a className="guide-model" href={href} onClick={() => event("timeline", entry.model)} title={english ? "Open release on the timeline" : "Abrir lançamento na régua"}>{entry.model} <ArrowUpRight size={13} aria-hidden="true" /></a> : <strong className="guide-model">{entry.model}</strong>}
                  {entry.variant && <small className="guide-variant">{entry.variant}</small>}
                  <small>{launchData ? <a href={rulerCompanyHref(canonicalCompany(entry.company, config))} onClick={() => event("company", entry.company)}>{entry.company}</a> : entry.company}{sort !== "best" && ` · #${row.baseRank} ${english ? "in capability" : "em capacidade"}`}</small>
                </div></div>
                <div className="guide-score"><span><span className="sr-only">{english ? "Score: " : "Nota: "}</span>{score(bench.isFraction, entry.score)}</span><span className="guide-bar" title={`${sortText.bar}: ${row.metric.toFixed(1)}`}><span style={{ width: `${barPercent(row, maxMetric)}%`, background: companyColor(entry.company, config) }} /></span><small className="guide-metric">{sortText.bar}</small></div>
                <div className="guide-costs">
                  <span className="guide-price"><span className="guide-mobile-label">{english ? "API price: " : "Preço API: "}</span>{formatGuidePrice(entry.pricePerMillion) || "—"}</span>
                  <span className="guide-speed"><span className="guide-mobile-label">{english ? "Speed: " : "Velocidade: "}</span>{formatGuideSpeed(entry.tokensPerSecond) || "—"}</span>
                </div>
                <button type="button" className="guide-add" aria-pressed={selected} aria-label={`${selected ? (english ? "Remove" : "Remover") : (english ? "Compare" : "Comparar")} ${entry.model}`} disabled={!selected && compare.length >= MAX_COMPARE} onClick={() => toggleModel(key)}>{selected ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}</button>
                {row.belowFloor && <small className="guide-row-note">{english ? "Below the quality floor; excluded from this sort." : "Abaixo do piso de qualidade; não concorre nesta ordenação."}</small>}
                {extras && supports.map((support) => {
                  const result = support.map.get(key);
                  return result ? <div key={support.bench.key} className="guide-extra"><span>{support.bench.label}</span><span className="guide-bar"><span style={{ width: `${support.max > 0 ? Math.max(3, result.score / support.max * 100) : 0}%`, background: companyColor(entry.company, config) }} /></span><b>{score(result.isFraction, result.score)}</b></div> : null;
                })}
              </li>;
            })}
          </ol>
          <p className="guide-search-hint">{english ? "Prices in US dollars per million tokens (3:1 input/output blend). Speed in tokens per second. ‘—’ means no published data, not free." : "Preços em dólares por milhão de tokens (média de entrada/saída 3:1). Velocidade em tokens por segundo. ‘—’ significa dado não publicado, não gratuidade."}</p>
        </>}
      </section>
      {launchFailed && <p className="panorama-warnings">{english ? "The timeline is unavailable; the rankings and comparison remain available." : "A régua está indisponível; os rankings e a comparação continuam disponíveis."}</p>}
      <div className="sr-only" role="status">{compare.length} {english ? `of ${MAX_COMPARE} models selected` : `de ${MAX_COMPARE} modelos selecionados`}</div>
      {compare.length > 0 && <aside className="guide-tray" aria-label={english ? "Selected models" : "Modelos selecionados"}>
        <div className="guide-chips">{profiles.map((profile) => <button type="button" key={profile.key} onClick={() => { toggleModel(profile.key); searchInput.current?.focus(); }} aria-label={`${english ? "Remove" : "Remover"} ${profile.name}`}>{profile.name}<X size={13} aria-hidden="true" /></button>)}</div>
        <button type="button" ref={compareButton} className="guide-compare-open" onClick={() => { setCompareOpen(true); event("open_compare", String(compare.length)); }}>{english ? "Compare" : "Comparar"} ({compare.length}/{MAX_COMPARE})</button>
        <button type="button" onClick={() => { setCompare([]); searchInput.current?.focus(); event("clear_compare", "all"); }}>{english ? "Clear" : "Limpar"}</button>
      </aside>}
      {compareOpen && <ComparisonDialog profiles={profiles} english={english} config={config} onClose={() => { setCompareOpen(false); requestAnimationFrame(() => compareButton.current?.focus()); }} />}
      <footer className="panorama-provenance"><span>{english ? "Data: Artificial Analysis" : "Dados: Artificial Analysis"} · {english ? "Collected on" : "Coleta de"} {collected}</span><a href={data.sourceUrl || "https://artificialanalysis.ai/"} target="_blank" rel="noreferrer">Artificial Analysis ↗</a>{data.attribution && <small>{data.attribution}</small>}</footer>
    </div>
  );
}

/* O diálogo nativo mantém o foco dentro da folha, torna o fundo inerte e
   devolve o foco ao fechar. No celular só a folha rola, sem tabela larga. */
function ComparisonDialog({ profiles, english, config, onClose }: { profiles: GuideProfile[]; english: boolean; config: PanoramaConfig; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const comparison = comparisonTable(profiles, english);
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  const value = (row: typeof comparison.rows[number], i: number) => {
    const cell = row.cells[i];
    if (!cell) return "—";
    return row.kind === "price" ? formatGuidePrice(cell.value) : row.kind === "speed" ? formatGuideSpeed(cell.value) : `${formatGuideScore(cell.isFraction, cell.value, english)} · #${cell.rank}`;
  };
  return <dialog ref={ref} className="guide-comparison" aria-labelledby="guide-comparison-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="guide-comparison-content">
      <header className="panorama-sheet-header"><h2 id="guide-comparison-title">{english ? "Compare models" : "Comparar modelos"}</h2><button type="button" className="panorama-detail-close" onClick={onClose} aria-label={english ? "Close comparison" : "Fechar comparação"} autoFocus><X size={20} aria-hidden="true" /></button></header>
      <div className="guide-comparison-grid" style={{ gridTemplateColumns: `repeat(${profiles.length}, minmax(0, 1fr))` }}>
        {profiles.map((profile, i) => <section className="guide-comparison-model" key={profile.key} aria-label={profile.name}>
          <GuideCompanyMark company={profile.company} config={config} /><h3>{profile.name}</h3><small>{profile.company}</small>
          <p className="guide-wins">{comparison.wins[i] > 0 && comparison.wins[i] === comparison.maxWins ? "★ " : ""}{comparison.wins[i]} {english ? "category wins" : "vitórias em categorias"}</p>
          <dl>{comparison.rows.map((row) => <div key={row.categoryId} className={row.cells[i]?.isWinner ? "is-winner" : ""}><dt>{row.label}{row.kind === "price" ? " (USD/M)" : ""}</dt><dd>{value(row, i)}</dd></div>)}</dl>
        </section>)}
      </div>
      <p className="guide-comparison-note">{english ? "Highlighted values win among the selected models; ties count for both. #1 is the global leader. ★ marks the most capability-category wins; price and speed do not count toward that total. ‘—’ means not evaluated or no published data." : "Valores destacados vencem entre os modelos selecionados; empates contam para ambos. #1 é o líder global. ★ marca quem vence em mais categorias de capacidade; preço e velocidade não entram nesse total. ‘—’ significa não avaliado ou dado não publicado."}</p>
    </div>
  </dialog>;
}
