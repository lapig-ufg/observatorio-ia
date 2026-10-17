import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
async function moduleFrom(name) {
  const text = ts.transpileModule(fs.readFileSync(`src/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
}
const { readingTopic, readingSubtopic } = await moduleFrom('readingTopics');
const { radarDateWindow, addedInWindow } = await moduleFrom('radarPeriod');
const { buildKeywordCloud } = await moduleFrom('keywordCloud');
const { matchesSearch, readArchiveFilters, parseNewsPeriod } = await moduleFrom('archiveSearch');
const { readCatalogLocation } = await moduleFrom('catalogExperienceState');
const { articlesFromCsv } = await moduleFrom('catalog');

test('seven calendar days use São Paulo inclusion dates, not a top-N or publication-date proxy', () => {
  const dates = radarDateWindow(new Date('2026-10-13T01:00:00Z'));
  assert.deepEqual(dates, { start: '2026-10-06', end: '2026-10-12' });
  const articles = [
    { id:'old', includedAt:'2026-10-05', tags:['RAG'] },
    { id:'boundary', includedAt:'2026-10-06', tags:['Agentes'] },
    { id:'today', includedAt:'2026-10-12', tags:['Agentes'] },
    { id:'future', includedAt:'2026-10-13', tags:['RAG'] },
    { id:'unknown', includedAt:'', tags:['RAG'] },
  ];
  const recent = articles.filter(article => addedInWindow(article, dates));
  assert.deepEqual(recent.map(item => item.id), ['boundary','today']);
  const allCloud = buildKeywordCloud(articles, new Set(), Number.MAX_SAFE_INTEGER, 1);
  const recentCloud = buildKeywordCloud(recent, new Set(), Number.MAX_SAFE_INTEGER, 1);
  assert.equal(allCloud[0].key, 'rag');
  assert.equal(recentCloud[0].key, 'agentes');
  assert.equal(recentCloud[0].count, 2);
  assert.equal(recentCloud.some(item => item.key === 'rag'), false);
  assert.equal(readCatalogLocation('?added=7d&keyword=Agentes', 'todos').added, '7d');
});

test('equivalent historical labels resolve to bilingual topic IDs without merging distinct subjects', () => {
  assert.equal(readingTopic('LLMs e IA generativa').id, readingTopic('Language models and generative AI').id);
  assert.equal(readingTopic('Agents, RACs and applications', true).label, 'Agents, RAG and applications');
  assert.equal(readingTopic('Transformers e atenção').id, readingTopic('Transformers and attention mechanisms').id);
  assert.notEqual(readingTopic('Cultura, sociedade e comportamento').id, readingTopic('Estratégia, mercado e impactos').id);
  assert.equal(readingSubtopic('Technology, politics, and imaginations of the future.').id, readingSubtopic('Tecnologia, política e imaginários do futuro').id);
  assert.deepEqual(readingTopic('Unknown subject'), { id:'Unknown subject', label:'Unknown subject' });
});

test('archive search supports accent-insensitive words in any order and exact quoted phrases', () => {
  assert.equal(matchesSearch('Educação e o uso de agentes de IA', 'ia educacao'), true);
  assert.equal(matchesSearch('Educação e o uso de agentes de IA', '"agentes de IA" educação'), true);
  assert.equal(matchesSearch('Educação e o uso de agentes de IA', '"IA educação"'), false);
  assert.equal(matchesSearch('Ensino', 'saúde'), false);
  assert.deepEqual(readArchiveFilters('?news_q=agentes&readings_q=ensino', 'news', {q:'',period:'30d'}), {q:'agentes',period:'30d'});
  assert.equal(parseNewsPeriod('all'),'all');
  assert.equal(parseNewsPeriod('2026'),2026);
  assert.equal(parseNewsPeriod('invalid'),'30d');
});

test('Medium topic and subtopic filters retain their identity across Portuguese and English catalogs', () => {
  const portuguese = articlesFromCsv(fs.readFileSync('public/catalogo.csv', 'utf8')).filter(item => item.type === 'medium');
  const english = new Map(articlesFromCsv(fs.readFileSync('public/catalogo-en.csv', 'utf8')).map(item => [item.id, item]));
  for (const article of portuguese) {
    const translated = english.get(article.id);
    assert.ok(translated, article.id);
    assert.equal(readingTopic(article.theme).id, readingTopic(translated.theme).id, article.id);
    assert.equal(readingSubtopic(article.subtheme).id, readingSubtopic(translated.subtheme).id, article.id);
  }
});

test('weekly briefs preserve verified references, bilingual summaries and explicit editorial scope', () => {
  const catalog = articlesFromCsv(fs.readFileSync('public/catalogo.csv','utf8'));
  const news = fs.readdirSync('public/folha-ia').filter(file => /^\d{4}\.json$/.test(file)).flatMap(file => JSON.parse(fs.readFileSync(`public/folha-ia/${file}`,'utf8')));
  for(const collection of ['medium','folha']) {
    const digest = JSON.parse(fs.readFileSync(`public/editorial/${collection}-weekly.json`,'utf8'));
    assert.ok(digest.start <= digest.end && digest.reviewedAt >= digest.end);
    const corpusIds = new Set(digest.corpus.map(item=>item.id));
    assert.equal(corpusIds.size,digest.corpus.length);
    const source = new Map((collection==='medium'?catalog:news).map(item=>[item.id,item]));
    for(const ref of digest.corpus) {
      const original=source.get(ref.id); assert.ok(original, ref.id);
      assert.equal(ref.url, original.originalUrl || original.url);
      assert.equal(ref.title,original.title);
      assert.equal(ref.date, original.publishedAt || original.date);
      const scopeDate = digest.dateBasis === 'included' ? original.includedAt : ref.date;
      assert.ok(scopeDate >= digest.start && scopeDate <= digest.end, ref.id);
      if (collection === 'medium' && digest.dateBasis === 'included') {
        assert.ok(original.tags.length >= 4 && original.tags.length <= 8, ref.id);
        assert.equal(original.tags.some(tag => tag.includes(';')), false, ref.id);
      }
    }
    for(const obj of [digest, ...digest.topics]) for(const lang of ['pt','en']) {
      assert.ok(obj.title[lang] && obj.summary[lang]);
    }
    assert.ok(digest.method.pt && digest.method.en);
    for(const topic of digest.topics) for(const id of topic.sourceIds) assert.ok(corpusIds.has(id), id);
  }
});
