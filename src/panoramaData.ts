/* Dados do Panorama Global da IA Generativa, lidos direto das fontes vivas.

   O repositório do Panorama continua sendo o dono dos dados: a planilha
   `Lancamentos` (curada pela PWA de lá), os JSON da Artificial Analysis que o
   cron semanal de lá commita, e `assets/data.js`, com cores, apelidos e países
   das empresas. O Observatório só lê. Nada aqui escreve em lugar nenhum, e nada
   exige mudança no repositório do Panorama.

   Este arquivo é puro (sem fetch, sem DOM) para os testes poderem importá-lo
   sozinho. A busca de rede mora em `panoramaSource.ts`.

   As regras de identidade de modelo foram portadas de `assets/app.js`,
   `assets/data.js` e `assets/guia.js` do Panorama. Elas têm motivos documentados
   lá (Command-R+, apelidos da AA, GPT-5.6 Sol/Terra/Luna); mudar uma delas aqui
   sem mudar lá faz os dois sites discordarem sobre qual modelo é qual. */

export const PANORAMA_SITE = "https://lapig-ufg.github.io/app-panorama-global-da-ia-generativa/";
export const PANORAMA_SHEET_ID = "1RsaiSCZBTUB4XTSj_mVbNgsLSHpky7wsjKltZboDaPA";
export const PANORAMA_LAUNCHES_TAB = "Lancamentos";
export const PANORAMA_TRANSLATIONS_TAB = "Lancamentos_EN";
/* Marco zero da régua: lançamento do ChatGPT. */
export const PANORAMA_EPOCH = "2022-11-30";

export type PanoramaEcosystem = "ECOSSISTEMA NORTE-AMERICANO" | "ECOSSISTEMA CHINÊS" | "OUTROS PAÍSES";

export type PanoramaConfig = {
  companyColors: Record<string, string>;
  benchOnlyColors: Record<string, string>;
  companyAliases: Record<string, string>;
  modelAliases: Record<string, string>;
  creatorCountry: Record<string, string>;
  logoMap: Record<string, string>;
  logoPaths: Record<string, string>;
};

/* Nível de curadoria, o mesmo da régua ampliada do Panorama:
   1 = marco (`publicado`), 2 = secundário (`secundario`), 3 = catálogo automático da AA. */
export type PanoramaLevel = 1 | 2 | 3;

export type PanoramaLaunch = {
  date: string;
  company: string;
  model: string;
  impact: string;
  reference: string;
  level: 1 | 2;
  /* Coluna `grupo` da planilha: palpite da automação para empresa sem país cadastrado. */
  sheetGroup: string;
  addedAt: number;
  updatedAt: number;
  untranslated?: boolean;
};

export type PanoramaCatalogModel = {
  date: string;
  company: string;
  model: string;
  score: number | null;
  level: 3;
};

export type PanoramaBenchmarkEntry = {
  model: string;
  variant: string;
  company: string;
  score: number;
  releaseDate: string;
  pricePerMillion: number | null;
  tokensPerSecond: number | null;
};

export type PanoramaBenchmark = {
  key: string;
  label: string;
  category: string;
  description: string;
  unit: string;
  /* A nota é porcentagem de acerto (exibir "95,2%") ou índice 0–100. */
  isFraction: boolean;
  modelsEvaluated: number;
  /* Lista completa dos avaliados (full): alimenta a comparação e os "outros
     testes" do guia — um modelo tem nota e posto mesmo fora do top-20. */
  entries: PanoramaBenchmarkEntry[];
  /* Top-20 com campos ricos (preço, velocidade, variante): o corte dos mais
     capazes que vira o ranking do guia e o piso de qualidade das ordenações
     alternativas. Reserva para JSONs antigos sem `full`: o mesmo corte. */
  top: PanoramaBenchmarkEntry[];
};

export type PanoramaBenchmarks = {
  source: string;
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
  modelsTotal: number;
  benchmarks: PanoramaBenchmark[];
};

type GvizCell = { v?: unknown; f?: string } | null;

export type PanoramaGvizResponse = {
  status?: string;
  table?: {
    cols?: Array<{ label?: string }>;
    rows?: Array<{ c?: GvizCell[] | null }>;
  };
};

/* Sem `data.js` (fora do ar, ou mudou de forma) o Panorama continua legível:
   empresas ficam cinza, sem apelido e sem país, e caem em OUTROS PAÍSES pela
   mesma regra que o Panorama usa para empresa desconhecida. */
export const emptyPanoramaConfig: PanoramaConfig = {
  companyColors: {},
  benchOnlyColors: {},
  companyAliases: {},
  modelAliases: {},
  creatorCountry: {},
  logoMap: {},
  logoPaths: {},
};

const NEUTRAL_COLOR = "#6b6860";
const GROUP_OF_COUNTRY: Record<string, PanoramaEcosystem> = {
  "Estados Unidos": "ECOSSISTEMA NORTE-AMERICANO",
  "Canadá": "ECOSSISTEMA NORTE-AMERICANO",
  China: "ECOSSISTEMA CHINÊS",
};

// ─── Configuração vinda de assets/data.js ───

function stringRecord(value: unknown, accept: (entry: string) => boolean = () => true): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" && accept(entry)) result[key] = entry;
  }
  return result;
}

const isColor = (entry: string) => /^#[0-9a-f]{3,8}$/i.test(entry);

/* `assets/data.js` é um script clássico que declara constantes globais. O
   pipeline do Panorama o lê do mesmo jeito (node:vm em prepare.mjs) para não
   manter uma segunda lista de empresas, e o Observatório segue a mesma regra:
   empresa nova cadastrada lá aparece aqui sem deploy.

   O script roda numa função isolada que recebe `window` indefinido. O próprio
   data.js testa `typeof window` antes de olhar o idioma, então ele se comporta
   como no pipeline (português) e não toca no `window` do Observatório. Só os
   mapas listados abaixo saem da função, filtrados para texto. */
export function panoramaConfigFromDataJs(source: string): PanoramaConfig {
  const names = ["COMPANY_COLORS", "BENCH_ONLY_COLORS", "COMPANY_ALIASES", "MODEL_ALIASES", "CREATOR_COUNTRY", "LOGO_MAP", "LOGO_PATHS"];
  const read = names.map((name) => `typeof ${name} === "undefined" ? undefined : ${name}`).join(", ");
  const evaluate = new Function("window", "document", `"use strict";\n${source}\n;return [${read}];`) as (window: undefined, document: undefined) => unknown[];
  const [colors, benchOnly, companyAliases, modelAliases, countries, logoMap, logoPaths] = evaluate(undefined, undefined);
  const config: PanoramaConfig = {
    companyColors: stringRecord(colors, isColor),
    benchOnlyColors: stringRecord(benchOnly, isColor),
    companyAliases: stringRecord(companyAliases),
    modelAliases: stringRecord(modelAliases),
    creatorCountry: stringRecord(countries),
    logoMap: stringRecord(logoMap),
    logoPaths: stringRecord(logoPaths),
  };
  if (!Object.keys(config.companyColors).length) throw new Error("data.js do Panorama sem COMPANY_COLORS.");
  return config;
}

// ─── Identidade de empresa e de modelo ───

function stripToKey(value: unknown) {
  return String(value == null ? "" : value).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/* Identidade SEM apelidos: é a do guia "Qual modelo usar" (`idKey`). Mantém
   GPT-5.6 Sol, Terra e Luna como três modelos comparáveis entre si. */
export function benchmarkModelKey(name: unknown) {
  return stripToKey(name);
}

/* Identidade COM apelidos (`normModel`): diz se duas fontes falam do mesmo
   modelo ("Claude 4.5 Sonnet" da AA = "Claude Sonnet 4.5" da régua). Não use
   para comparar benchmarks entre si: ver `benchmarkModelKey`. */
export function launchModelKey(name: unknown, config: PanoramaConfig) {
  const raw = stripToKey(name);
  return config.modelAliases[raw] || raw;
}

/* Variante usada contra o catálogo (`chaveModelo`): o "+" vira palavra antes
   de normalizar, senão Command-R+ e Command-R viram a mesma chave e um some. */
export function catalogModelKey(name: unknown, config: PanoramaConfig) {
  return launchModelKey(String(name == null ? "" : name).replace(/\+/g, " plus "), config);
}

export function canonicalCompany(name: unknown, config: PanoramaConfig) {
  const raw = String(name == null ? "" : name).trim();
  if (!raw) return "";
  const alias = config.companyAliases[raw.toUpperCase()];
  if (alias) return alias;
  const known = Object.keys({ ...config.companyColors, ...config.benchOnlyColors });
  return known.find((key) => key.toUpperCase() === raw.toUpperCase()) || raw;
}

export function companyColor(name: unknown, config: PanoramaConfig) {
  const company = canonicalCompany(name, config);
  return config.companyColors[company] || config.benchOnlyColors[company] || NEUTRAL_COLOR;
}

export function companyCountry(name: unknown, config: PanoramaConfig) {
  return config.creatorCountry[canonicalCompany(name, config)] || "";
}

/* O país manda; sem país cadastrado vale a coluna `grupo` da planilha; sem
   nenhum dos dois, OUTROS PAÍSES. Mesma regra de `grupoDaLinha` no Panorama.
   O pipeline de lá não chuta país, e este código também não. */
export function companyEcosystem(company: string, config: PanoramaConfig, sheetGroup = ""): PanoramaEcosystem {
  const country = companyCountry(company, config);
  if (country) return GROUP_OF_COUNTRY[country] || "OUTROS PAÍSES";
  const group = sheetGroup.trim().toUpperCase();
  if (group === "ECOSSISTEMA NORTE-AMERICANO" || group === "ECOSSISTEMA CHINÊS") return group;
  return "OUTROS PAÍSES";
}

/* Uma linha da planilha deve ter um modelo só, mas "X / Y" e "Claude 4 (Opus/Sonnet)"
   já existiram. Quebrar o nome em partes impede que o catálogo repita, ao lado
   do marco, um modelo que o marco já cobre (`partesDoNome`). */
export function modelNameParts(model: unknown) {
  const raw = String(model == null ? "" : model).trim();
  if (!raw) return [];
  const candidates = new Set([raw]);
  const withoutParentheses = raw.replace(/\([^)]*\)/g, " ").trim();
  if (withoutParentheses) candidates.add(withoutParentheses);
  (raw.match(/\(([^)]*)\)/g) || []).forEach((part) => candidates.add(part.slice(1, -1)));

  const parts = new Set<string>();
  candidates.forEach((candidate) => {
    parts.add(candidate.trim());
    // "+" só separa quando está cercado de espaço; colado é parte do nome (Command-R+).
    candidate.split(/\s*\/\s*|\s+\+\s+/).forEach((piece) => {
      const trimmed = piece.trim();
      if (trimmed) parts.add(trimmed);
    });
  });
  return [...parts].filter(Boolean);
}

// ─── Datas ───

/* A planilha entrega data como `Date(2026,9,15)` (mês começando em zero). Texto
   ISO e dd/mm/aaaa também são aceitos, montados à mão: `new Date("2026-10-15")`
   é lido como UTC e, no fuso do Brasil, vira o dia anterior. */
export function parseSheetDate(value: unknown) {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  const gviz = text.match(/^Date\((\d+),\s*(\d+),\s*(\d+)/);
  if (gviz) return isoDate(+gviz[1], +gviz[2] + 1, +gviz[3]);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3]);
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) return isoDate(+brazilian[3], +brazilian[2], +brazilian[1]);
  return "";
}

function isoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseSheetTimestamp(value: unknown) {
  if (value == null || value === "") return 0;
  const text = String(value);
  const gviz = text.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?(?:,\s*(\d+))?/);
  if (gviz) return new Date(+gviz[1], +gviz[2], +gviz[3], +(gviz[4] || 0), +(gviz[5] || 0), +(gviz[6] || 0)).getTime();
  const time = new Date(text).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/* Dias desde o marco zero, contados em UTC para não depender do fuso. */
export function daysSinceEpoch(isoDay: string) {
  const [year, month, day] = isoDay.split("-").map(Number);
  const [epochYear, epochMonth, epochDay] = PANORAMA_EPOCH.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(epochYear, epochMonth - 1, epochDay)) / 86_400_000);
}

// ─── Planilha de lançamentos ───

function headerKey(value: unknown) {
  return stripToKey(value);
}

function cellValue(cell: GvizCell | undefined) {
  if (!cell || cell.v == null) return "";
  return String(cell.v);
}

/* O gviz costuma entregar o cabeçalho nos rótulos das colunas, mas pode
   entregá-lo como primeira linha de dados quando não reconhece a linha de
   títulos. O Panorama assume sempre o segundo caso e por isso descarta o
   primeiro lançamento real; aqui os dois casos são distinguidos. */
function tableWithHeader(response: PanoramaGvizResponse) {
  if (response.status && response.status !== "ok") throw new Error("A planilha do Panorama respondeu com erro.");
  const table = response.table;
  if (!table?.rows) throw new Error("A planilha do Panorama não respondeu no formato esperado.");
  const labels = (table.cols || []).map((column) => headerKey(column.label));
  if (labels.some(Boolean)) return { header: labels, rows: table.rows };
  const [first, ...rest] = table.rows;
  return { header: (first?.c || []).map((cell) => headerKey(cellValue(cell))), rows: rest };
}

function columnFinder(header: string[]) {
  return (...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };
}

export function launchesFromGviz(response: PanoramaGvizResponse): PanoramaLaunch[] {
  const { header, rows } = tableWithHeader(response);
  const find = columnFinder(header);
  const column = {
    date: find("data"),
    company: find("empresa"),
    model: find("modelo"),
    impact: find("impacto"),
    reference: find("referencia"),
    status: find("status"),
    group: find("grupo"),
    addedAt: find("timestamp", "datacriacao"),
    updatedAt: find("dataatualizacao"),
  };
  for (const required of ["date", "company", "model", "status"] as const) {
    if (column[required] < 0) throw new Error(`A planilha do Panorama perdeu a coluna "${required}".`);
  }

  const seen = new Set<string>();
  const launches: PanoramaLaunch[] = [];
  for (const row of rows) {
    const cells = row.c || [];
    const at = (index: number) => (index >= 0 ? cellValue(cells[index]).trim() : "");
    /* Só `publicado` e `secundario` entram. Pendente, rejeitado ou vazio ficam
       de fora: a aprovação humana na PWA do Panorama continua sendo o portão. */
    const status = at(column.status).toLowerCase();
    const level = status === "publicado" ? 1 : status === "secundario" ? 2 : 0;
    const company = at(column.company);
    const model = at(column.model);
    const date = parseSheetDate(cells[column.date]?.v);
    if (!level || !company || !model || !date) continue;

    const key = `${date}|${company}|${model}`;
    if (seen.has(key)) continue;
    seen.add(key);

    launches.push({
      date,
      company,
      model,
      impact: at(column.impact),
      reference: at(column.reference),
      level,
      sheetGroup: at(column.group),
      addedAt: column.addedAt >= 0 ? parseSheetTimestamp(cells[column.addedAt]?.v) : 0,
      updatedAt: column.updatedAt >= 0 ? parseSheetTimestamp(cells[column.updatedAt]?.v) : 0,
    });
  }
  return launches.sort((left, right) => left.date.localeCompare(right.date) || left.company.localeCompare(right.company));
}

function translationKey(company: string, model: string, config: PanoramaConfig) {
  return `${canonicalCompany(company, config).toUpperCase()}|${catalogModelKey(model, config)}`;
}

/* `Lancamentos_EN` é uma camada de tradução, não uma segunda lista: casa por
   empresa+modelo e só troca o texto de impacto. Lançamento sem tradução segue
   visível, com o texto em português e marcado como não traduzido. */
export function translationsFromGviz(response: PanoramaGvizResponse, config: PanoramaConfig) {
  const translations = new Map<string, string>();
  if (!response.table?.rows?.length) return translations;
  const { header, rows } = tableWithHeader(response);
  const find = columnFinder(header);
  const company = find("empresa", "company");
  const model = find("modelo", "model");
  const impact = find("impacto", "impact");
  if (company < 0 || model < 0 || impact < 0) return translations;
  for (const row of rows) {
    const cells = row.c || [];
    const values = [company, model, impact].map((index) => cellValue(cells[index]).trim());
    if (values.every(Boolean)) translations.set(translationKey(values[0], values[1], config), values[2]);
  }
  return translations;
}

export function applyTranslations(launches: PanoramaLaunch[], translations: Map<string, string>, config: PanoramaConfig) {
  return launches.map((launch) => {
    const translated = translations.get(translationKey(launch.company, launch.model, config));
    return translated ? { ...launch, impact: translated } : { ...launch, untranslated: true };
  });
}

// ─── Artificial Analysis: catálogo e benchmarks ───

const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export function catalogFromJson(json: unknown, config: PanoramaConfig): PanoramaCatalogModel[] {
  const models = (json as { modelos?: unknown })?.modelos;
  if (!Array.isArray(models)) throw new Error("catalogo.json do Panorama sem a lista de modelos.");
  return models.flatMap((entry) => {
    const item = entry as { mod?: unknown; emp?: unknown; date?: unknown; score?: unknown };
    const date = String(item?.date || "");
    if (!item?.mod || !item?.emp || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [{ date, company: canonicalCompany(item.emp, config), model: String(item.mod), score: finite(item.score), level: 3 as const }];
  });
}

/* Tira do catálogo o que a curadoria (níveis 1 e 2) já cobre, repetições e
   modelos anteriores ao marco zero. Mesma regra de `deduplicarCatalogo`. */
export function catalogWithoutCurated(models: PanoramaCatalogModel[], launches: PanoramaLaunch[], config: PanoramaConfig) {
  const curated = new Set<string>();
  for (const launch of launches) {
    const company = canonicalCompany(launch.company, config).toUpperCase();
    for (const part of modelNameParts(launch.model)) curated.add(`${company}|${catalogModelKey(part, config)}`);
  }
  const seen = new Set<string>();
  return models.filter((model) => {
    const key = `${canonicalCompany(model.company, config).toUpperCase()}|${catalogModelKey(model.model, config)}`;
    if (curated.has(key) || seen.has(key)) return false;
    seen.add(key);
    return model.date >= PANORAMA_EPOCH;
  });
}

export function benchmarksFromJson(json: unknown, config: PanoramaConfig): PanoramaBenchmarks {
  const file = json as {
    source?: unknown; source_url?: unknown; attribution?: unknown; fetched_at?: unknown; models_total?: unknown; benchmarks?: unknown;
  };
  if (!Array.isArray(file?.benchmarks)) throw new Error("benchmarks.json do Panorama sem a lista de testes.");
  return {
    source: String(file.source || ""),
    sourceUrl: String(file.source_url || ""),
    attribution: String(file.attribution || ""),
    fetchedAt: String(file.fetched_at || ""),
    modelsTotal: finite(file.models_total) ?? 0,
    benchmarks: file.benchmarks.flatMap((entry) => {
      const bench = entry as Record<string, unknown>;
      if (!bench?.key) return [];
      // `full` traz todos os avaliados; `top` (os 20 primeiros, campos ricos)
      // é o ranking do guia. JSON antigo sem `full`: o top serve para os dois.
      const full = Array.isArray(bench.full) ? bench.full : [];
      const top = Array.isArray(bench.top) ? bench.top : full;
      const entryFrom = (row: unknown) => {
        const item = row as Record<string, unknown>;
        const score = finite(item?.score);
        if (!item?.model || score === null) return [];
        return [{
          model: String(item.model),
          variant: String(item.variant || ""),
          company: canonicalCompany(item.creator, config),
          score,
          releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.release_date || "")) ? String(item.release_date) : "",
          pricePerMillion: finite(item.price_1m_blended),
          tokensPerSecond: finite(item.tok_per_sec),
        }];
      };
      const topEntries = top.flatMap(entryFrom);
      const entries = full.length ? full.flatMap(entryFrom) : topEntries;
      return [{
        key: String(bench.key),
        label: String(bench.label || bench.key),
        category: String(bench.category || ""),
        description: String(bench.description || ""),
        unit: String(bench.unit || ""),
        isFraction: Boolean(bench.is_fraction),
        modelsEvaluated: finite(bench.models_evaluated) ?? entries.length,
        entries,
        top: topEntries,
      }];
    }),
  };
}

/* Notas de um lançamento curado em cada teste. O vínculo régua ↔ benchmark usa
   a identidade com apelidos e exige a mesma empresa, como o link do guia. */
export function benchmarkScoresForLaunch(launch: PanoramaLaunch, data: PanoramaBenchmarks, config: PanoramaConfig) {
  const company = canonicalCompany(launch.company, config).toUpperCase();
  const keys = new Set(modelNameParts(launch.model).map((part) => launchModelKey(part, config)));
  return data.benchmarks.flatMap((bench) => {
    const ranked = [...bench.entries].sort((left, right) => right.score - left.score);
    return ranked.flatMap((entry, index) => (
      entry.company.toUpperCase() === company && keys.has(launchModelKey(entry.model, config))
        ? [{ benchmark: bench.key, label: bench.label, category: bench.category, rank: index + 1, of: ranked.length, entry }]
        : []
    ));
  });
}

/* O vínculo do guia exige empresa e apelido explícito, sem aproximação fuzzy.
   Marcos agrupados também cobrem seus nomes individuais; preferimos o marco
   ao secundário quando ambos representam a mesma família. */
export function launchForModel(model: string, company: string, launches: PanoramaLaunch[], config: PanoramaConfig, date = "") {
  const key = launchModelKey(model, config);
  const canonical = canonicalCompany(company, config).toUpperCase();
  return launches.filter((launch) => (!canonical || canonicalCompany(launch.company, config).toUpperCase() === canonical)
    && (!date || launch.date === date)
    && modelNameParts(launch.model).some((part) => launchModelKey(part, config) === key))
    .sort((a, b) => a.level - b.level || b.date.localeCompare(a.date))[0] || null;
}
