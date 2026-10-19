/* Texto da aba "Como usar fora do navegador".

   Esta aba foi reescrita no Observatório para ser direta: um argumento por
   seção, sem repetir o que a seção anterior já disse. Continuam vindo do
   Panorama vivo os exemplos medidos (como-usar-cenas.js), que são evidência
   e mudam a cada nova rodada de medição. Os comandos de instalação moram em
   panoramaCliTutorials.ts, com data de conferência. */

type Text = { pt: string; en: string };
const T = (pt: string, en: string): Text => ({ pt, en });

export const USAGE_SECTIONS = [
  { id: "diferenca", title: T("A diferença", "The difference") },
  { id: "tutorial", title: T("Instale e experimente", "Install and try it") },
  { id: "pratica", title: T("Na prática", "In practice") },
  { id: "navegador", title: T("Quando o navegador basta", "When the browser is enough") },
  { id: "depois", title: T("O que fica depois", "What remains afterwards") },
  { id: "ferramentas", title: T("Qual ferramenta escolher", "Which tool to choose") },
  { id: "medicao", title: T("Como medimos", "How we measured") },
] as const;
export type UsageSectionId = typeof USAGE_SECTIONS[number]["id"];

export const USAGE_TEXT = {
  lede: T(
    "No navegador, a IA conversa. Instalada no seu computador, ela trabalha: abre os seus arquivos, roda comandos e confere o resultado, pedindo a sua autorização antes de mexer em qualquer coisa.",
    "In the browser, AI talks. Installed on your computer, it works: it opens your files, runs commands and checks the result, asking your permission before changing anything.",
  ),
  sameModel: T(
    "O modelo pode ser exatamente o mesmo nos dois lugares. O que muda é o alcance.",
    "The model can be exactly the same in both places. What changes is its reach.",
  ),
  pillars: [
    {
      title: T("Ela vê os seus arquivos", "It sees your files"),
      browser: T("Você precisa descrever o sistema, a pasta e os programas. Se descrever errado, a resposta vem errada, sem aviso.", "You must describe your system, folder and programs. Describe them wrong and the answer is wrong, with no warning."),
      installed: T("Ela abre a pasta, conta os arquivos e confere o que está instalado antes de propor algo.", "It opens the folder, counts the files and checks what is installed before proposing anything."),
    },
    {
      title: T("Ela executa, você autoriza", "It runs, you approve"),
      browser: T("Ela escreve o comando; você copia, roda, olha o erro e volta para contar.", "It writes the command; you copy it, run it, read the error and come back to report."),
      installed: T("Ela propõe, você aprova, ela roda, lê o erro e corrige o próprio passo seguinte.", "It proposes, you approve, it runs, reads the error and fixes its own next step."),
    },
    {
      title: T("O trabalho fica", "The work stays"),
      browser: T("A conversa se perde entre centenas de outras. O resultado vai para a área de transferência.", "The chat gets lost among hundreds of others. The result goes to your clipboard."),
      installed: T("Sobra um script na pasta, o histórico do que mudou e um arquivo de regras que a próxima sessão lê.", "A script stays in the folder, along with a history of what changed and a rules file the next session reads."),
    },
  ],
  cost: T(
    "O custo: instalar leva uns 15 minutos na primeira vez, e você passa a aprovar comandos em vez de só ler respostas.",
    "The cost: installing takes about 15 minutes the first time, and you approve commands instead of only reading answers.",
  ),
  practiceIntro: T(
    "Levamos as mesmas tarefas de trabalho ao Gemini, numa aba do navegador, e ao Antigravity, instalado no terminal. Escolha uma:",
    "We gave the same work tasks to Gemini in a browser tab and to Antigravity installed in the terminal. Pick one:",
  ),
  browserWins: [
    { title: T("Pensar em voz alta", "Thinking out loud"), text: T("Rascunhar um argumento, discutir um método, achar a palavra certa. Não há arquivo para abrir.", "Drafting an argument, discussing a method, finding the right word. There is no file to open.") },
    { title: T("Um arquivo que acabou de chegar", "A file that just arrived"), text: T("O PDF do e-mail, a foto do celular. Arrastar para a conversa é mais rápido.", "The PDF from an email, a phone photo. Dragging it into the chat is faster.") },
    { title: T("Uma dúvida só", "A single question"), text: T("Para uma pergunta avulsa, não compensa instalar nada.", "For a one-off question, installing anything is not worth it.") },
    { title: T("Aprender o terminal", "Learning the terminal"), text: T("Colar o comando, errar e ler o erro ensina mais do que aprovar o comando de outra pessoa.", "Pasting a command, failing and reading the error teaches more than approving someone else’s command.") },
    { title: T("Um computador que não é seu", "A computer that is not yours"), text: T("Máquina travada do laboratório, servidor de terceiros: o navegador funciona em qualquer lugar.", "A locked-down lab machine, someone else’s server: the browser works anywhere.") },
  ],
  rule: T("Tem arquivo e vai repetir? Instale. É conversa e é uma vez só? Use o navegador.", "Files involved and you will repeat it? Install. A conversation, just once? Use the browser."),
  afterLede: T(
    "A diferença maior aparece na semana seguinte. Compare o que sobra de cada jeito de trabalhar:",
    "The biggest difference shows up the following week. Compare what is left from each way of working:",
  ),
  afterChat: {
    label: T("Uma semana depois de uma conversa", "A week after a chat"),
    items: [T("O fio da conversa, se você achar qual foi.", "The thread, if you can find which one."), T("O resultado colado em algum lugar.", "The result pasted somewhere."), T("A lembrança de que funcionou, não de por quê.", "The memory that it worked, not why."), T("Nada que outra pessoa consiga continuar.", "Nothing someone else can pick up.")],
  },
  afterAgent: {
    label: T("Uma semana depois de uma sessão na pasta", "A week after a session in the folder"),
    items: [T("O script que fez o trabalho, pronto para rodar de novo.", "The script that did the work, ready to run again."), T("As pastas do jeito que ficaram.", "The folders as they were left."), T("O histórico do que mudou e por quê (git).", "The history of what changed and why (git)."), T("Um arquivo de regras que a próxima sessão lê antes de agir.", "A rules file the next session reads before acting.")],
  },
  rulesTitle: T("O arquivo de regras é a memória do agente", "The rules file is the agent’s memory"),
  rulesText: T(
    "Agentes leem um arquivo de convenções na raiz do projeto (AGENTS.md, CLAUDE.md ou GEMINI.md) no começo de cada sessão. Cada erro corrigido uma vez vira uma linha ali, e não se repete.",
    "Agents read a conventions file at the project root (AGENTS.md, CLAUDE.md or GEMINI.md) at the start of every session. Each mistake corrected once becomes a line there, and does not happen again.",
  ),
  rulesFile: [
    "# Convenções deste projeto",
    "",
    "- `dados/brutos/` é somente leitura. Nunca escreva aqui.",
    "- Nomes de arquivo: minúsculos, sem acento, separados por _",
    "- Raster: EPSG:4326, nodata -3000, COMPRESS=DEFLATE",
    "- Antes de mover em lote, mostre a lista e espere o ok.",
  ],
  tutorialIntro: T(
    "Escolha o seu sistema e siga um dos dois tutoriais no computador simulado. Os comandos são os mesmos que você vai digitar no seu computador; abaixo da tela eles aparecem prontos para copiar.",
    "Choose your system and follow one of the two tutorials on the simulated computer. The commands are the ones you will type on your own computer; below the screen they appear ready to copy.",
  ),
  toolsIntro: T(
    "O programa (quem age no seu computador) e o modelo (quem pensa) são escolhas separadas. Estes são os programas mais usados; todos trabalham na pasta em que são abertos e pedem aprovação antes de alterar arquivos.",
    "The program (what acts on your computer) and the model (what thinks) are separate choices. These are the most used programs; all of them work in the folder they are opened in and ask for approval before changing files.",
  ),
  toolsNote: T(
    "Precisa de Node.js: os instalados com npm. Para instalar o Node, veja o passo “Conferir se o Node.js está instalado” no tutorial do Ollama.",
    "Needs Node.js: the ones installed with npm. To install Node, see the “Check whether Node.js is installed” step in the Ollama tutorial.",
  ),
  methodLede: T(
    "Os exemplos desta página vêm de execuções reais em setembro de 2026, com transcrições publicadas.",
    "The examples on this page come from real runs in September 2026, with published transcripts.",
  ),
  methodItems: [
    T("Uma pasta de teste com armadilhas reais: 1.240 fotos, 340 nomes bagunçados, 40 planilhas com 97 abas, 84 arquivos duplicados.", "A test folder with real traps: 1,240 photos, 340 messy names, 40 spreadsheets with 97 tabs, 84 duplicate files."),
    T("Quem diz se deu certo são os arquivos na pasta, contados por outro programa, e não a resposta da IA.", "Success is judged by the files in the folder, counted by another program, not by the AI’s answer."),
    T("As mesmas frases foram levadas ao Gemini no navegador e a dois programas instalados; as tarefas principais foram repetidas cinco vezes.", "The same prompts went to Gemini in the browser and to two installed programs; the main tasks were repeated five times."),
    T("Não medimos tempo nem custo: só um dos lados foi cronometrado, e comparar medida com estimativa não seria honesto.", "We did not measure time or cost: only one side was timed, and comparing a measurement with an estimate would not be honest."),
  ],
};

export type ToolRow = {
  name: string; company: string; kind: Text; install: { windows: string; unix: string }; node: boolean;
  needs: Text; link: string;
};

/* Conferido nas páginas oficiais em 19/out/2026 (mesma data de VERIFIED_AT). */
export const USAGE_TOOLS: ToolRow[] = [
  { name: "Claude Code", company: "Anthropic", kind: T("Agente no terminal", "Terminal agent"), install: { windows: "irm https://claude.ai/install.ps1 | iex", unix: "curl -fsSL https://claude.ai/install.sh | bash" }, node: false, needs: T("Plano Pro, Max ou API (o gratuito não inclui)", "Pro, Max or API plan (free plan not included)"), link: "https://code.claude.com/docs/en/setup" },
  { name: "Codex CLI", company: "OpenAI", kind: T("Agente no terminal", "Terminal agent"), install: { windows: "npm install -g @openai/codex", unix: "npm install -g @openai/codex" }, node: true, needs: T("Conta ChatGPT (inclusive gratuita, com cota menor) ou API", "ChatGPT account (free tier included, smaller quota) or API"), link: "https://github.com/openai/codex" },
  { name: "Gemini CLI", company: "Google", kind: T("Agente no terminal", "Terminal agent"), install: { windows: "npm install -g @google/gemini-cli", unix: "npm install -g @google/gemini-cli" }, node: true, needs: T("Conta Google, com cota gratuita", "Google Account, with a free quota"), link: "https://github.com/google-gemini/gemini-cli" },
  { name: "Antigravity CLI", company: "Google", kind: T("Agente no terminal", "Terminal agent"), install: { windows: "irm https://antigravity.google/cli/install.ps1 | iex", unix: "curl -fsSL https://antigravity.google/cli/install.sh | bash" }, node: false, needs: T("Conta Google; prévia sem custo", "Google Account; free preview"), link: "https://antigravity.google/docs/getting-started?tab=cli" },
  { name: "OpenCode", company: "Anomaly", kind: T("Agente no terminal", "Terminal agent"), install: { windows: "npm install -g opencode-ai", unix: "curl -fsSL https://opencode.ai/install | bash" }, node: false, needs: T("Chave de qualquer provedor ou modelo local", "Any provider key or a local model"), link: "https://opencode.ai/docs/" },
  { name: "Ollama", company: "Ollama", kind: T("Motor: modelos locais e de nuvem", "Engine: local and cloud models"), install: { windows: "irm https://ollama.com/install.ps1 | iex", unix: "curl -fsSL https://ollama.com/install.sh | sh" }, node: false, needs: T("Local: 8 GB de RAM para modelos de 3–4B. Nuvem: só a conta", "Local: 8 GB RAM for 3–4B models. Cloud: just an account"), link: "https://ollama.com/download" },
];

export const OLLAMA_PLANS = [
  { name: "Free", price: T("US$ 0", "US$ 0"), detail: T("Modelos locais à vontade e cota inicial de nuvem; 1 requisição por vez.", "Unlimited local models and a starter cloud quota; 1 request at a time.") },
  { name: "Pro", price: T("US$ 20/mês", "US$ 20/mo"), detail: T("US$ 60 de crédito por mês, modelos maiores, 3 requisições simultâneas.", "US$ 60 of credit per month, larger models, 3 concurrent requests.") },
  { name: "Max", price: T("US$ 100/mês", "US$ 100/mo"), detail: T("US$ 300 de crédito por mês, 10 requisições simultâneas.", "US$ 300 of credit per month, 10 concurrent requests.") },
];
export const OLLAMA_PLANS_CHECKED = "2026-09-06";
