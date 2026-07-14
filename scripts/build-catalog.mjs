import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const libraryRoot = path.resolve(siteRoot, "..");
const coversDir = path.join(siteRoot, "public", "covers");
const outputPath = path.join(siteRoot, "app", "catalog.generated.ts");

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
  const source = candidates.at(-1) || "Publicação independente";
  return {
    title,
    author: authorPart ? authorPart.replace(/^by\s+/i, "") : "Autoria não identificada",
    source: source.replaceAll("_", " "),
    publishedAt: datePart || "Data não informada",
  };
}

function extractOriginalUrl(filePath) {
  const result = spawnSync("strings", [filePath], { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const text = result.stdout || "";
  const postId = text.match(/source=post_page---[^)\r\n]*?--([0-9a-f]{12})(?:-|\))/i)?.[1];
  if (postId) return `https://medium.com/p/${postId}`;
  const direct = text.match(/\/URI \((https?:\/\/[^)]+)\)/)?.[1];
  return direct ? direct.replace(/\?.*$/, "") : "";
}

function extractPages(filePath) {
  const result = spawnSync("pdfinfo", [filePath], { encoding: "utf8" });
  return Number(result.stdout?.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
}

function inferType(relativePath) {
  const normalized = relativePath.toLowerCase();
  if (normalized.includes("cientific") || normalized.includes("open_access")) return "cientifico";
  if (normalized.includes("noticia") || normalized.includes("jornal")) return "noticia";
  return "opiniao";
}

function inferTags(articleText, theme) {
  const normalized = articleText.toLowerCase();
  const tags = [];
  for (const [needle, label] of tagRules) {
    if (normalized.includes(needle) && !tags.includes(label)) tags.push(label);
  }
  if (!tags.length) tags.push(theme.split(",")[0]);
  return tags.slice(0, 4);
}

function summaryFor(theme, subtheme) {
  const focus = subtheme ? subtheme.toLowerCase() : theme.toLowerCase();
  return `Leitura sobre ${focus}, selecionada para o acervo de inteligência artificial.`;
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
  if (existing) return `/covers/${path.basename(existing)}`;
  const rendered = spawnSync("pdftoppm", ["-f", "1", "-l", "1", "-jpeg", "-jpegopt", "quality=68", "-scale-to-x", "560", "-scale-to-y", "-1", filePath, prefix], { encoding: "utf8", timeout: 90_000 });
  const created = [`${prefix}-1.jpg`, `${prefix}-01.jpg`].find((candidate) => fs.existsSync(candidate));
  return rendered.status === 0 && created ? `/covers/${path.basename(created)}` : "";
}

await fsp.mkdir(coversDir, { recursive: true });

const topFolders = (await fsp.readdir(libraryRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && themes[entry.name]);

const articles = [];
for (const folder of topFolders) {
  const files = await walk(path.join(libraryRoot, folder.name));
  for (const filePath of files) {
    const relativePath = path.relative(libraryRoot, filePath);
    const pathParts = relativePath.split(path.sep);
    const theme = themes[pathParts[0]];
    const subtheme = pathParts.length > 2 ? titleCaseFolder(pathParts[1]) : "";
    const parsed = parseFilename(filePath);
    const id = makeId(relativePath);
    const type = inferType(relativePath);
    const tags = inferTags(`${parsed.title} ${subtheme}`, theme);
    articles.push({
      id,
      ...parsed,
      type,
      theme,
      subtheme,
      tags,
      summary: summaryFor(theme, subtheme),
      originalUrl: extractOriginalUrl(filePath),
      cover: renderCover(filePath, id),
      pages: extractPages(filePath),
      pdfReady: false,
    });
  }
}

articles.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

const output = `// Generated by scripts/build-catalog.mjs.\n\nexport type ArticleType = "opiniao" | "noticia" | "cientifico";\n\nexport type Article = {\n  id: string;\n  title: string;\n  author: string;\n  source: string;\n  publishedAt: string;\n  type: ArticleType;\n  theme: string;\n  subtheme: string;\n  tags: string[];\n  summary: string;\n  originalUrl: string;\n  cover: string;\n  pages: number;\n  pdfReady: boolean;\n};\n\nexport const articles: Article[] = ${JSON.stringify(articles, null, 2)};\n`;

await fsp.writeFile(outputPath, output, "utf8");
console.log(`Catálogo gerado com ${articles.length} artigos.`);
