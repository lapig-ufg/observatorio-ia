# Observatório UFG-IA | LAPIG/UFG

## Experiência “Por dentro da IA”

A aula interativa integra este repositório em `experiencias/por-dentro-da-ia/`. Seu botão aparece na seção **Experiências interativas** da página inicial. O botão **Voltar ao Observatório**, no cabeçalho da aula, retorna à mesma seção.

Endereço: https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/

Para publicar o conjunto, instalar também as dependências da aula com `pnpm --dir experiencias/por-dentro-da-ia install --frozen-lockfile` e executar `pnpm build:all`. Esse comando compila portal e aula, testa a experiência e reúne tudo em `dist/`. O workflow do Observatório já usa esse procedimento; não criar uma publicação independente que substitua o portal.

Catálogo público de conteúdos sobre inteligência artificial. O projeto é uma
aplicação React/Vite estática, preparada para GitHub Pages, que carrega os
itens diretamente de uma aba publicada do Google Sheets.

## Categorias do acervo

- `medium`: artigos publicados no Medium.
- `documento`: documentos gerais.
- `link-video`: links e vídeos.
- `noticia`: jornais e notícias diárias.
- `paper`: papers científicos sobre IA.
- `apresentacao`: apresentações sobre IA.

Os nomes anteriores `opiniao` e `cientifico` continuam aceitos e são convertidos
automaticamente para `medium` e `paper`. As pastas de origem ficam no Google
Drive; a planilha publica somente os links de leitura definidos para cada item.

## Arquitetura

- `src/`: interface, busca, filtros e leitura do Google Sheets.
- `public/catalogo.csv`: cópia local de contingência e demonstração.
- `public/catalogo-en.csv`: cópia validada da aba traduzida para a versão `/en/`.
- `public/covers/`: capas dos artigos.
- `outputs/observatorio-ia/Catalogo_Observatorio_IA.xlsx`: planilha-mestre para importação no Google Sheets.
- `data/controle-duplicatas.csv`: hashes e assinaturas para controle de duplicidade.
- `scripts/build-catalog.mjs`: atualização local do CSV, das capas e do controle de duplicatas.
- `.github/workflows/deploy-pages.yml`: teste, build e publicação automática no GitHub Pages.

## Executar localmente

Requer Node.js 22 ou superior e pnpm.

```bash
pnpm install
pnpm dev
```

Validação completa:

```bash
pnpm test
pnpm build
pnpm preview
```

## Conectar o Google Sheets

1. Importe `Catalogo_Observatorio_IA.xlsx` no Google Sheets.
2. Não altere os nomes das colunas da aba `Catalogo`.
3. Confirme que a planilha pode ser consultada pelo Google Visualization API.
4. No repositório GitHub, abra **Settings > Secrets and variables > Actions > Variables**.
5. Crie `GOOGLE_SHEETS_ID` com o identificador da planilha.
6. Crie `GOOGLE_SHEETS_GID` com o identificador numérico da aba `Catalogo`.
7. Crie `GOOGLE_SHEETS_INITIATIVES_GID` com o identificador numérico da aba `Iniciativas`.
8. Crie `GOOGLE_SHEETS_EN_GID` com o identificador numérico da aba `Catalogo_EN`.

`Catalogo_EN` deve manter os mesmos IDs e links de `Catalogo`. Tema, subtema,
título, resumo e palavras-chave podem ser traduzidos com `GOOGLETRANSLATE`; os
demais campos devem apenas referenciar a célula correspondente da aba original.

O site consulta a planilha no navegador a cada abertura e repete a consulta a
cada minuto. Antes de testar e compilar, o workflow atualiza
`public/catalogo.csv` e `public/catalogo-en.csv` com
`pnpm catalog:sync-fallback`. A sincronização só é concluída se as duas versões
tiverem os mesmos IDs e se nenhuma fórmula de tradução estiver pendente ou com
erro. Se a planilha estiver temporariamente indisponível, cada idioma usa sua
última cópia validada.

> A aba publicada é pública. Não publique a aba `Controle` nem coloque nela
> dados pessoais, caminhos locais ou informações confidenciais.

## Publicar no GitHub Pages

1. Crie ou escolha um repositório na organização `lapig-ufg`.
2. Envie todo o conteúdo deste diretório para a branch `main`.
3. Em **Settings > Pages > Build and deployment**, escolha **GitHub Actions**.
4. Cadastre as quatro variáveis do Google Sheets conforme a seção anterior.
5. Execute o workflow **Deploy Observatório UFG-IA to GitHub Pages** ou faça um novo push na `main`.

O endereço será `https://lapig-ufg.github.io/NOME-DO-REPOSITORIO/`. Se o
repositório se chamar `lapig-ufg.github.io`, o site será publicado na raiz desse
domínio. A configuração relativa do Vite funciona nos dois casos.

A versão em inglês é publicada no subdiretório `/en/`. O seletor de idioma
permite alternar entre português e inglês.

## PDFs institucionais

GitHub Pages não possui autenticação de usuários. Para manter a regra de acesso
por e-mail institucional, hospede os PDFs no Google Drive com as permissões da
UFG e informe os respectivos endereços na coluna `url_pdf_institucional`.
O botão aparecerá no site, mas o próprio Google Drive fará a autenticação.

## Atualizar o acervo local

O gerador requer os utilitários Poppler (`pdfinfo`, `pdftoppm` e `pdftotext`):

```bash
pnpm catalog:build
```

O processo gera a cópia CSV e registra SHA-256 do arquivo, SHA-256 do texto
normalizado e SimHash do conteúdo. Esses três identificadores ajudam a detectar
PDFs idênticos e artigos com o mesmo texto em arquivos diferentes.
