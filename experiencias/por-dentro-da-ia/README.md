# Por dentro da IA — aulas interativas

Trilha de duas aulas para a disciplina de sensoriamento remoto do LAPIG/UFG. Integra o Observatório UFG-IA no mesmo repositório e publicação.

- Entrada: botão **Por dentro da IA** na seção **Experiências interativas** do Observatório.
- Hub: https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/
- Aula 1: https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/
- Aula 2: https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/transformers/
- Retorno: logotipo do Observatório no cabeçalho de cada página, na mesma aba.

## Conteúdo e rigor

As duas aulas são independentes e estão ordenadas apenas por complexidade. A aula **Redes neurais** tem 26 capítulos e cinco playgrounds: construção, passagem direta, retropropagação, atualização dos pesos e treino/previsão. A rede didática é `[2, 3, 1]`, treinada no XOR, com cálculo integralmente local no navegador. O motor foi adaptado do projeto `neural-network-xray`: rede, passagem direta, retropropagação com regra da cadeia, gradiente descendente, momentum e previsão.

A aula **Transformers** mantém os 19 capítulos da jornada anterior: GPT-3 175B como referência, inferência com pesos fixos, atenção, MLP e geração autoregressiva.

Todos os exemplos usam pesos didáticos, fixos e calculados na página. Não há chamada a um LLM, chave de API ou autenticação. Os números da aula de redes neurais usam um gerador determinístico próprio; a mesma semente reproduz os mesmos valores no texto e no playground, sem prometer paridade bit a bit com o NumPy do projeto original.

Fonte narrativa da aula de Transformers: [ensaio da IBM](https://www.ibm.com/think/news/what-does-ai-look-like). A aula de redes neurais adapta a experiência [neural-network-xray](https://andresberejnoi.com/how-to-implement-backpropagation-with-numpy/). Referências e ressalvas aparecem nas aulas.

## Manutenção

Esta pasta é a fonte canônica da versão institucional. Requer Node 22.13+ e pnpm 11.7.0. Da raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm --dir experiencias/por-dentro-da-ia install --frozen-lockfile
pnpm test
pnpm build:all
```

React/Vite pré-renderiza as três páginas durante a compilação e ativa as interações no navegador. Não existe servidor de aplicação na hospedagem. O fluxo único do Observatório publica o portal e copia apenas o resultado estático da aula para `dist/por-dentro-da-ia/`. Nunca publicar `.prerender/`, `node_modules/` ou um segundo workflow que substitua o portal pela aula.

Acessos públicos e metadados usam o prefixo `/observatorio-ia/por-dentro-da-ia/`. Não usar diretamente os arquivos-fonte `index.html` via file://; usar a publicação ou a prévia do Vite.

O repositório público não concede automaticamente uma licença de reutilização. Respeitar direitos de terceiros e definir a licença institucional antes da redistribuição.
