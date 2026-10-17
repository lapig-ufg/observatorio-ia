import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

/* A lógica da régua (empilhamento, trilhas, filtros, meses, CSV) é pura e
   vive em panoramaTimeline.ts sem importar nada — este arquivo é transpilado
   sozinho, como tests/panorama-data.test.mjs faz com panoramaData.ts. A
   tradução de rótulos chega por parâmetro, porque é apresentação, não regra. */
const source = fs.readFileSync("src/panoramaTimeline.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const timeline = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("detalhe fica no viewport mesmo quando o catálogo tardio desloca a âncora", () => {
  const anchor = { left: 500, top: 300, bottom: 330, width: 100 };
  assert.equal(timeline.popoverPlacement(anchor, 1280, 900, 80).top, 340, "abaixo quando cabe");
  assert.equal(timeline.popoverPlacement({ ...anchor, top: 700, bottom: 730 }, 1280, 900, 80).top, 330, "acima perto do rodapé");
  for (const moved of [{ ...anchor, top: -800, bottom: -770, left: -200 }, { ...anchor, top: 1600, bottom: 1630, left: 1400 }]) {
    const box = timeline.popoverPlacement(moved, 1280, 900, 80);
    assert.ok(box.top >= 90 && box.top + box.maxHeight <= 890);
    assert.ok(box.left >= 10 && box.left + box.width <= 1270);
  }
});

/* Fabrica um item já enriquecido — o componente faz isso com as regras de
   panoramaData.ts, que têm testes próprios. Aqui interessa o desenho. */
function item(overrides = {}) {
  return {
    id: "x",
    date: "2024-05-15",
    days: 532,
    company: "OpenAI",
    model: "GPT-4o",
    impact: "",
    reference: "https://example.com",
    level: 1,
    ecosystem: "ECOSSISTEMA NORTE-AMERICANO",
    country: "Estados Unidos",
    color: "#10a37f",
    logoPath: "",
    known: true,
    ...overrides,
  };
}

test("pílulas na mesma trilha não se sobrepõem: cada lane guarda onde terminou", () => {
  const sameDay = [
    item({ id: "a", model: "Alpha", days: 100 }),
    item({ id: "b", model: "Beta", days: 100 }),
    item({ id: "c", model: "Gamma", days: 100 }),
  ];
  const placed = timeline.stackPills(sameDay, 1.5, 170, 24);
  assert.equal(placed.length, 3);
  // Mesma data: uma pílula por lane, contornando o eixo.
  assert.deepEqual(placed.map((pill) => pill.lane), [0, 1, 2]);
  assert.deepEqual(placed.map((pill) => pill.laneOffset), [0, -40, 40]);

  // Em uma lane, cada pílula começa depois da anterior + folga (120px entre
  // datas a 1,5px/dia dá folga para pílulas de ~92px).
  const spread = [0, 120, 240, 360].map((days, index) => item({ id: `s${index}`, days, model: "Modelo" }));
  const lane0 = timeline.stackPills(spread, 1.5, 170, 24).filter((pill) => pill.lane === 0);
  assert.equal(lane0.length, 4);
  for (let index = 1; index < lane0.length; index += 1) {
    assert.ok(lane0[index].x >= lane0[index - 1].x + lane0[index - 1].width + 10,
      "pílula da mesma lane encostou na anterior");
  }

  // O antigo teto é apenas compatibilidade de chamada: dados densos abrem
  // novas faixas em vez de esconder rótulos por sobreposição.
  const dense = Array.from({ length: 40 }, (_, index) => item({ id: `d${index}`, days: index, model: `M${index}` }));
  const crammed = timeline.stackPills(dense, 0.2, 170, 4);
  assert.equal(crammed.length, 40);
  assert.ok(Math.max(...crammed.map(pill => pill.lane)) >= 4);
  for (let i = 0; i < crammed.length; i++) for (let j = i + 1; j < crammed.length; j++) {
    const a = crammed[i], b = crammed[j];
    assert.ok(a.lane !== b.lane || a.x + a.width + 10 <= b.x || b.x + b.width + 10 <= a.x);
  }
});

test("a altura da trilha cresce com a lane mais alta usada", () => {
  assert.equal(timeline.trackHeight([], 72), 72);
  const one = timeline.stackPills([item({ days: 0 }), item({ days: 0 })], 1.5, 170, 24);
  const three = timeline.stackPills([item({ days: 0 }), item({ days: 0 }), item({ days: 0 })], 1.5, 170, 24);
  // O eixo é central: reserva simétrica mesmo com apenas uma faixa acima.
  assert.equal(timeline.trackHeight(one, 72), 136);
  assert.equal(timeline.trackHeight(three, 72), 136);
});

test("trilhas por ecossistema: empresa nos EUA/China, país em Outros, cauda no Outros", () => {
  const items = [
    item({ id: "1", company: "OpenAI", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", country: "Estados Unidos", days: 10 }),
    item({ id: "1b", company: "OpenAI", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", country: "Estados Unidos", days: 12 }),
    item({ id: "2", company: "Anthropic", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", country: "Estados Unidos", days: 20 }),
    item({ id: "3", company: "Laboratório Novo", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 30 }),
    item({ id: "4", company: "DeepSeek", known: true, ecosystem: "ECOSSISTEMA CHINÊS", country: "China", days: 15 }),
    item({ id: "5", company: "Sakana AI", known: true, ecosystem: "OUTROS PAÍSES", country: "Japão", days: 25 }),
    item({ id: "5b", company: "Sakana AI", known: true, ecosystem: "OUTROS PAÍSES", country: "Japão", days: 27 }),
    item({ id: "6", company: "LG AI Research", known: true, ecosystem: "OUTROS PAÍSES", country: "Coreia do Sul", days: 35 }),
    item({ id: "7", company: "Desconhecida Ltda", known: false, ecosystem: "OUTROS PAÍSES", country: "", days: 40 }),
  ];
  const groups = timeline.buildTimelineGroups(items, { other: "Outros" });
  assert.deepEqual(groups.map((group) => group.ecosystem), [
    "ECOSSISTEMA NORTE-AMERICANO",
    "ECOSSISTEMA CHINÊS",
    "OUTROS PAÍSES",
  ]);

  const [na, china, outros] = groups;
  // Empresas com identidade têm trilha própria (por contagem, depois nome);
  // desconhecida cai no "Outros".
  assert.deepEqual(na.tracks.map((track) => track.label), ["OpenAI", "Anthropic", "Outros"]);
  assert.equal(na.tracks.at(-1).kind, "other");
  assert.deepEqual(na.tracks.at(-1).items.map((entry) => entry.company), ["Laboratório Novo"]);
  assert.deepEqual(na.tracks[0].items.map((entry) => entry.days), [10, 12]);

  // Em Outros Países a trilha é por país, não por empresa, e sem país cai no
  // "Outros" — país não é chutado. Duas empresas do mesmo país dividem a faixa.
  assert.deepEqual(outros.tracks.map((track) => track.label), ["Japão", "Coreia do Sul", "Outros"]);
  assert.equal(outros.tracks[0].kind, "country");
  assert.equal(outros.tracks[0].items.length, 2, "dois lançamentos da Sakana na mesma faixa Japão");
  assert.deepEqual(outros.tracks[0].items.map((entry) => entry.days), [25, 27], "cronológico dentro da faixa");
  assert.deepEqual(outros.tracks.at(-1).items.map((entry) => entry.company), ["Desconhecida Ltda"]);

  // Itens da trilha em ordem cronológica.
  assert.deepEqual(na.tracks[0].items.map((entry) => entry.days), [10, 12]);
  assert.deepEqual(china.tracks.map((track) => track.label), ["DeepSeek"]);

  // Grupos vazios não são desenhados.
  const onlyChina = timeline.buildTimelineGroups(items.filter((entry) => entry.ecosystem === "ECOSSISTEMA CHINÊS"), { other: "Outros" });
  assert.deepEqual(onlyChina.map((group) => group.ecosystem), ["ECOSSISTEMA CHINÊS"]);
});

test("a ampliada promove empresas com >= 3 modelos mesmo sem identidade visual", () => {
  const items = [
    item({ id: "1", company: "OpenAI", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 10 }),
    item({ id: "2", company: "OpenAI", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 11 }),
    item({ id: "3", company: "OpenAI", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 12 }),
    item({ id: "4", company: "Liquid AI", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 20 }),
    item({ id: "5", company: "Liquid AI", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 21 }),
    item({ id: "6", company: "Liquid AI", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 30 }),
    item({ id: "7", company: "Desconhecida", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 40 }),
    item({ id: "8", company: "Meta", known: true, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 50 }),
    item({ id: "9", company: "Nous Research", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 60 }),
    item({ id: "10", company: "Nous Research", known: false, ecosystem: "ECOSSISTEMA NORTE-AMERICANO", days: 61 }),
  ];
  const labels = { other: "Outros" };

  // Padrão: toda empresa com identidade tem faixa própria (comportamento da fase 1).
  const standard = timeline.buildTimelineGroups(items, labels);
  assert.deepEqual(standard[0].tracks.map((track) => track.label), ["OpenAI", "Meta", "Outros"]);

  // A trilha existente da Meta permanece com um único modelo. Liquid ganha
  // trilha sem exigir cor/logo; a cauda com 1–2 modelos continua no Outros.
  const options = { minCompanyTrack: timeline.MIN_COMPANY_TRACK, population: items };
  const expanded = timeline.buildTimelineGroups(items, labels, options);
  assert.deepEqual(expanded[0].tracks.map((track) => track.label), ["OpenAI", "Meta", "Liquid AI", "Outros"]);
  assert.deepEqual(expanded[0].tracks[3].items.map((entry) => entry.company), ["Desconhecida", "Nous Research", "Nous Research"]);
  assert.equal(expanded[0].tracks[3].kind, "other");
  assert.deepEqual(expanded[0].tracks[2].items.map((entry) => entry.id), ["4", "5", "6"]);
  const filtered = timeline.buildTimelineGroups(items.filter(item => item.id === "4"), labels, options);
  assert.equal(filtered[0].tracks[0].label, "Liquid AI", "busca não desfaz a promoção");
  const chinese = items.map(item => ({ ...item, ecosystem: "ECOSSISTEMA CHINÊS" }));
  assert.ok(timeline.buildTimelineGroups(chinese, labels, { minCompanyTrack: 3 })[0].tracks.some(track => track.label === "Liquid AI"));

  // Em Outros Países o agrupamento continua por país, mesmo no modo ampliado.
  const abroad = timeline.buildTimelineGroups([
    item({ id: "a", company: "Sakana AI", known: true, ecosystem: "OUTROS PAÍSES", country: "Japão", days: 1 }),
    item({ id: "b", company: "AI21 Labs", known: true, ecosystem: "OUTROS PAÍSES", country: "Israel", days: 2 }),
  ], labels, { minCompanyTrack: timeline.MIN_COMPANY_TRACK });
  assert.deepEqual(abroad[0].tracks.map((track) => track.label), ["Israel", "Japão"]);
});

test("trilhas por país são traduzidas pelos rótulos", () => {
  const items = [item({ company: "Sakana AI", ecosystem: "OUTROS PAÍSES", country: "Japão" })];
  const groups = timeline.buildTimelineGroups(items, { other: "Other", countries: { "Japão": "Japan" } });
  assert.equal(groups[0].tracks[0].label, "Japan");
});

test("filtros combinam ecossistema, conjunto de empresas e busca sem acento", () => {
  const items = [
    item({ id: "1", model: "GPT-4o", company: "OpenAI", ecosystem: "ECOSSISTEMA NORTE-AMERICANO" }),
    item({ id: "2", model: "DeepSeek-V3", company: "DeepSeek", ecosystem: "ECOSSISTEMA CHINÊS" }),
    item({ id: "3", model: "MiniMax-Text-01", company: "MiniMax", ecosystem: "ECOSSISTEMA CHINÊS" }),
  ];
  assert.equal(timeline.filterTimelineItems(items, { ecosystem: "", companies: [], query: "" }).length, 3);
  assert.deepEqual(timeline.filterTimelineItems(items, { ecosystem: "ECOSSISTEMA CHINÊS", companies: [], query: "" }).map((entry) => entry.id), ["2", "3"]);
  // Várias empresas selecionadas ao mesmo tempo: o seletor tem caixas de seleção.
  assert.deepEqual(timeline.filterTimelineItems(items, { ecosystem: "", companies: ["DeepSeek", "MiniMax"], query: "" }).map((entry) => entry.id), ["2", "3"]);
  assert.deepEqual(timeline.filterTimelineItems(items, { ecosystem: "", companies: ["OpenAI"], query: "" }).map((entry) => entry.id), ["1"]);
  // "minimax" acha "MiniMax-Text-01"; "deepseek" acha "DeepSeek-V3".
  assert.deepEqual(timeline.filterTimelineItems(items, { ecosystem: "", companies: [], query: "minimax" }).map((entry) => entry.id), ["3"]);
  assert.deepEqual(timeline.filterTimelineItems(items, { ecosystem: "", companies: [], query: "DEEPSEEK" }).map((entry) => entry.id), ["2"]);
  assert.equal(timeline.filterTimelineItems(items, { ecosystem: "ECOSSISTEMA NORTE-AMERICANO", companies: [], query: "deep" }).length, 0);
});

test("chips de filtro trazem contagens por ecossistema e empresa", () => {
  const options = timeline.filterOptions([
    item({ company: "OpenAI", ecosystem: "ECOSSISTEMA NORTE-AMERICANO" }),
    item({ company: "OpenAI", ecosystem: "ECOSSISTEMA NORTE-AMERICANO" }),
    item({ company: "DeepSeek", ecosystem: "ECOSSISTEMA CHINÊS" }),
  ]);
  assert.deepEqual(options.ecosystems, [
    { name: "ECOSSISTEMA NORTE-AMERICANO", count: 2 },
    { name: "ECOSSISTEMA CHINÊS", count: 1 },
    { name: "OUTROS PAÍSES", count: 0 },
  ]);
  assert.deepEqual(options.companies, [
    { name: "OpenAI", count: 2 },
    { name: "DeepSeek", count: 1 },
  ]);
});

test("agrupamento por mês: mais recente primeiro, lançamentos do mês também", () => {
  const label = (year, month) => `${year}-${month}`;
  const items = [
    item({ id: "a", date: "2026-09-02", days: 1372 }),
    item({ id: "b", date: "2026-10-15", days: 1415 }),
    item({ id: "c", date: "2026-10-01", days: 1401 }),
  ];
  const months = timeline.groupedByMonth(items, label);
  assert.deepEqual(months.map((month) => month.key), ["2026-10", "2026-09"]);
  assert.deepEqual(months[0].label, "2026-9");
  assert.deepEqual(months[0].items.map((entry) => entry.id), ["b", "c"]);
  assert.deepEqual(timeline.groupedByMonth([], label), []);
});

test("últimas adições preservam seleção por updatedAt e exibem por lançamento decrescente", () => {
  const day = 86_400_000;
  const now = Date.parse("2026-10-15T00:00:00Z");
  const items = [
    item({ id: "recente", date: "2024-03-10", updatedAt: now - 2 * day }),
    item({ id: "velho", date: "2026-09-01", updatedAt: now - 90 * day }),
    item({ id: "sem-updated", date: "2026-08-01", updatedAt: 0 }),
    item({ id: "catalogo", date: "2026-07-01" }),
  ];
  // Primeiro escolhe as adições recentes; só então ordena por lançamento.
  const additions = timeline.latestAdditions(items, 4, now);
  assert.deepEqual(additions.map((addition) => addition.item.id), ["velho", "sem-updated", "catalogo", "recente"]);
  assert.deepEqual(additions.map((addition) => addition.isNew), [false, false, false, true]);
  // Contagem e empate por id (mesmo updatedAt não muda a ordem visível).
  assert.deepEqual(timeline.latestAdditions(items, 2, now).map((addition) => addition.item.id), ["sem-updated", "recente"]);
  const tied = [
    item({ id: "b", updatedAt: now - day }),
    item({ id: "a", updatedAt: now - day }),
  ];
  assert.deepEqual(timeline.latestAdditions(tied, 2, now).map((addition) => addition.item.id), ["a", "b"]);
  // O ponto âmbar vale só para adições com menos de 14 dias.
  assert.equal(timeline.NOVIDADES_DOT_DAYS, 14);
  const edge = timeline.latestAdditions([item({ id: "exato", updatedAt: now - 14 * day })], 1, now);
  assert.equal(edge[0].isNew, true, "14 dias contam como novo (corte inclusivo do Panorama)");
  const beyond = timeline.latestAdditions([item({ id: "fora", updatedAt: now - 15 * day })], 1, now);
  assert.equal(beyond[0].isNew, false);
});

test("iniciais da empresa sem logo: DS, OC e primeira letra", () => {
  assert.equal(timeline.companyInitials("DeepSeek"), "DS");
  assert.equal(timeline.companyInitials("OpenClaw"), "OC");
  assert.equal(timeline.companyInitials("Motif Technologies"), "M");
  assert.equal(timeline.companyInitials(""), "");
  // Duas letras usam fonte menor dentro do círculo (regra do render.js).
  assert.equal(timeline.initialsFontSize("DS"), 9);
  assert.equal(timeline.initialsFontSize("M"), 13);
});

test("zoom fica entre os limites e o encaixe usa a largura útil", () => {
  assert.equal(timeline.clampPxPerDay(0.1), 0.4);
  assert.equal(timeline.clampPxPerDay(9), 4);
  assert.equal(timeline.clampPxPerDay(1.23456), 1.23);
  assert.equal(timeline.fitPxPerDay(1200, 170, 200, 830), 1);
  assert.equal(timeline.fitPxPerDay(300, 170, 200, 830), 0.4, "contêiner estreito não desce abaixo do piso");
  assert.equal(timeline.fitPxPerDay(1200, 170, 200, 0), 0.4, "sem dias, fica no piso");
});

test("CSV sai ordenado, com acento escapado e o nível de curadoria", () => {
  const labels = {
    headers: ["Data", "Empresa", "Modelo", "Impacto", "Referência", "Nível"],
    levels: { 1: "marco", 2: "secundário", 3: "catálogo" },
  };
  const items = [
    item({ id: "1", date: "2026-02-01", model: "Beta", impact: 'Com "vírgula", acento e\nquebra', level: 2, days: 1 }),
    item({ id: "2", date: "2025-12-31", model: "Alfa", level: 3, days: 0, reference: "" }),
  ];
  const csv = timeline.timelineCsv(items, labels);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "Data,Empresa,Modelo,Impacto,Referência,Nível");
  assert.equal(lines[1], "2025-12-31,OpenAI,Alfa,,,catálogo", "ordenado por data, vazio sem aspas");
  assert.equal(lines[2], '2026-02-01,OpenAI,Beta,"Com ""vírgula"", acento e\nquebra",https://example.com,secundário');
});
