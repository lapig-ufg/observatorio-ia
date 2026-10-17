import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Menu, Search } from "lucide-react";
import { assetUrl } from "./catalog";
import { trackEvent } from "./analytics";
import { languageUrl } from "./locale";
import { localizedPortalNavigation } from "./portalStructure";
import { routePath } from "./pageNavigation";

export function PortalNavigation({ route, onSearch, english = false }: { route: string; onSearch: () => void; english?: boolean }) {
  const portalNavigation = localizedPortalNavigation(english);
  const [open, setOpen] = useState("");
  const [mobile, setMobile] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setOpen(""); setMobile(false); }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => { setOpen(""); setMobile(false); }, [route]);
  const path = routePath(route);
  const isCurrent = (href: string) => path === href || (href === (english ? "#catalog" : "#acervo") && (path.startsWith("#acervo/") || ["#collections", "#topics", "#item"].includes(path)));
  return <header ref={header} className="topbar pt-topbar" onKeyDown={event => {
    if (event.key === "Escape") {
      if (open) { triggers.current[open]?.focus(); setOpen(""); }
      else if (mobile) { setMobile(false); menuButton.current?.focus(); }
    }
  }}>
    <div className="pt-topbar-content">
    <a className="brand" href="#top" aria-label={english ? "UFG-AI Observatory — home" : "Observatório UFG-IA - início"}>
      <span className="brand-mark"><img src={assetUrl("brand/observatorio-coruja.svg")} width="946" height="826" alt="" /></span>
      <span className="brand-name"><strong>{english ? "Observatory" : "Observatório"}</strong><strong>{english ? "UFG · Artificial Intelligence" : "UFG · Inteligência Artificial"}</strong></span>
    </a>
    <nav id="pt-primary-navigation" className={`pt-navigation${mobile ? " is-open" : ""}`} aria-label={english ? "Main navigation" : "Navegação principal"} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen("");
    }}>
      {portalNavigation.map(section => {
        if (!section.links) return <a key={section.id} href={section.href!} aria-current={isCurrent(section.href!) ? "page" : undefined} onClick={() => { setMobile(false); trackEvent(section.event!, { position: "header" }); }}>{section.label}</a>;
        const active = section.links.some(link => isCurrent(link.href));
        return <div key={section.id} className="pt-nav-group">
          <button ref={element => { triggers.current[section.id] = element; }} type="button" className={active ? "is-active" : ""} aria-expanded={open === section.id} aria-controls={`pt-submenu-${section.id}`} onClick={() => setOpen(open === section.id ? "" : section.id)}>{section.label} <ChevronDown size={14} aria-hidden="true" /></button>
          <div id={`pt-submenu-${section.id}`} className="pt-submenu" hidden={open !== section.id}>
            {section.links.map(link => <a key={link.href} href={link.href.startsWith("#") ? link.href : assetUrl(link.href)} aria-current={isCurrent(link.href) ? "page" : undefined} onClick={() => { setOpen(""); setMobile(false); trackEvent(link.event, { event_category: "navigation", position: "header", event_label: link.href }); }}><strong>{link.label}</strong><span>{link.description}</span></a>)}
          </div>
        </div>;
      })}
      <a className="pt-language-switch pt-language-mobile" href={languageUrl(english ? "pt" : "en")} lang={english ? "pt-BR" : "en"} aria-label={english ? "Ler em português" : "Read in English"}><Globe size={16} aria-hidden="true" />{english ? "Português" : "English"}</a>
    </nav>
    <a className="pt-header-search" href={english ? "#catalog" : "#acervo"} aria-label={english ? "Search the collection" : "Buscar no acervo"} onClick={event => {
      // Na própria busca EN, a âncora nativa não deve retirar o foco do campo.
      if (english && path === "#catalog") event.preventDefault();
      setOpen(""); setMobile(false); onSearch();
    }}><Search size={20} aria-hidden="true" /><span>{english ? "Search the collection" : "Buscar no acervo"}</span></a>
    <a className="pt-language-switch" href={languageUrl(english ? "pt" : "en")} lang={english ? "pt-BR" : "en"} aria-label={english ? "Ler em português" : "Read in English"}><Globe size={16} aria-hidden="true" />{english ? "Português" : "English"}</a>
    <button ref={menuButton} type="button" className="pt-menu-toggle" aria-expanded={mobile} aria-controls="pt-primary-navigation" onClick={() => { setMobile(!mobile); setOpen(""); }}><Menu size={20} aria-hidden="true" />Menu</button>
    </div>
  </header>;
}

export function PortalSitemap({ english = false }: { english?: boolean }) {
  const portalNavigation = localizedPortalNavigation(english);
  return <nav className="pt-sitemap" aria-label={english ? "Sitemap" : "Mapa do site"}>{portalNavigation.map(section => <div key={section.id}>
    <h2>{section.href ? <a href={section.href!} onClick={() => trackEvent(section.event!, { position: "footer" })}>{section.label}</a> : section.label}</h2>
    {section.links && section.links.map(link => <a key={link.href} href={link.href.startsWith("#") ? link.href : assetUrl(link.href)} onClick={() => trackEvent(link.event, { event_category: "navigation", position: "footer", event_label: link.href })}>{link.label}</a>)}
  </div>)}</nav>;
}
