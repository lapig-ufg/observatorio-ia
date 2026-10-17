import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function buildPolicyEnglish(source, content, notes, vocabulary) {
  assert.equal(content.sourceSha256,hash(source),'Portuguese source changed: reconcile every English field before publication; never just update the hash.');
  const lookup = value => {assert(Object.hasOwn(vocabulary,value),`Missing vocabulary: ${value}`);return vocabulary[value];};
  assert.deepEqual(Object.keys(notes).sort(),source.rows.map(r=>r.nome).sort(),'English notes must match all source identities, without duplicates.');
  source.rows.forEach(row=>{
    assert.equal(typeof notes[row.nome],'string');
    assert.equal(Boolean(notes[row.nome]),Boolean(row.nota),`Empty or invented note: ${row.nome}`);
    for(const field of ['tipo','geo','sub','img','loc'])lookup(row[field]);
  });
  for(const field of ['messages','cross','brasil','checks','metodo']){
    assert.equal(content[field].length,source[field].length,`Incomplete ${field}`);
    assert(content[field].flat().every(value=>typeof value==='string'&&value.trim()));
  }
  assert.equal(content.evidenceLabels.length,source.evidence.length);
  assert.deepEqual(Object.keys(content.trendText).sort(),Object.keys(source.trends).sort());
  const reviewDate=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${source.meta.revisao?.data||source.meta.referencia}T12:00:00Z`));
  const trends=Object.fromEntries(Object.keys(source.trends).map(area=>{
    const all=source.rows.filter(r=>r.area===area);
    const core=all.filter(r=>!['Agência de fomento','Organismo transversal'].includes(r.tipo));
    const count=(field,value)=>core.filter(r=>r[field]===value).length;
    const journals=all.filter(r=>r.tipo==='Periódico'&&r.geo.startsWith('Brasil'));
    const {sub,headline}=content.trendText[area];assert(sub&&headline);
    const coverage=source.trends[area].confianca.match(/Cobertura: (\d+)\/(\d+)/);
    const consulted=source.trends[area].trends[3].match(/Fontes reconciliadas incluem (.+)\.$/);
    assert(coverage&&consulted,`Reconcile changed coverage prose for ${area}`);
    const verified=Number(coverage[1]),inventory=Number(coverage[2]);
    assert.equal(inventory,all.length);assert(verified<=inventory);
    return [area,{sub,headline,trends:[
      `**Coded dataset in this area:** ${count('gen','Permitida')} Allowed; ${count('gen','Restrita')} Restricted; ${count('gen','Vedada')} Prohibited; ${count('gen','Sem regra')} No rule located; ${count('gen','N/A')} Not applicable. Cross-disciplinary bodies and funding agencies are excluded from these comparisons.`,
      `**Reviewing:** ${count('rev','Condicionado')} records with conditional use, ${count('rev','Vedado')} with prohibition and ${count('rev','Não trata')} with no coded provision. Read the conditions in each note and source.`,
      `**Images:** ${core.filter(r=>r.img!=='Não trata').length} of ${core.length} comparable records have a coded rule; conceptual illustrations are not experimental data.`,
      `**Reconfirmation on ${reviewDate}:** ${verified} of ${inventory} area records. Reconciled sources include ${consulted[1]}.`
    ],brasil:`${journals.filter(r=>r.gen!=='Sem regra').length} of ${journals.length} Brazilian journals in this area have a rule in the reviewed dataset. The history records each record's status and corpus limits; do not extrapolate absence to the entire institution.`,
    pratica:'Check the title\'s current instructions, contribution type and your role (author, reviewer or editor). Separate assisted writing from scientific methods and record tool, version, purpose and human verification.',
    confianca:`Coverage: ${verified}/${inventory} records reconciled across all four fields on ${reviewDate}, within the described corpora. A/NL do not establish universal absence. Purposive sample and AI-assisted coding, without independent duplicate extraction.`}];
  }));
  const guide=source.guide.map(g=>{
    const row=source.rows.find(r=>r.nome===g[0]);assert(row);
    assert(g[3].endsWith(row.nota),'Guide diverged from entity note; reconcile the translation.');
    return [g[0],lookup(g[1]),g[2].startsWith('Permitida (')?'Allowed (with specific conditions and exemptions)':lookup(g[2]),`${lookup(row.loc)}. ${notes[row.nome]}`,lookup(g[4]),g[5]];
  });
  return {...source,
    rows:source.rows.map(row=>({...row,sub:lookup(row.sub),nota:notes[row.nome]})),
    areas:Object.fromEntries(Object.entries(source.areas).map(([key,value])=>[key,lookup(value)])),
    messages:content.messages,cross:content.cross,trends,brasil:content.brasil,checks:content.checks,guide,
    evidence:source.evidence.map((item,i)=>({...item,l:content.evidenceLabels[i],s:item.s.replace('set/2024','Sep 2024')})),
    metodo:content.metodo,
    translation:{language:'en',sourceLanguage:'pt-BR',sourceSha256:content.sourceSha256,sourceReference:source.meta.referencia,kind:'editorial-not-official',preserved:['identities','codes','years','official-source-urls','evidence-values','review-dates'],downloadsLanguage:'en',originalDownloadsLanguage:'pt-BR',auditHistoryLanguage:'pt-BR'}
  };
}

export function currentPolicyEnglish(){
  return buildPolicyEnglish(read('public/levantamentos/politicas-ia/dados.json'),read('data/politicas-ia/english-content.json'),read('data/politicas-ia/english-notes.json'),read('src/levantamentos/policy-vocabulary-en.json'));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=currentPolicyEnglish();
  const target='public/levantamentos/politicas-ia/dados-en.json';
  const bytes=JSON.stringify(result,null,2)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),bytes,'English publication is stale; regenerate and review.');
  else if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==bytes)fs.writeFileSync(target,bytes);
  console.log(JSON.stringify({rows:result.rows.length,sourceSha256:result.translation.sourceSha256,mode:process.argv.includes('--check')?'check':'build'}));
}
