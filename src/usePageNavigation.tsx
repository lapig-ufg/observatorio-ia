import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import { pageAnchor, routePath } from "./pageNavigation";

export function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const content = document.getElementById("page-content");
  const target = content?.querySelector<HTMLElement>("h1") || content;
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start", behavior: "instant" });
}

export function usePageNavigation(route: string, ready: boolean, english = false, searchRequested?: RefObject<boolean>) {
  const previous = useRef("");
  const returning = useRef(false);
  const historyReturn = useRef(false);
  useEffect(() => {
    const restore = (event: PopStateEvent) => { historyReturn.current = previous.current === "#item" && !!event.state?.catalogOrigin; };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    const path = routePath(route);
    if (path !== previous.current) {
      // O retorno da ficha pertence ao catálogo: ele restaura lista, posição e foco.
      returning.current = previous.current === "#item" && historyReturn.current;
      historyReturn.current = false;
      previous.current = path;
    }
    if (path === "#item" || returning.current || !ready) return;
    const anchorId = pageAnchor(route, english);
    const position = () => {
      const anchor = document.getElementById(anchorId);
      if (!anchor) return;
      anchor.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const frame = requestAnimationFrame(() => {
      if (searchRequested?.current) {
        const search = document.getElementById("catalog-search-pt");
        if (search) { search.focus(); searchRequested.current = false; observer?.disconnect(); return; }
      }
      position();
      const anchor = document.getElementById(anchorId);
      const target = anchor?.querySelector<HTMLElement>("h1, h2") || anchor;
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    });
    // Sínteses e imagens assíncronas acima de uma âncora podem mudar sua posição.
    // Acompanhamos a montagem, mas qualquer interação devolve o controle à pessoa.
    const observer = anchorId !== "page-content" ? new ResizeObserver(position) : null;
    const shell = document.querySelector(".site-shell");
    if (shell) observer?.observe(shell);
    const stop = () => observer?.disconnect();
    const timer = window.setTimeout(stop, 10000);
    for (const event of ["pointerdown", "wheel", "keydown", "touchstart"]) window.addEventListener(event, stop, { once: true, passive: true });
    return () => {
      cancelAnimationFrame(frame); stop(); clearTimeout(timer);
      for (const event of ["pointerdown", "wheel", "keydown", "touchstart"]) window.removeEventListener(event, stop);
    };
  }, [routePath(route), ready, english]);
}
