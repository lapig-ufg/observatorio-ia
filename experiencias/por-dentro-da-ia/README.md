# Por dentro da IA — Da frase ao próximo token

Experiência interativa de inferência para a disciplina de sensoriamento remoto do LAPIG/UFG. Integra o Observatório UFG-IA no mesmo repositório e publicação.

- Entrada: botão **Por dentro da IA** na seção **Experiências interativas** do Observatório.
- Aula: https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/
- Retorno: botão **Voltar ao Observatório** no cabeçalho da aula, na mesma aba.

## Conteúdo e rigor

19 capítulos, GPT-3 175B como referência, sem treinamento nesta jornada. Os exemplos usam pesos didáticos inventados e fixos, não parâmetros reais do GPT-3. Os controles fazem cálculos locais; não há chamada a um LLM, chave de API ou autenticação.

Fonte narrativa: [ensaio da IBM](https://www.ibm.com/think/news/what-does-ai-look-like). Referências e ressalvas aparecem na aula. Migração da versão local `inferencia-interativa`, commit `92735295192f00c5b8acabead39e83bcc8aa08b8`, em 05/09/2026. A versão anterior em chatgpt.site foi preservada.

## Manutenção

Esta pasta é a fonte canônica da versão institucional. Requer Node 22.13+ e pnpm 11.7.0. Da raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm --dir experiencias/por-dentro-da-ia install --frozen-lockfile
pnpm test
pnpm build:all
```

React/Vite pré-renderiza os capítulos durante a compilação e ativa as interações no navegador. Não existe servidor de aplicação na hospedagem. O fluxo único do Observatório publica o portal e copia apenas o resultado estático da aula para `dist/por-dentro-da-ia/`. Nunca publicar `.prerender/`, `node_modules/` ou um segundo workflow que substitua o portal pela aula.

Acessos públicos e metadados usam o prefixo `/observatorio-ia/por-dentro-da-ia/`. Não usar diretamente o arquivo-fonte index.html via file://; usar a publicação ou a prévia do Vite.

O repositório público não concede automaticamente uma licença de reutilização. Respeitar direitos de terceiros e definir a licença institucional antes da redistribuição.
