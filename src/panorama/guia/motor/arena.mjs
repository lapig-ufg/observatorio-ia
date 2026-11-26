const TEXT_ARENA = "https://arena.ai/leaderboard/chat/text";
const DATASET = "lmarena-ai/leaderboard-dataset";
const CATEGORIAS = {
  creative_writing: { pt: "escrita criativa", en: "creative writing", match: /escrit|escrev|redacao|\bwriting\b/ },
  coding: { pt: "programação", en: "coding", match: /programa|codigo|coding/ },
  instruction_following: { pt: "seguir instruções", en: "instruction following", match: /instruc/ },
  multi_turn: { pt: "conversa longa", en: "multi-turn conversation", match: /conversa longa|multi.turn/ },
  overall: { pt: "classificação geral de texto", en: "overall text ranking" },
};

export function categoriaArena(pergunta) {
  const texto = String(pergunta).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/\b(?:l+m[ -]?)?arena(?:[ -]?ai)?\b/.test(texto)) return null;
  if (/\b(?:vs|versus)\b|\btop\s*(?:[2-9]|[1-9]\d+)\b/.test(texto)) return null;
  if (!/\b(?:top\s*1|top|primeir\w*|melhor|lider\w*|best|first|number one|rank\s*1|n[º°.]?\s*1)\b|#1\b/.test(texto)) return null;
  return Object.entries(CATEGORIAS).find(([, c]) => c.match?.test(texto))?.[0]
    ?? (/\b(?:geral|overall|texto|text)\b/.test(texto) || !/\b(?:em|para|de|in|for)\s+(?!a\b|o\b|the\b|lm[ -]?arena\b|arena\b)[a-z]+/.test(texto) ? "overall" : null);
}

/** A Arena publica o ranking padrão no split latest do conjunto text_style_control. */
export async function consultarLiderArena(categoria, { buscar = fetch, idioma = "pt", sinal } = {}) {
  if (!Object.hasOwn(CATEGORIAS, categoria)) return null;
  const en = idioma === "en";
  const nome = CATEGORIAS[categoria][en ? "en" : "pt"];
  const url = categoria === "overall" ? TEXT_ARENA : TEXT_ARENA + "/" + categoria.replaceAll("_", "-");
  const fonte = { id: "lmarena", nome: "Arena · Text Arena", url };
  const resposta = (titulo, texto, data) => ({
    ok: true, titulo, texto: [texto], blocos: [], conferida: true,
    fontes: [{ ...fonte, coletado_em: data }],
  });
  try {
    const params = new URLSearchParams({
      dataset: DATASET, config: "text_style_control", split: "latest",
      where: `"category" = '${categoria}' AND "rank" = 1`, length: "10",
    });
    const prazo = AbortSignal.timeout(7000);
    const signal = sinal ? AbortSignal.any([sinal, prazo]) : prazo;
    const res = await buscar(`https://datasets-server.huggingface.co/filter?${params}`, { signal });
    if (!res.ok) throw new Error("Arena dataset unavailable");
    const { rows, num_rows_total: total } = await res.json();
    const lideres = (Array.isArray(rows) ? rows : []).map((r) => r.row);
    if (!lideres.length || (total != null && total !== lideres.length)
      || lideres.some((r) => r?.rank !== 1 || r.category !== categoria
        || typeof r.model_name !== "string" || !r.model_name.trim()
        || !/^\d{4}-\d{2}-\d{2}$/.test(r.leaderboard_publish_date || "")
        || r.leaderboard_publish_date !== lideres[0].leaderboard_publish_date)) {
      throw new Error("Arena rank unavailable");
    }
    const nomes = lideres.map((r) => r.model_name).join(en ? " and " : " e ");
    return resposta(
      en ? `${nomes} · first in ${nome}` : `${nomes} · 1º lugar em ${nome}`,
      en ? "Result from the latest published Arena dataset, using its style-adjusted scores."
        : "Resultado da edição mais recente publicada pela Arena, com ajuste por estilo.",
      lideres[0].leaderboard_publish_date,
    );
  } catch {
    return resposta(
      en ? `The Arena result for ${nome} is unavailable` : `A classificação da Arena em ${nome} está indisponível`,
      en ? "Open the official leaderboard to see who ranks first."
        : "Abra o ranking oficial para ver quem aparece em primeiro.",
    );
  }
}
