export function aggregateNewsMonths(records: readonly { date: string }[]) {
  // A lista já aplica o recorte de dias e os filtros; somar essa mesma seleção
  // impede que meses parciais recuperem os totais integrais do índice.
  const counts = new Map<string, number>();
  for (const { date } of records) {
    const month = date.slice(0, 7);
    counts.set(month, (counts.get(month) || 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right))
    .map(([month, count]) => ({ month, count }));
}
