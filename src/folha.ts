export type FolhaArticle = {
  id: string;
  date: string;
  section: string;
  sectionGroup: string;
  title: string;
  url: string;
  stars: number;
  theme: string;
};

export type FolhaIndex = {
  generatedAt: string;
  source: { name: string; updatedAt: string };
  articleCount: number;
  firstDate: string;
  lastDate: string;
  daysCovered: number;
  years: number[];
  themes: Array<{ label: string; count: number }>;
  sections: Array<{ label: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
};

function publicUrl(path: string) {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).toString();
}

export async function loadFolhaIndex(signal?: AbortSignal): Promise<FolhaIndex> {
  const response = await fetch(publicUrl("folha-ia/index.json"), { signal, cache: "no-cache" });
  if (!response.ok) throw new Error("A base de notícias ainda não está disponível.");
  return response.json() as Promise<FolhaIndex>;
}

export async function loadFolhaYear(year: number, signal?: AbortSignal): Promise<FolhaArticle[]> {
  const response = await fetch(publicUrl(`folha-ia/${year}.json`), { signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`Não foi possível carregar as notícias de ${year}.`);
  return response.json() as Promise<FolhaArticle[]>;
}
