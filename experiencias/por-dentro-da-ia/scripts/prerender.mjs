import { readFile, writeFile, copyFile } from "node:fs/promises";
import { render } from "../.prerender/prerender.js";

// Rendering happens only during the build; GitHub Pages needs no Node server.
const pages = [
  { file: new URL("../dist/index.html", import.meta.url), page: "home" },
  { file: new URL("../dist/transformers/index.html", import.meta.url), page: "transformers" },
  { file: new URL("../dist/redes-neurais/index.html", import.meta.url), page: "redes-neurais" },
];

for (const { file, page } of pages) {
  const template = await readFile(file, "utf8");
  if (!template.includes("<!--app-html-->")) throw new Error(`Missing prerender placeholder in ${file.pathname}`);
  await writeFile(file, template.replace("<!--app-html-->", render(page)));
}

// Keep the independent lesson self-contained, using the same production-only tag.
await copyFile(new URL("../../../public/analytics-bootstrap.js", import.meta.url), new URL("../dist/analytics-bootstrap.js", import.meta.url));
