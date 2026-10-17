import type { Article } from "./catalog";
import { catalogDate } from "./catalogOrdering";
import { useNewsSummary } from "./PressSummary";
import { featuredPeriod } from "./FeaturedDebate";
import { formatPublicDate } from "./dateLabels";

export function AboutPage({ articles, loaded, english = false }: { articles: Article[]; loaded: boolean; english?: boolean }) {
  const t = (pt: string, en: string) => english ? en : pt;
  const news = useNewsSummary();
  const latest = Math.max(0, ...articles.map(article => catalogDate(article.includedAt)));
  return <section className="pt-about-page" aria-labelledby="about-title">
    <div className="pt-about-heading"><p className="eyebrow">{t("Observatório UFG-IA", "UFG-AI Observatory")}</p><h1 id="about-title">{t("Sobre", "About")}</h1></div>
    <section><h2>{t("O que é", "What it is")}</h2><p>{t("Um acervo público de conteúdos sobre inteligência artificial, ligado ao LAPIG e à Universidade Federal de Goiás, com acesso às fontes originais. Reúne materiais de estudo, Panorama de modelos, notícias e uma aula interativa.", "A public collection of content on artificial intelligence, linked to LAPIG and the Federal University of Goiás, with access to original sources. It brings together study materials, a model Panorama, news and an interactive lesson.")}</p></section>
    <section><h2>{t("Quem faz", "Who makes it")}</h2><p>{t("Desenvolvimento e curadoria: ", "Development and curation: ")}<a href="mailto:laerte@ufg.br">Laerte Ferreira</a>, <a href="mailto:victor.amaral@ufg.br">Victor Amaral</a>{t(" e ", " and ")}<a href="mailto:tiagogoncalves@discente.ufg.br">Tiago Geraldine</a>.</p></section>
    <section><h2>{t("Como a curadoria funciona", "How curation works")}</h2><p>{t("Os materiais são organizados por tipo, tema e palavras-chave. Os registros publicados vêm de uma planilha; quando a consulta não está disponível, o portal usa a cópia local de contingência.", "Materials are organized by type, topic and keywords. Published records come from a spreadsheet; when it is unavailable, the portal uses the local fallback copy.")}</p></section>
    <section><h2>{t("De quando são os dados", "How recent the data is")}</h2><dl>
      <dt>{t("Acervo", "Collection")}</dt><dd>{loaded && latest ? <>{t("Inclusão mais recente registrada: ", "Most recent recorded addition: ")}<time dateTime={new Date(latest).toISOString().slice(0, 10)}>{formatPublicDate(new Date(latest).toISOString().slice(0, 10), english ? "en" : "pt")}</time>{t(". Essa data é a inclusão no acervo, não a publicação original nem o horário da consulta.", ". This is the date of addition to the collection, rather than the original publication or the time of retrieval.")}</> : t("Carregando as datas de inclusão do acervo.", "Loading collection addition dates.")}</dd>
      <dt>Panorama</dt><dd>{t("As abas consultam as fontes do Panorama ao serem abertas. As datas de lançamento e atualização disponíveis são apresentadas no próprio produto.", "The tabs query the Panorama sources when opened. Available release and update dates are shown in the product itself.")}</dd>
      <dt>{t("Notícias", "News")}</dt><dd>{news ? <>{t("Base com ", "Archive with ")}{news.total.toLocaleString(english ? "en-US" : "pt-BR")}{t(" matérias; última publicação registrada em ", " articles; latest recorded publication on ")}<time dateTime={news.lastDate}>{formatPublicDate(news.lastDate, english ? "en" : "pt")}</time>.</> : t("A data da base está disponível em IA como notícia diária.", "The archive date is available in AI in the daily news.")}</dd>
      <dt>{t("Destaque semanal", "Weekly highlight")}</dt><dd>{t("Edição de ", "Edition for ")}{english ? featuredPeriod.englishLabel : featuredPeriod.label}{t(". Nova edição todo domingo; as edições anteriores ficam no histórico da inicial.", ". New edition every Sunday; previous editions are available in the homepage history.")}</dd>
    </dl></section>
    <section><h2>{t("Como participar", "How to participate")}</h2><p><a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer">{t("Conte como você usa a IA", "Tell us how you use AI")}</a>{t(" ou ", " or ")}<a href={english ? "#ufg-ecosystem" : "#ecossistema-ufg"}>{t("acesse o mapeamento de iniciativas da UFG", "explore the mapping of UFG initiatives")}</a>.</p></section>
    <section><h2>{t("Contato", "Contact")}</h2><p><a href="https://docs.google.com/forms/d/e/1FAIpQLSfEFaHskdhwcWmqaRgSDHDe6jw-0B2GEnP70dCxovqbv_GaRA/viewform?usp=header" target="_blank" rel="noreferrer">{t("Envie dúvidas e sugestões pelo formulário de contato", "Send questions and suggestions using the contact form")}</a>.</p></section>
  </section>;
}
