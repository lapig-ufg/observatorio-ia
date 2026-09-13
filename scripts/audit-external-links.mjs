import fs from "node:fs";

const input = new URL("../public/catalogo.csv", import.meta.url);
const output = new URL("../tmp/auditoria-links-externos.json", import.meta.url);
const concurrency = Number(process.env.LINK_AUDIT_CONCURRENCY || 24);
const timeoutMs = Number(process.env.LINK_AUDIT_TIMEOUT_MS || 10_000);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
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

function records(text) {
  const rows = parseCsv(text);
  const headers = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function isActive(value) {
  return ["true", "1", "sim", "yes"].includes(String(value).trim().toLowerCase());
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; Observatorio-UFG-IA-Link-Audit/1.0)" },
    });
    await response.body?.cancel();
    return { status: response.status, finalUrl: response.url, method };
  } finally {
    clearTimeout(timeout);
  }
}

async function check(url) {
  const started = Date.now();
  try {
    let result = await request(url, "HEAD");
    if ([400, 405, 501].includes(result.status)) result = await request(url, "GET");
    const category = result.status >= 200 && result.status < 400
      ? "ok"
      : [401, 403, 406, 409, 429].includes(result.status)
        ? "restricted"
        : "failed";
    return { url, ...result, category, elapsedMs: Date.now() - started };
  } catch (error) {
    return {
      url,
      status: 0,
      finalUrl: "",
      method: "HEAD",
      category: error?.name === "AbortError" ? "timeout" : "failed",
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - started,
    };
  }
}

const catalog = records(fs.readFileSync(input, "utf8"));
const active = catalog.filter((record) => isActive(record.ativo));
const references = new Map();
active.forEach((record) => {
  [
    ["url_original", record.url_original],
    ["url_pdf_institucional", record.url_pdf_institucional],
  ].forEach(([field, url]) => {
    if (!url) return;
    const list = references.get(url) || [];
    list.push({ rowId: record.id, title: record.titulo, type: record.tipo, field });
    references.set(url, list);
  });
});

const urls = Array.from(references.keys());
const results = new Array(urls.length);
let cursor = 0;
let completed = 0;
async function worker() {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    results[index] = await check(urls[index]);
    completed += 1;
    if (completed % 100 === 0 || completed === urls.length) {
      console.log(`Verificados ${completed}/${urls.length}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
const enriched = results.map((result) => ({ ...result, references: references.get(result.url) }));
const counts = enriched.reduce((summary, result) => {
  summary[result.category] = (summary[result.category] || 0) + 1;
  return summary;
}, {});
const report = {
  auditedAt: new Date().toISOString(),
  activeRecords: active.length,
  uniqueUrls: urls.length,
  counts,
  results: enriched,
};
fs.mkdirSync(new URL("../tmp", import.meta.url), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ activeRecords: active.length, uniqueUrls: urls.length, counts }));
