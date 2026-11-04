/* Aba "IAs gratuitas" do Panorama. Desde nov/2026 os dados moram no próprio
   Observatório (public/gratuitos/gratuitos.json), conferidos nas páginas
   oficiais, em duas partes: IA no navegador e IA instalada no computador.
   É a página que o curso "Do chat ao agente" usa. */
import { formatPublicDate } from "../dateLabels";
import { useEffect, useState } from "react";
import { AppWindow, CalendarDays, CalendarRange, Clock3, HelpCircle, Laptop, Sun, Wifi, type LucideIcon } from "lucide-react";
import { loadPanoramaConfig } from "../panoramaSource";
import { canonicalCompany, emptyPanoramaConfig, type PanoramaConfig } from "../panoramaData";
import { EditorialExternal, EditorialState, useEditorialData } from "./EditorialShared";
import { CompanyMark } from "./CompanyMark";
import { verificationAge } from "../panoramaRefinement";
import { loadFreeGuide, freeText, type Bilingual, type FreeGuideItem, type FreeLimitType } from "../freeGuide";

const LIMIT_ICONS: Record<FreeLimitType, LucideIcon> = {
  horas: Clock3, dia: Sun, semana: CalendarDays, mes: CalendarRange, rede: Wifi, aberto: HelpCircle,
};
const SECTION_ICONS: Record<string, LucideIcon> = { navegador: AppWindow, instalada: Laptop };

const FALLBACK_COLORS = ["#2f6f8f", "#7a4fa3", "#b5562f", "#2f7d5b", "#9a6a12", "#3d5aa8", "#a23e62", "#4b6b2a"];
function toolBrand(company: string, config: PanoramaConfig) {
  const name = canonicalCompany(company, config);
  const logoPath = config.logoPaths[config.logoMap[name]] || config.logoPaths[config.logoMap[company]] || "";
  const known = config.companyColors[name] || config.companyColors[company];
  const hash = [...company].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { name: company, logoPath, color: known || FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}

export function FreeTools({ english = false, referenceDate }: { english?: boolean; referenceDate?: string }) {
  const { data, loading, error, retry } = useEditorialData(loadFreeGuide, english);
  const [config, setConfig] = useState<PanoramaConfig>(emptyPanoramaConfig);
  useEffect(() => {
    let active = true;
    void loadPanoramaConfig().then((result) => { if (active) setConfig(result.config); });
    return () => { active = false; };
  }, []);
  if (loading || error || !data) return <EditorialState loading={loading} error={error} retry={retry} english={english} />;
  const t = (value: Bilingual | undefined) => freeText(value, english);
  const lang = english ? "en" : "pt";
  const age = referenceDate ? verificationAge(data.checked, referenceDate) : null;
  const jump = (id: string) => document.getElementById(`free-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const card = (item: FreeGuideItem) => {
    const brand = toolBrand(item.company, config);
    const Icon = LIMIT_ICONS[item.limitType];
    const type = data.limitTypes.find(l => l.id === item.limitType);
    const facts: [string, string | undefined][] = [
      [english ? "Files" : "Arquivos", t(item.files)],
      [english ? "Creates" : "Entrega", t(item.creates)],
      [english ? "Systems" : "Sistemas", t(item.systems)],
      [english ? "Account" : "Conta", t(item.account)],
      [english ? "Your chats" : "Suas conversas", t(item.privacy)],
    ];
    return <li key={item.id} className="free2-card" style={{ ["--brand" as string]: brand.color }}>
      <header>
        <CompanyMark company={brand.name} color={brand.color} logoPath={brand.logoPath} size={40} />
        <div><h3>{item.name}</h3><small>{item.company}</small></div>
        <EditorialExternal href={item.url} english={english} label={`free:${item.id}`}><span className="free2-open">{english ? "Open" : "Abrir"}<span className="sr-only"> {item.name}</span></span></EditorialExternal>
      </header>
      <p className="free2-best">{t(item.bestFor)}</p>
      <div className={`free2-quota free2-quota--${item.limitType}`}>
        <span className="free2-type"><Icon size={14} aria-hidden="true" />{type ? t(type.label) : item.limitType}</span>
        <p><strong>{t(item.model)}</strong>{t(item.quota)}</p>
      </div>
      <dl className="free2-facts">{facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="free2-catch"><b>{english ? "The catch" : "O porém"}</b>{t(item.catch)}</p>
      <footer>
        <span>{english ? "Checked on" : "Conferido em"} <time dateTime={item.checked}>{formatPublicDate(item.checked, lang)}</time></span>
        <EditorialExternal href={item.source} english={english} label={`free-source:${item.id}`}>{english ? "Official source" : "Fonte oficial"}</EditorialExternal>
      </footer>
    </li>;
  };

  return <div className="panorama-free free2">
    <div className="free2-top">
      <p className="free2-lead">{t(data.lead)} <span className="free2-checked">{english ? "Checked on the official pages on" : "Conferido nas páginas oficiais em"} <time dateTime={data.checked}>{formatPublicDate(data.checked, lang)}</time>.{age !== null && age > 30 && <strong> {english ? `That was ${age} days ago; free quotas change often.` : `Faz ${age} dias; cotas grátis mudam com frequência.`}</strong>}</span></p>
      <nav className="free2-jump" aria-label={english ? "Sections" : "Partes da página"}>
        {data.sections.map(s => {
          const Icon = SECTION_ICONS[s.id] || AppWindow;
          const n = data.items.filter(i => i.section === s.id).length;
          return <button key={s.id} type="button" onClick={() => jump(s.id)}>
            <Icon size={26} aria-hidden="true" />
            <span><b>{t(s.title)}</b><small>{t(s.short)} · {n} {english ? "tools" : "ferramentas"}</small></span>
          </button>;
        })}
      </nav>
    </div>

    <section className="free2-limits" aria-labelledby="free2-limits-title">
      <h2 id="free2-limits-title">{english ? "How free limits work" : "Como funcionam os limites do grátis"}</h2>
      <p>{t(data.limitsIntro)}</p>
      <ul>{data.limitTypes.map(l => {
        const Icon = LIMIT_ICONS[l.id];
        return <li key={l.id} className={`free2-limit free2-quota--${l.id}`}><span className="free2-type"><Icon size={14} aria-hidden="true" />{t(l.label)}</span><p>{t(l.text)}</p></li>;
      })}</ul>
    </section>

    {data.sections.map(s => {
      const Icon = SECTION_ICONS[s.id] || AppWindow;
      return <section key={s.id} id={`free-${s.id}`} className={`free2-section free2-section--${s.id}`} aria-labelledby={`free2-${s.id}-title`}>
        <header className="free2-section-head">
          <Icon size={30} aria-hidden="true" />
          <div><h2 id={`free2-${s.id}-title`}>{t(s.title)}</h2><p>{t(s.text)}</p></div>
        </header>
        <ul className="free2-grid">{data.items.filter(i => i.section === s.id).map(card)}</ul>
        {s.leftOut && <div className="free2-left-out"><h3>{english ? "Left out, and why" : "Ficaram de fora, e por quê"}</h3><ul>{s.leftOut.map((l, i) => <li key={i}><b>{l.name}</b>{t(l.why)}</li>)}</ul></div>}
      </section>;
    })}

    <footer className="panorama-provenance"><span>{english ? "Curation by LAPIG/UFG · each card links to the official page it was checked against" : "Curadoria LAPIG/UFG · cada cartão leva à página oficial em que foi conferido"}</span></footer>
  </div>;
}
