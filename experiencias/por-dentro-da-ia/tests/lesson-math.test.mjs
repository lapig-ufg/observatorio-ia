import assert from 'node:assert/strict';
import test from 'node:test';
import { embeddings, positions, lessonTokens, inferToy, toyBlocks, normalize, matvec, dot, probabilities, gelu, relu, fold, sinusoidal, vocabularyProjection } from '../app/lesson-math.ts';
const close=(a,b,tolerance=1e-11)=>assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);
const vectorClose=(a,b)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>close(v,b[i]));};

test('matrix multiplication uses rows, never an accidental transpose',()=>{
  assert.deepEqual(matvec([[1,.5],[.5,.5]],[.8,-.4]),[.6000000000000001,.2]);
  close(dot([.8,.4],[.8,.7])/Math.sqrt(2),.92/Math.sqrt(2));
});
test('softmax sums to one, stays positive and is invariant under common shifts',()=>{
  const p=probabilities([2,1,0]);
  close(p.reduce((s,v)=>s+v),1);
  p.forEach(v=>assert.ok(v>0));
  close(p[0],.6652409557748218);
  vectorClose(p,probabilities([1002,1001,1000]));
  assert.ok(probabilities([2,1,0],.5)[0]>p[0]);
  assert.throws(()=>probabilities([1,2],0));
});
test('layer normalization centers components; epsilon keeps constants finite',()=>{
  const a=normalize([1,2,3,6]),b=normalize([21,22,23,26]);
  vectorClose(a,b);close(a.reduce((s,v)=>s+v),0);
  assert.deepEqual(normalize([3,3,3,3]),[0,0,0,0]);
  close(a.reduce((s,v)=>s+v*v,0)/4,3.5/(3.5+1e-5));
});
test('sinusoids sample the actual four-component formula',()=>{
  assert.deepEqual(sinusoidal(0),[0,1,0,1]);
  vectorClose(sinusoidal(7),[Math.sin(7),Math.cos(7),Math.sin(.07),Math.cos(.07)]);
  assert.equal(sinusoidal(2,12).length,12);
});
test('ReLU clips, two opposite ReLUs fold, GELU has a smooth negative region',()=>{
  for(const x of [-3,-2,-1,-.7,0,.7,1,2,3]){
    close(fold(x),Math.abs(x));close(relu(x),Math.max(0,x));
    close(gelu(x)-gelu(-x),x);
  }
  close(gelu(-1),-.15880800939172324);
  assert.ok(gelu(-.7)<0);assert.equal(relu(-.7),0);
});
test('the forward pass leaves all dictionaries, positions and weights untouched',()=>{
  const before=JSON.stringify({embeddings,positions,toyBlocks});
  inferToy();inferToy(true);
  assert.equal(JSON.stringify({embeddings,positions,toyBlocks}),before);
});
test('each toy head has causal weights, correct shape and one unit of mass per row',()=>{
  const model=inferToy();
  for(const block of model.blocks){
    assert.equal(block.input.length,9);assert.equal(block.heads.length,2);
    for(const head of block.heads){
      head.attention.forEach((row,i)=>{
        assert.equal(row.length,9);close(row.reduce((s,v)=>s+v,0),1);
        row.forEach((weight,j)=>{if(j>i)assert.equal(weight,0);else assert.ok(weight>0);});
      });
      head.q.forEach(row=>assert.equal(row.length,2));
    }
    block.expanded.forEach(row=>assert.equal(row.length,8));
    block.output.forEach(row=>{assert.equal(row.length,4);row.forEach(v=>assert.ok(Number.isFinite(v)));});
  }
});
test('Q, K, V, scores and each weighted context are recomputable from their matrices',()=>{
  const model=inferToy();
  model.blocks.forEach((block,l)=>block.heads.forEach((head,h)=>{
    const w=toyBlocks[l].heads[h];
    for(let i=0;i<9;i++){
      for(const kind of ['q','k','v'])vectorClose(head[kind][i],matvec(w[kind],block.normalized[i]));
      for(let j=0;j<=i;j++)close(head.scores[i][j],(head.q[i][0]*head.k[j][0]+head.q[i][1]*head.k[j][1])/Math.sqrt(2));
      for(let c=0;c<2;c++)close(head.contexts[i][c],head.attention[i].reduce((s,w,j)=>s+w*head.v[j][c],0));
    }
  }));
});
test('head concatenation, output projection, both residual sums and MLP are connected',()=>{
  const m=inferToy();
  m.blocks.forEach((b,l)=>{
    const w=toyBlocks[l];
    for(let i=0;i<9;i++){
      vectorClose(b.updates[i],matvec(w.output,[...b.heads[0].contexts[i],...b.heads[1].contexts[i]]));
      vectorClose(b.residual[i],b.input[i].map((v,c)=>v+b.updates[i][c]));
      vectorClose(b.expanded[i],matvec(w.expand,b.mlpInput[i]).map((v,c)=>v+w.b1[c]));
      vectorClose(b.activated[i],b.expanded[i].map(gelu));
      vectorClose(b.deltas[i],matvec(w.compress,b.activated[i]).map((v,c)=>v+w.b2[c]));
      vectorClose(b.output[i],b.residual[i].map((v,c)=>v+b.deltas[i][c]));
    }
  });
  assert.deepEqual(m.blocks[1].input,m.blocks[0].output);
});
test('changing a future token cannot change vegetation; the last position can change',()=>{
  const a=inferToy(),b=inferToy(true);
  vectorClose(a.states[8],b.states[8]);
  for(let l=0;l<2;l++){
    vectorClose(a.blocks[l].output[1],b.blocks[l].output[1]);
    assert.notDeepEqual(a.blocks[l].output[8],b.blocks[l].output[8]);
  }
  assert.notDeepEqual(a.probabilities,b.probabilities);
  assert.equal(lessonTokens[2],'saudável');assert.equal(b.tokens[2],'degradada');
});
test('all output probabilities come from the final normalized state',()=>{
  const m=inferToy();
  vectorClose(m.final,normalize(m.blocks[1].output[8]));
  vectorClose(m.logits,matvec(vocabularyProjection,m.final));
  const exp=m.logits.map(Math.exp),sum=exp.reduce((s,v)=>s+v,0);
  vectorClose(m.probabilities,exp.map(v=>v/sum));
});
test('documented GPT-3 counts are not confused with the toy dimensions',()=>{
  assert.equal(50257*12288,617558016);
  assert.equal(12288*4,49152);
  assert.equal(96*128,12288);
});
