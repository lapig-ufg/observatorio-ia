import { cp, readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";

const source = new URL("../experiencias/por-dentro-da-ia/dist/", import.meta.url);
const destination = new URL("../dist/por-dentro-da-ia/", import.meta.url);
await access(new URL("../dist/index.html", import.meta.url));
await cp(source, destination, { recursive: true });
const html = await readFile(new URL("index.html", destination), "utf8");
assert.ok(html.includes('href="/observatorio-ia/#experiencias-interativas"'));
for (const match of html.matchAll(/(?:src|href)="(\/observatorio-ia\/por-dentro-da-ia\/[^"#]+)"/g)) {
  await access(new URL(match[1].slice("/observatorio-ia/por-dentro-da-ia/".length), destination));
}
console.log("Aula integrada: recursos e botão de retorno verificados.");
