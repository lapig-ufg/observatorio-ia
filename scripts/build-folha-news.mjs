import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDirectory, "..");
const defaultInput = path.join(siteRoot, "data", "folha");
const outputDirectory = process.env.FOLHA_OUTPUT_DIR || path.join(siteRoot, "public", "folha-ia");
const themesFile = path.join(siteRoot, "data", "folha", "temas-editoriais.csv");

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultInput;

const monthNames = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5,
  jul: 6, ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11,
};

const themeRules = [
  ["Modelos, produtos e empresas", /\b(modelo|llm|chatgpt|gemini|claude|openai|anthropic|google|meta|microsoft|nvidia|startup|empresa|big tech|produto)\b/i],
  ["Regulação, direitos e governança", /\b(regula|lei|direito|governan|policy|politica publica|justica|tribunal|copyright|autorais|privacidade)\b/i],
  ["Trabalho, economia e profissões", /\b(trabalho|emprego|demiss|profiss|salario|economia|mercado de trabalho|produtividade)\b/i],
  ["Educação, cultura e comunicação", /\b(educa|escola|universidade|cultura|arte|musica|cinema|jornal|comunicacao|livro)\b/i],
  ["Ciência, saúde e ambiente", /\b(ciencia|pesquisa|saude|medic|hospital|clima|ambient|agric|cerrado|bioma)\b/i],
  ["Segurança, fraudes e plataformas", /\b(seguranca|fraude|golpe|crime|deepfake|desinform|ataque|ciber)\b/i],
  ["Infraestrutura, dados e geopolítica", /\b(chip|semicondutor|data center|dados|infraestrutura|energia|china|eua|estados unidos|geopolit)\b/i],
];

function clean(value) {
  return value.replace(/<br\s*\/?\s*>/gi, " ").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

function markdownCells(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isTableDivider(cells) {
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function headerIndex(headers, expression) {
  return headers.findIndex((header) => expression.test(header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
}

function dateToIso(value) {
  const text = clean(value);
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return checkedIsoDate(iso[1], iso[2], iso[3]);
  const brazilian = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (brazilian) return checkedIsoDate(brazilian[3], brazilian[2], brazilian[1]);
  const abbreviated = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\b(\d{1,2})\.([a-z]+)\.(20\d{2})\b/);
  if (abbreviated && monthNames[abbreviated[2]] !== undefined) return checkedIsoDate(abbreviated[3], monthNames[abbreviated[2]] + 1, abbreviated[1]);
  const written = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\b(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(20\d{2})\b/);
  if (written && monthNames[written[2]] !== undefined) return checkedIsoDate(written[3], monthNames[written[2]] + 1, written[1]);
  return "";
}

function checkedIsoDate(year, month, day) {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

function urlFromCell(value) {
  return value.match(/\]\((https?:\/\/[^)\s]+)\)/)?.[1] || value.match(/https?:\/\/[^\s)]+/)?.[0] || "";
}

function titleAndStars(value) {
  const stars = (value.match(/[★⭐]/g) || []).length;
  return { title: clean(value.replace(/[★⭐]/g, "")), stars };
}

function sectionGroup(section) {
  const normalized = section.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/mercado|painel s\.a|empreendedor|mpme|carreiras/.test(normalized)) return "Mercado e trabalho";
  if (/\btec\b|tecnologia/.test(normalized)) return "Tecnologia";
  if (/poder|politica|brasilia/.test(normalized)) return "Política";
  if (/mundo|internacional/.test(normalized)) return "Mundo";
  if (/ciencia|ambiente/.test(normalized)) return "Ciência e ambiente";
  if (/equilibrio|saude/.test(normalized)) return "Saúde";
  if (/educacao|folhinha|folhateen/.test(normalized)) return "Educação";
  if (/ilustrada|f5|fotofolha|tv folha|podcast|artes|guia folha|comida/.test(normalized)) return "Cultura e comunicação";
  if (/cotidiano/.test(normalized)) return "Cotidiano";
  if (/esporte/.test(normalized)) return "Esporte";
  if (/colunas|opiniao|ombudsman/.test(normalized)) return "Colunas e opinião";
  return "Outras seções";
}

function recordId(article) {
  return createHash("sha1").update(`${article.date}|${article.title.toLowerCase()}|${article.url}`).digest("hex").slice(0, 14);
}

function duplicateKey(article) {
  const normalizedTitle = article.title.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return `${article.date}|${normalizedTitle}`;
}

function canonicalUrlKey(article) {
  try {
    const url = new URL(article.url);
    url.hash = "";
    return `${article.date}|${url.toString()}`;
  } catch {
    return `${article.date}|${article.url}`;
  }
}

function preferredCanonicalRecord(previous, article) {
  if (article.stars !== previous.stars) return article.stars > previous.stars ? article : previous;
  if (article.title.length !== previous.title.length) return article.title.length > previous.title.length ? article : previous;
  return article.title.localeCompare(previous.title, "pt-BR") < 0 ? article : previous;
}

function sourceOrder(filePath) {
  const name = path.basename(filePath);
  const date = name.match(/^folha_ia_(20\d{2}-\d{2}-\d{2})\.md$/)?.[1];
  // O histórico sem data é a base inicial e sempre fica antes dos lotes semanais.
  return `${date || "0000-00-00"}|${name}`;
}

async function readSourceFiles(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) throw new Error("A fonte da Folha deve ser um arquivo Markdown ou uma pasta.");

  const entries = await fs.readdir(target, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && (/^folha_ia_20\d{2}-\d{2}-\d{2}\.md$/i.test(entry.name) || entry.name === "folha_ia_historico.md"))
    .map((entry) => path.join(target, entry.name))
    .sort((left, right) => sourceOrder(left).localeCompare(sourceOrder(right), "pt-BR"));
  if (!files.length) {
    throw new Error("Nenhum arquivo-fonte encontrado. Use folha_ia_YYYY-MM-DD.md na pasta de dados.");
  }
  const weeklyFiles = files.filter((file) => /^folha_ia_20\d{2}-\d{2}-\d{2}\.md$/i.test(path.basename(file)));
  // Cada Markdown semanal é um retrato completo e corrigido da série. Quando
  // houver mais de um, somente o mais recente é fonte de publicação; o
  // histórico legado permanece apenas como alternativa para a primeira carga.
  return weeklyFiles.length ? [weeklyFiles.at(-1)] : files;
}

async function readThemeOverrides() {
  try {
    const csv = await fs.readFile(themesFile, "utf8");
    const separator = csv.split(/\r?\n/, 1)[0]?.includes(";") ? ";" : ",";
    return new Map(csv.split(/\r?\n/).slice(1).map((line) => {
      const divider = line.indexOf(separator);
      return divider < 0 ? [] : [clean(line.slice(0, divider)), clean(line.slice(divider + 1).replace(/^"|"$/g, ""))];
    }).filter(([id, theme]) => id && theme));
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
}

function inferTheme(title, section) {
  const explicitTheme = themeRules.find(([, expression]) => expression.test(title))?.[0];
  if (explicitTheme) return explicitTheme;

  const normalizedSection = section.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/mercado|painel s\.a|empreendedor/.test(normalizedSection)) return "Trabalho, economia e profissões";
  if (/\btec\b|tecnologia/.test(normalizedSection)) return "Modelos, produtos e empresas";
  if (/mundo|internacional/.test(normalizedSection)) return "Infraestrutura, dados e geopolítica";
  if (/poder|politica/.test(normalizedSection)) return "Regulação, direitos e governança";
  if (/educacao|ilustrada|f5|fotofolha|tv folha/.test(normalizedSection)) return "Educação, cultura e comunicação";
  if (/ciencia|equilibrio|saude|ambiente/.test(normalizedSection)) return "Ciência, saúde e ambiente";
  if (/cotidiano|esporte|colunas|opiniao/.test(normalizedSection)) return "Sociedade e vida cotidiana";
  return "Sociedade e vida cotidiana";
}

function parseArticles(markdown, overrides, sourceName) {
  const lines = markdown.split(/\r?\n/);
  const articles = [];
  for (let lineIndex = 0; lineIndex < lines.length - 2; lineIndex += 1) {
    if (!lines[lineIndex].includes("|") || !lines[lineIndex + 1].includes("|")) continue;
    const headers = markdownCells(lines[lineIndex]);
    const divider = markdownCells(lines[lineIndex + 1]);
    if (!isTableDivider(divider)) continue;
    const dateColumn = headerIndex(headers, /^data$/);
    const sectionColumn = headerIndex(headers, /secao|editoria/);
    const titleColumn = headerIndex(headers, /titulo|materia/);
    const linkColumn = headerIndex(headers, /link|url/);
    if (dateColumn < 0 || titleColumn < 0) continue;

    for (let rowIndex = lineIndex + 2; rowIndex < lines.length && lines[rowIndex].includes("|"); rowIndex += 1) {
      const cells = markdownCells(lines[rowIndex]);
      if (cells.length < headers.length || isTableDivider(cells)) continue;
      const date = dateToIso(cells[dateColumn] || "");
      const titleData = titleAndStars(cells[titleColumn] || "");
      const url = urlFromCell(cells[linkColumn] || "") || urlFromCell(cells[titleColumn] || "");
      if (titleData.stars > 5) throw new Error(`Mais de cinco estrelas na linha ${rowIndex + 1}.`);
      if (!date || !titleData.title || !url) continue;
      const article = {
        date,
        section: clean(cells[sectionColumn] || "") || "Não informada",
        title: titleData.title,
        url,
        stars: titleData.stars,
        source: sourceName,
      };
      article.sectionGroup = sectionGroup(article.section);
      article.id = recordId(article);
      article.theme = overrides.get(article.id) || inferTheme(article.title, article.section);
      articles.push(article);
    }
  }
  return articles;
}

function consolidateArticles(batches) {
  const uniqueByTitle = new Map();
  let exactDuplicates = 0;
  let revisedArticles = 0;

  for (const batch of batches) {
    for (const article of batch.articles) {
      const key = duplicateKey(article);
      const previous = uniqueByTitle.get(key);
      if (previous) {
        const isIdentical = previous.section === article.section
          && previous.title === article.title
          && previous.url === article.url
          && previous.stars === article.stars;
        if (isIdentical) exactDuplicates += 1;
        else revisedArticles += 1;
      }
      // Arquivos mais recentes vêm por último: eles substituem uma cópia semanal anterior.
      uniqueByTitle.set(key, article);
    }
  }

  const uniqueByCanonicalUrl = new Map();
  let canonicalUrlDuplicates = 0;
  for (const article of uniqueByTitle.values()) {
    const key = canonicalUrlKey(article);
    const previous = uniqueByCanonicalUrl.get(key);
    if (previous) {
      canonicalUrlDuplicates += 1;
      uniqueByCanonicalUrl.set(key, preferredCanonicalRecord(previous, article));
    } else {
      uniqueByCanonicalUrl.set(key, article);
    }
  }

  return {
    articles: [...uniqueByCanonicalUrl.values()].sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "pt-BR")),
    exactDuplicates,
    revisedArticles,
    canonicalUrlDuplicates,
  };
}

function countBy(items, selector) {
  return [...items.reduce((counts, item) => counts.set(selector(item), (counts.get(selector(item)) || 0) + 1), new Map()).entries()]
    .map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
}

const overrides = await readThemeOverrides();
const sourcePaths = await readSourceFiles(inputPath);
const sourceFiles = await Promise.all(sourcePaths.map(async (sourcePath) => {
  const [markdown, stat] = await Promise.all([fs.readFile(sourcePath, "utf8"), fs.stat(sourcePath)]);
  return {
    name: path.basename(sourcePath),
    updatedAt: stat.mtime.toISOString(),
    articles: parseArticles(markdown, overrides, path.basename(sourcePath)),
  };
}));
const { articles, exactDuplicates, revisedArticles, canonicalUrlDuplicates } = consolidateArticles(sourceFiles);
if (!articles.length) throw new Error("Nenhuma matéria válida foi encontrada nas tabelas do Markdown.");

const duplicateCount = new Set(articles.map(duplicateKey)).size !== articles.length
  || new Set(articles.map(canonicalUrlKey)).size !== articles.length;
if (duplicateCount) throw new Error("A importação ainda contém matérias duplicadas por data e título ou por data e URL canônica.");

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
const years = [...new Set(articles.map((article) => Number(article.date.slice(0, 4))))].sort((a, b) => b - a);
for (const year of years) {
  await fs.writeFile(path.join(outputDirectory, `${year}.json`), `${JSON.stringify(articles.filter((article) => article.date.startsWith(String(year))), null, 2)}\n`);
}
const firstDate = articles.at(-1).date;
const lastDate = articles[0].date;
const daysCovered = Math.floor((Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / 86_400_000) + 1;
const index = {
  generatedAt: new Date().toISOString(),
  source: {
    name: sourceFiles.length === 1 ? sourceFiles[0].name : `${sourceFiles.length} arquivos semanais`,
    updatedAt: sourceFiles.at(-1).updatedAt,
    files: sourceFiles.map(({ name, updatedAt }) => ({ name, updatedAt })),
    exactDuplicates,
    revisedArticles,
    canonicalUrlDuplicates,
  },
  articleCount: articles.length,
  firstDate,
  lastDate,
  daysCovered,
  years,
  themes: countBy(articles, (article) => article.theme),
  sections: countBy(articles, (article) => article.sectionGroup),
  monthly: countBy(articles, (article) => article.date.slice(0, 7)).sort((left, right) => left.label.localeCompare(right.label)).map(({ label: month, count }) => ({ month, count })),
};
await fs.writeFile(path.join(outputDirectory, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Folha IA: ${articles.length} matérias de ${sourceFiles.length} arquivo(s), ${years.length} anos, ${daysCovered} dias. ${exactDuplicates} duplicada(s) idêntica(s) ignorada(s), ${revisedArticles} versão(ões) mais nova(s) aplicada(s), ${canonicalUrlDuplicates} par(es) canônico(s) de data e URL consolidados, ${overrides.size} tema(s) editorial(is) aplicado(s).`);
