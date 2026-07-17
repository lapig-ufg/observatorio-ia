export type ArticleType = "medium" | "documento" | "link-video" | "noticia" | "paper" | "apresentacao";

export type Article = {
  id: string;
  type: ArticleType;
  theme: string;
  subtheme: string;
  title: string;
  author: string;
  source: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  originalUrl: string;
  institutionalPdfUrl: string;
  cover: string;
  pages: number;
  language: string;
  includedAt: string;
};

export type CatalogLoadResult = {
  articles: Article[];
  source: "google-sheets" | "local";
  warning: string;
};

type GvizCell = { v?: unknown; f?: string } | null;

type GvizResponse = {
  status?: string;
  table?: {
    cols?: Array<{ label?: string }>;
    rows?: Array<{ c?: GvizCell[] }>;
  };
};

const requiredHeaders = ["id", "ativo", "tipo", "tema", "titulo", "resumo", "url_original"];

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function isActive(value: string) {
  return ["true", "1", "sim", "yes"].includes(value.trim().toLowerCase());
}

function asType(value: string): ArticleType {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const aliases: Record<string, ArticleType> = {
    medium: "medium",
    opiniao: "medium",
    artigo_medium: "medium",
    artigos_medium: "medium",
    documento: "documento",
    documentos_gerais: "documento",
    link_video: "link-video",
    links_videos: "link-video",
    video: "link-video",
    noticia: "noticia",
    jornais_noticias_diarias: "noticia",
    paper: "paper",
    papers_ia: "paper",
    cientifico: "paper",
    apresentacao: "apresentacao",
    apresentacoes_ia: "apresentacao",
  };

  return aliases[normalized] || "medium";
}

function articlesFromRows(rows: string[][]): Article[] {
  if (rows.length < 2) throw new Error("A planilha não contém artigos.");

  const headers = rows[0].map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Colunas ausentes na planilha: ${missing.join(", ")}.`);

  return rows.slice(1).map((values) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()]));
    return {
      id: record.id,
      type: asType(record.tipo),
      theme: record.tema,
      subtheme: record.subtema,
      title: record.titulo,
      author: record.autor || "Autoria não identificada",
      source: record.fonte || "Fonte não informada",
      publishedAt: record.data_publicacao,
      summary: record.resumo,
      tags: record.palavras_chave ? record.palavras_chave.split("|").map((tag) => tag.trim()).filter(Boolean) : [],
      originalUrl: record.url_original,
      institutionalPdfUrl: record.url_pdf_institucional,
      cover: record.capa,
      pages: Number(record.paginas || 0),
      language: record.idioma || "en",
      includedAt: record.data_inclusao,
      active: isActive(record.ativo),
    };
  }).filter((article) => article.id && article.title && article.active)
    .map(({ active: _active, ...article }) => article)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export function articlesFromCsv(csv: string): Article[] {
  return articlesFromRows(parseCsv(csv));
}

function gvizCellText(cell: GvizCell) {
  if (!cell) return "";
  if (cell.f !== undefined) return String(cell.f);
  if (cell.v !== undefined) return String(cell.v);
  return "";
}

export function articlesFromGviz(response: GvizResponse): Article[] {
  if (response.status !== "ok" || !response.table?.cols || !response.table.rows) {
    throw new Error("A planilha não respondeu no formato esperado.");
  }

  const headers = response.table.cols.map((column) => column.label?.trim() || "");
  const rows = response.table.rows.map((row) => (row.c || []).map(gvizCellText));
  return articlesFromRows([headers, ...rows]);
}

function fetchGvizCatalog(sheetId: string, gid: string, signal?: AbortSignal): Promise<Article[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `observatorioGviz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const target = window as typeof window & Record<string, unknown>;

    const cleanup = () => {
      script.remove();
      delete target[callbackName];
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Consulta cancelada.", "AbortError"));
    };

    target[callbackName] = (response: GvizResponse) => {
      cleanup();
      try {
        resolve(articlesFromGviz(response));
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível consultar a planilha."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=responseHandler:${callbackName}`;
    document.head.appendChild(script);
  });
}

export async function loadCatalog(signal?: AbortSignal): Promise<CatalogLoadResult> {
  const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID?.trim();
  const sheetGid = import.meta.env.VITE_GOOGLE_SHEETS_GID?.trim();
  const localUrl = new URL(`${import.meta.env.BASE_URL}catalogo.csv`, window.location.href).toString();

  if (sheetId && sheetGid) {
    try {
      return {
        articles: await fetchGvizCatalog(sheetId, sheetGid, signal),
        source: "google-sheets",
        warning: "",
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        articles: await fetch(localUrl, { cache: "no-store", signal }).then(async (response) => {
          if (!response.ok) throw new Error(`Falha ao carregar o catálogo (${response.status}).`);
          return articlesFromCsv(await response.text());
        }),
        source: "local",
        warning: "A planilha não respondeu; exibindo a última cópia validada do catálogo.",
      };
    }
  }

  return {
    articles: await fetch(localUrl, { cache: "no-store", signal }).then(async (response) => {
      if (!response.ok) throw new Error(`Falha ao carregar o catálogo (${response.status}).`);
      return articlesFromCsv(await response.text());
    }),
    source: "local",
    warning: "Planilha ainda não conectada; exibindo o catálogo preparado para implantação.",
  };
}

export function assetUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
