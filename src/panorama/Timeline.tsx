import { ArrowUpRight, CalendarDays, ChevronDown, Download, FileDown, Filter, LoaderCircle, Maximize2, Minus, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { trackEvent } from "../analytics";
import {
  PANORAMA_EPOCH,
  PANORAMA_SITE,
  benchmarkScoresForLaunch,
  canonicalCompany,
  catalogWithoutCurated,
  companyColor,
  companyCountry,
  companyEcosystem,
  daysSinceEpoch,
  launchForModel,
  type PanoramaBenchmarks,
  type PanoramaCatalogModel,
  type PanoramaConfig,
  type PanoramaLaunch,
} from "../panoramaData";
import { loadPanoramaBenchmarks, loadPanoramaCatalog, loadPanoramaLaunches, type PanoramaLocale } from "../panoramaSource";
import {
  buildTimelineGroups,
  clampPxPerDay,
  filterOptions,
  filterTimelineItems,
  fitPxPerDay,
  groupedByMonth,
  MIN_COMPANY_TRACK,
  pillSpec,
  recentMilestones,
  stackPills,
  timelineCsv,
  trackHeight,
  ZOOM,
  type PlacedPill,
  type TimelineCsvLabels,
  type TimelineEcosystem,
  type TimelineFilters,
  type TimelineGroup,
  type TimelineItem,
  type TimelineLevel,
  type TimelineMonthGroup,
  type TimelineTrack,
} from "../panoramaTimeline";
import { guideModelHref, parseRulerDeepLink } from "../panoramaGuide";

/* A régua (linha do tempo) do Panorama, desenhada aqui dentro — sem iframe.

   Dados: `loadPanoramaLaunches` traz os níveis 1 (marcos) e 2 (secundários)
   da planilha viva; o catálogo da Artificial Analysis (nível 3) só é baixado
   quando o leitor liga a régua ampliada, para o primeiro paint não esperar
   por um arquivo que a maioria das visitas não usa (mesma regra do Panorama).

   Geometria portada de assets/render.js: pílulas empilhadas em lanes em torno
   do eixo da trilha, eixo de anos, linha de "hoje". A lógica pura mora em
   panoramaTimeline.ts, testada à parte.

   Rolagem (computador): quem rola na vertical é a PÁGINA — a régua ocupa a
   altura de que precisa, sem caixa com rolagem dentro de rolagem (o defeito
   do iframe que viemos aposentar). O contêiner próprio rola só na
   horizontal; o eixo de anos é um elemento sticky na página, logo abaixo do
   cabeçalho do site, com o scrollLeft sincronizado; e os rótulos das trilhas
   ficam numa coluna fixa à esquerda, grudada no contêiner. */

const PAD_L = 170;
const PAD_R = 200;
const HEADER_H = 48;
const GROUP_TITLE_H = 64;
const GROUP_GAP = 10;
const MIN_TRACK_H = 72;
/* Teto de lanes por trilha: 24 na régua padrão, 48 na ampliada — lá o
   problema é outro (dezenas de modelos por empresa nos meses recentes) e um
   teto baixo empilhava pílulas em silêncio. */
const MAX_LANES = 24;
const MAX_LANES_EXPANDED = 48;
const EXPANDED_KEY = "observatorio-panorama-expanded";
/* Chips de empresa visíveis; a cauda longa vai para um "Mais empresas". */
const COMPANY_CHIPS = 8;

const MONTHS_SHORT_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTHS_FULL_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* Cores por ecossistema: faixa de fundo discreta + acento do título. Os
   acentos codificam região (azul-EUA, vermelho-China, violeta-mundo); o resto
   do desenho segue as variáveis visuais do Observatório. */
const GROUP_STYLE: Record<TimelineEcosystem, { bg: string; accent: string }> = {
  "ECOSSISTEMA NORTE-AMERICANO": { bg: "#f0f4fa", accent: "#3c3b6e" },
  "ECOSSISTEMA CHINÊS": { bg: "#fdf2f2", accent: "#de2910" },
  "OUTROS PAÍSES": { bg: "#f4f2fb", accent: "#5b53a8" },
};

type Texts = ReturnType<typeof texts>;

function texts(english: boolean) {
  return {
    loading: english ? "Loading the timeline…" : "Carregando a linha do tempo…",
    error: english ? "The Panorama data could not be loaded." : "Não foi possível carregar os dados do Panorama.",
    retry: english ? "Try again" : "Tentar de novo",
    empty: english ? "No releases match the current filters." : "Nenhum lançamento corresponde aos filtros atuais.",
    searchLabel: english ? "Search by model name" : "Buscar por nome de modelo",
    searchPlaceholder: english ? "Model name…" : "Nome do modelo…",
    allEcosystems: english ? "All ecosystems" : "Todos os ecossistemas",
    allCompanies: english ? "All companies" : "Todas as empresas",
    moreCompanies: english ? "More companies" : "Mais empresas",
    filterEcosystem: english ? "Filter by ecosystem" : "Filtrar por ecossistema",
    filterCompany: english ? "Filter by company" : "Filtrar por empresa",
    filters: english ? "Filters" : "Filtros",
    clearFilters: english ? "Clear filters" : "Limpar filtros",
    expanded: english ? "Expanded timeline" : "Régua ampliada",
    expandedHint: english
      ? "Adds secondary releases from the spreadsheet and the automatic Artificial Analysis catalog."
      : "Acrescenta os lançamentos secundários da planilha e o catálogo automático da Artificial Analysis.",
    zoom: english ? "Zoom" : "Zoom",
    zoomIn: english ? "Zoom in" : "Aproximar",
    zoomOut: english ? "Zoom out" : "Afastar",
    zoomFit: english ? "Fit to width" : "Ajustar à largura",
    exportCsv: english ? "Export CSV" : "Exportar CSV",
    exportSvg: english ? "Export SVG" : "Exportar SVG",
    news: english ? "Latest milestones" : "Novidades",
    today: english ? "today" : "hoje",
    marcoZero: english ? "Starting point · 30 Nov 2022" : "Marco zero · 30 nov 2022",
    level: english ? "Curation level" : "Nível de curadoria",
    level1: english ? "Curated milestone" : "Marco curado",
    level2: english ? "Curated secondary release" : "Lançamento secundário curado",
    level3: english ? "Automatic catalog (Artificial Analysis)" : "Catálogo automático (Artificial Analysis)",
    legendCurated: english ? "curated milestone" : "marco curado",
    legendDashed: english ? "secondary · catalog" : "secundário · catálogo",
    details: english ? "Release details" : "Detalhes do lançamento",
    close: english ? "Close" : "Fechar",
    source: english ? "Source" : "Fonte",
    benchmarks: english ? "Benchmark notes" : "Notas de benchmark",
    benchmarksLoading: english ? "Loading benchmark notes…" : "Carregando notas de benchmark…",
    rankOf: (rank: number, of: number) => english ? `${rank} of ${of}` : `${rank}º de ${of}`,
    portugueseDescription: english ? "Portuguese description" : "",
    releases: (count: number) => english ? (count === 1 ? "release" : "releases") : (count === 1 ? "lançamento" : "lançamentos"),
    summary: english ? "Timeline summary" : "Sumário da linha do tempo",
    catalogUnavailable: english
      ? "The Artificial Analysis catalog could not be downloaded; showing curated levels only."
      : "O catálogo da Artificial Analysis não pôde ser baixado; mostrando apenas os níveis curados.",
    provenance: english
      ? "Curation by LAPIG/UFG · data from the Panorama spreadsheet and Artificial Analysis"
      : "Curadoria LAPIG/UFG · dados da planilha do Panorama e da Artificial Analysis",
    benchmarksCollected: (date: string) => english ? `benchmarks collected on ${date}` : `benchmarks coletados em ${date}`,
    openOriginal: english ? "Open the original Panorama" : "Abrir o Panorama original",
    mobileIntro: english
      ? "Releases grouped by month, most recent first. Previous years are collapsed."
      : "Lançamentos agrupados por mês, mais recente primeiro. Os anos anteriores vêm recolhidos.",
    yearSummary: (year: string, count: number) => english ? `${year} · ${count} ${count === 1 ? "release" : "releases"}` : `${year} · ${count} ${count === 1 ? "lançamento" : "lançamentos"}`,
  };
}

function ecosystemLabel(ecosystem: TimelineEcosystem, english: boolean) {
  if (ecosystem === "ECOSSISTEMA NORTE-AMERICANO") return english ? "North American ecosystem" : "Ecossistema norte-americano";
  if (ecosystem === "ECOSSISTEMA CHINÊS") return english ? "Chinese ecosystem" : "Ecossistema chinês";
  return english ? "Other countries" : "Outros países";
}

function formatDay(iso: string, english: boolean) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const months = english ? MONTHS_SHORT_EN : MONTHS_SHORT_PT;
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

function monthLabel(year: number, monthIndex: number, english: boolean) {
  return english ? `${MONTHS_FULL_EN[monthIndex]} ${year}` : `${MONTHS_FULL_PT[monthIndex]} de ${year}`;
}

function levelLabel(level: TimelineLevel, t: Texts) {
  return level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3;
}

/* Lançamento da planilha → item pronto para desenhar. As regras de identidade
   (nome canônico, cor, país, ecossistema) são as de panoramaData.ts, testadas
   em tests/panorama-data.test.mjs. */
function launchToItem(launch: PanoramaLaunch, config: PanoramaConfig): TimelineItem {
  const company = canonicalCompany(launch.company, config);
  return {
    id: `${launch.date}|${launch.company}|${launch.model}`,
    date: launch.date,
    days: daysSinceEpoch(launch.date),
    company,
    model: launch.model,
    impact: launch.impact,
    reference: launch.reference,
    level: launch.level,
    ecosystem: companyEcosystem(launch.company, config, launch.sheetGroup),
    country: companyCountry(company, config),
    color: companyColor(company, config),
    logoPath: config.logoPaths[config.logoMap[company]] || "",
    known: Boolean(config.companyColors[company]),
    untranslated: launch.untranslated,
  };
}

function catalogToItem(model: PanoramaCatalogModel, config: PanoramaConfig): TimelineItem {
  const company = canonicalCompany(model.company, config);
  return {
    id: `catalogo|${model.date}|${model.company}|${model.model}`,
    date: model.date,
    days: daysSinceEpoch(model.date),
    company,
    model: model.model,
    impact: "",
    reference: "",
    level: 3,
    ecosystem: companyEcosystem(model.company, config),
    country: companyCountry(company, config),
    color: companyColor(company, config),
    logoPath: config.logoPaths[config.logoMap[company]] || "",
    known: Boolean(config.companyColors[company]),
  };
}

function readExpandedPreference() {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeExpandedPreference(value: boolean) {
  try {
    window.localStorage.setItem(EXPANDED_KEY, value ? "1" : "0");
  } catch {
    /* localStorage bloqueado (modo privado etc.): a preferência vale só para a sessão. */
  }
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener("change", onChange);
    onChange();
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/* Altura do cabeçalho fixo do site: o eixo de anos e o popover precisam
   começar abaixo dele, e a altura muda entre breakpoints — é medida, não
   chutada. */
function useStickyHeaderOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const header = document.querySelector(".topbar");
    if (!(header instanceof HTMLElement)) return;
    const measure = () => setOffset(header.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return offset;
}

type LaunchData = Awaited<ReturnType<typeof loadPanoramaLaunches>>;

type TrackLayout = { track: TimelineTrack; placed: PlacedPill[]; height: number };
type GroupLayout = { group: TimelineGroup; tracks: TrackLayout[]; height: number };

type DetailState = {
  item: TimelineItem;
  source: HTMLElement | SVGElement;
  rect: DOMRect;
};

export function Timeline({ english = false }: { english?: boolean }) {
  const locale: PanoramaLocale = english ? "en" : "pt";
  const t = texts(english);
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const headerOffset = useStickyHeaderOffset();
  const rootRef = useRef<HTMLDivElement>(null);
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const changed = () => setHash(window.location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);

  // ─── Dados da planilha (níveis 1 e 2) ───
  const [data, setData] = useState<LaunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    loadPanoramaLaunches(locale, controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error ? reason.message : t.error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [locale, attempt, t.error]);

  // ─── Régua ampliada: nível 2 sempre veio da planilha; o nível 3 é baixado
  //     aqui, só quando o leitor liga o modo. ───
  const [expanded, setExpanded] = useState(readExpandedPreference);
  const [catalog, setCatalog] = useState<PanoramaCatalogModel[] | null>(null);
  const [catalogWarning, setCatalogWarning] = useState("");

  useEffect(() => writeExpandedPreference(expanded), [expanded]);

  useEffect(() => {
    if (!expanded || catalog || !data) return;
    const controller = new AbortController();
    let active = true;
    setCatalogWarning("");
    loadPanoramaCatalog(controller.signal)
      .then((models) => {
        if (active) setCatalog(models);
      })
      .catch(() => {
        /* Falhou o download? A ampliada mostra só os níveis 1 e 2 e avisa. */
        if (active) setCatalogWarning(t.catalogUnavailable);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [expanded, catalog, data, t.catalogUnavailable]);

  // ─── Benchmarks: notas do detalhe e data de coleta do rodapé ───
  /* Carregados em segundo plano depois que a régua pinta: o rodapé precisa da
     data de coleta e o detalhe reaproveita o mesmo arquivo, sem nova busca. */
  const [benchmarks, setBenchmarks] = useState<PanoramaBenchmarks | null>(null);
  const [benchmarksFailed, setBenchmarksFailed] = useState(false);

  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBenchmarksFailed(false);
      loadPanoramaBenchmarks(locale, controller.signal)
        .then((result) => setBenchmarks(result))
        .catch(() => {
          /* Sem benchmarks, o painel de detalhe só omite as notas; a régua
             continua de pé. */
          setBenchmarksFailed(true);
        });
    }, 1_200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [data, locale]);

  // ─── Filtros ───
  const [filters, setFilters] = useState<TimelineFilters>({ ecosystem: "", company: "", query: "" });
  const setFilter = (patch: Partial<TimelineFilters>, label: string) => {
    setFilters((current) => ({ ...current, ...patch }));
    if (label) trackEvent(english ? "panorama_filter_en" : "panorama_filter", { event_category: "filter", event_label: label });
  };
  /* Aba de filtros do celular: os chips ocupavam a primeira tela inteira em
     375px. A busca fica visível; o resto mora numa folha inferior. */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const activeFilterCount = (filters.ecosystem ? 1 : 0) + (filters.company ? 1 : 0);
  const hasActiveFilters = Boolean(filters.ecosystem || filters.company || filters.query.trim());

  // ─── Itens e trilhas ───
  const items = useMemo(() => {
    if (!data) return [] as TimelineItem[];
    const visible = expanded ? data.launches : data.launches.filter((launch) => launch.level === 1);
    const curatedItems = visible.map((launch) => launchToItem(launch, data.config));
    if (!expanded || !catalog) return curatedItems;
    const extra = catalogWithoutCurated(catalog, data.launches, data.config).map((model) => catalogToItem(model, data.config));
    return [...curatedItems, ...extra];
  }, [data, expanded, catalog]);

  const filtered = useMemo(() => filterTimelineItems(items, filters), [items, filters]);
  const options = useMemo(() => filterOptions(items), [items]);
  const groups = useMemo(() => buildTimelineGroups(filtered, {
    other: english ? "Other" : "Outros",
    countries: english ? {
      "Estados Unidos": "United States",
      "Canadá": "Canada",
      "China": "China",
      "Japão": "Japan",
      "França": "France",
      "Coreia do Sul": "South Korea",
      "Israel": "Israel",
      "Índia": "India",
      "Emirados Árabes": "United Arab Emirates",
      "Suíça": "Switzerland",
      "Espanha": "Spain",
    } : undefined,
    /* A ampliada preserva as empresas já nomeadas e promove a cauda com
       >= 3 modelos, inclusive sem identidade visual cadastrada. */
  }, { minCompanyTrack: expanded ? MIN_COMPANY_TRACK : 1, population: items }), [filtered, items, english, expanded]);

  const novelties = useMemo(() => recentMilestones(filtered, 5), [filtered]);
  const months = useMemo(() => groupedByMonth(filtered, (year, monthIndex) => monthLabel(year, monthIndex, english)), [filtered, english]);

  // ─── "Hoje" e o alcance do eixo ───
  const today = useMemo(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return { iso, days: daysSinceEpoch(iso) };
  }, []);
  const maxDays = useMemo(() => {
    /* +60 de folga à direita, como no Panorama: o último lançamento não pode
       encostar na margem, e o "hoje" também precisa caber no eixo. */
    const last = items.length ? items.reduce((top, item) => Math.max(top, item.days), 0) : 0;
    return Math.max(last, today.days) + 60;
  }, [items, today.days]);

  // ─── Zoom e largura do contêiner ───
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pxPerDay, setPxPerDay] = useState(1.5);
  /* Enquanto a escala for automática, ela se recalcula quando os dados ou a
     janela mudam; qualquer ação de zoom do usuário assume o controle. */
  const [autoFit, setAutoFit] = useState(true);
  /* Escala de referência para o rótulo em porcentagem: "px/dia" é técnico
     demais para o público; o leitor pensa em "quanto mais largo que o
     encaixe". */
  const fitScale = useMemo(
    () => fitPxPerDay(containerWidth || 1_000, PAD_L, PAD_R, maxDays),
    [containerWidth, maxDays],
  );

  useEffect(() => {
    const area = scrollRef.current;
    if (!area) return;
    const observer = new ResizeObserver(() => setContainerWidth(area.clientWidth));
    observer.observe(area);
    setContainerWidth(area.clientWidth);
    return () => observer.disconnect();
  }, [isDesktop, loading, error]);

  useEffect(() => {
    if (!autoFit || !isDesktop || !containerWidth) return;
    setPxPerDay(fitPxPerDay(containerWidth, PAD_L, PAD_R, maxDays));
  }, [autoFit, isDesktop, containerWidth, maxDays]);

  const zoomPercent = Math.round((pxPerDay / fitScale) * 100);
  const zoomBy = (direction: number) => {
    setAutoFit(false);
    setPxPerDay((current) => clampPxPerDay(current + direction * ZOOM.step));
    trackEvent(english ? "panorama_zoom_en" : "panorama_zoom", { event_category: "timeline", event_label: direction > 0 ? "in" : "out" });
  };
  const zoomFit = () => {
    setAutoFit(true);
    trackEvent(english ? "panorama_zoom_en" : "panorama_zoom", { event_category: "timeline", event_label: "fit" });
  };

  // ─── Layout das trilhas (computador) ───
  const layout = useMemo(() => {
    const maxLanes = expanded ? MAX_LANES_EXPANDED : MAX_LANES;
    return groups.map((group) => {
      const tracks: TrackLayout[] = group.tracks.map((track) => {
        const placed = stackPills(track.items, pxPerDay, PAD_L, maxLanes);
        return { track, placed, height: trackHeight(placed, MIN_TRACK_H) };
      });
      return { group, tracks, height: GROUP_TITLE_H + tracks.reduce((sum, entry) => sum + entry.height, 0) + 16 };
    });
  }, [groups, pxPerDay, expanded]);

  const svgWidth = PAD_L + Math.ceil(maxDays * pxPerDay) + PAD_R;
  const svgHeight = HEADER_H + layout.reduce((sum, entry) => sum + entry.height + GROUP_GAP, 0) + 32;

  const yearTicks = useMemo(() => {
    const firstYear = Number(PANORAMA_EPOCH.slice(0, 4));
    const ticks: Array<{ year: number; days: number }> = [];
    const endYear = new Date(Date.UTC(firstYear, 0, 1) + maxDays * 86_400_000).getUTCFullYear() + 1;
    for (let year = firstYear; year <= endYear; year += 1) {
      const days = daysSinceEpoch(`${year}-01-01`);
      if (days >= 0 && days <= maxDays) ticks.push({ year, days });
    }
    return ticks;
  }, [maxDays]);

  const quarterTicks = useMemo(() => {
    const ticks: number[] = [];
    for (const { days: yearDays } of yearTicks) {
      for (let quarter = 1; quarter <= 3; quarter += 1) {
        const date = new Date(Date.UTC(Number(PANORAMA_EPOCH.slice(0, 4)), 0, 1) + (yearDays + quarter * 92) * 86_400_000);
        const days = daysSinceEpoch(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`);
        if (days > 0 && days <= maxDays) ticks.push(days);
      }
    }
    return ticks;
  }, [yearTicks, maxDays]);

  // ─── Arrastar para rolar na horizontal (computador) ───
  useEffect(() => {
    const area = scrollRef.current;
    if (!area || !isDesktop) return;
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if ((event.target as Element).closest("button, a, input, select, [role='button']")) return;
      dragging = true;
      startX = event.clientX;
      startLeft = area.scrollLeft;
      area.classList.add("panorama-scroll--dragging");
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      /* Só a horizontal: na vertical quem rola é a página. */
      area.scrollLeft = startLeft - (event.clientX - startX);
    };
    const onUp = () => {
      dragging = false;
      area.classList.remove("panorama-scroll--dragging");
    };
    area.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      area.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDesktop, loading, error]);

  // ─── Detalhe do lançamento ───
  const [detail, setDetail] = useState<DetailState | null>(null);
  const closeDetail = () => {
    const source = detail?.source;
    setDetail(null);
    /* Devolve o foco para a pílula/cartão que abriu o painel. */
    source?.focus();
  };
  const openDetail = (item: TimelineItem, source: HTMLElement | SVGElement) => {
    setDetail({ item, source, rect: source.getBoundingClientRect() });
    trackEvent(english ? "panorama_open_detail_en" : "panorama_open_detail", {
      event_category: "timeline",
      event_label: `${item.company}:${item.model}`,
    });
  };

  const [pendingLink, setPendingLink] = useState<PanoramaLaunch | null>(null);
  const [linkMissing, setLinkMissing] = useState(false);
  useEffect(() => {
    if (!data) return;
    const request = parseRulerDeepLink(hash);
    setDetail(null);
    setLinkMissing(false);
    setPendingLink(null);
    if (!request) return;
    const target = request.model ? launchForModel(request.model, request.company, data.launches, data.config, request.date) : null;
    const company = canonicalCompany(request.company, data.config);
    setFilters({ ecosystem: "", query: "", company: target ? "" : company });
    if (request.model && !target) setLinkMissing(true);
    if (target?.level === 2) setExpanded(true);
    if (!request.model && company && !data.launches.some((launch) => launch.level === 1 && canonicalCompany(launch.company, data.config) === company)) setExpanded(true);
    setPendingLink(target);
  }, [data, hash]);

  useEffect(() => {
    if (!pendingLink || loading || error || !data) return;
    const id = launchToItem(pendingLink, data.config).id;
    const item = filtered.find((entry) => entry.id === id);
    if (!item) return;
    // Espera a renderização dos filtros e abre o ano recolhido antes de
    // medir a âncora. O detalhe nasce junto da pílula/cartão real, inclusive
    // quando o deep-link foi aberto diretamente ou pelo histórico.
    const frame = window.requestAnimationFrame(() => {
      const source = [...(rootRef.current?.querySelectorAll<HTMLElement | SVGElement>("[data-panorama-launch]") || [])]
        .find((element) => element.dataset.panoramaLaunch === id);
      if (!source) return;
      const year = source.closest("details");
      if (year) year.open = true;
      source.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
      source.focus({ preventScroll: true });
      setDetail({ item, source, rect: source.getBoundingClientRect() });
      setPendingLink(null);
      trackEvent(english ? "panorama_deep_link_en" : "panorama_deep_link", { event_category: "timeline", event_label: item.model });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingLink, filtered, data, isDesktop, english, loading, error]);

  // ─── Exportações ───
  const exportCsv = () => {
    const labels: TimelineCsvLabels = {
      headers: english
        ? ["Date", "Company", "Model", "Impact", "Reference", "Level"]
        : ["Data", "Empresa", "Modelo", "Impacto", "Referência", "Nível"],
      levels: english
        ? { 1: "milestone", 2: "secondary", 3: "catalog" }
        : { 1: "marco", 2: "secundário", 3: "catálogo" },
    };
    const stamp = new Date().toISOString().slice(0, 10);
    /* BOM UTF-8 para o Excel reconhecer acentos (mesma razão do Panorama). */
    downloadBlob(`\uFEFF${timelineCsv(filtered, labels)}`, `panorama-ufg-ia-${stamp}.csv`, "text/csv;charset=utf-8");
    trackEvent(english ? "panorama_export_en" : "panorama_export", { event_category: "download", event_label: "csv" });
  };
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = "text { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }";
    clone.insertBefore(style, clone.firstChild);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(xml, `panorama-ufg-ia-${stamp}.svg`, "image/svg+xml;charset=utf-8");
    trackEvent(english ? "panorama_export_en" : "panorama_export", { event_category: "download", event_label: "svg" });
  };

  if (loading) {
    return <div className="panorama-state" role="status" aria-live="polite"><LoaderCircle className="spinning" size={24} aria-hidden="true" /> {t.loading}</div>;
  }
  if (error) {
    return (
      <div className="panorama-state panorama-state--error" role="alert">
        <RefreshCw size={22} aria-hidden="true" />
        <p>{error}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button>
      </div>
    );
  }
  if (!data) return null;

  const warnings = [...data.warnings, ...(catalogWarning && expanded ? [catalogWarning] : [])];

  return (
    <div className="panorama-timeline" ref={rootRef}>
      {linkMissing && <p className="panorama-warnings" role="status">{english ? "This release is no longer available on the timeline." : "Este lançamento não está mais disponível na régua."}</p>}
      {/* Filtros. No computador, chips de ecossistema + as empresas com mais
          lançamentos como chips e a cauda num "Mais empresas". No celular, só a
          busca fica visível; o resto abre numa folha inferior — o primeiro mês
          da lista tem de aparecer na primeira tela. */}
      {isDesktop ? (
        <div className="panorama-filters" aria-label={english ? "Timeline filters" : "Filtros da linha do tempo"}>
          <SearchField filters={filters} onChange={(value) => setFilters((current) => ({ ...current, query: value }))} t={t} />
          <EcosystemChips options={options.ecosystems} selected={filters.ecosystem} english={english} onSelect={(value) => setFilter({ ecosystem: value }, `ecosystem:${value || "all"}`)} />
          <CompanyChips options={options.companies} selected={filters.company} english={english} onSelect={(value) => setFilter({ company: value }, `company:${value || "all"}`)} />
        </div>
      ) : (
        <div className="panorama-filters panorama-filters--mobile" aria-label={english ? "Timeline filters" : "Filtros da linha do tempo"}>
          <SearchField filters={filters} onChange={(value) => setFilters((current) => ({ ...current, query: value }))} t={t} />
          <button
            ref={filterButtonRef}
            type="button"
            className="panorama-filter-toggle"
            aria-expanded={mobileFiltersOpen}
            onClick={() => {
              setMobileFiltersOpen(true);
              trackEvent(english ? "panorama_open_filters_en" : "panorama_open_filters", { event_category: "filter", event_label: "sheet" });
            }}
          >
            <Filter size={15} aria-hidden="true" /> {t.filters}{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      )}

      <div className="panorama-toolbar">
        <button
          type="button"
          className={`panorama-toggle${expanded ? " is-active" : ""}`}
          aria-pressed={expanded}
          title={t.expandedHint}
          onClick={() => {
            setExpanded((value) => !value);
            trackEvent(english ? "panorama_toggle_expanded_en" : "panorama_toggle_expanded", {
              event_category: "timeline",
              event_label: expanded ? "off" : "on",
            });
          }}
        >
          {t.expanded}
        </button>
        {isDesktop && (
          <div className="panorama-zoom" role="group" aria-label={t.zoom}>
            <button type="button" onClick={() => zoomBy(-1)} aria-label={t.zoomOut}><Minus size={15} aria-hidden="true" /></button>
            <span className="panorama-zoom-value" aria-hidden="true">{t.zoom} {zoomPercent}%</span>
            <button type="button" onClick={() => zoomBy(1)} aria-label={t.zoomIn}><Plus size={15} aria-hidden="true" /></button>
            <button type="button" className="panorama-zoom-fit" onClick={zoomFit}><Maximize2 size={14} aria-hidden="true" /> {t.zoomFit}</button>
          </div>
        )}
        <div className="panorama-export" role="group" aria-label={english ? "Export" : "Exportar"}>
          <button type="button" onClick={exportCsv}><FileDown size={15} aria-hidden="true" /> {t.exportCsv}</button>
          {isDesktop && <button type="button" onClick={exportSvg}><Download size={15} aria-hidden="true" /> {t.exportSvg}</button>}
        </div>
      </div>

      {warnings.length > 0 && <p className="panorama-warnings">{warnings.join(" · ")}</p>}

      {/* Novidades: os 5 marcos mais recentes; clicar abre o detalhe. */}
      {novelties.length > 0 && (
        <div className="panorama-news" aria-label={t.news}>
          <p className="panorama-news-title"><CalendarDays size={15} aria-hidden="true" /> {t.news}</p>
          <div className="panorama-news-items">
            {novelties.map((item) => (
              <button type="button" key={item.id} className="panorama-news-item" onClick={(event) => openDetail(item, event.currentTarget)}>
                <span className="panorama-swatch" style={{ background: item.color }} aria-hidden="true">{item.company.slice(0, 1)}</span>
                <span className="panorama-news-model">{item.model}</span>
                <span className="panorama-news-meta">{item.company} · {formatDay(item.date, english)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <p className="panorama-legend">
          <span className="panorama-legend-pill" aria-hidden="true" /> {t.legendCurated}
          <span className="panorama-legend-pill panorama-legend-pill--dashed" aria-hidden="true" /> {t.legendDashed}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="panorama-state panorama-state--empty" role="status">
          <Search size={26} aria-hidden="true" />
          <p>{t.empty}</p>
        </div>
      ) : isDesktop ? (
        <DesktopRuler
          layout={layout}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          pxPerDay={pxPerDay}
          yearTicks={yearTicks}
          quarterTicks={quarterTicks}
          todayDays={today.days}
          headerOffset={headerOffset}
          texts={{ today: t.today, marcoZero: t.marcoZero, summary: t.summary, releases: t.releases }}
          english={english}
          legend={expanded ? { curated: t.legendCurated, dashed: t.legendDashed } : null}
          scrollRef={scrollRef}
          svgRef={svgRef}
          onOpen={openDetail}
        />
      ) : (
        <MobileList
          months={months}
          currentYear={today.iso.slice(0, 4)}
          hasActiveFilters={hasActiveFilters}
          english={english}
          t={t}
          onOpen={openDetail}
        />
      )}

      <footer className="panorama-provenance">
        <span>{t.provenance}{benchmarks ? ` · ${t.benchmarksCollected(formatDay(benchmarks.fetchedAt.slice(0, 10), english))}` : ""}</span>
        <a
          href={english ? `${PANORAMA_SITE}en/` : PANORAMA_SITE}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent(english ? "open_panorama_original_en" : "open_panorama_original", {
            event_category: "outbound",
            event_label: english ? "panorama-en" : "panorama",
          })}
        >
          {t.openOriginal} <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </footer>

      {detail && (isDesktop
        ? <DetailPopover detail={detail} benchmarks={benchmarks} benchmarksPending={!benchmarks && !benchmarksFailed} config={data.config} english={english} headerOffset={headerOffset} onClose={closeDetail} />
        : <DetailSheet detail={detail} benchmarks={benchmarks} benchmarksPending={!benchmarks && !benchmarksFailed} config={data.config} english={english} onClose={closeDetail} />)}

      {!isDesktop && mobileFiltersOpen && (
        <FilterSheet
          options={options}
          filters={filters}
          english={english}
          onSelect={(patch, label) => setFilter(patch, label)}
          onClose={() => {
            setMobileFiltersOpen(false);
            filterButtonRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

/* ─── Filtros ─── */

function SearchField({ filters, onChange, t }: { filters: TimelineFilters; onChange: (value: string) => void; t: Texts }) {
  return (
    <label className="panorama-search">
      <Search size={17} aria-hidden="true" />
      <span className="sr-only">{t.searchLabel}</span>
      <input
        type="search"
        value={filters.query}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t.searchPlaceholder}
      />
    </label>
  );
}

function EcosystemChips({ options, selected, english, onSelect }: {
  options: Array<{ name: TimelineEcosystem; count: number }>;
  selected: string;
  english: boolean;
  onSelect: (value: string) => void;
}) {
  const t = texts(english);
  return (
    <div className="panorama-chip-row" role="group" aria-label={t.filterEcosystem}>
      <button type="button" className={`panorama-chip${!selected ? " is-active" : ""}`} aria-pressed={!selected} onClick={() => onSelect("")}>{t.allEcosystems}</button>
      {options.filter((option) => option.count).map((option) => (
        <button
          type="button"
          key={option.name}
          className={`panorama-chip${selected === option.name ? " is-active" : ""}`}
          aria-pressed={selected === option.name}
          onClick={() => onSelect(selected === option.name ? "" : option.name)}
        >
          {ecosystemLabel(option.name, english)} <span>{option.count}</span>
        </button>
      ))}
    </div>
  );
}

/* Empresas: os chips mostram as que têm mais lançamentos; a cauda longa (26
   na régua padrão, 66 na ampliada) vive num "Mais empresas" pesquisável —
   um select simples e acessível. A empresa escolhida aparece sempre como
   chip, mesmo quando veio do select. */
function CompanyChips({ options, selected, english, onSelect }: {
  options: Array<{ name: string; count: number }>;
  selected: string;
  english: boolean;
  onSelect: (value: string) => void;
}) {
  const t = texts(english);
  const top = options.slice(0, COMPANY_CHIPS);
  const rest = options.slice(COMPANY_CHIPS);
  const selectedOption = options.find((option) => option.name === selected);
  const chips = selectedOption && !top.some((option) => option.name === selected)
    ? [...top, selectedOption]
    : top;
  return (
    <div className="panorama-chip-row panorama-chip-row--companies" role="group" aria-label={t.filterCompany}>
      <button type="button" className={`panorama-chip${!selected ? " is-active" : ""}`} aria-pressed={!selected} onClick={() => onSelect("")}>{t.allCompanies}</button>
      {chips.map((option) => (
        <button
          type="button"
          key={option.name}
          className={`panorama-chip${selected === option.name ? " is-active" : ""}`}
          aria-pressed={selected === option.name}
          onClick={() => onSelect(selected === option.name ? "" : option.name)}
        >
          {option.name} <span>{option.count}</span>
        </button>
      ))}
      {rest.length > 0 && (
        <label className="panorama-more-companies">
          <span className="sr-only">{t.moreCompanies}</span>
          <select
            value={rest.some((option) => option.name === selected) ? selected : ""}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">{t.moreCompanies} ({rest.length})</option>
            {rest.map((option) => <option key={option.name} value={option.name}>{option.name} ({option.count})</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
      )}
    </div>
  );
}

/* Folha inferior de filtros do celular: os mesmos chips do computador, numa
   folha que fecha com Esc/X e devolve o foco ao botão que a abriu. */
function FilterSheet({ options, filters, english, onSelect, onClose }: {
  options: ReturnType<typeof filterOptions>;
  filters: TimelineFilters;
  english: boolean;
  onSelect: (patch: Partial<TimelineFilters>, label: string) => void;
  onClose: () => void;
}) {
  const t = texts(english);
  return (
    <Sheet label={t.filters} onClose={onClose}>
      <header className="panorama-sheet-header">
        <h2>{t.filters}{(filters.ecosystem || filters.company) ? ` (${(filters.ecosystem ? 1 : 0) + (filters.company ? 1 : 0)})` : ""}</h2>
        <button type="button" className="panorama-detail-close" onClick={onClose} aria-label={t.close} autoFocus>
          <X size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="panorama-filters-sheet-body">
        <EcosystemChips options={options.ecosystems} selected={filters.ecosystem} english={english} onSelect={(value) => onSelect({ ecosystem: value }, `ecosystem:${value || "all"}`)} />
        <CompanyChips options={options.companies} selected={filters.company} english={english} onSelect={(value) => onSelect({ company: value }, `company:${value || "all"}`)} />
        {(filters.ecosystem || filters.company) && (
          <button type="button" className="panorama-clear-filters" onClick={() => { onSelect({ ecosystem: "", company: "" }, "clear"); }}>
            <X size={14} aria-hidden="true" /> {t.clearFilters}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Lista de celular: anos recolhíveis ─── */

type MobileListProps = {
  months: TimelineMonthGroup[];
  currentYear: string;
  hasActiveFilters: boolean;
  english: boolean;
  t: Texts;
  onOpen: (item: TimelineItem, source: HTMLElement | SVGElement) => void;
};

/* 168 cartões esticam a página em 16 mil pixels (153 mil na ampliada). O ano
   corrente abre; os anteriores vêm como <details> recolhidos com a contagem
   no resumo. Busca ou filtro ativo abre os anos que têm resultado — quem
   procura acha sem clicar em cada ano. A escolha manual do leitor é
   respeitada: onToggle só registra quando o estado difere do esperado. */
function MobileList({ months, currentYear, hasActiveFilters, english, t, onOpen }: MobileListProps) {
  const years = useMemo(() => {
    const list: Array<{ year: string; months: TimelineMonthGroup[]; count: number }> = [];
    for (const month of months) {
      const year = month.key.slice(0, 4);
      const last = list[list.length - 1];
      if (last?.year === year) last.months.push(month);
      else list.push({ year, months: [month], count: 0 });
    }
    for (const entry of list) entry.count = entry.months.reduce((sum, month) => sum + month.items.length, 0);
    return list;
  }, [months]);
  const [manualYears, setManualYears] = useState<Record<string, boolean>>({});

  return (
    <div className="panorama-months">
      <p className="panorama-months-intro">{t.mobileIntro}</p>
      {years.map(({ year, months: yearMonths, count }) => {
        const open = hasActiveFilters ? true : manualYears[year] ?? year === currentYear;
        return (
          <details
            key={year}
            className="panorama-year"
            open={open}
            onToggle={(event) => {
              if (event.currentTarget.open !== open) setManualYears((current) => ({ ...current, [year]: event.currentTarget.open }));
            }}
          >
            <summary>
              <CalendarDays size={15} aria-hidden="true" />
              <strong>{t.yearSummary(year, count)}</strong>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            {yearMonths.map((month) => (
              <section className="panorama-month" key={month.key} aria-labelledby={`panorama-month-${month.key}`}>
                <h3 id={`panorama-month-${month.key}`}>{month.label}</h3>
                <ul>
                  {month.items.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="panorama-card" data-panorama-launch={item.id} onClick={(event) => onOpen(item, event.currentTarget)}>
                        <span className={`panorama-swatch panorama-card-logo${item.level === 1 ? "" : " is-compact"}`} style={{ background: item.color }} aria-hidden="true">{item.company.slice(0, 1)}</span>
                        <span className="panorama-card-body">
                          <span className="panorama-card-model">
                            {item.model}
                            {item.level !== 1 && <em> · {item.level === 2 ? (english ? "secondary" : "secundário") : (english ? "catalog" : "catálogo")}</em>}
                          </span>
                          <span className="panorama-card-meta">{item.company} · {formatDay(item.date, english)} · {ecosystemLabel(item.ecosystem, english)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </details>
        );
      })}
    </div>
  );
}

/* ─── Régua de computador (SVG em swimlanes) ─── */

type RulerTexts = { today: string; marcoZero: string; summary: string; releases: (count: number) => string };

type DesktopRulerProps = {
  layout: GroupLayout[];
  svgWidth: number;
  svgHeight: number;
  pxPerDay: number;
  yearTicks: Array<{ year: number; days: number }>;
  quarterTicks: number[];
  todayDays: number;
  headerOffset: number;
  texts: RulerTexts;
  english: boolean;
  legend: { curated: string; dashed: string } | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onOpen: (item: TimelineItem, source: HTMLElement | SVGElement) => void;
};

/* Selo de ano + marcador de hoje, desenhado duas vezes com as MESMAS
   coordenadas: no eixo fixo (o que o leitor vê ao rolar) e na faixa de
   cabeçalho do SVG principal (o que a exportação SVG leva). O eixo cobre a
   faixa do SVG em repouso (margin negativo), então em tela não há
   duplicação visível. */
function YearPills({ width, yearTicks, todayDays, pxPerDay, texts }: {
  width: number;
  yearTicks: Array<{ year: number; days: number }>;
  todayDays: number;
  pxPerDay: number;
  texts: RulerTexts;
}) {
  const todayX = PAD_L + Math.round(todayDays * pxPerDay);
  return (
    <>
      {yearTicks.map((tick) => (
        <g key={tick.year} transform={`translate(${PAD_L + Math.round(tick.days * pxPerDay)}, 30)`}>
          <rect x="-24" y="-14" width="48" height="22" rx="11" fill="#eef2ef" />
          <text textAnchor="middle" fontSize="13" fontWeight="700" fill="#17231f" letterSpacing="-0.3">{tick.year}</text>
        </g>
      ))}
      {todayDays >= 0 && (
        <g>
          <line x1={todayX} y1="6" x2={todayX} y2={HEADER_H} stroke="#1d6650" strokeWidth="1" strokeDasharray="2,4" opacity="0.55" />
          <circle cx={todayX} cy="12" r="3" fill="#1d6650" />
          <text x={todayX + 6} y="15" fontSize="10" fontWeight="700" fill="#1d6650">{texts.today}</text>
        </g>
      )}
      <line x1="0" y1={HEADER_H - 0.5} x2={width} y2={HEADER_H - 0.5} stroke="#17231f" strokeWidth="1" />
    </>
  );
}

function DesktopRuler({
  layout, svgWidth, svgHeight, pxPerDay, yearTicks, quarterTicks, todayDays,
  headerOffset, texts, english, legend, scrollRef, svgRef, onOpen,
}: DesktopRulerProps) {
  const axisRef = useRef<HTMLDivElement>(null);
  const xOf = (days: number) => PAD_L + Math.round(days * pxPerDay);
  const todayX = xOf(todayDays);

  /* O eixo de anos é um elemento próprio, sticky na PÁGINA (logo abaixo do
     cabeçalho fixo do site), com o scrollLeft espelhado no da régua: perder
     o eixo ao rolar é perder a legenda. A sincronização roda também depois
     de mudanças de zoom, quando o navegador recalcula os limites. */
  useEffect(() => {
    const area = scrollRef.current;
    const axis = axisRef.current;
    if (!area || !axis) return;
    const sync = () => {
      axis.scrollLeft = area.scrollLeft;
    };
    sync();
    area.addEventListener("scroll", sync, { passive: true });
    return () => area.removeEventListener("scroll", sync);
  }, [scrollRef, svgWidth, pxPerDay]);

  /* Um único percurso pelas faixas produz fundos, grade, rótulos e conteúdo
     com as mesmas coordenadas — percurso duplicado era convite para
     dessincronia. Os títulos de grupo moram na área rolável (como no
     Panorama); só os rótulos de trilha têm coluna fixa. */
  const { backgrounds, grid, labels, content }: {
    backgrounds: ReactNode[];
    grid: ReactNode[];
    labels: ReactNode[];
    content: ReactNode[];
  } = (() => {
    const backgrounds: ReactNode[] = [];
    const grid: ReactNode[] = [];
    const labels: ReactNode[] = [];
    const content: ReactNode[] = [];
    let groupTop = HEADER_H;

    for (const entry of layout) {
      const style = GROUP_STYLE[entry.group.ecosystem];
      backgrounds.push(<rect key={entry.group.ecosystem} x="0" y={groupTop} width={svgWidth} height={entry.height} fill={style.bg} opacity="0.75" />);

      content.push(
        <g key={`title:${entry.group.ecosystem}`}>
          <rect x={PAD_L + 20} y={groupTop + 14} width="44" height="3" rx="1.5" fill={style.accent} />
          <text x={PAD_L + 20} y={groupTop + 38} fontSize="16" fontWeight="800" fill="#17231f" letterSpacing="0.4">{ecosystemLabel(entry.group.ecosystem, english)}</text>
          <line x1="0" y1={groupTop + GROUP_TITLE_H - 8} x2={svgWidth} y2={groupTop + GROUP_TITLE_H - 8} stroke={style.accent} strokeWidth="0.75" opacity="0.3" />
        </g>,
      );

      let trackTop = groupTop + GROUP_TITLE_H;
      entry.tracks.forEach((trackLayout, trackIndex) => {
        const axisY = trackTop + trackLayout.height / 2;
        const trackColor = trackLayout.placed[0]?.item.color || "#a5a297";
        labels.push(
          <div key={`label:${trackLayout.track.key}`} className="panorama-label" style={{ top: axisY }}>
            <strong>{trackLayout.track.label}</strong>
            <span> ({trackLayout.track.items.length})</span>
          </div>,
        );
        content.push(
          <g key={`track:${entry.group.ecosystem}:${trackLayout.track.key}`}>
            {trackIndex % 2 === 1 && <rect x="0" y={trackTop - 4} width={svgWidth} height={trackLayout.height + 8} fill={style.accent} opacity="0.05" />}
            <line x1={PAD_L - 20} y1={axisY} x2={svgWidth - 20} y2={axisY} stroke={trackColor} opacity="0.25" strokeWidth="1.25" />
            <text x={PAD_L - 28} y={axisY + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="#17231f">
              {trackLayout.track.label}
              <tspan fontWeight="500" fill="#8a958f" fontSize="10"> ({trackLayout.track.items.length})</tspan>
            </text>
            {trackLayout.placed.map((placed) => (
              <PillGraphic key={placed.item.id} placed={placed} axisY={axisY} english={english} onOpen={onOpen} />
            ))}
          </g>,
        );
        trackTop += trackLayout.height;
      });
      groupTop += entry.height + GROUP_GAP;
    }

    /* Legenda dentro do SVG, de propósito: quem exporta a figura leva a
       distinção curado × automático junto (regra da régua ampliada). */
    if (legend) {
      content.push(
        <g key="legend" fontSize="9.5" fill="#61706a">
          <rect x="20" y={svgHeight - 40} width="15" height="9" rx="4.5" fill="#fff" stroke="#17231f" strokeWidth="1" />
          <text x="41" y={svgHeight - 32.5} fontWeight="600">{legend.curated}</text>
          <rect x="20" y={svgHeight - 24} width="15" height="9" rx="4.5" fill="#fff" stroke="#17231f" strokeWidth="1" strokeDasharray="3,2.5" />
          <text x="41" y={svgHeight - 16.5}>{legend.dashed}</text>
        </g>,
      );
    }

    /* Grade e a faixa de anos do próprio SVG (cópia da do eixo, para a
       exportação sair completa). */
    grid.push(
      <g key="grid" aria-hidden="true">
        {yearTicks.map((tick) => (
          <line key={tick.year} x1={xOf(tick.days)} y1={HEADER_H} x2={xOf(tick.days)} y2={svgHeight - 30} stroke="#d7dfdb" strokeWidth="1" />
        ))}
        {quarterTicks.map((days, index) => (
          <line key={index} x1={xOf(days)} y1={HEADER_H} x2={xOf(days)} y2={svgHeight - 30} stroke="#e6ebe7" strokeWidth="1" strokeDasharray="2,6" />
        ))}
        <line x1={todayX} y1="6" x2={todayX} y2={svgHeight - 30} stroke="#1d6650" strokeWidth="1.25" strokeDasharray="3,4" opacity="0.55" />
        <line x1={PAD_L} y1="6" x2={PAD_L} y2={svgHeight - 30} stroke="#10a37f" strokeWidth="1" strokeDasharray="2,5" opacity="0.5" />
        <text x={PAD_L - 12} y="33" textAnchor="end" fontSize="10" fontWeight="800" fill="#61706a" letterSpacing="0.03em">{texts.marcoZero}</text>
      </g>,
    );
    grid.push(<YearPills key="pills" width={svgWidth} yearTicks={yearTicks} todayDays={todayDays} pxPerDay={pxPerDay} texts={texts} />);
    return { backgrounds, grid, labels, content };
  })();

  return (
    <div className="panorama-stage">
      {/* Sumário estrutural só para leitor de tela: os títulos de grupo são
          <text> no SVG, invisíveis para a árvore de acessibilidade. */}
      <div className="sr-only">
        <h2>{texts.summary}</h2>
        {layout.map((entry) => {
          const total = entry.tracks.reduce((sum, track) => sum + track.track.items.length, 0);
          return (
            <div key={entry.group.ecosystem}>
              <h3>{ecosystemLabel(entry.group.ecosystem, english)} — {total} {texts.releases(total)}</h3>
              <ul>
                {entry.tracks.map((track) => (
                  <li key={track.track.key}>{track.track.label}: {track.track.items.length} {texts.releases(track.track.items.length)}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="panorama-axis" ref={axisRef} style={{ top: headerOffset }} aria-hidden="true">
        <svg width={svgWidth} height={HEADER_H} viewBox={`0 0 ${svgWidth} ${HEADER_H}`} focusable="false">
          <rect width="100%" height="100%" fill="#fff" />
          <YearPills width={svgWidth} yearTicks={yearTicks} todayDays={todayDays} pxPerDay={pxPerDay} texts={texts} />
        </svg>
      </div>
      {/* O contêiner rola só na horizontal; a régua estica a página na
          vertical. A coluna de rótulos gruda na esquerda (sticky left) com
          fundo opaco: os rótulos desenhados no SVG deslizam por trás dela. */}
      <div className="panorama-scroll" ref={scrollRef} tabIndex={-1}>
        <div className="panorama-labels" style={{ height: svgHeight, marginBottom: -svgHeight }} aria-hidden="true">
          {labels}
        </div>
        <svg
          ref={svgRef}
          className="panorama-svg"
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="group"
          aria-label={english ? "Timeline of generative AI model releases" : "Linha do tempo dos lançamentos de modelos de IA generativa"}
        >
          <rect width="100%" height="100%" fill="#fff" />
          {backgrounds}
          {grid}
          {content}
        </svg>
      </div>
    </div>
  );
}

/* Pílula de computador: cheia (nível 1, com logo e data) ou compacta tracejada
   (níveis 2 e 3 — o tracejado é a marca visual de "não passou pela curadoria
   de marco", não decoração). */
function PillGraphic({ placed, axisY, english, onOpen }: {
  placed: PlacedPill;
  axisY: number;
  english: boolean;
  onOpen: (item: TimelineItem, source: HTMLElement | SVGElement) => void;
}) {
  const { item, x, width, lane, laneOffset } = placed;
  const spec = pillSpec(item.level);
  const isMarco = item.level === 1;
  const y = axisY - spec.h / 2 + laneOffset;
  const cy = y + spec.h / 2;
  const iconCx = x + spec.iconR + 2;
  const hitPad = isMarco ? 4 : 8;
  const levelSuffix = item.level === 2
    ? (english ? " (secondary release)" : " (lançamento secundário)")
    : item.level === 3 ? (english ? " (Artificial Analysis catalog)" : " (catálogo Artificial Analysis)") : "";
  const ariaLabel = `${item.model} — ${item.company}, ${formatDay(item.date, english)}${levelSuffix}`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`panorama-pill${isMarco ? "" : " panorama-pill--compact"}`}
      data-panorama-launch={item.id}
      onClick={(event) => onOpen(item, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item, event.currentTarget);
        }
      }}
    >
      {/* Área de toque invisível: pílula de 20px está abaixo do alvo mínimo. */}
      <rect x={x - 2} y={y - hitPad} width={width + 4} height={spec.h + hitPad * 2} fill="transparent" />
      <circle cx={iconCx} cy={axisY} r={isMarco ? 2.5 : 1.8} fill={item.color} opacity="0.55" />
      {lane !== 0 && (
        <line x1={iconCx} y1={axisY} x2={iconCx} y2={cy + (laneOffset > 0 ? -spec.h / 2 : spec.h / 2)} stroke={item.color} strokeWidth={isMarco ? 1.25 : 1} opacity={isMarco ? 0.4 : 0.28} strokeDasharray="2,2" />
      )}
      {isMarco ? (
        <>
          <rect x={x} y={y} width={width} height={spec.h} rx={spec.r} fill="#fff" />
          <rect x={x} y={y} width={width} height={spec.h} rx={spec.r} fill={item.color} opacity="0.09" stroke={item.color} strokeWidth="1.25" />
          <circle cx={iconCx} cy={cy} r={spec.iconR} fill={item.color} />
          {item.logoPath
            ? <g transform={`translate(${iconCx - 11}, ${cy - 11}) scale(0.9167)`} fill="#fff" dangerouslySetInnerHTML={{ __html: item.logoPath }} />
            : <text x={iconCx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="#fff">{item.company.slice(0, 1)}</text>}
          <text x={x + spec.textPad} y={y + 14} fontSize={spec.font} fontWeight="700" fill="#17231f">{item.model}</text>
          <text x={x + spec.textPad} y={y + 26} fontSize="9.5" fill="#61706a">{formatDay(item.date, english)}</text>
        </>
      ) : (
        <>
          <rect x={x} y={y} width={width} height={spec.h} rx={spec.r} fill="#fff" />
          <rect x={x} y={y} width={width} height={spec.h} rx={spec.r} fill={item.color} fillOpacity="0.06" stroke={item.color} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3,2.5" />
          <circle cx={iconCx} cy={cy} r={spec.iconR} fill={item.color} opacity="0.75" />
          <text x={x + spec.textPad} y={cy + 3.5} fontSize={spec.font} fontWeight="600" fill="#43403a">{item.model}</text>
        </>
      )}
    </g>
  );
}

/* ─── Detalhe do lançamento ─── */

/* Popover ancorado (computador) e folha inferior (celular) compartilham o
   mesmo conteúdo: data, empresa, país, impacto, fonte, nível de curadoria e,
   quando houver, as notas de benchmark da Artificial Analysis. */
function DetailContent({ item, benchmarks, benchmarksPending, config, english, onClose }: {
  item: TimelineItem;
  benchmarks: PanoramaBenchmarks | null;
  benchmarksPending: boolean;
  config: PanoramaConfig;
  english: boolean;
  onClose: () => void;
}) {
  const t = texts(english);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const scores = useMemo(() => {
    if (!benchmarks) return [];
    /* O vínculo régua ↔ benchmark casa por empresa+modelo; o nível só existe
       para o desenho, e o tipo do lançamento curado é 1|2. */
    return benchmarkScoresForLaunch({
      date: item.date,
      company: item.company,
      model: item.model,
      impact: item.impact,
      reference: item.reference,
      level: item.level === 3 ? 2 : item.level,
      sheetGroup: "",
      addedAt: 0,
      updatedAt: 0,
    }, benchmarks, config);
  }, [item, benchmarks, config]);

  return (
    <article className="panorama-detail-body" aria-labelledby="panorama-detail-title">
      <header>
        <h2 id="panorama-detail-title">{item.model}</h2>
        <button ref={closeRef} type="button" className="panorama-detail-close" onClick={onClose} aria-label={t.close}>
          <X size={17} aria-hidden="true" />
        </button>
      </header>
      <p className="panorama-detail-meta">
        <span className="panorama-swatch" style={{ background: item.color }} aria-hidden="true" />
        <strong>{item.company}</strong>
        <span> · {formatDay(item.date, english)}</span>
        {item.country && <span> · {item.country}</span>}
        <span> · {ecosystemLabel(item.ecosystem, english)}</span>
      </p>
      <dl>
        <div><dt>{t.level}</dt><dd>{levelLabel(item.level, t)}</dd></div>
        {item.impact && (
          <div>
            <dt>{english ? "Impact" : "Impacto"}</dt>
            <dd lang={item.untranslated && english ? "pt-BR" : undefined}>
              {item.impact}
              {item.untranslated && english && <small className="panorama-detail-untranslated"> — {t.portugueseDescription}</small>}
            </dd>
          </div>
        )}
        {item.reference && (
          <div><dt>{t.source}</dt><dd><a href={item.reference} target="_blank" rel="noreferrer">{item.reference}</a></dd></div>
        )}
      </dl>
      {benchmarks && scores.length > 0 && (
        <div className="panorama-detail-benchmarks">
          <h3>{t.benchmarks}</h3>
          <ul>
            {scores.map((score) => (
              <li key={`${score.benchmark}:${score.entry.model}`}>
                <span>{score.label}</span>
                <strong>{score.entry.score}</strong>
                <small> · {t.rankOf(score.rank, score.of)}</small>
              </li>
            ))}
          </ul>
          {[...new Set(scores.map((score) => score.entry.model))].map((model) => (
            <p key={model}><a href={guideModelHref(model)} onClick={() => trackEvent(english ? "panorama_open_guide_en" : "panorama_open_guide", { event_category: "guide", event_label: model })}>
              {english ? "Compare in the model guide" : "Comparar no guia de modelos"}: {model} ↗
            </a></p>
          ))}
        </div>
      )}
      {benchmarksPending && item.level <= 2 && (
        <p className="panorama-detail-loading"><LoaderCircle className="spinning" size={14} aria-hidden="true" /> {t.benchmarksLoading}</p>
      )}
    </article>
  );
}

function DetailPopover({ detail, benchmarks, benchmarksPending, config, english, headerOffset, onClose }: {
  detail: DetailState;
  benchmarks: PanoramaBenchmarks | null;
  benchmarksPending: boolean;
  config: PanoramaConfig;
  english: boolean;
  headerOffset: number;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  /* Painel de ~344px: abaixo da pílula quando cabe, senão acima; nunca sob o
     cabeçalho fixo do site nem fora da janela. A altura acompanha o espaço
     que sobrou abaixo da posição escolhida. */
  const width = 344;
  const minTop = headerOffset + 10;
  const left = Math.min(Math.max(detail.rect.left + detail.rect.width / 2 - width / 2, 10), window.innerWidth - width - 10);
  const estimatedHeight = 360;
  let top = detail.rect.bottom + 10;
  if (top + estimatedHeight > window.innerHeight - 10) top = detail.rect.top - estimatedHeight - 10;
  if (top < minTop) top = minTop;
  const maxHeight = Math.max(160, window.innerHeight - top - 10);

  return (
    <div
      ref={panelRef}
      className="panorama-detail panorama-detail--popover"
      style={{ left, top, width, maxHeight }}
      role="dialog"
      aria-label={texts(english).details}
    >
      <DetailContent item={detail.item} benchmarks={benchmarks} benchmarksPending={benchmarksPending} config={config} english={english} onClose={onClose} />
    </div>
  );
}

/* Folha inferior genérica do celular: fundo escurecido, fecha com Esc, X ou
   toque fora. O foco inicial e o retorno ficam a cargo de quem abre. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="panorama-sheet-backdrop" onClick={onClose}>
      <div
        className="panorama-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DetailSheet({ detail, benchmarks, benchmarksPending, config, english, onClose }: {
  detail: DetailState;
  benchmarks: PanoramaBenchmarks | null;
  benchmarksPending: boolean;
  config: PanoramaConfig;
  english: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet label={texts(english).details} onClose={onClose}>
      <DetailContent item={detail.item} benchmarks={benchmarks} benchmarksPending={benchmarksPending} config={config} english={english} onClose={onClose} />
    </Sheet>
  );
}
