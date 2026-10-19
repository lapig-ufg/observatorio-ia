/* Tutoriais de instalação do simulador "Como usar fora do navegador".

   Diferente do resto do Panorama, estes passos moram aqui: dependem do
   sistema de quem lê (Windows, macOS, Linux) e do que já está instalado
   (Node.js), e cada comando aponta para a página oficial onde foi conferido.
   Essas ferramentas mudam rápido, então:
     - VERIFIED_AT diz quando os comandos foram conferidos;
     - a página avisa quando a conferência passa de STALE_AFTER_DAYS;
     - `pnpm tutoriais:check` confere se os instaladores e o Node LTS
       continuam onde o tutorial diz (scripts/check-cli-tutorials.mjs).

   Módulo puro: sem React, sem rede. */

export type OsId = "windows" | "mac" | "linux";
export type NodeStatus = "yes" | "no";
export type Profile = { os: OsId; node: NodeStatus; locale?: Locale };
export type Locale = "pt" | "en";
type Text = { pt: string; en: string };
type PerOs<T> = T | { windows: T; mac: T; linux: T };

export type LineKind = "out" | "ok" | "err" | "warn" | "dim" | "progress" | "agent" | "tool";
export type Line = { t: LineKind; v: string };

export type StepWindow = "terminal" | "browser" | "dialog";
export type CliStep = {
  id: string;
  act: Text;
  window: StepWindow;
  title: Text;
  explain: PerOs<Text>;
  /* O que digitar. Num passo "agent" é o pedido em português para o agente. */
  cmd?: PerOs<string>;
  /* "shell" é o prompt do sistema; "agent" é o prompt do programa aberto. */
  prompt?: "shell" | "agent";
  out?: PerOs<Line[] | ((profile: Profile) => Line[])>;
  /* Versões em inglês do que é texto livre: o pedido ao agente e a resposta. */
  cmdEn?: string;
  outEn?: Line[] | ((profile: Profile) => Line[]);
  /* Depois deste passo, o terminal passa a estar nesta pasta. */
  cwd?: string;
  /* Fechar e abrir o terminal: o histórico recomeça. */
  freshTerminal?: boolean;
  browser?: { url: string; title: Text; body: Text; options?: Text[]; button: Text };
  dialog?: { title: Text; lines: PerOs<Text[]>; button: Text; icon?: "info" | "question" | "warn" };
  note?: PerOs<Text>;
  /* O passo só existe para estes perfis. */
  when?: (profile: Profile) => boolean;
  /* Página oficial onde o comando deste passo foi conferido. */
  source?: string;
};

export type CliTutorial = {
  id: "ollama" | "antigravity";
  name: string;
  icon: "ollama" | "antigravity";
  tagline: Text;
  goal: Text;
  minutes: number;
  needsNode: boolean;
  steps: CliStep[];
  closing: Text;
  sources: { label: string; url: string }[];
};

export const VERIFIED_AT = "2026-10-19";
export const STALE_AFTER_DAYS = 90;
export const NODE_LTS_MAJOR = 24;
export const NODE_LTS_VERSION = "v24.22.0";
/* Versões só das saídas de exemplo e do instalador do nvm (o endereço tem a versão). */
export const NVM_VERSION = "v0.40.8";
export const OLLAMA_EXAMPLE_VERSION = "0.40.6";
export const AGY_EXAMPLE_VERSION = "1.4.0";

const T = (pt: string, en: string): Text => ({ pt, en });
export function pick<T>(value: PerOs<T>, os: OsId): T {
  return value && typeof value === "object" && "windows" in (value as object) && "mac" in (value as object) && "linux" in (value as object)
    ? (value as { windows: T; mac: T; linux: T })[os]
    : value as T;
}

export const OS_LABELS: Record<OsId, Text> = {
  windows: T("Windows", "Windows"),
  mac: T("macOS", "macOS"),
  linux: T("Linux", "Linux"),
};

/* Detecção só como ponto de partida: quem lê pode trocar. Celular e tablet
   caem no Windows, o sistema mais comum nos computadores da universidade. */
export function detectOs(userAgent: string, platform = ""): OsId {
  const source = `${platform} ${userAgent}`.toLowerCase();
  if (/android|iphone|ipad/.test(source)) return "windows";
  if (/mac/.test(source)) return "mac";
  if (/linux|x11|cros/.test(source)) return "linux";
  return "windows";
}

export const SHELL: Record<OsId, { name: string; title: Text; home: string; prompt: (cwd: string) => string }> = {
  windows: { name: "PowerShell", title: T("Windows PowerShell", "Windows PowerShell"), home: "C:\\Users\\voce", prompt: (cwd) => `PS ${cwd}> ` },
  mac: { name: "zsh", title: T("Terminal — zsh", "Terminal — zsh"), home: "~", prompt: (cwd) => `voce@MacBook ${cwd.replace(/^~\//, "")} % ` },
  linux: { name: "bash", title: T("Terminal — bash", "Terminal — bash"), home: "~", prompt: (cwd) => `voce@ubuntu:${cwd}$ ` },
};

export function projectDir(os: OsId) {
  return os === "windows" ? "C:\\Users\\voce\\campo-2026" : "~/campo-2026";
}

/* A mensagem que cada shell mostra quando o programa não existe. É a mesma
   que o leitor vai ver no próprio computador se pular uma etapa. */
export function notFound(os: OsId, program: string, locale: Locale = "pt"): Line[] {
  if (os === "windows" && locale === "en") return [
    { t: "err", v: `${program} : The term '${program}' is not recognized as the name of a cmdlet, function,` },
    { t: "err", v: "script file, or operable program." },
  ];
  if (os === "windows") return [
    { t: "err", v: `${program} : O termo '${program}' não é reconhecido como nome de cmdlet, função,` },
    { t: "err", v: "arquivo de script ou programa operável." },
  ];
  if (os === "mac") return [{ t: "err", v: `zsh: command not found: ${program}` }];
  return [{ t: "err", v: `${program}: command not found` }];
}

function openTerminalStep(): CliStep {
  return {
    id: "terminal",
    act: T("Preparar", "Prepare"),
    window: "dialog",
    title: T("Abrir o terminal", "Open the terminal"),
    explain: {
      windows: T("É a janela onde você digita comandos em vez de clicar. No Windows, use o PowerShell: ele já vem instalado.", "It is the window where you type commands instead of clicking. On Windows, use PowerShell: it is already installed."),
      mac: T("É a janela onde você digita comandos em vez de clicar. No macOS ela se chama Terminal e já vem instalada.", "It is the window where you type commands instead of clicking. On macOS it is called Terminal and comes preinstalled."),
      linux: T("É a janela onde você digita comandos em vez de clicar. Na maioria das distribuições, Ctrl+Alt+T abre o terminal.", "It is the window where you type commands instead of clicking. On most distributions, Ctrl+Alt+T opens it."),
    },
    dialog: {
      title: T("Onde fica o terminal", "Where the terminal is"),
      icon: "info",
      lines: {
        windows: [T("Clique no menu Iniciar.", "Click the Start menu."), T("Digite PowerShell.", "Type PowerShell."), T("Abra “Windows PowerShell” (não precisa ser como administrador).", "Open “Windows PowerShell” (no administrator rights needed).")],
        mac: [T("Tecle Cmd + Espaço para abrir a busca.", "Press Cmd + Space to open search."), T("Digite Terminal.", "Type Terminal."), T("Tecle Enter.", "Press Enter.")],
        linux: [T("Tecle Ctrl + Alt + T.", "Press Ctrl + Alt + T."), T("Ou procure “Terminal” no menu de aplicativos.", "Or search for “Terminal” in the app menu.")],
      },
      button: T("Abri o terminal", "I opened the terminal"),
    },
  };
}

/* Conferir o Node e, se faltar, instalar. Os três sistemas seguem o caminho
   que nodejs.org recomenda: winget no Windows, nvm no macOS e no Linux. */
function nodeSteps(act: Text, why: Text): CliStep[] {
  const has = (p: Profile) => p.node === "yes";
  const missing = (p: Profile) => p.node === "no";
  return [
    {
      id: "node-check",
      act,
      window: "terminal",
      title: T("Conferir se o Node.js está instalado", "Check whether Node.js is installed"),
      explain: { pt: `${why.pt} Este comando mostra a versão instalada. Precisa ser a ${NODE_LTS_MAJOR - 4} ou maior.`, en: `${why.en} This command prints the installed version. It must be ${NODE_LTS_MAJOR - 4} or newer.` },
      cmd: "node --version",
      out: {
        windows: (p) => has(p) ? [{ t: "out", v: NODE_LTS_VERSION }] : notFound("windows", "node", p.locale),
        mac: (p) => has(p) ? [{ t: "out", v: NODE_LTS_VERSION }] : notFound("mac", "node"),
        linux: (p) => has(p) ? [{ t: "out", v: NODE_LTS_VERSION }] : notFound("linux", "node"),
      },
      note: T("Se aparecer um número como v18 ou menor, siga os passos de instalação mesmo assim: versões antigas não rodam estes programas. Para refazer com outra resposta, troque a opção “Node.js” acima da tela.", "If you see v18 or lower, follow the install steps anyway: old versions cannot run these tools. To try the other path, change the “Node.js” option above the screen."),
      source: "https://nodejs.org/en/download",
    },
    {
      id: "node-install-win",
      act,
      window: "terminal",
      title: T("Instalar o Node.js com o winget", "Install Node.js with winget"),
      explain: T("O winget é o instalador de programas do próprio Windows 10 e 11. Este comando baixa a versão LTS, a de suporte longo, que é a recomendada.", "winget is the package installer built into Windows 10 and 11. This command downloads the LTS (long-term support) version, which is the recommended one."),
      cmd: "winget install OpenJS.NodeJS.LTS",
      out: [
        { t: "out", v: "Encontrado Node.js LTS [OpenJS.NodeJS.LTS] Versão 24.22.0" },
        { t: "dim", v: "Este aplicativo é licenciado para você pelo proprietário." },
        { t: "out", v: "Baixando https://nodejs.org/dist/v24.22.0/node-v24.22.0-x64.msi" },
        { t: "progress", v: "31.4 MB" },
        { t: "out", v: "Hash do instalador verificado com êxito" },
        { t: "out", v: "Iniciando a instalação do pacote..." },
        { t: "ok", v: "Instalado com êxito" },
      ],
      note: T("Se o Windows pedir permissão de administrador, aceite. Sem o winget (Windows muito antigo), baixe o instalador .msi em nodejs.org.", "If Windows asks for administrator permission, accept. Without winget (very old Windows), download the .msi installer from nodejs.org."),
      when: (p) => missing(p) && p.os === "windows",
      source: "https://nodejs.org/en/download",
    },
    {
      id: "node-install-nvm",
      act,
      window: "terminal",
      title: T("Instalar o nvm, o gerenciador de versões do Node", "Install nvm, the Node version manager"),
      explain: T("O nvm instala o Node na sua pasta pessoal, sem pedir senha de administrador, e deixa trocar de versão depois. É o caminho que o site do Node recomenda para macOS e Linux.", "nvm installs Node in your home folder, without an administrator password, and lets you switch versions later. It is the path nodejs.org recommends for macOS and Linux."),
      cmd: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash`,
      out: (p) => [
        { t: "out", v: `=> Downloading nvm from git to '${p.os === "mac" ? "/Users" : "/home"}/voce/.nvm'` },
        { t: "progress", v: "nvm" },
        { t: "out", v: `=> Appending nvm source string to ${p.os === "mac" ? "~/.zshrc" : "~/.bashrc"}` },
        { t: "out", v: "=> Close and reopen your terminal to start using nvm" },
      ],
      when: (p) => missing(p) && p.os !== "windows",
      source: "https://github.com/nvm-sh/nvm#installing-and-updating",
    },
    {
      id: "node-reopen",
      act,
      window: "dialog",
      title: T("Fechar e abrir o terminal", "Close and reopen the terminal"),
      explain: T("Programas recém-instalados só aparecem num terminal novo: o que está aberto ainda não sabe que eles existem. É o motivo mais comum de “comando não encontrado” logo depois de instalar.", "Newly installed programs only show up in a new terminal: the open one does not know about them yet. It is the most common reason for “command not found” right after installing."),
      dialog: {
        title: T("Reabrir o terminal", "Reopen the terminal"),
        icon: "warn",
        lines: [T("Feche a janela do terminal.", "Close the terminal window."), T("Abra de novo, do mesmo jeito do primeiro passo.", "Open it again, the same way as in the first step.")],
        button: T("Reabri o terminal", "I reopened the terminal"),
      },
      freshTerminal: true,
      when: missing,
    },
    {
      id: "node-nvm-install",
      act,
      window: "terminal",
      title: T("Instalar o Node.js pelo nvm", "Install Node.js with nvm"),
      explain: T(`Agora o nvm existe. Este comando baixa e ativa o Node ${NODE_LTS_MAJOR}, a versão LTS atual.`, `nvm now exists. This command downloads and activates Node ${NODE_LTS_MAJOR}, the current LTS version.`),
      cmd: `nvm install ${NODE_LTS_MAJOR}`,
      out: [
        { t: "out", v: `Downloading and installing node ${NODE_LTS_VERSION}...` },
        { t: "progress", v: "node" },
        { t: "out", v: "Computing checksum with sha256sum" },
        { t: "ok", v: `Now using node ${NODE_LTS_VERSION} (npm v11.6.2)` },
      ],
      when: (p) => missing(p) && p.os !== "windows",
      source: "https://github.com/nvm-sh/nvm#usage",
    },
    {
      id: "node-confirm",
      act,
      window: "terminal",
      title: T("Confirmar a instalação", "Confirm the installation"),
      explain: T("O mesmo comando do começo. Agora ele precisa responder com um número de versão.", "The same command as before. This time it should answer with a version number."),
      cmd: "node --version",
      out: [{ t: "out", v: NODE_LTS_VERSION }],
      when: missing,
    },
  ];
}

const ollama: CliTutorial = {
  id: "ollama",
  name: "Ollama",
  icon: "ollama",
  tagline: T("Modelos grandes pela nuvem ou pequenos no seu computador, dirigindo o programa que você escolher", "Large cloud models or small local ones, driving the program you choose"),
  goal: T("No fim, você terá rodado um modelo grande demais para o seu computador pela conta da Ollama, aberto o Codex com esse modelo e visto como trocar para um modelo local quando o dado não puder sair da máquina.", "By the end you will have run a model too large for your computer through an Ollama account, opened Codex with it, and seen how to switch to a local model when data cannot leave the machine."),
  minutes: 10,
  needsNode: true,
  sources: [
    { label: "ollama.com/download", url: "https://ollama.com/download" },
    { label: "docs.ollama.com", url: "https://docs.ollama.com/" },
    { label: "nodejs.org/download", url: "https://nodejs.org/en/download" },
  ],
  steps: [
    openTerminalStep(),
    {
      id: "install",
      act: T("Instalar", "Install"),
      window: "terminal",
      title: T("Instalar o Ollama", "Install Ollama"),
      explain: {
        windows: T("Uma linha só. O `irm` baixa o instalador oficial e o `iex` o executa. Antes de rodar uma linha assim, confira se o endereço é mesmo o do site oficial.", "A single line. `irm` downloads the official installer and `iex` runs it. Before running a line like this, check that the address is really the official site."),
        mac: T("Uma linha só. O `curl` baixa o script oficial e o `sh` o executa. Antes de rodar uma linha assim, confira se o endereço é mesmo o do site oficial.", "A single line. `curl` downloads the official script and `sh` runs it. Before running a line like this, check that the address is really the official site."),
        linux: T("Uma linha só. O `curl` baixa o script oficial e o `sh` o executa. Ele pode pedir a sua senha, porque instala um serviço do sistema.", "A single line. `curl` downloads the official script and `sh` runs it. It may ask for your password because it installs a system service."),
      },
      cmd: { windows: "irm https://ollama.com/install.ps1 | iex", mac: "curl -fsSL https://ollama.com/install.sh | sh", linux: "curl -fsSL https://ollama.com/install.sh | sh" },
      out: {
        windows: [
          { t: "out", v: ">>> Downloading OllamaSetup.exe" },
          { t: "progress", v: "1.2 GB" },
          { t: "out", v: ">>> Installing Ollama to C:\\Users\\voce\\AppData\\Local\\Programs\\Ollama" },
          { t: "out", v: ">>> Adding ollama to PATH" },
          { t: "ok", v: ">>> Install complete. The Ollama API is now available at 127.0.0.1:11434." },
        ],
        mac: [
          { t: "out", v: ">>> Downloading Ollama for macOS" },
          { t: "progress", v: "Ollama.app" },
          { t: "out", v: ">>> Installing Ollama.app to /Applications" },
          { t: "out", v: ">>> Adding 'ollama' command to /usr/local/bin" },
          { t: "ok", v: ">>> Install complete. The Ollama API is now available at 127.0.0.1:11434." },
        ],
        linux: [
          { t: "out", v: ">>> Installing ollama to /usr/local" },
          { t: "dim", v: "[sudo] senha para voce: ********" },
          { t: "out", v: ">>> Downloading Linux amd64 bundle" },
          { t: "progress", v: "1.6 GB" },
          { t: "out", v: ">>> Creating ollama systemd service..." },
          { t: "ok", v: ">>> The Ollama API is now available at 127.0.0.1:11434." },
          { t: "ok", v: ">>> Install complete. Run \"ollama\" from the command line." },
        ],
      },
      note: T("127.0.0.1:11434 é o seu próprio computador. Todo programa que usar o Ollama vai conversar com esse endereço local, mesmo quando o modelo estiver na nuvem.", "127.0.0.1:11434 is your own computer. Every program that uses Ollama talks to this local address, even when the model runs in the cloud."),
      source: "https://ollama.com/download",
    },
    {
      id: "version",
      act: T("Instalar", "Install"),
      window: "terminal",
      title: T("Conferir a instalação", "Check the installation"),
      explain: T("Todo programa de terminal responde a `--version`. É o jeito mais rápido de saber se a instalação deu certo.", "Every terminal program answers `--version`. It is the fastest way to know the install worked."),
      cmd: "ollama --version",
      out: [{ t: "out", v: `ollama version is ${OLLAMA_EXAMPLE_VERSION}` }],
      note: T("O número no seu computador provavelmente será maior: o Ollama lança versões quase toda semana. Se aparecer “comando não encontrado”, feche e abra o terminal.", "The number on your computer will probably be higher: Ollama ships almost weekly. If you get “command not found”, close and reopen the terminal."),
    },
    {
      id: "signin",
      act: T("Entrar na conta", "Sign in"),
      window: "terminal",
      title: T("Entrar na conta da Ollama", "Sign in to Ollama"),
      explain: T("Os modelos de nuvem rodam nos servidores da Ollama e pedem uma conta, que tem plano gratuito. O comando mostra um endereço e abre o navegador.", "Cloud models run on Ollama’s servers and need an account, which has a free plan. The command prints an address and opens the browser."),
      cmd: "ollama signin",
      out: [
        { t: "out", v: "You need to be signed in to Ollama to run Cloud models." },
        { t: "out", v: "" },
        { t: "out", v: "If your browser did not open, navigate to:" },
        { t: "warn", v: "    https://ollama.com/connect?code=HTPK-QDVX" },
      ],
      source: "https://docs.ollama.com/",
    },
    {
      id: "signin-browser",
      act: T("Entrar na conta", "Sign in"),
      window: "browser",
      title: T("Autorizar este computador", "Authorize this computer"),
      explain: T("No navegador, entre ou crie a conta e confirme o código que apareceu no terminal. Depois volte ao terminal: ele já sabe que você entrou.", "In the browser, sign in or create the account and confirm the code shown in the terminal. Then return to the terminal: it already knows you signed in."),
      browser: {
        url: "https://ollama.com/connect?code=HTPK-QDVX",
        title: T("Conectar dispositivo", "Connect device"),
        body: T("Um computador está pedindo acesso à sua conta da Ollama. Confira se o código é o mesmo do terminal: HTPK-QDVX", "A computer is asking to access your Ollama account. Check that the code matches the terminal: HTPK-QDVX"),
        button: T("Conectar", "Connect"),
      },
      note: T("O plano gratuito dá uma cota para experimentar os modelos de nuvem. Os pagos dão mais uso e requisições simultâneas; os preços estão na seção “Qual ferramenta escolher”.", "The free plan gives a quota to try cloud models. Paid plans give more usage and concurrent requests; prices are in “Which tool to choose”."),
    },
    {
      id: "run-cloud",
      act: T("Usar", "Use"),
      window: "terminal",
      title: T("Rodar um modelo que não caberia no seu computador", "Run a model that would not fit on your computer"),
      explain: T("O sufixo `-cloud` manda o cálculo para os servidores da Ollama. Repare que não há barra de download: não há nada para baixar.", "The `-cloud` suffix sends the computation to Ollama’s servers. Notice there is no download bar: there is nothing to download."),
      cmd: "ollama run gpt-oss:120b-cloud \"Explique em duas frases o que é o Cerrado.\"",
      cmdEn: "ollama run gpt-oss:120b-cloud \"Explain in two sentences what the Cerrado is.\"",
      outEn: [
        { t: "agent", v: "The Cerrado is South America’s second-largest biome, covering about two" },
        { t: "agent", v: "million km² of central Brazil with fire-adapted savanna vegetation." },
        { t: "agent", v: "It is a biodiversity hotspot and holds the headwaters of major river basins." },
      ],
      out: [
        { t: "agent", v: "O Cerrado é o segundo maior bioma da América do Sul, com cerca de dois" },
        { t: "agent", v: "milhões de km² no Brasil central e vegetação de savana adaptada ao fogo." },
        { t: "agent", v: "É um hotspot de biodiversidade e abriga nascentes de grandes bacias do país." },
      ],
      note: T("Um modelo de 120 bilhões de parâmetros respondeu num computador que não teria memória para carregá-lo. O comando é local; o cálculo aconteceu num data center.", "A 120-billion-parameter model answered on a computer without the memory to load it. The command is local; the computation happened in a data center."),
    },
    ...nodeSteps(T("Preparar o agente", "Prepare the agent"), T("O próximo passo instala o Codex, um agente que roda sobre o Node.js.", "The next step installs Codex, an agent that runs on Node.js.")),
    {
      id: "launch-menu",
      act: T("Usar com um agente", "Use with an agent"),
      window: "terminal",
      title: T("Ver os programas que o Ollama sabe abrir", "See the programs Ollama can open"),
      explain: T("Sem argumento, `ollama launch` lista os agentes que a sua versão conhece e marca os já instalados. Nada de variável de ambiente ou arquivo de configuração.", "Without arguments, `ollama launch` lists the agents your version knows and marks the installed ones. No environment variables or config files."),
      cmd: "ollama launch",
      out: [
        { t: "out", v: "  Escolha uma integração:" },
        { t: "out", v: "" },
        { t: "ok", v: "> claude      Claude Code      Anthropic's coding tool" },
        { t: "out", v: "  codex       Codex            OpenAI's open-source coding agent" },
        { t: "out", v: "  opencode    OpenCode         Open-source coding agent" },
        { t: "out", v: "  droid       Droid            Factory's coding agent" },
        { t: "out", v: "  pi          Pi               Minimal AI agent toolkit" },
        { t: "dim", v: "  ↑/↓ para escolher · Enter para abrir · Esc para sair" },
      ],
      note: T("A lista cresce a cada versão do Ollama. Vale a que aparecer no seu computador, não esta.", "The list grows with every Ollama release. Trust the one on your computer, not this one."),
      source: "https://docs.ollama.com/",
    },
    {
      id: "launch-codex",
      act: T("Usar com um agente", "Use with an agent"),
      window: "terminal",
      title: T("Abrir o Codex com o modelo da Ollama", "Open Codex with the Ollama model"),
      explain: T("Se o Codex não estiver instalado, o Ollama oferece instalar (é aqui que o Node.js é usado), aponta o programa para o endereço local e o abre na pasta em que você está.", "If Codex is not installed, Ollama offers to install it (this is where Node.js is used), points it to the local address and opens it in your current folder."),
      cmd: "ollama launch codex --model gpt-oss:120b-cloud",
      out: (p) => [
        { t: "out", v: "Codex is not installed. Install it now? [Y/n] y" },
        { t: "dim", v: "npm install -g @openai/codex" },
        { t: "progress", v: "@openai/codex" },
        { t: "out", v: "added 1 package in 9s" },
        { t: "out", v: "Starting Codex with gpt-oss:120b-cloud" },
        { t: "out", v: "" },
        { t: "ok", v: ">_ OpenAI Codex" },
        { t: "dim", v: `   model: gpt-oss:120b-cloud · ollama   directory: ${p.os === "windows" ? "C:\\Users\\voce" : "~"}` },
      ],
      note: T("O mesmo comando serve para `claude`, `opencode` ou `pi`. Programa e modelo viram escolhas independentes: dá para trocar de agente sem trocar de conta.", "The same command works for `claude`, `opencode` or `pi`. Program and model become independent choices: you can switch agents without switching accounts."),
    },
    {
      id: "codex-exit",
      act: T("Usar com um agente", "Use with an agent"),
      window: "terminal",
      prompt: "agent",
      title: T("Sair do agente", "Exit the agent"),
      explain: T("Dentro do agente você escreve em português, como num chat. Para voltar ao terminal comum, use `/exit` (ou Ctrl+C duas vezes).", "Inside the agent you write in plain language, like a chat. To return to the normal terminal, use `/exit` (or Ctrl+C twice)."),
      cmd: "/exit",
      out: [{ t: "dim", v: "Até a próxima." }],
      outEn: [{ t: "dim", v: "Goodbye." }],
    },
    {
      id: "local",
      act: T("Quando o dado não pode sair", "When data cannot leave"),
      window: "terminal",
      title: T("Rodar um modelo no seu próprio computador", "Run a model on your own computer"),
      explain: T("Sem o sufixo `-cloud`, o modelo é baixado e roda na sua máquina. É a opção para entrevistas, prontuários e qualquer dado sob termo de sigilo. Um modelo de 4 bilhões de parâmetros roda em 8 GB de memória.", "Without the `-cloud` suffix, the model is downloaded and runs on your machine. It is the option for interviews, medical records and any confidential data. A 4-billion-parameter model runs in 8 GB of memory."),
      cmd: "ollama run qwen3.5:4b \"Resuma este trecho de entrevista.\"",
      cmdEn: "ollama run qwen3.5:4b \"Summarize this interview excerpt.\"",
      outEn: [
        { t: "out", v: "pulling manifest" },
        { t: "progress", v: "2.4 GB" },
        { t: "out", v: "verifying sha256 digest" },
        { t: "ok", v: "success" },
        { t: "agent", v: "[answer generated on your computer, offline]" },
      ],
      out: [
        { t: "out", v: "pulling manifest" },
        { t: "progress", v: "2.4 GB" },
        { t: "out", v: "verifying sha256 digest" },
        { t: "ok", v: "success" },
        { t: "agent", v: "[resposta gerada no seu computador, sem internet]" },
      ],
      note: T("Teste de uma linha: desligue a internet e rode de novo. O modelo local continua respondendo; o `-cloud`, não.", "One-line test: turn off the internet and run it again. The local model keeps answering; the `-cloud` one does not."),
    },
  ],
  closing: T("Você instalou o Ollama, usou um modelo de nuvem, abriu um agente com ele e rodou um modelo local. No seu computador, os comandos são os mesmos: copie-os do roteiro abaixo da tela.", "You installed Ollama, used a cloud model, opened an agent with it and ran a local model. On your computer the commands are the same: copy them from the script below the screen."),
};

const antigravity: CliTutorial = {
  id: "antigravity",
  name: "Antigravity CLI",
  icon: "antigravity",
  tagline: T("O agente do Google no seu terminal, com uma Conta Google e sem custo na prévia", "Google’s agent in your terminal, with a Google Account and free during the preview"),
  goal: T("No fim, você terá o agente do Google instalado, autenticado e trabalhando numa pasta sua, e verá na prática a diferença entre ele enxergar os seus arquivos e não enxergar.", "By the end you will have Google’s agent installed, signed in and working in one of your folders, and you will see the difference between it seeing your files and not seeing them."),
  minutes: 8,
  needsNode: false,
  sources: [
    { label: "antigravity.google/docs/getting-started", url: "https://antigravity.google/docs/getting-started?tab=cli" },
    { label: "antigravity.google/docs/install", url: "https://antigravity.google/docs/install?tab=cli" },
  ],
  steps: [
    openTerminalStep(),
    {
      id: "install",
      act: T("Instalar", "Install"),
      window: "terminal",
      title: T("Instalar o Antigravity CLI", "Install Antigravity CLI"),
      explain: T("Uma linha. O instalador detecta o seu sistema e instala um programa chamado `agy`. Não precisa de Node.js.", "One line. The installer detects your system and installs a program called `agy`. Node.js is not needed."),
      cmd: { windows: "irm https://antigravity.google/cli/install.ps1 | iex", mac: "curl -fsSL https://antigravity.google/cli/install.sh | bash", linux: "curl -fsSL https://antigravity.google/cli/install.sh | bash" },
      out: {
        windows: [
          { t: "out", v: "==> Detecting platform… windows-x64" },
          { t: "out", v: "==> Downloading Antigravity CLI" },
          { t: "progress", v: "agy.exe" },
          { t: "out", v: "==> Installed to C:\\Users\\voce\\AppData\\Local\\agy\\bin\\agy.exe" },
          { t: "ok", v: "Run 'agy' to get started." },
        ],
        mac: [
          { t: "out", v: "==> Detecting platform… darwin-arm64" },
          { t: "out", v: "==> Downloading Antigravity CLI" },
          { t: "progress", v: "agy" },
          { t: "out", v: "==> Installed to ~/.local/bin/agy" },
          { t: "ok", v: "Run 'agy' to get started." },
        ],
        linux: [
          { t: "out", v: "==> Detecting platform… linux-x64" },
          { t: "out", v: "==> Downloading Antigravity CLI" },
          { t: "progress", v: "agy" },
          { t: "out", v: "==> Installed to ~/.local/bin/agy" },
          { t: "ok", v: "Run 'agy' to get started." },
        ],
      },
      note: {
        windows: T("Requisito: Windows 10 ou 11 de 64 bits. No Prompt de Comando (cmd), em vez do PowerShell, a linha é outra; está na página oficial.", "Requirement: 64-bit Windows 10 or 11. In Command Prompt (cmd) instead of PowerShell the line is different; see the official page."),
        mac: T("Requisito: macOS 12 ou mais novo. Se depois o terminal disser que não achou o `agy`, feche e abra o terminal: o instalador acrescentou a pasta ~/.local/bin ao PATH.", "Requirement: macOS 12 or newer. If the terminal later says it cannot find `agy`, close and reopen it: the installer added ~/.local/bin to your PATH."),
        linux: T("Se depois o terminal disser que não achou o `agy`, feche e abra o terminal: o instalador acrescentou a pasta ~/.local/bin ao PATH.", "If the terminal later says it cannot find `agy`, close and reopen it: the installer added ~/.local/bin to your PATH."),
      },
      source: "https://antigravity.google/docs/getting-started?tab=cli",
    },
    {
      id: "version",
      act: T("Instalar", "Install"),
      window: "terminal",
      title: T("Conferir a instalação", "Check the installation"),
      explain: T("Se aparecer um número de versão, o programa está no lugar certo.", "If a version number appears, the program is in the right place."),
      cmd: "agy --version",
      out: [{ t: "out", v: `agy ${AGY_EXAMPLE_VERSION}` }],
      note: T("O número no seu computador pode ser outro: a ferramenta está em prévia e muda com frequência.", "The number on your computer may differ: the tool is in preview and changes often."),
    },
    {
      id: "cd",
      act: T("Primeiro uso", "First use"),
      window: "terminal",
      title: T("Entrar na pasta do projeto", "Go to the project folder"),
      explain: T("O agente enxerga a pasta em que é aberto, e só ela. Por isso, antes de abri-lo, entre na pasta do trabalho. Aqui, uma pasta com fotos de campo.", "The agent sees the folder it is opened in, and only that. So before opening it, go to the work folder. Here, a folder of field photos."),
      cmd: { windows: "cd $HOME\\campo-2026", mac: "cd ~/campo-2026", linux: "cd ~/campo-2026" },
      out: [],
      cwd: "project",
      note: T("Nunca abra o agente na pasta pessoal inteira ou na raiz do disco: escolher a pasta é escolher o que ele pode ver.", "Never open the agent in your whole home folder or the root of the disk: choosing the folder is choosing what it can see."),
    },
    {
      id: "first-run",
      act: T("Primeiro uso", "First use"),
      window: "terminal",
      title: T("Abrir pela primeira vez", "Open it for the first time"),
      explain: T("Sem argumentos, o `agy` abre uma tela dentro do terminal. Na primeira vez ele pergunta o esquema de cores e o modo de tela; qualquer escolha serve.", "Without arguments, `agy` opens a screen inside the terminal. The first time, it asks for a color scheme and display mode; any choice works."),
      cmd: "agy",
      out: [
        { t: "ok", v: "  Antigravity CLI" },
        { t: "out", v: "" },
        { t: "out", v: "  Esquema de cores:  ● Dark   ○ Solarized Dark   ○ Solarized Light   ○ Terminal" },
        { t: "out", v: "  Modo de tela:      ● Tela cheia   ○ Embutido" },
        { t: "out", v: "" },
        { t: "out", v: "  Abrindo o navegador para entrar com a Conta Google…" },
      ],
      outEn: [
        { t: "ok", v: "  Antigravity CLI" },
        { t: "out", v: "" },
        { t: "out", v: "  Color scheme:  ● Dark   ○ Solarized Dark   ○ Solarized Light   ○ Terminal" },
        { t: "out", v: "  Display mode:  ● Full screen   ○ Inline" },
        { t: "out", v: "" },
        { t: "out", v: "  Opening the browser to sign in with your Google Account…" },
      ],
      source: "https://antigravity.google/docs/getting-started?tab=cli",
    },
    {
      id: "login",
      act: T("Primeiro uso", "First use"),
      window: "browser",
      title: T("Entrar com a Conta Google", "Sign in with your Google Account"),
      explain: T("Na primeira vez, o navegador abre sozinho. Escolha a conta e autorize. A sessão fica guardada no computador e ele não pergunta de novo.", "The first time, the browser opens on its own. Choose the account and authorize. The session is stored on the computer and it will not ask again."),
      browser: {
        url: "https://accounts.google.com/o/oauth2/auth",
        title: T("Fazer login com o Google", "Sign in with Google"),
        body: T("O Antigravity CLI quer acessar a sua Conta Google.", "Antigravity CLI wants to access your Google Account."),
        options: [T("voce@ufg.br", "you@university.edu"), T("Usar outra conta", "Use another account")],
        button: T("Permitir", "Allow"),
      },
      note: T("O programa está no seu computador e enxerga os seus arquivos, mas quem responde é um modelo nos servidores do Google.", "The program is on your computer and sees your files, but the answers come from a model on Google’s servers."),
      source: "https://antigravity.google/docs/install?tab=cli",
    },
    {
      id: "trust",
      act: T("Primeiro uso", "First use"),
      window: "dialog",
      title: T("Autorizar a pasta", "Trust the folder"),
      explain: T("Antes de ler qualquer arquivo, ele pergunta se pode confiar na pasta. É a pergunta mais importante do tutorial.", "Before reading any file, it asks whether it may trust the folder. It is the most important question in the tutorial."),
      dialog: {
        title: T("Confiar nesta pasta?", "Trust this folder?"),
        icon: "question",
        lines: {
          windows: [T("C:\\Users\\voce\\campo-2026", "C:\\Users\\voce\\campo-2026"), T("O agente poderá ler os arquivos desta pasta.", "The agent will be able to read files in this folder."), T("Comandos que alteram arquivos continuam pedindo aprovação.", "Commands that change files still ask for approval.")],
          mac: [T("~/campo-2026", "~/campo-2026"), T("O agente poderá ler os arquivos desta pasta.", "The agent will be able to read files in this folder."), T("Comandos que alteram arquivos continuam pedindo aprovação.", "Commands that change files still ask for approval.")],
          linux: [T("~/campo-2026", "~/campo-2026"), T("O agente poderá ler os arquivos desta pasta.", "The agent will be able to read files in this folder."), T("Comandos que alteram arquivos continuam pedindo aprovação.", "Commands that change files still ask for approval.")],
        },
        button: T("Confiar nesta pasta", "Trust this folder"),
      },
    },
    {
      id: "task",
      act: T("Usar", "Use"),
      window: "terminal",
      prompt: "agent",
      title: T("A primeira tarefa, em português", "The first task, in plain language"),
      explain: T("Agora você escreve o que quer, como num chat. A diferença aparece logo: ele olha a pasta antes de responder.", "Now you write what you want, like a chat. The difference shows right away: it looks at the folder before answering."),
      cmd: "Quantas fotos tem nesta pasta e de quantos dias diferentes elas são?",
      cmdEn: "How many photos are in this folder and from how many different days?",
      outEn: (p) => [
        { t: "tool", v: p.os === "windows" ? "● Running: (Get-ChildItem *.jpg).Count" : "● Running: ls *.jpg | wc -l" },
        { t: "dim", v: "  1240" },
        { t: "tool", v: "● Reading the photos’ capture dates (EXIF)" },
        { t: "dim", v: "  23 distinct dates, from 09/02 to 09/24" },
        { t: "agent", v: "There are 1,240 photos, taken on 23 different days between Sept 2 and 24." },
        { t: "agent", v: "Do you want me to sort them into folders by date?" },
      ],
      out: (p) => [
        { t: "tool", v: p.os === "windows" ? "● Executando: (Get-ChildItem *.jpg).Count" : "● Executando: ls *.jpg | wc -l" },
        { t: "dim", v: "  1240" },
        { t: "tool", v: "● Lendo as datas de criação das fotos (EXIF)" },
        { t: "dim", v: "  23 datas distintas, de 02/09 a 24/09" },
        { t: "agent", v: "São 1.240 fotos, tiradas em 23 dias diferentes entre 2 e 24 de setembro." },
        { t: "agent", v: "Quer que eu as separe em subpastas por data?" },
      ],
      note: T("Ninguém disse que eram 1.240. Ele contou. Num chat de navegador, você teria de descrever a pasta, e a resposta valeria só o que você descreveu.", "Nobody said there were 1,240. It counted. In a browser chat you would have to describe the folder, and the answer would only be as good as your description."),
    },
    {
      id: "approve",
      act: T("Usar", "Use"),
      window: "terminal",
      prompt: "agent",
      title: T("Pedir uma mudança e aprovar", "Ask for a change and approve it"),
      explain: T("Quando o pedido mexe em arquivos, ele mostra o plano e espera a sua aprovação. Nada é movido antes disso.", "When the request changes files, it shows the plan and waits for your approval. Nothing is moved before that."),
      cmd: "Sim, separe por data, sem apagar nada.",
      cmdEn: "Yes, sort them by date without deleting anything.",
      outEn: [
        { t: "tool", v: "● Plan: create 23 YYYY-MM-DD folders and move each photo into its date’s folder" },
        { t: "warn", v: "  Allow the agent to move 1,240 files?  [y] yes  [n] no  [l] list" },
        { t: "dim", v: "  > y" },
        { t: "tool", v: "● Moving… 1240/1240" },
        { t: "tool", v: "● Checking: 23 folders, 1,240 photos, 0 files left at the top level" },
        { t: "agent", v: "Done. I checked after moving: no photo was left out." },
      ],
      out: [
        { t: "tool", v: "● Plano: criar 23 pastas AAAA-MM-DD e mover cada foto para a pasta da sua data" },
        { t: "warn", v: "  Permitir que o agente mova 1.240 arquivos?  [s] sim  [n] não  [v] ver a lista" },
        { t: "dim", v: "  > s" },
        { t: "tool", v: "● Movendo… 1240/1240" },
        { t: "tool", v: "● Conferindo: 23 pastas, 1.240 fotos, 0 arquivos na raiz" },
        { t: "agent", v: "Pronto. Conferi depois de mover: nenhuma foto ficou de fora." },
      ],
      note: T("Repare na última linha: ele conferiu o resultado nos arquivos, e não apenas disse que terminou. Mesmo assim, abra a pasta e olhe; é a conferência que nenhuma IA consegue fazer por você.", "Note the last line: it checked the result in the files, not just claimed it was done. Still, open the folder and look; it is the check no AI can do for you."),
    },
  ],
  closing: T("Você instalou o agente, entrou com a Conta Google, autorizou uma pasta e viu ele contar, propor, pedir aprovação e conferir. No seu computador, comece por uma pasta de teste, com cópias dos arquivos.", "You installed the agent, signed in, trusted a folder and watched it count, propose, ask for approval and check. On your computer, start with a test folder containing copies of your files."),
};

export const CLI_TUTORIALS: CliTutorial[] = [ollama, antigravity];

/* Os passos que valem para este perfil, na ordem. */
export function resolveSteps(tutorial: CliTutorial, profile: Profile): CliStep[] {
  return tutorial.steps.filter((step) => !step.when || step.when(profile));
}

export function stepCommand(step: CliStep, os: OsId, locale: Locale = "pt") {
  if (locale === "en" && step.cmdEn) return step.cmdEn;
  return step.cmd === undefined ? "" : pick(step.cmd, os);
}

export function stepOutput(step: CliStep, profile: Profile): Line[] {
  if (profile.locale === "en" && step.outEn) return typeof step.outEn === "function" ? step.outEn(profile) : step.outEn;
  if (!step.out) return [];
  const value = pick(step.out, profile.os);
  return typeof value === "function" ? value(profile) : value;
}

/* O comando digitado confere com o esperado? Espaços extras não contam;
   maiúsculas contam, como no terminal de verdade (exceto no Windows, onde o
   PowerShell não diferencia). */
export function commandMatches(typed: string, expected: string, os: OsId) {
  const norm = (value: string) => value.trim().replace(/\s+/g, " ").replace(/[“”]/g, "\"");
  return os === "windows" ? norm(typed).toLowerCase() === norm(expected).toLowerCase() : norm(typed) === norm(expected);
}

export function wrongCommandOutput(typed: string, expected: string, os: OsId, agent: boolean, locale: Locale = "pt"): Line[] {
  if (agent) return [{ t: "dim", v: locale === "en" ? "  (In this simulation, type the suggested request to continue.)" : "  (Nesta simulação, escreva o pedido sugerido para continuar.)" }];
  const program = typed.trim().split(/\s+/)[0] || "";
  const wanted = expected.trim().split(/\s+/)[0] || "";
  if (program && program !== wanted) return notFound(os, program, locale);
  if (locale === "en") return [{ t: "err", v: os === "windows" ? "Error: invalid argument. Check the command." : `${wanted}: invalid argument — check the command` }];
  return [{ t: "err", v: os === "windows" ? "Erro: argumento inválido. Confira o comando." : `${wanted}: argumento inválido — confira o comando` }];
}

export function verificationAgeDays(nowMs: number, verifiedAt = VERIFIED_AT) {
  const days = Math.floor((nowMs - Date.parse(`${verifiedAt}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

export function text(value: Text, locale: Locale) {
  return value[locale];
}
