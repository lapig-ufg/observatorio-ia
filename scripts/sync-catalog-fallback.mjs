import fs from "node:fs";

const sheetId = process.env.VITE_GOOGLE_SHEETS_ID?.trim();
const gid = process.env.VITE_GOOGLE_SHEETS_GID?.trim();
const englishGid = process.env.VITE_GOOGLE_SHEETS_EN_GID?.trim();
const requiredHeaders = ["id", "ativo", "tipo", "tema", "subtema", "titulo", "resumo", "palavras_chave", "url_original", "url_pdf_institucional", "data_inclusao"];
const allowedTypes = new Set(["medium", "documento", "link-video", "audio", "noticia", "paper", "apresentacao", "entrevista"]);

if (!sheetId || !gid || !englishGid) {
  throw new Error("VITE_GOOGLE_SHEETS_ID, VITE_GOOGLE_SHEETS_GID and VITE_GOOGLE_SHEETS_EN_GID are required.");
}

function parseCsv(input) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index], next = input[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function isActive(value) {
  return ["true", "1", "sim", "yes"].includes(String(value).trim().toLowerCase());
}

async function downloadCatalog(sheetGid) {
  const query = encodeURIComponent("select * where A is not null");
  const source = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?gid=${encodeURIComponent(sheetGid)}&tqx=out:csv&tq=${query}`;
  const response = await fetch(source, { redirect: "follow" });
  if (!response.ok) throw new Error(`Catalog download failed (${response.status}).`);
  return (await response.text()).replace(/\r\n/g, "\n");
}

function validate(csv, language) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error(`${language}: spreadsheet returned no records.`);
  const headers = rows[0].map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim());
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) throw new Error(`${language}: missing columns: ${missingHeaders.join(", ")}.`);
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()]))).filter((record) => record.id);
  const active = records.filter((record) => isActive(record.ativo));
  const duplicateIds = records.length - new Set(records.map((record) => record.id)).size;
  const invalidTypes = active.filter((record) => !allowedTypes.has(record.tipo));
  const inaccessible = active.filter((record) => !record.url_original && !record.url_pdf_institucional);
  const incomplete = active.filter((record) => !record.id || !record.titulo || !record.tema || !record.subtema || !record.resumo || !record.palavras_chave);
  const invalidInclusionDates = active.filter((record) => !/^\d{4}-\d{2}-\d{2}$/.test(record.data_inclusao));
  const pending = active.filter((record) => [record.tema, record.subtema, record.titulo, record.resumo, record.palavras_chave].some((value) => /carregando|loading data|#(?:error|value|n\/a|ref)/i.test(value)));
  if (records.length < 1_000 || active.length < 900) throw new Error(`${language}: incomplete catalog: ${records.length} records, ${active.length} active.`);
  if (duplicateIds) throw new Error(`${language}: ${duplicateIds} duplicate IDs.`);
  if (invalidTypes.length) throw new Error(`${language}: ${invalidTypes.length} invalid types.`);
  if (inaccessible.length) throw new Error(`${language}: ${inaccessible.length} active items have no access destination.`);
  if (incomplete.length) throw new Error(`${language}: ${incomplete.length} active items have incomplete essential metadata.`);
  if (invalidInclusionDates.length) throw new Error(`${language}: ${invalidInclusionDates.length} active items have an invalid inclusion date.`);
  if (pending.length) throw new Error(`${language}: ${pending.length} rows are still being translated.`);
  return { records, active };
}

async function downloadEnglishWhenReady() {
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const csv = await downloadCatalog(englishGid);
      return { csv, validation: validate(csv, "English") };
    } catch (error) {
      lastError = error;
      if (attempt === 10 || !/still being translated/i.test(String(error))) break;
      console.log(`English catalog is still being translated; retry ${attempt}/10 in 15 seconds.`);
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw lastError;
}

const portugueseCsv = await downloadCatalog(gid);
const portuguese = validate(portugueseCsv, "Portuguese");
const { csv: englishCsv, validation: english } = await downloadEnglishWhenReady();
const portugueseIds = new Set(portuguese.records.map((record) => record.id));
const englishIds = new Set(english.records.map((record) => record.id));
const missingEnglishIds = portuguese.records.filter((record) => !englishIds.has(record.id));
const extraEnglishIds = english.records.filter((record) => !portugueseIds.has(record.id));
if (missingEnglishIds.length || extraEnglishIds.length) {
  throw new Error(`Catalog parity failed: ${missingEnglishIds.length} missing and ${extraEnglishIds.length} extra English IDs.`);
}

fs.writeFileSync(new URL("../public/catalogo.csv", import.meta.url), portugueseCsv.endsWith("\n") ? portugueseCsv : `${portugueseCsv}\n`, "utf8");
fs.writeFileSync(new URL("../public/catalogo-en.csv", import.meta.url), englishCsv.endsWith("\n") ? englishCsv : `${englishCsv}\n`, "utf8");
console.log(`Catalogs synchronized: ${portuguese.records.length} Portuguese records and ${english.records.length} English records; ${english.active.length} active.`);
