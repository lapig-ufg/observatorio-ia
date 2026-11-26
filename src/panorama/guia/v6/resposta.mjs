/** Os cartões são recalculados no navegador a partir das mesmas coletas usadas pelo chat. */
export function mesmasColetas(fontes, locais) {
  return fontes.every(({ id, coletado_em }) => {
    if (!id || !coletado_em) return true;
    const local = locais[id]?.coletadoEm;
    if (local === coletado_em) return true;
    // Versões anteriores do Worker só enviam o dia da coleta.
    if (/^\d{4}-\d{2}-\d{2}$/.test(coletado_em)) return local?.slice(0, 10) === coletado_em;
    const momento = Date.parse(coletado_em);
    return Boolean(local && Number.isFinite(momento) && Date.parse(local) === momento);
  });
}
