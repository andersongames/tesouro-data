Estratégia 1: Otimização com Requisição HTTP Condicional (HEAD Request com ETag ou Last-Modified)
A ideia desta estratégia é verificar a "idade" ou a versão do arquivo no servidor do governo antes de baixar o payload pesado.

Como funcionaria:

Quando o cache do Next.js expirar (após 1 hora), em vez de disparar um fetch completo do CSV de 13MB, o serviço faz um request leve do tipo HEAD para a URL do Tesouro Transparente.

O servidor do governo responde apenas com os cabeçalhos HTTP (headers), que geralmente contêm propriedades como Last-Modified (data da última modificação do arquivo no servidor deles) ou um ETag.

O seu serviço compara esse Last-Modified com a data do último arquivo processado armazenada em um pequeno metadado em cache.

O desfecho:

Se a data do servidor for igual à que você já tem, o arquivo não mudou. O código simplesmente estende/renova o cache atual programaticamente (ou atualiza o timestamp) sem baixar um único byte dos 13MB.

Se a data for diferente, aí sim o sistema dispara o download completo do CSV novo.

Vantagem: Poupa totalmente a banda e o processamento de parsing quando o governo ainda não atualizou a planilha do dia.