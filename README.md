# Dicionário de Itens do GM

Site estático pronto para publicar na Vercel. Criado para consultar IDs e nomes de itens de World of Warcraft: Wrath of the Lich King 3.3.5a.

## Publicar na Vercel
1. Extraia o ZIP.
2. Entre em https://vercel.com/ e escolha **Add New → Project**.
3. Importe o repositório Git com esta pasta, ou use a Vercel CLI dentro da pasta.
4. Framework Preset: **Other**. Build Command e Output Directory podem ficar vazios (ou Output Directory `.`).
5. Faça o Deploy.

Também é possível subir os arquivos para um repositório GitHub e importar esse repositório na Vercel.

## Banco de dados
O site consulta o catálogo WotLK 3.3.5a da API pública WoWDB em tempo real. A documentação informa 39.136 itens para WotLK; a busca e a paginação consultam todas as páginas disponíveis. O site não baixa 39 mil registros de uma vez; ele consulta por nome/ID e carrega páginas conforme necessário. Fonte: https://docs.wowdb.assemblee-defias.fr/items
- A API permite busca por nome e consulta direta por ID, com paginação de 25 resultados.

Exemplo JSON:
```json
[
  {"id": 49623, "name": "Shadowmourne", "category": "Armas", "type": "Machado de duas mãos"},
  {"id": 50363, "name": "Deathbringer's Will", "category": "Acessórios", "type": "Berloque"}
]
```

Exemplo CSV (cabeçalho obrigatório):
```csv
id,name,category,type
49623,Shadowmourne,Armas,Machado de duas mãos
50363,Deathbringer's Will,Acessórios,Berloque
```

## Recursos
- Busca por nome ou ID (botão Buscar ou tecla Enter).
- Autocomplete: sugestões aparecem enquanto digita (a partir de 2 letras); use as setas e Enter ou clique para escolher.
- Filtro por categoria.
- Paginação.
- Botão para copiar `.add ID`.
- - Layout responsivo.

## Observação importante
Os IDs podem variar conforme a versão, core ou customizações do servidor. Confira os IDs no banco de dados correspondente ao seu servidor antes de executar comandos GM.

## Fonte e cobertura do catálogo
A API documenta 39.136 itens para WotLK 3.3.5a e permite consultar o catálogo completo por paginação. Os itens internos/teste podem não aparecer na listagem pública. A disponibilidade depende do serviço externo.
