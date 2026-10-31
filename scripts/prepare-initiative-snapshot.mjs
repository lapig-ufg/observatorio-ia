const requiredHeaders = ['id', 'ativo', 'sigla', 'nome', 'resumo', 'frentes', 'url', 'fonte', 'cor', 'ordem'];
const active = value => ['true', '1', 'sim', 'yes'].includes(value.toLowerCase());

// Accepts a complete Iniciativas range from the connector or the CI CSV feed.
// This is a deployment copy; the spreadsheet remains the editorial source.
export function prepareInitiativeSnapshot(values, { spreadsheetId, sheetId }) {
  if (!spreadsheetId || !/^\d+$/.test(String(sheetId))) throw new Error('Missing initiative source identity.');
  const rows = values.map(row => row.map(value => String(value ?? '').trim()));
  const headers = (rows[0] || []).map(header => header.replace(/^\uFEFF/, ''));
  if (requiredHeaders.some(header => !headers.includes(header))) throw new Error('Missing initiative columns.');
  const records = rows.slice(1).filter(row => row.some(Boolean));
  const objects = records.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i] || ''])));
  if (objects.some(row => !row.id) || new Set(objects.map(row => row.id)).size !== objects.length) throw new Error('Invalid or duplicate initiative IDs.');
  if (objects.some(row => active(row.ativo) && (!row.nome || !row.resumo || !/^https?:\/\//i.test(row.url) || !Number.isFinite(Number(row.ordem || 999))))) throw new Error('Incomplete active initiatives.');
  return { spreadsheetId, sheetId: Number(sheetId), sheetName: 'Iniciativas', values: [headers, ...records] };
}
