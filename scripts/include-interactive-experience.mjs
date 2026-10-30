import { cp, readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";

const source = new URL("../experiencias/por-dentro-da-ia/dist/", import.meta.url);
const destination = new URL("../dist/por-dentro-da-ia/", import.meta.url);
await access(new URL("../dist/index.html", import.meta.url));
await cp(source, destination, { recursive: true });

const pages = ["index.html", "transformers/index.html", "redes-neurais/index.html"];
for (const page of pages) {
  const html = await readFile(new URL(page, destination), "utf8");
  assert.ok(html.includes('class="lesson-header"'), page);
  assert.ok(html.includes('href="/observatorio-ia/"'), page);
  assert.ok(html.includes("brand/observatorio-coruja.svg"), page);
  for (const match of html.matchAll(/(?:src|href)="(\/observatorio-ia\/por-dentro-da-ia\/[^"#]+)"/g)) {
    await access(new URL(match[1].split("?")[0].slice("/observatorio-ia/por-dentro-da-ia/".length), destination));
  }
}
console.log("Aulas integradas: cabeçalho, recursos e logo do Observatório verificados.");
