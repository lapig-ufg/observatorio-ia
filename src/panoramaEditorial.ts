/* Contratos editoriais do site vivo. Este módulo é puro: não guarda textos
   nem busca arquivos, e pode ser transpilado sozinho nos testes. */
export type EditorialLink = { texto: string; href: string };
export type LearnMore = { titulo: string; corpo: string };
export type TextItem = { titulo: string; texto: string };
export type TerminalLine = { t: string; v: string };
export type TutorialStep = {
  ato: string; janela: "terminal" | "navegador" | "dialogo" | "diff";
  titulo: string; explicacao: string; cmd?: string; prompt?: string; nota?: string;
  saida?: TerminalLine[];
  dialogo?: { titulo: string; linhas: string[]; botao: string };
  navegador?: { url: string; titulo: string; texto?: string; opcoes?: string[]; botao?: string };
  diff?: { arquivo: string; linhas: TerminalLine[]; botoes?: string[] };
};
export type Tutorial = {
  id: string; nome: string; nomeCurto: string; legenda: string; resumo: string;
  objetivo: string; minutos: number; passos: TutorialStep[]; fecho: string;
};
type AxisSide = { titulo: string; texto: string; consequencia: string; glossario?: { termo: string; texto: string } };
export type FreeTool = {
  id: string; name: string; company: string; category: string; badge: string;
  highlight: string; freeQuota: string; limits: string; bestFor: string;
  howToAccess: string; link: string; tags: string[];
  freeModel?: string; paidStepUp?: string; theCatch?: string; sourceUrl?: string; rank?: number;
};
export type FreeToolsData = {
  updatedAt: string; updatedText?: string;
  source: { name: string; url: string; attribution: string; lastChecked: string; schemaVersion: number };
  categories: { id: string; label: string }[]; items: FreeTool[];
};
export type UsageData = {
  updatedAt: string;
  abertura: {
    titulo: string; lede: string; paragrafos: string[];
    eixos: { n: number; nome: string; pergunta: string; navegador: AxisSide; instalada: AxisSide; lastro: string; regra: string }[];
    ganho: { titulo: string; lede: string; itens: TextItem[]; custo: string }; saibaMais: LearnMore[];
  };
  contraponto: { titulo: string; lede: string; itens: TextItem[]; fecho: string };
  permanencia: {
    titulo: string; lede: string; restaTitulo: string;
    resta: { conversaRotulo: string; conversa: { ok: boolean; v: string }[]; agenteRotulo: string; agente: { ok: boolean; v: string }[]; nota: string };
    mecanismos: { titulo: string; texto: string; nota?: string; artefato: { tipo: string; nome?: string; linhas: string[] } }[];
    fecho: string;
  };
  ferramentas: { nome: string; oQueE: string; destrava: string; exemplo: string }[];
  familias: {
    id: string; titulo: string; subtitulo: string; explicacao: string;
    itens: { nome: string; empresa: string; instala: string; comando?: boolean; instalaAlt: string; precisa: string; acesso: string; codigoAberto?: boolean; licenca?: string; destaque?: string; link: string }[];
  }[];
  ponte: {
    titulo: string; lede: string; comandos: { cmd: string; oQueFaz: string }[];
    integracoesTitulo: string; integracoesNota: string; integracoes: { id: string; nome: string; nota: string }[];
    planosTitulo: string; planosNota: string; planos: { nome: string; preco: string; credito: string; detalhe: string; destaque?: boolean }[];
    planosExtra: string; fecho: string;
  };
  tutoriais: Tutorial[];
  medicao: { titulo: string; lede: string; passos: TextItem[]; naoMedidoTitulo: string; naoMedidoLede: string; naoMedido: { item: string; porque: string }[]; saibaMais: LearnMore };
  essencial: {
    rotulo: string; intro: string; conclusoesRotulo: string;
    conclusoes: { n: string; frase: string; prova: string; link: EditorialLink }[];
    procedencia: { titulo: string; texto: string; numeros: { valor: string; rotulo: string }[]; link: EditorialLink };
  };
};
export type SceneSide = { rotulo: string; sub: string; narrativa: string; bom: string; limite: string };
export type UsageScenes = {
  fontes: { navegador: { arquivo: string; rotulo: string; curto: string; data: string }; agente: { arquivos: string[]; rotulo: string; curto: string; data: string } };
  cenas: { id: string; aba: string; pergunta: string; navegador: SceneSide; instalado: SceneSide; diferenca: string; quandoUsar: { navegador: string; instalado: string }; saibaMais?: LearnMore | LearnMore[] }[];
};

type Check = (value: unknown, path: string) => void;
function invalid(path: string): never { throw new Error(`Dados editoriais inválidos: ${path}`); }
const str: Check = (v, p) => { if (typeof v !== "string") invalid(p); };
const num: Check = (v, p) => { if (typeof v !== "number" || !Number.isFinite(v)) invalid(p); };
const bool: Check = (v, p) => { if (typeof v !== "boolean") invalid(p); };
const date: Check = (v, p) => {
  str(v, p);
  const day = String(v);
  const parsed = Date.parse(day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day) invalid(p);
};
export function safeEditorialUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
const url: Check = (v, p) => { str(v, p); if (!safeEditorialUrl(String(v))) invalid(p); };
const optional = (check: Check): Check => (v, p) => { if (v !== undefined) check(v, p); };
const list = (check: Check, nonempty = false): Check => (v, p) => {
  if (!Array.isArray(v) || (nonempty && !v.length)) invalid(p);
  v.forEach((entry, i) => check(entry, `${p}[${i}]`));
};
const object = (fields: Record<string, Check>): Check => (v, p) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) invalid(p);
  for (const [key, check] of Object.entries(fields)) check((v as Record<string, unknown>)[key], `${p}.${key}`);
};
const strings = list(str);
const textItem = object({ titulo: str, texto: str });
const more = object({ titulo: str, corpo: str });
const link = object({ texto: str, href: str });
const side = object({ titulo: str, texto: str, consequencia: str, glossario: optional(object({ termo: str, texto: str })) });
const line = object({ t: str, v: str });
const step: Check = (v, p) => {
  object({ ato: str, janela: str, titulo: str, explicacao: str, cmd: optional(str), prompt: optional(str), nota: optional(str), saida: optional(list(line)) })(v, p);
  const s = v as TutorialStep;
  if (s.janela === "terminal") { if (!s.cmd?.trim()) invalid(`${p}.cmd`); }
  else if (s.janela === "dialogo") object({ titulo: str, linhas: strings, botao: str })(s.dialogo, `${p}.dialogo`);
  else if (s.janela === "navegador") object({ url, titulo: str, texto: optional(str), opcoes: optional(strings), botao: optional(str) })(s.navegador, `${p}.navegador`);
  else if (s.janela === "diff") object({ arquivo: str, linhas: list(line), botoes: optional(strings) })(s.diff, `${p}.diff`);
  else invalid(`${p}.janela`);
};
const freeCheck = object({
  updatedAt: date, updatedText: optional(str), source: object({ name: str, url, attribution: str, lastChecked: date, schemaVersion: num }),
  categories: list(object({ id: str, label: str }), true),
  items: list(object({ id: str, name: str, company: str, category: str, badge: str, highlight: str, freeQuota: str, limits: str, bestFor: str, howToAccess: str, link: url, tags: strings, freeModel: optional(str), paidStepUp: optional(str), theCatch: optional(str), sourceUrl: optional(url), rank: optional(num) })),
});
const usageCheck = object({
  updatedAt: date,
  abertura: object({ titulo: str, lede: str, paragrafos: strings, eixos: list(object({ n: num, nome: str, pergunta: str, navegador: side, instalada: side, lastro: str, regra: str }), true), ganho: object({ titulo: str, lede: str, itens: list(textItem), custo: str }), saibaMais: list(more) }),
  contraponto: object({ titulo: str, lede: str, itens: list(textItem), fecho: str }),
  permanencia: object({ titulo: str, lede: str, restaTitulo: str, resta: object({ conversaRotulo: str, conversa: list(object({ ok: bool, v: str })), agenteRotulo: str, agente: list(object({ ok: bool, v: str })), nota: str }), mecanismos: list(object({ titulo: str, texto: str, nota: optional(str), artefato: object({ tipo: str, nome: optional(str), linhas: strings }) })), fecho: str }),
  ferramentas: list(object({ nome: str, oQueE: str, destrava: str, exemplo: str })),
  familias: list(object({ id: str, titulo: str, subtitulo: str, explicacao: str, itens: list(object({ nome: str, empresa: str, instala: str, comando: optional(bool), instalaAlt: str, precisa: str, acesso: str, codigoAberto: optional(bool), licenca: optional(str), destaque: optional(str), link: url })) })),
  ponte: object({ titulo: str, lede: str, comandos: list(object({ cmd: str, oQueFaz: str })), integracoesTitulo: str, integracoesNota: str, integracoes: list(object({ id: str, nome: str, nota: str })), planosTitulo: str, planosNota: str, planos: list(object({ nome: str, preco: str, credito: str, detalhe: str, destaque: optional(bool) })), planosExtra: str, fecho: str }),
  tutoriais: list(object({ id: str, nome: str, nomeCurto: str, legenda: str, resumo: str, objetivo: str, minutos: num, passos: list(step, true), fecho: str }), true),
  medicao: object({ titulo: str, lede: str, passos: list(textItem), naoMedidoTitulo: str, naoMedidoLede: str, naoMedido: list(object({ item: str, porque: str })), saibaMais: more }),
  essencial: object({ rotulo: str, intro: str, conclusoesRotulo: str, conclusoes: list(object({ n: str, frase: str, prova: str, link })), procedencia: object({ titulo: str, texto: str, numeros: list(object({ valor: str, rotulo: str })), link }) }),
});
const sceneSide = object({ rotulo: str, sub: str, narrativa: str, bom: str, limite: str });
const scenesCheck = object({
  fontes: object({ navegador: object({ arquivo: str, rotulo: str, curto: str, data: str }), agente: object({ arquivos: strings, rotulo: str, curto: str, data: str }) }),
  cenas: list(object({ id: str, aba: str, pergunta: str, navegador: sceneSide, instalado: sceneSide, diferenca: str, quandoUsar: object({ navegador: str, instalado: str }), saibaMais: optional((v, p) => Array.isArray(v) ? list(more)(v, p) : more(v, p)) }), true),
});

export function editorialFromScript(source: string, name: "GRATUITOS_DATA"): FreeToolsData;
export function editorialFromScript(source: string, name: "COMO_USAR_DATA"): UsageData;
export function editorialFromScript(source: string, name: "COMO_USAR_CENAS"): UsageScenes;
export function editorialFromScript(source: string, name: "GRATUITOS_DATA" | "COMO_USAR_DATA" | "COMO_USAR_CENAS") {
  // Só estas constantes do domínio editorial do Panorama podem sair da
  // avaliação, como em panoramaConfigFromDataJs. Não é um sandbox de código.
  if (!["GRATUITOS_DATA", "COMO_USAR_DATA", "COMO_USAR_CENAS"].includes(name)) invalid("constante");
  const value: unknown = new Function("window", "document", `"use strict";\n${source}\n;return typeof ${name} === 'undefined' ? null : ${name};`)(undefined, undefined);
  ({ GRATUITOS_DATA: freeCheck, COMO_USAR_DATA: usageCheck, COMO_USAR_CENAS: scenesCheck })[name](value, name);
  if (name === "GRATUITOS_DATA") {
    const data = value as FreeToolsData;
    const categories = new Set(data.categories.map(c => c.id));
    if (!categories.has("todos") || categories.size !== data.categories.length || new Set(data.items.map(i => i.id)).size !== data.items.length || data.items.some(i => !categories.has(i.category))) invalid("categorias/ids");
  }
  return value as FreeToolsData | UsageData | UsageScenes;
}

export function escapeEditorial(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function editorialText(value: string) {
  // Código é literal, inclusive asteriscos dentro dele. Primeiro escapa HTML;
  // depois reconhece os dois marcadores sem reprocessar o conteúdo de <code>.
  const format = (escaped: string): string => escaped.replace(/`([^`]+)`|\*\*((?:`[^`]*`|[^*])+)\*\*/g, (_match, code: string | undefined, strong: string | undefined) => code !== undefined ? `<code>${code}</code>` : `<strong>${format(strong || "")}</strong>`);
  return format(escapeEditorial(value));
}
export function editorialHtml(value: string) {
  // Os campos editoriais que aceitam HTML só usam estas quatro tags, sem
  // atributos. Qualquer tag nova fica visível até que seu contrato seja revisto.
  return escapeEditorial(value).replace(/&lt;(\/?(?:strong|em|code)|br\s*\/?)&gt;/gi, "<$1>");
}
export function filterFreeTools(items: FreeTool[], category: string, query: string) {
  const key = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const search = key(query.trim());
  return items.filter(i => (category === "todos" || i.category === category) && (!search || key([i.name, i.company, i.highlight, i.freeModel, i.freeQuota, i.bestFor, ...i.tags].join(" ")).includes(search)));
}

export type SimulatorState = { step: number; phase: "guide" | "done" | "end"; input: string; attempts: { command: string; error: string }[] };
export type SimulatorAction = { type: "type"; value: string } | { type: "submit" | "demonstrate" | "next" | "back" | "restart" };
export const initialSimulatorState = (): SimulatorState => ({ step: 0, phase: "guide", input: "", attempts: [] });
export function simulatorTransition(state: SimulatorState, action: SimulatorAction, steps: TutorialStep[], english = false): SimulatorState {
  if (!steps.length) return state;
  const step = steps[state.step];
  if (action.type === "restart") return initialSimulatorState();
  if (action.type === "back") return state.step > 0 ? { ...initialSimulatorState(), step: state.step - 1 } : state;
  if (action.type === "next") {
    if (state.phase !== "done" && (state.phase !== "guide" || step.janela === "terminal")) return state;
    return state.step === steps.length - 1 ? { ...state, phase: "end" } : { ...initialSimulatorState(), step: state.step + 1 };
  }
  if (state.phase !== "guide") return state;
  if (action.type === "type") return { ...state, input: action.value };
  if (action.type === "demonstrate" || !step.cmd || state.input.trim() === step.cmd.trim()) return { ...state, input: step.cmd || "", phase: "done" };
  const command = state.input.trim();
  if (!command) return state;
  const program = command.split(/\s+/)[0];
  const expected = step.cmd.split(/\s+/)[0];
  const error = program !== expected ? `bash: ${program}: command not found` : `${expected}: ${english ? "syntax error — check the command" : "erro de sintaxe — confira o comando"}`;
  return { ...state, input: "", attempts: [...state.attempts, { command, error }] };
}
export function commandMirror(input: string, command: string) {
  let prefix = 0;
  while (prefix < input.length && input[prefix] === command[prefix]) prefix++;
  return { correct: input.slice(0, prefix), incorrect: input.slice(prefix), remaining: command.slice(input.length) };
}
