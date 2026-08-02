import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("daily-news builder parses tables, stars, themes and annual output", async () => {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "observatorio-folha-test-"));
  try {
    const result = spawnSync(process.execPath, ["scripts/build-folha-news.mjs", "tests/fixtures/folha-noticias.md"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, FOLHA_OUTPUT_DIR: outputDirectory },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const index = JSON.parse(await fs.readFile(path.join(outputDirectory, "index.json"), "utf8"));
    const articles = JSON.parse(await fs.readFile(path.join(outputDirectory, "2026.json"), "utf8"));
    assert.equal(index.articleCount, 3);
    assert.equal(index.daysCovered, 3);
    assert.deepEqual(index.years, [2026]);
    assert.deepEqual(articles.map((article) => article.stars), [4, 5, 3]);
    assert.ok(articles.every((article) => article.sectionGroup));
    assert.ok(articles.some((article) => article.theme === "Regulação, direitos e governança"));
    assert.ok(articles.every((article) => /^https:\/\//.test(article.url)));
  } finally {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});

test("daily-news builder uses only the most recent complete weekly snapshot", async () => {
  const inputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "observatorio-folha-input-"));
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "observatorio-folha-output-"));
  try {
    await fs.writeFile(path.join(inputDirectory, "folha_ia_2026-07-26.md"), `| Data | Seção | Título | Link |\n| --- | --- | --- | --- |\n| 2026-07-25 | Tecnologia | Empresa lança modelo de IA ★★★ | [Ler](https://folha.test/a) |\n| 2026-07-24 | Ciência | IA ajuda a monitorar o Cerrado ★★ | [Ler](https://folha.test/b) |\n`);
    await fs.writeFile(path.join(inputDirectory, "folha_ia_2026-08-02.md"), `| Data | Seção | Título | Link |\n| --- | --- | --- | --- |\n| 2026-07-25 | Tecnologia | Empresa lança modelo de IA ★★★★ | [Ler](https://folha.test/a-atualizado) |\n| 2026-07-24 | Ciência | IA ajuda a monitorar o Cerrado ★★ | [Ler](https://folha.test/b) |\n| 2026-08-01 | Mercado | Empresas ampliam investimento em IA ★★★★★ | [Ler](https://folha.test/c) |\n`);
    const result = spawnSync(process.execPath, ["scripts/build-folha-news.mjs", inputDirectory], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, FOLHA_OUTPUT_DIR: outputDirectory },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const index = JSON.parse(await fs.readFile(path.join(outputDirectory, "index.json"), "utf8"));
    const articles = JSON.parse(await fs.readFile(path.join(outputDirectory, "2026.json"), "utf8"));
    assert.equal(index.articleCount, 3);
    assert.equal(index.source.files.length, 1);
    assert.equal(index.source.files[0].name, "folha_ia_2026-08-02.md");
    assert.equal(index.source.exactDuplicates, 0);
    assert.equal(index.source.revisedArticles, 0);
    assert.equal(articles.find((article) => article.date === "2026-07-25").stars, 4);
    assert.equal(articles.find((article) => article.date === "2026-07-25").source, "folha_ia_2026-08-02.md");
  } finally {
    await fs.rm(inputDirectory, { recursive: true, force: true });
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});
