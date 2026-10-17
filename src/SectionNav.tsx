import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { sectionNavigation, type SectionLink } from "./sectionNavigation";
import "./section-nav.css";

type Props = {
  sections: readonly SectionLink[];
  route: string;
  label: string;
  headingId: string;
  english?: boolean;
  position?: "section-bar" | "pager";
  tabsClassName?: string;
  onNavigate: (section: SectionLink, position: "section-bar" | "pager") => void;
};

export function SectionNav({ sections, route, label, headingId, english = false, position = "section-bar", tabsClassName = "", onNavigate }: Props) {
  const { index, current, previous, next } = sectionNavigation(sections, route);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"trigger" | "heading" | null>(null);
  const frames = useRef<number[]>([]);
  const previousLabel = english ? "Previous section" : "Seção anterior";
  const nextLabel = english ? "Next section" : "Próxima seção";

  function finishNavigation() {
    const destination = pendingFocus.current;
    if (!destination) return;
    pendingFocus.current = null;
    // O App também posiciona a rota. Depois dele, o seletor devolve o foco ao
    // botão; o paginador anuncia o título já visível abaixo do cabeçalho fixo.
    frames.current.push(requestAnimationFrame(() => {
      frames.current.push(requestAnimationFrame(() => {
        const heading = document.getElementById(headingId);
        heading?.scrollIntoView({ block: "start", behavior: "instant" });
        const target = destination === "trigger" ? trigger.current : heading;
        if (target) { target.tabIndex = destination === "trigger" ? 0 : -1; target.focus({ preventScroll: true }); }
      }));
    }));
  }

  useEffect(() => {
    setOpen(false);
    finishNavigation();
  }, [route]);

  useEffect(() => () => { frames.current.forEach(cancelAnimationFrame); }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
    const outside = (event: globalThis.MouseEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    const media = window.matchMedia("(min-width: 768px)");
    const resize = () => { if (media.matches) setOpen(false); };
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
      media.removeEventListener("change", resize);
    };
  }, [open]);

  function navigate(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, section: SectionLink, dropdown = false) {
    onNavigate(section, position);
    // Links conservam abrir em outra aba e os atalhos do navegador.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    setOpen(false);
    pendingFocus.current = dropdown ? "trigger" : "heading";
    if (event.currentTarget.tagName === "BUTTON") window.location.hash = section.href;
    if (window.location.hash === section.href) finishNavigation();
  }

  if (!current) return null;
  if (position === "pager") return <nav className="section-nav section-nav--pager" aria-label={english ? `${label} · Previous and next` : `${label} · Anterior e próxima`} lang={english ? "en" : "pt-BR"}>
    {previous && <a className="section-pager-previous" href={previous.href} onClick={event => navigate(event, previous)}><span aria-hidden="true">←</span><span>{english ? "Previous" : "Anterior"} · {previous.label}</span></a>}
    {next && <a className="section-pager-next" href={next.href} onClick={event => navigate(event, next)}><span>{english ? "Next" : "Próxima"} · {next.label}</span><span aria-hidden="true">→</span></a>}
  </nav>;

  return <nav ref={root} className="section-nav section-nav--bar" aria-label={label} lang={english ? "en" : "pt-BR"}>
    <div className={`panorama-tabs ${tabsClassName}`}>
      {sections.map(section => <a key={section.href} href={section.href} aria-current={section === current ? "page" : undefined} onClick={event => navigate(event, section)}>{section.label}</a>)}
    </div>
    <div className="section-nav-mobile">
      <div className="section-nav-bar">
        <button type="button" disabled={!previous} aria-label={previous ? `${previousLabel}: ${previous.label}` : previousLabel} onClick={event => previous && navigate(event, previous)}><span aria-hidden="true">‹</span></button>
        <button ref={trigger} type="button" className="section-nav-trigger" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(value => !value)}>
          <span><span className="section-nav-count">{english ? `Section ${index + 1} of ${sections.length}` : `Seção ${index + 1} de ${sections.length}`} · </span>{current.label}</span><span aria-hidden="true">▾</span>
        </button>
        <button type="button" disabled={!next} aria-label={next ? `${nextLabel}: ${next.label}` : nextLabel} onClick={event => next && navigate(event, next)}><span aria-hidden="true">›</span></button>
      </div>
      <ul id={listId} className="section-nav-list" hidden={!open}>
        {sections.map(section => <li key={section.href}><a href={section.href} aria-current={section === current ? "page" : undefined} onClick={event => navigate(event, section, true)}>{section.label}</a></li>)}
      </ul>
    </div>
  </nav>;
}
