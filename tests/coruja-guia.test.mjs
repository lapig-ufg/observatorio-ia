import assert from "node:assert/strict";
import test from "node:test";
import { lerEquipe, limpar, mensagens, numerosConferem, novoEstado, reservar, validar, LIMITES } from "../workers/coruja-guia/nucleo.mjs";

const corpo = { modo: "leitura", resumo: "Opus vai de 34,8 a 59,1 pontos", estado: { primeiros: [{ modelo: "Opus", nota: 59.1, custo: 10.04, tempo_s: 750 }] } };

test("a resposta da IA só passa se todo número dela veio da página", () => {
  assert.equal(numerosConferem("O Opus vai de 34,8 a 59,1 pontos e custa US$ 10,04, numa escala de 0 a 100.", corpo), true);
  assert.equal(numerosConferem("Diferença de 1 ponto é empate; o tempo chega a 750 segundos.", corpo), true);
  assert.equal(numerosConferem("A assinatura custa US$ 20 por mês.", corpo), false, "preço inventado");
  assert.equal(numerosConferem("O Opus tem 61,3 pontos.", corpo), false, "nota inventada");
});

test("o pedido é validado e os dados pessoais saem antes de ir à IA", () => {
  assert.equal(validar({ modo: "leitura" }), "");
  assert.equal(validar({ modo: "outro" }), "modo desconhecido");
  assert.equal(validar({ modo: "pergunta", texto: " " }), "esperava um texto");
  assert.equal(validar([]), "esperava JSON");
  const limpo = limpar("sou maria@ufg.br, CPF 123.456.789-09, fone (62) 99999-1234, pasta C:\\Users\\maria\\docs");
  assert.doesNotMatch(limpo, /maria@|123\.456|99999|Users\\maria/);
});

test("equipe: só ids da lista enviada; o resto é ignorado", () => {
  const pedido = { modo: "equipe", texto: "tenho o claude pro", planos: [{ id: "claude-pro", nome: "Claude Pro" }] };
  assert.deepEqual(lerEquipe('{"planos": ["claude-pro", "inventado"]}', pedido), ["claude-pro"]);
  assert.deepEqual(lerEquipe("não é json", pedido), []);
  const [sistema] = mensagens(pedido);
  assert.match(sistema.content, /claude-pro: Claude Pro/);
});

test("as regras proíbem número de fora, recomendação e escrevem no idioma da página", () => {
  const [pt] = mensagens({ ...corpo, idioma: "pt" });
  assert.match(pt.content, /Nunca escreva um número que não esteja nos DADOS/);
  assert.match(pt.content, /Não recomende nem eleja "o melhor"/);
  assert.match(pt.content, /vírgula decimal/);
  const [en] = mensagens({ ...corpo, idioma: "en" });
  assert.match(en.content, /Answer in English\./);
  assert.match(en.content, /decimal point/);
});

test("limites por aparelho e teto do dia", () => {
  const estado = novoEstado();
  let agora = 1_000_000;
  for (let i = 0; i < LIMITES.aparelhoMinuto; i++) assert.equal(reservar(estado, { aparelho: "a", agora, dia: "2026-11-17" }).ok, true);
  assert.equal(reservar(estado, { aparelho: "a", agora, dia: "2026-11-17" }).status, 429, "rajada");
  agora += 61_000;
  assert.equal(reservar(estado, { aparelho: "a", agora, dia: "2026-11-17" }).ok, true, "depois de um minuto volta");
  estado.geral = LIMITES.geralDia;
  assert.equal(reservar(estado, { aparelho: "b", agora, dia: "2026-11-17" }).ok, false, "teto geral");
  assert.equal(reservar(estado, { aparelho: "b", agora, dia: "2026-11-18" }).ok, true, "novo dia zera");
});
