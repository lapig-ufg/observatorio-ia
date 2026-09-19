// The source archive keeps Folha's exact Portuguese section names. The English
// interface displays its curated section groups so new source labels never
// appear untranslated or acquire an unverified literal translation.
export const englishSectionGroups: Record<string, string> = {
  "Mercado e trabalho": "Business and work",
  Tecnologia: "Technology",
  "Colunas e opinião": "Columns and opinion",
  "Cultura e comunicação": "Culture and communication",
  Política: "Politics",
  Mundo: "World",
  "Ciência e ambiente": "Science and environment",
  Saúde: "Health",
  Cotidiano: "Daily life",
  Educação: "Education",
  "Outras seções": "Other sections",
  Esporte: "Sports",
};

const englishSourceSections: Record<string, string> = {
  Mercado: "Business",
  Tec: "Technology",
  Ilustrada: "Culture",
  Poder: "Politics",
  Mundo: "World",
  Cotidiano: "Daily life",
  Ciência: "Science",
  Educação: "Education",
  Opinião: "Opinion",
  "Equilíbrio e Saúde": "Health and well-being",
  Equilíbrio: "Well-being",
  Ambiente: "Environment",
  Esporte: "Sports",
  "C-Level — IA": "C-Level — AI",
  "C-Level — Finanças": "C-Level — Finance",
  "C-Level — Negócios": "C-Level — Business",
  "AO VIVO — Mercado": "Live — Business",
  "Ao Vivo — Mercado": "Live — Business",
  "AO VIVO — Poder": "Live — Politics",
  "Ao Vivo": "Live",
  "Colunas — Novo em Folha": "Columns — New in Folha",
  "Colunas — Políticas e Justiça": "Columns — Politics and Justice",
  "Colunas — Brasília Hoje": "Columns — Brasília Today",
  "Colunas — Papo de Responsa": "Columns — Straight Talk",
  "Colunas — Ciência Fundamental": "Columns — Fundamental Science",
  "Colunas — De Grão em Grão": "Columns — Grain by Grain",
  "Colunas — Que Imposto é Esse": "Columns — What's This Tax?",
  "TV Folha": "Folha TV",
  Fotofolha: "Folha Photos",
  "F5 — Celebridades": "F5 — Celebrities",
  "F5 — Você Viu?": "F5 — Did You See?",
};

export function englishSectionGroup(group: string) {
  return englishSectionGroups[group] || "Other sections";
}

export function englishSourceSection(section: string, group: string) {
  return englishSourceSections[section] || englishSectionGroup(group);
}
