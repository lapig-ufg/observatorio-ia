// Deterministic teaching model. None of these weights comes from GPT-3.
export const lessonTokens = ["A", "vegetação", "saudável", "apresenta", "alta", "reflectância", "no", "infravermelho", "próximo"];
export const embeddings: Record<string, number[]> = {
  A: [.10, -.08, .05, .12], vegetação: [.82, -.36, .18, .61], saudável: [.67, .48, -.21, .75],
  apresenta: [-.12, .23, .04, .18], alta: [.34, .15, -.09, .29], reflectância: [.21, .78, .54, -.16],
  no: [.05, -.18, .12, .07], infravermelho: [.15, .91, .62, -.28], próximo: [-.32, .14, .73, .19],
};
// Hand-picked, frozen table: a stand-in for learned positional embeddings.
export const positions = [[0,.1,0,-.1],[.04,-.02,.01,.03],[-.06,.08,.03,.02],[.12,.04,-.05,.08],[.03,-.09,.1,.04],[-.08,.02,.12,.06],[.06,.1,-.04,-.02],[.09,-.07,.05,.11],[-.03,.06,.08,-.04]];
export const add = (a: number[], b: number[]) => a.map((v,i) => v+b[i]);
export const dot = (a: number[], b: number[]) => a.reduce((sum,v,i) => sum+v*b[i],0);
export const matvec = (matrix: number[][], vector: number[]) => matrix.map(row => dot(row,vector));
export function normalize(x: number[]) {
  const mean = x.reduce((s,v) => s+v,0)/x.length;
  const variance = x.reduce((s,v) => s+(v-mean)**2,0)/x.length;
  return x.map(v => (v-mean)/Math.sqrt(variance+1e-5));
}
export function probabilities(logits: number[], temperature=1) {
  if (!(temperature > 0)) throw new RangeError("Temperature must be positive");
  const scaled=logits.map(v=>v/temperature), peak=Math.max(...scaled);
  const exp=scaled.map(v=>Math.exp(v-peak)), sum=exp.reduce((s,v)=>s+v,0);
  return exp.map(v=>v/sum);
}
export const gelu = (u: number) => .5*u*(1+Math.tanh(Math.sqrt(2/Math.PI)*(u+.044715*u**3)));
export const relu = (u: number) => Math.max(0,u);
export const fold = (u: number) => relu(u)+relu(-u);
export function sinusoidal(position: number, dimension=4) {
  return Array.from({length:dimension},(_,c)=> {
    const angle=position/10000**(2*Math.floor(c/2)/dimension);
    return c%2===0 ? Math.sin(angle) : Math.cos(angle);
  });
}
// Each block has its own frozen matrices; two heads, width 4, MLP width 8.
const weights = (rows: number, cols: number, seed: number) => Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>(((r*17+c*11+seed*7)%19)-9)/20));
export const toyBlocks = [1,2].map(seed=>({
  heads:[0,1].map(h=>({q:weights(2,4,seed+h*3), k:weights(2,4,seed+h*3+1), v:weights(2,4,seed+h*3+2)})),
  output:weights(4,4,seed+9), expand:weights(8,4,seed+11), compress:weights(4,8,seed+15),
  b1:[.1,-.1,.2,0,-.05,.15,-.2,.05], b2:[.03,-.02,.01,.04],
}));
export function runBlock(states: number[][], layer: number) {
  const block=toyBlocks[layer], normalized=states.map(normalize);
  const heads=block.heads.map(head=>{
    const q=normalized.map(v=>matvec(head.q,v)), k=normalized.map(v=>matvec(head.k,v)), v=normalized.map(x=>matvec(head.v,x));
    const scores=q.map((query,i)=>k.map((key,j)=>j<=i?dot(query,key)/Math.sqrt(2):-Infinity));
    const attention=scores.map(row=>probabilities(row));
    const contexts=attention.map(row=>[0,1].map(c=>row.reduce((s,w,j)=>s+w*v[j][c],0)));
    return {q,k,v,scores,attention,contexts};
  });
  const updates=states.map((_,i)=>matvec(block.output,heads.flatMap(head=>head.contexts[i])));
  const residual=states.map((state,i)=>add(state,updates[i]));
  const mlpInput=residual.map(normalize);
  const expanded=mlpInput.map(x=>add(matvec(block.expand,x),block.b1));
  const activated=expanded.map(row=>row.map(gelu));
  const deltas=activated.map(x=>add(matvec(block.compress,x),block.b2));
  const output=residual.map((state,i)=>add(state,deltas[i]));
  return {input:states,normalized,heads,updates,residual,mlpInput,expanded,activated,deltas,output};
}
export const outputTokens=["porque","devido","em","absorve","."];
export const vocabularyProjection=[[.3,-.2,.4,.1],[-.2,.3,.1,.2],[.2,.1,-.3,.4],[-.4,.2,.1,-.1],[.1,-.1,.2,-.2]];
export function inferToy(degraded=false) {
  const inputTokens=lessonTokens.map(token=>degraded&&token==="saudável"?"degradada":token);
  const dictionary:Record<string,number[]>={...embeddings,degradada:[-.45,.72,.38,-.51]};
  const states=inputTokens.map((token,i)=>add(dictionary[token],positions[i]));
  const first=runBlock(states,0), second=runBlock(first.output,1);
  const final=normalize(second.output.at(-1)!);
  const logits=matvec(vocabularyProjection,final);
  return {tokens:inputTokens,states,blocks:[first,second],final,logits,probabilities:probabilities(logits)};
}
