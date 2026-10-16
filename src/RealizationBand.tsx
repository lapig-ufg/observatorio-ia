import { assetUrl } from "./catalog";
import { HomeSectionHeading } from "./HomeSectionHeading";

export function RealizationBand() {
  return <aside className="pt-home-section pt-realization" aria-labelledby="home-realization-title">
    <HomeSectionHeading id="home-realization-title" eyebrow="Instituições" title="Realização" />
    <div className="pt-realization-logos">
      <a className="pt-realization-ufg" href="https://ufg.br/" target="_blank" rel="noreferrer" aria-label="UFG — Universidade Federal de Goiás"><img src={assetUrl("brand/ufg.svg")} alt="" width="422" height="225" loading="lazy" /></a>
      <a href="https://iesa.ufg.br/" target="_blank" rel="noreferrer" aria-label="IESA — Instituto de Estudos Socioambientais"><img src={assetUrl("brand/iesa.svg")} alt="" width="220" height="110" loading="lazy" /></a>
      <a href="https://lapig.iesa.ufg.br/" target="_blank" rel="noreferrer" aria-label="LAPIG — Laboratório de Sensoriamento Remoto e Geoprocessamento"><img src={assetUrl("brand/lapig.svg")} alt="" width="260" height="110" loading="lazy" /></a>
    </div>
  </aside>;
}
