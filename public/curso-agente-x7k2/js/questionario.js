// Questionário do levantamento e acesso aos dados.
// As opções são fixas: mudar qualquer texto ou a ordem exige subir VERSAO,
// para que as respostas de turmas diferentes continuem comparáveis.
//
// Sem window.LEVANTAMENTO_URL, tudo funciona em modo de demonstração:
// as respostas ficam só neste navegador (localStorage).

(() => {
  const VERSAO = 1;

  const PERGUNTAS = [
    {
      id: "q1", curta: "Frequência",
      texto: "Com que frequência você usa IA?",
      opcoes: ["Nunca usei", "Já testei, mas não uso", "Algumas vezes por mês", "Toda semana", "Todo dia"],
    },
    {
      id: "q2", curta: "Qual IA",
      texto: "Qual IA você mais usa?",
      opcoes: ["ChatGPT", "Gemini", "Claude", "Copilot", "Meta AI", "Outra", "Nenhuma"],
    },
    {
      id: "q3", curta: "Até onde",
      texto: "O que você já fez com IA? Marque o ponto mais distante.",
      opcoes: [
        "Só conversei no chat",
        "Enviei arquivos para resumir ou revisar",
        "Pedi planilha, fórmula ou código",
        "Deixei a IA mexer em arquivos no meu computador",
      ],
    },
    {
      id: "q4", curta: "Preocupação",
      texto: "O que mais te preocupa ao usar IA?",
      opcoes: [
        "Respostas erradas ou inventadas",
        "Privacidade dos meus dados",
        "Estragar ou perder arquivos",
        "Não saber pedir direito",
        "Depender demais dela",
      ],
    },
  ];

  const url = () => window.LEVANTAMENTO_URL || "";
  const CHAVE_DEMO = "curso-levantamento-demo-v" + VERSAO;

  const lerDemo = () => {
    try { return JSON.parse(localStorage.getItem(CHAVE_DEMO) || "[]"); } catch { return []; }
  };
  const gravarDemo = (linhas) => {
    try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(linhas)); } catch { /* sem armazenamento: segue sem gravar */ }
  };

  // Linha: { t: carimbo ms, turma, r: [i1, i2, i3, i4] } (índices das opções)
  async function enviar(turma, respostas) {
    const linha = { t: Date.now(), turma: turma || "VISITANTE", v: VERSAO, r: respostas };
    if (!url()) { const l = lerDemo(); l.push(linha); gravarDemo(l); return true; }
    // text/plain evita a pré-checagem CORS do Apps Script.
    await fetch(url(), { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(linha) });
    return true;
  }

  async function listar() {
    if (!url()) return lerDemo();
    const resp = await fetch(`${url()}?v=${VERSAO}`, { cache: "no-store" });
    if (!resp.ok) throw new Error("O levantamento não respondeu (" + resp.status + ").");
    const dados = await resp.json();
    return dados.linhas || [];
  }

  // Para ensaiar a aula sem plateia: respostas inventadas, com alguma correlação plausível.
  function simular(turma, n = 1) {
    const l = lerDemo();
    for (let k = 0; k < n; k++) {
      const f = sortear([0.06, 0.14, 0.26, 0.3, 0.24]);
      const ia = sortear(f === 0 ? [0, 0, 0, 0, 0, 0, 1] : [0.46, 0.24, 0.07, 0.08, 0.08, 0.04, 0.03]);
      const ate = Math.min(3, Math.max(0, sortear([0.45, 0.32, 0.17, 0.06]) + (f >= 3 ? 1 : 0) - (f <= 1 ? 1 : 0)));
      const medo = sortear([0.38, 0.24, 0.1, 0.16, 0.12]);
      l.push({ t: Date.now() - Math.floor(Math.random() * 6e5), turma: turma || "ENSAIO", v: VERSAO, r: [f, ia, ate, medo] });
    }
    gravarDemo(l);
  }
  function sortear(pesos) {
    const s = pesos.reduce((a, b) => a + b, 0);
    let x = Math.random() * s;
    for (let i = 0; i < pesos.length; i++) { x -= pesos[i]; if (x <= 0) return i; }
    return pesos.length - 1;
  }
  const limparDemo = () => gravarDemo([]);

  window.QUESTIONARIO = { VERSAO, PERGUNTAS, enviar, listar, simular, limparDemo, demo: () => !url() };
})();
