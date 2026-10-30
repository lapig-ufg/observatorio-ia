const OBSERVATORY_URL = "/observatorio-ia/#experiencias-interativas";

export function ClassesHome() {
  return (
    <main className="site-root friendly-site classes-home">
      <header className="site-header">
        <a className="site-brand" href="./">
          <span>POR DENTRO DA IA</span>
          <small>Duas aulas independentes</small>
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
              <em>Duas aulas independentes.</em>
            </h1>
            <p className="lead">
              Escolha o assunto que quer abrir. Cada aula tem seu próprio percurso, com explicações, figuras e
              laboratórios que rodam no navegador.
            </p>
          </div>
        </section>

        <section className="classes-path" aria-labelledby="classes-path-title">
          <div className="classes-path-head">
            <div>
              <p className="mini-label">aulas disponíveis</p>
              <h2 id="classes-path-title">Escolha o assunto que quer abrir.</h2>
            </div>
            <p>
              As aulas estão ordenadas do nível mais fundamental ao mais avançado, mas não dependem uma da outra. Você
              pode começar por qualquer card.
            </p>
          </div>

          <div className="classes-cards">
            <a className="class-card is-neural" href="redes-neurais/">
              <div className="class-card-top">
                <span className="class-number">01</span>
                <span className="class-badge">Nível fundamental</span>
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
              <span className="class-cta">Abrir aula 1 <i>→</i></span>
            </a>

            <a className="class-card is-transformer" href="transformers/">
              <div className="class-card-top">
                <span className="class-number">02</span>
                <span className="class-badge is-secondary">Nível avançado</span>
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
              <span className="class-cta">Abrir aula 2 <i>→</i></span>
            </a>
          </div>
        </section>

        <section className="classes-how">
          <div>
            <p className="mini-label">como usar</p>
            <h2>Leia, mexa, execute.</h2>
          </div>
          <div className="classes-how-grid">
            <div><span>1</span><b>Escolha uma aula</b><p>Os dois percursos são autônomos. Cada card abre a aula completa, sem exigir a outra.</p></div>
            <div><span>2</span><b>Execute o playground</b><p>Os scripts rodam no navegador. Você pode editar pesos, amostras, ativações e épocas.</p></div>
            <div><span>3</span><b>Siga no seu ritmo</b><p>Quando um capítulo precisa de um cálculo anterior, o próprio playground mostra o que fazer.</p></div>
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
