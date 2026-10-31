# Observatório UFG-IA | LAPIG/UFG

## Experiência “Por dentro da IA”

As aulas interativas integram este repositório em `experiencias/por-dentro-da-ia/`. O botão aparece na seção **Experiências interativas** da página inicial. A entrada é um hub de aulas:

- https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/ — hub com a trilha recomendada.
- https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/redes-neurais/ — aula 1, redes neurais: do neurônio à retropropagação, com cinco playgrounds.
- https://lapig-ufg.github.io/observatorio-ia/por-dentro-da-ia/transformers/ — aula 2, Transformers: da frase ao próximo token.

As aulas estão ordenadas por complexidade, mas são independentes: redes neurais é a mais fundamental e Transformers é a mais avançada. Todas as páginas usam o logotipo do Observatório no cabeçalho para retornar à seção Experiências interativas do portal.

Para publicar o conjunto, instalar também as dependências da aula com `pnpm --dir experiencias/por-dentro-da-ia install --frozen-lockfile` e executar `pnpm build:all`. Esse comando compila portal e as três páginas, testa as experiências e reúne tudo em `dist/`. O workflow do Observatório já usa esse procedimento; não criar uma publicação independente que substitua o portal.

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

## Marca do Observatório

A marca oficial é a coruja da opção 01, aprovada em 16/10/2026. `public/brand/observatorio-coruja.svg` contém a versão vetorial do símbolo original, com fundo transparente, olhos brancos e cores planas verde `#114d3b` e terracota `#d76832`. Preservar a assimetria, o contorno e o desenho dos olhos; a imagem de referência permanece em `public/logos/assets/opcao-1.png`.

Os cabeçalhos português e inglês usam esse mesmo símbolo, acompanhado do nome em Georgia. O favicon usa a mesma arte sobre uma base clara para manter o contraste em abas claras e escuras. Há versões SVG, PNG de 32 pixels, ICO de 16/32/48/64 pixels e Apple Touch Icon de 180 pixels. A aula interativa e a página de propostas usam a mesma identidade. Ao atualizar os ícones, atualizar também a versão `coruja-1` nos links para invalidar o cache do navegador.

## Marcas institucionais

A fonte das marcas oficiais é `public/brand/lapig-iesa-ufg-approved.svg`, a composição aprovada pela comunicação da UFG. Os logos podem aparecer separados: `public/brand/ufg.svg`, `iesa.svg` e `lapig.svg` são recortes feitos apenas pelo `viewBox`, preservando os paths, as cores, os nomes por extenso e as proporções. Não usar PNGs nem substituir por símbolos isolados. No português, o bloco “Realização” fica imediatamente acima do rodapé, com UFG no topo e IESA/LAPIG abaixo; o inglês mantém a composição original no cabeçalho.

`InstitutionalBand` apresenta a arte vetorial original (viewBox 1127,49 × 265,53), com largura de exibição de 420 pixels, centralizada sobre fundo branco e reduzida proporcionalmente em telas estreitas. Três áreas de link sobre a imagem mantêm os destinos de LAPIG, IESA e UFG, com larguras proporcionais de 140:120:160, nomes acessíveis e foco visível. O teste da identidade do arquivo protege a composição aprovada contra substituições acidentais.

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

## Medição de audiência

A tag de produção fica em `public/analytics-bootstrap.js` e só é carregada em `lapig-ufg.github.io`. O portal envia suas visualizações ao abrir e ao trocar de seção. A aula independente recebe a mesma configuração durante o build e envia sua própria visualização ao abrir. Ambientes locais não carregam a tag nem enviam eventos.

O build gera `dist/analytics-manifest.json` a partir dos dados literais de `src/FeaturedDebate.tsx`. Esse contrato permite ao painel de audiência reconhecer os títulos, destinos e tipos de cada material sem interpretar o HTML. Ao trocar a edição, atualize também `editions.pt.startsOn`, a primeira data em que ela ficou disponível, para separar a audiência das edições anteriores. Mudanças incompatíveis nos materiais interrompem o build em vez de produzir um relatório incorreto.

Os links externos do destaque são medidos pelo evento automático de saída do GA. O levantamento interno usa `open_featured_survey`, a partir de 19/10/2026. Visualizações e cliques que não eram enviados antes dessa data não podem ser reconstruídos retroativamente. Os relatórios agregados excluem localhost e outros domínios por meio do filtro do coletor no repositório `VictorGit10/audiencia-observatorio`.
