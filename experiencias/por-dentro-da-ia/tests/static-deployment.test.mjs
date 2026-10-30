import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const pages = ["dist/index.html", "dist/transformers/index.html", "dist/redes-neurais/index.html"];

test("all built local assets resolve under the GitHub Pages project path", () => {
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const paths = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)]
      .map((match) => new URL(match[1], "https://lapig-ufg.github.io").pathname)
      .filter((path) => path.startsWith("/observatorio-ia/por-dentro-da-ia/"));
    assert.ok(paths.some((path) => path.endsWith(".js")), file);
    assert.ok(paths.some((path) => path.endsWith(".css")), file);
    for (const path of paths) {
      assert.ok(path.startsWith("/observatorio-ia/por-dentro-da-ia/"), `${file}: ${path}`);
      assert.ok(existsSync(`dist/${path.slice("/observatorio-ia/por-dentro-da-ia/".length)}`), `${file}: ${path}`);
    }
    assert.match(html, /class="lesson-header"/, file);
    assert.match(html, /brand\/observatorio-coruja\.svg/, file);
    assert.doesNotMatch(html, /<!--app-html-->|\/app\/main\.tsx|_next\/|chatgpt-auth/, file);
  }
  assert.ok(existsSync("dist/og.png"));
  assert.match(readFileSync("dist/index.html", "utf8"), /https:\/\/lapig-ufg.github.io\/observatorio-ia\/por-dentro-da-ia\//);
  assert.match(readFileSync("dist/transformers/index.html", "utf8"), /https:\/\/lapig-ufg.github.io\/observatorio-ia\/por-dentro-da-ia\/transformers\//);
  assert.match(readFileSync("dist/redes-neurais/index.html", "utf8"), /https:\/\/lapig-ufg.github.io\/observatorio-ia\/por-dentro-da-ia\/redes-neurais\//);
});
