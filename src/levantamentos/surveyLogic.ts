// Lógica pura do levantamento de políticas de IA: sem imports, para ser testada isoladamente.

export type PolicyRow = {
  nome: string; tipo: string; area: string; sub: string; geo: string; ano?: number | null;
  gen: string; loc: string; rev: string; img: string; verif: string; url?: string; nota?: string;
};

export const AREA_ORDER = ["EXA", "BIO", "ENG", "SAU", "AGR", "SOC", "HUM", "LLA", "MUL"] as const;
export const AREA_SHORT: Record<string, string> = {
  EXA: "Exatas e da Terra", BIO: "Biológicas", ENG: "Engenharias", SAU: "Saúde", AGR: "Agrárias",
  SOC: "Sociais Aplicadas", HUM: "Humanas", LLA: "Linguística, Letras e Artes", MUL: "Multidisciplinar",
};
export const GEN_CATEGORIES = ["Permitida", "Restrita", "Vedada", "Sem regra"] as const;
export const REV_CATEGORIES = ["Condicionado", "Vedado", "Não trata"] as const;
export const CATEGORY_LABEL: Record<string, string> = {
  Permitida: "Permite, com condições", Restrita: "Restringe à edição", Vedada: "Veda", "Sem regra": "Sem regra",
  Condicionado: "Condicionado", Vedado: "Veda", "Não trata": "Não trata", "N/A": "Não se aplica",
};
export const VERIFICATION_LABEL: Record<string, string> = {
  P: "Fonte primária", S: "Fonte secundária", H: "Regra herdada", A: "Ausência verificada", NL: "Não localizado",
};

export const isBrazilian = (row: PolicyRow) => String(row.geo || "").startsWith("Brasil");
// Organismos transversais e agências de fomento não publicam artigos: ficam fora das comparações entre áreas.
export const comparableRows = (rows: PolicyRow[]) => rows.filter(row => row.tipo !== "Agência de fomento" && row.tipo !== "Organismo transversal");
export const brazilianJournals = (rows: PolicyRow[]) => rows.filter(row => isBrazilian(row) && row.tipo === "Periódico");

const hasRule = (row: PolicyRow) => ["Permitida", "Restrita", "Vedada"].includes(row.gen);

export type Ratio = { count: number; total: number };
// Indicadores do mapa por área; os marcados com "*" usam como denominador só quem tem regra sobre o tema.
export const AREA_INDICATORS: Array<{ label: string; note?: string; compute: (rows: PolicyRow[]) => Ratio }> = [
  { label: "Sem regra localizada", compute: rows => ({ count: rows.filter(r => r.gen === "Sem regra").length, total: rows.filter(r => r.gen !== "N/A").length }) },
  { label: "Restringe ou veda gerar texto", note: "*", compute: rows => ({ count: rows.filter(r => r.gen === "Restrita" || r.gen === "Vedada").length, total: rows.filter(hasRule).length }) },
  { label: "Veda IA na revisão", note: "*", compute: rows => ({ count: rows.filter(r => r.rev === "Vedado").length, total: rows.filter(r => r.rev !== "Não trata").length }) },
  { label: "Exige formato específico", note: "*", compute: rows => ({ count: rows.filter(r => r.loc === "Seção própria" || r.loc === "Nota de rodapé").length, total: rows.filter(hasRule).length }) },
  { label: "Tem regra para imagens", compute: rows => ({ count: rows.filter(r => r.img !== "Não trata").length, total: rows.length }) },
  { label: "Entidades brasileiras", compute: rows => ({ count: rows.filter(isBrazilian).length, total: rows.length }) },
];

export function percent({ count, total }: Ratio) {
  return total ? Math.round((count / total) * 100) : 0;
}

// Contagem por categoria; "N/A" não entra no denominador e é informado à parte, para não sumir sem aviso.
export function categoryCounts(rows: PolicyRow[], field: "gen" | "rev", categories: readonly string[]) {
  const applicable = rows.filter(row => row[field] !== "N/A");
  return {
    total: applicable.length,
    notApplicable: rows.length - applicable.length,
    parts: categories.map(category => ({ category, rows: applicable.filter(row => row[field] === category) })),
  };
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) || 0) + 1);
  return counts;
}

export type PolicyFilters = { query: string; area: string; type: string; gen: string; rev: string; scope: "" | "br" | "int" };

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterPolicies(rows: PolicyRow[], filters: PolicyFilters) {
  const query = fold(filters.query.trim());
  return rows.filter(row =>
    (!filters.area || row.area === filters.area)
    && (!filters.type || row.tipo === filters.type)
    && (!filters.gen || row.gen === filters.gen)
    && (!filters.rev || row.rev === filters.rev)
    && (!filters.scope || (filters.scope === "br" ? isBrazilian(row) : !isBrazilian(row)))
    && (!query || fold(`${row.nome} ${row.sub} ${row.nota || ""} ${row.geo}`).includes(query)));
}

// Sub-rotas do levantamento: a aba vem do hash, para os links e o botão voltar funcionarem.
export const SURVEY_TABS = [
  { key: "", label: "Visão geral" }, { key: "areas", label: "Por área" }, { key: "comparar", label: "Comparar áreas" },
  { key: "entidades", label: "Entidades" }, { key: "brasil", label: "Brasil" }, { key: "autores", label: "Para autores e pareceristas" },
  { key: "metodo", label: "Método e fontes" },
] as const;
export const SURVEY_BASE = "#levantamentos/politicas-ia";

export function surveyTab(hash: string) {
  const path = hash.split("?")[0];
  const key = path.startsWith(`${SURVEY_BASE}/`) ? path.slice(SURVEY_BASE.length + 1) : "";
  return SURVEY_TABS.some(tab => tab.key === key) ? key : "";
}

// Negrito em markdown simples (**texto**) vira trechos marcados; o resto do texto é exibido literalmente.
export function boldSegments(text: string) {
  return String(text || "").split(/(\*\*.+?\*\*)/g).filter(Boolean).map(part => part.startsWith("**") && part.endsWith("**") ? { bold: true, text: part.slice(2, -2) } : { bold: false, text: part });
}
