import assert from "node:assert/strict";
import test from "node:test";
import { categoriaArena } from "../src/panorama/guia/motor/arena.mjs";
import { carregar, ranking, comparar_fontes } from "../src/panorama/guia/motor/motor.mjs";
import { perguntar } from "../workers/coruja-guia/observatorio.mjs";

test("consulta o líder de escrita na Arena mesmo quando o catálogo do guia está indisponível", async () => {
  const result = await perguntar({}, { pergunta: "Qual era a IA no top1 de escrito do llmarena?" }, {
    ia: () => assert.fail("A classificação vem da Arena"),
    buscar: async (url) => {
      const params = new URL(url).searchParams;
      assert.equal(params.get("config"), "text_style_control");
      assert.equal(params.get("split"), "latest");
      assert.equal(params.get("where"), `"category" = 'creative_writing' AND "rank" = 1`);
      return Response.json({ rows: [{ row: { category: "creative_writing", rank: 1, model_name: "Modelo fora do catálogo", leaderboard_publish_date: "2026-11-22" } }] });
    },
  });
  assert.match(result.titulo, /Modelo fora do catálogo · 1º lugar em escrita criativa/);
  assert.equal(result.fontes[0].coletado_em, "2026-11-22");
  assert.match(result.fontes[0].url, /arena\.ai\/.*creative-writing$/);
  assert.equal(categoriaArena("quais são os modelos do top 10 de escrita no LMArena?"), null);
});

test("oferece a classificação oficial quando o dataset da Arena está indisponível", async () => {
  const result = await perguntar({}, { pergunta: "Quem lidera em escrita no LMArena?" }, {
    buscar: async () => new Response(null, { status: 503 }),
  });
  assert.match(result.titulo, /indisponível/);
  assert.match(result.fontes[0].url, /creative-writing$/);
  assert.equal(result.fontes[0].coletado_em, undefined);
});

const modelos = {
  families: Array.from({ length: 18 }, (_, i) => ({
    id: "model-" + i, name: "Modelo " + i, creator: "Teste",
    variants: [{ effort: "max", scores: { intelligence: 100 - i }, e2e_s: 100 - i, cost_per_task: 1 + i }],
  })),
};

test("o ranking completo preserva posição e limite das respostas do chat", () => {
  const base = carregar({ modelos });
  const completo = ranking(base, {}, { completo: true });
  assert.deepEqual(completo.linhas.slice(0, 10), ranking(base).linhas);
  assert.equal(completo.linhas[15].posicao, 16);
  assert.equal(completo.linhas[15].modelo, "model-15");
  assert.equal(ranking(base, { ordenar: "tempo" }).linhas[0].modelo, "model-17");
  assert.deepEqual(ranking(base, { filtros: { nota_min: 101 } }, { completo: true }).linhas, []);
});

test("os benchmarks podem mostrar medições mesmo quando um modelo não tem dado", () => {
  const fontes = {
    sources: { lmarena: { name: "LMArena" }, epoch: { name: "Epoch AI" } },
    families: {
      "model-0": {
        lmarena: [
          { effort: "low", overall: { rating: 1400 } },
          { effort: "high", overall: { rating: 1300 }, categories: { creative_writing: { rating: 1350, rank: 12 } } },
        ],
        epoch: { effort: "max", benchmarks: { math: { label: "Math", score: 0 } } },
      },
    },
  };
  const base = carregar({ modelos, fontes });
  const opcoes = { itens: ["model-0", "model-1"] };
  const arena = (result) => result.fontes_comparadas.find((f) => f.id === "lmarena");
  assert.deepEqual(arena(comparar_fontes(base, opcoes)).linhas, []);
  const comParciais = comparar_fontes(base, { ...opcoes, incluirParciais: true });
  assert.deepEqual(arena(comParciais).esforcos, ["high", null]);
  assert.equal(arena(comParciais).linhas[0].notas[0].nota, 1300);
  assert.equal(arena(comParciais).linhas[0].notas[1], null);
  assert.equal(arena(comParciais).linhas[0].lider, null);
  assert.deepEqual(comParciais.fontes_comparadas.find((f) => f.id === "epoch").linhas[0].notas, [0, null]);
});
