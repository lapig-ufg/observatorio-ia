import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const portuguese = fs.readFileSync("src/App.tsx", "utf8");
const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("the catalog loads once instead of polling every minute", () => {
  for (const source of [portuguese, english]) {
    assert.doesNotMatch(source, /setInterval\([\s\S]*60_000/);
    assert.match(source, /void refresh\(\)/);
  }
});

test("both languages expose catalog search in the opening section", () => {
  assert.match(portuguese, /className="hero-search pt-hero-search"/);
  assert.match(portuguese, /id="hero-search-pt"/);
  assert.match(portuguese, /search_from_hero/);
  assert.match(english, /className="hero-search"/);
  assert.match(english, /id="hero-search-en"/);
  assert.match(english, /search_from_hero_en/);
});

test("section changes update the browser title, scroll and keyboard focus", () => {
  for (const source of [portuguese, english]) {
    assert.match(source, /document\.title =/);
    assert.match(source, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
    assert.match(source, /heading\.focus\(\{ preventScroll: true \}\)/);
  }
});

test("the English header preserves its compact navigation mode", () => {
  for (const source of [english]) {
    assert.match(source, /className="primary-navigation"/);
    assert.match(source, /className="mobile-navigation"/);
  }
  assert.match(styles, /@media \(max-width: 1720px\)/);
  assert.match(styles, /@media \(max-width: 960px\)[\s\S]*\.topbar > \.primary-navigation\s*\{\s*display: none;/);
  assert.match(styles, /\.mobile-navigation-panel[\s\S]*width: min\(340px, calc\(100vw - 32px\)\)/);
});

test("English preserves collections and editorial modules on its home page", () => {
  for (const source of [english]) {
    assert.match(source, /className="home-page"/);
    assert.match(source, /<PortalCollections/);
    assert.match(source, /className="search-panel"/);
    assert.match(source, /className="weekly-highlight weekly-highlight--debate"/);
    assert.match(source, /className="interactive-experience"/);
    assert.match(source, /className="obia-callout"/);
    assert.match(source, /<TopicRadar/);
  }

});

test("Portuguese portal uses D1–D9 navigation and DOM order", () => {
  assert.match(portuguese, /<PortalNavigation/);
  assert.match(portuguese, /className="pt-home-page"/);
  assert.match(portuguese, /className="pt-acervo-page"/);
  assert.doesNotMatch(portuguese, /obia-callout|<NavigationMore/);
  assert.match(fs.readFileSync("src/prototype.css", "utf8"), /@media \(max-width: 1023px\)/);
});
