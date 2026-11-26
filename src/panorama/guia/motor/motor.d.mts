export const AREAS: Record<string, string>;
export const AREA_KEYS: string[];
export const ORDEM_ESFORCO: string[];
export const EMPATE: number;
export const LIMITE_LINHAS: number;
export const PONTOS_POR_DOBRA: number;
export const TEMPO_MAX_DEGRAU: number;
export const INDICES_AA: Record<string, string>;
export const FONTES_POR_FERRAMENTA: Record<string, string[]>;
export const SELOS: Record<string, unknown>;
export const METODO: Record<string, unknown>;
export const FERRAMENTAS: Record<string, unknown>;

export const fmt: {
  nota: (v: number | null | undefined) => string;
  custo: (v: number | null | undefined) => string;
  tempo: (v: number | null | undefined) => string;
  esforco: (e: string) => string;
  pontos: (v: number | null | undefined) => string;
};

export function carregar(dados?: {
  modelos?: unknown;
  fontes?: unknown;
  planos?: unknown;
  perfis?: unknown;
}): unknown;

export function fontesDe(base: unknown, ferramenta: string): unknown;
export function normal(t: unknown): string;
export function achar_modelo(base: unknown, params?: { texto?: string; esforco?: string | null }): unknown;
export function placar(base: unknown, params?: { area?: string; tolerancia?: number; filtros?: Record<string, unknown> }): unknown;
export function ranking(base: unknown, params?: { area?: string; perfil?: string | null; ordenar?: string; limite?: number; filtros?: Record<string, unknown> }, options?: { completo?: boolean }): unknown;
export function perfil_tarefa(base: unknown, params?: { perfil?: string; ordenar?: string; limite?: number; filtros?: Record<string, unknown> }): unknown;
export function escada(base: unknown, params?: { modelo: string; esforco?: string | null; area?: string }): unknown;
export function selo(baixo: unknown, alto: unknown, k?: string): unknown;
export function veredito(seloChave: string, subindo: boolean): unknown;
export function degrau(base: unknown, params?: { modelo: string; de?: string | null; para?: string | null; area?: string }): unknown;
export function comparar(base: unknown, params?: { itens?: unknown[]; areas?: string[] }): unknown;
export function parecidos(base: unknown, params?: { modelo: string; esforco?: string | null; area?: string; tolerancia?: number; limite?: number }): unknown;
export function outras_fontes(base: unknown, params?: { modelo?: string }): unknown;
export function comparar_fontes(base: unknown, params?: { itens?: unknown[] }): unknown;
export function abismo(base: unknown, params?: { empresa?: string | null; so_escada_completa?: boolean; limite?: number; area?: string }): unknown;
export function montar_time(base: unknown, params?: { planos?: string[]; extras?: string[]; escolhidos?: Record<string, string> }): unknown;
export function explicar_metodo(base: unknown, params?: { tema?: string }): unknown;
export function opcoes(base: unknown): unknown;
export function chamar(base: unknown, nome: string, params?: Record<string, unknown>): unknown;
