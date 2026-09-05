import { readFile, writeFile } from "node:fs/promises";
import { render } from "../.prerender/prerender.js";

// Rendering happens only during the build; GitHub Pages needs no Node server.
const file = new URL("../dist/index.html", import.meta.url);
const template = await readFile(file, "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("Missing prerender placeholder");
await writeFile(file, template.replace("<!--app-html-->", render()));
