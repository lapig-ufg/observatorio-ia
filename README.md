# Observatório IA

Acervo público de leituras sobre inteligência artificial, organizado por tema e
com busca por título, autoria, fonte e palavras-chave. A área pública direciona
o leitor à publicação original; a área de alunos reserva o acesso aos PDFs para
contas institucionais autorizadas.

## Desenvolvimento

Requer Node.js 22.13 ou superior e pnpm.

```bash
pnpm install
pnpm dev
pnpm test
```

## Atualização do catálogo

O gerador lê os PDFs nas pastas temáticas do diretório `Medium_artigos`, extrai
metadados e produz o catálogo e as capas usadas pelo site:

```bash
node scripts/build-catalog.mjs
```

Depois da geração, execute `pnpm test` antes de publicar a nova versão.

## Acesso institucional

A rota `/alunos` exige autenticação e valida, no servidor, os domínios
`@ufg.br`, `@discente.ufg.br` e `@egresso.ufg.br`. Os PDFs protegidos são
servidos pela rota `/api/pdf/[id]` a partir do armazenamento privado `FILES`.

O banco `DB` mantém a estrutura para artigos e para a fila de novas inclusões.
