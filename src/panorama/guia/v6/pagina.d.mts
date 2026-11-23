export type MontarOpcoes = {
  endereco: string;
  carregarDados: () => Promise<{
    modelos: unknown;
    fontes: unknown;
    planos: unknown;
    empresas?: Record<string, { cor?: string; logo_svg_path?: string | null }>;
  }>;
  aoEvento?: (nome: string, valor: string) => void;
  corujaUrl?: string;
};

export function montar(raiz: HTMLElement, opcoes: MontarOpcoes): () => void;
