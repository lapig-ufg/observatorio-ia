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
  assert.equal(m.startsOn, '2026-11-20');
  assert.equal(m.edition, 'IA na educação brasileira');
  assert.deepEqual(m.editionAliases, ['AI in Brazilian education']);
  assert.equal(m.materials.length, 4);
  assert.deepEqual(m.materials.map(x => x.kind), ['document', 'document', 'presentation', 'audio']);
  assert.deepEqual(m.materials.map(x => x.title), ['Resolução CNE/CP nº 1/2026', 'Resolução CNE/CP nº 1/2026', 'Diretrizes de IA na educação brasileira', 'Novas regras da IA nas escolas']);
  assert.deepEqual(m.materials.map(x => x.href), [
    'https://www.in.gov.br/web/dou/-/resolucao-cne/cp-n-1-de-11-de-novembro-de-2026-744136563',
    'https://lapig-ufg.github.io/observatorio-ia/?item=documento-cne-cp-parecer-15-2026#item',
    'https://drive.google.com/file/d/1fnq7F2oIsrEtgSSmKknfFpWA80D3Udpo/view',
    'https://drive.google.com/file/d/1tbsRLBdu299Yv8lXj0ytUO7dIyCwP4Nk/view',
  ]);
  assert.throws(() => featuredManifest(source.replaceAll('kind: "audio"', 'kind: "unknown"')), /Invalid featured/);
  assert.throws(() => featuredManifest(source.replaceAll('href:', 'missingHref:')), /Missing featured/);
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

test('every public course page loads the shared GA bootstrap and sends its own page view', () => {
  const pages = ['index.html', 'aula.html', 'pratica.html', 'pratica-3.html', 'instalar.html',
    'missoes.html', 'missao-1.html', 'missao-2.html', 'missao-3.html', 'missao-4.html', 'missao-5.html',
    'mesa.html', 'domino.html', 'centro-de-massa.html', 'responder.html'];
  for (const page of pages) {
    const html = readFileSync(`public/do-chat-ao-agente/${page}`, 'utf8');
    assert.match(html, /<script src="\.\.\/analytics-bootstrap\.js"><\/script>/, page);
    assert.match(html, /window\.gtag\('event', 'page_view'/, page);
  }
});
