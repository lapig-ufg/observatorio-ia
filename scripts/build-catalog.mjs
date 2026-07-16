import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editorialOverrides } from "./editorial-overrides.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const libraryRoot = path.resolve(siteRoot, "..");
const coversDir = path.join(siteRoot, "public", "covers");
const catalogPath = path.join(siteRoot, "public", "catalogo.csv");
const controlPath = path.join(siteRoot, "data", "controle-duplicatas.csv");

const PDFINFO_BIN = process.env.PDFINFO_BIN || "pdfinfo";
const PDFTOPPM_BIN = process.env.PDFTOPPM_BIN || "pdftoppm";
const PDFTOTEXT_BIN = process.env.PDFTOTEXT_BIN || "pdftotext";

const themes = {
  "01_Fundamentos_Matematica_e_Deep_Learning": "Fundamentos, matemática e deep learning",
  "02_Transformers_e_Attention": "Transformers e atenção",
  "03_LLMs_e_GenAI": "LLMs e IA generativa",
  "04_Agentes_RAG_e_Apps_de_IA": "Agentes, RAG e aplicações",
  "05_Vector_Databases_e_Conhecimento": "Bases vetoriais e conhecimento",
  "06_Mercado_Modelos_e_Noticias": "Modelos, mercado e indústria",
  "07_Roadmaps_Pesquisa_e_Produtividade": "Aprendizado, pesquisa e produtividade",
};

const tagRules = [
  ["matem", "Matemática"], ["linear algebra", "Álgebra linear"], ["vector", "Vetores"],
  ["neural", "Redes neurais"], ["deep learning", "Deep learning"], ["gradient", "Gradiente"],
  ["transform", "Transformers"], ["attention", "Atenção"], ["rnn", "RNN"], ["lstm", "LSTM"],
  ["llm", "LLMs"], ["generative", "IA generativa"], ["genai", "IA generativa"],
  ["agent", "Agentes"], ["rag", "RAG"], ["mcp", "MCP"], ["claude", "Claude"],
  ["vector database", "Bases vetoriais"], ["embedding", "Embeddings"], ["knowledge", "Conhecimento"],
  ["anthropic", "Anthropic"], ["chatgpt", "ChatGPT"], ["gemini", "Gemini"],
  ["deepseek", "DeepSeek"], ["notebooklm", "NotebookLM"], ["research", "Pesquisa"],
  ["learning", "Aprendizado"], ["roadmap", "Roadmap"], ["security", "Segurança"],
  ["data leak", "Privacidade"], ["market", "Mercado"], ["industry", "Indústria"],
  ["nvidia", "NVIDIA"], ["code", "Programação"], ["arc-agi", "ARC-AGI"],
];

async function walk(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(fullPath));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) results.push(fullPath);
  }
  return results;
}

function titleCaseFolder(value) {
  return value.replace(/^\d+_/, "").replaceAll("_", " ");
}

function parseFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const parts = base.split(" _ ").map((part) => part.trim()).filter(Boolean);
  const title = (parts[0] || base).replace(/_+$/g, "").replaceAll("_", ": ").replace(/\s+/g, " ").trim();
  const authorPart = parts.find((part) => /^by\s+/i.test(part));
  const datePart = parts.find((part) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+20\d{2}$/i.test(part));
  const candidates = parts.slice(1).filter((part) => part !== authorPart && part !== datePart);
  return {
    title,
    author: authorPart ? authorPart.replace(/^by\s+/i, "") : "Autoria não identificada",
    source: (candidates.at(-1) || "Publicação independente").replaceAll("_", " "),
    publishedAt: datePart || "",
  };
}

function commandOutput(command, args, maxBuffer = 40 * 1024 * 1024) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer });
  return result.status === 0 ? result.stdout || "" : "";
}

function extractOriginalUrl(filePath) {
  const text = commandOutput("strings", [filePath]);
  const postId = text.match(/source=(?:---[^)\r\n]*?--|post_page---[^)\r\n]*?--)([0-9a-f]{12})(?:-|\))/i)?.[1];
  if (postId) return `https://medium.com/p/${postId}`;
  const direct = text.match(/\/URI \((https?:\/\/[^)]+)\)/)?.[1];
  return direct ? direct.replace(/\?.*$/, "") : "";
}

function extractPages(filePath) {
  const text = commandOutput(PDFINFO_BIN, [filePath]);
  return Number(text.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
}

function extractText(filePath) {
  return commandOutput(PDFTOTEXT_BIN, ["-layout", filePath, "-"], 120 * 1024 * 1024);
}

function normalizeText(value) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(open in app|search|write|member only story|medium day)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function simhash64(normalizedText) {
  const words = normalizedText.split(" ").filter(Boolean);
  const vector = Array(64).fill(0);
  for (let index = 0; index <= words.length - 5; index += 1) {
    const shingle = words.slice(index, index + 5).join(" ");
    const digest = createHash("sha256").update(shingle).digest();
    for (let bit = 0; bit < 64; bit += 1) {
      vector[bit] += (digest[Math.floor(bit / 8)] >> (bit % 8)) & 1 ? 1 : -1;
    }
  }
  let value = 0n;
  vector.forEach((weight, bit) => {
    if (weight >= 0) value |= 1n << BigInt(bit);
  });
  return value.toString(16).padStart(16, "0");
}

function inferType(relativePath) {
  const segments = relativePath.toLowerCase().split(path.sep);
  if (segments.includes("artigos_cientificos") || segments.includes("open_access")) return "cientifico";
  if (segments.includes("artigos_de_jornais") || segments.includes("noticias_de_jornais")) return "noticia";
  return "opiniao";
}

function inferTags(articleText, theme) {
  const normalized = articleText.toLowerCase();
  const tags = [];
  for (const [needle, label] of tagRules) {
    if (normalized.includes(needle) && !tags.includes(label)) tags.push(label);
  }
  if (!tags.length) tags.push(theme.split(",")[0]);
  return tags.slice(0, 5);
}

function makeId(relativePath) {
  const stem = path.basename(relativePath, path.extname(relativePath))
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54);
  const suffix = createHash("sha1").update(relativePath).digest("hex").slice(0, 7);
  return `${stem}-${suffix}`;
}

function renderCover(filePath, id) {
  const prefix = path.join(coversDir, id);
  const existing = [`${prefix}-1.jpg`, `${prefix}-01.jpg`].find((candidate) => fs.existsSync(candidate));
  if (existing) return `covers/${path.basename(existing)}`;
  const rendered = spawnSync(PDFTOPPM_BIN, ["-f", "1", "-l", "1", "-jpeg", "-jpegopt", "quality=68", "-scale-to-x", "560", "-scale-to-y", "-1", filePath, prefix], { encoding: "utf8", timeout: 90_000 });
  const created = [`${prefix}-1.jpg`, `${prefix}-01.jpg`].find((candidate) => fs.existsSync(candidate));
  return rendered.status === 0 && created ? `covers/${path.basename(created)}` : "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n") + "\n";
}

await Promise.all([
  fsp.mkdir(coversDir, { recursive: true }),
  fsp.mkdir(path.dirname(controlPath), { recursive: true }),
]);

const topFolders = (await fsp.readdir(libraryRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && themes[entry.name]);

const articles = [];
const controls = [];

for (const folder of topFolders) {
  const files = await walk(path.join(libraryRoot, folder.name));
  for (const filePath of files) {
    const relativePath = path.relative(libraryRoot, filePath);
    const pathParts = relativePath.split(path.sep);
    const theme = themes[pathParts[0]];
    const subtheme = pathParts.length > 2 ? titleCaseFolder(pathParts[1]) : "";
    const parsed = parseFilename(filePath);
    const id = makeId(relativePath);
    const override = editorialOverrides[id] || {};
    const metadata = { ...parsed, ...override };
    if (!metadata.summary) throw new Error(`Resumo editorial ausente para ${id}`);

    const rawText = extractText(filePath);
    const normalizedText = normalizeText(rawText);
    const tags = inferTags(`${metadata.title} ${subtheme} ${normalizedText.slice(0, 5000)}`, theme);
    const stats = await fsp.stat(filePath);

    articles.push({
      id,
      ativo: "TRUE",
      tipo: inferType(relativePath),
      tema: theme,
      subtema: subtheme,
      titulo: metadata.title,
      autor: metadata.author,
      fonte: metadata.source,
      data_publicacao: metadata.publishedAt,
      resumo: metadata.summary,
      palavras_chave: tags.join(" | "),
      url_original: metadata.originalUrl || extractOriginalUrl(filePath),
      url_pdf_institucional: "",
      capa: renderCover(filePath, id),
      paginas: extractPages(filePath),
      idioma: "en",
      data_inclusao: stats.birthtime.toISOString().slice(0, 10),
    });

    controls.push({
      id,
      nome_arquivo: path.basename(filePath),
      caminho_relativo: relativePath,
      sha256_arquivo: sha256(await fsp.readFile(filePath)),
      sha256_texto: sha256(normalizedText),
      simhash_texto: simhash64(normalizedText),
      palavras_texto: normalizedText ? normalizedText.split(" ").length : 0,
      status: "catalogado",
    });
  }
}

articles.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
controls.sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR"));

const catalogHeaders = [
  "id", "ativo", "tipo", "tema", "subtema", "titulo", "autor", "fonte",
  "data_publicacao", "resumo", "palavras_chave", "url_original",
  "url_pdf_institucional", "capa", "paginas", "idioma", "data_inclusao",
];
const controlHeaders = [
  "id", "nome_arquivo", "caminho_relativo", "sha256_arquivo", "sha256_texto",
  "simhash_texto", "palavras_texto", "status",
];

await Promise.all([
  fsp.writeFile(catalogPath, toCsv(catalogHeaders, articles), "utf8"),
  fsp.writeFile(controlPath, toCsv(controlHeaders, controls), "utf8"),
]);

console.log(`Catálogo CSV gerado com ${articles.length} artigos.`);
console.log(`Controle de duplicidade gerado com ${controls.length} assinaturas.`);
