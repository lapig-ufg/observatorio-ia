import { Building2 } from "lucide-react";
import { useState } from "react";
import { usableInitiativeLogo } from "./pageNavigation";

export function InitiativeLogo({ url, name, useFavicon = true, english = false }: { url: string; name: string; useFavicon?: boolean; english?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="initiative-mark">
    {useFavicon && !failed && <img src={`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`} alt={`${english ? "Logo of" : "Marca de"} ${name}`} loading="lazy" style={{ visibility: loaded ? "visible" : "hidden", gridArea: "1 / 1" }} onLoad={event => {
      // O favicon genérico de 16px não identifica a iniciativa; preservamos um ícone legível.
      if (usableInitiativeLogo(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)) setLoaded(true);
      else setFailed(true);
    }} onError={() => setFailed(true)} />}
    {!loaded && <Building2 className="initiative-mark-fallback" style={{ display: "block", gridArea: "1 / 1" }} size={25} aria-hidden="true" />}
  </div>;
}
