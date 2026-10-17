import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildPolicyEnglish,currentPolicyEnglish} from '../scripts/build-policy-english.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const pt=read('public/levantamentos/politicas-ia/dados.json');
const en=read('public/levantamentos/politicas-ia/dados-en.json');
const content=read('data/politicas-ia/english-content.json');
const notes=read('data/politicas-ia/english-notes.json');
const vocabulary=read('src/levantamentos/policy-vocabulary-en.json');
const ui=read('src/levantamentos/policy-ui-en.json');

test('tradução integral preserva identidades, códigos, URLs, datas e números dos 149 registros',()=>{
  assert.deepEqual(en,currentPolicyEnglish());
  assert.equal(en.rows.length,pt.rows.length);
  assert.equal(new Set(en.rows.map(r=>r.nome)).size,pt.rows.length);
  for(let i=0;i<pt.rows.length;i++){
    for(const field of Object.keys(pt.rows[i]).filter(k=>!['sub','nota'].includes(k)))assert.deepEqual(en.rows[i][field],pt.rows[i][field],`${i}/${field}`);
    assert.equal(en.rows[i].nota,notes[pt.rows[i].nome]);
    assert.equal(en.rows[i].sub,vocabulary[pt.rows[i].sub]);
  }
  assert.deepEqual(en.meta,pt.meta);
  en.evidence.forEach((row,i)=>{for(const f of ['v','u','declara'])assert.equal(row[f],pt.evidence[i][f]);});
});

test('mudança da fonte bloqueia tradução obsoleta; ausência e excesso de identidades são recusados',()=>{
  assert.equal(content.sourceSha256,createHash('sha256').update(JSON.stringify(pt)).digest('hex'));
  const changed=structuredClone(pt);changed.rows[0].nota+=' changed';
  assert.throws(()=>buildPolicyEnglish(changed,content,notes,vocabulary),/Portuguese source changed/);
  const missing={...notes};delete missing[pt.rows[0].nome];
  assert.throws(()=>buildPolicyEnglish(pt,content,missing,vocabulary),/all source identities/);
  assert.throws(()=>buildPolicyEnglish(pt,content,{...notes,duplicate:'not a source'},vocabulary),/all source identities/);
  assert.throws(()=>buildPolicyEnglish(pt,content,{...notes,COPE:''},vocabulary),/Empty or invented/);
});

test('a tradução preserva ressalvas críticas e não transforma ausência ou upload proibido em regra universal',()=>{
  const note=name=>en.rows.find(r=>r.nome===name).nota;
  assert.match(note('Society for Neuroscience (J. Neurosci.)'),/neither expressly authorises.*nor literally prohibits all auxiliary uses/);
  assert.match(note('FAPESP / CAPES / FAPEG'),/without a demonstrated joint policy/);
  assert.match(note('FAPESP / CAPES / FAPEG'),/NL proves neither absence/);
  assert.match(note('AAR / SBL'),/No joint policy is demonstrated/);
  assert.match(note('The Lancet'),/Comments and Correspondence allow only grammar\/spelling/);
  assert.match(note('CNPq (Portaria 2.664/2026)'),/full Official Gazette text was not retrieved/);
  assert.match(note('MOST (China)'),/does not remove the specific proposal prohibition/);
  assert.match(en.metodo.map(x=>x.join(' ')).join(' '),/editorial translation, not an official translation/);
  assert.equal(en.rows.filter(r=>r.geo.startsWith('Brasil')&&r.tipo==='Periódico').length,36);
});

test('todas as chaves estáticas da interface têm tradução explícita',()=>{
  const source=fs.readFileSync('src/levantamentos/PoliticasIAPage.tsx','utf8');
  const tree=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let count=0;
  function walk(node){
    if(ts.isCallExpression(node)&&node.expression.getText(tree)==='t'&&node.arguments.length&&ts.isStringLiteral(node.arguments[0])){
      const key=node.arguments[0].text;assert(Object.hasOwn(ui,key)||Object.hasOwn(vocabulary,key),`Missing UI: ${key}`);count++;
    }
    ts.forEachChild(node,walk);
  }walk(tree);assert(count>100);
  assert.doesNotMatch(source,/available in Portuguese only|survey content remains in Portuguese/);
  assert.match(source,/translated\.translation\?\.sourceSha256 !== sourceHash/);
});

// Hermetic React rendering of the real TSX, not a browser or a mock translation implementation.
const modules=new Map();
function urlFor(file){
  file=path.resolve(file);if(modules.has(file))return modules.get(file);
  if(file.endsWith('.json')){const url='data:text/javascript;base64,'+Buffer.from(`export default ${fs.readFileSync(file,'utf8')}`).toString('base64');modules.set(file,url);return url;}
  let js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  js=js.replace(/import\s+["'][^"']+\.css["'];?/g,'').replaceAll('import.meta.env.BASE_URL','"/observatorio-ia/"');
  js=js.replace(/from\s+["']([^"']+)["']/g,(full,spec)=>{
    let url;
    if(spec.startsWith('.')){
      let target=path.resolve(path.dirname(file),spec);
      if(!fs.existsSync(target))target=['.ts','.tsx'].map(ext=>target+ext).find(fs.existsSync);
      assert(target,`Missing module ${spec}`);url=urlFor(target);
    }else url=import.meta.resolve(spec);
    return `from ${JSON.stringify(url)}`;
  });
  const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');modules.set(file,url);return url;
}
const page=await import(urlFor('src/levantamentos/PoliticasIAPage.tsx'));
const locale=await import(urlFor('src/levantamentos/policyLocale.tsx'));
const sections=['','areas','comparar','entidades','brasil','autores','metodo'];
test('as sete abas reais renderizam em inglês e português, sem lacunas de vocabulário',()=>{
  const previous=globalThis.window;
  globalThis.window={location:{pathname:'/observatorio-ia/en/',href:'https://lapig-ufg.github.io/observatorio-ia/en/'}};
  try{
    for(const english of [false,true])for(const tab of sections){
      const html=renderToStaticMarkup(React.createElement(locale.PolicyEnglishContext.Provider,{value:english},React.createElement(page.PolicySectionContent,{data:english?en:pt,tab,go:()=>{}})));
      assert(html.length>1000,`${english}/${tab}`);
      assert(!html.includes('Missing policy UI translation'));
      if(english){assert(!html.includes('Onde declarar'));assert(!html.includes('Gerar texto'));assert(!html.includes('Fonte primária'));}
      if(english&&tab==='metodo'){assert(html.includes('AI policies in scholarly publishing'));assert(html.includes('XLSX, Portuguese'));assert(html.includes('October'));}
    }
  }finally{globalThis.window=previous;}
});

test('busca inglesa usa texto traduzido, mas os filtros e denominadores conservam códigos canônicos',async()=>{
  const survey=await import(urlFor('src/levantamentos/surveyLogic.ts'));
  const empty={query:'',area:'',type:'',gen:'',rev:'',scope:''};
  assert(survey.filterPolicies(en.rows,{...empty,query:'confidentiality'}).length>20);
  assert.equal(survey.brazilianJournals(en.rows).length,survey.brazilianJournals(pt.rows).length);
  assert.deepEqual(survey.comparableRows(en.rows).map(r=>r.nome),survey.comparableRows(pt.rows).map(r=>r.nome));
  for(const value of survey.GEN_CATEGORIES)assert.equal(survey.filterPolicies(en.rows,{...empty,gen:value}).length,survey.filterPolicies(pt.rows,{...empty,gen:value}).length);
});
