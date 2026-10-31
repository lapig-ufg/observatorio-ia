import { useEffect, useRef } from "react";
import { assetUrl } from "./catalog";

export function NavigationMore({ english = false }: { english?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && ref.current?.open) { ref.current.removeAttribute("open"); ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", closeOutside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details className="navigation-more" ref={ref}><summary>{english ? "More" : "Mais"}</summary><div onClick={() => ref.current?.removeAttribute("open")}>
    <a href={assetUrl("por-dentro-da-ia/")}>{english ? "Inside AI · interactive classes (PT)" : "Por dentro da IA · aulas interativas"}</a>
    <a href="https://forms.gle/X2GC9MbrgaPWKHnJ9" target="_blank" rel="noreferrer">{english ? "Participate: how do you use AI? (PT)" : "Participe: como você usa a IA?"}</a>
  </div></details>;
}
