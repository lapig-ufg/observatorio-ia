import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const portuguese = fs.readFileSync("src/App.tsx", "utf8");
const english = fs.readFileSync("src/AppEnglish.tsx", "utf8");
const home = fs.readFileSync("src/PortalHome.tsx", "utf8");
const navigation = fs.readFileSync("src/PortalNavigation.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("the catalog loads once instead of polling every minute", () => {
  for (const source of [portuguese, english]) {
    assert.doesNotMatch(source, /setInterval\([\s\S]*60_000/);
    assert.match(source, /void refresh\(\)/);
  }
});

test("both languages share the opening search and preserve their analytics", () => {
  for (const source of [portuguese, english]) assert.match(source, /<PortalHome/);
  assert.match(home, /className="hero-search pt-hero-search"/);
  assert.match(home, /id=\{english \? "hero-search-en" : "hero-search-pt"\}/);
  assert.match(portuguese, /search_from_hero/);
  assert.match(english, /search_from_hero_en/);
});

test("section changes update the browser title, scroll and keyboard focus", () => {
  for (const source of [portuguese, english]) {
    assert.match(source, /document\.title =/);
    assert.match(source, /usePageNavigation\(route,/);
  }
  const navigation = fs.readFileSync("src/usePageNavigation.tsx", "utf8");
  assert.match(navigation, /scrollIntoView/);
  assert.match(navigation, /target\.focus\(\{ preventScroll: true \}\)/);
});

test("both headers share responsive submenus and language controls", () => {
  assert.match(english, /<PortalNavigation english/);
  assert.match(portuguese, /<PortalNavigation/);
  for (const feature of ["aria-expanded", "aria-controls", "Ler em português", "Read in English", "Escape"]) assert.ok(navigation.includes(feature));
  assert.match(fs.readFileSync("src/prototype.css", "utf8"), /@media \(max-width: 1023px\)/);
});

test("English uses the shared home, separate collection and compact OBIA footer reference", () => {
  assert.match(english, /page === "home" \? <PortalHome english/);
  assert.match(english, /className="pt-acervo-page"/);
  assert.match(english, /<PortalCollections/);
  assert.match(english, /<TopicRadar/);
  assert.doesNotMatch(english, /obia-callout|<NavigationMore|<InstitutionalBand/);
  assert.match(fs.readFileSync("src/PortalFooter.tsx", "utf8"), /Other references: /);
});

test("Portuguese portal uses D1–D9 navigation and DOM order", () => {
  assert.match(portuguese, /<PortalNavigation/);
  assert.match(home, /className="pt-home-page"/);
  assert.match(portuguese, /className="pt-acervo-page"/);
  assert.doesNotMatch(portuguese, /obia-callout|<NavigationMore/);
  assert.match(fs.readFileSync("src/prototype.css", "utf8"), /@media \(max-width: 1023px\)/);
});
