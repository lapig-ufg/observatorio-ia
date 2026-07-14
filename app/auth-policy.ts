const institutionalDomains = ["ufg.br", "discente.ufg.br", "egresso.ufg.br"];

export function isInstitutionalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").at(-1);
  return Boolean(domain && institutionalDomains.includes(domain));
}

export const institutionalDomainLabel = institutionalDomains.map((domain) => `@${domain}`).join(", ");
