/* Lógica pura do guia "Qual modelo usar", portada de assets/guia.js do
   Panorama (e de guia-en.js para os textos).

   Como panoramaTimeline.ts, este arquivo não importa nada em tempo de
   execução: os testes o transpilam sozinho. As regras editoriais vêm dos
   comentários de lá — piso de qualidade, categorias = uma pergunta por
   índice, sobreposição calculada em runtime — e têm motivos documentados que
   não podem se perder (ver automation/BENCHMARKS.md §7 do Panorama).

   Identidade de modelo: aqui o guia compara com `guideModelKey`, o nome
   normalizado SEM apelidos (GPT-5.6 Sol, Terra e Luna são famílias distintas
   nos benchmarks — colapsá-las marcaria as três ao selecionar uma). O link
   para a régua usa outra identidade, COM apelidos (launchModelKey de
   panoramaData.ts): não unifique as duas. */

/* Piso de qualidade das alternativas: um modelo só concorre a
   "custo-benefício" ou "mais rápido" se ficar a até 12% do líder em
   pontuação. Sem esse piso, o mais barato do ranking seria sempre o pior. */
export const FLOOR = 0.88;

/* Teto de modelos na bandeja de comparação — mais que isso polui a tabela. */
export const MAX_COMPARE = 4;

/* Metodologia da fonte — linkada no "como medimos" de toda categoria. O leitor
   precisa chegar à definição do índice em um clique. */
export const AA_METHOD_URL = "https://artificialanalysis.ai/methodology/intelligence-benchmarking";

/* ─── Tipos (estruturalmente compatíveis com panoramaData.ts) ─── */

export type GuideEntry = {
  model: string;
  variant: string;
  company: string;
  score: number;
  releaseDate: string;
  pricePerMillion: number | null;
  tokensPerSecond: number | null;
};

export type GuideBenchmark = {
  key: string;
  label: string;
  category: string;
  description: string;
  unit: string;
  isFraction: boolean;
  modelsEvaluated: number;
  entries: GuideEntry[];
  top: GuideEntry[];
};

export type GuideData = {
  source: string;
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
  modelsTotal: number;
  benchmarks: GuideBenchmark[];
};

/* ─── As categorias ───
   Cada categoria = UMA pergunta do usuário, respondida por UM benchmark
   principal (hoje os três são índices compostos da própria AA). Os de apoio
   medem a mesma área de outras formas: entram só como referência cruzada no
   "como medimos" e na linha "outros testes" — nunca no cálculo da posição.

   Os pesos moram aqui, e não no `description` do benchmarks.json, porque o
   JSON só traz a lista de siglas — e é o peso que muda a leitura da nota.

   O Intelligence Index v4.1 é a média ponderada de QUATRO blocos: Agentes
   34% · Código 24% · Raciocínio científico 24% · Geral 18%. E os outros dois
   índices que a chave free entrega SÃO dois desses blocos. Duas consequências:
   1. A primeira aba NÃO mede conversa, escrita ou resumo — peso zero. Não a
      descreva como "o modelo do dia a dia" (o caveat diz o que ficou fora).
   2. As três listas ordenam quase igual; a sobreposição é declarada ao leitor
      com números medidos em runtime (spearman), nunca cravados no texto. */

export type GuideCategoryTexts = {
  label: string;
  question: string;
  compositionIntro: string;
  compositionParts: Array<{ part: string; weight: string; tests: string }>;
  caveat?: string;
  note?: string;
  blockLabel?: string;
  blockWeight?: string;
  overlapWhy: string;
};

export type GuideCategory = {
  id: "geral" | "codigo" | "agentes";
  primary: string;
  support: string[];
  pt: GuideCategoryTexts;
  en: GuideCategoryTexts;
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: "geral",
    primary: "artificial_analysis_intelligence_index",
    support: ["gpqa_diamond", "hle"],
    pt: {
      label: "Capacidade geral",
      question: "Raciocínio, conhecimento e tarefas difíceis — o teto de capacidade do modelo.",
      compositionIntro: "a versão <b>v4.1</b>, uma média ponderada de quatro blocos",
      compositionParts: [
        { part: "Agentes", weight: "34%", tests: "GDPval-AA v2 (20%) — tarefas profissionais de 44 ocupações; τ³-Banking (14%) — atendimento com uso de ferramentas" },
        { part: "Código", weight: "24%", tests: "Terminal-Bench v2.1 (16%) — engenharia de software real; SciCode (8%) — computação científica" },
        { part: "Raciocínio científico", weight: "24%", tests: "Humanity’s Last Exam (12%); GPQA Diamond (6%) — nível doutorado; CritPt (6%) — física de pesquisa" },
        { part: "Geral", weight: "18%", tests: "AA-Omniscience (12%) — conhecimento e taxa de alucinação; AA-LCR (6%) — leitura de documentos longos" },
      ],
      /* O que o índice NÃO mede. A página já prometeu justamente isto. */
      caveat: "Nenhum dos nove testes mede qualidade de conversa, de escrita ou de resumo. Esta pontuação é o teto do modelo em tarefas difíceis, não a utilidade dele no dia a dia — para escrever um e-mail ou resumir um texto, praticamente qualquer modelo desta lista dá conta.",
      /* Responde à pergunta que sumiu junto com a categoria "Pesquisa e
         raciocínio": o bloco de pesquisa JÁ está embutido nesta nota (24%) —
         citar o GPQA como prova seria circular, ele é ingrediente do índice. */
      note: "Não há ranking separado de pesquisa porque ele já está dentro deste: o bloco de raciocínio científico pesa 24% da nota — Humanity’s Last Exam (12%), GPQA Diamond (6%) e CritPt (6%), todos de nível doutorado. Para trabalho acadêmico, esta mesma lista serve.",
      overlapWhy: "As outras duas abas são blocos <em>deste mesmo</em> índice — Código vale 24% da nota e Agentes, 34%. Somados, 58% do que você vê aqui.",
    },
    en: {
      label: "Overall capability",
      question: "Reasoning, knowledge and difficult tasks — the model’s capability ceiling.",
      compositionIntro: "<b>v4.1</b>, a weighted average of four blocks",
      compositionParts: [
        { part: "Agents", weight: "34%", tests: "GDPval-AA v2 (20%) — professional tasks across 44 occupations; τ³-Banking (14%) — service tasks using tools" },
        { part: "Coding", weight: "24%", tests: "Terminal-Bench v2.1 (16%) — real software engineering; SciCode (8%) — scientific computing" },
        { part: "Scientific reasoning", weight: "24%", tests: "Humanity’s Last Exam (12%); GPQA Diamond (6%) — doctoral level; CritPt (6%) — research physics" },
        { part: "General", weight: "18%", tests: "AA-Omniscience (12%) — knowledge and hallucination rate; AA-LCR (6%) — long-document reading" },
      ],
      caveat: "None of the nine tests measures conversation, writing or summarization quality. This score reflects the model’s ceiling on difficult tasks, not its everyday usefulness — almost any model on this list can write an email or summarize text.",
      note: "There is no separate research ranking because research is already included here: the scientific-reasoning block represents 24% of the score — Humanity’s Last Exam (12%), GPQA Diamond (6%) and CritPt (6%), all at doctoral level. This same list applies to academic work.",
      overlapWhy: "The other two tabs are blocks of <em>this same</em> index — Coding represents 24% and Agents 34%. Together they make up 58% of this score.",
    },
  },
  {
    id: "codigo",
    primary: "artificial_analysis_coding_index",
    support: ["scicode"],
    pt: {
      label: "Programação",
      blockLabel: "Código", blockWeight: "24%",
      question: "Escrever, revisar e consertar código.",
      compositionIntro: "o bloco de <b>código</b> do Intelligence Index (24% da nota geral), visto de perto",
      compositionParts: [
        { part: "Terminal-Bench v2.1", weight: "2/3", tests: "tarefas verificadas de engenharia de software e administração de sistemas" },
        { part: "SciCode", weight: "1/3", tests: "problemas de computação científica em Python" },
      ],
      caveat: "Os dois testes são de back-end e linha de comando. <b>A Artificial Analysis não avalia front-end</b> — esta nota não diz nada sobre construir interface.",
      overlapWhy: "Esta lista é o bloco <b>Código</b> do índice de <b>Capacidade geral</b> (24% da nota dele), isolado — não é uma medida independente dele.",
    },
    en: {
      label: "Coding",
      blockLabel: "Coding", blockWeight: "24%",
      question: "Write, review and fix code.",
      compositionIntro: "a closer look at the <b>coding</b> block of the Intelligence Index (24% of the overall score)",
      compositionParts: [
        { part: "Terminal-Bench v2.1", weight: "2/3", tests: "verified software-engineering and systems-administration tasks" },
        { part: "SciCode", weight: "1/3", tests: "scientific-computing problems in Python" },
      ],
      caveat: "Both tests cover back-end and command-line work. <b>Artificial Analysis does not evaluate front-end work</b> — this score says nothing about interface development.",
      overlapWhy: "This list is the <b>Coding</b> block of the <b>Overall capability</b> index (24% of its score), isolated — it is not an independent measure.",
    },
  },
  {
    id: "agentes",
    primary: "artificial_analysis_agentic_index",
    support: ["terminalbench_v2_1", "tau2_telecom"],
    pt: {
      label: "Agentes e automação",
      blockLabel: "Agentes", blockWeight: "34%",
      question: "Executar tarefas sozinho, usando terminal, ferramentas e APIs.",
      compositionIntro: "o bloco de <b>agentes</b> do Intelligence Index (34% da nota geral, o maior dos quatro), visto de perto",
      compositionParts: [
        { part: "GDPval-AA v2", weight: "20/34", tests: "tarefas de valor econômico real, cobrindo 44 ocupações" },
        { part: "τ³-Banking", weight: "14/34", tests: "atendimento financeiro com busca de informação e uso de ferramentas em várias etapas" },
      ],
      overlapWhy: "Esta lista é o bloco <b>Agentes</b> do índice de <b>Capacidade geral</b> (34% da nota dele), isolado — não é uma medida independente dele.",
    },
    en: {
      label: "Agents and automation",
      blockLabel: "Agents", blockWeight: "34%",
      question: "Complete tasks autonomously using terminals, tools and APIs.",
      compositionIntro: "a closer look at the <b>agents</b> block of the Intelligence Index (34% of the overall score, the largest block)",
      compositionParts: [
        { part: "GDPval-AA v2", weight: "20/34", tests: "real economic-value tasks across 44 occupations" },
        { part: "τ³-Banking", weight: "14/34", tests: "multi-step financial service with information retrieval and tool use" },
      ],
      overlapWhy: "This list is the <b>Agents</b> block of the <b>Overall capability</b> index (34% of its score), isolated — it is not an independent measure.",
    },
  },
];

/* ─── Ordenações (os "filtros" da lista) ─── */

export type GuideSortId = "best" | "value" | "fast";

export const GUIDE_SORTS: Array<{ id: GuideSortId; pt: { label: string; hint: string; bar: string }; en: { label: string; hint: string; bar: string } }> = [
  {
    id: "best",
    pt: {
      label: "Mais capaz",
      hint: "Os modelos estão na ordem da pontuação nesta categoria. A barra mostra o quão perto cada um está do líder.",
      bar: "pontos",
    },
    en: {
      label: "Most capable",
      hint: "Models are ordered by their score in this category. The bar shows how close each one is to the leader.",
      bar: "score",
    },
  },
  {
    id: "value",
    pt: {
      label: "Custo-benefício",
      hint: "Ordenado pela melhor pontuação por dólar — entre os modelos que ficam a até 12% do líder em pontuação (o piso de qualidade), não o mais barato. A barra mostra essa eficiência.",
      bar: "pts/$",
    },
    en: {
      label: "Best value",
      hint: "Ordered by the best score per dollar — among models within 12% of the leader’s score (the quality floor), not the cheapest. The bar shows that efficiency.",
      bar: "pts/$",
    },
  },
  {
    id: "fast",
    pt: {
      label: "Mais rápido",
      hint: "Ordenado pela velocidade de resposta, em tokens por segundo — entre os modelos dentro do piso de qualidade. A barra mostra a velocidade relativa.",
      bar: "tok/s",
    },
    en: {
      label: "Fastest",
      hint: "Ordered by response speed in tokens per second — among models above the quality floor. The bar shows relative speed.",
      bar: "tok/s",
    },
  },
];

// ─── Identidade de modelo (SEM apelidos — ver cabeçalho do arquivo) ───

export function guideModelKey(name: unknown) {
  return String(name == null ? "" : name).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// ─── Acesso aos dados ───

export function benchByKey(data: GuideData, key: string): GuideBenchmark | null {
  return data.benchmarks.find((bench) => bench.key === key) || null;
}

export function primaryBench(data: GuideData, category: GuideCategory): GuideBenchmark | null {
  return benchByKey(data, category.primary);
}

export function categoryHasData(data: GuideData, category: GuideCategory) {
  const bench = primaryBench(data, category);
  return Boolean(bench && bench.top.length);
}

/* Primeira categoria com dados vira a ativa — nunca abre numa aba vazia. */
export function firstCategoryWithData(data: GuideData): GuideCategory | null {
  return GUIDE_CATEGORIES.find((category) => categoryHasData(data, category)) || null;
}

// ─── Mapas de posto ───

/* Nota e posto de TODAS as famílias avaliadas num benchmark (lista completa),
   para a comparação e os "outros testes": um modelo tem nota e posto mesmo
   fora do top-20 exibido. */
export function rankMap(bench: GuideBenchmark) {
  const map = new Map<string, { score: number; rank: number; isFraction: boolean }>();
  bench.entries.forEach((entry, index) => {
    map.set(guideModelKey(entry.model), { score: entry.score, rank: index + 1, isFraction: bench.isFraction });
  });
  return map;
}

/* Maior pontuação da lista completa — para escalar barrinhas relativas ao
   líder, não a uma faixa arbitrária. */
export function maxScore(bench: GuideBenchmark) {
  let top = 0;
  for (const entry of bench.entries) if (entry.score > top) top = entry.score;
  return top;
}

// ─── Correlação de postos entre dois rankings ───

/* Serve para DECLARAR ao leitor o quanto duas abas repetem a mesma ordem —
   necessário porque as três categorias são o mesmo índice e dois blocos dele.
   Calculado em runtime, de propósito: se a AA mudar a composição dos índices,
   o número no site acompanha em vez de virar afirmação velha no texto. Os
   postos são recalculados DENTRO da interseção (usar a posição na lista
   original daria rho fora de [-1,1] com listas de tamanhos diferentes).
   Mantemos o desempate ordinal da referência, pela ordem de score. */
export function spearman(benchA: GuideBenchmark, benchB: GuideBenchmark) {
  if (!benchA || !benchB) return null;
  const scoresA = new Map(benchA.entries.map((entry) => [guideModelKey(entry.model), entry.score]));
  const scoresB = new Map(benchB.entries.map((entry) => [guideModelKey(entry.model), entry.score]));
  const keys = [...scoresA.keys()].filter((key) => scoresB.has(key));
  const n = keys.length;
  if (n < 10) return null; // interseção pequena demais para afirmar algo
  const ranksOf = (scores: Map<string, number>) => {
    const ranks = new Map<string, number>();
    keys.slice().sort((left, right) => (scores.get(right) || 0) - (scores.get(left) || 0))
      .forEach((key, index) => ranks.set(key, index + 1));
    return ranks;
  };
  const ranksA = ranksOf(scoresA);
  const ranksB = ranksOf(scoresB);
  let squared = 0;
  for (const key of keys) {
    const difference = (ranksA.get(key) || 0) - (ranksB.get(key) || 0);
    squared += difference * difference;
  }
  return { rho: 1 - (6 * squared) / (n * (n * n - 1)), n };
}

/* Quantos dos 20 primeiros de um ranking também estão nos 20 primeiros do outro. */
export function topOverlap(benchA: GuideBenchmark, benchB: GuideBenchmark) {
  const a = benchA.top.slice(0, 20).map((entry) => guideModelKey(entry.model));
  const b = new Set(benchB.top.slice(0, 20).map((entry) => guideModelKey(entry.model)));
  return { on: a.filter((key) => b.has(key)).length, total: a.length };
}

/* Os números da sobreposição de uma categoria contra as outras, já rotulados
   no idioma pedido; quem formata e monta a frase é a interface. */
export type GuideOverlapBit = { label: string; rho: number; n: number; on: number; total: number };

export function overlapBits(data: GuideData, category: GuideCategory, english: boolean): GuideOverlapBit[] | null {
  const mine = primaryBench(data, category);
  if (!mine) return null;
  const bits: GuideOverlapBit[] = [];
  for (const other of GUIDE_CATEGORIES) {
    if (other.id === category.id) continue;
    const bench = primaryBench(data, other);
    if (!bench) continue;
    const correlation = spearman(mine, bench);
    if (!correlation) continue;
    const overlap = topOverlap(mine, bench);
    bits.push({
      label: english ? other.en.label : other.pt.label,
      rho: correlation.rho,
      n: correlation.n,
      on: overlap.on,
      total: overlap.total,
    });
  }
  return bits.length ? bits : null;
}

// ─── Ordenação da lista ───

export type GuideRow = {
  entry: GuideEntry;
  /* Posição na ordenação "mais capaz" (a lista já vem ordenada por nota) —
     exibida ao lado do nome quando a outra ordenação a muda. */
  baseRank: number;
  /* Valor do critério ativo, para desenhar a barra. */
  metric: number;
  /* Abaixo do piso de qualidade: não concorre nas ordenações alternativas
     (fica no fim da lista, sem barra). */
  belowFloor: boolean;
};

/* Reordena o top-20 da categoria pelo critério escolhido. Em "custo-benefício"
   e "mais rápido" só concorre quem fica a até 12% do líder em pontuação
   (FLOOR): sem esse piso, o mais barato do ranking seria sempre o pior.
   Sem preço/velocidade publicado, o modelo desce para o fim com metric 0 —
   ausência é tratada como ausência, nunca como zero competitivo. */
export function rankedList(bench: GuideBenchmark, mode: GuideSortId): GuideRow[] {
  const items = bench.top.map((entry, index) => ({ entry, baseRank: index + 1 }));
  if (mode === "value" || mode === "fast") {
    const leaderScore = bench.top.reduce((top, entry) => Math.max(top, entry.score), 0);
    const floorCut = leaderScore * FLOOR;
    const competes = items.filter((row) => row.entry.score >= floorCut);
    const below = items
      .filter((row) => row.entry.score < floorCut)
      .map((row) => ({ ...row, metric: 0, belowFloor: true }));
    const has = mode === "value"
      ? (entry: GuideEntry) => (entry.pricePerMillion || 0) > 0
      : (entry: GuideEntry) => (entry.tokensPerSecond || 0) > 0;
    const metricOf = mode === "value"
      ? (entry: GuideEntry) => entry.score / (entry.pricePerMillion || 1)
      : (entry: GuideEntry) => entry.tokensPerSecond || 0;
    const ranked = competes
      .filter((row) => has(row.entry))
      .map((row) => ({ ...row, metric: metricOf(row.entry), belowFloor: false }))
      .sort((left, right) => right.metric - left.metric);
    const without = competes
      .filter((row) => !has(row.entry))
      .map((row) => ({ ...row, metric: 0, belowFloor: false }));
    return ranked.concat(without, below);
  }
  // best — já vem por pontuação.
  return items.map((row) => ({ ...row, metric: row.entry.score, belowFloor: false }));
}

/* Percentual da barra de cada linha, com piso visual (barrinha de 4% para
   valores positivos, senão some). */
export function barPercent(row: GuideRow, maxMetric: number) {
  return maxMetric > 0 && row.metric > 0 ? Math.max(4, (row.metric / maxMetric) * 100) : 0;
}

// ─── Benchmarks de apoio ───

export type GuideSupportMap = {
  bench: GuideBenchmark;
  map: Map<string, { score: number; rank: number; isFraction: boolean }>;
  max: number;
};

/* Apoios da categoria — só os que casam com os modelos atuais. Descarta
   apoios estagnados (casam < 5 dos 20 do ranking principal e só gerariam
   "—"): rede contra envelhecimento futuro da fonte. Com a chave free NENHUM
   apoio existe (são todos Pro-only): ficam declarados de propósito — voltam
   sozinhos se a chave virar Pro. */
export function supportMaps(data: GuideData, category: GuideCategory, minMatches = 5): GuideSupportMap[] {
  const primary = primaryBench(data, category);
  if (!primary) return [];
  return category.support
    .map((key) => benchByKey(data, key))
    .filter((bench): bench is GuideBenchmark => Boolean(bench && bench.top.length))
    .map((bench) => ({ bench, map: rankMap(bench), max: maxScore(bench) }))
    .filter((support) => primary.top.filter((entry) => support.map.has(guideModelKey(entry.model))).length >= minMatches);
}

// ─── Índice de modelos entre categorias (busca e comparação) ───

export type GuideProfile = {
  key: string;
  name: string;
  company: string;
  /* Nota e posto em cada categoria onde o modelo foi avaliado (da lista
     completa — um modelo aparece mesmo fora do top-20 exibido). */
  cats: Record<string, { score: number; rank: number; isFraction: boolean }>;
  price: number | null;
  speed: number;
};

export function buildModelIndex(data: GuideData): Map<string, GuideProfile> {
  const index = new Map<string, GuideProfile>();
  const ensure = (key: string, name: string, company: string) => {
    let profile = index.get(key);
    if (!profile) {
      profile = { key, name, company, cats: {}, price: null, speed: 0 };
      index.set(key, profile);
    }
    return profile;
  };
  for (const category of GUIDE_CATEGORIES) {
    const bench = primaryBench(data, category);
    if (!bench) continue;
    // Notas e postos: da lista completa.
    bench.entries.forEach((entry, position) => {
      const profile = ensure(guideModelKey(entry.model), entry.model, entry.company);
      profile.cats[category.id] = { score: entry.score, rank: position + 1, isFraction: bench.isFraction };
    });
    // Preço/velocidade: só existem nas linhas ricas do top-20.
    bench.top.forEach((entry) => {
      const profile = ensure(guideModelKey(entry.model), entry.model, entry.company);
      if (profile.price == null && (entry.pricePerMillion || 0) > 0) profile.price = entry.pricePerMillion;
      if (!profile.speed && (entry.tokensPerSecond || 0) > 0) profile.speed = entry.tokensPerSecond!;
    });
  }
  return index;
}

/* Sugestões da busca: casa por nome (com acento ou caixa) ou pela chave
   normalizada; quem já está na bandeja não é sugerido de novo. */
export function searchSuggestions(index: Map<string, GuideProfile>, query: string, compare: string[], limit = 8): GuideProfile[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const normalized = guideModelKey(text);
  return [...index.values()]
    .filter((profile) => profile.name.toLowerCase().includes(text) || (normalized && profile.key.includes(normalized)))
    .filter((profile) => !compare.includes(profile.key))
    .slice(0, limit);
}

/* Bandeja de comparação: remove quem já está; adiciona até o teto e ignora
   quem não cabe (o botão também desabilita, mas a função é a garantia). */
export function toggleCompareKey(compare: string[], key: string, max = MAX_COMPARE): string[] {
  if (compare.includes(key)) return compare.filter((item) => item !== key);
  if (compare.length >= max) return compare;
  return [...compare, key];
}

/* Tabela de comparação: quem vence em cada linha é a melhor nota ENTRE os
   comparados (não o líder global); empate de nota = vitória para ambos. O
   placar conta só nas categorias de capacidade — preço (menor vence) e
   velocidade (maior vence) só ganham destaque na própria linha. */
export type CompareCell = {
  value: number;
  rank: number;
  isFraction: boolean;
  isWinner: boolean;
  isLeader: boolean;
  isEvaluated: boolean;
};

export type CompareRow = {
  categoryId: string;
  label: string;
  kind: "category" | "price" | "speed";
  cells: Array<CompareCell | null>;
};

export type Comparison = {
  rows: CompareRow[];
  wins: number[];
  maxWins: number;
};

export function comparisonTable(profiles: GuideProfile[], english: boolean): Comparison {
  const wins = new Map(profiles.map((profile) => [profile.key, 0]));
  const bestAmong = (categoryId: string) => {
    let best: number | null = null;
    for (const profile of profiles) {
      const entry = profile.cats[categoryId];
      if (entry && (best === null || entry.score > best)) best = entry.score;
    }
    return best;
  };
  const rows: CompareRow[] = [];
  for (const category of GUIDE_CATEGORIES) {
    const best = bestAmong(category.id);
    if (best === null) continue;
    for (const profile of profiles) {
      const entry = profile.cats[category.id];
      if (entry && entry.score === best) wins.set(profile.key, (wins.get(profile.key) || 0) + 1);
    }
    rows.push({
      categoryId: category.id,
      label: english ? category.en.label : category.pt.label,
      kind: "category",
      cells: profiles.map((profile) => {
        const entry = profile.cats[category.id];
        if (!entry) return null;
        return { value: entry.score, rank: entry.rank, isFraction: entry.isFraction, isWinner: entry.score === best, isLeader: entry.rank === 1, isEvaluated: true };
      }),
    });
  }
  const prices = profiles.map((profile) => profile.price).filter((price): price is number => price != null && price > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const speeds = profiles.map((profile) => profile.speed).filter((speed) => speed > 0);
  const maxSpeed = speeds.length ? Math.max(...speeds) : null;
  rows.push({
    categoryId: "price",
    label: english ? "Price" : "Preço",
    kind: "price",
    cells: profiles.map((profile) => {
      if (profile.price == null || profile.price <= 0) return null;
      return { value: profile.price, rank: 0, isFraction: false, isWinner: minPrice !== null && profile.price === minPrice, isLeader: false, isEvaluated: true };
    }),
  });
  rows.push({
    categoryId: "speed",
    label: english ? "Speed" : "Velocidade",
    kind: "speed",
    cells: profiles.map((profile) => {
      if (!profile.speed) return null;
      return { value: profile.speed, rank: 0, isFraction: false, isWinner: maxSpeed !== null && profile.speed === maxSpeed, isLeader: false, isEvaluated: true };
    }),
  });
  const winList = profiles.map((profile) => wins.get(profile.key) || 0);
  return { rows, wins: winList, maxWins: winList.reduce((top, count) => Math.max(top, count), 0) };
}

// ─── Formatação ───

export function formatGuideScore(isFraction: boolean, value: number | null | undefined, english = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const text = isFraction ? value.toFixed(1) : String(value);
  return `${english ? text : text.replace(".", ",")}${isFraction ? "%" : ""}`;
}

/* Preço 0 na AA significa "sem preço publicado" (modelo aberto ou não
   ofertado por API), não "de graça" — tratado como ausente, nunca grátis. */
export function formatGuidePrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return `$${value.toFixed(2)}/M`;
}

export function formatGuideSpeed(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return `${Math.round(value)} tok/s`;
}

// ─── Deep-link guia → régua ───

/* O guia linka o modelo para a régua com o hash `#panorama?modelo=<nome na
   régua>` (identidade COM apelidos, resolvida pelo componente com
   panoramaData); empresa sem modelo na régua linka `#panorama?empresa=`
   para abrir a régua já filtrada. O parse aqui é o inverso: a régua lê o
   próprio hash e atende o pedido. */
export type RulerDeepLink = { model: string; company: string; date: string };

export function parseRulerDeepLink(hash: string): RulerDeepLink | null {
  const match = hash.match(/^#panorama\?(.+)$/);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const model = params.get("modelo") || params.get("model") || "";
  const company = params.get("empresa") || params.get("company") || "";
  if (!model && !company) return null;
  return { model, company, date: params.get("data") || "" };
}

export function rulerModelHref(model: string, company = "", date = "") {
  return `#panorama?modelo=${encodeURIComponent(model)}${company ? `&empresa=${encodeURIComponent(company)}` : ""}${date ? `&data=${encodeURIComponent(date)}` : ""}`;
}

export function rulerCompanyHref(company: string) {
  return `#panorama?empresa=${encodeURIComponent(company)}`;
}

export function guideModelHref(model: string) {
  return `#panorama/guia?modelo=${encodeURIComponent(guideModelKey(model))}`;
}

export function parseGuideDeepLink(hash: string) {
  const match = hash.match(/^#panorama\/guia\?(.+)$/);
  return match ? guideModelKey(new URLSearchParams(match[1]).get("modelo")) : "";
}
