import fs from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url);
const source = new URL("index.html", dist);
const englishDirectory = new URL("en/", dist);
const destination = new URL("index.html", englishDirectory);

fs.mkdirSync(englishDirectory, { recursive: true });
const html = fs.readFileSync(source, "utf8")
  .replace(/(<(?:script|link)[^>]+(?:src|href)=")\.\//g, "$1../")
  .replace(/(content=")\.\//g, "$1../")
  .replace('<html lang="pt-BR">', '<html lang="en">')
  .replaceAll("Observatório UFG-IA", "UFG-AI Observatory")
  .replaceAll("Portal do LAPIG/UFG com Panorama da IA, levantamentos originais, acervo curado, IA na imprensa, destaque semanal e aula interativa.", "LAPIG/UFG portal with an AI Panorama, original research, a curated collection, AI in the news, weekly highlights and an interactive lesson.")
  // O card em inglês aponta para a própria entrada /en/ e declara o idioma certo.
  .replace('content="https://lapig-ufg.github.io/observatorio-ia/" />', 'content="https://lapig-ufg.github.io/observatorio-ia/en/" />')
  .replace('<meta property="og:locale" content="pt_BR" />', '<meta property="og:locale" content="en_US" />')
  .replace('<meta property="og:locale:alternate" content="en_US" />', '<meta property="og:locale:alternate" content="pt_BR" />')
  .replaceAll("UFG-AI Observatory: logotipo da coruja e ilustração de documentos, gráficos e linha do tempo sobre inteligência artificial.", "UFG-AI Observatory: owl logo and an illustration of documents, charts and a timeline about artificial intelligence.");
fs.writeFileSync(destination, html, "utf8");

const built = fs.readFileSync(destination, "utf8");
if (!built.includes('lang="en"') || !built.includes("../assets/")) {
  throw new Error("The English entry point was not generated correctly.");
}
console.log("English entry point generated at dist/en/index.html.");
