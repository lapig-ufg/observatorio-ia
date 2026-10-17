import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Download, Search } from "lucide-react";
import { trackEvent } from "../analytics";
import { siteAssetUrl } from "../locale";
import { formatPublicDate } from "../dateLabels";
import { SectionNav } from "../SectionNav";
import { sectionNavigation, type SectionLink } from "../sectionNavigation";
import {
  AREA_INDICATORS, AREA_ORDER, AREA_SHORT, CATEGORY_LABEL, GEN_CATEGORIES, REV_CATEGORIES, SURVEY_BASE, SURVEY_TABS,
  VERIFICATION_LABEL, boldSegments, brazilianJournals, categoryCounts, comparableRows, filterPolicies, isBrazilian, percent,
  type PolicyFilters, type PolicyRow,
} from "./surveyLogic";
import "./levantamentos.css";

type Trend = { sub: string; headline: string; trends: string[]; brasil: string; pratica: string; confianca: string };
type SurveyData = {
  rows: PolicyRow[]; areas: Record<string, string>; messages: [string, string][]; cross: [string, string][];
  trends: Record<string, Trend>; brasil: string[]; checks: string[]; guide: string[][];
  evidence: { l: string; s: string; v: number; u?: string; declara?: boolean }[];
  metodo: [string, string][];
  meta: { referencia: string; revisao?: { data: string; status: string; inventory: number; verified: number; changed: number; unresolved: number; history: string } };
};

// Paleta validada para daltonismo: verde permite, âmbar restringe, laranja veda, cinza neutro para ausência de regra.
const COLORS: Record<string, string> = {
  Permitida: "#23885a", Restrita: "#d9a23f", Vedada: "#c4512c", "Sem regra": "#9ba59f",
  Condicionado: "#23885a", Vedado: "#c4512c", "Não trata": "#9ba59f",
};
const DARK_TEXT = new Set(["Restrita", "Sem regra", "Não trata"]);
const DATA_DIR = "levantamentos/politicas-ia/";
const LOC_LABEL: Record<string, string> = { "Múltiplos": "Múltiplos / conforme o uso", "Submissão/carta": "Submissão ou carta", "Sem exigência p/ redação": "Não exige para a redação" };

function Rich({ text }: { text: string }) {
  return <>{boldSegments(text).map((part, i) => part.bold ? <strong key={i}>{part.text}</strong> : <Fragment key={i}>{part.text}</Fragment>)}</>;
}

function Status({ value }: { value: string }) {
  if (!COLORS[value]) return <span className="sv-status sv-status-na">{CATEGORY_LABEL[value] || value}</span>;
  return <span className="sv-status"><span className="sv-swatch" style={{ background: COLORS[value] }} aria-hidden="true" />{CATEGORY_LABEL[value] || value}</span>;
}

function Legend({ categories }: { categories: readonly string[] }) {
  return <ul className="sv-legend">{categories.map(category => <li key={category}><span className="sv-swatch" style={{ background: COLORS[category] }} aria-hidden="true" />{CATEGORY_LABEL[category]}</li>)}</ul>;
}

function names(rows: PolicyRow[], limit = 6) {
  return rows.slice(0, limit).map(row => row.nome).join("; ") + (rows.length > limit ? "; …" : "");
}

// Barras em HTML: o texto mantém o tamanho legível no celular, e cada segmento traz rótulo e dica.
function StackedByArea({ rows, field, categories, label }: { rows: PolicyRow[]; field: "gen" | "rev"; categories: readonly string[]; label: string }) {
  const areas = AREA_ORDER.filter(area => rows.some(row => row.area === area));
  const counts = areas.map(area => ({ area, ...categoryCounts(rows.filter(row => row.area === area), field, categories) }));
  const notApplicable = counts.reduce((sum, item) => sum + item.notApplicable, 0);
  return <figure className="sv-bars" aria-label={label}>
    {counts.map(({ area, total, parts }) => <div className="sv-bar-row" key={area}>
      <span className="sv-bar-label">{AREA_SHORT[area]}</span>
      <span className="sv-bar-track" role="img" aria-label={`${AREA_SHORT[area]}: ${parts.filter(p => p.rows.length).map(p => `${CATEGORY_LABEL[p.category]} ${p.rows.length}`).join(", ")}, de ${total}`}>
        {parts.map(({ category, rows: part }) => part.length ? <span key={category} className={DARK_TEXT.has(category) ? "sv-seg sv-seg-dark" : "sv-seg"} style={{ flexGrow: part.length, background: COLORS[category] }} title={`${CATEGORY_LABEL[category]}: ${part.length} de ${total} (${Math.round((part.length / total) * 100)}%). ${names(part)}`}>{part.length / total >= 0.06 ? part.length : ""}</span> : null)}
      </span>
      <span className="sv-bar-n">n={total}</span>
    </div>)}
    {notApplicable > 0 && <figcaption className="sv-note">{notApplicable} {notApplicable === 1 ? "registro classificado" : "registros classificados"} como “não se aplica” {notApplicable === 1 ? "fica" : "ficam"} fora destas barras.</figcaption>}
  </figure>;
}

function HorizontalBars({ items, label, max }: { items: { label: string; sub?: string; value: number; display: string; color: string; title: string }[]; label: string; max: number }) {
  return <figure className="sv-bars sv-bars-single" aria-label={label}>
    {items.map(item => <div className="sv-bar-row" key={item.label}>
      <span className="sv-bar-label">{item.label}{item.sub && <small>{item.sub}</small>}</span>
      <span className="sv-bar-track sv-bar-track-open"><span className="sv-bar-fill"><span className="sv-seg" style={{ width: `${Math.max((item.value / max) * 100, 1)}%`, background: item.color }} title={item.title} /></span><span className="sv-bar-value">{item.display}</span></span>
    </div>)}
  </figure>;
}

function YearColumns({ rows }: { rows: PolicyRow[] }) {
  const years = [2023, 2024, 2025, 2026];
  const dated = rows.filter(row => row.ano && row.gen !== "N/A");
  const max = Math.max(...years.map(year => dated.filter(row => row.ano === year).length));
  return <figure className="sv-columns" aria-label="Documentos vigentes por ano de publicação e posição sobre gerar texto">
    {years.map(year => {
      const sub = dated.filter(row => row.ano === year);
      return <div className="sv-column" key={year}>
        <span className="sv-column-total">{sub.length}</span>
        <span className="sv-column-stack" style={{ height: `${(sub.length / max) * 100}%` }} role="img" aria-label={`${year}: ${GEN_CATEGORIES.map(c => `${CATEGORY_LABEL[c]} ${sub.filter(r => r.gen === c).length}`).join(", ")}`}>
          {[...GEN_CATEGORIES].reverse().map(category => { const part = sub.filter(row => row.gen === category); return part.length ? <span key={category} style={{ flexGrow: part.length, background: COLORS[category] }} title={`${year} · ${CATEGORY_LABEL[category]}: ${part.length}. ${names(part, 8)}`} /> : null; })}
        </span>
        <span className="sv-column-year">{year}</span>
      </div>;
    })}
  </figure>;
}

function MiniBar({ rows, field, categories }: { rows: PolicyRow[]; field: "gen" | "rev"; categories: readonly string[] }) {
  const counts = categoryCounts(rows, field, categories);
  if (!counts.total) return <p className="sv-note">Sem registros.</p>;
  return <div className="sv-minibar" role="img" aria-label={counts.parts.filter(p => p.rows.length).map(p => `${CATEGORY_LABEL[p.category]}: ${p.rows.length}`).join("; ")}>
    {counts.parts.map(({ category, rows: part }) => part.length ? <span key={category} title={`${CATEGORY_LABEL[category]}: ${part.length}`} style={{ flex: part.length, background: COLORS[category], color: DARK_TEXT.has(category) ? "#1d2b25" : "#fff" }}>{part.length}</span> : null)}
  </div>;
}

function EntityTable({ rows, columns = "full", empty }: { rows: PolicyRow[]; columns?: "full" | "area" | "brasil"; empty?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="sv-empty">{empty || "Nenhuma entidade corresponde aos filtros escolhidos."}</p>;
  const span = columns === "full" ? 6 : 5;
  return <div className="sv-table-wrap"><table className="sv-table sv-table-stack">
    <thead><tr><th scope="col">Entidade</th>{columns !== "area" && <th scope="col">Área</th>}{columns === "full" && <th scope="col">Tipo</th>}{columns === "area" && <th scope="col">Tipo</th>}<th scope="col">Gerar texto</th><th scope="col">Onde declarar</th><th scope="col">Revisores</th></tr></thead>
    <tbody>{rows.map(row => {
      const id = `${row.nome}-${row.area}`;
      const expanded = open === id;
      return <Fragment key={id}>
        <tr className={expanded ? "is-open" : undefined}>
          <th scope="row"><button type="button" className="sv-row-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : id)}>{row.nome}</button><span className="sv-row-meta">{[row.sub, row.geo, row.ano].filter(Boolean).join(" · ")}</span></th>
          {columns !== "area" && <td data-label="Área">{AREA_SHORT[row.area]}</td>}
          {columns !== "brasil" && <td data-label="Tipo">{row.tipo}</td>}
          <td data-label="Gerar texto"><Status value={row.gen} /></td><td data-label="Onde declarar">{LOC_LABEL[row.loc] || row.loc}</td><td data-label="Revisores"><Status value={row.rev} /></td>
        </tr>
        {expanded && <tr className="sv-detail"><td colSpan={span}>
          <p>{row.nota || "Sem nota."}</p>
          <p className="sv-row-meta">Imagens: {row.img} · Verificação: {VERIFICATION_LABEL[row.verif] || row.verif}{row.url && <> · <a href={row.url} target="_blank" rel="noreferrer">Abrir a fonte <ArrowUpRight size={13} aria-hidden="true" /></a></>}</p>
        </td></tr>}
      </Fragment>;
    })}</tbody>
  </table></div>;
}

function Overview({ data, go }: { data: SurveyData; go: (tab: string) => void }) {
  const rows = data.rows;
  const core = comparableRows(rows);
  const count = (field: "gen", value: string) => rows.filter(row => row[field] === value).length;
  const journals = brazilianJournals(rows);
  const journalsWithRule = journals.filter(row => row.gen !== "Sem regra").length;
  return <>
    <section className="sv-block sv-findings" aria-labelledby="sv-findings-title">
      <h2 id="sv-findings-title">O que o levantamento encontrou</h2>
      <p className="sv-lede">A base reúne {rows.length} registros de sociedades, editoras, periódicos, eventos e agências. Na codificação vigente, {count("gen", "Permitida")} permitem usos generativos sob condições de transparência, com dispensas específicas; {count("gen", "Restrita")} restringem à edição ou apoio auxiliar, {count("gen", "Vedada")} vedam gerar conteúdo e {count("gen", "Sem regra")} não têm regra localizada{count("gen", "N/A") ? ` (em ${count("gen", "N/A")}, a pergunta não se aplica)` : ""}. Entre os periódicos brasileiros da amostra, {journalsWithRule} de {journals.length} têm cláusula codificada. Registros ainda pendentes de reconfirmação mantêm a informação anterior.</p>
      <p className="sv-note">A amostra é intencional: as proporções descrevem as entidades mapeadas, não o universo de periódicos. Veja os critérios em <a href={`${SURVEY_BASE}/metodo`} onClick={event => { event.preventDefault(); go("metodo"); }}>Método e fontes</a>.</p>
      <ol className="sv-messages">{data.messages.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}</ol>
    </section>

    <section className="sv-block" aria-labelledby="sv-layers-title">
      <h2 id="sv-layers-title">Quem define a regra que vale</h2>
      <p className="sv-intro">Confira as instruções do periódico ou evento de destino e a política geral que ele efetivamente adota. O vínculo com uma editora ou sociedade, sozinho, não comprova todas as exigências operacionais do título.</p>
      <ol className="sv-layers">
        <li><strong>Marcos de integridade e ética</strong><span>COPE, ICMJE, WAME, CSE, STM, EASE, ALLEA e ERA Living Guidelines orientam editoras e sociedades.</span></li>
        <li className="sv-layers-pair"><div><strong>Editoras</strong><span>Publicam regras gerais, cuja aplicação e exceções precisam ser conferidas por título.</span></div><div><strong>Sociedades científicas</strong><span>Podem definir normas próprias ou adotar diretrizes de outra entidade, com alcance documentado.</span></div></li>
        <li className="sv-layers-key"><strong>Periódico ou evento de destino</strong><span>É a regra que vale: o que pode, onde declarar, em que formato e o que vale para os revisores.</span></li>
        <li><strong>Autor, parecerista e editor</strong><span>A responsabilidade é humana e não pode ser delegada à IA.</span></li>
      </ol>
      <p className="sv-note">Em paralelo, o fomento e o Estado (CNPq, NIH, NSF, UKRI, ERC, DFG, MOST) regulam o uso de IA em propostas e pareceres.</p>
    </section>

    <section className="sv-block" aria-labelledby="sv-heat-title">
      <h2 id="sv-heat-title">Indicadores por grande área</h2>
      <p className="sv-intro">Percentual e contagem em cada área (excluídos organismos transversais e agências de fomento). Nas colunas com *, o denominador são as entidades que têm regra sobre o tema. Células com denominador menor que 4 aparecem apagadas e não devem ser interpretadas.</p>
      <div className="sv-table-wrap"><table className="sv-table sv-heat">
        <thead><tr><th scope="col">Área</th>{AREA_INDICATORS.map(indicator => <th scope="col" key={indicator.label}>{indicator.label}{indicator.note}</th>)}</tr></thead>
        <tbody>{AREA_ORDER.map(area => {
          const sub = core.filter(row => row.area === area);
          return <tr key={area}><th scope="row">{AREA_SHORT[area]} <span className="sv-row-meta">n={sub.length}</span></th>{AREA_INDICATORS.map(indicator => {
            const ratio = indicator.compute(sub), value = percent(ratio);
            if (!ratio.total) return <td key={indicator.label} className="sv-heat-off">—</td>;
            if (ratio.total < 4) return <td key={indicator.label} className="sv-heat-off">{value}% <small>({ratio.count}/{ratio.total})</small></td>;
            return <td key={indicator.label} style={{ background: `color-mix(in srgb, #23885a ${Math.round(4 + value * 0.42)}%, #ffffff)` }}>{value}% <small>({ratio.count}/{ratio.total})</small></td>;
          })}</tr>;
        })}</tbody>
      </table></div>
    </section>

    <section className="sv-block" aria-labelledby="sv-cross-title">
      <h2 id="sv-cross-title">Tendências que atravessam as áreas</h2>
      <dl className="sv-defs">{data.cross.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
    </section>
  </>;
}

function ByArea({ data }: { data: SurveyData }) {
  const [area, setArea] = useState<string>("EXA");
  const trend = data.trends[area];
  const core = comparableRows(data.rows).filter(row => row.area === area);
  const all = data.rows.filter(row => row.area === area);
  return <section className="sv-block" aria-labelledby="sv-area-title">
    <div className="sv-area-picker" role="group" aria-label="Escolher a grande área">
      {AREA_ORDER.map(key => <button key={key} type="button" aria-pressed={key === area} onClick={() => { setArea(key); trackEvent("survey_area", { event_category: "levantamento", event_label: key }); }}>{AREA_SHORT[key]}</button>)}
    </div>
    <p className="eyebrow">{data.areas[area]}</p>
    <h2 id="sv-area-title" className="sv-area-headline">{trend.headline}</h2>
    <p className="sv-note">Subáreas: {trend.sub}</p>
    <div className="sv-area-grid">
      <div><h3>Tendências</h3><ul className="sv-list">{trend.trends.map(item => <li key={item}><Rich text={item} /></li>)}</ul></div>
      <aside className="sv-area-side">
        <h3>Gerar texto <span className="sv-row-meta">n={categoryCounts(core, "gen", GEN_CATEGORIES).total}</span></h3>
        <MiniBar rows={core} field="gen" categories={GEN_CATEGORIES} />
        <Legend categories={GEN_CATEGORIES} />
        <h3>IA na revisão <span className="sv-row-meta">n={core.length}</span></h3>
        <MiniBar rows={core} field="rev" categories={REV_CATEGORIES} />
        <Legend categories={REV_CATEGORIES} />
        <h3>No Brasil</h3><p>{trend.brasil}</p>
        <h3>Na prática</h3><p>{trend.pratica}</p>
        <p className="sv-note">Confiança: {trend.confianca}</p>
      </aside>
    </div>
    <h3 className="sv-subhead">Entidades mapeadas na área ({all.length})</h3>
    <EntityTable rows={all} columns="area" />
  </section>;
}

function Compare({ data }: { data: SurveyData }) {
  const core = comparableRows(data.rows);
  const withRule = core.filter(row => ["Permitida", "Restrita", "Vedada"].includes(row.gen) && row.loc !== "—");
  const places: [string, string][] = [["Múltiplos", "Múltiplos locais"], ["Não especifica", "Não especifica"], ["Seção própria", "Seção própria"], ["Métodos", "Métodos"], ["Agradecimentos", "Agradecimentos"], ["Submissão/carta", "Só submissão ou carta"], ["Nota de rodapé", "Nota de rodapé"], ["Sem exigência p/ redação", "Não exige para a redação"]];
  const placeCounts = places.map(([key, label]) => ({ key, label, rows: withRule.filter(row => row.loc === key) }));
  return <>
    <section className="sv-block" aria-labelledby="sv-gen-title">
      <h2 id="sv-gen-title">Gerar texto ou conteúdo com IA</h2>
      <p className="sv-intro">Posição de sociedades, editoras temáticas, periódicos e eventos, por grande área. Passe o cursor sobre as barras para ver exemplos.</p>
      <Legend categories={GEN_CATEGORIES} />
      <StackedByArea rows={core} field="gen" categories={GEN_CATEGORIES} label="Posição sobre gerar texto com IA, por grande área" />
    </section>
    <section className="sv-block" aria-labelledby="sv-rev-title">
      <h2 id="sv-rev-title">Uso de IA por revisores</h2>
      <p className="sv-intro">“Condicionado” reúne quem só admite usos limitados (linguagem do próprio parecer, ferramenta segura) ou apenas veda o envio do manuscrito.</p>
      <Legend categories={REV_CATEGORIES} />
      <StackedByArea rows={core} field="rev" categories={REV_CATEGORIES} label="Posição sobre uso de IA por revisores, por grande área" />
    </section>
    <div className="sv-two">
      <section className="sv-block" aria-labelledby="sv-loc-title">
        <h2 id="sv-loc-title">Onde declarar</h2>
        <HorizontalBars label="Local exigido para declarar o uso de IA" max={Math.max(...placeCounts.map(place => place.rows.length))} items={placeCounts.map(place => ({ label: place.label, value: place.rows.length, display: `${place.rows.length} (${Math.round((place.rows.length / withRule.length) * 100)}%)`, color: "#23885a", title: names(place.rows, 8) }))} />
        <p className="sv-note">Entidades com regra (n={withRule.length}). “Múltiplos” inclui locais cumulativos ou alternativas condicionais, conforme o uso da IA ou a estrutura do artigo; não significa exigir sempre todas as seções.</p>
      </section>
      <section className="sv-block" aria-labelledby="sv-year-title">
        <h2 id="sv-year-title">Ano do documento vigente</h2>
        <Legend categories={GEN_CATEGORIES} />
        <YearColumns rows={data.rows} />
        <p className="sv-note">Somente documentos com ano normativo identificado na base; ano de consulta não equivale ao ano da regra. Há registros ainda pendentes de reconfirmação.</p>
      </section>
    </div>
    <section className="sv-block" aria-labelledby="sv-ev-title">
      <h2 id="sv-ev-title">Política e prática</h2>
      <p className="sv-intro">Estimativas históricas de traços linguísticos e taxas de declaração vêm de corpora, datas e métodos diferentes; não são diretamente comparáveis nem demonstram a eficácia causal das políticas. Esses estudos não foram reanalisados nesta manutenção. Detectores não comprovam uso de IA em um caso individual.</p>
      <HorizontalBars label="Estimativas de uso de IA em textos científicos e de declaração de uso" max={25} items={data.evidence.map(item => ({ label: item.l, sub: item.s, value: item.v, display: `${String(item.v).replace(".", ",")}%`, color: item.declara ? "#c4512c" : "#23885a", title: `${String(item.v).replace(".", ",")}% · ${item.s}` }))} />
      <p className="sv-note">Em laranja, a parcela de artigos que declara o uso de IA.</p>
    </section>
  </>;
}

function Entities({ data }: { data: SurveyData }) {
  const [filters, setFilters] = useState<PolicyFilters>({ query: "", area: "", type: "", gen: "", rev: "", scope: "" });
  const rows = useMemo(() => filterPolicies(data.rows, filters), [data.rows, filters]);
  // Lotes de 30 evitam uma página de dezenas de milhares de pixels no celular.
  const [limit, setLimit] = useState(30);
  const focusFrom = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setLimit(30), [filters]);
  // Depois de "Mostrar mais", o foco vai ao primeiro item novo, para o teclado seguir a leitura.
  useEffect(() => {
    if (focusFrom.current === null) return;
    const toggles = listRef.current?.querySelectorAll<HTMLButtonElement>(".sv-row-toggle");
    toggles?.[focusFrom.current]?.focus();
    focusFrom.current = null;
  }, [limit]);
  const types = useMemo(() => [...new Set(data.rows.map(row => row.tipo))], [data.rows]);
  const set = (key: keyof PolicyFilters) => (event: { target: { value: string } }) => setFilters(current => ({ ...current, [key]: event.target.value }));
  const active = Object.values(filters).some(Boolean);
  return <section className="sv-block" aria-labelledby="sv-ent-title">
    <h2 id="sv-ent-title">Entidades</h2>
    <div className="sv-filters">
      <label className="sv-search"><span>Buscar</span><span className="sv-search-field"><Search size={17} aria-hidden="true" /><input type="search" value={filters.query} onChange={set("query")} placeholder="Nome, subárea ou nota" /></span></label>
      <label><span>Área</span><select value={filters.area} onChange={set("area")}><option value="">Todas</option>{AREA_ORDER.map(area => <option key={area} value={area}>{AREA_SHORT[area]}</option>)}</select></label>
      <label><span>Tipo</span><select value={filters.type} onChange={set("type")}><option value="">Todos</option>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
      <label><span>Gerar texto</span><select value={filters.gen} onChange={set("gen")}><option value="">Todas</option>{[...GEN_CATEGORIES, "N/A"].map(value => <option key={value} value={value}>{CATEGORY_LABEL[value]}</option>)}</select></label>
      <label><span>Revisores</span><select value={filters.rev} onChange={set("rev")}><option value="">Todas</option>{REV_CATEGORIES.map(value => <option key={value} value={value}>{CATEGORY_LABEL[value]}</option>)}</select></label>
      <label><span>Abrangência</span><select value={filters.scope} onChange={set("scope")}><option value="">Todas</option><option value="br">Só Brasil</option><option value="int">Fora do Brasil</option></select></label>
    </div>
    <p className="sv-count" aria-live="polite">{rows.length} de {data.rows.length} entidades{active && <> · <button type="button" className="sv-link-button" onClick={() => setFilters({ query: "", area: "", type: "", gen: "", rev: "", scope: "" })}>Limpar filtros</button></>}</p>
    <div ref={listRef}><EntityTable rows={rows.slice(0, limit)} /></div>
    {rows.length > limit && <button type="button" className="load-more sv-more" onClick={() => { focusFrom.current = limit; setLimit(current => current + 30); }}>Mostrar mais {Math.min(30, rows.length - limit)} de {rows.length - limit} restantes</button>}
    <p className="sv-note">Clique no nome para ver a nota, o tratamento de imagens e a fonte.</p>
  </section>;
}

function Brazil({ data }: { data: SurveyData }) {
  const journals = brazilianJournals(data.rows);
  return <>
    <div className="sv-two">
      <section className="sv-block" aria-labelledby="sv-br-chart-title">
        <h2 id="sv-br-chart-title">Periódicos brasileiros: há regra de IA?</h2>
        <Legend categories={GEN_CATEGORIES} />
        <StackedByArea rows={journals} field="gen" categories={GEN_CATEGORIES} label="Periódicos brasileiros por área e posição sobre gerar texto com IA" />
        <p className="sv-note">Referência da revisão: {formatPublicDate(data.meta.referencia, "pt")}; correções identificadas no histórico. {data.meta.revisao?.unresolved ? "Não se afirma releitura integral PT/EN de todos os periódicos nesta revisão parcial." : "Consulte no histórico a cobertura e as fontes por registro. A/NL não demonstram ausência de regra em toda a instituição."}</p>
      </section>
      <section className="sv-block" aria-labelledby="sv-br-list-title">
        <h2 id="sv-br-list-title">O que vale no Brasil</h2>
        <ul className="sv-list">{data.brasil.map(item => <li key={item}><Rich text={item} /></li>)}</ul>
      </section>
    </div>
    <section className="sv-block" aria-labelledby="sv-br-table-title">
      <h2 id="sv-br-table-title">Entidades e periódicos brasileiros mapeados</h2>
      <EntityTable rows={data.rows.filter(isBrazilian)} columns="brasil" />
    </section>
  </>;
}

function Authors({ data }: { data: SurveyData }) {
  return <>
    <section className="sv-block" aria-labelledby="sv-decision-title">
      <h2 id="sv-decision-title">Antes de submeter: um roteiro de decisão</h2>
      <ol className="sv-decision">
        <li><h3>Usei IA só para correção gramatical ou ortográfica?</h3><p>Confira a política do destino: Elsevier e Sage têm dispensas para apoio básico; LMS e Thieme exigem declaração inclusive de não uso. Não extrapole uma dispensa ou obrigação para outro título.</p></li>
        <li><h3>O destino veda gerar texto ou limita a IA à linguagem?</h3><p>Exemplos reconfirmados: ASME, Optica, RAE, RBCS-ANPOCS e Educação &amp; Sociedade vedam gerar o texto; ADSA limita a escrita à linguagem. Se seu uso contrariar a política, não o oculte: consulte a editoria sobre a admissibilidade e as medidas necessárias.</p></li>
        <li><h3>A IA fez parte do método (dados, código, análise)?</h3><p>Descreva de forma reproduzível no local exigido, com ferramenta, versão e parâmetros pertinentes. Nem toda limitação de escrita proíbe IA como método científico.</p></li>
        <li><h3>Declare no local e no formato exigidos</h3><p>Seção própria, Agradecimentos, nota de rodapé, carta ou sistema de submissão, conforme o periódico.</p></li>
        <li><h3>Verifique e guarde o registro</h3><p>Confira citações, números e resultados nas fontes originais. Guarde o registro de uso; verifique também as regras para responder aos revisores, sem presumir que sejam iguais às da preparação do manuscrito.</p></li>
      </ol>
    </section>
    <section className="sv-block" aria-labelledby="sv-checks-title">
      <h2 id="sv-checks-title">Lista de verificação</h2>
      <ol className="sv-list sv-checks">{data.checks.map(item => <li key={item}><Rich text={item} /></li>)}</ol>
    </section>
    <section className="sv-block" aria-labelledby="sv-guide-title">
      <h2 id="sv-guide-title">Guia rápido por periódico de destino</h2>
      <p className="sv-intro">Seleção de entidades com os quatro eixos reconciliados nesta revisão, com ênfase em geociências, engenharia e agrárias. As regras não são automaticamente extensíveis a todo periódico da editora ou sociedade.</p>
      <div className="sv-table-wrap"><table className="sv-table">
        <thead><tr><th scope="col">Periódicos</th><th scope="col">Editora ou sociedade</th><th scope="col">Gerar texto com IA</th><th scope="col">Onde e como declarar</th><th scope="col">Revisores</th><th scope="col">Verificação</th></tr></thead>
        <tbody>{data.guide.map(row => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td><Rich text={row[2]} /></td><td>{row[3]}</td><td>{row[4]}</td><td>{VERIFICATION_LABEL[row[5]] || row[5]}</td></tr>)}</tbody>
      </table></div>
    </section>
  </>;
}

function Method({ data }: { data: SurveyData }) {
  const download = (label: string) => trackEvent("survey_download", { event_category: "levantamento", event_label: label });
  return <>
    <section className="sv-block" aria-labelledby="sv-method-title">
      <h2 id="sv-method-title">Método</h2>
      <dl className="sv-defs">{data.metodo.map(([title, text]) => <div key={title}><dt>{title}</dt><dd><Rich text={text} /></dd></div>)}</dl>
    </section>
    <section className="sv-block" aria-labelledby="sv-data-title">
      <h2 id="sv-data-title">Dados e citação</h2>
      <p className="sv-downloads">
        <a href={siteAssetUrl(`${DATA_DIR}base-politicas-ia-2026-10.csv`)} download onClick={() => download("csv")}><Download size={16} aria-hidden="true" />Base codificada (CSV)</a>
        <a href={siteAssetUrl(`${DATA_DIR}base-politicas-ia-2026-10.xlsx`)} download onClick={() => download("xlsx")}><Download size={16} aria-hidden="true" />Base codificada com livro de códigos (XLSX)</a>
      </p>
      <p><strong>Como citar:</strong> Observatório UFG-IA (LAPIG/UFG). <em>Políticas de IA na publicação científica</em>. Base de {formatPublicDate(data.meta.referencia, "pt")}{data.meta.revisao ? `; revisão ${data.meta.revisao.status} de ${formatPublicDate(data.meta.revisao.data, "pt")}` : ""}.</p>
      {data.meta.revisao && <p><a href={siteAssetUrl(data.meta.revisao.history)} download>Histórico da revisão: fontes, decisões e pendências (JSON)</a></p>}
    </section>
    <section className="sv-block" aria-labelledby="sv-sources-title">
      <h2 id="sv-sources-title">Fontes por área</h2>
      <div className="sv-sources">{AREA_ORDER.map(area => <p key={area}><strong>{AREA_SHORT[area]}</strong>{data.rows.filter(row => row.area === area && row.url).map((row, i) => <Fragment key={row.nome}>{i ? " · " : " "}<a href={row.url} target="_blank" rel="noreferrer">{row.nome}</a></Fragment>)}</p>)}
        <p><strong>Evidência empírica</strong>{data.evidence.filter(item => item.u).map((item, i) => <Fragment key={item.l}>{i ? " · " : " "}<a href={item.u} target="_blank" rel="noreferrer">{item.s}</a></Fragment>)}</p>
      </div>
    </section>
  </>;
}

// "2026-10-16" → "outubro de 2026": o mês basta para situar o leitor, sem jargão de versão.
function monthYear(iso: string) {
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const [year, month] = iso.split("-").map(Number);
  return month ? `${months[month - 1]} de ${year}` : String(year);
}

// Retrato inicial: uma barra com a posição de todas as entidades sobre gerar texto com IA e dois caminhos de entrada.
function SurveySnapshot({ rows }: { rows: PolicyRow[] }) {
  const counts = categoryCounts(rows, "gen", GEN_CATEGORIES);
  const phrase: Record<string, string> = { Permitida: "permitem, com condições", Restrita: "restringem à edição", Vedada: "vedam", "Sem regra": "sem regra localizada" };
  return <div className="sv-snapshot">
    <p className="sv-snapshot-title">Posso gerar texto com IA? O que dizem {counts.total} periódicos, editoras e entidades</p>
    <div className="sv-snapshot-bar" role="img" aria-label={counts.parts.map(part => `${part.rows.length} ${phrase[part.category]}`).join(", ")}>
      {counts.parts.map(({ category, rows: part }) => part.length ? <span key={category} className={DARK_TEXT.has(category) ? "sv-seg sv-seg-dark" : "sv-seg"} style={{ flexGrow: part.length, background: COLORS[category] }}>{part.length / counts.total >= 0.08 ? part.length : ""}</span> : null)}
    </div>
    <ul className="sv-snapshot-legend">{counts.parts.map(({ category, rows: part }) => <li key={category}><span className="sv-swatch" style={{ background: COLORS[category] }} aria-hidden="true" /><strong>{part.length}</strong> {phrase[category]}</li>)}</ul>
    <p className="sv-snapshot-actions">
      <a className="sv-button sv-button-primary" href={`${SURVEY_BASE}/entidades`}>Encontre sua revista ou editora <ArrowRight size={16} aria-hidden="true" /></a>
      <a className="sv-button" href={`${SURVEY_BASE}/autores`}>Guia para autores e pareceristas <ArrowRight size={16} aria-hidden="true" /></a>
    </p>
  </div>;
}

export function PoliticasIAPage({ english = false }: { english?: boolean }) {
  const [data, setData] = useState<SurveyData | null>(null);
  const [failed, setFailed] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);
  const englishLabels = ["Overview", "By area", "Compare areas", "Entities", "Brazil", "For authors and reviewers", "Method and sources"];
  const sections = SURVEY_TABS.map((entry, index) => ({ key: entry.key, href: entry.key ? `${SURVEY_BASE}/${entry.key}` : SURVEY_BASE, label: english ? englishLabels[index] : entry.label }));
  const tab = sectionNavigation(sections, route).current!.key;
  const navigate = (section: SectionLink, position: "section-bar" | "pager") => trackEvent("survey_tab", {
    event_category: "levantamento", event_label: section.key || "geral", position,
  });
  useEffect(() => {
    const controller = new AbortController();
    // Revalidate the independently published dataset: a fresh JS bundle must not show cached older policies.
    fetch(siteAssetUrl(`${DATA_DIR}dados.json`), { signal: controller.signal, cache: "no-cache" })
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(setData)
      .catch(error => { if ((error as Error).name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const sync = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const go = (key: string) => {
    window.location.hash = key ? `${SURVEY_BASE}/${key}` : SURVEY_BASE;
  };
  return <section id="levantamento" className="sv-page panorama-page" aria-labelledby="sv-title" lang="pt-BR">
    <div className="panorama-intro pt-panorama-intro">
      <div className="panorama-heading">
        <p className="eyebrow">Levantamento do Observatório{data ? ` · ${monthYear(data.meta.referencia)}` : ""}</p>
        <h1 id="sv-title">Políticas de IA na publicação científica</h1>
        <p>O que periódicos, editoras, sociedades científicas e agências de fomento permitem, exigem e vedam no uso de IA generativa, por grande área do CNPq.</p>
        {english && <p className="sv-language-note" lang="en">This survey is available in Portuguese only.</p>}
      </div>
      {data && tab === "" && <SurveySnapshot rows={data.rows} />}
    </div>
    <SectionNav sections={sections} route={route} label={english ? "Survey sections" : "Seções do levantamento"} headingId="sv-title" english={english} tabsClassName="sv-tabs" onNavigate={navigate} />
    {data?.meta.revisao && <aside className="sv-block sv-review-notice" aria-label={english ? "Review coverage" : "Cobertura da revisão"} lang={english ? "en" : "pt-BR"}>
      <p><strong>{english ? (data.meta.revisao.unresolved ? "Partial review" : "Review coverage") : (data.meta.revisao.unresolved ? "Revisão parcial" : "Cobertura da revisão")} · {formatPublicDate(data.meta.revisao.data, english ? "en" : "pt")}</strong></p>
      <p>{english
        ? `${data.meta.revisao.verified}/${data.meta.revisao.inventory} records reconciled across all four policy fields; ${data.meta.revisao.changed} corrected and ${data.meta.revisao.unresolved} unresolved. ${data.meta.revisao.unresolved ? "Unresolved records retain their previous coding. This is not a completed full audit. " : ""}The survey content remains in Portuguese.`
        : `${data.meta.revisao.verified}/${data.meta.revisao.inventory} registros reconciliados nos quatro eixos; ${data.meta.revisao.changed} corrigidos e ${data.meta.revisao.unresolved} pendentes. ${data.meta.revisao.unresolved ? "Os pendentes mantêm a codificação anterior. Não é uma auditoria integral concluída." : "Consulte as fontes e decisões no histórico."}`}</p>
      <a href={siteAssetUrl(data.meta.revisao.history)}>{english ? "Review evidence and unresolved records (JSON)" : "Fontes, decisões e registros pendentes (JSON)"}</a>
    </aside>}
    <div className="sv-content">
      {failed ? <p className="sv-empty" role="alert">Não foi possível carregar os dados do levantamento. Tente recarregar a página.</p>
        : !data ? <p className="sv-empty" aria-live="polite">Carregando o levantamento…</p>
        : tab === "areas" ? <ByArea data={data} /> : tab === "comparar" ? <Compare data={data} /> : tab === "entidades" ? <Entities data={data} />
        : tab === "brasil" ? <Brazil data={data} /> : tab === "autores" ? <Authors data={data} /> : tab === "metodo" ? <Method data={data} /> : <Overview data={data} go={go} />}
    </div>
    <SectionNav sections={sections} route={route} label={english ? "Survey sections" : "Seções do levantamento"} headingId="sv-title" english={english} position="pager" onNavigate={navigate} />
  </section>;
}
