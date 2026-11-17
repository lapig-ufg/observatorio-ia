import { BarChart3, Equal, Footprints, Layers, LoaderCircle, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "../../analytics";
import { benchmarkModelKey, emptyPanoramaConfig } from "../../panoramaData";
import { parseGuideDeepLink } from "../../panoramaGuide";
import { loadGuideData, loadPanoramaConfig } from "../../panoramaSource";
import {
  INDEX_KEYS, rankFamilies, teamFrom,
  type Axis, type Family, type GuideModels, type GuidePlans, type GuideSources, type IndexKey,
} from "../../guiaModelos";
import { indexLabel, Mark, makeT } from "./comum";
import { Ranking } from "./Ranking";
import { Mapa } from "./Mapa";
import { Vozes } from "./Vozes";
import { Equipe } from "./Equipe";
import { Comparador } from "./Comparador";
import { Coruja } from "./Coruja";
import "./guia.css";

const MAX_COMPARE = 4;
const STORE = "gm-equipe-v1";

type Loaded = { models: GuideModels; sources: GuideSources | null; plans: GuidePlans | null };

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}") as { plans?: string[]; extras?: string[]; efforts?: Record<string, string> }; } catch { return {}; }
};

/* "Qual modelo usar", versão de nov/2026. A página mostra o dado e deixa a
   escolha com quem lê: o melhor resultado de cada modelo primeiro (como os
   outros sites), e o que só ela tem um toque adiante: a escada de esforço, o
   custo e o tempo de cada degrau, as outras fontes lado a lado e a equipe de
   quem lê. A coruja explica e monta, mas nenhum número passa por ela. */
export function GuiaModelos({ english = false }: { english?: boolean }) {
  const t = makeT(english);
  const [data, setData] = useState<Loaded | null>(null);
  const [config, setConfig] = useState(emptyPanoramaConfig);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [indexKey, setIndexKey] = useState<IndexKey>("intelligence");
  const [axis, setAxis] = useState<Axis>("cost");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [query, setQuery] = useState("");
  const stored = useMemo(readStore, []);
  const [planIds, setPlanIds] = useState<string[]>(stored.plans || []);
  const [extraIds, setExtraIds] = useState<string[]>(stored.extras || []);
  const [efforts, setEfforts] = useState<Record<string, string>>(stored.efforts || {});
  const compareButton = useRef<HTMLButtonElement>(null);
  const handledHash = useRef("");

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void Promise.all([loadGuideData(controller.signal), loadPanoramaConfig()]).then(([loaded, settings]) => {
      setData(loaded);
      setConfig(settings.config);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ plans: planIds, extras: extraIds, efforts })); } catch { /* sem armazenamento: a equipe só vale nesta aba */ }
  }, [planIds, extraIds, efforts]);

  /* Links da régua (`#panorama/guia?modelo=…`) já chegam com o modelo na comparação. */
  useEffect(() => {
    if (!data) return;
    const apply = () => {
      const hash = window.location.hash;
      if (handledHash.current === hash) return;
      handledHash.current = hash;
      const key = parseGuideDeepLink(hash);
      const family = key ? data.models.families.find((f) => benchmarkModelKey(f.name) === key) : null;
      if (family) setCompare((current) => current.includes(family.id) ? current : [...current, family.id].slice(-MAX_COMPARE));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [data]);

  const event = (name: string, label: string) => trackEvent(`panorama_guide_${name}${english ? "_en" : ""}`, { event_category: "guide", event_label: label });
  const rows = useMemo(() => data ? rankFamilies(data.models, indexKey) : [], [data, indexKey]);
  const byId = useMemo(() => new Map((data?.models.families || []).map((f) => [f.id, f])), [data]);
  const compared = compare.flatMap((id) => byId.get(id) || []);
  const team = useMemo(() => data ? teamFrom(data.models, data.plans, planIds, extraIds, efforts) : [], [data, planIds, extraIds, efforts]);
  const highlighted: Family[] = useMemo(() => {
    if (compared.length) return compared;
    return rows.filter((r) => r.family.variants.filter((v) => v.scores[indexKey] !== null).length >= 3).slice(0, 5).map((r) => r.family);
  }, [compared, rows, indexKey]);
  const toggleCompare = (id: string) => {
    setCompare((current) => current.includes(id) ? current.filter((c) => c !== id) : current.length >= MAX_COMPARE ? current : [...current, id]);
    event("compare", id);
  };
  const suggestions = query.trim().length < 2 || !data ? [] : data.models.families.filter((f) => !compare.includes(f.id) && `${f.name} ${f.creator}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6);

  if (error) return <div className="panorama-state panorama-state--error" role="alert"><p>{t("Não foi possível carregar os dados dos modelos.", "The model data could not be loaded.")}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>{t("Tentar de novo", "Try again")}</button></div>;
  if (!data) return <div className="panorama-state" role="status"><LoaderCircle className="spinning" aria-hidden="true" size={24} />{t("Carregando os testes dos modelos…", "Loading model benchmarks…")}</div>;

  const { models, sources, plans } = data;
  const multi = models.families.filter((f) => f.variants.filter((v) => v.scores.intelligence !== null).length > 1).length;
  const fetched = models.fetchedAt.slice(0, 10).split("-").reverse().join("/");

  // `panorama-guide` dá a mesma margem lateral das outras abas do Panorama (prototype.css).
  return <div className="gm panorama-guide" lang={english ? "en" : "pt-BR"}>
    <section className="gm-read" aria-label={t("Como ler esta página", "How to read this page")}>
      <div className="gm-read-item"><span className="gm-read-icon"><BarChart3 size={18} aria-hidden="true" /></span><p><strong>{t("O melhor resultado de cada modelo", "Each model's best result")}</strong>{t(" aparece primeiro, como nos outros rankings. Quase sempre é o esforço máximo.", " comes first, as in other rankings. It's almost always the highest effort.")}</p></div>
      <div className="gm-read-item is-new"><span className="gm-read-icon"><Footprints size={18} aria-hidden="true" /></span><p><span className="gm-badge">{t("só aqui", "only here")}</span><strong>{t("Abra a escada", "Open the ladder")}</strong>{t(` de ${multi} modelos: veja quanto cada nível de esforço entrega, custa e demora, e compare o modelo com ele mesmo.`, ` of ${multi} models: see what each effort level delivers, costs and takes, and compare a model with itself.`)}</p></div>
      <div className="gm-read-item"><span className="gm-read-icon"><Equal size={18} aria-hidden="true" /></span><p><strong>{t("Menos de 1 ponto é empate.", "Less than 1 point is a tie.")}</strong>{t(" Quando isso acontece, a posição vira ≈.", " When it happens, the position becomes ≈.")}</p></div>
    </section>

    <nav className="gm-jump" aria-label={t("Partes desta página", "Parts of this page")}>
      <a href="#gm-ranking"><Layers size={15} aria-hidden="true" />{t("Ranking", "Ranking")}</a>
      <a href="#gm-mapa"><BarChart3 size={15} aria-hidden="true" />{t("Custo e tempo", "Cost and time")}</a>
      {sources && <a href="#gm-vozes"><Equal size={15} aria-hidden="true" />{t("Três vozes", "Three voices")}</a>}
      <a href="#gm-equipe"><Users size={15} aria-hidden="true" />{t("Sua equipe", "Your team")}{team.length > 0 && <b>{team.length}</b>}</a>
    </nav>

    <div className="gm-controls">
      <div className="gm-index-pick" role="group" aria-label={t("Índice da Artificial Analysis", "Artificial Analysis index")}>
        {INDEX_KEYS.map((key) => <button type="button" key={key} aria-pressed={indexKey === key} onClick={() => { setIndexKey(key); event("index", key); }}>{indexLabel(key, english, key !== "intelligence")}</button>)}
      </div>
      <label className="gm-search" htmlFor="gm-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{t("Buscar modelo para comparar", "Find a model to compare")}</span>
        <input id="gm-search" type="search" value={query} autoComplete="off" placeholder={t("Buscar modelo para comparar…", "Find a model to compare…")} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {suggestions.length > 0 && <div className="gm-suggest gm-suggest-top">{suggestions.map((f) => <button type="button" key={f.id} disabled={compare.length >= MAX_COMPARE} onClick={() => { toggleCompare(f.id); setQuery(""); }}><Mark company={f.creator} config={config} size={20} /><span>{f.name}<small>{f.creator}</small></span></button>)}</div>}
    </div>

    <section id="gm-ranking" className="gm-section" aria-labelledby="gm-ranking-title">
      <header className="gm-section-head">
        <h2 id="gm-ranking-title">{indexLabel(indexKey, english)}<small>{t("no melhor resultado de cada modelo", "at each model's best")}</small></h2>
        <p>{indexKey === "intelligence"
          ? t("Intelligence Index v5 da Artificial Analysis: média de quatro blocos de 25% (trabalho de conhecimento, código, ciência e geral), com nove testes rodados pela própria AA. Mede o teto em tarefas difíceis; não mede conversa nem escrita.", "Artificial Analysis Intelligence Index v5: the average of four 25% blocks (knowledge work, coding, science and general), with nine tests run by AA itself. It measures the ceiling on hard tasks; not chat or writing.")
          : t("Índice de domínio da Artificial Analysis, de 0 a 100. A AA não publica quais testes entram nele; as listas de domínio ordenam os modelos de forma muito parecida com a geral.", "An Artificial Analysis domain index, 0–100. AA doesn't publish which tests go into it; domain lists rank models very much like the overall one.")}</p>
      </header>
      <Ranking rows={rows} indexKey={indexKey} config={config} plans={plans} english={english} t={t} compare={compare} maxCompare={MAX_COMPARE} onToggleCompare={toggleCompare} onEvent={event} />
    </section>

    <section id="gm-mapa" className="gm-section" aria-labelledby="gm-mapa-title">
      <header className="gm-section-head">
        <h2 id="gm-mapa-title">{t("Quanto custa cada ponto", "What each point costs")}</h2>
        <p>{t("Cada linha colorida é um modelo, do menor ao maior esforço. Quando a linha deita, o degrau seguinte custa muito e rende pouco. Os pontos cinza são os outros modelos.", "Each colored line is a model, from lowest to highest effort. When the line flattens, the next step costs a lot and delivers little. Gray dots are the other models.")}</p>
        <div className="gm-segmented" role="group" aria-label={t("Eixo horizontal", "Horizontal axis")}>
          <button type="button" aria-pressed={axis === "cost"} onClick={() => { setAxis("cost"); event("axis", "cost"); }}>{t("Custo por tarefa (API)", "Cost per task (API)")}</button>
          <button type="button" aria-pressed={axis === "time"} onClick={() => { setAxis("time"); event("axis", "time"); }}>{t("Tempo de resposta", "Response time")}</button>
        </div>
      </header>
      <Mapa models={models} highlighted={highlighted} indexKey={indexKey} axis={axis} config={config} english={english} t={t} onPick={toggleCompare} />
      <p className="gm-measures">{compared.length ? t("Em destaque: os modelos que você escolheu para comparar.", "Highlighted: the models you chose to compare.") : t("Em destaque: os cinco primeiros com três ou mais esforços medidos. Escolha outros com + no ranking.", "Highlighted: the top five with three or more measured efforts. Pick others with + in the ranking.")} {axis === "cost" ? t("Quem usa assinatura não paga por tarefa: leia o custo como indicador de quanto o esforço consome da cota.", "Subscribers don't pay per task: read cost as a sign of how much effort uses up the quota.") : t("Tempo mediano por consulta do índice, do envio à resposta completa.", "Median time per index query, from sending to the full answer.")}</p>
    </section>

    {sources && <section id="gm-vozes" className="gm-section" aria-labelledby="gm-vozes-title">
      <header className="gm-section-head">
        <h2 id="gm-vozes-title">{t("Três vozes: capacidade e preferência", "Three voices: capability and preference")}</h2>
        <p>{t("A Artificial Analysis mede quanto o modelo acerta em tarefas difíceis. O LMArena mede qual resposta as pessoas preferem, sem saber de que modelo veio. O Epoch mede ciência e matemática (no comparador). As fontes não se somam: quando discordam, é porque medem coisas diferentes.", "Artificial Analysis measures how often a model gets hard tasks right. LMArena measures which answer people prefer without knowing the model. Epoch measures science and math (in the comparison). The sources don't add up: when they disagree, it's because they measure different things.")}</p>
      </header>
      <Vozes models={models} sources={sources} config={config} english={english} t={t} onPick={toggleCompare} />
    </section>}

    <section id="gm-equipe" className="gm-section" aria-labelledby="gm-equipe-title">
      <header className="gm-section-head">
        <h2 id="gm-equipe-title">{t("Sua equipe", "Your team")}</h2>
        <p>{t("Marque os planos que você tem e veja cada modelo em todas as medidas, lado a lado. A página não escolhe por você: ela mostra onde cada um fica.", "Select the plans you have and see each model across every measure, side by side. The page doesn't choose for you: it shows where each one stands.")}</p>
      </header>
      <Equipe models={models} sources={sources} plans={plans} team={team} planIds={planIds} extraIds={extraIds} config={config} english={english} t={t}
        onPlans={setPlanIds} onExtras={setExtraIds} onEffort={(id, effort) => setEfforts((all) => ({ ...all, [id]: effort }))} onEvent={event} />
    </section>

    <footer className="gm-sources">
      <p><strong>{t("Fontes", "Sources")}.</strong> {t(`Artificial Analysis, índice v${models.indexVersion ?? 5}, coletado em ${fetched}`, `Artificial Analysis, index v${models.indexVersion ?? 5}, collected on ${fetched}`)} (<a href={models.sourceUrl} target="_blank" rel="noreferrer">artificialanalysis.ai</a>){sources?.sources.filter((s) => s.id !== "vals").map((s) => <span key={s.id}> · {s.name}{s.collectedAt ? `, ${s.collectedAt.slice(0, 10).split("-").reverse().join("/")}` : ""} (<a href={s.url} target="_blank" rel="noreferrer">{t("site", "site")}</a>{s.license ? `, ${s.license.split(" ")[0]}` : ""})</span>)}. {plans && t(`Planos conferidos nas páginas oficiais em ${plans.checkedAt.split("-").reverse().join("/")}.`, `Plans checked on the official pages on ${plans.checkedAt}.`)}</p>
      <p>{t("Curadoria LAPIG/UFG. A Artificial Analysis roda os testes por conta própria, com o mesmo protocolo para todos os modelos; não republicamos números informados pelos fabricantes.", "Curated by LAPIG/UFG. Artificial Analysis runs the tests itself with the same protocol for every model; we don't republish manufacturer-reported numbers.")} <a href="https://artificialanalysis.ai/methodology/intelligence-benchmarking" target="_blank" rel="noreferrer">{t("Metodologia da AA", "AA methodology")} ↗</a></p>
    </footer>

    {compare.length > 0 && <aside className="gm-tray" aria-label={t("Modelos para comparar", "Models to compare")}>
      <div className="gm-tray-chips">{compared.map((f) => <button type="button" key={f.id} onClick={() => toggleCompare(f.id)} aria-label={t(`Tirar ${f.name}`, `Remove ${f.name}`)}><Mark company={f.creator} config={config} size={18} />{f.name}<X size={13} aria-hidden="true" /></button>)}</div>
      <button type="button" ref={compareButton} className="gm-button" disabled={compare.length < 1} onClick={() => { setCompareOpen(true); event("open_compare", String(compare.length)); }}>{t("Comparar", "Compare")} ({compare.length}/{MAX_COMPARE})</button>
      <button type="button" className="gm-link-button" onClick={() => setCompare([])}>{t("Limpar", "Clear")}</button>
    </aside>}
    {compareOpen && compared.length > 0 && <Comparador families={compared} models={models} sources={sources} plans={plans} indexKey={indexKey} config={config} english={english} t={t}
      onAdd={toggleCompare} onClose={() => { setCompareOpen(false); requestAnimationFrame(() => compareButton.current?.focus()); }} />}

    <Coruja english={english} t={t} onEvent={event} onTeam={(ids) => setPlanIds(ids)}
      state={{ indexKey, axis, rows, compare, team, models, sources, plans }} />
  </div>;
}
