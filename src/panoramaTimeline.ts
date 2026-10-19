/* Lógica pura da régua do Panorama dentro do Observatório.

   Nada aqui importa em tempo de execução: os testes transpilam este arquivo
   sozinho (mesma técnica de tests/panorama-data.test.mjs), então os rótulos
   traduzidos chegam por parâmetro e o enriquecimento dos lançamentos (cor,
   país, ecossistema, logo) fica com o componente, que já usa as regras
   testadas de panoramaData.ts. O empilhamento de pílulas e a montagem das
   trilhas seguem `assets/render.js` e `assets/data.js` do Panorama: divergir
   daqui sem divergir de lá faz os dois sites desenharem a mesma régua de
   jeitos diferentes. */

export type TimelineEcosystem = "ECOSSISTEMA NORTE-AMERICANO" | "ECOSSISTEMA CHINÊS" | "OUTROS PAÍSES";

export type TimelineLevel = 1 | 2 | 3;

/* Item já enriquecido, pronto para desenhar: o componente monta a partir dos
   lançamentos da planilha (níveis 1 e 2) e do catálogo da Artificial Analysis
   (nível 3), usando as regras de identidade de panoramaData.ts. */
export type TimelineItem = {
  id: string;
  date: string;
  days: number;
  company: string;
  model: string;
  impact: string;
  reference: string;
  level: TimelineLevel;
  ecosystem: TimelineEcosystem;
  country: string;
  color: string;
  logoPath: string;
  /* Empresa com identidade em COMPANY_COLORS: ganha trilha própria. */
  known: boolean;
  untranslated?: boolean;
  /* Quando a planilha tocou na linha por último (`updatedAt`, em ms). É a data
     de "adição" que alimenta as Últimas adições — não a data do lançamento.
     Ausente ou 0 (catálogo da AA): cai para a data do lançamento. */
  updatedAt?: number;
};

export const ECOSYSTEM_ORDER: TimelineEcosystem[] = [
  "ECOSSISTEMA NORTE-AMERICANO",
  "ECOSSISTEMA CHINÊS",
  "OUTROS PAÍSES",
];

// ─── Geometria das pílulas (portada de assets/render.js) ───

/* A pílula compacta (níveis 2 e 3) perde logo, data e sombra: cabe ~40% mais
   por lane, que é a pressão do modo ampliado. A largura é estimada por
   caractere, com folga, para o colchete de lanes não encostar no vizinho. */
export type PillSpec = { h: number; r: number; iconR: number; textPad: number; charW: number; endPad: number; min: number; font: number };

export const PILL_MARCO: PillSpec = { h: 32, r: 2, iconR: 11, textPad: 32, charW: 8, endPad: 18, min: 128, font: 11.5 };
export const PILL_COMPACTA: PillSpec = { h: 20, r: 2, iconR: 4, textPad: 18, charW: 6.5, endPad: 12, min: 56, font: 10 };

export function pillSpec(level: TimelineLevel): PillSpec {
  return level === 1 ? PILL_MARCO : PILL_COMPACTA;
}

// ─── Selo de empresa: iniciais quando não há logo (regra de assets/render.js) ───

/* Duas empresas têm inicial dupla no original (espaço curto no círculo);
   as demais mostram só a primeira letra. */
export function companyInitials(company: string): string {
  if (company === "DeepSeek") return "DS";
  if (company === "OpenClaw") return "OC";
  return company.slice(0, 1);
}

/* Fonte da inicial dentro do círculo: menor quando são duas letras. */
export function initialsFontSize(initials: string): number {
  return initials.length > 1 ? 9 : 13;
}

export function estimatePillWidth(item: TimelineItem): number {
  const spec = pillSpec(item.level);
  return Math.max(spec.min, Math.round(spec.textPad + item.model.length * spec.charW + spec.endPad));
}

// ─── Empilhamento de pílulas em lanes (portado de computeTrackLayout) ───

export const LANE_STEP = 40;
const PILL_GAP = 10;
const PILL_H = PILL_MARCO.h;

export type PlacedPill = {
  item: TimelineItem;
  x: number;
  width: number;
  lane: number;
  /* Deslocamento em torno do eixo central da trilha: lanes ímpares para cima,
     pares para baixo (render.js faz igual, para o eixo continuar visível). */
  laneOffset: number;
};

/* Distribui as pílulas da trilha em lanes sem sobreposição: cada lane guarda
   onde a última pílula terminou e a próxima só reaproveita a lane se começa
   depois da folga. O antigo teto causava colisões nas empresas densas: uma
   faixa adicional custa altura, mas preserva todos os nomes legíveis. */
export function stackPills(items: TimelineItem[], pxPerDay: number, padLeft: number, _maxLanes?: number): PlacedPill[] {
  const sorted = [...items].sort((left, right) => left.days - right.days || left.model.localeCompare(right.model));
  const laneEnds: number[] = [];
  const placed: PlacedPill[] = [];
  for (const item of sorted) {
    const x = padLeft + Math.round(item.days * pxPerDay);
    const width = estimatePillWidth(item);
    let lane = laneEnds.findIndex((end) => end + PILL_GAP <= x);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = x + width;
    const laneOffset = lane === 0 ? 0
      : lane % 2 === 1 ? -Math.ceil(lane / 2) * LANE_STEP
      : Math.ceil(lane / 2) * LANE_STEP;
    placed.push({ item, x, width, lane, laneOffset });
  }
  return placed;
}

export function trackHeight(placed: PlacedPill[], minTrackHeight: number): number {
  const maxLane = placed.reduce((top, pill) => Math.max(top, pill.lane), 0);
  const lanesUp = Math.ceil(maxLane / 2);
  // O eixo fica no centro; reservar ambos os lados evita que uma faixa ímpar
  // invada a empresa anterior (antes faltavam 20px no lado mais ocupado).
  return Math.max(minTrackHeight, PILL_H + 24 + 2 * lanesUp * LANE_STEP);
}

// ─── Montagem das trilhas por ecossistema / empresa / país ───

export type TimelineTrack = {
  key: string;
  kind: "company" | "country" | "other";
  label: string;
  items: TimelineItem[];
};

export type TimelineGroup = {
  ecosystem: TimelineEcosystem;
  tracks: TimelineTrack[];
};

export type TimelineGroupLabels = {
  /* Rótulo da trilha de cauda longa ("Outros" / "Other"). */
  other: string;
  /* Países chegam em português (CREATOR_COUNTRY do Panorama); a versão
     inglesa traduz por aqui. */
  countries?: Record<string, string>;
};

/* Régua ampliada: mínimo de modelos para uma empresa ganhar trilha própria
   (`MIN_MODELOS_TRACK` no Panorama). Na régua padrão o mínimo é 1 — toda
   empresa com identidade tem faixa. A ampliada preserva essas faixas e
   promove também empresas sem identidade visual com pelo menos 3 modelos. */
export const MIN_COMPANY_TRACK = 3;

export type TimelineGroupOptions = {
  minCompanyTrack?: number;
  population?: TimelineItem[];
};

function byCountThenName(left: [string, number], right: [string, number]) {
  return right[1] - left[1] || left[0].localeCompare(right[0]);
}

function counted(entries: Map<string, TimelineItem[]>) {
  return [...entries.entries()]
    .map(([name, list]) => [name, list.length] as [string, number])
    .sort(byCountThenName)
    .map(([name]) => name);
}

function byCountryOrCompany(source: TimelineItem[], population: TimelineItem[], byCountry: boolean, minOwnTrack: number, labels: TimelineGroupLabels) {
  /* Conta antes de separar: na régua ampliada (minOwnTrack > 1), a decisão de
     trilha própria é da EMPRESA — ou todas as linhas dela entram, ou nenhuma.
     As empresas já nomeadas permanecem; a cauda nova com 1–2 modelos vai
     para "Outros". Contamos antes dos filtros, para a busca não desfazer
     uma promoção nem trocar a identidade da trilha.
     Em Outros Países o agrupamento é por país e o mínimo não se aplica
     (regra do Panorama: a faixa é do país, não da empresa). */
  const counts = new Map<string, number>();
  for (const item of population) {
    const key = byCountry ? item.country : item.company;
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const known = new Map<string, TimelineItem[]>();
  const rest: TimelineItem[] = [];
  for (const item of source) {
    const key = byCountry ? item.country : item.company;
    if (key && (byCountry || item.known || (minOwnTrack > 1 && (counts.get(key) || 0) >= minOwnTrack))) {
      const list = known.get(key) || [];
      list.push(item);
      known.set(key, list);
    } else rest.push(item);
  }
  const names = counted(known);
  if (!byCountry && minOwnTrack > 1) {
    const named = new Set(population.filter((item) => item.known).map((item) => item.company));
    const milestones = new Map<string, number>();
    for (const item of population) if (item.level === 1) milestones.set(item.company, (milestones.get(item.company) || 0) + 1);
    // As trilhas que o leitor já conhece vêm antes das promovidas, na ordem
    // dos marcos da régua padrão. O catálogo não reembaralha essas faixas.
    names.sort((a, b) => Number(named.has(b)) - Number(named.has(a))
      || (named.has(a) ? (milestones.get(b) || 0) - (milestones.get(a) || 0) : (counts.get(b) || 0) - (counts.get(a) || 0))
      || a.localeCompare(b));
  }
  const tracks: TimelineTrack[] = names
    .map((key) => ({
      key: `${byCountry ? "country" : "company"}:${key}`,
      kind: byCountry ? "country" : "company",
      label: byCountry ? (labels.countries?.[key] || key) : key,
      items: (known.get(key) || []).slice().sort((left, right) => left.days - right.days),
    }));
  if (rest.length) {
    tracks.push({ key: "other", kind: "other", label: labels.other, items: rest.slice().sort((left, right) => left.days - right.days) });
  }
  return tracks;
}

/* Três faixas (swimlanes), na ordem fixa dos ecossistemas. Nos ecossistemas
   norte-americano e chinês cada empresa com identidade ganha trilha própria
   e a ampliada promove as demais com >= minCompanyTrack modelos; a cauda longa
   cai no "Outros" do grupo; em Outros Países a trilha é por PAÍS, não por
   empresa — dois laboratórios coreanos dividem a faixa "Coreia do Sul"
   (a régua padrão do Panorama desenha assim). */
export function buildTimelineGroups(items: TimelineItem[], labels: TimelineGroupLabels, options: TimelineGroupOptions = {}): TimelineGroup[] {
  const minCompanyTrack = options.minCompanyTrack ?? 1;
  const groups: TimelineGroup[] = [];
  for (const ecosystem of ECOSYSTEM_ORDER) {
    const inGroup = items.filter((item) => item.ecosystem === ecosystem);
    if (!inGroup.length) continue;
    /* Sem país cadastrado não há trilha de país — o país não é chutado; a
       linha cai no "Outros" (mesma regra da régua do Panorama). */
    const population = (options.population || items).filter((item) => item.ecosystem === ecosystem);
    groups.push({ ecosystem, tracks: byCountryOrCompany(inGroup, population, ecosystem === "OUTROS PAÍSES", minCompanyTrack, labels) });
  }
  return groups;
}

// ─── Filtros ───

export type TimelineFilters = {
  ecosystem: string;
  /* Uma ou mais empresas: o menu do seletor tem caixas de seleção, então a
     escolha é um conjunto, não um valor único. */
  companies: string[];
  query: string;
};

export function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* Busca por nome de modelo, sem depender de acento ou caixa — "minimax" tem
   que achar "MiniMax-Text-01". */
export function filterTimelineItems(items: TimelineItem[], filters: TimelineFilters): TimelineItem[] {
  const needle = stripDiacritics(filters.query.trim().toLowerCase());
  return items.filter((item) =>
    (!filters.ecosystem || item.ecosystem === filters.ecosystem)
    && (!filters.companies.length || filters.companies.includes(item.company))
    && (!needle || stripDiacritics(item.model.toLowerCase()).includes(needle)));
}

export function filterOptions(items: TimelineItem[]) {
  const ecosystems = new Map<string, number>();
  const companies = new Map<string, number>();
  for (const item of items) {
    ecosystems.set(item.ecosystem, (ecosystems.get(item.ecosystem) || 0) + 1);
    companies.set(item.company, (companies.get(item.company) || 0) + 1);
  }
  const companiesByCount = [...companies.entries()].sort(byCountThenName).map(([name, count]) => ({ name, count }));
  return { ecosystems: ECOSYSTEM_ORDER.map((name) => ({ name, count: ecosystems.get(name) || 0 })), companies: companiesByCount };
}

// ─── Agrupamento por mês (visão de celular) ───

export type TimelineMonthGroup = {
  key: string;
  label: string;
  items: TimelineItem[];
};

/* Lista vertical do celular: meses mais recentes primeiro, lançamentos do mês
   também do mais recente para o mais antigo. */
export function groupedByMonth(items: TimelineItem[], monthLabel: (year: number, monthIndex: number) => string): TimelineMonthGroup[] {
  const byMonth = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const key = item.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const list = byMonth.get(key) || [];
    list.push(item);
    byMonth.set(key, list);
  }
  return [...byMonth.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([key, list]) => ({
      key,
      label: monthLabel(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1),
      items: list.slice().sort((left, right) => right.days - left.days || left.model.localeCompare(right.model)),
    }));
}

// ─── Últimas adições (bloco de novidades) ───

/* Idade máxima (em dias) para o ponto âmbar de "novo" (`NOVIDADES_DOT_DAYS`
   no Panorama). */
export const NOVIDADES_DOT_DAYS = 14;

export type TimelineAddition = {
  item: TimelineItem;
  /* Momento efetivo da adição: `updatedAt` da planilha, caindo para a data do
     lançamento quando a linha nunca foi tocada pela aprovação/automação. */
  addedMs: number;
  isNew: boolean;
};

/* "Últimas adições" são as linhas que a planilha recebeu/aprovou mais
   recentemente (`updatedAt`), NÃO os lançamentos de data mais recente — uma
   retificação de 2024 pode ter entrado ontem. Sem `updatedAt` (catálogo,
   linha antiga), vale a data do lançamento. */
export function latestAdditions(items: TimelineItem[], count: number, nowMs: number): TimelineAddition[] {
  const addedMs = (item: TimelineItem) => {
    if (item.updatedAt && item.updatedAt > 0) return item.updatedAt;
    const parsed = Date.parse(`${item.date}T00:00:00Z`);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return items
    .map((item) => ({ item, addedMs: addedMs(item) }))
    .filter((addition) => addition.addedMs > 0)
    .sort((left, right) => right.addedMs - left.addedMs || left.item.id.localeCompare(right.item.id))
    .slice(0, count)
    .map((addition) => ({ ...addition, isNew: nowMs - addition.addedMs <= NOVIDADES_DOT_DAYS * 86_400_000 }))
    // Seleciona por adição primeiro; só a apresentação usa o lançamento.
    .sort((left, right) => right.item.date.localeCompare(left.item.date) || left.item.id.localeCompare(right.item.id));
}

/* "Últimos lançamentos": os mais recentes pela DATA DE LANÇAMENTO. Um
   lançamento antigo cadastrado hoje não entra aqui só por ter chegado agora;
   a bolinha "novo" continua dizendo o que entrou na planilha há pouco. */
export function latestReleases(items: TimelineItem[], count: number, nowMs: number): TimelineAddition[] {
  const addedMs = (item: TimelineItem) => item.updatedAt && item.updatedAt > 0 ? item.updatedAt : Date.parse(`${item.date}T00:00:00Z`) || 0;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  return items
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date <= today)
    .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id))
    .slice(0, count)
    .map((item) => ({ item, addedMs: addedMs(item), isNew: nowMs - addedMs(item) <= NOVIDADES_DOT_DAYS * 86_400_000 }));
}

// ─── Zoom ───

export const ZOOM = { min: 0.4, max: 4, step: 0.2 };

export function clampPxPerDay(value: number) {
  return Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(value * 100) / 100));
}

/* Escala de encaixe: a régua inteira cabendo na largura do contêiner. É o
   padrão (o Panorama descobriu que abrir ancorado à esquerda escondia o fim,
   que é justamente a parte densa). */
export function fitPxPerDay(containerWidth: number, padLeft: number, padRight: number, maxDays: number) {
  const usable = containerWidth - padLeft - padRight;
  if (maxDays <= 0) return ZOOM.min;
  if (usable <= 0) return ZOOM.min;
  return clampPxPerDay(usable / maxDays);
}

// ─── CSV ───

export type TimelineCsvLabels = {
  /* Cabeçalho das seis colunas na ordem: data, empresa, modelo, impacto, fonte, nível. */
  headers: string[];
  levels: Record<TimelineLevel, string>;
};

export function csvEscape(value: unknown) {
  const text = String(value == null ? "" : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/* `nível` viaja com o CSV: quem baixar consegue separar marco curado de censo
   automático sem voltar ao site (mesma regra do export do Panorama). */
export function timelineCsv(items: TimelineItem[], labels: TimelineCsvLabels): string {
  const rows = [...items]
    .sort((left, right) => left.date.localeCompare(right.date) || left.company.localeCompare(right.company))
    .map((item) => [
      item.date,
      item.company,
      item.model,
      item.impact,
      item.reference,
      labels.levels[item.level],
    ].map(csvEscape).join(","));
  return [labels.headers.map(csvEscape).join(","), ...rows].join("\r\n");
}
/* Um detalhe continua visível se a chegada do catálogo mover sua âncora.
   A posição usa o retângulo atual, sem fechar o painel durante a rolagem. */
export function popoverPlacement(anchor: { left: number; top: number; bottom: number; width: number }, viewportWidth: number, viewportHeight: number, headerOffset: number) {
  const width = Math.min(344, viewportWidth - 20);
  const minTop = headerOffset + 10;
  const maxTop = Math.max(minTop, viewportHeight - 170);
  const below = anchor.bottom + 10;
  const preferred = below + 360 > viewportHeight - 10 ? anchor.top - 370 : below;
  const top = Math.min(maxTop, Math.max(minTop, preferred));
  return { width, left: Math.max(10, Math.min(anchor.left + anchor.width / 2 - width / 2, viewportWidth - width - 10)), top, maxHeight: Math.max(160, viewportHeight - top - 10) };
}
