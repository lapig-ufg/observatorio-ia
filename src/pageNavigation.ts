// Fragmentos de rota e de seleção têm responsabilidades diferentes: a seleção
// interna não deve apagar o destaque do menu nem disparar navegação de página.
export function routePath(hash: string) {
  return hash.split("?")[0];
}

export function pageAnchor(hash: string, english = false) {
  const path = routePath(hash);
  const anchors: Record<string, string> = english
    ? { "#catalog": "catalog", "#highlight": "highlight", "#collections": "collections", "#topics": "topics", "#interactive-experiences": "interactive-experiences" }
    : { "#acervo": "acervo", "#acervo/colecoes": "categorias", "#acervo/radar": "palavras-chave", "#em-destaque": "em-destaque", "#experiencias-interativas": "experiencias-interativas" };
  return anchors[path] || "page-content";
}

export function usableInitiativeLogo(width: number, height: number) {
  return width > 16 && height > 16;
}

// Depois de "Carregar mais", leva o foco ao primeiro item novo assim que ele aparecer na página.
export function focusWhenReady(find: () => HTMLElement | null, tries = 20) {
  const attempt = (left: number) => {
    const target = find();
    if (target) { target.focus(); target.scrollIntoView({ block: "center" }); return; }
    if (left > 0) requestAnimationFrame(() => attempt(left - 1));
  };
  requestAnimationFrame(() => attempt(tries));
}
