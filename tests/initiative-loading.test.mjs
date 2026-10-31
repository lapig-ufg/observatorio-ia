import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { prepareInitiativeSnapshot } from '../scripts/prepare-initiative-snapshot.mjs';

const snapshot = JSON.parse(fs.readFileSync('data/iniciativas.json', 'utf8'));
const baseEnv = { DEV: false, BASE_URL: '/observatorio-ia/' };
function catalog(env = {}) {
  const source = ts.transpileModule(fs.readFileSync('src/catalog.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replaceAll('import.meta.env', JSON.stringify({ ...baseEnv, ...env }));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const configured = { VITE_GOOGLE_SHEETS_ID: snapshot.spreadsheetId, VITE_GOOGLE_SHEETS_GID: '1', VITE_GOOGLE_SHEETS_EN_GID: '2', VITE_GOOGLE_SHEETS_INITIATIVES_GID: String(snapshot.sheetId) };
const fallbackInitiatives = (await catalog()).initiativesFromRows(snapshot.values);
const gviz = values => ({ status: 'ok', table: { cols: values[0].map(label => ({ label })), rows: values.slice(1).map(row => ({ c: row.map(v => ({ v })) })) } });
const articleRows = [['id', 'ativo', 'tipo', 'tema', 'titulo', 'resumo', 'url_original'], ['live-article', 'TRUE', 'documento', 'UFG', 'Documento UFG', 'Resumo', 'https://ufg.br/']];
const localCsv = 'id,ativo,tipo,tema,titulo,resumo,url_original\nlocal-article,true,documento,UFG,Documento UFG,Resumo,https://ufg.br/\n';

async function browser(responses, run) {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  const requests = [];
  globalThis.window = { location: new URL('https://lapig-ufg.github.io/observatorio-ia/') };
  globalThis.fetch = async () => new Response(localCsv);
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: { appendChild(script) {
      const url = new URL(script.src), gid = url.searchParams.get('gid');
      const callback = url.searchParams.get('tqx').split(':')[1];
      requests.push({ gid, callback });
      queueMicrotask(() => {
        const response = responses[gid];
        if (response === 'timeout') return;
        if (response === 'error') script.onerror();
        else window[callback](response);
      });
    } },
  };
  try { return await run(requests); }
  finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
}

test('deployment initiatives preserve all source records, identities and inactive states', async () => {
  assert.deepEqual(prepareInitiativeSnapshot(snapshot.values, snapshot), snapshot);
  const { initiativesFromRows } = await catalog();
  assert.deepEqual(fallbackInitiatives, initiativesFromRows(snapshot.values));
  assert(fallbackInitiatives.length > 1);
  const inactive = structuredClone(snapshot.values); inactive[1][1] = 'FALSE';
  assert(!initiativesFromRows(inactive).some(row => row.id === inactive[1][0]));
  for (const invalid of [[['unexpected'], ['value']], [...snapshot.values, snapshot.values[1]]]) {
    assert.throws(() => prepareInitiativeSnapshot(invalid, snapshot));
    assert.throws(() => initiativesFromRows(invalid));
  }
});

test('unconnected deployment keeps the UFG initiatives with both localized article catalogs', async () => {
  const { loadCatalog } = await catalog();
  await browser({}, async () => {
    for (const language of ['pt', 'en']) {
      const result = await loadCatalog(undefined, language, fallbackInitiatives);
      assert.deepEqual(result.initiatives, fallbackInitiatives);
      assert.equal(result.articles[0].id, 'local-article');
    }
  });
});

test('failure of the initiatives query does not hide initiatives or discard live documents', async () => {
  const { loadCatalog } = await catalog(configured);
  await browser({ 1: gviz(articleRows), 2: gviz(articleRows), [snapshot.sheetId]: 'error' }, async () => {
    for (const language of ['pt', 'en']) {
      const result = await loadCatalog(undefined, language, fallbackInitiatives);
      assert.equal(result.source, 'google-sheets');
      assert.equal(result.articles[0].id, 'live-article');
      assert.deepEqual(result.initiatives, fallbackInitiatives);
    }
  });
});

test('article failure preserves a successful, updated initiative response', async () => {
  const { loadCatalog } = await catalog(configured);
  const updated = structuredClone(snapshot.values); updated[1][4] += ' Updated';
  await browser({ 1: 'error', [snapshot.sheetId]: gviz(updated) }, async () => {
    const result = await loadCatalog();
    assert.equal(result.source, 'local');
    assert.equal(result.articles[0].id, 'local-article');
    assert(result.initiatives[0].summary.endsWith(' Updated'));
  });
});

test('a valid empty live list is honored, while a malformed response uses the validated copy', async () => {
  const { loadCatalog } = await catalog(configured);
  for (const [response, expected] of [[gviz([snapshot.values[0]]), []], [gviz([['wrong'], ['x']]), fallbackInitiatives], ['error', fallbackInitiatives]]) {
    await browser({ 1: 'error', [snapshot.sheetId]: response }, async () => {
      assert.deepEqual((await loadCatalog(undefined, 'pt', fallbackInitiatives)).initiatives, expected);
    });
  }
});

test('initiative timeout preserves the complete copy and tolerates a late JSONP callback', async t => {
  const { loadCatalog } = await catalog(configured);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    await browser({ 1: gviz(articleRows), [snapshot.sheetId]: 'timeout' }, async requests => {
      const pending = loadCatalog(undefined, 'pt', fallbackInitiatives);
      await Promise.resolve();
      t.mock.timers.tick(10_001);
      const result = await pending;
      assert.deepEqual(result.initiatives, fallbackInitiatives);
      const late = requests.find(request => request.gid === String(snapshot.sheetId));
      assert.doesNotThrow(() => window[late.callback](gviz(snapshot.values)));
    });
  } finally { t.mock.timers.reset(); }
});

test('cancelled reads do not masquerade as a successful deployment fallback', async () => {
  const { loadCatalog } = await catalog(configured);
  await browser({}, async () => {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(loadCatalog(controller.signal), { name: 'AbortError' });
  });
});
