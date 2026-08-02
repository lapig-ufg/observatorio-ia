# IA como notícia diária — dados de trabalho

Os arquivos Markdown originais do Google Drive são fontes preservadas. Cada lote semanal é um retrato completo e corrigido da série. Para atualizar a página pública, mantenha nesta pasta somente a cópia local mais recente, com o nome `folha_ia_YYYY-MM-DD.md`, substituindo o lote semanal anterior, e execute:

```bash
pnpm noticias:build
```

O comando usa o Markdown semanal de data mais recente (e mantém compatibilidade com o histórico legado `folha_ia_historico.md` somente se não houver lote datado). Ele gera `public/folha-ia/index.json` e um arquivo por ano, valida datas, links e duplicidades, conta as estrelas de relevância e prepara os filtros públicos. Não mantenha duas versões semanais como fontes simultâneas: a revisão mais nova substitui a anterior.

Não inclua nesta pasta arquivos auxiliares ou resumos sem a tabela de matérias. O Markdown deve manter as colunas de data, seção/editoria, título e link.

## Temas editoriais

O arquivo opcional `temas-editoriais.csv` deve usar as colunas `id,tema`. Ele serve para corrigir ou consolidar a classificação automática de matérias específicas. As categorias válidas são:

- Modelos, produtos e empresas
- Regulação, direitos e governança
- Trabalho, economia e profissões
- Educação, cultura e comunicação
- Ciência, saúde e ambiente
- Segurança, fraudes e plataformas
- Infraestrutura, dados e geopolítica
- Sociedade e vida cotidiana

Não modifique o arquivo-fonte no Drive a partir desta rotina. A revisão editorial é feita no Markdown ou por meio das substituições em `temas-editoriais.csv`.
