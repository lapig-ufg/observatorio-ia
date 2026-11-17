/* "Qual modelo usar" (nov/2026): dados e contas da página.

   A página entrega o dado e não decide pela pessoa. Tudo o que aparece na tela
   sai destas funções puras, a partir de três arquivos publicados pelo Panorama:

   - guia-modelos.json  (cron semanal da Artificial Analysis): cada família com
     todas as variantes de esforço, os 7 índices, custo por tarefa e tempo;
   - guia-fontes.json   (opcional): LMArena, Epoch e Vals por família, cada uma
     com o esforço em que mediu;
   - guia-planos.json   (opcional): o que cada plano dá, com a página oficial.

   Regras que estas funções guardam:
   - diferença menor que 1 ponto na AA é empate (ruído), nunca vitória;
   - fontes de escalas diferentes nunca são somadas;
   - dado ausente é ausente: nada vira zero. */

export const INDEX_KEYS = ["intelligence", "finance", "strategy", "legal", "health", "engineering", "economics"] as const;
export type IndexKey = typeof INDEX_KEYS[number];

export const EFFORT_ORDER = ["non-reasoning", "minimal", "low", "medium", "high", "xhigh", "max", "single"];
export const TIE_POINTS = 1;

export type Variant = {
  effort: string;
  label: string;
  scores: Record<IndexKey, number | null>;
  costPerTask: number | null;
  priceBlended: number | null;
  tps: number | null;
  ttft: number | null;
  e2e: number | null;
};

export type Family = {
  id: string;
  name: string;
  creator: string;
  releaseDate: string;
  openWeights: boolean | null;
  variants: Variant[];
};

export type GuideModels = {
  fetchedAt: string;
  indexVersion: number | null;
  sourceUrl: string;
  attribution: string;
  families: Family[];
};

export type Interval = { rating: number; lower: number | null; upper: number | null; votes: number | null; rank: number | null; n: number | null };
export type ArenaEntry = { effort: string | null; overall: Interval | null; categories: Record<string, Interval> };
export type BenchScore = { key: string; label: string; score: number };
export type FamilySources = {
  lmarena: ArenaEntry[];
  epoch: { effort: string | null; benchmarks: BenchScore[] } | null;
  vals: { effort: string | null; benchmarks: BenchScore[] } | null;
};
export type SourceInfo = { id: string; name: string; url: string; collectedAt: string; measures: string; license: string };
export type GuideSources = { generatedAt: string; sources: SourceInfo[]; families: Map<string, FamilySources> };

export type PlanFamily = { id: string; efforts: string[] | null; note: string };
export type Plan = { id: string; provider: string; name: string; price: string; families: PlanFamily[]; sourceUrl: string; checked: boolean };
export type GuidePlans = { checkedAt: string; plans: Plan[]; defaults: Map<string, { effort: string; where: string; sourceUrl: string }> };

/* ─── leitura defensiva dos JSONs ─── */

const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string => typeof value === "string" ? value : "";
const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function effortRank(effort: string) {
  const i = EFFORT_ORDER.indexOf(effort);
  return i < 0 ? EFFORT_ORDER.length : i;
}

export function modelsFromJson(json: unknown): GuideModels {
  const root = obj(json);
  const families: Family[] = [];
  for (const raw of arr(root.families)) {
    const f = obj(raw);
    const id = str(f.id);
    const name = str(f.name);
    if (!id || !name) continue;
    const variants: Variant[] = arr(f.variants).map((rawVariant) => {
      const v = obj(rawVariant);
      const scores = obj(v.scores);
      const price = obj(v.price);
      return {
        effort: str(v.effort) || "single",
        label: str(v.label),
        scores: Object.fromEntries(INDEX_KEYS.map((key) => [key, num(scores[key])])) as Record<IndexKey, number | null>,
        costPerTask: num(v.cost_per_task),
        priceBlended: num(price.blended_3_1),
        tps: num(v.tps),
        ttft: num(v.ttft_s),
        e2e: num(v.e2e_s),
      };
    }).sort((a, b) => effortRank(a.effort) - effortRank(b.effort));
    if (!variants.length) continue;
    families.push({ id, name, creator: str(f.creator) || "—", releaseDate: str(f.release_date), openWeights: typeof f.open_weights === "boolean" ? f.open_weights : null, variants });
  }
  return {
    fetchedAt: str(root.fetched_at),
    indexVersion: num(root.intelligence_index_version),
    sourceUrl: str(root.source_url) || "https://artificialanalysis.ai/",
    attribution: str(root.attribution),
    families,
  };
}

function intervalFrom(value: unknown): Interval | null {
  const v = obj(value);
  const rating = num(v.rating);
  if (rating === null) return null;
  return { rating, lower: num(v.lower), upper: num(v.upper), votes: num(v.votes), rank: num(v.rank), n: num(v.n) };
}

function benchesFrom(value: unknown): { effort: string | null; benchmarks: BenchScore[] } | null {
  const v = obj(value);
  const benches = obj(v.benchmarks);
  const benchmarks = Object.entries(benches).flatMap(([key, raw]) => {
    const b = obj(raw);
    const score = num(b.score) ?? num(raw);
    return score === null ? [] : [{ key, label: str(b.label) || key, score }];
  });
  return benchmarks.length ? { effort: str(v.effort) || null, benchmarks } : null;
}

export function sourcesFromJson(json: unknown): GuideSources {
  const root = obj(json);
  const sources = Object.entries(obj(root.sources)).map(([id, raw]) => {
    const s = obj(raw);
    return { id, name: str(s.name) || id, url: str(s.url), collectedAt: str(s.collected_at), measures: str(s.measures), license: str(s.license) };
  });
  const families = new Map<string, FamilySources>();
  for (const [id, raw] of Object.entries(obj(root.families))) {
    const f = obj(raw);
    const lmarena = arr(f.lmarena).map((rawEntry) => {
      const e = obj(rawEntry);
      const categories: Record<string, Interval> = {};
      for (const [cat, value] of Object.entries(obj(e.categories))) {
        const interval = intervalFrom(value);
        if (interval) categories[cat] = interval;
      }
      return { effort: str(e.effort) || null, overall: intervalFrom(e.overall), categories };
    }).filter((entry) => entry.overall);
    families.set(id, { lmarena, epoch: benchesFrom(f.epoch), vals: benchesFrom(f.vals) });
  }
  return { generatedAt: str(root.generated_at), sources, families };
}

export function plansFromJson(json: unknown): GuidePlans {
  const root = obj(json);
  const plans: Plan[] = arr(root.plans).flatMap((raw) => {
    const p = obj(raw);
    const id = str(p.id);
    if (!id) return [];
    const families = arr(p.families).flatMap((rawFamily) => {
      const f = obj(rawFamily);
      const familyId = str(f.id);
      if (!familyId) return [];
      const efforts = Array.isArray(f.efforts) ? f.efforts.map(str).filter(Boolean) : null;
      return [{ id: familyId, efforts: efforts && efforts.length ? efforts : null, note: str(f.note) }];
    });
    return [{ id, provider: str(p.provider), name: str(p.name) || id, price: str(p.price), families, sourceUrl: str(p.source_url), checked: p.checked === true }];
  });
  const defaults = new Map<string, { effort: string; where: string; sourceUrl: string }>();
  for (const [id, raw] of Object.entries(obj(root.defaults))) {
    const d = obj(raw);
    if (str(d.effort)) defaults.set(id, { effort: str(d.effort), where: str(d.where), sourceUrl: str(d.source_url) });
  }
  return { checkedAt: str(root.checked_at), plans, defaults };
}

/* ─── contas ─── */

export type Axis = "cost" | "time";

export function axisValue(variant: Variant, axis: Axis) {
  return axis === "cost" ? variant.costPerTask : variant.e2e;
}

/** A variante de maior nota no índice (o "melhor resultado"); empate na nota fica com a mais barata. */
export function ceiling(family: Family, key: IndexKey): Variant | null {
  let best: Variant | null = null;
  for (const v of family.variants) {
    const s = v.scores[key];
    if (s === null) continue;
    const b = best?.scores[key] ?? null;
    if (b === null || s > b || (s === b && (v.costPerTask ?? Infinity) < (best!.costPerTask ?? Infinity))) best = v;
  }
  return best;
}

export type RankRow = { family: Family; top: Variant; score: number; floor: number; position: number; tieWithPrevious: boolean };

/** Famílias ordenadas pelo melhor resultado no índice. `tieWithPrevious` marca quem fica a menos de 1 ponto do de cima. */
export function rankFamilies(models: GuideModels, key: IndexKey): RankRow[] {
  const rows = models.families.flatMap((family) => {
    const top = ceiling(family, key);
    if (!top) return [];
    const scored = family.variants.map((v) => v.scores[key]).filter((s): s is number => s !== null);
    return [{ family, top, score: top.scores[key]!, floor: Math.min(...scored), position: 0, tieWithPrevious: false }];
  }).sort((a, b) => b.score - a.score || a.family.name.localeCompare(b.family.name));
  rows.forEach((row, i) => {
    row.position = i + 1;
    row.tieWithPrevious = i > 0 && rows[i - 1].score - row.score < TIE_POINTS;
  });
  return rows;
}

export function isTie(a: number | null, b: number | null) {
  return a !== null && b !== null && Math.abs(a - b) < TIE_POINTS;
}

export type Step = { from: Variant; to: Variant; points: number; costRatio: number | null; timeRatio: number | null };

/** Cada degrau da escada: quanto a nota sobe e quantas vezes o custo e o tempo crescem. */
export function effortSteps(family: Family, key: IndexKey): Step[] {
  const scored = family.variants.filter((v) => v.scores[key] !== null);
  const steps: Step[] = [];
  for (let i = 1; i < scored.length; i++) steps.push(compareVariants(scored[i - 1], scored[i], key));
  return steps;
}

export function compareVariants(from: Variant, to: Variant, key: IndexKey): Step {
  const ratio = (a: number | null, b: number | null) => a && b ? b / a : null;
  return { from, to, points: (to.scores[key] ?? 0) - (from.scores[key] ?? 0), costRatio: ratio(from.costPerTask, to.costPerTask), timeRatio: ratio(from.e2e, to.e2e) };
}

export type Point = { family: Family; variant: Variant; score: number; x: number };

export function chartPoints(families: Family[], key: IndexKey, axis: Axis): Point[] {
  return families.flatMap((family) => family.variants.flatMap((variant) => {
    const score = variant.scores[key];
    const x = axisValue(variant, axis);
    return score !== null && x !== null && x > 0 ? [{ family, variant, score, x }] : [];
  }));
}

/** Fronteira: pontos que nenhum outro supera com nota maior ou igual e custo (ou tempo) menor ou igual. */
export function frontier(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || b.score - a.score);
  const out: Point[] = [];
  let best = -Infinity;
  for (const p of sorted) {
    if (p.score > best) { out.push(p); best = p.score; }
  }
  return out;
}

export function median(values: number[]) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Mediana do campo em cada índice, usando o melhor resultado de cada família. */
export function fieldMedians(models: GuideModels): Record<IndexKey, number | null> {
  return Object.fromEntries(INDEX_KEYS.map((key) => [key, median(models.families.flatMap((f) => {
    const top = ceiling(f, key);
    return top ? [top.scores[key]!] : [];
  }))])) as Record<IndexKey, number | null>;
}

/** Posição (1 = melhor) da família em cada índice, pelo melhor resultado. */
export function indexPositions(models: GuideModels) {
  const out = new Map<string, Record<IndexKey, { position: number; total: number } | null>>();
  const ranks = Object.fromEntries(INDEX_KEYS.map((key) => [key, rankFamilies(models, key)])) as Record<IndexKey, RankRow[]>;
  for (const family of models.families) {
    out.set(family.id, Object.fromEntries(INDEX_KEYS.map((key) => {
      const row = ranks[key].find((r) => r.family.id === family.id);
      return [key, row ? { position: row.position, total: ranks[key].length } : null];
    })) as Record<IndexKey, { position: number; total: number } | null>);
  }
  return out;
}

export type Similar = { family: Family; variant: Variant; delta: number; costRatio: number | null; timeRatio: number | null; worst: { key: IndexKey; delta: number } | null };

/** "O que entrega parecido": variantes de outras famílias a até `tolerance` pontos, com custo e tempo relativos. */
export function similarTo(models: GuideModels, ref: Family, refVariant: Variant, key: IndexKey, tolerance = 2): Similar[] {
  const base = refVariant.scores[key];
  if (base === null) return [];
  const out: Similar[] = [];
  for (const family of models.families) {
    if (family.id === ref.id) continue;
    for (const variant of family.variants) {
      const s = variant.scores[key];
      if (s === null || Math.abs(s - base) > tolerance) continue;
      let worst: { key: IndexKey; delta: number } | null = null;
      for (const k of INDEX_KEYS) {
        const a = variant.scores[k], b = refVariant.scores[k];
        if (a === null || b === null) continue;
        if (!worst || a - b < worst.delta) worst = { key: k, delta: a - b };
      }
      const c = compareVariants(refVariant, variant, key);
      out.push({ family, variant, delta: s - base, costRatio: c.costRatio, timeRatio: c.timeRatio, worst });
    }
  }
  return out.sort((a, b) => (a.costRatio ?? Infinity) - (b.costRatio ?? Infinity));
}

/** Correlação de postos de Spearman (sem empates especiais: as notas raramente empatam exatamente). */
export function spearman(a: number[], b: number[]) {
  const n = a.length;
  if (n < 3 || n !== b.length) return null;
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(n);
    order.forEach(([, i], pos) => { r[i] = pos; });
    return r;
  };
  const ra = rank(a), rb = rank(b);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export type VoicePoint = { family: Family; aa: number; aaVariant: Variant; arena: Interval; arenaEffort: string | null; aaRank: number; arenaRank: number; shift: number };

/** Capacidade (AA) × preferência (LMArena), cada fonte no esforço que ela mediu.
    Quando o LMArena informa o esforço e a AA tem esse esforço, usa a nota da AA nele. */
export function voices(models: GuideModels, sources: GuideSources | null, category = "overall"): { points: VoicePoint[]; rho: number | null } {
  if (!sources) return { points: [], rho: null };
  const base = models.families.flatMap((family) => {
    const entries = sources.families.get(family.id)?.lmarena || [];
    let pick: { entry: ArenaEntry; interval: Interval } | null = null;
    for (const entry of entries) {
      const interval = category === "overall" ? entry.overall : entry.categories[category];
      if (interval && (!pick || interval.rating > pick.interval.rating)) pick = { entry, interval };
    }
    if (!pick) return [];
    const same = pick.entry.effort ? family.variants.find((v) => v.effort === pick!.entry.effort && v.scores.intelligence !== null) : null;
    const aaVariant = same || ceiling(family, "intelligence");
    if (!aaVariant) return [];
    return [{ family, aa: aaVariant.scores.intelligence!, aaVariant, arena: pick.interval, arenaEffort: pick.entry.effort, aaRank: 0, arenaRank: 0, shift: 0 }];
  });
  const byAa = [...base].sort((a, b) => b.aa - a.aa);
  const byArena = [...base].sort((a, b) => b.arena.rating - a.arena.rating);
  byAa.forEach((p, i) => { p.aaRank = i + 1; });
  byArena.forEach((p, i) => { p.arenaRank = i + 1; });
  base.forEach((p) => { p.shift = p.aaRank - p.arenaRank; });
  return { points: base, rho: spearman(base.map((p) => p.aa), base.map((p) => p.arena.rating)) };
}

/** Chance de a pessoa preferir A a B, pela diferença de Elo. */
export function eloWinShare(a: number, b: number) {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

export type TeamMember = { family: Family; variant: Variant; planIds: string[]; effortSource: "plan" | "default" | "ceiling" | "chosen" };

/** O esforço com que um modelo entra na equipe: o escolhido pela pessoa; senão o maior que o
    plano libera; senão o padrão documentado pelo fabricante; senão o melhor resultado. */
function memberVariant(family: Family, allowed: string[] | null, plans: GuidePlans | null, chosen?: string): { variant: Variant; source: TeamMember["effortSource"] } {
  const pick = (effort?: string) => effort ? family.variants.find((v) => v.effort === effort) : undefined;
  const byChoice = pick(chosen);
  if (byChoice) return { variant: byChoice, source: "chosen" };
  const inPlan = allowed ? family.variants.filter((v) => allowed.includes(v.effort)) : [];
  if (inPlan.length) return { variant: inPlan[inPlan.length - 1], source: "plan" };
  const byDefault = pick(plans?.defaults.get(family.id)?.effort);
  if (byDefault) return { variant: byDefault, source: "default" };
  return { variant: ceiling(family, "intelligence") || family.variants[family.variants.length - 1], source: "ceiling" };
}

/** O que a pessoa tem: as famílias dos planos marcados e os modelos marcados à mão. */
export function teamFrom(models: GuideModels, plans: GuidePlans | null, planIds: string[], extraFamilyIds: string[], chosen: Record<string, string> = {}): TeamMember[] {
  const members = new Map<string, TeamMember>();
  const byId = new Map(models.families.map((f) => [f.id, f]));
  for (const plan of plans?.plans || []) {
    if (!planIds.includes(plan.id)) continue;
    for (const pf of plan.families) {
      const family = byId.get(pf.id);
      if (!family) continue;
      const current = members.get(family.id);
      if (current) { current.planIds.push(plan.id); continue; }
      const { variant, source } = memberVariant(family, pf.efforts, plans, chosen[family.id]);
      members.set(family.id, { family, variant, planIds: [plan.id], effortSource: source });
    }
  }
  for (const id of extraFamilyIds) {
    const family = byId.get(id);
    if (!family || members.has(id)) continue;
    const { variant, source } = memberVariant(family, null, plans, chosen[id]);
    members.set(id, { family, variant, planIds: [], effortSource: source });
  }
  return [...members.values()].sort((a, b) => (b.variant.scores.intelligence ?? -1) - (a.variant.scores.intelligence ?? -1));
}

/* ─── formatos ─── */

export function formatScore(value: number | null, english = false) {
  if (value === null) return "—";
  return english ? value.toFixed(1) : value.toFixed(1).replace(".", ",");
}

export function formatCost(value: number | null, english = false) {
  if (value === null) return "—";
  const digits = value < 0.1 ? 3 : 2;
  const text = value.toFixed(digits);
  return `US$ ${english ? text : text.replace(".", ",")}`;
}

export function formatTime(seconds: number | null, english = false) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = seconds / 60;
  const text = minutes < 10 ? minutes.toFixed(1) : String(Math.round(minutes));
  return `${english ? text : text.replace(".", ",")} min`;
}

export function formatRatio(value: number | null, english = false) {
  if (value === null) return "—";
  const text = value >= 10 ? String(Math.round(value)) : value.toFixed(1);
  return `${english ? text : text.replace(".", ",")}×`;
}

export function formatDelta(points: number, english = false) {
  const sign = points > 0 ? "+" : points < 0 ? "−" : "±";
  const text = Math.abs(points).toFixed(1);
  return `${sign}${english ? text : text.replace(".", ",")}`;
}

const EFFORT_LABELS: Record<string, { pt: string; en: string }> = {
  "non-reasoning": { pt: "sem raciocínio", en: "no reasoning" },
  minimal: { pt: "mínimo", en: "minimal" },
  low: { pt: "low", en: "low" },
  medium: { pt: "medium", en: "medium" },
  high: { pt: "high", en: "high" },
  xhigh: { pt: "xhigh", en: "xhigh" },
  max: { pt: "max", en: "max" },
  single: { pt: "único", en: "single" },
};

export function effortLabel(effort: string, english = false) {
  return EFFORT_LABELS[effort]?.[english ? "en" : "pt"] || effort;
}
