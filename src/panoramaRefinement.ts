/* Regras de apresentação isoladas da rede e do relógio do navegador para que
   uma mesma coleta produza os mesmos avisos e estimativas em PT e EN. */
export function verificationAge(checked: string, reference: string): number | null {
  const parse = (value: string) => /^\d{4}-\d{2}-\d{2}/.test(value) ? Date.parse(`${value.slice(0, 10)}T00:00:00Z`) : NaN;
  const days = Math.floor((parse(reference) - parse(checked)) / 86_400_000);
  return Number.isFinite(days) ? Math.max(0, days) : null;
}

export function readingMinutes(text: string): number {
  const words = text.replace(/<[^>]*>/g, " ").replace(/&(?:#\d+|\w+);/g, " ").trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
