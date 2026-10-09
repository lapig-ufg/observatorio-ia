import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/MediumReadingsPage.tsx", "utf8");
const portuguese = fs.readFileSync("src/App.tsx", "utf8");
const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
const locale = fs.readFileSync("src/locale.ts", "utf8");
const cards = fs.readFileSync("src/CatalogExperience.tsx", "utf8");
const styles = fs.readFileSync("src/portal.css", "utf8");

test("Leituras em IA has equivalent Portuguese and English routes in the header and mobile menu", () => {
  assert.match(portuguese, /href="#leituras-em-ia"/);
  assert.match(portuguese, /page === "readings" \? <MediumReadingsPage/);
  assert.match(english, /href="#ai-readings"/);
  assert.match(english, /page === "readings" \? <MediumReadingsPage/);
  assert.match(locale, /#leituras-em-ia/);
  assert.match(locale, /#ai-readings/);
});

test("the dedicated collection is driven only by Medium records and filters date, topic and text", () => {
  assert.match(page, /article\.type === "medium"/);
  assert.match(page, /Title, author or keyword/);
  assert.match(page, /Título, autor ou palavra-chave/);
  assert.match(page, /Publication year/);
  assert.match(page, /Ano de publicação/);
  assert.match(page, /value=\{theme\}/);
  assert.match(page, /value=\{subtheme\}/);
  assert.match(page, /value=\{sort\}/);
  assert.match(page, /racs\?/i);
  assert.match(page, /Agents, RAG and applications/);
});

test("Medium cards point to the original publication and never advertise an institutional PDF", () => {
  assert.match(cards, /article\.type === "medium" \? \(english \? "Read publication" : "Ler publicação"\)/);
  assert.match(cards, /article\.type !== "medium" \? article\.institutionalPdfUrl : ""/);
  assert.match(page, /<CatalogCard article=\{article\}/);
});

test("larger navigation and the readings explorer preserve a one-column mobile layout", () => {
  assert.match(styles, /\.topbar nav a \{ font-size: 1rem;/);
  assert.match(styles, /\.mobile-navigation-panel > a \{ font-size: 1rem;/);
  assert.match(styles, /@media \(min-width: 1201px\) and \(max-width: 1720px\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.readings-card-grid \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\.readings-search input[\s\S]*font-size: 1rem;/);
});
