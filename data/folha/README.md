# IA como notícia diária — dados de trabalho

O arquivo Markdown original do Google Drive é a fonte histórica. Para atualizar a página pública, faça uma cópia local dele com o nome `folha_ia_historico.md` nesta pasta e execute:

```bash
pnpm noticias:build
```

O comando gera `public/folha-ia/index.json` e um arquivo por ano, valida datas, links e duplicidades, conta as estrelas de relevância e prepara os filtros públicos.

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
