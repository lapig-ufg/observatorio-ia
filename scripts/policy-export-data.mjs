import assert from 'node:assert/strict';

export const EXPORT_FIELDS=['nome','tipo','area','sub','geo','ano','gen','loc','rev','img','verif','url','nota'];
export const ENGLISH_HEADERS=['Entity','Type (source code)','Broad field (code)','Subfield','Geographical scope (source code)','Document year','Author text generation (source code)','Disclosure location (source code)','AI in peer review (source code)','Images (source code)','Verification (code)','Source (URL)','Note','Broad field','Historical change v4 → v5'];
const historyLabels={'Gerar texto':'Text generation','Onde declarar':'Disclosure location','Revisores':'Reviewers','Imagens':'Images','Verificação':'Verification','Fonte':'Source'};
export function translateHistoricalChange(value){
  if(value==null||value==='')return null;
  return value.split('; ').map(part=>{
    const index=part.indexOf(': '),key=part.slice(0,index);
    assert(index>0&&Object.hasOwn(historyLabels,key),`Unknown historical field: ${part}`);
    return historyLabels[key]+part.slice(index);
  }).join('; ');
}
export function englishExportRows(pt,en,original,vocabulary){
  assert.equal(original.length,pt.rows.length+1);
  assert.equal(en.rows.length,pt.rows.length);
  return en.rows.map((row,i)=>{
    const source=pt.rows[i],prior=original[i+1];
    assert.equal(row.nome,source.nome);assert.equal(prior[0],source.nome);
    for(const [j,key]of EXPORT_FIELDS.entries())assert.equal(prior[j]??null,source[key] === '' ? null : source[key]??null,`Source workbook diverged: ${i}/${key}`);
    for(const key of EXPORT_FIELDS.filter(k=>!['sub','nota'].includes(k)))assert.equal(row[key],source[key],`Changed code: ${i}/${key}`);
    assert(Object.hasOwn(vocabulary,prior[13]),`Untranslated field: ${prior[13]}`);
    return [...EXPORT_FIELDS.map(k=>row[k]=== ''?null:row[k]??null),vocabulary[prior[13]],translateHistoricalChange(prior[14])];
  });
}
export const toCsv=matrix=>'\uFEFF'+matrix.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
export function englishCodebook(pt,vocabulary){
  const meanings=field=>[...new Set(pt.rows.map(r=>r[field]))].sort().map(code=>`${code} = ${vocabulary[code]}`).join('; ')+'.';
  const revision=pt.meta.revisao;
  return [
    ['Field','Codes and definitions'],
    ['Author text generation','Permitida = substantive uses allowed subject to conditions; disclosure depends on the applicable rule. Restrita = editing/support only. Vedada = text generation prohibited. Sem regra = no rule located in the examined scope, not permission. N/A = not applicable.'],
    ['Disclosure location',meanings('loc')+' Multiple locations may be cumulative or conditional alternatives. Não especifica requires transparency without prescribing a section. Read the record note and official source.'],
    ['AI in peer review','Vedado = AI use in peer review prohibited. Condicionado = limited uses only (e.g. editing the reviewer’s own report, secure tools), or a prohibition limited to uploading confidential material. Não trata = not addressed in the coded scope, not permission.'],
    ['Images','Restritas = prohibited or strongly restricted. Permitidas c/ declaração = allowed with disclosure. Não trata = not addressed in the coded scope. Read exceptions in each note.'],
    ['Verification','P = primary source. S = secondary source. H = inherited rule with applicable adoption documented in reconfirmed records. A = absence within the examined corpus. NL = not located. A/NL establish neither universal absence nor permission; consult the audit history.'],
    ['Broad field','CNPq broad-field classification; journals and societies are classified by their predominant field. '+Object.keys(pt.areas).map(code=>`${code} = ${vocabulary[pt.areas[code]]}`).join('; ')+'.'],
    ['Reference date',`Historical baseline: 2026-10-16. Full review: ${revision.data}; ${revision.verified}/${revision.inventory} records reconciled, ${revision.changed} corrected, ${revision.unresolved} unresolved. A/NL are limited to the described corpora, not universal absence. Detailed audit history (Portuguese): https://lapig-ufg.github.io/observatorio-ia/${revision.history}`],
    ['Historical change v4 → v5','Fields recoded relative to v4; blank means no recorded change at that historical transition. Field labels are translated; source codes, URLs and before/after values are preserved. This column is historical, not the change log of the current review.'],
    ['Type',meanings('tipo')],
    ['Geographical scope',meanings('geo')],
    ['Translation and stable codes',`English editorial translation, not an official translation of institutional policies. All ${pt.rows.length} entity identities, numerical values, document years, source URLs and original categorical codes are preserved. Human-readable headers, subfields, broad-field names, notes and history field labels are translated. Empty source notes remain empty. Portuguese originals remain available on the Portuguese website.`]
  ];
}
