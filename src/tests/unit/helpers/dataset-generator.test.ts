/**

Objetivo: Garantir que o script de geração e particionamento de dados processe corretamente o CSV de entrada, gere os arquivos particionados por ano de vencimento e construa o arquivo de metadados(metadata.json).

Testes recomendados:

should parse CSV and generate correct metadata (lastUpdatedAt, latestDataBase, dataSource)

should partition title map correctly by maturity year (YYYY)

should create output directory if it does not exist and save partitioned JSON files

*/