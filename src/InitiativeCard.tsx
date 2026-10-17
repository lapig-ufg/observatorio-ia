import { ArrowUpRight } from "lucide-react";
import type { Initiative } from "./catalog";
import { InitiativeLogo } from "./InitiativeLogo";
import { trackEvent } from "./analytics";

export function InitiativeCard({ initiative, position = "ecosystem", english = false }: { initiative: Initiative; position?: string; english?: boolean }) {
  return (
    <article className={`initiative-card initiative-${initiative.color.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-")}`}>
      <InitiativeLogo url={initiative.url} name={initiative.acronym} />
      <p className="initiative-acronym">{initiative.acronym}</p>
      <h3>{initiative.name}</h3>
      <p>{initiative.summary}</p>
      <ul aria-label={english ? "Areas of activity" : "Frentes de atuação"}>
        {initiative.areas.map((area) => <li key={area}>{area}</li>)}
      </ul>
      <a href={initiative.url} target="_blank" rel="noreferrer" onClick={() => trackEvent("open_initiative", { event_category: "ecosystem", event_label: initiative.acronym, position })}>
        {english ? "Explore initiative (in Portuguese)" : initiative.actionLabel || "Conhecer iniciativa"} <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </article>
  );
}

