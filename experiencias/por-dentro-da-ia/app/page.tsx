"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MatrixLandscape } from "./matrix-landscape";
import { ArchitectureCompass } from "./architecture-compass";
import { embeddings as embeddingRows, positions } from "./lesson-math";
import { JourneyPrelude, VectorIntro, PositionIntro, WaveFigure, MatrixIntuition, BlockExplorer, AttentionStory, MLPStory, OrigamiStory, DepthStory, ToyJourney, ReadoutStory, CheckUnderstanding, Glossary, MoreMath, NormalizationStory, SoftmaxStory, ProjectionLesson, NeuralNetworkStory, ActivationComparison, VocabularyBoundary } from "./visual-story";

const phrase = "A vegetação saudável apresenta alta reflectância no infravermelho próximo";
const tokens = ["A", "vegetação", "saudável", "apresenta", "alta", "reflectância", "no", "infravermelho", "próximo"];
const generationTokens = [" porque", " a", " estrutura", " interna", " das", " folhas", " dispersa", " essa", " radiação", "."];
const sectionIds = ["inicio","ensaio","mapa","tokens","vetores","ordem","matriz","transformer","qkv","atencao","softmax","normalizacao","mlp","dobras","profundidade","laboratorio","saida","ciclo","fontes"];
const sectionLabels = ["Uma frase ganha contexto","Dentro da caixa","Mapa da jornada","Do texto aos tokens","O vetor original","A posição também conta","Combinar e deslocar","Por dentro de um bloco","Q, K e V sem mistério","Atenção: conectar posições","Softmax: de escores a pesos","Por que normalizar?","MLP: uma rede neural","Não linearidade e dobras","Os 96 blocos","Jornada com números","Escolher o próximo token","Construir uma resposta","Síntese e fontes"];
const tokenIds: Record<string, number> = { "A":31, "vegetação":8421, "saudável":17304, "apresenta":6210, "alta":2891, "reflectância":23117, "no":420, "infravermelho":19102, "próximo":7754 };
const positionVectors: Record<string, number[]> = Object.fromEntries(tokens.map((token,index)=>[token,positions[index]]));

function initialState(token: string) {
  return embeddingRows[token].map((value, index) => value + positionVectors[token][index]);
}

type ProjectionName = "Q" | "K" | "V";
type ProjectionMatrix = [number, number, number, number, number, number, number, number];
type ProjectionSet = Record<ProjectionName, ProjectionMatrix>;

const defaultProjectionMatrices: ProjectionSet = {
  Q: [0.1, 0.0, 0.9, 0.2, 0.0, 0.1, 0.1, 0.8],
  K: [0.0, 0.1, 1.0, 0.0, 0.1, 0.9, 0.0, 0.0],
  V: [0.8, 0.1, 0.2, 0.0, 0.0, 0.2, 0.7, 0.1],
};

function project(matrix: ProjectionMatrix, vector: number[]): [number, number] {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2] + matrix[3] * vector[3],
    matrix[4] * vector[0] + matrix[5] * vector[1] + matrix[6] * vector[2] + matrix[7] * vector[3],
  ];
}

function softmax(values: number[], temperature = 1) {
  const scaled = values.map((v) => v / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function attentionScores(queryIndex: number, matrices: ProjectionSet) {
  const q = project(matrices.Q, initialState(tokens[queryIndex]));
  return tokens.map((token, keyIndex) => {
    if (keyIndex > queryIndex) return null;
    const k = project(matrices.K, initialState(token));
    return (q[0] * k[0] + q[1] * k[1]) / Math.sqrt(2);
  });
}

function attentionWeights(queryIndex: number, matrices: ProjectionSet) {
  const scores = attentionScores(queryIndex, matrices);
  const allowed = scores.filter((v): v is number => v !== null);
  const weights = softmax(allowed);
  let k = 0;
  return scores.map((v) => v === null ? null : weights[k++]);
}

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <header className="section-title"><div className="scope-pill"><span>escopo desta aula</span><b>INFERÊNCIA · PARÂMETROS FIXOS</b></div><p className="eyebrow">{kicker}</p><h2>{title}</h2><p>{text}</p></header>;
}

function OpeningVectors() {
  return <div className="opening-vector-scene">
    <div className="opening-vector-head"><span>uma frase</span><i>→</i><b>um vetor inicial por posição</b></div>
    <div className="opening-vector-grid">{tokens.map((token, tokenIndex) => <div key={token} className={token === "próximo" ? "opening-vector focus" : "opening-vector"}><span>{String(tokenIndex + 1).padStart(2, "0")}</span><b>{token}</b><div>{embeddingRows[token].map((value, component) => <i key={component} className={value < 0 ? "negative" : ""}><em style={{ height: `${Math.max(2, Math.abs(value) * 19)}px` }} /></i>)}</div>{token === "próximo" && <small>vamos acompanhar este estado</small>}</div>)}</div>
    <div className="opening-vector-route"><span>e<sub>próximo</sub></span><i>＋ posição</i><span>x<sub>9</sub></span><i>→ 96 blocos</i><span>h<sub>9</sub><sup>(96)</sup></span><i>→</i><b>próximo token</b></div>
    <p>Os vetores têm quatro componentes apenas nesta demonstração. No GPT‑3 175B, cada posição é representada por 12.288 componentes.</p>
  </div>;
}

function InsideTheBoxEssay() {
  return <div className="inside-box">
    <div className="essay-question"><p className="mini-label">a pergunta que abre a caixa</p><h3>Se a IA “parece” alguma coisa, com o que ela se parece?</h3><blockquote>Com enormes grades de números conectadas por operações matemáticas.</blockquote><p>O ensaio <a href="https://www.ibm.com/think/news/what-does-ai-look-like" target="_blank" rel="noreferrer">“What does AI look like?”, da IBM</a>, parte de uma pergunta aparentemente simples e chega ao ponto central desta aula: sob a linguagem fluente há vetores, matrizes e parâmetros aprendidos.</p></div>
    <div className="essay-facts"><div><span>1ª grande grade</span><b>617.558.016</b><small>números somente em E</small></div><div><span>modelo inteiro</span><b>175 bilhões</b><small>de parâmetros no GPT‑3 175B</small></div><div><span>durante a inferência</span><b>pesos fixos</b><small>os estados temporários é que mudam</small></div></div>
    <p className="essay-thesis"><b>A pergunta da nossa jornada não é “onde está a resposta pronta?”</b><span>É: como uma entrada percorre essas grades e se transforma, passo a passo, em uma distribuição para o próximo token?</span></p>
  </div>;
}

function TokenLab() {
  const [mode, setMode] = useState<"didatica" | "subpalavras" | "caracteres">("didatica");
  const views = {
    didatica: ["A", " vegetação", " saudável", " apresenta", " alta", " reflectância", " no", " infravermelho", " próximo"],
    subpalavras: ["A", " veget", "ação", " saudável", " apresenta", " alta", " reflect", "ância", " no", " infra", "vermelho", " próximo"],
    caracteres: ["A", " ", "v", "e", "g", "e", "t", "a", "ç", "ã", "o", " …"],
  };
  return <div className="lab token-lab">
    <div className="lab-toolbar" role="group" aria-label="Escolha da tokenização">
      <button className={mode === "didatica" ? "active" : ""} onClick={() => setMode("didatica")}>Segmentação didática</button>
      <button className={mode === "subpalavras" ? "active" : ""} onClick={() => setMode("subpalavras")}>Outro tokenizer</button>
      <button className={mode === "caracteres" ? "active" : ""} onClick={() => setMode("caracteres")}>Caracteres</button>
    </div>
    <div className="token-stream" aria-live="polite">
      {views[mode].map((token, i) => <span key={`${token}-${i}`} style={{ "--i": i } as CSSProperties}>{token === " " ? "␠" : token}</span>)}
      <b>?</b>
    </div>
    <div className="lab-caption">
      <strong>Token não é sinônimo de palavra.</strong>
      <span><b>Token</b> é uma unidade individual; <b>vocabulário</b> é o conjunto de tokens e IDs; <b>tokenizer</b> é o procedimento que segmenta o texto usando esse vocabulário. Por isso, outro tokenizer pode dividir a mesma palavra de outra maneira. BPE significa Byte Pair Encoding: uma técnica que forma unidades maiores por mesclas sucessivas de pares frequentes. Os blocos acima são didáticos.</span>
    </div>
  </div>;
}

function EmbeddingLab() {
  const [selected, setSelected] = useState("vegetação");
  const embedding = embeddingRows[selected];
  const position = positionVectors[selected];
  const state = initialState(selected);
  const positionIndex = tokens.indexOf(selected) + 1;
  return <div className="lab embedding-lab">
    <div className="embedding-identity">
      <p className="mini-label">clique em um token da frase</p>
      <div className="embedding-token-strip">{tokens.map((token, index) => <button key={token} onClick={() => setSelected(token)} className={selected === token ? "active" : ""}><span>{index + 1}</span>{token}</button>)}</div>
      <div className="identity-flow"><div><span>texto</span><strong>“{selected}”</strong></div><i>→</i><div><span>ID didático</span><strong>{tokenIds[selected]}</strong></div><i>→</i><div><span>matriz de embeddings E</span><strong>linha {tokenIds[selected]} do “dicionário”</strong></div><i>→</i><div><span>posição na frase</span><strong>{positionIndex}</strong></div></div>
    </div>
    <div className="embedding-body">
      <div className="dictionary">
        <div className="dictionary-head"><span>token / linha</span>{[1, 2, 3, 4].map((n) => <span key={n}>c{n}</span>)}</div>
        {Object.entries(embeddingRows).map(([token, values]) => <button key={token} className={selected === token ? "selected row" : "row"} onClick={() => setSelected(token)}>
          <strong>{token}</strong>{values.map((v, i) => <span key={i}>{v.toFixed(2).replace(".", ",")}</span>)}
        </button>)}
      </div>
      <div className="vector-inspector">
        <p className="mini-label">anatomia numérica da posição {positionIndex}</p><h3>x<sub>{positionIndex}</sub> é a entrada de “{selected}”, antes da atenção</h3>
        <div className="component-equations"><div className="component-head"><span>componente</span><span>embedding e</span><span>posição p</span><span>estado x=e+p</span></div>{state.map((value, i) => <div key={i}><b>c{i + 1}</b><span>{embedding[i].toFixed(2)}</span><i>+</i><span>{position[i].toFixed(2)}</span><i>=</i><strong>{value.toFixed(2)}</strong></div>)}</div>
        <div className="position-explainer"><div><span>O que é p<sub>{positionIndex}</sub>?</span><strong>[{position.map((value) => value.toFixed(2)).join("; ")}]</strong></div><p>É o vetor posicional didático da posição {positionIndex}. Nesta demonstração, os valores vêm de uma pequena tabela posicional inventada e fixa, uma analogia para os vetores de posição aprendidos do GPT‑3. Esses números não são coordenadas geográficas nem propriedades semânticas. Modelos reais podem aprender ou construir a informação de posição por mecanismos diferentes.</p></div>
        <div className="vector-bars">{state.map((v, i) => <div key={i}><span>c{i + 1}</span><i className={v < 0 ? "negative" : ""} style={{ width: `${Math.min(100, Math.abs(v) * 78)}%` }} /><b>{v.toFixed(2).replace(".", ",")}</b></div>)}</div>
        <p><b>Rigor:</b> cada componente é uma coordenada, não uma propriedade isolada como “verdura” ou “saúde”. O significado é distribuído pelo vetor inteiro. Os quatro componentes e IDs são didáticos; modelos reais usam muito mais dimensões.</p>
      </div>
    </div>
    <div className="vector-fixed-story"><div><b>Matriz de embeddings E (“dicionário”) permanece fixa</b><span>A linha original e<sub>{selected}</sub> não é reescrita durante a inferência.</span></div><div className="copy-pulse"><span>E[{tokenIds[selected]}] = e<sub>{selected}</sub></span><i>cópia + posição</i><strong>x<sub>{positionIndex}</sub></strong></div><div><b>x muda</b><span>A cópia recebe posição e será contextualizada pelas camadas.</span></div></div>
    <div className="cold-embedding"><div className="cold-copy"><p className="mini-label">o instante anterior ao contexto</p><h3>e<sub>{selected}</sub>: um “espectro ainda frio”</h3><p>É um vetor <b>denso</b>: seu conteúdo é distribuído por muitas coordenadas numéricas, em vez de uma única posição marcada. Ele carrega associações aprendidas para o token “{selected}”, mas ainda não recebeu informação das outras posições desta frase.</p><div className="cold-tags"><span>significado distribucional aprendido</span><span>zero comunicação nesta entrada</span></div></div><div className="cold-spectrum" aria-label={`Componentes do embedding original de ${selected}, representados em escala de cinza`}>{embedding.map((value, index) => <div key={index}><i style={{ height: `${34 + Math.abs(value) * 82}px` }} /><span>c{index + 1}</span><b>{value.toFixed(2)}</b></div>)}</div><div className="warming-preview"><span>blocos Transformer</span><div>{[0,1,2,3,4,5].map((index) => <i key={index} />)}</div><b>o cinza incorpora, pouco a pouco, as cores do arco-íris: uma metáfora para o contexto integrado</b></div></div>
  </div>;
}

function MatrixLab() {
  const [sourceToken, setSourceToken] = useState("vegetação");
  const [x, setX] = useState(initialState("vegetação").slice(0, 2));
  const [w, setW] = useState([1.1, 0.3, -0.2, 0.9]);
  const [b, setB] = useState([0.1, 0.2]);
  const y = useMemo(() => [w[0] * x[0] + w[1] * x[1], w[2] * x[0] + w[3] * x[1]], [x, w]);
  const z = useMemo(() => [y[0] + b[0], y[1] + b[1]], [y, b]);
  const e = embeddingRows[sourceToken].slice(0, 2);
  const p = positionVectors[sourceToken].slice(0, 2);
  const setAt = (setter: (v: number[]) => void, values: number[], i: number, v: number) => { const copy = [...values]; copy[i] = v; setter(copy); };
  const loadToken = (token: string) => { setSourceToken(token); setX(initialState(token).slice(0, 2)); };
  return <div className="lab matrix-lab">
    <div className="matrix-token-context"><div><p className="mini-label">qual linha será copiada?</p><strong>Selecione um token da matriz de embeddings E</strong></div><div>{["vegetação", "saudável", "reflectância", "infravermelho", "próximo"].map((token) => <button key={token} className={sourceToken === token ? "active" : ""} onClick={() => loadToken(token)}>{token}</button>)}</div></div>
    <div className="fixed-copy-flow">
      <div className="fixed-e-card"><div className="card-tag"><span>E</span><b>FIXA 🔒</b></div><h3>Matriz de embeddings</h3><div className="mini-matrix"><span>…</span><span>…</span><span>…</span><b>{sourceToken}</b><strong>{e[0].toFixed(2)}</strong><strong>{e[1].toFixed(2)}</strong><span>…</span><span>…</span><span>…</span></div><p>A linha e<sub>{sourceToken}</sub> permanece armazenada sem alteração.</p></div>
      <div className="copy-arrow"><b>copiar a linha</b><span>e<sub>{sourceToken}</sub> + p<sub>{tokens.indexOf(sourceToken) + 1}</sub></span><i>→</i></div>
      <div className="working-vector-card"><div className="card-tag"><span>x<sub>{tokens.indexOf(sourceToken) + 1}</sub></span><b>TEMPORÁRIO</b></div><h3>Cópia de trabalho</h3><strong>[{x[0].toFixed(2)}; {x[1].toFixed(2)}]</strong><p>Começa em [{e[0].toFixed(2)}; {e[1].toFixed(2)}] + [{p[0].toFixed(2)}; {p[1].toFixed(2)}]. Os controles abaixo permitem explorar outras entradas.</p></div>
      <div className="copy-arrow transform-arrow"><b>transformar a cópia</b><span>W×x+b</span><i>→</i></div>
      <div className="working-vector-card output-card"><div className="card-tag"><span>z</span><b>NOVO VETOR</b></div><h3>Resultado transformado</h3><strong>[{z[0].toFixed(3)}; {z[1].toFixed(3)}]</strong><p>z segue adiante. Ele não substitui nem reescreve a linha original em E.</p></div>
    </div>
    <p className="not-comparison"><b>Importante:</b> E e x não estão sendo comparados. E fornece uma linha; essa linha é copiada, recebe posição e a cópia é transformada.</p>
    <div className="matrix-equation">
      <div><p>matriz <b>W</b></p><div className="matrix-controls">{w.map((v, i) => <label key={i}>w{i + 1}<input type="range" min="-1.5" max="1.5" step="0.1" value={v} onChange={(e) => setAt(setW, w, i, +e.target.value)} /><output>{v.toFixed(1)}</output></label>)}</div></div>
      <span className="operator">×</span>
      <div><p>cópia <b>x<sub>{tokens.indexOf(sourceToken) + 1}</sub></b></p>{x.map((v, i) => <label key={i}>x{i + 1}<input type="range" min="-3" max="3" step="0.1" value={v} onChange={(e) => setAt(setX, x, i, +e.target.value)} /><output>{v.toFixed(2)}</output></label>)}</div>
      <span className="operator">+</span>
      <div><p>viés <b>b</b></p>{b.map((v, i) => <label key={i}>b{i + 1}<input type="range" min="-1" max="1" step="0.1" value={v} onChange={(e) => setAt(setB, b, i, +e.target.value)} /><output>{v.toFixed(1)}</output></label>)}<div className="bias-actions"><button onClick={() => setB([0, 0])}>Zerar b</button><button onClick={() => setB([0.1, 0.2])}>Restaurar b</button></div></div>
    </div>
    <p className="diagram-caption">Cada resultado usa os valores completos. Números e contas exibidos estão arredondados; a igualdade numérica deve ser entendida como aproximação na tela.</p><div className="matrix-result">
      <div className="calculation"><p className="mini-label">primeiro W×x; depois somamos b</p>
        <code>y₁ = ({w[0].toFixed(1)} × {x[0].toFixed(2)}) + ({w[1].toFixed(1)} × {x[1].toFixed(2)}) = <b>{y[0].toFixed(3)}</b></code>
        <code>z₁ = y₁ + b₁ = {y[0].toFixed(3)} + {b[0].toFixed(1)} = <b>{z[0].toFixed(3)}</b></code>
        <code>y₂ = ({w[2].toFixed(1)} × {x[0].toFixed(2)}) + ({w[3].toFixed(1)} × {x[1].toFixed(2)}) = <b>{y[1].toFixed(3)}</b></code>
        <code>z₂ = y₂ + b₂ = {y[1].toFixed(3)} + {b[1].toFixed(1)} = <b>{z[1].toFixed(3)}</b></code>
        <div className="bias-comparison"><span>sem viés<br /><b>y=[{y[0].toFixed(3)}; {y[1].toFixed(3)}]</b></span><i>+ b=[{b[0].toFixed(1)}; {b[1].toFixed(1)}]</i><span>com viés<br /><b>z=[{z[0].toFixed(3)}; {z[1].toFixed(3)}]</b></span></div>
        <p><b>W</b> mistura e redimensiona características. <b>b</b> é uma soma componente a componente que desloca o resultado.</p>
      </div>
      <div className="matrix-meaning"><p className="mini-label">o sentido da operação</p><h3>W escolhe combinações; b desloca o ponto de partida</h3><div><span>W×x</span><p>Mistura os componentes de x para detectar ou construir novas características.</p></div><div><span>+ b</span><p>Acrescenta um valor aprendido mesmo quando os componentes de entrada são zero.</p></div><div><span>= z</span><p>Produz uma nova representação temporária para a próxima operação.</p></div></div>
    </div>
  </div>;
}

function OrderLab() {
  const [reversed, setReversed] = useState(false);
  const first = reversed ? ["A", "radiação", "reflete", "vegetação"] : ["A", "vegetação", "reflete", "radiação"];
  return <div className="lab order-lab">
    <div className="ordered-words">{first.map((w, i) => <div key={`${w}-${i}`}><span>{i + 1}</span><b>{w}</b><i style={{ height: `${35 + i * 12}px` }} /></div>)}</div>
    <button onClick={() => setReversed(!reversed)}>Trocar sujeito e objeto</button>
    <div className={reversed ? "meaning wrong" : "meaning"}>{reversed ? "A relação física foi invertida." : "A relação física é coerente."}<small>Os termos são os mesmos; a ordem muda quem faz o quê.</small></div>
  </div>;
}

function PositionalWaveCanvas() { return <WaveFigure />; }
function PositionalEncodingLab() { return <PositionalWaveCanvas />; }

function QKVProjectionPlayground({ matrices, setMatrices, tokenIndex, onTokenIndex }: { matrices: ProjectionSet; setMatrices: (next: ProjectionSet) => void; tokenIndex: number; onTokenIndex: (index: number) => void }) {
  const [active, setActive] = useState<ProjectionName>("Q");
  const token = tokens[tokenIndex];
  const x = initialState(token);
  const outputs = {
    Q: project(matrices.Q, x),
    K: project(matrices.K, x),
    V: project(matrices.V, x),
  };
  const matrix = matrices[active];
  const output = outputs[active];
  const updateMatrix = (index: number, value: number) => {
    const next = [...matrices[active]] as ProjectionMatrix; next[index] = value;
    setMatrices({ ...matrices, [active]: next });
  };
  const reset = () => setMatrices({ Q: [...defaultProjectionMatrices.Q], K: [...defaultProjectionMatrices.K], V: [...defaultProjectionMatrices.V] });
  const equation = (row: number) => {
    const offset = row * 4;
    return <code>{active}<sub>{row + 1}</sub> = {x.map((value, i) => <span key={i}>({matrix[offset + i].toFixed(1)} × {value.toFixed(2)}){i < 3 ? " + " : ""}</span>)} = <b>{output[row].toFixed(3)}</b></code>;
  };
  return <div className="qkv-playground">
    <div className="qkv-playground-head"><div><p className="mini-label">playground 1 · as três projeções</p><h3>Siga um token concreto através de W<sub>Q</sub>, W<sub>K</sub> e W<sub>V</sub></h3></div><p>Selecione uma posição e altere uma matriz. O vetor selecionado, Q, K, V, os escores e toda a matriz de atenção abaixo são recalculados juntos.</p></div>
    <div className="qkv-token-picker">{tokens.map((item, index) => <button key={item} className={tokenIndex === index ? "active" : ""} onClick={() => onTokenIndex(index)}><span>{index + 1}</span>{item}</button>)}</div>
    <div className="qkv-live-grid">
      <div className="qkv-input"><p>entrada inicial, ainda sem comunicação <b>x<sub>{tokenIndex + 1}</sub></b></p><strong className="token-vector-name">“{token}”</strong><div className="qkv-components">{x.map((value, i) => <div key={i}><span>c{i + 1}</span><i className={value < 0 ? "negative" : ""} style={{ height: `${24 + Math.abs(value) * 52}px` }} /><b>{value.toFixed(2)}</b></div>)}</div><small>embedding de “{token}” + vetor da posição {tokenIndex + 1}</small></div>
      <div className="qkv-matrix-editor">
        <div className="projection-tabs">{(["Q", "K", "V"] as ProjectionName[]).map((name) => <button key={name} className={active === name ? "active" : ""} onClick={() => setActive(name)}>editar W<sub>{name}</sub></button>)}</div>
        <div className="projection-matrix-label"><span>4 componentes entram</span><b>W<sub>{active}</sub> · 2 × 4</b><span>2 componentes saem</span></div>
        <div className="qkv-matrix-controls">{matrix.map((value, i) => <label key={i}>w<sub>{Math.floor(i / 4) + 1}{i % 4 + 1}</sub><input type="range" min="-1.5" max="1.5" step="0.1" value={value} onChange={(event) => updateMatrix(i, +event.target.value)} /><output>{value.toFixed(1)}</output></label>)}</div>
        <button className="matrix-reset" onClick={reset}>Restaurar matrizes didáticas</button>
      </div>
      <div className="qkv-output-cards">{(["Q", "K", "V"] as ProjectionName[]).map((name) => <button key={name} className={active === name ? "active" : ""} onClick={() => setActive(name)}><span>{name} = W<sub>{name}</sub>x<sub>{tokenIndex + 1}</sub></span><strong>[{outputs[name][0].toFixed(3)}; {outputs[name][1].toFixed(3)}]</strong><small>{name === "Q" ? "vetor de comparação desta posição" : name === "K" ? "vetor com o qual Q será comparado" : "conteúdo disponível para transporte"}</small></button>)}</div>
    </div>
    <div className="qkv-live-calculation"><p className="mini-label">conta viva: {active} = W<sub>{active}</sub>x<sub>{tokenIndex + 1}</sub></p>{equation(0)}{equation(1)}</div>
  </div>;
}

const attentionGuide = [
  { title: "Projetar Q, K e V", short: "projeções", text: "Cada estado temporário xᵢ é multiplicado por três matrizes aprendidas. Assim surgem Qᵢ, Kᵢ e Vᵢ." },
  { title: "Comparar Q com K", short: "escores", text: "Para uma posição i, Qᵢ é comparado com cada Kⱼ permitido. O produto escalar gera um escore de compatibilidade aprendido — ainda não uma probabilidade." },
  { title: "Normalizar com softmax", short: "pesos", text: "A softmax compara todos os escores permitidos e os converte em pesos positivos cuja soma é 100%. A máscara causal bloqueia o futuro." },
  { title: "Combinar os vetores V", short: "contexto", text: "Cada Vⱼ é multiplicado por seu peso αᵢⱼ. A soma dessas contribuições produz o vetor contextual da posição i." },
];

function AttentionIntuition() {
  return <div className="attention-intuition"><div className="attention-intro-copy"><p className="mini-label">antes das fórmulas</p><h3>Atenção é um sistema de roteamento de informação</h3><p>A posição “próximo” não busca uma palavra no dicionário. Ela calcula quanto conteúdo deve receber de cada posição permitida (inclusive ela própria) nesta cabeça de atenção.</p></div><div className="routing-scene"><div className="route-query"><span>posição atual</span><b>próximo</b><i>produz Q</i></div><div className="route-candidates"><div><b>vegetação</b><span>K: assinatura para comparação</span><span>V: conteúdo a transportar</span></div><div><b>reflectância</b><span>K: assinatura para comparação</span><span>V: conteúdo a transportar</span></div><div className="highlight"><b>infravermelho</b><span>K: assinatura para comparação</span><span>V: conteúdo a transportar</span></div></div><div className="route-result"><span>Q·K → escores</span><i>softmax</i><b>pesos × V → contexto</b></div></div><p className="routing-caveat"><b>Importante:</b> K participa do cálculo do peso; V transporta o conteúdo. O escore Q·K/√d<sub>k</sub> só ganha efeito quando a softmax o transforma em um peso que multiplica V.</p></div>;
}

function AttentionLab() {
  const [query, setQuery] = useState(tokens.length - 1);
  const [inspectedKey, setInspectedKey] = useState(tokens.length - 2);
  const [guideStep, setGuideStep] = useState(0);
  const [matrices, setMatrices] = useState<ProjectionSet>({ Q: [...defaultProjectionMatrices.Q], K: [...defaultProjectionMatrices.K], V: [...defaultProjectionMatrices.V] });
  const scores = attentionScores(query, matrices);
  const weights = attentionWeights(query, matrices);
  const effectiveKey = Math.min(inspectedKey, query);
  const q = project(matrices.Q, initialState(tokens[query]));
  const k = project(matrices.K, initialState(tokens[effectiveKey]));
  const v = project(matrices.V, initialState(tokens[effectiveKey]));
  const inspectedScore = scores[effectiveKey] as number;
  const inspectedWeight = weights[effectiveKey] as number;
  const contribution: [number, number] = [inspectedWeight * v[0], inspectedWeight * v[1]];
  const context = weights.reduce<[number, number]>((acc, weight, i) => {
    if (weight === null) return acc; const value = project(matrices.V, initialState(tokens[i])); return [acc[0] + weight * value[0], acc[1] + weight * value[1]];
  }, [0, 0]);
  return <div className="lab attention-lab">
    <AttentionIntuition />
    <div className="attention-guide">
      <div className="attention-guide-head"><div><p className="mini-label">roteiro guiado · uma cabeça de atenção</p><h3>Quatro operações, uma de cada vez</h3></div><p>Escolha uma etapa. Os números permanecem conectados: alterar W<sub>Q</sub>, W<sub>K</sub> ou W<sub>V</sub> recalcula todas as etapas seguintes.</p></div>
      <div className="attention-guide-tabs">{attentionGuide.map((item, index) => <button key={item.title} className={guideStep === index ? "active" : ""} onClick={() => setGuideStep(index)}><span>{index + 1}</span><b>{item.title}</b><small>{item.short}</small></button>)}</div>
      <div className="attention-guide-detail"><span>etapa {guideStep + 1} de 4</span><p>{attentionGuide[guideStep].text}</p><button onClick={() => setGuideStep((guideStep + 1) % attentionGuide.length)}>Próxima etapa →</button></div>
    </div>

    <section className="attention-step-panel" hidden={guideStep !== 0}>
      <div className="qkv-projections"><span>estado da posição i</span><i>× W<sub>Q</sub> → Q<sub>i</sub></i><i>× W<sub>K</sub> → K<sub>i</sub></i><i>× W<sub>V</sub> → V<sub>i</sub></i><p>No primeiro bloco, o estado deriva de x<sub>i</sub>; nos seguintes, deriva de h<sub>i</sub><sup>(ℓ)</sup>. W<sub>Q</sub>, W<sub>K</sub> e W<sub>V</sub> são matrizes aprendidas e fixas na inferência; Q, K e V são temporários.</p></div>
      <div className="qkv-strip">
        <div><b>Q · Query / consulta</b><span>representação usada pela posição i para iniciar comparações</span></div>
        <div><b>K · Key / chave</b><span>representação de cada posição j disponível para comparação</span></div>
        <div><b>V · Value / valor</b><span>conteúdo numérico que será ponderado e combinado</span></div>
      </div>
      <div className="q-rigor-definition"><b>Q não é uma pergunta em linguagem natural.</b><span>É um vetor calculado por Q<sub>i</sub>=W<sub>Q</sub>x<sub>i</sub>. Seu produto escalar com cada K<sub>j</sub> gera um escore de compatibilidade entre as posições i e j.</span></div>
      <QKVProjectionPlayground matrices={matrices} setMatrices={setMatrices} tokenIndex={query} onTokenIndex={(index) => { setQuery(index); setInspectedKey(Math.min(effectiveKey, index)); }} />
      <p className="rigor-note">Esta é uma única cabeça didática. As mesmas matrizes editadas acima geram Q, K e V para todas as posições. Em modelos reais, as dimensões são muito maiores e cada camada possui várias cabeças.</p>
    </section>

    <section className="attention-step-panel" hidden={guideStep !== 1}>
      <p className="attention-prompt">1. Escolha a posição cujo <b>Q<sub>i</sub></b> fará as comparações. 2. Escolha a mesma posição ou uma anterior cujo <b>K<sub>j</sub></b> será comparado.</p>
      <div className="query-tokens">{tokens.map((token, i) => <button key={token} className={query === i ? "active" : ""} onClick={() => { setQuery(i); setInspectedKey(Math.min(effectiveKey, i)); }}><span>Q{i + 1}</span>{token}</button>)}</div>
      <div className="key-picker"><p className="mini-label">agora escolha Kⱼ · posições futuras ficam bloqueadas</p><div>{tokens.map((token, i) => <button key={token} disabled={i > query} className={effectiveKey === i ? "active" : ""} onClick={() => setInspectedKey(i)}><span>K{i + 1}</span>{token}</button>)}</div></div>
      <div className="compatibility-card">
        <div className="attention-pair-figure"><div className="attention-orb query-orb"><span>Q</span><b>{tokens[query]}</b></div><div className="attention-beam raw-score" style={{ "--beam": Math.max(.08, Math.abs(inspectedScore) / 2) } as CSSProperties}><span>escore {inspectedScore.toFixed(3)}</span></div><div className="attention-orb key-orb"><span>K</span><b>{tokens[effectiveKey]}</b></div></div>
        <div className="attention-arithmetic"><p className="mini-label">produto escalar escalonado</p><code>Q<sub>{tokens[query]}</sub> = [{q[0].toFixed(3)}; {q[1].toFixed(3)}]</code><code>K<sub>{tokens[effectiveKey]}</sub> = [{k[0].toFixed(3)}; {k[1].toFixed(3)}]</code><code>escore = ({q[0].toFixed(3)} × {k[0].toFixed(3)} + {q[1].toFixed(3)} × {k[1].toFixed(3)}) / √2 = <b>{inspectedScore.toFixed(3)}</b></code><p>Como d<sub>k</sub>=2 neste exemplo, √d<sub>k</sub>=√2. O resultado usa os valores completos; os termos exibidos têm três casas decimais. Esse escore ainda <b>não</b> é uma probabilidade.</p></div>
      </div>
    </section>

    <section className="attention-step-panel" hidden={guideStep !== 2}>
      <p className="attention-prompt">A softmax recebe <b>todos os escores permitidos da linha Q<sub>{query + 1}</sub></b>, não apenas o par selecionado, e os converte em pesos α<sub>{query + 1},j</sub>.</p>
      <div className="query-tokens compact">{tokens.map((token, i) => <button key={token} className={query === i ? "active" : ""} onClick={() => { setQuery(i); setInspectedKey(Math.min(effectiveKey, i)); }}><span>Q{i + 1}</span>{token}</button>)}</div>
      <div className="attention-grid">
        <div className="score-panel"><p className="mini-label">escores → softmax → pesos</p><h3>Pesos para a posição “{tokens[query]}”</h3>{weights.map((weight, i) => <button disabled={weight === null} onClick={() => setInspectedKey(i)} className={`${weight === null ? "weight masked" : "weight"} ${effectiveKey === i ? "inspected" : ""}`} key={tokens[i]}><span>{tokens[i]}</span><i style={{ width: weight === null ? "100%" : `${weight * 100}%` }} /><b>{weight === null ? "bloqueado" : `${(weight * 100).toFixed(1)}%`}</b></button>)}<div className="weight-sum"><span>soma dos pesos permitidos</span><strong>{(weights.reduce<number>((sum, item) => sum + (item ?? 0), 0) * 100).toFixed(1)}%</strong></div></div>
        <div className="heatmap-panel"><p className="mini-label">matriz de atenção · cada linha soma 1</p><div className="heatmap" style={{ gridTemplateColumns: `72px repeat(${tokens.length}, 1fr)` }}><span />{tokens.map((t) => <span className="col-label" key={t}>{t.slice(0, 5)}</span>)}{tokens.flatMap((rowToken, r) => [<span className="row-label" key={`l-${r}`}>{rowToken.slice(0, 6)}</span>, ...attentionWeights(r, matrices).map((value, c) => <button key={`${r}-${c}`} onClick={() => { setQuery(r); if (value !== null) setInspectedKey(c); }} aria-label={`${rowToken} atende a ${tokens[c]}: ${value === null ? "bloqueado" : (value * 100).toFixed(1) + "%"}`} className={`${value === null ? "mask-cell" : "heat-cell"} ${r === query ? "current-row" : ""}`} style={value === null ? undefined : { "--heat": value.toFixed(6) } as CSSProperties}>{value === null ? "×" : value.toFixed(2)}</button>)])}</div></div>
      </div>
      <p className="rigor-note"><b>Máscara causal:</b> o triângulo com “×” bloqueia o futuro. Assim, ao prever o próximo token, cada posição usa somente o texto disponível até ela.</p>
    </section>

    <section className="attention-step-panel" hidden={guideStep !== 3}>
      <p className="attention-prompt">Agora os pesos controlam <b>quanto de cada V<sub>j</sub></b> entra no novo vetor da posição “{tokens[query]}”. Clique em uma contribuição para inspecioná-la.</p>
      <div className="value-contributions">{weights.map((weight, i) => weight === null ? null : <button key={tokens[i]} className={effectiveKey === i ? "active" : ""} onClick={() => setInspectedKey(i)}><span>{(weight * 100).toFixed(1)}% × V<sub>{i + 1}</sub></span><b>{tokens[i]}</b><small>[{(weight * project(matrices.V, initialState(tokens[i]))[0]).toFixed(3)}; {(weight * project(matrices.V, initialState(tokens[i]))[1]).toFixed(3)}]</small></button>)}</div>
      <div className="context-build"><div><p className="mini-label">contribuição selecionada</p><code>α<sub>{query + 1},{effectiveKey + 1}</sub> × V<sub>{effectiveKey + 1}</sub> = {(inspectedWeight * 100).toFixed(1)}% × [{v[0].toFixed(2)}; {v[1].toFixed(2)}]</code><strong>[{contribution[0].toFixed(3)}; {contribution[1].toFixed(3)}]</strong></div><i>somar todas as contribuições</i><div className="context-vector"><span>c<sub>{query + 1}</sub> = Σⱼ α<sub>{query + 1},j</sub>V<sub>j</sub></span><strong>[{context[0].toFixed(2).replace(".", ",")}; {context[1].toFixed(2).replace(".", ",")}]</strong><p>Saída desta cabeça antes da recombinação com as demais cabeças.</p></div></div>
    </section>
    <div className="multihead"><b>Atenção com múltiplas cabeças</b><span>O mesmo processo é executado em paralelo com matrizes W<sub>Q</sub>, W<sub>K</sub> e W<sub>V</sub> diferentes. As saídas das cabeças são concatenadas e passam por outra matriz aprendida, W<sub>O</sub>.</span><small>Cabeças distintas podem privilegiar padrões diferentes, mas não possuem rótulos semânticos garantidos.</small></div>
  </div>;
}

const blockInfo = [
  ["LayerNorm / normalização", "LayerNorm significa normalização por camada: estabiliza a escala dos números dentro de cada posição.", "os componentes são centralizados e reescalados, com escala e deslocamento aprendidos"],
  ["Atenção causal", "Mistura informação das posições disponíveis até a posição atual, nunca do futuro.", "cada posição recebe contexto permitido"],
  ["Soma residual", "Acrescenta a atualização ao vetor que entrou.", "um caminho direto soma o estado anterior à atualização"],
  ["LayerNorm / normalização", "A normalização por camada prepara novamente os números para a rede direta.", "as escalas voltam a uma faixa controlada"],
  ["Rede feed-forward", "Feed-forward significa alimentação direta: duas transformações com uma não linearidade entre elas.", "novas características são calculadas posição a posição"],
  ["Soma residual", "Preserva o caminho anterior e adiciona a nova transformação.", "surge o vetor de saída do bloco"],
];

const feedForwardStages = [
  { symbol: "h", title: "entrada", formula: "h", text: "Vetor contextual que entra na subcamada. Sua dimensão é d_model.", width: "estreito" },
  { symbol: "n", title: "normalizado", formula: "n = LayerNorm(h)", text: "Mesma dimensão de h, com escala reorganizada antes da transformação.", width: "estreito" },
  { symbol: "u", title: "expandido, antes da ativação", formula: "u = W₁n + b₁", text: "W₁ e b₁ são parâmetros aprendidos. u costuma ter mais componentes que h.", width: "largo" },
  { symbol: "a", title: "após a não linearidade", formula: "a = GELU(u)", text: "A função é aplicada componente a componente e impede o colapso em uma única transformação afim.", width: "largo" },
  { symbol: "Δh", title: "atualização", formula: "Δh = W₂a + b₂", text: "W₂ comprime novamente para d_model. Δh tem a mesma dimensão de h.", width: "estreito" },
  { symbol: "h′", title: "saída residual", formula: "h′ = h + Δh", text: "A atualização é somada ao caminho original; h não é apagado.", width: "estreito" },
];

function FeedForwardJourney() {
  const [stage, setStage] = useState(0);
  const current = feedForwardStages[stage];
  return <div className="ff-journey">
    <div className="ff-header"><div><p className="mini-label">playground conceitual · siga um vetor pela rede feed-forward</p><h3>De h até h′, sem esconder as etapas</h3></div><p>As matrizes W₁ e W₂ e os vieses b₁ e b₂ são aprendidos no treinamento e permanecem fixos durante a inferência. Os vetores h, n, u, a, Δh e h′ são temporários.</p></div>
    <div className="ff-track">{feedForwardStages.map((item, index) => <button key={item.symbol} className={`${item.width} ${stage === index ? "active" : ""}`} onClick={() => setStage(index)}><span>{index + 1}</span><strong>{item.symbol}</strong><small>{item.title}</small><code>{item.formula}</code><div>{Array.from({ length: item.width === "largo" ? 8 : 4 }, (_, component) => <i key={component} style={{ height: `${18 + ((component * 19 + index * 13) % 38)}px` }} />)}</div></button>)}</div>
    <div className="ff-detail"><div><span>etapa {stage + 1} de 6</span><strong>{current.symbol}: {current.title}</strong></div><code>{current.formula}</code><p>{current.text}</p><button onClick={() => setStage((stage + 1) % feedForwardStages.length)}>Próxima etapa →</button></div>
    <div className="ff-dimensions"><span>dimensão d_model</span><i>expansão por W₁</i><span>dimensão d_ff</span><i>compressão por W₂</i><span>dimensão d_model</span></div><p className="ff-scale"><b>GPT‑3 175B:</b> 12.288 → 49.152 → 12.288 componentes. Assim, W₁ tem formato 49.152×12.288 e W₂ tem formato 12.288×49.152.</p>
  </div>;
}

function TransformerBlueprint() {
  return <div className="transformer-blueprint">
    <div className="blueprint-head"><div><span>GPT‑3 175B</span><strong>1 bloco Transformer</strong></div><p>O diagrama representa <b>um</b> dos 96 blocos empilhados do GPT‑3 175B. Cada bloco recebe estados h<sup>(ℓ)</sup> e devolve estados atualizados h<sup>(ℓ+1)</sup>.</p></div>
    <div className="blueprint-flow">
      <div className="bp-state"><span>entrada</span><b>h<sup>(ℓ)</sup></b><small>um vetor por posição</small></div><i>→</i>
      <div className="bp-module attention-module"><span>comunicação</span><b>LayerNorm + atenção causal</b><small>cada posição incorpora informação das posições permitidas</small></div><i>＋</i>
      <div className="bp-state"><span>resíduo</span><b>h̃</b><small>entrada + atualização da atenção</small></div><i>→</i>
      <div className="bp-module mlp-module"><span>transformação local</span><b>LayerNorm + MLP</b><small>cada posição é transformada separadamente</small></div><i>＋</i>
      <div className="bp-state output-state"><span>saída</span><b>h<sup>(ℓ+1)</sup></b><small>segue para o próximo bloco</small></div>
      <div className="residual-rail rail-one"><span>caminho residual: preservar h<sup>(ℓ)</sup></span></div>
      <div className="residual-rail rail-two"><span>caminho residual: preservar h̃</span></div>
    </div>
    <div className="transformer-roles"><div><b>Atenção</b><span>comunicação entre posições</span></div><div><b>MLP / feed-forward</b><span>computação dentro de cada posição</span></div><div><b>Resíduos</b><span>somam atualizações sem apagar o caminho anterior</span></div><div><b>LayerNorm</b><span>organiza a escala dos componentes</span></div></div>
    <div className="block-handoff"><div><span>regra de encadeamento</span><code>saída do bloco ℓ = entrada do bloco ℓ+1</code></div><p>Depois do primeiro bloco, já não estamos movimentando o embedding estático de E, mas estados contextualizados h. Cada bloco recebe o estado anterior, calcula novas relações e entrega outra representação temporária ao bloco seguinte.</p></div>
    <div className="ninety-six"><span>e + posição</span><i>→</i><span>bloco 1</span><i>→</i><b>h⁽¹⁾</b><i>→</i><span>bloco 2</span><i>→</i><b>h⁽²⁾</b><i>→</i><span>…</span><i>→</i><span>bloco 96</span><i>→</i><b>h⁽⁹⁶⁾</b></div>
  </div>;
}

function ContextEvolution() {
  const [stage, setStage] = useState(0);
  const stages = [
    { label: "E", title: "linha fixa e_próximo", note: "representação estática armazenada", influences: ["próximo"] },
    { label: "x₉", title: "cópia + posição", note: "identifica a posição 9 da entrada", influences: ["próximo", "posição 9"] },
    { label: "h₉⁽¹⁾", title: "após o bloco 1", note: "pode incorporar as posições 1 a 9", influences: ["vegetação", "reflectância", "infravermelho"] },
    { label: "h₉⁽⁴⁸⁾", title: "após muitos blocos", note: "padrões da frase foram sucessivamente combinados", influences: ["vegetação saudável", "alta reflectância", "infravermelho próximo"] },
    { label: "h₉⁽⁹⁶⁾", title: "representação profunda da última posição", note: "será usada para calcular os logits do próximo token", influences: ["física espectral", "relações sintáticas", "contexto acumulado"] },
  ];
  const current = stages[stage];
  return <div className="context-evolution"><div className="evolution-head"><div><p className="mini-label">fio visual · acompanhe a posição “próximo”</p><h3>Cada saída alimenta o bloco seguinte</h3></div><p>Escolhemos a última posição porque, com a máscara causal, ela pode atender a toda a frase anterior. As barras são qualitativas, não ativações reais do GPT‑3.</p></div><div className="context-gradient"><span>“espectro frio”: escala de cinza</span><i>representações progressivamente contextualizadas</i><b>arco-íris: contexto integrado</b></div><div className="evolution-track">{stages.map((item, index) => <button key={item.label} className={`depth-${index} ${stage === index ? "active" : ""}`} onClick={() => setStage(index)}><span>{item.label}</span><div>{[0,1,2,3,4,5].map((n) => <i key={n} style={{ height: `${22 + ((n * 17 + index * 23) % 48)}px` }} />)}</div><b>{item.title}</b></button>)}</div><div className="evolution-detail"><strong>{current.label}</strong><div><b>{current.note}</b><span>{current.influences.map((item) => <i key={item}>{item}</i>)}</span></div><p>{stage === 0 ? "Esta linha da matriz E continua fixa durante toda a inferência." : "Este estado temporário torna-se a entrada do bloco seguinte, que calcula outra atualização contextual."}</p><button onClick={() => setStage((stage + 1) % stages.length)}>Avançar →</button></div><p className="evolution-rigor"><b>Do cinza ao arco-íris é uma metáfora didática:</b> as cores não correspondem a valores, dimensões ou propriedades reais do vetor, e não existe um medidor único que cresça obrigatoriamente a cada camada. O que aumenta é a oportunidade de combinar relações sucessivamente mais complexas a partir do contexto permitido.</p></div>;
}

function TransformerLab() {
  const [active, setActive] = useState(1);
  return <div className="lab transformer-lab">
    <div className="attention-is-all"><div><p className="mini-label">elegância e poder</p><h3>Atenção é tudo?</h3><p>O Transformer rompeu com a ideia de que a comunicação entre tokens precisava percorrer a frase passo a passo. Em uma camada de autoatenção, cada posição pode comparar-se diretamente com todas as posições permitidas.</p></div><div className="attention-web"><span>A</span><span>vegetação</span><span>saudável</span><span>reflectância</span><span>infravermelho</span><span>próximo</span><i /><i /><i /><i /><i /></div><div className="attention-precision"><b>O ganho</b><span>relações distantes têm um caminho curto e o treinamento pode processar posições em paralelo</span><b>O limite</b><span>posição e máscara continuam essenciais; a geração permanece autoregressiva, um token por vez</span><b>O legado</b><span>a arquitetura Transformer sustenta a grande maioria dos LLMs contemporâneos</span></div></div>
    <TransformerBlueprint />
    <div className="block-stack">{blockInfo.map(([name], i) => <button key={`${name}-${i}`} onClick={() => setActive(i)} className={active === i ? "active" : ""}><span>{i + 1}</span>{name}</button>)}</div>
    <div className="block-detail"><p className="mini-label">componente {active + 1} de 6</p><h3>{blockInfo[active][0]}</h3><p>{blockInfo[active][1]}</p><div><b>O que muda?</b>{blockInfo[active][2]}</div><button className="block-next" onClick={() => setActive((active + 1) % blockInfo.length)}>Avançar pelo bloco →</button></div>
    <div className={`transformer-pulse step-${active}`}><div className="pulse-head"><p className="mini-label">figura viva · estados temporários atravessando um bloco</p><b>{active === 1 ? "A atenção permite comunicação entre posições" : active === 4 ? "A rede feed-forward transforma cada posição" : active === 2 || active === 5 ? "A via residual preserva e soma" : "A normalização reorganiza as escalas"}</b></div><div className="state-ribbon">{tokens.map((token, tokenIndex) => <div className={token === "próximo" ? "focus-state" : ""} key={token}><span>{token}</span><div>{[0, 1, 2, 3].map((component) => <i key={component} style={{ height: `${20 + ((tokenIndex * 17 + component * 23 + active * 19) % 52)}px` }} />)}</div><small>h<sub>{tokenIndex + 1}</sub><sup>(ℓ)</sup></small></div>)}</div><p>As alturas são um esquema qualitativo para tornar as mudanças visíveis; não representam os valores dos playgrounds numéricos.</p></div>
    <ContextEvolution />
    <div className="repeat-block"><p><b>Escala documentada:</b> GPT‑3 175B possui 96 blocos, dimensão de modelo 12.288 e 175 bilhões de parâmetros. Esses números são específicos desse modelo; não são atribuídos a modelos recentes sem documentação pública equivalente.</p></div>
  </div>;
}

function MLPChapter() {
  const [view, setView] = useState<"caminho" | "naolinear">("caminho");
  return <div className="mlp-chapter"><div className="chapter-tabs"><button className={view === "caminho" ? "active" : ""} onClick={() => setView("caminho")}><span>1</span>Por dentro da MLP</button><button className={view === "naolinear" ? "active" : ""} onClick={() => setView("naolinear")}><span>2</span>Por que não linearidade?</button></div><section hidden={view !== "caminho"}><FeedForwardJourney /></section><section hidden={view !== "naolinear"}><FoldLab /></section></div>;
}

function ActivationCanvas({ u }: { u: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height);
      const gap = 24, vertical = rect.width < 600;
      const panelW = vertical ? rect.width : (rect.width - gap) / 2;
      const panelH = vertical ? (rect.height - gap) / 2 : rect.height;
      const drawPlot = (offsetX: number, offsetY: number, title: string, nonlinear: boolean) => {
        const left = offsetX + 42, right = offsetX + panelW - 22, top = offsetY + 54, bottom = offsetY + panelH - 36;
        const mx = (x: number) => left + ((x + 2) / 4) * (right - left);
        const my = (y: number) => bottom - ((y + 2) / 4) * (bottom - top);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(offsetX, offsetY, panelW, panelH);
        ctx.strokeStyle = "#d8e4e8"; ctx.strokeRect(offsetX + .5, offsetY + .5, panelW - 1, panelH - 1);
        ctx.fillStyle = "#102a43"; ctx.font = "700 14px Arial"; ctx.fillText(title, offsetX + 18, offsetY + 27);
        ctx.strokeStyle = "#d8e4e8"; ctx.lineWidth = 1;
        [-2, -1, 0, 1, 2].forEach((tick) => { ctx.beginPath(); ctx.moveTo(mx(tick), top); ctx.lineTo(mx(tick), bottom); ctx.stroke(); ctx.beginPath(); ctx.moveTo(left, my(tick)); ctx.lineTo(right, my(tick)); ctx.stroke(); });
        ctx.strokeStyle = "#52677b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(left, my(0)); ctx.lineTo(right, my(0)); ctx.moveTo(mx(0), top); ctx.lineTo(mx(0), bottom); ctx.stroke();
        ctx.strokeStyle = nonlinear ? "#ef6548" : "#087f7b"; ctx.lineWidth = 5; ctx.beginPath();
        if (nonlinear) { ctx.moveTo(mx(-2), my(0)); ctx.lineTo(mx(0), my(0)); ctx.lineTo(mx(2), my(2)); }
        else { ctx.moveTo(mx(-2), my(-2)); ctx.lineTo(mx(2), my(2)); }
        ctx.stroke();
        const out = nonlinear ? Math.max(0, u) : u;
        ctx.fillStyle = "#f2a900"; ctx.beginPath(); ctx.arc(mx(u), my(out), 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#102a43"; ctx.font = "700 12px Arial"; ctx.fillText(`u=${u.toFixed(2)} → ${out.toFixed(2)}`, Math.min(mx(u) + 11, right - 100), my(out) - 10);
        if (nonlinear) { ctx.fillStyle = "#ef6548"; ctx.fillText("mudança de inclinação", mx(0) + 9, my(0) + 25); }
      };
      drawPlot(0, 0, "sem ativação: saída = u", false);
      drawPlot(vertical ? 0 : panelW + gap, vertical ? panelH + gap : 0, "com ReLU: saída = máx(0,u)", true);
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect();
  }, [u]);
  return <canvas ref={ref} className="activation-canvas" aria-label="Comparação entre uma função linear e a função ReLU" />;
}

function FoldLab() {
  const [u, setU] = useState(-0.7);
  const relu = Math.max(0, u);
  const gelu = 0.5 * u * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (u + 0.044715 * u ** 3)));
  return <div className="lab fold-lab">
    <div className="why-nonlinear"><div><p className="mini-label">dentro da MLP, sem ativação</p><code>W₂(W₁n+b₁)+b₂</code><strong>= uma única transformação afim equivalente de n</strong><span>Duas transformações afins seguidas não criam novos “joelhos”.</span></div><i>versus</i><div><p className="mini-label">dentro da MLP, com ativação</p><code>W₂ GELU(W₁n+b₁)+b₂</code><strong>= transformação não linear</strong><span>Cada unidade pode responder de modo diferente em regiões distintas.</span></div></div>
    <div className="activation-slider"><label>mova o valor de entrada u<input type="range" min="-2" max="2" step="0.05" value={u} onChange={(event) => setU(+event.target.value)} /><output>{u.toFixed(2)}</output></label><p>O ponto amarelo percorre as duas funções. Observe o “joelho” da ReLU exatamente em u=0.</p></div>
    <ActivationCanvas u={u} />
    <div className="activation-playground"><div><p className="mini-label">playground · acompanhe um único número</p><h3>O que a ativação faz com u = {u.toFixed(2)}?</h3><label>valor antes da ativação<input type="range" min="-2" max="2" step="0.05" value={u} onChange={(event) => setU(+event.target.value)} /></label></div><div className="activation-machine relu-machine"><span>ReLU</span><code>máx(0; {u.toFixed(2)})</code><strong>{relu.toFixed(3)}</strong><small>{u < 0 ? "a entrada negativa foi mapeada para zero" : "a entrada positiva foi preservada"}</small></div><div className="activation-machine gelu-machine"><span>GELU aproximada</span><code>u · Φ(u)</code><strong>{gelu.toFixed(3)}</strong><small>Φ é a distribuição acumulada normal padrão; usamos uma aproximação com tangente hiperbólica.</small></div></div>
    <div className="origami-explain"><div><span>1</span><b>Folha reta</b><p>matriz + viés movem e esticam, mas preservam retas: a transformação é afim</p></div><div><span>2</span><b>Um vinco</b><p>ReLU (Rectified Linear Unit) cria duas regras: zero para u&lt;0 e identidade para u≥0</p></div><div><span>3</span><b>Muitos neurônios</b><p>cada ativação introduz sua própria região de resposta</p></div><div><span>4</span><b>Muitas camadas</b><p>a composição constrói funções progressivamente mais expressivas</p></div></div>
    <p className="rigor-note"><b>Limite da metáfora:</b> ReLU não dobra fisicamente um vetor. “Origami” ajuda a imaginar uma função por partes com mudanças de inclinação. O GPT‑3 usa GELU (Gaussian Error Linear Unit), uma não linearidade suave, e não ReLU. Mesmo sem a ativação da MLP, o Transformer completo ainda teria outras operações não lineares, como softmax e LayerNorm; o argumento de colapso acima vale especificamente para as duas transformações afins da MLP.</p>
  </div>;
}

function OutputLab() {
  const defaultLogits = [2.4, 1.4, .9, .7, .3];
  const labels = ["porque", "devido", "em", "absorve", "."];
  const [logits, setLogits] = useState(defaultLogits);
  const [temperature, setTemperature] = useState(1);
  const probabilities = softmax(logits, temperature);
  const updateLogit = (index: number, value: number) => setLogits((current) => current.map((item, i) => i === index ? value : item));
  return <div className="lab output-lab">
    <div className="temperature"><label>temperatura <input type="range" min="0.35" max="1.8" step="0.05" value={temperature} onChange={(e) => setTemperature(+e.target.value)} /><output>{temperature.toFixed(2)}</output></label><p>Temperatura menor concentra; maior distribui. Ela não altera os parâmetros aprendidos.</p><button onClick={() => { setLogits(defaultLogits); setTemperature(1); }}>Restaurar exemplo</button></div>
    <div className="probability-flow"><div><p className="mini-label">playground · altere os logits</p>{logits.map((value, i) => <label className="logit" key={labels[i]}><span>{labels[i]}</span><input type="range" min="-1" max="3" step="0.1" value={value} onChange={(event) => updateLogit(i, +event.target.value)} /><b>{value.toFixed(1)}</b></label>)}</div><span className="softmax-box">softmax</span><div><p className="mini-label">distribuição sobre o vocabulário</p>{logits.map((_, i) => <div className="prob" key={labels[i]}><span>{labels[i]}</span><i style={{ width: `${probabilities[i] * 100}%` }} /><b>{(probabilities[i] * 100).toFixed(1)}%</b></div>)}</div></div>
    <p className="rigor-note">Valores ilustrativos e vocabulário reduzido. No modelo real existe um logit para cada token do vocabulário.</p>
  </div>;
}

function GenerationLab() {
  const [tick,setTick]=useState(0),[running,setRunning]=useState(false);
  const count=Math.floor(tick/5),phase=tick%5,done=count>=generationTokens.length;
  useEffect(()=>{
    if(!running||done)return;
    const id=window.setTimeout(()=>setTick(t=>t+1),850);
    return ()=>window.clearTimeout(id);
  },[running,tick,done]);
  const phases=["Ler o contexto disponível","Passar pelos blocos","Calcular os escores","Converter em probabilidades","Selecionar e anexar"];
  return <div className="lab generation-lab">
    <div className="generation-screen"><p>{phrase}<span className="generated">{generationTokens.slice(0,count).join("")}</span><i className={running&&!done?"cursor running":"cursor"}/></p></div>
    <div className="cycle-track">{phases.map((item,i)=><div key={item} className={!done&&phase===i?"active":""}><span>{i+1}</span>{item}</div>)}</div>
    <div className="generation-actions"><button onClick={()=>setRunning(!running)} disabled={done}>{running?"Pausar":"Animar o ciclo"}</button><button onClick={()=>{setRunning(false);setTick(t=>Math.min(t+1,generationTokens.length*5));}} disabled={done}>Uma etapa →</button><button className="secondary" onClick={()=>{setRunning(false);setTick(0);}}>Reiniciar</button><p>{count} de {generationTokens.length} tokens didáticos anexados</p></div>
    <p className="sandbox-note"><b>Animação roteirizada:</b> esta continuação foi escrita para ilustrar o ciclo. Ela não é calculada pelo pequeno modelo dos capítulos anteriores e não é uma resposta ao vivo do GPT‑3.</p>
    <div className="final-insight"><b>Um novo token por ciclo, não uma resposta pronta.</b><span>O texto gerado passa a fazer parte do contexto usado na próxima previsão. Isso é geração autoregressiva.</span></div>
    <MoreMath title="É preciso recalcular tudo a cada token?"><p>Não. No processamento inicial da entrada, chamado <i>prefill</i>, várias posições podem ser calculadas em paralelo dentro de cada camada, respeitando a máscara causal.</p><p>Na continuação, um cache de K e V guarda as chaves e os valores já calculados por camada para as posições anteriores. O novo token atravessa os blocos e consulta essas informações. Os blocos continuam em sequência; o próximo token só é escolhido depois do processamento necessário.</p><p>Cache significa armazenamento temporário para reutilização. Ele não é treinamento nem uma alteração dos pesos do modelo.</p></MoreMath>
  </div>;
}

export default function Home() {
  const [activeSection,setActiveSection]=useState(0);
  const stageRef=useRef<HTMLDivElement>(null);
  const go=(index:number)=>{
    const target=Math.max(0,Math.min(sectionIds.length-1,index));
    setActiveSection(target);
    window.history.replaceState(null,"",`#${sectionIds[target]}`);
    window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    requestAnimationFrame(()=>document.getElementById(sectionIds[target])?.focus({preventScroll:true}));
  };
  useEffect(()=>{
    const fromHash=()=>{const index=sectionIds.indexOf(window.location.hash.slice(1));if(index>=0)setActiveSection(index);};
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(target.closest("input,select,textarea,button,summary,[role=button]"))return;
      if(event.key==="ArrowRight")go(activeSection+1);
      if(event.key==="ArrowLeft")go(activeSection-1);
    };
    fromHash();window.addEventListener("hashchange",fromHash);window.addEventListener("keydown",onKey);
    return ()=>{window.removeEventListener("hashchange",fromHash);window.removeEventListener("keydown",onKey);};
  },[activeSection]);
  const visible=(id:string,theme="")=>({className:`chapter ${theme} ${sectionIds[activeSection]===id?"active-chapter":""}`,hidden:sectionIds[activeSection]!==id,tabIndex:-1});
  const jump=(id:string)=>go(sectionIds.indexOf(id));
  return <main className="site-root friendly-site">
    <a className="skip-content" href={`#${sectionIds[activeSection]}`}>Ir ao conteúdo</a>
    <header className="site-header"><button className="site-brand" onClick={()=>go(0)}><span>POR DENTRO DA IA</span><small>Uma jornada pela inferência</small></button><div className="site-course"><b>Tópicos em sensoriamento remoto</b><span>Entendendo e utilizando modelos de IA para o processamento e análise de dados de observação da Terra · LAPIG / UFG</span></div><div className="header-actions"><span className="model-badge">Referência · GPT‑3 175B</span><a className="observatory-return" href="/observatorio-ia/#experiencias-interativas"><span aria-hidden="true">← </span>Voltar ao Observatório</a></div></header>
    <div className="site-layout">
      <aside className="chapter-menu" aria-label="Capítulos da aula"><p>ABRA A CAIXA, PASSO A PASSO</p>{sectionIds.map((id,index)=><button key={id} className={activeSection===index?"active":""} aria-current={activeSection===index?"step":undefined} onClick={()=>go(index)}><span>{String(index+1).padStart(2,"0")}</span><b>{sectionLabels[index]}</b></button>)}<div className="menu-scope"><b>Sempre em inferência</b><span>Pesos fixos.<br/>Estados em transformação.</span></div></aside>
      <div className="chapter-stage" ref={stageRef}>
        <div className="lesson-wayfinding"><div><span className="travel-dot"/><b>Fio condutor: “próximo”</b><span>acompanhe o estado, não uma palavra que muda de identidade</span></div><label className="mobile-chapters">Capítulo<select value={activeSection} onChange={e=>go(+e.target.value)}>{sectionLabels.map((s,i)=><option key={s} value={i}>{i+1}. {s}</option>)}</select></label><Glossary/><ArchitectureCompass activeId={sectionIds[activeSection]} onGo={jump} compact/></div>
        <section id="inicio" {...visible("inicio","hero")}><div className="hero-grid"><div className="hero-copy"><p className="eyebrow">SEM MÁGICA. COM CONTEXTO.</p><h1>Uma frase.<br/>Milhares de números.<br/><em>Um próximo token.</em></h1><p className="lead">Entre na arquitetura de um modelo de linguagem. Acompanhe um vetor que, poeticamente, ganha cor ao incorporar o contexto de uma frase.</p><blockquote>“A vegetação saudável apresenta alta reflectância no infravermelho próximo.”</blockquote><div className="inference-boundary"><span>PONTO DE PARTIDA</span><b>O treinamento já terminou.</b><p>Nenhum parâmetro é ajustado nesta jornada. O “dicionário” e as matrizes permanecem fixos; os estados temporários se transformam.</p></div><button onClick={()=>jump("ensaio")}>Começar a jornada →</button></div><JourneyPrelude/></div><MoreMath title="Ver os vetores iniciais da frase"><OpeningVectors/></MoreMath></section>
        <section id="ensaio" {...visible("ensaio")}><SectionTitle kicker="A pergunta que abre a caixa" title="Se pudéssemos enxergar um modelo por dentro…" text="Encontraríamos enormes arranjos de números, conectados por operações. Essa é a provocação do ensaio que inspira nossa aula."/><MatrixLandscape/><InsideTheBoxEssay/><p className="diagram-caption">A matriz de embeddings E é o “dicionário” numérico. 50.257 linhas × 12.288 componentes = 617.558.016 parâmetros. Os 175 bilhões são o total aproximado de parâmetros do modelo, não seu número de etapas.</p></section>
        <section id="mapa" {...visible("mapa")}><SectionTitle kicker="Um mapa para não perder o fio" title="Do texto a uma continuação, em seis movimentos" text="Não é necessário dominar matemática para começar. Primeiro veja a função de cada etapa; abra as contas quando quiser investigar."/><div className="visual-roadmap">{[["tokens","1","Representar","O texto vira tokens; cada token recebe seu vetor."],["ordem","2","Localizar","A posição diferencia onde cada token aparece."],["transformer","3","Contextualizar","Cada bloco comunica informação e transforma os estados."],["profundidade","4","Aprofundar","A saída de um bloco se torna a entrada do seguinte."],["saida","5","Escolher","O último estado produz chances para o próximo token."],["ciclo","6","Repetir","O token escolhido entra no contexto e o ciclo continua."]].map(([id,n,title,copy],i)=><button key={id} onClick={()=>jump(id)} style={{"--accent":["#6754b8","#267bc0","#12847b","#b74374","#cc692a","#7a5cbd"][i]} as CSSProperties}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div><i>→</i></button>)}</div><CheckUnderstanding question="O que muda quando você envia outra frase?" options={["Os estados temporários calculados pelo modelo","Todos os pesos aprendidos são reescritos"]} correct={0} explanation="Na inferência comum, o contexto altera os cálculos e os estados, não os parâmetros aprendidos."/></section>
        <section id="tokens" {...visible("tokens")}><SectionTitle kicker="Representar · um passo curto" title="Token é um pedaço de texto que o modelo reconhece" text="O tokenizer é o procedimento que segmenta o texto e o converte em IDs. Um ID é um endereço no vocabulário: não é uma medida de significado."/><TokenLab/><div className="remember"><span>Nosso acordo didático</span><p>Para seguir a história sem distrações, usamos uma palavra por token e deixamos a pontuação final fora da entrada dos laboratórios. A segmentação de subpalavras acima também é inventada; não foi extraída do tokenizer do GPT‑3.</p></div></section>
        <section id="vetores" {...visible("vetores")}><SectionTitle kicker="Representar · olhar para dentro do vetor" title="O “dicionário” numérico fornece uma linha de números" text="Essa tabela é a matriz de embeddings, abreviada E. A linha copiada é um embedding: o vetor inicial associado ao token."/><VectorIntro/><MoreMath title="Explorar o dicionário e a soma componente a componente"><EmbeddingLab/><div className="dimension-strip"><div><b>escalar</b><span>um número; zero eixos</span></div><div><b>vetor</b><span>uma lista; um eixo</span></div><div><b>matriz</b><span>tabela; dois eixos</span></div><div><b>tensor</b><span>termo geral para arranjos, inclusive escalares, vetores e matrizes</span></div></div></MoreMath></section>
        <section id="ordem" {...visible("ordem")}><SectionTitle kicker="Localizar · antes da comunicação" title="A mesma palavra em outro lugar não faz o mesmo papel" text="O vetor original identifica o token, mas sozinho não informa onde ele está. O GPT‑3 acrescenta um vetor de posição aprendido."/><PositionIntro/><MoreMath title="Ver como trocar a ordem muda a relação"><OrderLab/></MoreMath><MoreMath title="Explorar seno e cosseno: a proposta original de 2017"><PositionalEncodingLab/></MoreMath></section>
        <section id="matriz" {...visible("matriz")}><SectionTitle kicker="A operação que encontraremos muitas vezes" title="Misturar componentes e deslocar resultados" text="Uma transformação matricial produz novos números a partir dos que entram. Um viés acrescenta valores aprendidos. O embedding guardado no dicionário não é reescrito."/><MatrixIntuition/><MoreMath title="Controlar cada peso e cada viés de uma matriz 2 × 2"><MatrixLab/></MoreMath></section>
        <section id="transformer" {...visible("transformer")}><SectionTitle kicker="Contextualizar · a arquitetura" title="Entre em um bloco Transformer" text="Uma arquitetura é uma organização de operações. No GPT‑3, repetem-se blocos com atenção, MLP, normalizações e caminhos de soma."/><BlockExplorer/><CheckUnderstanding question="Onde fica a MLP?" options={["Dentro de cada bloco, depois da atenção","Só depois de todos os 96 blocos"]} correct={0} explanation="Atenção e MLP se alternam a cada bloco. As normalizações e somas residuais fazem parte desse percurso."/><MoreMath title="Consultar o diagrama técnico e os nomes dos estados"><TransformerLab/></MoreMath></section>
        <section id="qkv" {...visible("qkv")}><SectionTitle kicker="Comunicar · preparar as três representações" title="Q, K e V: três trabalhos, três transformações" text="Não são perguntas e respostas em português. São vetores numéricos produzidos por matrizes de pesos. Vamos calcular uma saída por vez."/><ProjectionLesson/></section>
        <section id="atencao" {...visible("atencao")}><SectionTitle kicker="Comunicar · o mecanismo de atenção" title="De quem esta posição receberá informação?" text="A atenção calcula conexões dependentes da entrada. A posição “próximo” pode combinar informações de todas as posições até ela."/><AttentionStory/><CheckUnderstanding question="Depois de calcular um peso de atenção, ele é usado onde?" options={["Multiplica o vetor V daquela posição","Substitui uma linha do dicionário E"]} correct={0} explanation="Cada peso multiplica seu V; depois, as contribuições são somadas. E continua fixa."/><MoreMath title="Editar WQ, WK e WV e inspecionar a matriz de atenção"><p>Este laboratório isolado usa projeções diretamente sobre a entrada, sem a normalização prévia do modelo de dois blocos. Seus valores não são os mesmos da figura principal. Seu objetivo é inspecionar os efeitos de editar matrizes.</p><AttentionLab/></MoreMath></section>
        <section id="softmax" {...visible("softmax")}><SectionTitle kicker="Ponderar · entender os percentuais" title="Softmax: comparar, tornar positivo, dividir" text="Um escore isolado não informa um percentual de atenção. Precisamos considerar os outros escores da mesma linha."/><SoftmaxStory/></section>
        <section id="normalizacao" {...visible("normalizacao")}><SectionTitle kicker="Preparar · por que normalizar?" title="Controlar a escala sem misturar palavras" text="A normalização ocorre dentro de cada bloco. Vamos isolá-la para enxergar o que faz com os componentes de uma única posição."/><NormalizationStory/></section>
        <section id="mlp" {...visible("mlp")}><SectionTitle kicker="Transformar · o outro trabalho de cada bloco" title="A atenção reuniu informação. A MLP calcula com ela." text="MLP significa Multilayer Perceptron: uma rede neural multicamadas. Ela transforma os componentes de cada posição separadamente."/><MLPStory/><NeuralNetworkStory/><MoreMath title="Consultar h, n, u, a e Δh no percurso matricial"><MLPChapter/></MoreMath></section>
        <section id="dobras" {...visible("dobras")}><SectionTitle kicker="Transformar · por que não linearidade?" title="Quando esticar e deslocar não bastam" text="Se encadearmos apenas matrizes e vieses, teremos uma única transformação afim equivalente. Uma ativação muda essa história: introduz respostas diferentes conforme os valores de entrada."/><OrigamiStory/><ActivationComparison/></section>
        <section id="profundidade" {...visible("profundidade")}><SectionTitle kicker="Aprofundar · agora veja os 96 blocos" title="O estado que sai de um bloco entra no seguinte" text="No GPT‑3 175B, esse percurso passa por 96 blocos. As representações são recalculadas, sem reescrever os embeddings originais."/><DepthStory/><CheckUnderstanding question="“Ganhar cor” quer dizer que cada dimensão passa a ter um significado fixo?" options={["Não: as cores são uma metáfora para a contextualização","Sim: cada cor identifica um significado específico"]} correct={0} explanation="Não existe uma legenda universal de significados por componente. Os padrões são distribuídos, e a metáfora não mede compreensão."/></section>
        <section id="laboratorio" {...visible("laboratorio")}><SectionTitle kicker="Juntar as peças · números de ponta a ponta" title="Uma palavra muda. Até onde essa mudança chega?" text="Agora não são só desenhos: este pequeno modelo calcula atenção, MLP, resíduos e saída com os mesmos parâmetros fixos. São dois blocos didáticos, não os pesos do GPT‑3."/><ToyJourney/></section>
        <section id="saida" {...visible("saida")}><SectionTitle kicker="Escolher · do último estado ao vocabulário" title="Ainda não há uma palavra pronta dentro do vetor" text="Após os blocos e a normalização final, uma matriz produz um logit — um escore — para cada token. Softmax transforma os escores em probabilidades; a decodificação seleciona uma continuação."/><VocabularyBoundary/><ReadoutStory/><MoreMath title="Alterar escores diretamente e explorar a temperatura"><OutputLab/></MoreMath></section>
        <section id="ciclo" {...visible("ciclo")}><SectionTitle kicker="Repetir · como uma resposta cresce" title="Um token escolhido. Mais uma volta pelo modelo." text="O token selecionado é anexado ao contexto. O modelo processa a continuação e calcula a distribuição seguinte. Os parâmetros continuam fixos."/><GenerationLab/></section>
        <section id="fontes" {...visible("fontes")}><SectionTitle kicker="Síntese · o que agora você consegue enxergar" title="A fluência nasce de uma computação, não de mágica" text="O modelo usa padrões aprendidos para produzir continuidades condicionadas ao contexto. Isso permite textos sofisticados, mas não garante que sejam verdadeiros."/><div className="summary-line">texto <i>→</i> vetores <i>→</i> atenção + MLP <i>→</i> escores <i>→</i> token <i>↺</i></div><div className="inference-scope-final"><b>O escopo é inferência.</b><span>Não descrevemos aqui o treinamento, a retropropagação nem a atualização dos parâmetros. A matriz de embeddings E e os pesos ficam fixos; os estados temporários se transformam.</span></div><div className="rigor-grid"><div><b>Referência real: GPT‑3 175B</b><p>96 blocos; 96 cabeças por bloco; 12.288 componentes por estado; MLP com 49.152 componentes intermediários; cerca de 175 bilhões de parâmetros. Não confundir blocos, cabeças e parâmetros.</p></div><div><b>Modelo didático calculado</b><p>Dois blocos, duas cabeças, quatro componentes, oito unidades na MLP e cinco candidatos de saída. Posições e pesos inventados, fixos e não treinados.</p></div><div><b>Metáforas, não medições</b><p>Cores ilustram contextualização; dobras explicam não linearidade. Não representam significados identificados em neurônios reais do GPT‑3.</p></div></div><div className="references"><a href="https://www.ibm.com/think/news/what-does-ai-look-like" target="_blank" rel="noreferrer"><b>IBM Think · ensaio de referência</b><span>What does AI look like?</span></a><a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noreferrer"><b>Brown et al. (2020)</b><span>GPT‑3: arquitetura, dimensões e limites</span></a><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer"><b>Vaswani et al. (2017)</b><span>Transformer, atenção e posições sinusoidais</span></a><a href="https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf" target="_blank" rel="noreferrer"><b>Radford et al. (2019)</b><span>GPT‑2: arquitetura de base adotada pelo GPT‑3</span></a><a href="https://arxiv.org/abs/1606.08415" target="_blank" rel="noreferrer"><b>Hendrycks e Gimpel</b><span>Gaussian Error Linear Units (GELUs)</span></a><a href="https://arxiv.org/abs/1607.06450" target="_blank" rel="noreferrer"><b>Ba, Kiros e Hinton (2016)</b><span>Layer Normalization</span></a><a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noreferrer"><b>Sennrich et al. (2016)</b><span>Segmentação em subpalavras</span></a><a href="https://arxiv.org/abs/1402.1869" target="_blank" rel="noreferrer"><b>Montúfar et al. (2014)</b><span>Regiões lineares em redes profundas</span></a></div><div className="closing-message"><b>Por dentro da IA</b><span>Um embedding dá início à jornada. Uma representação contextualizada ajuda a escolher a continuação. O ciclo se repete.</span><button onClick={()=>go(0)}>Recomeçar</button></div></section>
        <nav className="chapter-controls" aria-label="Navegação entre capítulos"><button onClick={()=>go(activeSection-1)} disabled={activeSection===0}>← Anterior</button><div><span>{String(activeSection+1).padStart(2,"0")} / {sectionIds.length}</span><b>{sectionLabels[activeSection]}</b><progress value={activeSection+1} max={sectionIds.length} aria-label="Progresso pela jornada"/></div><button onClick={()=>go(activeSection+1)} disabled={activeSection===sectionIds.length-1}>Próximo →</button></nav>
      </div>
      <ArchitectureCompass activeId={sectionIds[activeSection]} onGo={jump}/>
    </div>
  </main>;
}
