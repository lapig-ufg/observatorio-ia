# Coruja do "Qual modelo usar"

Worker da Cloudflare que dá IA à coruja da página **Panorama › Qual modelo usar**. É separado do Worker do curso
"Do chat ao agente" (`coruja-observatorio`), para um não derrubar o outro.

## O que a IA faz e o que nunca faz

- **Leitura**, **relatório** e **pergunta**: a página manda os números já calculados e um texto pronto; a IA só
  reescreve em linguagem simples. **Toda resposta passa por `numerosConferem`**: se aparecer um número que não veio
  da página (exceto até 10 e a escala 0–100), a resposta é descartada e a página mostra o texto dela.
- **Equipe**: a IA traduz uma frase ("tenho o ChatGPT grátis e o Claude Pro") em ids de planos da lista enviada.
  Ids fora da lista são descartados.
- A página funciona inteira sem o Worker: sem endereço configurado, as quatro ações usam textos montados no
  navegador (`src/panorama/guia/Coruja.tsx`).
- Dados pessoais (e-mail, CPF, telefone, caminho de usuário) saem antes de ir à IA. O log guarda só o modo e os
  tokens, nunca o texto.

## "Pergunte ao Observatório" (conversa com ferramentas, desde 23/11/2026)

Pedido `{ pergunta, memoria, idioma }`, sem `modo`. A IA escolhe ferramentas do motor do guia de modelos
(`src/panorama/guia/motor/motor.mjs`), que calcula todos os números; `conversa.mjs` confere a resposta e, se aparecer número
que não veio das ferramentas, usa o texto calculado pelo motor (`conferida: false`). Resposta:
`{ ok, titulo, texto[], blocos[], apontar, fontes[], memoria, uso, conferida }`.

- Dados: os `guia-*.json` publicados do Panorama (`PANORAMA_ASSETS`), com cache de 1 h; `perfis.json` vai
  junto no worker.
- `src/panorama/guia/motor/` (o mesmo que a página usa) é cópia do repositório conselheiro-ia. Ao mudar lá, copiar de novo e rodar `teste-observatorio.mjs`.
- Limites da conversa: pergunta de até 500 caracteres, até 4 ferramentas e 5 rodadas por pergunta, memória de 2
  trocas (limpa no worker, porque vem do navegador). Cada pergunta conta 1 nos limites de aparelho e do dia.
- Cada pergunta gasta mais que a coruja antiga (2 a 3 chamadas à IA, cerca de 7 mil tokens de entrada cada).
- Teste no PC, com o Ollama local: `node workers/coruja-guia/teste-observatorio.mjs`.

## Limites

40 perguntas por aparelho por dia, 6 por minuto, 800 no total por dia (`nucleo.mjs`, `LIMITES`). O aparelho é um
número sorteado no navegador. Custo estimado com o DeepSeek V4.1 Flash no Ollama Cloud: cerca de US$ 0,002 por
pergunta; o teto de 800 por dia daria no máximo uns US$ 1,60 por dia.

## Publicar (precisa do Victor)

Duas coisas são credenciais e ficam com o Victor:

1. Entrar na Cloudflare, na mesma conta do Worker do curso (`observatorio-ufg-ia`):
   ```
   npx wrangler login
   ```
2. Nesta pasta, publicar e guardar a chave do Ollama como segredo (o wrangler pede para colar a chave):
   ```
   npx wrangler deploy
   npx wrangler secret put OLLAMA_CHAVE
   ```
3. Copiar o endereço que o `deploy` mostrar (algo como `https://coruja-guia-modelos.<conta>.workers.dev`) e pôr
   na variável `VITE_CORUJA_GUIA_URL` do repositório (Settings › Variables › Actions) e no passo de build do
   workflow `deploy-pages.yml` (linha `VITE_CORUJA_GUIA_URL: ${{ vars.CORUJA_GUIA_URL }}`).

Desligar a IA sem apagar nada: trocar `IA_LIGADA` para `"nao"` no `wrangler.toml` e publicar de novo.

## Testes

- `node --test tests/coruja-guia.test.mjs` (na raiz do Observatório): números, limpeza de dados, equipe, regras,
  limites.
- `node workers/coruja-guia/teste-local.mjs`: chama o Ollama de verdade com uma chave local (variável
  `OLLAMA_CHAVE` ou arquivo em `OLLAMA_CHAVE_ARQUIVO`) e mostra as quatro respostas.
- Em 17/11/2026 os prompts foram testados com o DeepSeek V4.1 Flash: leitura correta com só os números enviados,
  "uso o chatgpt de graça e pago o claude pro" → `chatgpt-free` e `claude-pro`, e o pedido para ignorar as regras
  foi recusado.
