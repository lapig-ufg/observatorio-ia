import { assetUrl } from "./catalog";
import { HomeSectionHeading } from "./HomeSectionHeading";

export function RealizationBand({ english = false }: { english?: boolean }) {
  return <aside className="pt-home-section pt-realization" aria-labelledby="home-realization-title">
    <HomeSectionHeading id="home-realization-title" eyebrow={english ? "University and laboratories" : "Instituições"} title={english ? "Institutions" : "Realização"} />
    <div className="pt-realization-lockup">
      <img src={assetUrl("brand/lapig-iesa-ufg-approved.svg")} alt="" width="1127.49" height="265.53" loading="lazy" />
      <div className="pt-realization-links">
        <a href="https://lapig.iesa.ufg.br/" target="_blank" rel="noreferrer" aria-label={english ? "LAPIG — Remote Sensing and GIS Laboratory" : "LAPIG — Laboratório de Sensoriamento Remoto e Geoprocessamento"} />
        <a href="https://iesa.ufg.br/" target="_blank" rel="noreferrer" aria-label={english ? "IESA — Institute of Socio-Environmental Studies" : "IESA — Instituto de Estudos Socioambientais"} />
        <a href="https://ufg.br/" target="_blank" rel="noreferrer" aria-label={english ? "UFG — Federal University of Goiás" : "UFG — Universidade Federal de Goiás"} />
      </div>
    </div>
  </aside>;
}
