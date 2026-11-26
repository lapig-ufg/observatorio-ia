/** Os cartões são recalculados no navegador a partir das mesmas coletas usadas pelo chat. */
export function mesmasColetas(fontes, locais) {
  return fontes.every(({ id, coletado_em }) => {
    if (!id || !coletado_em) return true;
    const local = locais[id]?.coletadoEm;
    if (local === coletado_em) return true;
    const momento = Date.parse(coletado_em);
    return Boolean(local && Number.isFinite(momento) && Date.parse(local) === momento);
  });
}
