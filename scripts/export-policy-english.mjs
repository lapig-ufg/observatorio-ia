// Run with the bundled workspace Node and artifact-tool, not app dependencies.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash}from'node:crypto';
import{createRequire}from'node:module';
import{fileURLToPath,pathToFileURL}from'node:url';
import{EXPORT_FIELDS,ENGLISH_HEADERS,englishExportRows,englishCodebook,toCsv}from'./policy-export-data.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public/levantamentos/politicas-ia');
const modules=process.env.OBSERVATORIO_ARTIFACT_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const requireBundled=createRequire(path.join(modules,'workspace-loader.cjs'));
const{FileBlob,SpreadsheetFile,Workbook}=await import(pathToFileURL(requireBundled.resolve('@oai/artifact-tool')).href);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=await read(path.join(dir,'dados.json')),english=await read(path.join(dir,'dados-en.json'));
assert.equal(english.translation.sourceSha256,hash(JSON.stringify(source)),'English dataset is stale. Reconcile before exporting.');
const vocabulary=await read(path.join(root,'src/levantamentos/policy-vocabulary-en.json'));
const stem='base-politicas-ia-2026-10',originalBytes=await fs.readFile(path.join(dir,`${stem}.xlsx`));
const original=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(dir,`${stem}.xlsx`)));
const sourceMatrix=original.worksheets.getItem('Base').getRange(`A1:O${source.rows.length+1}`).values;
assert(!original.worksheets.getItem('Base').getRange(`A1:O${source.rows.length+1}`).formulas.flat().some(Boolean),'Unexpected formulas: preserve before translation.');
const matrix=[ENGLISH_HEADERS,...englishExportRows(source,english,sourceMatrix,vocabulary)];
const codebook=englishCodebook(source,vocabulary);
const csv=toCsv(matrix),xlsxPath=path.join(dir,`${stem}-en.xlsx`),csvPath=path.join(dir,`${stem}-en.csv`);
let prior;
try{prior=await SpreadsheetFile.importXlsx(await FileBlob.load(xlsxPath));}catch{}
let idempotent=false;
if(prior){
  idempotent=JSON.stringify(prior.worksheets.getItem('Dataset').getRange(`A1:O${matrix.length}`).values)===JSON.stringify(matrix)
    &&JSON.stringify(prior.worksheets.getItem('Codebook').getRange(`A1:B${codebook.length}`).values)===JSON.stringify(codebook)
    &&prior.worksheets.getItem('Dataset').getRange('M2').format.wrapText===true
    &&await fs.readFile(csvPath,'utf8')===csv;
}
if(!idempotent){
  const wb=Workbook.create(),base=wb.worksheets.add('Dataset'),code=wb.worksheets.add('Codebook');
  base.getRange(`A1:O${matrix.length}`).values=matrix;
  base.getRange(`A1:O${matrix.length}`).format.font={name:'Calibri',size:11};
  base.getRange('A1:O1').format={fill:'#294A6D',font:{name:'Calibri',size:11,bold:true,color:'#FFFFFF'},wrapText:true,verticalAlignment:'center',rowHeight:44};
  // Preserve the flat 15-column template, its column widths and frozen identity/header.
  const widths=[38,22,10,24,14,10,16,20,14,20,10,50,50,30,60];
  for(let j=0;j<widths.length;j++)base.getRangeByIndexes(0,j,matrix.length,1).format.columnWidth=widths[j];
  base.getRange(`M2:O${matrix.length}`).format.wrapText=true;
  base.getRange(`A2:O${matrix.length}`).format.verticalAlignment='top';
  base.getRange(`A2:O${matrix.length}`).format.autofitRows();
  base.getRange(`F2:F${matrix.length}`).setNumberFormat('0');
  base.freezePanes.freezeRows(1);base.freezePanes.freezeColumns(1);
  code.getRange(`A1:B${codebook.length}`).values=codebook;
  code.getRange(`A1:B${codebook.length}`).format.font={name:'Calibri',size:11};
  code.getRange(`A1:B${codebook.length}`).format.verticalAlignment='top';
  code.getRange(`A1:A${codebook.length}`).format.columnWidth=28;
  code.getRange(`B1:B${codebook.length}`).format.columnWidth=140;
  code.getRange(`B1:B${codebook.length}`).format.wrapText=true;
  code.getRange('A1:B1').format.font={name:'Calibri',size:11,bold:true};
  code.getRange(`A1:B${codebook.length}`).format.autofitRows();
  wb.recalculate();
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'policy-export-en-'));
  const exported=path.join(temporary,`${stem}-en.xlsx`);
  await(await SpreadsheetFile.exportXlsx(wb)).save(exported);
  await fs.copyFile(exported,xlsxPath);
  await fs.writeFile(csvPath,csv,'utf8');
}
// Reopen the actual saved workbook, not the in-memory authoring object.
const check=await SpreadsheetFile.importXlsx(await FileBlob.load(xlsxPath));
assert.deepEqual(check.worksheets.getItem('Dataset').getRange(`A1:O${matrix.length}`).values,matrix);
assert.deepEqual(check.worksheets.getItem('Codebook').getRange(`A1:B${codebook.length}`).values,codebook);
assert.equal(hash(await fs.readFile(path.join(dir,`${stem}.xlsx`))),hash(originalBytes),'Portuguese workbook changed.');
const manifest={language:'en',kind:'editorial-not-official',rows:matrix.length-1,columns:matrix[0].length,sheets:['Dataset','Codebook'],sourceSha256:english.translation.sourceSha256,sourceCsvSha256:hash(await fs.readFile(path.join(dir,`${stem}.csv`))),sourceWorkbookSha256:hash(originalBytes),fields:EXPORT_FIELDS,headers:ENGLISH_HEADERS,csvSha256:hash(await fs.readFile(csvPath)),xlsxSha256:hash(await fs.readFile(xlsxPath))};
const manifestText=JSON.stringify(manifest,null,2)+'\n',manifestPath=path.join(dir,'exports-en.json');
if(await fs.readFile(manifestPath,'utf8').catch(()=>null)!==manifestText)await fs.writeFile(manifestPath,manifestText);
if(process.env.OBSERVATORIO_EXPORT_EVIDENCE){
  const proof=process.env.OBSERVATORIO_EXPORT_EVIDENCE;await fs.mkdir(proof,{recursive:true});
  for(const[sheetName,range,file]of[['Dataset','A1:H6','dataset-en.png'],['Dataset','K1:O3','notes-history-en.png'],['Codebook',`A1:B${codebook.length}`,'codebook-en.png']]){
    const png=await check.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(path.join(proof,file),new Uint8Array(await png.arrayBuffer()));
  }
  await fs.writeFile(path.join(proof,'export-checks.json'),JSON.stringify({...manifest,idempotent,allCellsRoundtrip:true,portugueseWorkbookUnchanged:true},null,2)+'\n');
}
console.log(JSON.stringify({...manifest,idempotent,allCellsRoundtrip:true}));
