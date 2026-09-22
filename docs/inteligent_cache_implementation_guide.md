Documento de Arquitetura e Implementação: Cache Inteligente com Metadados e SWR
1. Estado Atual
No cenário atual, o serviço tesouro.service.ts utiliza o unstable_cache do Next.js focado em blocos (chunks) com um TTL estático de 1 hora (CACHE_TTL_SECONDS = 60 * 60).

Limitação atual: A cada 1 hora, o cache expira e o sistema se torna vulnerável a re-downloads da planilha completa de 13MB do Tesouro Nacional — mesmo em dias em que o governo ainda não publicou uma nova versão do arquivo (visto que a publicação oficial ocorre apenas uma vez por dia útil).

Vantagem atual: O coalescimento distribuído do Next.js evita requisições simultâneas duplicadas na mesma janela de expiração.

2. Estado Objetivo
Implementar uma arquitetura baseada em Stale-While-Revalidate (SWR) com Metadados Globais, onde a inteligência de negócio do domínio dita se o cache pesado deve ou não ser revalidado.

Regra de Negócio: Se o último registro conhecido dos dados (latestDataBase) corresponder à data de "hoje", os dados são considerados definitivos para o dia. O sistema deve ignorar a expiração temporal do TTL e servir os chunks instantaneamente do cache, eliminando o download desnecessário de 13MB.

Gatilho de Atualização: O re-download só ocorrerá se o metadado indicar que a data armazenada é anterior a hoje (mudança de dia) ou se o cache inicial ainda não existir.

3. Alterações Necessárias para a Futura Implementação
Para atingir o estado objetivo, as seguintes modificações arquiteturais serão necessárias no código:

A. Criação de uma Chave de Metadado Leve no Cache
Introduzir uma nova função cacheada separada (ex: getCachedMetadata) usando o unstable_cache.

Esta chave armazenará apenas um objeto JSON minimalista contendo:

```
interface TesouroMetadata {
  latestDataBase: string | null;
  updatedAt: string;
}
```

B. Inversão do Fluxo de Verificação em getTesouroData()
O fluxo principal deixará de chamar diretamente a contagem de chunks sem antes validar a temporalidade.

Passo a passo da nova lógica:

Consulta o metadado leve.

Compara o latestDataBase obtido com a data atual (today).

Se latestDataBase === today: O sistema trata o cache como válido para o dia inteiro, pulando checagens redundantes e servindo os chunks atuais (mesmo que o TTL de 1 hora dos chunks tenha estipulado expiração).

Se latestDataBase < today (ou nulo): O sistema prossegue para a invalidação e busca a versão mais recente do CSV oficial.

C. Desacoplamento do TTL Estático
O revalidate dos chunks poderá ser mantido como uma rede de segurança de longo prazo (ex: 24 horas ou tags manuais), enquanto a decisão de uso será governada ativamente pela regra do metadado diário.