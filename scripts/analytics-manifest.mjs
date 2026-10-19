import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Read only literal data from the component; never execute the component or its imports.
export function featuredManifest(source) {
  const file = ts.createSourceFile('FeaturedDebate.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwrap = node => ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node) ? unwrap(node.expression) : node;
  const constants = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) constants.set(declaration.name.text, unwrap(declaration.initializer));
    }
  }
  const prop = (node, key) => {
    node = unwrap(node);
    if (!ts.isObjectLiteralExpression(node)) throw new Error(`Expected object for ${key}`);
    const found = node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file).replace(/['"]/g, '') === key);
    if (!found) throw new Error(`Missing featured field: ${key}`);
    return unwrap(found.initializer);
  };
  const string = node => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) return string(prop(constants.get(node.expression.text), node.name.text));
    throw new Error(`Unsupported featured value: ${node.getText(file)}`);
  };
  const editions = constants.get('editions');
  if (!editions) throw new Error('Featured editions missing');
  const pt = prop(editions, 'pt');
  const cards = prop(pt, 'cards');
  if (!ts.isArrayLiteralExpression(cards)) throw new Error('Featured cards must be an array');
  const materials = cards.elements.flatMap(card => {
    const title = string(prop(card, 'title'));
    const links = prop(card, 'links');
    if (!ts.isArrayLiteralExpression(links)) throw new Error('Featured links must be an array');
    return links.elements.map(link => ({title, kind: string(prop(link, 'kind')), href: string(prop(link, 'href'))}));
  });
  if (!materials.length || new Set(materials.map(x => x.href)).size !== materials.length) throw new Error('Featured materials missing or duplicated');
  for (const material of materials) {
    if (!['audio', 'presentation', 'document', 'survey'].includes(material.kind) || !/^(https:\/\/|#)/.test(material.href)) throw new Error('Invalid featured material');
  }
  return {schemaVersion: 1, edition: string(prop(pt, 'title')), startsOn: string(prop(pt, 'startsOn')), editionAliases: [string(prop(prop(editions, 'en'), 'title'))], materials};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = featuredManifest(readFileSync(new URL('../src/FeaturedDebate.tsx', import.meta.url), 'utf8'));
  writeFileSync(new URL('../dist/analytics-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Analytics manifest: ${manifest.materials.length} featured materials.`);
}
