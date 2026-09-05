"use client";
import type { CSSProperties } from "react";

export function ArchitectureCompass({activeId,onGo,compact=false}:{activeId:string;onGo:(id:string)=>void;compact?:boolean}){
  const whole=["inicio","ensaio","mapa","fontes"].includes(activeId);
  const block=["transformer","profundidade","laboratorio"].includes(activeId);
  const attention=["atencao","qkv","softmax","matriz"].includes(activeId);
  const mlp=["mlp","dobras","matriz"].includes(activeId);
  const norm=activeId==="normalizacao";
  const chip=(label:string,target:string,active:boolean,color:string,sub?:string)=><button onClick={()=>onGo(target)} className={active?"compass-node here":"compass-node"} aria-current={active?"location":undefined} style={{"--node":color} as CSSProperties}><b>{label}</b>{sub&&<small>{sub}</small>}{active&&<span className="here-dot" aria-label="Etapa em foco"/>}</button>;
  const diagram=<div className="compass-body"><div className="compass-heading"><span>VOCÊ ESTÁ AQUI</span><h3>O mapa do GPT‑3</h3><p>{whole?"Visão da jornada completa":block?"Estados atravessando os blocos":attention?"Comunicação entre posições":mlp?"Transformação dentro de cada posição":norm?"Normalizações por posição":activeId==="saida"?"Do último estado à continuação":activeId==="ciclo"?"Repetição autoregressiva":"Preparação da entrada"}</p></div><div className="compass-flow">
    {chip("Texto → tokens","tokens",activeId==="tokens","#747f91")}
    {chip("Embedding","vetores",activeId==="vetores","#747f91","linha copiada da matriz E")}
    {chip("＋ posição","ordem",activeId==="ordem","#267bc0","vetor posicional aprendido")}
    <div className={`compass-block ${block?"block-here":""}`}><div className="compass-block-label"><b>1 bloco</b><span>repetir 96 vezes</span></div><div className="compass-block-inner">
      <div className="compass-residual-group">
        {chip("Normalizar","normalizacao",norm,"#6754b8")}
        {chip("Autoatenção causal","atencao",attention,"#12847b",activeId==="qkv"?"Q · K · V":activeId==="softmax"?"softmax dos escores":"múltiplas cabeças")}
        {chip("＋ estado anterior","transformer",false,"#a4662b")}
      </div>
      <div className="compass-residual-group">
        {chip("Normalizar","normalizacao",norm,"#6754b8")}
        {chip("MLP","mlp",mlp,"#b74374","expandir → GELU → comprimir")}
        {chip("＋ estado anterior","transformer",false,"#a4662b")}
      </div>
    </div></div>
    {chip("Normalização final","normalizacao",norm,"#6754b8")}
    {chip("Matriz de saída","saida",activeId==="saida","#267bc0","usa a última posição")}
    {chip("Softmax → token","saida",activeId==="saida"||activeId==="ciclo","#12847b")}
  </div><p className="compass-direction">↑ Leia de baixo para cima.<br/>Toque em uma etapa para explorá-la.</p><p className="compass-recur">↺ O token escolhido é anexado ao texto.</p><details className="compass-origin"><summary>Por que não é a figura de 2017?</summary><p>O Transformer original combina encoder e decoder. GPT‑3 é decoder-only: não tem encoder separado nem atenção cruzada. Usa normalização antes das subcamadas, além de uma normalização final.</p><p>Adaptado conceitualmente de <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">Vaswani et al.</a> e da arquitetura descrita por <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noreferrer">Brown et al.</a>; não é a figura original.</p></details></div>;
  return compact?<details className="architecture-compact"><summary>◎ Você está na arquitetura</summary>{diagram}</details>:<aside className="architecture-compass" aria-label="Localização na arquitetura Transformer">{diagram}</aside>;
}
