/* Dados fictícios e mínimos para testar o contrato, sem copiar o catálogo
   nem a prosa editorial do Panorama para o Observatório. */
export function freeFixture() {
  return {
    updatedAt: "2026-10-01", source: { name: "Fonte de teste", url: "https://example.org/source", attribution: "Atribuição", lastChecked: "2026-09-30", schemaVersion: 2 },
    categories: [{ id: "todos", label: "Todos" }, { id: "pesquisa", label: "Pesquisa" }, { id: "codigo", label: "Código" }],
    items: [
      { id: "alpha", name: "Alpha", company: "Exemplo", category: "pesquisa", badge: "Busca", highlight: "Pesquisa acadêmica", freeQuota: "Duas consultas", limits: "Limite de teste", bestFor: "Ciência", howToAccess: "Conta", link: "https://example.org/alpha", tags: ["áudio"], freeModel: "Modelo A" },
      { id: "beta", name: "Beta", company: "Oficina", category: "codigo", badge: "CLI", highlight: "Código", freeQuota: "Uma sessão", limits: "Somente teste", bestFor: "Programação", howToAccess: "Cadastro", link: "https://example.org/beta", tags: [] },
    ],
  };
}
export function usageFixture() {
  const more = { titulo: "Saiba", corpo: "<strong>Texto</strong>" };
  const text = { titulo: "Título", texto: "Texto `literal`" };
  const side = { titulo: "Lugar", texto: "Texto", consequencia: "Efeito" };
  const link = { texto: "Voltar", href: "#abertura" };
  return {
    updatedAt: "2026-10-01",
    abertura: { titulo: "Abertura", lede: "<strong>Introdução</strong>", paragrafos: ["Parágrafo"], eixos: [{ n: 1, nome: "Acesso", pergunta: "Como?", navegador: side, instalada: side, lastro: "Evidência", regra: "Regra" }], ganho: { titulo: "Ganho", lede: "Texto", itens: [text], custo: "Custo" }, saibaMais: [more] },
    contraponto: { titulo: "Outro lado", lede: "Texto", itens: [text], fecho: "Fim" },
    permanencia: { titulo: "Depois", lede: "Texto", restaTitulo: "Restos", resta: { conversaRotulo: "Conversa", conversa: [{ ok: false, v: "Nada" }], agenteRotulo: "Agente", agente: [{ ok: true, v: "Arquivo" }], nota: "Nota" }, mecanismos: [{ ...text, artefato: { tipo: "arquivo", nome: "REGRAS.md", linhas: ["`literal`", "**literal**"] } }], fecho: "Fim" },
    ferramentas: [{ nome: "Ferramenta", oQueE: "Descrição", destrava: "Função", exemplo: "tool --help" }],
    familias: [{ id: "f", titulo: "Família", subtitulo: "Subtítulo", explicacao: "Texto", itens: [{ nome: "Ferramenta", empresa: "Oficina", instala: "Baixe", instalaAlt: "Alternativa", precisa: "Conta", acesso: "Pasta", link: "https://example.org/tool" }] }],
    ponte: { titulo: "Ponte", lede: "Texto", comandos: [{ cmd: "tool", oQueFaz: "Ajuda" }], integracoesTitulo: "Integrações", integracoesNota: "Nota", integracoes: [{ id: "f", nome: "Ferramenta", nota: "Nota" }], planosTitulo: "Planos", planosNota: "Nota", planos: [{ nome: "Exemplo", preco: "0", credito: "Teste", detalhe: "Cota" }], planosExtra: "Extra", fecho: "Fim" },
    tutoriais: [{ id: "t", nome: "Tutorial", nomeCurto: "Teste", legenda: "Legenda", resumo: "Resumo", objetivo: "Objetivo", minutos: 1, passos: tutorialSteps(), fecho: "Fim" }],
    medicao: { titulo: "Método", lede: "Texto", passos: [text], naoMedidoTitulo: "Limites", naoMedidoLede: "Texto", naoMedido: [{ item: "Tempo", porque: "Sem medida" }], saibaMais: more },
    essencial: { rotulo: "Resumo", intro: "Introdução", conclusoesRotulo: "Conclusões", conclusoes: [{ n: "1", frase: "Frase", prova: "Prova", link }], procedencia: { titulo: "Fonte", texto: "Texto", numeros: [{ valor: "1", rotulo: "Teste" }], link } },
  };
}
export function scenesFixture() {
  const side = { rotulo: "Lugar", sub: "Programa", narrativa: "Narrativa", bom: "Ganho", limite: "Limite" };
  return { fontes: { navegador: { arquivo: "teste.json", rotulo: "Fonte", curto: "Fonte", data: "1/out/2026" }, agente: { arquivos: ["teste.json"], rotulo: "Fonte", curto: "Fonte", data: "1/out/2026" } }, cenas: [{ id: "c", aba: "Exemplo", pergunta: "Como?", navegador: side, instalado: side, diferenca: "Diferença", quandoUsar: { navegador: "Conversa", instalado: "Arquivos" }, saibaMais: { titulo: "Evidência", corpo: "Texto" } }] };
}
export function tutorialSteps() {
  const base = { ato: "Aprender", titulo: "Teste", explicacao: "Explicação" };
  return [
    { ...base, janela: "terminal", cmd: 'tool --name "pasta de teste"', saida: [{ t: "out", v: "Pronto" }] },
    { ...base, janela: "navegador", navegador: { url: "https://example.org/signin", titulo: "Entrar", texto: "Autentique", opcoes: ["Conta de teste"], botao: "Entrei" } },
    { ...base, janela: "dialogo", dialogo: { titulo: "Permitir", linhas: ["Pasta de teste"], botao: "Permitir" } },
    { ...base, janela: "diff", diff: { arquivo: "teste.txt", linhas: [{ t: "menos", v: "antes" }, { t: "mais", v: "depois" }], botoes: ["Aplicar", "Cancelar"] } },
  ];
}
