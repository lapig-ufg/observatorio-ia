import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { featuredManifest } from '../scripts/analytics-manifest.mjs';
const source = readFileSync('src/FeaturedDebate.tsx', 'utf8');
const bootstrap = readFileSync('public/analytics-bootstrap.js', 'utf8');

test('published manifest includes every current material with its actual kind and destination', () => {
  const m = featuredManifest(source);
  assert.equal(m.schemaVersion, 1);
  assert.match(m.startsOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(m.materials.length, 4);
  assert.deepEqual(m.materials.map(x => x.kind), ['document', 'document', 'audio', 'presentation']);
  assert.match(m.materials[0].href, /185ViyhuZnuPq3rQPnsGMAGsxhpJH0-Ws/);
  assert.match(m.materials[2].title, /crítica/);
  assert.throws(() => featuredManifest(source.replaceAll('"kind": "audio"', '"kind": "unknown"')), /Invalid featured/);
  assert.throws(() => featuredManifest(source.replaceAll('"href": "https://drive.google.com/file/d/1iHJIoj-6ywqf7uh8DGKd8M29nFEg2GFK/view"', '"href": sources.missing')), /Missing featured/);
});

test('no GA script or events are created by development hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'preview.example.org']) {
    const window = { location: {hostname} };
    vm.runInNewContext(bootstrap, {window});
    assert.equal(window.gtag, undefined);
    assert.equal(window.dataLayer, undefined);
  }
});

test('production queues configuration without an automatic page view and loads one tag', () => {
  const scripts=[];
  const window={location:{hostname:'lapig-ufg.github.io',href:'https://lapig-ufg.github.io/observatorio-ia/'}};
  const document={title:'Observatório',createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
  vm.runInNewContext(bootstrap,{window,document});
  assert.equal(scripts.length,1);
  assert.match(scripts[0].src,/G-2R8KZB3YJ7/);
  assert.equal(window.dataLayer.length,2);
  assert.equal(window.dataLayer[1][0],'config');
  assert.equal(window.dataLayer[1][2].send_page_view,false);
});
