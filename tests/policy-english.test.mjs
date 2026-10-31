import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildPolicyEnglish,currentPolicyEnglish} from '../scripts/build-policy-english.mjs';
import {EXPORT_FIELDS,ENGLISH_HEADERS,translateHistoricalChange,toCsv,englishCodebook} from '../scripts/policy-export-data.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const pt=read('public/levantamentos/politicas-ia/dados.json');
const en=read('public/levantamentos/politicas-ia/dados-en.json');
const content=read('data/politicas-ia/english-content.json');
const notes=read('data/politicas-ia/english-notes.json');
const vocabulary=read('src/levantamentos/policy-vocabulary-en.json');
const ui=read('src/levantamentos/policy-ui-en.json');

test('livro de códigos distingue revisão parcial da última referência integral',()=>{
  const partial=structuredClone(pt);
  partial.meta.referencia='2026-10-24';
  partial.meta.revisao={data:'2026-10-31',inventory:149,verified:148,changed:17,unresolved:1,history:'levantamentos/politicas-ia/revisao-2026-10-31.json'};
  const reference=englishCodebook(partial,vocabulary).find(row=>row[0]==='Reference date')[1];
  assert.match(reference,/Last full reference: 2026-10-24/);
  assert.match(reference,/Partial review: 2026-10-31; 148\/149/);
  assert.doesNotMatch(reference,/Full review: 2026-10-31/);
});

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
  assert.equal(vocabulary['Brasil/AL'],'Brazil/Latin America');
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
      if(tab==='metodo'){
        assert(html.includes(`base-politicas-ia-2026-10${english?'-en':''}.csv`));
        assert(html.includes(`base-politicas-ia-2026-10${english?'-en':''}.xlsx`));
        if(english){assert(html.includes('AI policies in scholarly publishing'));assert(html.includes('English dataset and codebook (XLSX)'));assert(!html.includes('XLSX, Portuguese'));assert(html.includes('October'));}
        else{assert(!html.includes('base-politicas-ia-2026-10-en.xlsx'));assert(!html.includes('base-politicas-ia-2026-10-en.csv'));}
      }
    }
  }finally{globalThis.window=previous;}
});

test('exports ingleses preservam todos os códigos, fontes, 15 colunas, histórico e originais portugueses',async()=>{
  // Use the production CSV parser, independently of the export serializer.
  const {parseCsv}=await import(urlFor('src/catalog.ts'));
  const dir='public/levantamentos/politicas-ia/';
  const original=parseCsv(fs.readFileSync(dir+'base-politicas-ia-2026-10.csv','utf8').replace(/^\uFEFF/,''));
  const translated=parseCsv(fs.readFileSync(dir+'base-politicas-ia-2026-10-en.csv','utf8').replace(/^\uFEFF/,''));
  assert.equal(translated.length,pt.rows.length+1);assert.deepEqual(translated[0],ENGLISH_HEADERS);
  for(let i=0;i<pt.rows.length;i++){
    const row=translated[i+1],prior=original[i+1];assert.equal(row.length,15);
    EXPORT_FIELDS.forEach((key,j)=>assert.equal(row[j],String(en.rows[i][key]??''),`${i}/${key}`));
    EXPORT_FIELDS.forEach((key,j)=>assert.equal(prior[j],String(pt.rows[i][key]??''),`Original CSV diverges: ${i}/${key}`));
    assert.equal(row[13],vocabulary[prior[13]]);
    assert.equal(row[14],translateHistoricalChange(prior[14])??'');
    const values=s=>s.split('; ').map(x=>x.slice(x.indexOf(': ')+2));
    assert.deepEqual(values(row[14]),values(prior[14]),`Historical values changed: ${i}`);
  }
  const manifest=read(dir+'exports-en.json');
  const digest=file=>createHash('sha256').update(fs.readFileSync(dir+file)).digest('hex');
  assert.equal(manifest.sourceSha256,en.translation.sourceSha256);
  assert.equal(manifest.sourceWorkbookSha256,digest('base-politicas-ia-2026-10.xlsx'));
  assert.equal(manifest.csvSha256,digest('base-politicas-ia-2026-10-en.csv'));
  assert.equal(manifest.xlsxSha256,digest('base-politicas-ia-2026-10-en.xlsx'));
  assert.equal(manifest.rows,pt.rows.length);assert.equal(manifest.columns,15);
  assert.deepEqual(manifest.sheets,['Dataset','Codebook']);
  assert.equal(manifest.sourceCsvSha256,digest('base-politicas-ia-2026-10.csv'));
  assert.equal(toCsv([['quote " and newline\n',null,0]]),'\uFEFF"quote "" and newline\n","","0"\n');
});

test('busca inglesa usa texto traduzido, mas os filtros e denominadores conservam códigos canônicos',async()=>{
  const survey=await import(urlFor('src/levantamentos/surveyLogic.ts'));
  const empty={query:'',area:'',type:'',gen:'',rev:'',scope:''};
  assert(survey.filterPolicies(en.rows,{...empty,query:'confidentiality'}).length>20);
  assert.equal(survey.brazilianJournals(en.rows).length,survey.brazilianJournals(pt.rows).length);
  assert.deepEqual(survey.comparableRows(en.rows).map(r=>r.nome),survey.comparableRows(pt.rows).map(r=>r.nome));
  for(const value of survey.GEN_CATEGORIES)assert.equal(survey.filterPolicies(en.rows,{...empty,gen:value}).length,survey.filterPolicies(pt.rows,{...empty,gen:value}).length);
});
