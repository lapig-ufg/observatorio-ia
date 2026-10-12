import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const filled = value => typeof value === 'string' && value.trim() && !/^#(?:ERROR|REF|VALUE|N\/A)/i.test(value.trim());

// This validates an editorially written draft; it never invents analysis or translations.
export function resolveDigest(input, source, collection) {
  const { expectedCount, collection: declared, ...draft } = structuredClone(input);
  const fail = message => { throw new Error(`${collection}: ${message}`); };
  if (declared !== collection) fail('collection does not match the draft filename');
  if (![draft.start, draft.end, draft.reviewedAt].every(validDate)
      || draft.start > draft.end || draft.reviewedAt < draft.end) fail('invalid editorial dates');
  if (!Number.isInteger(expectedCount) || expectedCount < 0) fail('invalid expectedCount');
  const bilingual = (object, field) => {
    for (const lang of ['pt', 'en']) if (!filled(object?.[field]?.[lang])) fail(`missing ${field}.${lang}`);
  };
  for (const field of ['title', 'summary', 'method']) bilingual(draft, field);
  if (!Array.isArray(draft.topics) || (expectedCount > 0 && !draft.topics.length)) fail('missing topic summaries');
  const corpus = source.filter(item => item.date >= draft.start && item.date <= draft.end)
    .map(({ id, date, title, url }) => ({ id, date, title, url }));
  if (corpus.length !== expectedCount) fail(`expected ${expectedCount}, found ${corpus.length}; re-review the editorial scope before building`);
  const ids = new Set(), urls = new Set();
  for (const ref of corpus) {
    if (!filled(ref.id) || !filled(ref.title) || !validDate(ref.date)) fail('incomplete source record');
    let url;
    try { url = new URL(ref.url); } catch { fail(`invalid source URL: ${ref.id}`); }
    if (url.protocol !== 'https:' || url.username || url.password) fail(`unsafe source URL: ${ref.id}`);
    if (ids.has(ref.id) || urls.has(ref.url)) fail(`duplicate source: ${ref.id}`);
    ids.add(ref.id); urls.add(ref.url);
  }
  for (const topic of draft.topics) {
    bilingual(topic, 'title'); bilingual(topic, 'summary');
    if (!Array.isArray(topic.sourceIds) || !topic.sourceIds.length) fail('topic without sources');
    topic.sourceIds = topic.sourceIds.map(suffix => {
      if (!filled(suffix)) fail('empty source ID');
      const exact = corpus.filter(item => item.id === suffix);
      const matches = exact.length ? exact : corpus.filter(item => item.id.endsWith(`-${suffix}`));
      if (matches.length !== 1) fail(`unresolved or ambiguous source ${suffix}`);
      return matches[0].id;
    });
    if (new Set(topic.sourceIds).size !== topic.sourceIds.length) fail('duplicate topic reference');
  }
  return { ...draft, corpus };
}

export async function buildDigests(root = process.cwd()) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(read('src/catalog.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { articlesFromCsv } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const files = fs.readdirSync(path.join(root, 'data/editorial')).filter(name => /^(medium|folha)-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  const prepared = ['medium', 'folha'].map(collection => {
    const file = files.filter(name => name.startsWith(`${collection}-`)).at(-1);
    if (!file) throw new Error(`${collection}: missing dated editorial draft`);
    const draft = JSON.parse(read(`data/editorial/${file}`));
    if (file !== `${collection}-${draft.end}.json`) throw new Error(`${collection}: filename and editorial end date disagree`);
    const source = collection === 'medium'
      ? articlesFromCsv(read('public/catalogo.csv')).filter(item => item.type === 'medium' && validDate(item.includedAt) && item.includedAt <= draft.end)
        .map(item => ({ id: item.id, date: item.publishedAt, title: item.title, url: item.originalUrl }))
      : fs.readdirSync(path.join(root, 'public/folha-ia')).filter(name => /^\d{4}\.json$/.test(name)).flatMap(name => JSON.parse(read(`public/folha-ia/${name}`)));
    const digest = resolveDigest(draft, source, collection);
    return { collection, digest, content: `${JSON.stringify(digest, null, 2)}\n` };
  });
  // Validate BOTH editions before touching either public file. Unchanged retries are no-ops.
  fs.mkdirSync(path.join(root, 'public/editorial'), { recursive: true });
  for (const { collection, digest, content } of prepared) {
    const target = path.join(root, `public/editorial/${collection}-weekly.json`);
    const changed = !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content;
    if (changed) {
      const temporary = `${target}.tmp-${process.pid}`;
      fs.writeFileSync(temporary, content);
      fs.renameSync(temporary, target);
    }
    console.log(`${collection}: ${digest.corpus.length} source records, ${digest.topics.length} reviewed topic summaries; ${changed ? 'updated' : 'unchanged'}.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildDigests();
