import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

// A mesma função pura é exercitada pelos testes e usada pelo build editorial.
const source = await fs.readFile(new URL("../src/portalStructure.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { summarizeNews } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

export async function writeNewsSummary(directory, articles) {
  await fs.writeFile(path.join(directory, "resumo.json"), `${JSON.stringify(summarizeNews(articles), null, 2)}\n`);
}

export async function summarizeLocalNews(directory) {
  const files = (await fs.readdir(directory)).filter(file => /^\d{4}\.json$/.test(file));
  const records = await Promise.all(files.map(async file => JSON.parse(await fs.readFile(path.join(directory, file), "utf8"))));
  await writeNewsSummary(directory, records.flat());
}
