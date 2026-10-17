export type SectionLink = { href: string; label: string; key: string };

// A consulta pertence à seção: filtros no hash não devem alterar seus vizinhos.
export function sectionNavigation<T extends { href: string }>(sections: readonly T[], route: string) {
  const path = route.split("?")[0];
  const match = sections.findIndex(section => section.href === path);
  const index = sections.length ? Math.max(0, match) : -1;
  return {
    index,
    current: sections[index] ?? null,
    previous: index > 0 ? sections[index - 1] : null,
    next: index >= 0 ? sections[index + 1] ?? null : null,
  };
}
