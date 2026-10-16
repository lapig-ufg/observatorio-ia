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
  .replaceAll("Portal do LAPIG/UFG com acervo curado, Panorama da IA para escolher modelos e IAs gratuitas, IA na imprensa, destaque semanal e aula interativa.", "LAPIG/UFG portal with a curated collection, an AI overview to choose models and free AI tools, AI in the news, weekly highlights and an interactive lesson.");
fs.writeFileSync(destination, html, "utf8");

const built = fs.readFileSync(destination, "utf8");
if (!built.includes('lang="en"') || !built.includes("../assets/")) {
  throw new Error("The English entry point was not generated correctly.");
}
console.log("English entry point generated at dist/en/index.html.");
