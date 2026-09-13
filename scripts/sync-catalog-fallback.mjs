import fs from "node:fs";

const sheetId = process.env.VITE_GOOGLE_SHEETS_ID?.trim();
const gid = process.env.VITE_GOOGLE_SHEETS_GID?.trim();
const output = new URL("../public/catalogo.csv", import.meta.url);
const requiredHeaders = ["id", "ativo", "tipo", "tema", "subtema", "titulo", "resumo", "palavras_chave", "url_original", "url_pdf_institucional", "data_inclusao"];
const allowedTypes = new Set(["medium", "documento", "link-video", "noticia", "paper", "apresentacao", "entrevista"]);

if (!sheetId || !gid) {
  throw new Error("VITE_GOOGLE_SHEETS_ID e VITE_GOOGLE_SHEETS_GID são obrigatórios para sincronizar o catálogo.");
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function isActive(value) {
  return ["true", "1", "sim", "yes"].includes(String(value).trim().toLowerCase());
}

const source = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=out:csv`;
const response = await fetch(source, { redirect: "follow" });
if (!response.ok) throw new Error(`Falha ao baixar catálogo (${response.status}).`);

const csv = (await response.text()).replace(/\r\n/g, "\n");
const rows = parseCsv(csv);
if (rows.length < 2) throw new Error("A planilha não retornou registros.");

const headers = rows[0].map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim());
const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
if (missingHeaders.length) throw new Error(`Colunas ausentes: ${missingHeaders.join(", ")}.`);

const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()])));
const active = records.filter((record) => isActive(record.ativo));
const duplicateIds = records.length - new Set(records.map((record) => record.id)).size;
const invalidTypes = active.filter((record) => !allowedTypes.has(record.tipo));
const inaccessible = active.filter((record) => !record.url_original && !record.url_pdf_institucional);
const incomplete = active.filter((record) => !record.id || !record.titulo || !record.tema || !record.subtema || !record.resumo || !record.palavras_chave);
const invalidInclusionDates = active.filter((record) => !/^\d{4}-\d{2}-\d{2}$/.test(record.data_inclusao));

if (records.length < 1_000 || active.length < 900) throw new Error(`Catálogo incompleto: ${records.length} registros, ${active.length} ativos.`);
if (duplicateIds) throw new Error(`Há ${duplicateIds} IDs duplicados.`);
if (invalidTypes.length) throw new Error(`Há ${invalidTypes.length} tipos inválidos.`);
if (inaccessible.length) throw new Error(`Há ${inaccessible.length} itens ativos sem destino de acesso.`);
if (incomplete.length) throw new Error(`Há ${incomplete.length} itens ativos com metadados essenciais ausentes.`);
if (invalidInclusionDates.length) throw new Error(`Há ${invalidInclusionDates.length} itens ativos sem data de inclusão reconhecida pelo feed.`);

fs.writeFileSync(output, csv.endsWith("\n") ? csv : `${csv}\n`, "utf8");
console.log(`Catálogo de contingência sincronizado: ${records.length} registros, ${active.length} ativos.`);
