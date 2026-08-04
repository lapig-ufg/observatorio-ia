import { CalendarDays, ChevronDown, ExternalLink, Filter, LoaderCircle, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadFolhaIndex, loadFolhaYear, type FolhaArticle, type FolhaIndex } from "./folha";
import { trackEvent } from "./analytics";

type Period = "30d" | "all" | number;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`)).replace(".", "");
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`)).replace(".", "");
}

function cutoffDate(lastDate: string, period: Period) {
  if (period !== "30d") return "";
  const date = new Date(`${lastDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}

function yearsForPeriod(lastDate: string, availableYears: number[], period: Period) {
  if (period === "all") return availableYears;
  if (period !== "30d") return [period];
  const cutoff = cutoffDate(lastDate, period);
  return [...new Set([Number(lastDate.slice(0, 4)), Number(cutoff.slice(0, 4))])]
    .filter((year) => availableYears.includes(year));
}

function Stars({ count }: { count: number }) {
  if (!count) return <span className="daily-news-no-stars">Sem estrelas</span>;
  return <span className="daily-news-stars" aria-label={`${count} de 5 estrelas`}>{Array.from({ length: count }, (_, index) => <Star key={index} size={13} fill="currentColor" aria-hidden="true" />)}</span>;
}

export function DailyNewsPage() {
  const [index, setIndex] = useState<FolhaIndex | null>(null);
  const [records, setRecords] = useState<FolhaArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [theme, setTheme] = useState("todos");
  const [section, setSection] = useState("todos");
  const [stars, setStars] = useState("todas");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(18);

  useEffect(() => {
    const controller = new AbortController();
    void loadFolhaIndex(controller.signal).then((nextIndex) => {
      setIndex(nextIndex);
      setError("");
    }).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Não foi possível carregar a base de notícias.");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!index) return;
    const controller = new AbortController();
    const selectedYears = yearsForPeriod(index.lastDate, index.years, period);
    setLoadingRecords(true);
    void Promise.all(selectedYears.map((year) => loadFolhaYear(year, controller.signal))).then((annualRecords) => {
      setRecords(annualRecords.flat());
    }).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Não foi possível carregar o período solicitado.");
    })
      .finally(() => setLoadingRecords(false));
    return () => controller.abort();
  }, [index, period]);

  const relevantRecords = useMemo(() => {
    if (!index) return [];
    const cutoff = cutoffDate(index.lastDate, period);
    const needle = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return records.filter((article) => {
      const inPeriod = period === "all" || (period === "30d" ? article.date >= cutoff : article.date.startsWith(`${period}-`));
      const matchesTheme = theme === "todos" || article.theme === theme;
      const matchesSection = section === "todos" || article.sectionGroup === section;
      const matchesStars = stars === "todas" || article.stars === Number(stars);
      const haystack = `${article.title} ${article.section} ${article.theme}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return inPeriod && matchesTheme && matchesSection && matchesStars && (!needle || haystack.includes(needle));
    }).sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "pt-BR"));
  }, [index, period, query, records, section, stars, theme]);

  const filteredTimeline = useMemo(() => {
    if (!index) return [];
    const cutoff = cutoffDate(index.lastDate, period);
    return index.monthly.filter(({ month }) => period === "all" || (period === "30d" ? month >= cutoff.slice(0, 7) : month.startsWith(`${period}-`)));
  }, [index, period]);
  const maxMonthlyCount = Math.max(...filteredTimeline.map(({ count }) => count), 1);
  const hasFilters = period !== "30d" || theme !== "todos" || section !== "todos" || stars !== "todas" || Boolean(query);

  const clearFilters = () => {
    setPeriod("30d"); setTheme("todos"); setSection("todos"); setStars("todas"); setQuery(""); setVisible(18);
    trackEvent("daily_news_clear_filters");
  };

  if (loading) return <section className="daily-news-loading" aria-live="polite"><LoaderCircle className="spinning" size={28} /> Carregando o observatório de imprensa…</section>;
  if (error || !index) return <section className="daily-news-unavailable"><p className="eyebrow">Observatório de imprensa</p><h1>IA como notícia diária</h1><p>{error || "A base de notícias está em preparação."}</p><p className="daily-news-unavailable-note">A página será alimentada pelo arquivo histórico da Folha de S.Paulo, sem alterar o original no Google Drive.</p></section>;

  return <section className="daily-news-page" aria-labelledby="daily-news-title">
    <header className="daily-news-hero">
      <div>
        <p className="eyebrow">Folha de S.Paulo · Observatório de imprensa</p>
        <h1 id="daily-news-title">IA como notícia diária</h1>
        <p>Uma leitura temporal da cobertura jornalística sobre Inteligência Artificial, com acesso à matéria na fonte original.</p>
      </div>
      <aside className="daily-news-source-note"><strong>Sobre os links</strong><span>O acesso integral às matérias pode depender de assinatura da Folha.</span></aside>
    </header>

    <div className="daily-news-metrics" aria-label="Resumo da base">
      <div><strong>{index.daysCovered.toLocaleString("pt-BR")}</strong><span>dias cobertos</span></div>
      <div><strong>{index.articleCount.toLocaleString("pt-BR")}</strong><span>matérias catalogadas</span></div>
      <div><strong>{formatDate(index.lastDate)}</strong><span>última notícia registrada</span></div>
    </div>

    <section className="daily-news-reading" aria-labelledby="daily-news-reading-title">
      <header className="daily-news-reading-heading">
        <p className="eyebrow">Leitura do acervo</p>
        <h2 id="daily-news-reading-title">O que aconteceu em {index.daysCovered.toLocaleString("pt-BR")} dias de IA</h2>
        <p>Uma leitura de {index.articleCount.toLocaleString("pt-BR")} matérias da Folha de S.Paulo, de novembro de 2022 ao registro mais recente da série.</p>
      </header>
      <div className="daily-news-reading-method">
        <h3>Como fazer sentido da série</h3>
        <p>“IA como notícia diária” não é uma lista bruta. A seleção parte da busca pela expressão “inteligência artificial” no site da Folha e passa por curadoria manual, que remove menções passageiras, resenhas em que IA é apenas pano de fundo, publieditoriais e duplicatas.</p>
        <p>As matérias preservam data, seção, título e link para a fonte. A escala de uma a cinco estrelas indica a relevância editorial de cada registro; os marcos trimestrais e mensais oferecem contexto para a leitura da linha do tempo. Essa arquitetura permite comprimir milhares de notícias em uma narrativa sem apagar a possibilidade de consultar cada matéria na origem.</p>
      </div>
      <div className="daily-news-reading-phases" aria-label="Fases da cobertura jornalística">
        <article>
          <p className="eyebrow">Novembro de 2022 a junho de 2023</p>
          <h3>O despertar</h3>
          <p>Antes do ChatGPT, a IA aparecia de forma dispersa: VAR da Copa, apostas e varejo. O lançamento de novembro de 2022 reconfigurou tudo. Em 2023, os alertas de Geoffrey Hinton, a carta sobre risco de extinção, o projeto de marco legal brasileiro, o AI Act europeu, a greve dupla de Hollywood, a campanha da Volkswagen com Elis Regina e a alta da Nvidia fizeram a IA se tornar, ao mesmo tempo, questão técnica, laboral, regulatória, cultural e financeira.</p>
        </article>
        <article>
          <p className="eyebrow">Julho de 2023 a dezembro de 2024</p>
          <h3>Institucionalização e primeiras fraturas</h3>
          <p>A crise de governança da OpenAI, a cúpula de Bletchley Park, disputas por direitos autorais, regulações, deepfakes e aplicações públicas colocaram a tecnologia no centro das instituições. Em 2024, os Nobel de Física e Química reconheceram pioneiros da área, a Apple levou o ChatGPT à Siri, o marco legal avançou no Senado e o STF lançou a MARIA. O lado sombrio também se adensou com deepfakes, violência sexual e danos associados a plataformas de companheiros de IA.</p>
          <p>No campo ambiental, a série registra geoglifos em Nazca, incêndios amazônicos previstos por IA, monitoramento de metano por satélite, uso de sensoriamento remoto contra Aedes e o GraphCast na previsão do tempo.</p>
        </article>
        <article>
          <p className="eyebrow">Janeiro de 2025 ao presente</p>
          <h3>Choque, corrida e bolha</h3>
          <p>O choque DeepSeek reposicionou a disputa entre China e Estados Unidos e provocou uma queda histórica no valor de mercado da Nvidia. Em seguida, a revogação da regulação de Biden, o anúncio do Stargate, a ação da própria Folha contra a OpenAI, a IA soberana, a COP30 e os alertas sobre uma bolha de investimentos tornaram a corrida por infraestrutura e modelos o eixo do noticiário.</p>
          <p>O período também reúne falhas algorítmicas, deepfakes, segurança, eleições, produtividade e os limites do retorno econômico. As eleições de 2026 transformaram o país em laboratório: campanhas, chatbots e vídeos sintéticos passaram a ocupar o debate público e judicial.</p>
        </article>
      </div>
      <div className="daily-news-reading-thread">
        <h3>O fio que atravessa tudo</h3>
        <p>Três tensões organizam o material: a concentração de poder em poucas empresas e países; consequências concretas em corpos, direitos e relações sociais; e a presença cada vez maior da IA no território e no meio ambiente. Ao longo da série, aparecem reflorestamento monitorado por satélite, detecção de desmatamento em tempo real, medição de carbono, vigilância de rios e discussões locais na UFG.</p>
        <p>Assim, a IA deixa de ser curiosidade de tecnologia e passa a funcionar como infraestrutura — da previsão do tempo e do monitoramento ambiental à segurança pública, ao agronegócio e à comunicação — enquanto sua própria pegada de energia e água também se torna tema de interesse público.</p>
      </div>
    </section>

    <section className="daily-news-timeline" aria-labelledby="daily-news-timeline-title">
      <div className="daily-news-section-heading"><div><p className="eyebrow">Linha do tempo</p><h2 id="daily-news-timeline-title">Presença da IA no noticiário</h2></div><p>O volume mensal mostra o ritmo da cobertura no período selecionado.</p></div>
      <div className="daily-news-periods" role="group" aria-label="Período da análise">
        <button type="button" className={period === "30d" ? "active" : ""} onClick={() => { setPeriod("30d"); setVisible(18); trackEvent("daily_news_period", { event_label: "30d" }); }}>Últimos 30 dias</button>
        <label className={`daily-news-year-picker ${typeof period === "number" ? "active" : ""}`}>
          <span className="sr-only">Selecionar ano</span>
          <select value={typeof period === "number" ? String(period) : ""} onChange={(event) => {
            const year = Number(event.target.value);
            if (!year) return;
            setPeriod(year); setVisible(18); trackEvent("daily_news_period", { event_label: String(year) });
          }}>
            <option value="" disabled>Selecionar ano</option>
            {index.years.map((year) => <option value={year} key={year}>{year}</option>)}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <button type="button" className={period === "all" ? "active" : ""} onClick={() => { setPeriod("all"); setVisible(18); trackEvent("daily_news_period", { event_label: "all" }); }}>Todo o período</button>
      </div>
      <div className="daily-news-timeline-bars" aria-label="Quantidade de matérias por mês">
        {filteredTimeline.map(({ month, count }) => <div key={month} className="daily-news-month"><span className="daily-news-month-label">{formatMonth(month)}</span><span className="daily-news-month-track"><span style={{ width: `${(count / maxMonthlyCount) * 100}%` }} /></span><strong>{count}</strong></div>)}
      </div>
    </section>

    <section className="daily-news-explorer" aria-labelledby="daily-news-results-title">
      <aside className="daily-news-filters">
        <div className="daily-news-filter-title"><Filter size={17} aria-hidden="true" /><strong>Filtrar matérias</strong></div>
        <label className="daily-news-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar título ou assunto</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(18); }} placeholder="Buscar título ou assunto" /></label>
        <label className="daily-news-select"><span>Assunto</span><select value={theme} onChange={(event) => { setTheme(event.target.value); setVisible(18); }}><option value="todos">Todos os assuntos</option>{index.themes.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="daily-news-select"><span>Seção da Folha</span><select value={section} onChange={(event) => { setSection(event.target.value); setVisible(18); }}><option value="todos">Todas as seções</option>{index.sections.map((item) => <option value={item.label} key={item.label}>{item.label} ({item.count})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        <label className="daily-news-select"><span>Relevância editorial</span><select value={stars} onChange={(event) => { setStars(event.target.value); setVisible(18); }}><option value="todas">Todas as relevâncias</option>{[5, 4, 3, 2, 1, 0].map((count) => <option value={count} key={count}>{count ? `${"★".repeat(count)} (${count} estrela${count > 1 ? "s" : ""})` : "Sem estrelas"}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        {hasFilters && <button type="button" className="daily-news-clear" onClick={clearFilters}><X size={15} /> Limpar filtros</button>}
      </aside>
      <div className="daily-news-results">
        <div className="daily-news-results-heading"><div><p className="eyebrow">Matérias encontradas</p><h2 id="daily-news-results-title">{loadingRecords ? "Carregando período…" : `${relevantRecords.length.toLocaleString("pt-BR")} ${relevantRecords.length === 1 ? "matéria" : "matérias"}`}</h2></div><span><CalendarDays size={16} aria-hidden="true" /> {period === "30d" ? "recorte recente" : period === "all" ? "série histórica" : `ano de ${period}`}</span></div>
        {relevantRecords.length ? <ol className="daily-news-list">{relevantRecords.slice(0, visible).map((article) => <li key={article.id}><div className="daily-news-record-meta"><time dateTime={article.date}>{formatDate(article.date)}</time><span>{article.section}</span><Stars count={article.stars} /></div><h3>{article.title}</h3><div className="daily-news-record-footer"><span>{article.theme}</span><a href={article.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("daily_news_open_article", { event_category: "outbound", event_label: article.id })}>Ler na Folha <ExternalLink size={15} aria-hidden="true" /></a></div></li>)}</ol> : <div className="daily-news-empty"><Search size={25} /><strong>Nenhuma matéria neste recorte</strong><p>Altere os filtros ou escolha outro período.</p></div>}
        {visible < relevantRecords.length && <button type="button" className="daily-news-more" onClick={() => setVisible((value) => value + 18)}>Carregar mais matérias</button>}
      </div>
    </section>
  </section>;
}
