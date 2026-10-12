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

test('Panorama is a direct bilingual header link, without a Categories link or duplicate in More', () => {
  for (const file of ['src/App.tsx', 'src/AppEnglish.tsx']) {
    const app = fs.readFileSync(file, 'utf8');
    const header = app.slice(app.indexOf('<header className="topbar">'), app.indexOf('</header>'));
    assert.match(header, /className="panorama-nav-link" href="#panorama"/);
    assert.doesNotMatch(header, /href="#(?:categorias|collections)"/);
    assert.equal((header.match(/href="#panorama"/g) || []).length, 2);
  }
  assert.doesNotMatch(fs.readFileSync('src/NavigationMore.tsx', 'utf8'), /href="#panorama"/);
});
