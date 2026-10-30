import type { ReactNode } from "react";
import { MatrixTable } from "./Matrix";
import { ActivationLab, NeuronLab } from "./labs";
import { formatNumber } from "./math";
import { DEMO, I1, I2, SAMPLE, XOR_X, XOR_Y, Z1, Z2 } from "./demo";
import { BackpropVisual, ChainRuleVisual, DeltaVisual, GradientVisual, LearningRateLab, LossLab, MomentumVisual } from "./visuals";

function Formula({ children }: { children: ReactNode }) {
  return <div className="nn-formula">{children}</div>;
}

function CodeBlock({ children }: { children: ReactNode }) {
  return <pre className="nn-code-block">{children}</pre>;
}

function Note({ title = "Rigor", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="nn-note">
      <b>{title}</b>
      <div>{children}</div>
    </div>
  );
}

function BuildDiagram() {
  return (
    <div className="nn-build-diagram">
      <div className="nn-build-neuron">
        <div><span>x₁</span><span>x₂</span></div>
        <i>×</i>
        <div><span className="is-weight">w₁</span><span className="is-weight">w₂</span></div>
        <i>→</i>
        <b>Σ</b>
        <i>+</i>
        <b>b</b>
        <i>→</i>
        <b className="is-activation">φ</b>
        <i>→</i>
        <b className="is-output">a</b>
      </div>
      <div className="nn-layer-stack">
        <div><span>entrada</span><i /><i /></div>
        <b>→</b>
        <div><span>oculta</span><i /><i /><i /></div>
        <b>→</b>
        <div><span>saída</span><i /></div>
      </div>
      <p>Um neurônio multiplica, soma e ativa. Uma rede empilha muitos neurônios em camadas.</p>
    </div>
  );
}

function ShapesDiagram() {
  return (
    <div className="nn-shape-flow">
      <span className="nn-shape-pill">entrada · 2</span>
      <i>→</i>
      <span className="nn-shape-pill is-matrix">W₁ 2×3 + B₁ 1×3</span>
      <i>→</i>
      <span className="nn-shape-pill">oculta · 3</span>
      <i>→</i>
      <span className="nn-shape-pill is-matrix">W₂ 3×1 + B₂ 1×1</span>
      <i>→</i>
      <span className="nn-shape-pill">saída · 1</span>
    </div>
  );
}

function LayerMatrices() {
  return (
    <div className="nn-layer-matrices">
      <div>
        <span className="nn-layer-block-title">camada 1 · oculta · 3 neurônios</span>
        <div className="nn-matrix-pair">
          <MatrixTable label="W₁ · 2×3" values={DEMO.weightMats[0]} />
          <MatrixTable label="B₁ · 1×3" values={DEMO.biasMats[0]} />
        </div>
      </div>
      <div>
        <span className="nn-layer-block-title">camada 2 · saída · 1 neurônio</span>
        <div className="nn-matrix-pair">
          <MatrixTable label="W₂ · 3×1" values={DEMO.weightMats[1]} />
          <MatrixTable label="B₂ · 1×1" values={DEMO.biasMats[1]} />
        </div>
      </div>
    </div>
  );
}

function XorTable() {
  return (
    <table className="nn-data-table">
      <thead>
        <tr><th>x₁</th><th>x₂</th><th>alvo y</th></tr>
      </thead>
      <tbody>
        {XOR_X.map((row, index) => (
          <tr key={index}><td>{row[0]}</td><td>{row[1]}</td><td>{XOR_Y[index]}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function ForwardDiagram() {
  return (
    <div className="nn-flow-diagram">
      <div className="nn-diagram-matrix"><span>I · 1×2</span><b>i₁</b><b>i₂</b></div>
      <i>×</i>
      <div className="nn-diagram-matrix"><span>W · 2×3</span><b>w₁₁</b><b>w₁₂</b><b>w₁₃</b><b>w₂₁</b><b>w₂₂</b><b>w₂₃</b></div>
      <i>+</i>
      <div className="nn-diagram-matrix"><span>B · 1×3</span><b>b₁</b><b>b₂</b><b>b₃</b></div>
      <i>=</i>
      <div className="nn-diagram-matrix"><span>z · 1×3</span><b>z₁</b><b>z₂</b><b>z₃</b></div>
      <i>→ φ →</i>
      <div className="nn-diagram-matrix"><span>I′ · 1×3</span><b>a₁</b><b>a₂</b><b>a₃</b></div>
    </div>
  );
}

function WorkedExample() {
  return (
    <div className="nn-worked-example">
      <div className="nn-worked-row">
        <span className="nn-worked-label">camada 1</span>
        <MatrixTable label="I0 · 1×2" values={[SAMPLE]} />
        <i>×</i>
        <MatrixTable label="W₁ · 2×3" values={DEMO.weightMats[0]} highlight={(_, col) => col === 0} />
        <i>+</i>
        <MatrixTable label="B₁ · 1×3" values={DEMO.biasMats[0]} highlight={(_, col) => col === 0} />
        <i>=</i>
        <MatrixTable label="Z₁ · 1×3" values={[Z1]} highlight={(_, col) => col === 0} />
      </div>
      <div className="nn-worked-row">
        <span className="nn-worked-label">camada 1 · φ</span>
        <MatrixTable label="Z₁" values={[Z1]} />
        <span className="nn-worked-arrow">relu →</span>
        <MatrixTable label="I₁ · 1×3" values={[I1]} />
        <span className="nn-worked-note">o valor negativo é desligado</span>
      </div>
      <div className="nn-worked-row">
        <span className="nn-worked-label">camada 2</span>
        <MatrixTable label="I₁ · 1×3" values={[I1]} />
        <i>×</i>
        <MatrixTable label="W₂ · 3×1" values={DEMO.weightMats[1]} />
        <i>+</i>
        <MatrixTable label="B₂ · 1×1" values={DEMO.biasMats[1]} />
        <i>=</i>
        <MatrixTable label="Z₂ · 1×1" values={[Z2]} />
      </div>
      <div className="nn-worked-row">
        <span className="nn-worked-label">camada 2 · φ</span>
        <MatrixTable label="Z₂" values={[Z2]} />
        <span className="nn-worked-arrow">tanh →</span>
        <MatrixTable label="I₂ · 1×1" values={[I2]} />
        <span className="nn-worked-note">a resposta final para esta amostra</span>
      </div>
    </div>
  );
}

function BackwardDiagram() {
  return (
    <div className="nn-backward-diagram">
      <div className="nn-flow-row is-forward">
        <span>entrada<br /><small>1×2</small></span>
        <i>→</i>
        <span>oculta<br /><small>1×3</small></span>
        <i>→</i>
        <span>saída<br /><small>1×1</small></span>
        <i>→</i>
        <span className="is-loss">perda<br /><small>escalar</small></span>
      </div>
      <div className="nn-flow-row is-backward">
        <span>∂L/∂W, ∂L/∂b</span>
        <i>←</i>
        <span>δ oculta</span>
        <i>←</i>
        <span>δ saída</span>
        <i>←</i>
        <span className="is-loss">perda</span>
      </div>
      <p>As ativações da ida ficam na tela; o erro é desenhado por cima, da direita para a esquerda.</p>
    </div>
  );
}

function DescentDiagram() {
  return (
    <div className="nn-descent-diagram">
      <span>perda</span>
      <div>
        {[0.8, 0.41, 0.12, 0.01].map((value, index) => (
          <div key={index}><i style={{ height: `${Math.max(6, value * 110)}px` }} /><b>W{index}</b><small>{value.toFixed(2)}</small></div>
        ))}
      </div>
      <code>W ← W − η · ∂L/∂W</code>
    </div>
  );
}

function LoopDiagram() {
  return (
    <div className="nn-loop-diagram">
      <div className="nn-loop-steps">
        <span>ida</span><i>→</i><span>perda</span><i>→</i><span>volta</span><i>→</i><span>atualização</span>
      </div>
      <div className="nn-epoch-samples" aria-label="Quatro amostras do XOR">
        {["x₁", "x₂", "x₃", "x₄"].map((sample) => (
          <span key={sample}>{sample}<small>gradiente</small></span>
        ))}
      </div>
      <div className="nn-epoch-average">
        <span>∇W da época</span>
        <b>média dos 4 gradientes</b>
        <small>um único passo de atualização</small>
      </div>
      <b>↺ a cada época</b>
      <div className="nn-loop-bars">{[85, 58, 30, 10, 4].map((height) => <i key={height} style={{ height: `${height}%` }} />)}</div>
      <small>perda por época</small>
    </div>
  );
}

function CodeInline({ children }: { children: ReactNode }) {
  return <code className="nn-inline-code">{children}</code>;
}

export interface Chapter {
  id: string;
  module: string;
  label: string;
  kicker: string;
  title: string;
  lead: string;
  playground?: number;
  observation?: ReactNode;
  content: ReactNode;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "inicio",
    module: "Fundamentos",
    label: "Do neurônio à rede",
    kicker: "Comece pela base",
    title: "Uma rede neural é uma função feita de camadas",
    lead:
      "Vamos construir uma rede neural pequena, treinável e totalmente visível: do neurônio à atualização dos pesos.",
    content: (
      <>
        <div className="nn-goals">
          <div><b>O que você vai fazer</b><span>Construir uma rede, conduzir a passagem direta, retropropagar o erro, atualizar pesos e treinar no XOR.</span></div>
          <div><b>Como funciona</b><span>Cada conceito tem um capítulo. Os cinco playgrounds aparecem quando a base necessária já foi apresentada.</span></div>
          <div><b>O que fica no navegador</b><span>Dados, pesos, cálculo e gráficos. O playground calcula tudo localmente.</span></div>
        </div>
        <p>
          A rede desta aula tem <b>2 entradas</b>, <b>3 neurônios ocultos</b> e <b>1 saída</b>. É pequena o suficiente para
          enxergar cada número, mas já contém o ciclo completo que sustenta modelos maiores: representar, prever, medir o
          erro e ajustar parâmetros.
        </p>
        <BuildDiagram />
        <Note title="Escopo">
          Estamos construindo uma rede <i>feed-forward</i> densa. O foco é o funcionamento interno: representação,
          passagem direta, perda, retropropagação e atualização dos parâmetros.
        </Note>
      </>
    ),
  },
  {
    id: "neuronio",
    module: "Fundamentos",
    label: "Um neurônio",
    kicker: "A menor unidade",
    title: "Um neurônio multiplica, soma e ativa",
    lead:
      "O neurônio recebe valores, multiplica cada um por um peso, soma um viés e passa o resultado por uma função de ativação.",
    content: (
      <>
        <p>
          A soma ponderada <CodeInline>z</CodeInline> é a <b>pré-ativação</b>. O viés <CodeInline>b</CodeInline> desloca a
          soma inteira: um viés muito negativo faz o neurônio precisar de uma entrada mais forte antes de disparar.
        </p>
        <Formula>
          z = x₁·w₁ + x₂·w₂ + … + xₙ·wₙ + b
          <br />a = φ(z)
        </Formula>
        <p>
          A primeira linha é um <b>produto escalar</b>. Com muitas entradas e muitos neurônios, a mesma operação vira uma
          multiplicação de matrizes — e é isso que uma camada faz.
        </p>
        <NeuronLab />
        <Note>
          O número dentro de cada círculo na tela do playground é <CodeInline>a</CodeInline>, a ativação que o neurônio
          envia adiante — não o valor de <CodeInline>z</CodeInline>.
        </Note>
      </>
    ),
  },
  {
    id: "camadas",
    module: "Fundamentos",
    label: "Camadas e topologia",
    kicker: "A forma da rede",
    title: "As camadas dão forma à rede",
    lead:
      "A lista passada para NeuralNetwork(...) é a topologia: quantos neurônios existem em cada camada.",
    content: (
      <>
        <p>
          <CodeInline>[2, 3, 1]</CodeInline> significa dois neurônios de entrada, três ocultos e um de saída. Cada seta
          entre camadas carrega uma <b>matriz de pesos</b> <CodeInline>W</CodeInline>: uma linha por neurônio que envia,
          uma coluna por neurônio que recebe. O viés de cada neurônio da nova camada fica em uma linha{" "}
          <CodeInline>B</CodeInline>.
        </p>
        <ShapesDiagram />
        <LayerMatrices />
        <p>
          Leia uma coluna de <CodeInline>W₁</CodeInline> como a receita de um neurônio oculto: a primeira coluna é por
          quanto esse neurônio multiplica as duas entradas, e o primeiro valor de <CodeInline>B₁</CodeInline> é o viés que
          ele soma.
        </p>
        <Note>
          Esta rede tem <b>13 números treináveis</b>: 6 pesos + 3 vieses na primeira camada, e 3 pesos + 1 viés na segunda.
          Os valores mostrados vêm da semente 42 usada nesta página.
        </Note>
      </>
    ),
  },
  {
    id: "dados",
    module: "Fundamentos",
    label: "Dados e XOR",
    kicker: "O problema",
    title: "O conjunto de dados faz parte do modelo",
    lead:
      "Features(...) guarda as entradas; Labels(...) guarda as respostas que queremos que a rede produza. Vamos usar o clássico XOR.",
    content: (
      <>
        <p>
          <CodeInline>X</CodeInline> tem uma linha por amostra e uma coluna por atributo. <CodeInline>y</CodeInline> tem
          uma resposta por amostra. No XOR, as duas classes não são separáveis por uma única reta.
        </p>
        <XorTable />
        <p>
          Uma camada oculta permite dobrar a fronteira de decisão. É por isso que o XOR é um exemplo tão útil: uma rede
          sem camada oculta não resolve o problema; com uma camada oculta, resolve.
        </p>
        <Formula>
          X · 4×2
          <br />y · 4×1
        </Formula>
        <Note>
          Os quatro pares são os mesmos em todos os playgrounds. Mudar a amostra escolhida muda os valores intermediários,
          mas não os parâmetros aprendidos.
        </Note>
      </>
    ),
  },
  {
    id: "ativacoes",
    module: "Fundamentos",
    label: "Funções de ativação",
    kicker: "A curva que decide",
    title: "ReLU e tanh decidem com que força um neurônio dispara",
    lead:
      "A ativação transforma a soma bruta no valor que o neurônio envia adiante. Duas curvas bastam para esta aula.",
    content: (
      <>
        <p>
          <CodeInline>hidden="relu"</CodeInline> usa a unidade linear retificada: deixa passar valores positivos e desliga
          os negativos. <CodeInline>output="tanh"</CodeInline> comprime qualquer número para o intervalo −1 … 1.
        </p>
        <Formula>
          relu(z) = max(0, z)
          <br />tanh(z) = (eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ)
        </Formula>
        <ActivationLab />
        <p>
          Sem uma ativação não linear, empilhar camadas ainda seria uma única função linear grande. A dobra da ReLU e a
          compressão da tanh são o que permite representar regras não lineares como o XOR.
        </p>
        <Note>
          Outras redes usam funções mais suaves, como GELU. ReLU e tanh aparecem aqui porque são simples de derivar e
          visualizar; a ideia de não linearidade é a mesma.
        </Note>
      </>
    ),
  },
  {
    id: "inicializacao",
    module: "Fundamentos",
    label: "Inicialização e semente",
    kicker: "O ponto de partida",
    title: "Antes do treino, todo peso precisa de um valor inicial",
    lead:
      "init=\"xavier\" sorteia valores pequenos escalados pelos tamanhos das camadas. A semente torna o sorteio reprodutível.",
    content: (
      <>
        <p>
          <CodeInline>init="random"</CodeInline> usa um espalhamento uniforme maior;{" "}
          <CodeInline>init="xavier"</CodeInline> usa limites proporcionais a <CodeInline>1/√num_entradas</CodeInline>.
          Nenhum é “correto”: são pontos de partida. Um início ruim pode deixar o aprendizado mais lento.
        </p>
        <p>
          <CodeInline>seed=42</CodeInline> faz a mesma semente e a mesma topologia construírem sempre a mesma rede. É por
          isso que os exemplos desta aula e o playground mostram os mesmos números.
        </p>
        <CodeBlock>{`nn = NeuralNetwork([2, 3, 1],
                   hidden="relu",
                   output="tanh",
                   init="xavier",
                   seed=42)`}</CodeBlock>
        <Note>
          A semente não “aprende” nada. Ela apenas controla o sorteio inicial. Remova a semente e cada execução começa de
          um conjunto aleatório diferente.
        </Note>
      </>
    ),
  },
  {
    id: "construir",
    module: "Construir",
    label: "Construção da rede",
    kicker: "Construção · playground 1",
    title: "Construção da rede: dados, topologia e parâmetros",
    lead:
      "Uma rede começa pela escolha do problema, pela topologia e pelos valores iniciais. O playground desenha exatamente a rede que o script constrói.",
    playground: 1,
    observation: (
      <ul>
        <li>Dê 5 neurônios à camada oculta: <CodeInline>[2, 5, 1]</CodeInline> — conte as linhas e os parâmetros extras.</li>
        <li>Empilhe uma segunda camada oculta: <CodeInline>[2, 4, 3, 1]</CodeInline>.</li>
        <li>Troque <CodeInline>init</CodeInline> para <CodeInline>"random"</CodeInline> e passe o mouse nas arestas.</li>
        <li>Mude a semente e execute de novo: outro sorteio, o mesmo projeto.</li>
      </ul>
    ),
    content: (
      <>
        <p>
          O conjunto de dados define a entrada e o alvo. A topologia define quantas camadas e quantos neurônios existem.
          A inicialização e a semente definem o ponto de partida dos pesos e vieses.
        </p>
        <p>
          No playground, a tela é a própria rede. Clique em uma camada para ler <CodeInline>W</CodeInline> e{" "}
          <CodeInline>B</CodeInline>, ou em um neurônio para ver os pesos que chegam nele e o viés.
        </p>
        <BuildDiagram />
      </>
    ),
  },
  {
    id: "produto-escalar",
    module: "Passagem direta",
    label: "Produto escalar",
    kicker: "Passagem direta · 1",
    title: "Um neurônio faz um produto escalar",
    lead:
      "Para a camada l e o neurônio j, a passagem direta é a regra do neurônio da etapa anterior aplicada a cada valor que chega.",
    content: (
      <>
        <Formula>
          zⱼ = Σᵢ Iᵢ · Wᵢⱼ + bⱼ
          <br />aⱼ = φ(zⱼ)
        </Formula>
        <p>
          <CodeInline>Iᵢ</CodeInline> é a ativação que vem do neurônio i da camada anterior,{" "}
          <CodeInline>Wᵢⱼ</CodeInline> é o peso da conexão e <CodeInline>bⱼ</CodeInline> é o viés do neurônio. O índice j
          percorre os neurônios da nova camada.
        </p>
        <p>
          O produto escalar compara o padrão de entrada com o padrão de pesos deste neurônio. Um produto muito positivo
          significa que a entrada aponta na mesma direção dos pesos; um muito negativo, na direção oposta.
        </p>
        <Note>
          Na tela, as linhas coloridas são pesos: verde/teal para positivo, azul para negativo, mais grossas quando a
          magnitude é maior.
        </Note>
      </>
    ),
  },
  {
    id: "equacao-matricial",
    module: "Passagem direta",
    label: "Equação matricial",
    kicker: "Passagem direta · 2",
    title: "Todos os neurônios de uma vez",
    lead:
      "Fazer todos os neurônios de uma camada ao mesmo tempo dá a forma matricial: Z = I · W + B e I′ = φ(Z).",
    content: (
      <>
        <Formula>
          Z = I · W + B
          <br />I′ = φ(Z)
        </Formula>
        <ForwardDiagram />
        <p>
          <CodeInline>I</CodeInline> tem uma linha e uma coluna por atributo de entrada; <CodeInline>W</CodeInline> tem uma
          linha por entrada e uma coluna por neurônio desta camada; <CodeInline>B</CodeInline> tem um viés por neurônio.
          Assim <CodeInline>Z</CodeInline> e <CodeInline>I′</CodeInline> saem como uma linha com um valor por neurônio.
        </p>
        <Note>
          A primeira camada transforma uma linha 1×2 em 1×3. A camada de saída transforma essa linha 1×3 em 1×1. O painel
          de matrizes do playground mostra exatamente esses cartões, com as formas em cada legenda.
        </Note>
      </>
    ),
  },
  {
    id: "camada-por-camada",
    module: "Passagem direta",
    label: "Camada por camada",
    kicker: "Passagem direta · 3",
    title: "Por que há duas chamadas de forward",
    lead:
      "Cada chamada nn.forward(valor, camada) avança exatamente uma camada explícita e devolve as novas ativações.",
    content: (
      <>
        <CodeBlock>{`I1 = nn.forward(I0, 1)   # camada oculta
I2 = nn.forward(I1, 2)   # camada de saída`}</CodeBlock>
        <p>
          A numeração começa em 1. A chamada guarda os valores intermediários — <CodeInline>z</CodeInline> e as ativações
          que entram em cada camada — na rede. Essa passagem armazenada é o que a retropropagação vai usar depois.
        </p>
        <p>
          Abaixo, uma passagem completa com a rede padrão na segunda amostra do XOR, <CodeInline>X[1] = [0, 1]</CodeInline>.
          Todos os números são calculados pela mesma rede da página:
        </p>
        <WorkedExample />
        <Formula>z₁ = 0·w₁₁ + 1·w₂₁ + b₁ = {formatNumber(Z1[0], 3)}</Formula>
        <p>
          A ReLU corta o valor negativo para zero, então a linha oculta é{" "}
          <CodeInline>[{I1.map((value) => formatNumber(value)).join(", ")}]</CodeInline>. O neurônio de saída repete a
          operação com <CodeInline>W₂</CodeInline> e <CodeInline>B₂</CodeInline>, e a tanh comprime o resultado para{" "}
          <CodeInline>{formatNumber(I2[0], 3)}</CodeInline>.
        </p>
      </>
    ),
  },
  {
    id: "passagem",
    module: "Passagem direta",
    label: "Passagem direta",
    kicker: "Passagem direta · playground 2",
    title: "Passagem direta: da entrada à resposta",
    lead:
      "A passagem direta transforma uma amostra em uma resposta. Cada camada multiplica pela matriz de pesos, soma o viés e aplica a ativação.",
    playground: 2,
    observation: (
      <ul>
        <li>Mude a amostra: <CodeInline>I0 = X[1]</CodeInline> ou <CodeInline>X[3]</CodeInline>.</li>
        <li>Apague a última chamada de <CodeInline>nn.forward</CodeInline> e pare no meio da rede.</li>
        <li>Clique na camada oculta e compare suas matrizes com as da saída.</li>
        <li>Volte à construção, troque a ativação e retorne para comparar os números.</li>
      </ul>
    ),
    content: (
      <>
        <p>
          A rede guarda a passagem inteira: os valores que entram em cada camada, as pré-ativações e as ativações que saem.
          É essa passagem armazenada que permite à retropropagação saber por onde o erro deve voltar.
        </p>
        <Formula>
          I′ = φ(I · W + B)
        </Formula>
        <p>
          O painel de matrizes do playground mostra o passo como uma equação:{" "}
          <CodeInline>[I] × [W] + [B] = [z] → [I′]</CodeInline>. Pause a animação para comparar antes e depois de cada
          camada.
        </p>
      </>
    ),
  },
  {
    id: "perda",
    module: "Retropropagar",
    label: "A perda",
    kicker: "Retropropagação · 1",
    title: "A perda mede o erro",
    lead:
      "Para uma amostra, comparamos a saída da rede com o rótulo. A perda transforma essa diferença em um único número.",
    content: (
      <>
        <Formula>L = ½ · Σₖ (ŷₖ − tₖ)²</Formula>
        <p>
          Se a saída for exatamente o alvo, <CodeInline>L = 0</CodeInline>. Uma resposta errada dá uma perda positiva. O
          nó de perda acrescentado à tela é esse escalar; seu valor é o erro ao quadrado da amostra escolhida.
        </p>
        <p>
          Para <CodeInline>X[0] = [0, 0]</CodeInline> o alvo é 0; para <CodeInline>X[1] = [0, 1]</CodeInline> o alvo é 1.
          Uma resposta confiantemente errada custa muito mais que uma resposta errada por pouco.
        </p>
        <LossLab />
        <BackwardDiagram />
      </>
    ),
  },
  {
    id: "delta-saida",
    module: "Retropropagar",
    label: "Delta da saída",
    kicker: "Retropropagação · 2",
    title: "O delta da camada de saída",
    lead:
      "A retropropagação começa na saída. O delta δ diz o quanto uma pequena mudança na pré-ativação z mudaria a perda.",
    content: (
      <>
        <Formula>δ_out = (ŷ − t) ⊙ φ′(z_out)</Formula>
        <p>
          O primeiro fator é o erro bruto: a diferença entre resposta e alvo. O segundo é a derivada da ativação de saída
          — o quão sensível a ativação é neste <CodeInline>z</CodeInline>. O símbolo ⊙ é multiplicação elemento a
          elemento.
        </p>
        <p>
          Com <CodeInline>tanh</CodeInline>, a derivada é <CodeInline>1 − tanh(z)²</CodeInline>. Saídas saturadas têm
          derivada pequena e, por isso, aprendem devagar.
        </p>
        <DeltaVisual />
        <Note>
          O delta da camada de saída e a perda aparecem juntos na primeira linha de volta. O painel de matrizes mostra δ,
          as ativações que entram na camada e os gradientes que vêm a seguir.
        </Note>
      </>
    ),
  },
  {
    id: "regra-cadeia",
    module: "Retropropagar",
    label: "Regra da cadeia",
    kicker: "Retropropagação · 3",
    title: "Camadas ocultas: a regra da cadeia flui para a esquerda",
    lead:
      "Um neurônio oculto não tem alvo próprio. A culpa dele vem dos neurônios que ele alimenta.",
    content: (
      <>
        <p>
          Cada conexão com a próxima camada carrega um peso e um delta. Some essas contribuições e multiplique pela
          derivada da ativação oculta:
        </p>
        <Formula>δ_hidden = (W_outᵀ · δ_out) ⊙ φ′(z_hidden)</Formula>
        <p>
          Leia da direita para a esquerda: os deltas da saída voltam pelos pesos da saída, são somados para o neurônio
          oculto e então moldados pela derivada da ativação oculta. Essa é a <b>regra da cadeia</b>.
        </p>
        <p>
          Para uma rede com mais camadas ocultas, repita o mesmo passo uma camada por vez, caminhando para a esquerda. É
          por isso que o script de volta tem uma chamada por camada.
        </p>
        <ChainRuleVisual />
      </>
    ),
  },
  {
    id: "gradientes",
    module: "Retropropagar",
    label: "Gradientes",
    kicker: "Retropropagação · 4",
    title: "Gradientes: quanta culpa cabe a cada parâmetro",
    lead:
      "Uma vez conhecido δ, o gradiente de um peso é a ativação que entra nele vezes o delta que sai dele.",
    content: (
      <>
        <Formula>
          ∂L/∂W = aᵀ · δ
          <br />∂L/∂b = δ
        </Formula>
        <p>
          O gradiente dos pesos é um <b>produto externo</b>: uma linha por ativação de entrada, uma coluna por delta de
          saída. Sua forma bate exatamente com <CodeInline>W</CodeInline>. O gradiente do viés é só a linha de δ.
        </p>
        <p>
          Um gradiente positivo significa que aumentar o peso aumentaria a perda, então o treino vai mover o peso no
          sentido oposto. Passe o mouse em qualquer peso, viés ou neurônio da tela para ler sua regra da cadeia pessoal
          desde a perda, salto a salto com números.
        </p>
        <GradientVisual />
        <Note>
          As matrizes do painel mostram as mesmas quantidades como cartões: <CodeInline>W</CodeInline>,{" "}
          <CodeInline>a</CodeInline>, <CodeInline>δ</CodeInline>, <CodeInline>∂L/∂W</CodeInline> e{" "}
          <CodeInline>∂L/∂b</CodeInline>.
        </Note>
      </>
    ),
  },
  {
    id: "retropropagacao",
    module: "Retropropagar",
    label: "Retropropagação",
    kicker: "Retropropagação · playground 3",
    title: "Retropropagação: o erro volta pela rede",
    lead:
      "A retropropagação calcula quanto cada peso e viés contribuiu para a perda. O erro caminha da saída para a entrada, camada por camada.",
    playground: 3,
    observation: (
      <ul>
        <li>Passe o mouse no nó de perda para ver como o erro ao quadrado se soma.</li>
        <li>Passe o mouse em uma aresta oculta e leia sua cadeia até o gradiente.</li>
        <li>Pause em uma linha de volta e compare os δs com as ativações acima deles.</li>
        <li>Clique em uma camada para inspecionar W e B enquanto os δs estão visíveis.</li>
      </ul>
    ),
    content: (
      <>
        <p>
          O primeiro passo compara a saída com o alvo. O delta da saída carrega esse erro e a derivada da ativação. Depois,
          cada camada oculta recebe a soma ponderada dos deltas da camada seguinte.
        </p>
        <Formula>
          δ_out = (ŷ − t) ⊙ φ′(z_out)
          <br />δ_hidden = (W_outᵀ · δ_out) ⊙ φ′(z_hidden)
        </Formula>
        <BackpropVisual />
        <p>
          No playground, não há chamadas de <CodeInline>nn.forward</CodeInline>. A primeira chamada de{" "}
          <CodeInline>nn.backward</CodeInline> recebe o rótulo e reconstrói o traço; a próxima recebe o δ devolvido e
          caminha uma camada para a esquerda.
        </p>
      </>
    ),
  },
  {
    id: "descida",
    module: "Atualizar",
    label: "Descida do gradiente",
    kicker: "Atualização · 1",
    title: "Descida do gradiente em uma linha",
    lead:
      "Um gradiente é a direção de maior crescimento. Para diminuir a perda, mova na direção oposta.",
    content: (
      <>
        <Formula>
          W ← W − η · ∂L/∂W
          <br />B ← B − η · ∂L/∂b
        </Formula>
        <p>
          <CodeInline>η</CodeInline> (eta) é a <b>taxa de aprendizado</b>: o tamanho do passo. O gradiente tem a mesma
          forma do parâmetro, então a atualização é elemento a elemento.
        </p>
        <DescentDiagram />
        <p>
          Depois de uma atualização, os pesos são um pouco diferentes. Isso significa que todo valor da passagem direta e
          todo gradiente anterior a este passo pertencem aos pesos antigos.
        </p>
      </>
    ),
  },
  {
    id: "taxa",
    module: "Atualizar",
    label: "Taxa de aprendizado",
    kicker: "Atualização · 2",
    title: "Pequena demais, grande demais",
    lead:
      "A taxa de aprendizado controla quanto um passo anda. Ela é um dos primeiros parâmetros a experimentar.",
    content: (
      <>
        <Formula>
          η pequeno → lento, mas seguro
          <br />η grande → rápido, mas pode passar do ponto
        </Formula>
        <p>
          Com η minúsculo, a perda melhora muito devagar; com η enorme, o passo pode pular o vale e piorar a perda, ou até
          divergir. Os cartões de atualização mostram <CodeInline>lr</CodeInline> explicitamente para você comparar
          valores como 0.1, 0.5 e 2.0.
        </p>
        <LearningRateLab />
        <Note>
          A taxa não altera os parâmetros aprendidos por conta própria. Ela só escala o passo dado na direção do
          gradiente.
        </Note>
      </>
    ),
  },
  {
    id: "origem-gradientes",
    module: "Atualizar",
    label: "De onde vêm os gradientes",
    kicker: "Atualização · 3",
    title: "O gradiente guardado é reutilizado",
    lead:
      "nn.gradient(camada) devolve o par [dW, dB] daquela camada; nn.update_weights(lr, camada, gradientes) o aplica.",
    content: (
      <>
        <CodeBlock>{`g2 = nn.gradient(2)                    # [dW₂, dB₂]
nn.update_weights(0.5, 2, g2)         # W₂ ← W₂ − 0.5·dW₂`}</CodeBlock>
        <p>
          Você pode atualizar qualquer camada, quantas vezes quiser, em qualquer ordem. Repetir uma camada reutiliza os
          mesmos gradientes, o que é útil para explorar o tamanho do passo, mas não é o mesmo que treino de verdade.
        </p>
        <p>
          Uma atualização marca a passagem direta guardada como desatualizada. A tela redesenha os novos pesos; para
          calcular outra passagem de volta, volte ao playground de passagem direta e execute de novo.
        </p>
      </>
    ),
  },
  {
    id: "atualizacao",
    module: "Atualizar",
    label: "Atualização dos pesos",
    kicker: "Atualização · playground 4",
    title: "Atualização dos pesos: um passo contra o gradiente",
    lead:
      "O gradiente aponta para onde a perda cresce. Atualizar os pesos significa dar um passo na direção oposta, escalado pela taxa de aprendizado.",
    playground: 4,
    observation: (
      <ul>
        <li>Atualize a camada de saída com <CodeInline>lr=1.0</CodeInline> e compare com os pesos antigos.</li>
        <li>Atualize a mesma camada duas vezes: o mesmo gradiente é aplicado duas vezes.</li>
        <li>Atualize a camada oculta antes da saída — a ordem é você quem decide.</li>
        <li>Tente rodar uma volta depois de atualizar e leia a mensagem: é preciso uma nova passagem direta.</li>
      </ul>
    ),
    content: (
      <>
        <Formula>
          W′ = W − η · ∂L/∂W
          <br />B′ = B − η · ∂L/∂b
        </Formula>
        <p>
          A taxa de aprendizado <CodeInline>η</CodeInline> controla o tamanho do passo. Um passo pequeno demais demora; um
          passo grande demais pode passar do ponto. O playground mostra <CodeInline>lr</CodeInline> e o gradiente em cada
          atualização.
        </p>
        <DescentDiagram />
      </>
    ),
  },
  {
    id: "epocas",
    module: "Treinar e prever",
    label: "Épocas e lote",
    kicker: "Treino · 1",
    title: "Uma época é uma passada pelo conjunto inteiro",
    lead:
      "O treino de verdade repete o ciclo ida → perda → volta → atualização para cada amostra, muitas vezes.",
    content: (
      <>
        <p>Em cada época, <CodeInline>nn.train</CodeInline>:</p>
        <ol className="nn-numbered-list">
          <li>roda a passagem direta para cada amostra;</li>
          <li>calcula a perda e os gradientes verdadeiros para cada amostra;</li>
          <li>tira a média dos gradientes; e</li>
          <li>dá um passo de descida do gradiente.</li>
        </ol>
        <Formula>
          ∇W_epoch = (1/N) · Σₙ ∂Lₙ/∂W
          <br />W ← W − η · ∇W_epoch
        </Formula>
        <p>
          Tirar a média sobre todas as amostras — uma atualização de <b>lote completo</b> — deixa cada passo menos ruidoso
          do que atualizar depois de cada amostra.
        </p>
        <LoopDiagram />
      </>
    ),
  },
  {
    id: "momentum",
    module: "Treinar e prever",
    label: "Momentum",
    kicker: "Treino · 2",
    title: "Momentum lembra o passo anterior",
    lead:
      "nn.train também aceita momentum. Ele soma uma fração da mudança anterior à próxima, como uma bola descendo a encosta que mantém um pouco de velocidade.",
    content: (
      <>
        <Formula>
          ΔW = μ · ΔW_prev − η · ∂L/∂W
          <br />W ← W + ΔW
        </Formula>
        <p>
          <CodeInline>μ = 0</CodeInline> é descida do gradiente pura; o padrão <CodeInline>μ = 0.1</CodeInline> suaviza o
          caminho e pode acelerar a convergência. Os parâmetros do tutorial são só um ponto de partida.
        </p>
        <MomentumVisual />
        <Note>
          Momentum é um estado temporário do otimizador, não um novo parâmetro aprendido da rede. Ele guarda a última
          mudança de cada peso e viés.
        </Note>
      </>
    ),
  },
  {
    id: "metricas",
    module: "Treinar e prever",
    label: "Lendo as métricas",
    kicker: "Treino · 3",
    title: "A curva de perda registra cada época",
    lead:
      "A época 0 é a rede inicial antes de qualquer aprendizado. A curva deve cair conforme o treino avança.",
    content: (
      <>
        <p>
          O cabeçalho do gráfico mostra a perda inicial, a final e a <b>acurácia</b>: a fração de amostras cuja saída
          arredondada bate com o rótulo.
        </p>
        <Formula>
          perda ↓ significa que a rede está ajustando os dados
          <br />acurácia ↑ significa que as respostas arredondadas batem
        </Formula>
        <p>
          Uma perda que cai com 100% de acurácia no XOR significa que a rede aprendeu a regra não linear. Em um conjunto
          mais difícil, a curva pode achatar acima de zero — sinal para adicionar capacidade, ajustar a taxa ou treinar
          por mais tempo.
        </p>
      </>
    ),
  },
  {
    id: "previsao",
    module: "Treinar e prever",
    label: "Prever e comparar",
    kicker: "Treino · 4",
    title: "Preveja cada amostra e compare com os alvos",
    lead:
      "nn.predict(X) passa cada linha do conjunto pela rede treinada e devolve uma linha de saída por amostra.",
    content: (
      <>
        <CodeBlock>{`P = nn.predict(X)   # forma (n_amostras, n_saídas)`}</CodeBlock>
        <p>
          Como a ativação de saída é <CodeInline>tanh</CodeInline>, as previsões são valores contínuos perto de −1 … 1; a
          tabela os arredonda para a checagem de acurácia. Para as amostras XOR, os valores treinados devem ficar perto
          dos alvos.
        </p>
        <Note>
          A tabela de resultados mostra <CodeInline>ŷ</CodeInline>, o alvo <CodeInline>y</CodeInline> e um ✓ ou ✗. Ela
          usa a mesma rede e os mesmos dados do gráfico de perda.
        </Note>
      </>
    ),
  },
  {
    id: "treino",
    module: "Treinar e prever",
    label: "Treino e previsão",
    kicker: "Treino · playground 5",
    title: "Treino e previsão: o ciclo completo",
    lead:
      "Treinar é repetir o ciclo de passagem direta, perda, retropropagação e atualização por muitas épocas. Depois, a rede prevê cada amostra.",
    playground: 5,
    observation: (
      <ul>
        <li>Experimente <CodeInline>epochs=3000</CodeInline> ou uma taxa menor/maior.</li>
        <li>Defina <CodeInline>momentum=0.0</CodeInline> e compare a velocidade de convergência.</li>
        <li>Mude a largura oculta para <CodeInline>[2, 5, 1]</CodeInline> e treine de novo.</li>
        <li>Compare a tabela de resultados depois de 20 e de 800 épocas.</li>
      </ul>
    ),
    content: (
      <>
        <p>
          O script final reconstrói os dados e uma rede nova. Ele usa a mesma topologia e a mesma semente do início, então
          você pode comparar o ponto de partida com a rede treinada.
        </p>
        <LoopDiagram />
        <p>
          O gráfico de perda registra cada época; a tabela de resultados compara a previsão <CodeInline>ŷ</CodeInline> com
          o alvo <CodeInline>y</CodeInline>.
        </p>
      </>
    ),
  },
  {
    id: "sintese",
    module: "Fechar o ciclo",
    label: "Síntese",
    kicker: "O ciclo completo",
    title: "Construir, prever, medir, voltar e atualizar",
    lead:
      "Você percorreu o ciclo que transforma uma rede aleatória em uma função capaz de resolver o XOR.",
    content: (
      <>
        <div className="nn-summary-line">
          construir <i>→</i> passagem direta <i>→</i> perda <i>→</i> retropropagação <i>→</i> atualização <i>↺</i>
        </div>
        <div className="nn-summary-grid">
          <div><b>Representação</b><p>X, y, topologia, W e B definem o problema e a capacidade da rede.</p></div>
          <div><b>Previsão</b><p>I·W + B e a ativação produzem uma saída para cada amostra.</p></div>
          <div><b>Aprendizado</b><p>A perda mede o erro; a regra da cadeia distribui a culpa; o gradiente desce a encosta.</p></div>
        </div>
        <Note title="Limite do exemplo">
          O XOR é um problema minúsculo. Uma rede real pode ter milhões de parâmetros, vários tipos de camada e dados
          muito mais complexos. O ciclo, porém, continua reconhecível: representar, prever, medir o erro e ajustar.
        </Note>
        <p className="nn-source-note">
          Esta aula adapta a experiência <a href="https://andresberejnoi.com/how-to-implement-backpropagation-with-numpy/" target="_blank" rel="noreferrer">neural-network-xray</a>{" "}
          para o navegador, com números didáticos e cálculo local.
        </p>
      </>
    ),
  },
];
