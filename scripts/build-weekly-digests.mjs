import fs from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync('src/catalog.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { articlesFromCsv } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const files = fs.readdirSync('data/editorial').filter(name => /^(medium|folha)-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
for (const collection of ['medium', 'folha']) {
  const file = files.filter(name => name.startsWith(collection)).at(-1);
  if (!file) continue;
  const { expectedCount, collection: ignored, ...draft } = JSON.parse(fs.readFileSync(`data/editorial/${file}`, 'utf8'));
  const source = collection === 'medium'
    ? articlesFromCsv(fs.readFileSync('public/catalogo.csv', 'utf8')).filter(item => item.type === 'medium' && item.includedAt <= draft.end).map(item => ({ id: item.id, date: item.publishedAt, title: item.title, url: item.originalUrl }))
    : fs.readdirSync('public/folha-ia').filter(name => /^\d{4}\.json$/.test(name)).flatMap(name => JSON.parse(fs.readFileSync(`public/folha-ia/${name}`, 'utf8')));
  const corpus = source.filter(item => item.date >= draft.start && item.date <= draft.end).map(({ id, date, title, url }) => ({ id, date, title, url }));
  if (corpus.length !== expectedCount) throw new Error(`${collection}: expected ${expectedCount}, found ${corpus.length}; re-review the editorial scope before building.`);
  for (const topic of draft.topics) topic.sourceIds = topic.sourceIds.map(suffix => {
    const matches = corpus.filter(item => item.id === suffix || item.id.endsWith(`-${suffix}`));
    if (matches.length !== 1) throw new Error(`${collection}: unresolved or ambiguous source ${suffix}`);
    return matches[0].id;
  });
  fs.mkdirSync('public/editorial', { recursive: true });
  fs.writeFileSync(`public/editorial/${collection}-weekly.json`, `${JSON.stringify({ ...draft, corpus }, null, 2)}\n`);
  console.log(`${collection}: ${corpus.length} source records, ${draft.topics.length} reviewed topic summaries.`);
}
