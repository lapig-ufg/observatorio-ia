const OBSERVATORY_URL = "/observatorio-ia/#experiencias-interativas";

export function ClassesHome() {
  return (
    <main className="site-root friendly-site classes-home">
      <header className="site-header">
        <a className="site-brand" href="./">
          <span>POR DENTRO DA IA</span>
          <small>Uma trilha para abrir a caixa</small>
        </a>
        <div className="site-course">
          <b>Tópicos em sensoriamento remoto</b>
          <span>Entendendo e utilizando modelos de IA para o processamento e análise de dados de observação da Terra · LAPIG / UFG</span>
        </div>
        <div className="header-actions">
          <span className="model-badge">Cálculo local</span>
          <a className="observatory-return" href={OBSERVATORY_URL}>
            <span aria-hidden="true">← </span>Voltar ao Observatório
          </a>
        </div>
      </header>

      <div className="classes-shell">
        <section className="classes-hero">
          <div className="classes-hero-copy">
            <p className="eyebrow">AULAS INTERATIVAS · LAPIG / UFG</p>
            <h1>
              Por dentro da IA
              <br />
              <em>Duas aulas, uma trilha.</em>
            </h1>
            <p className="lead">
              Comece pelo funcionamento de uma rede neural pequena. Depois, use essa base para atravessar um bloco
              Transformer e acompanhar como uma frase se transforma em um próximo token.
            </p>
            <div className="classes-hero-facts">
              <div><b>2</b><span>aulas guiadas</span></div>
              <div><b>5</b><span>playgrounds de rede neural</span></div>
              <div><b>19</b><span>capítulos de Transformer</span></div>
              <div><b>0</b><span>chamadas a modelos externos</span></div>
            </div>
          </div>
          <div className="classes-hero-figure" aria-hidden="true">
            <div className="classes-figure-node is-one"><span>W</span><b>+ b</b></div>
            <div className="classes-figure-node is-two"><span>φ</span><b>ativação</b></div>
            <div className="classes-figure-node is-three"><span>δ</span><b>erro</b></div>
            <div className="classes-figure-line is-a" />
            <div className="classes-figure-line is-b" />
            <div className="classes-figure-caption">representar → prever → medir → ajustar</div>
          </div>
        </section>

        <section className="classes-path" aria-labelledby="classes-path-title">
          <div className="classes-path-head">
            <div>
              <p className="mini-label">sequência recomendada</p>
              <h2 id="classes-path-title">A base primeiro. O Transformer depois.</h2>
            </div>
            <p>
              A aula de Transformers usa a ideia de neurônio, matriz de pesos e ativação. Por isso, a ordem sugerida começa
              pela rede neural.
            </p>
          </div>

          <div className="classes-cards">
            <a className="class-card is-neural" href="redes-neurais/">
              <div className="class-card-top">
                <span className="class-number">01</span>
                <span className="class-badge">Comece aqui</span>
              </div>
              <h3>Redes neurais</h3>
              <p className="class-subtitle">Do neurônio ao aprendizado</p>
              <p className="class-description">
                Construa uma rede [2, 3, 1], conduza a passagem direta, retropropague o erro, atualize os pesos e treine
                no XOR. Cada etapa tem teoria antes do playground.
              </p>
              <ul className="class-topics">
                <li>neurônio e camadas</li>
                <li>ReLU e tanh</li>
                <li>passagem direta</li>
                <li>regra da cadeia</li>
                <li>descida do gradiente</li>
                <li>treino e previsão</li>
              </ul>
              <div className="class-meta">
                <span>26 capítulos</span>
                <span>5 playgrounds</span>
                <span>~45 min</span>
              </div>
              <span className="class-cta">Começar pela base <i>→</i></span>
            </a>

            <div className="classes-connector" aria-hidden="true">
              <span>depois</span>
              <i>→</i>
            </div>

            <a className="class-card is-transformer" href="transformers/">
              <div className="class-card-top">
                <span className="class-number">02</span>
                <span className="class-badge is-secondary">Em seguida</span>
              </div>
              <h3>Transformers</h3>
              <p className="class-subtitle">Da frase ao próximo token</p>
              <p className="class-description">
                Acompanhe um embedding, as projeções Q, K e V, a atenção causal, a MLP e a geração autoregressiva.
                Diagramas, laboratórios e um modelo didático calculado no navegador.
              </p>
              <ul className="class-topics">
                <li>tokens e embeddings</li>
                <li>posição</li>
                <li>Q, K e V</li>
                <li>softmax</li>
                <li>MLP e resíduos</li>
                <li>geração de texto</li>
              </ul>
              <div className="class-meta">
                <span>19 capítulos</span>
                <span>laboratórios interativos</span>
                <span>~50 min</span>
              </div>
              <span className="class-cta">Abrir a aula <i>→</i></span>
            </a>
          </div>
        </section>

        <section className="classes-how">
          <div>
            <p className="mini-label">como usar</p>
            <h2>Leia, mexa, execute.</h2>
          </div>
          <div className="classes-how-grid">
            <div><span>1</span><b>Abra um capítulo</b><p>Cada conceito tem uma explicação curta, uma figura e, quando faz sentido, um laboratório.</p></div>
            <div><span>2</span><b>Execute o playground</b><p>Os scripts rodam no navegador. Você pode editar pesos, amostras, ativações e épocas.</p></div>
            <div><span>3</span><b>Compare e siga</b><p>O próximo capítulo depende do anterior apenas quando o cálculo precisa dos mesmos dados.</p></div>
          </div>
        </section>

        <footer className="classes-footer">
          <span>Por dentro da IA · LAPIG / UFG</span>
          <p>
            Material didático. Os números das aulas são inventados, fixos e calculados localmente; não são parâmetros
            reais de um modelo de linguagem.
          </p>
          <a href={OBSERVATORY_URL}>Observatório UFG-IA →</a>
        </footer>
      </div>
    </main>
  );
}
