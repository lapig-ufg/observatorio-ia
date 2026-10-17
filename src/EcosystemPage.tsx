import { ArrowUpRight } from "lucide-react";
import type { Initiative } from "./catalog";
import { InitiativeCard } from "./InitiativeCard";
import { trackEvent } from "./analytics";

export function EcosystemPage({ initiatives, english = false }: { initiatives: Initiative[]; english?: boolean }) {
  const visibleInitiatives = initiatives;

  return (
    <section id={english ? "ufg-ecosystem" : "ecossistema-ufg"} className="ecosystem-page" aria-labelledby="ecosystem-title">
      <div className="ecosystem-hero">
        <p className="eyebrow">{english ? "Federal University of Goiás" : "Universidade Federal de Goiás"}</p>
        <h1 id="ecosystem-title">{english ? "UFG ecosystem in artificial intelligence" : "Ecossistema UFG em inteligência artificial"}</h1>
        <p>{english ? "Discover centers, networks and educational programs that connect knowledge, technology and public policy." : "Conheça centros, redes e formações que conectam conhecimento, tecnologia e políticas públicas."}</p>
      </div>
      <aside className="ecosystem-mapping-callout" aria-label={english ? "Mapping AI initiatives at UFG" : "Mapeamento da IA na UFG"}>
        <div>
          <p className="ecosystem-mapping-kicker">{english ? "Is your AI initiative missing?" : "Sua iniciativa de IA não está aqui?"}</p>
          <p>{english ? "Then join our " : "Então responda ao nosso "}<strong>{english ? "mapping of AI initiatives at UFG" : "mapeamento da IA na UFG"}</strong>{english ? ". It is quick and easy!" : ". É bem simples e rápido!"}</p>
        </div>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSe3qfZ5hjL0NifRXvI-SM6NKDN7g8DoFQJyoTTRTvhlptWk-w/viewform" target="_blank" rel="noreferrer" onClick={() => trackEvent("open_mapping_form", { event_category: "outbound", event_label: "mapeamento" })}>{english ? "Join the mapping " : "Participar do mapeamento "}<ArrowUpRight size={17} aria-hidden="true" /></a>
      </aside>
      {visibleInitiatives.length ? (
        <div className="ecosystem-initiative-grid">
          {visibleInitiatives.map((initiative) => <InitiativeCard key={initiative.id} initiative={initiative} english={english} />)}
        </div>
      ) : (
        <div className="ecosystem-empty">{english ? "Initiatives are loading." : "As iniciativas estão sendo carregadas."}</div>
      )}
    </section>
  );
}
