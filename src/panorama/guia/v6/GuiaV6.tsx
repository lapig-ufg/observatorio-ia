import { useEffect, useRef } from "react";
import { trackEvent } from "../../../analytics";
import { assetUrl as portalAssetUrl } from "../../../catalog";
import { PANORAMA_SITE, canonicalCompany, companyColor } from "../../../panoramaData";
import { loadPanoramaConfig } from "../../../panoramaSource";
import { montar } from "./pagina.mjs";
import "./pagina.css";

const panoramaBase = () => import.meta.env?.DEV && import.meta.env?.VITE_PANORAMA_DEV === "1"
  ? new URL("/panorama-dev/", window.location.origin).toString()
  : PANORAMA_SITE;
const assetUrl = (path: string) => new URL(`assets/${path}`, panoramaBase()).toString();

async function fetchJson(path: string, signal?: AbortSignal) {
  const response = await fetch(assetUrl(path), { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

export function GuiaV6() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();

    const desmontar = montar(el, {
      endereco: (import.meta.env.VITE_CORUJA_GUIA_URL as string | undefined) ?? "",
      corujaUrl: portalAssetUrl("brand/observatorio-coruja.svg"),
      carregarDados: async () => {
        const [modelos, fontes, planos, settings] = await Promise.all([
          fetchJson("guia-modelos.json", controller.signal),
          fetchJson("guia-fontes.json", controller.signal).catch(() => null),
          fetchJson("guia-planos.json", controller.signal).catch(() => null),
          loadPanoramaConfig(controller.signal),
        ]);
        const empresas: Record<string, { cor: string; logo_svg_path: string | null }> = {};
        const families = (modelos as { families?: Array<{ creator?: string }> } | null)?.families;
        if (Array.isArray(families)) {
          for (const f of families) {
            const name = String(f.creator || "");
            if (!name || empresas[name]) continue;
            const canonical = canonicalCompany(name, settings.config);
            const logoPath = settings.config.logoPaths[settings.config.logoMap[canonical]]
              || settings.config.logoPaths[settings.config.logoMap[name]]
              || null;
            empresas[name] = { cor: companyColor(name, settings.config), logo_svg_path: logoPath };
          }
        }
        return { modelos, fontes, planos, empresas };
      },
      aoEvento: (nome, valor) => {
        trackEvent(`panorama_guide_${nome}`, { event_category: "guide", event_label: valor });
      },
    });

    return () => {
      controller.abort();
      desmontar();
    };
  }, []);

  return <div ref={ref} className="obs6 panorama-guide" lang="pt-BR" />;
}
