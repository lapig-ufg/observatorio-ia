import type { Article } from "./catalog";
import { catalogDate } from "./catalogOrdering";
import { useNewsSummary } from "./PressSummary";
import { featuredPeriod } from "./FeaturedDebate";
import { formatPublicDate } from "./dateLabels";

export function AboutPage({ articles, loaded }: { articles: Article[]; loaded: boolean }) {
  const news = useNewsSummary();
  const latest = Math.max(0, ...articles.map(article => catalogDate(article.includedAt)));
  return <section className="pt-about-page" aria-labelledby="about-title">
    <p className="eyebrow">Observatório UFG-IA</p><h1 id="about-title">Sobre</h1>
    <p className="pt-draft-note"><strong>Texto provisório, em revisão</strong></p>
    <section><h2>O que é</h2><p>Um acervo público de conteúdos sobre inteligência artificial, ligado ao LAPIG e à Universidade Federal de Goiás, com acesso às fontes originais. Reúne materiais de estudo, Panorama de modelos, notícias e uma aula interativa.</p></section>
    <section><h2>Quem faz</h2><p>Desenvolvimento e curadoria: <a href="mailto:laerte@ufg.br">Laerte Ferreira</a>, <a href="mailto:victor.amaral@ufg.br">Victor Amaral</a> e <a href="mailto:tiagogoncalves@discente.ufg.br">Tiago Geraldine</a>.</p></section>
    <section><h2>Como a curadoria funciona</h2><p>Os materiais são organizados por tipo, tema e palavras-chave. Os registros publicados vêm de uma planilha; quando a consulta não está disponível, o portal usa a cópia local de contingência.</p><p>[Quais são os critérios de seleção, revisão e retirada de materiais?]</p></section>
    <section><h2>O papel da IA na produção</h2><p>[Quais ferramentas de IA participam da produção de resumos, traduções e código, e como ocorre a revisão humana?]</p></section>
    <section><h2>De quando são os dados</h2><dl>
      <dt>Acervo</dt><dd>{loaded && latest ? <>Inclusão mais recente registrada: <time dateTime={new Date(latest).toISOString().slice(0, 10)}>{formatPublicDate(new Date(latest).toISOString().slice(0, 10))}</time>. Essa data é a inclusão no acervo, não a publicação original nem o horário da consulta.</> : "Carregando as datas de inclusão do acervo."}</dd>
      <dt>Panorama</dt><dd>As abas consultam as fontes do Panorama ao serem abertas. As datas de lançamento e atualização disponíveis são apresentadas no próprio produto. [Qual periodicidade de revisão deve ser informada aqui?]</dd>
      <dt>Notícias</dt><dd>{news ? <>Base com {news.total.toLocaleString("pt-BR")} matérias; última publicação registrada em <time dateTime={news.lastDate}>{formatPublicDate(news.lastDate)}</time>.</> : "A data da base está disponível em IA como notícia diária."}</dd>
      <dt>Destaque semanal</dt><dd>Edição de {featuredPeriod.label}. Nova edição todo domingo; as edições anteriores ficam no histórico da inicial.</dd>
    </dl></section>
    <section><h2>Como participar</h2><p><a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer">Conte como você usa a IA</a> ou <a href="#ecossistema-ufg">acesse o mapeamento de iniciativas da UFG</a>.</p></section>
    <section><h2>Contato</h2><p><a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer">Envie dúvidas e sugestões pelo formulário de contato</a>.</p></section>
  </section>;
}
