import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const data = JSON.parse(fs.readFileSync("public/gratuitos/gratuitos.json", "utf8"));
const LIMITS = ["horas", "dia", "semana", "mes", "rede", "aberto"];
const bi = v => v && typeof v.pt === "string" && v.pt.trim() && typeof v.en === "string" && v.en.trim();

test("IAs gratuitas: duas partes, seis tipos de limite e cartões completos nos dois idiomas", () => {
  assert.match(data.checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(data.sections.map(s => s.id), ["navegador", "instalada"]);
  assert.deepEqual(data.limitTypes.map(l => l.id), LIMITS);
  for (const l of data.limitTypes) assert.ok(bi(l.label) && bi(l.text), l.id);
  const ids = new Set();
  for (const i of data.items) {
    assert.ok(!ids.has(i.id), `id repetido: ${i.id}`); ids.add(i.id);
    assert.ok(LIMITS.includes(i.limitType), i.id);
    assert.ok(data.sections.some(s => s.id === i.section), i.id);
    assert.match(i.url, /^https:\/\//); assert.match(i.source, /^https:\/\//); assert.match(i.checked, /^\d{4}-\d{2}-\d{2}$/);
    for (const k of ["bestFor", "model", "quota", "account", "privacy", "catch"]) assert.ok(bi(i[k]), `${i.id}.${k}`);
    for (const k of ["files", "creates", "systems"]) if (i[k]) assert.ok(bi(i[k]), `${i.id}.${k}`);
    if (i.section === "instalada") assert.ok(i.systems, `${i.id} sem sistemas`);
  }
  assert.ok(data.items.filter(i => i.section === "navegador").length >= 5);
  assert.ok(data.items.filter(i => i.section === "instalada").length >= 2);
});
