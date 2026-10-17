import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveDigest, buildDigests } from '../scripts/build-weekly-digests.mjs';

const bilingual = text => ({ pt: text, en: `English: ${text}` });
const source = [{ id: 'text-abc', date: '2026-10-06', title: 'Source', url: 'https://example.org/abc' }];
const draft = () => ({ collection: 'medium', start: '2026-10-04', end: '2026-10-10', reviewedAt: '2026-10-12', expectedCount: 1, title: bilingual('Title'), summary: bilingual('Summary'), method: bilingual('Method'), topics: [{ title: bilingual('Topic'), summary: bilingual('Topic summary'), sourceIds: ['abc'] }] });

test('digest resolution preserves the original editorial draft and resolves source IDs', () => {
  const input = draft();
  const result = resolveDigest(input, source, 'medium');
  assert.deepEqual(result.topics[0].sourceIds, ['text-abc']);
  assert.deepEqual(input.topics[0].sourceIds, ['abc']);
  assert.deepEqual(result.corpus, source);
});

test('an inclusion-based Medium edition retains older original publication dates', () => {
  const input = { ...draft(), dateBasis: 'included' };
  const records = [{ ...source[0], date: '2026-08-26', includedAt: '2026-10-09' },
    { id: 'not-this-week', date: '2026-10-06', includedAt: '2026-09-30', title: 'Old curation', url: 'https://example.org/old' }];
  const result = resolveDigest(input, records, 'medium');
  assert.equal(result.corpus.length, 1);
  assert.equal(result.corpus[0].date, '2026-08-26');
  assert.equal(result.dateBasis, 'included');
  assert.throws(() => resolveDigest({ ...input, dateBasis: 'unknown' }, records, 'medium'), /dateBasis/);
  assert.throws(() => resolveDigest({ ...input, collection: 'folha' }, records, 'folha'), /dateBasis/);
  assert.throws(() => resolveDigest(input, source, 'medium'), /expected 1, found 0/);
});

test('missing Portuguese or English content blocks publication, including method and every topic', () => {
  for (const lang of ['pt', 'en']) for (const field of ['title', 'summary', 'method']) {
    const input = draft(); input[field][lang] = ' ';
    assert.throws(() => resolveDigest(input, source, 'medium'), /missing/);
  }
  for (const lang of ['pt', 'en']) for (const field of ['title', 'summary']) {
    const input = draft(); delete input.topics[0][field][lang];
    assert.throws(() => resolveDigest(input, source, 'medium'), /missing/);
  }
});

test('wrong counts, duplicates, missing references, unsafe URLs and invalid dates are rejected', () => {
  const changes = [
    input => { input.expectedCount = 2; },
    input => { input.topics[0].sourceIds = ['absent']; },
    input => { input.topics[0].sourceIds = ['abc', 'text-abc']; },
    input => { input.end = '2026-02-30'; },
    input => { input.reviewedAt = '2026-10-09'; },
    input => { input.collection = 'folha'; },
  ];
  for (const change of changes) { const input = draft(); change(input); assert.throws(() => resolveDigest(input, source, 'medium')); }
  assert.throws(() => resolveDigest(draft(), [{ ...source[0], url: 'javascript:alert(1)' }], 'medium'), /unsafe/);
  assert.throws(() => resolveDigest({ ...draft(), expectedCount: 2 }, [...source, ...source], 'medium'), /duplicate/);
  assert.throws(() => resolveDigest({ ...draft(), expectedCount: 2 }, [...source, { ...source[0], id: 'other-abc', url: 'https://example.org/other' }], 'medium'), /ambiguous/);
});

test('real weekly generation is repeatable and a broken edition leaves BOTH public files untouched', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'observatorio-digest-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['src', 'data/editorial', 'public/editorial', 'public/folha-ia']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ['src/catalog.ts', 'public/catalogo.csv']) fs.copyFileSync(file, path.join(root, file));
  for (const dir of ['data/editorial', 'public/editorial', 'public/folha-ia']) {
    for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.json'))) fs.copyFileSync(path.join(dir, file), path.join(root, dir, file));
  }
  await buildDigests(root);
  const targets = ['medium', 'folha'].map(collection => path.join(root, `public/editorial/${collection}-weekly.json`));
  const before = targets.map(file => ({ content: fs.readFileSync(file, 'utf8'), time: fs.statSync(file).mtimeMs }));
  await buildDigests(root);
  for (const [i, file] of targets.entries()) {
    assert.equal(fs.readFileSync(file, 'utf8'), before[i].content);
    assert.equal(fs.statSync(file).mtimeMs, before[i].time);
  }
  const drafts = ['medium', 'folha'].map(collection => path.join(root, 'data/editorial', fs.readdirSync(path.join(root, 'data/editorial')).filter(file => file.startsWith(`${collection}-`)).sort().at(-1)));
  const medium = JSON.parse(fs.readFileSync(drafts[0], 'utf8')); medium.summary.pt += ' New editorial review.';
  fs.writeFileSync(drafts[0], JSON.stringify(medium));
  const folha = JSON.parse(fs.readFileSync(drafts[1], 'utf8')); delete folha.summary.en;
  fs.writeFileSync(drafts[1], JSON.stringify(folha));
  await assert.rejects(buildDigests(root), /missing summary.en/);
  for (const [i, file] of targets.entries()) assert.equal(fs.readFileSync(file, 'utf8'), before[i].content);
});

test('English Panorama uses the shared submenu with the same four destinations', async () => {
  const ts = await import('typescript');
  const compiled = ts.default.transpileModule(fs.readFileSync('src/portalStructure.ts', 'utf8'), { compilerOptions: { module: ts.default.ModuleKind.ESNext } }).outputText;
  const { localizedPortalNavigation } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const [pt, en] = [localizedPortalNavigation(), localizedPortalNavigation(true)];
  assert.deepEqual(en[0].links.map(link => link.href), pt[0].links.map(link => link.href));
  assert.equal(en[0].label, 'Panorama');
  assert.match(fs.readFileSync('src/AppEnglish.tsx', 'utf8'), /<PortalNavigation english/);
});

test("Portuguese Panorama opens explicit submenu destinations", () => {
  const nav=fs.readFileSync("src/portalStructure.ts","utf8");
  assert.match(nav, /label: "Panorama"/);
  for (const route of ["#panorama", "#panorama/guia", "#panorama/gratuitos", "#panorama/como-usar"]) assert.ok(nav.includes(route));
  assert.match(fs.readFileSync("src/PortalNavigation.tsx","utf8"), /aria-expanded/);
});
