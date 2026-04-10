# 🧠 Visão Geral da Estratégia

Você vai ter 3 níveis de testes:

* 🟢 **1. Unit tests**: Testes de funções puras como o parser, utilitários e partes isoladas do service.
* 🟡 **2. Integration tests**: Focados no `tesouro.service.ts` utilizando mock de fetch para simular a API externa.
* 🔵 **3. API tests**: Testes de ponta a ponta nas rotas `/api/titulo` e `/api/titulos`.

# 📁 Estrutura de Pastas

Sugestão simples e funcional para organizar seus arquivos de teste:

```text
/src
  /app
  /lib
  /tests
    /unit
      /parsers
      /utils
      /services
    /integration
      tesouro.service.test.ts
    /api
      titulo.test.ts
      titulos.test.ts
    /fixtures
      tesouro.sample.csv
      tesouro.sample.json
    /mocks
      fetch.mock.ts
```

# 🧪 Ferramentas Recomendadas

👉 **Stack padrão recomendada para Next.js:**

* **Vitest**: Extremamente rápido e compatível com a configuração do Vite/Next.
* **Testing Library**: Útil caso decida testar a renderização do frontend (opcional).
* **Mock de Fetch**: Pode ser feito manualmente ou usando bibliotecas como MSW.

# 🧩 Fase 1 — Unit Tests

### 📍 Parser (parseTesouroCSV)
* ✔ **Parsing correto**: Verificar se o CSV é transformado em objetos.
* ✔ **Conversão**: Validar string → number (float).
* ✔ **Datas**: Garantir conversão para formato ISO.
* ✔ **Robustez**: Ignorar linhas inválidas.

### 📍 Utils (normalizeTituloKey)
* ✔ **Normalização**: Slug consistente, sem acentos e espaços extras.
* ✔ **Case Insensitive**: Tratar "Tesouro" e "tesouro" como iguais.

### 📍 Service (partes isoladas)
* ✔ **buildTituloMap**: Testar se agrupa corretamente e ordena por `dataBase` descendente.

# 🧪 Fase 2 — Integration (Service)

📍 **tesouro.service.test.ts**

O foco aqui é testar a lógica de negócio integrada ao cache:
* 🔥 **Mock do Fetch**: Essencial para não depender do site do Tesouro Direto nos testes.
* **Cache**: Testar se na primeira chamada ocorre o fetch (miss) e nas seguintes ele usa a memória (hit).
* **Busca**: Validar se `findTesouroTitulo` aplica filtros de limite e data corretamente.

# 🧪 Fase 3 — API Tests

📍 **/tests/api/titulo.test.ts** e **/api/titulos.test.ts**

🔧 **Abordagem**: Chamar diretamente o handler da rota para validar a resposta JSON.

* ✔ **Validação**: Garantir que o **Zod** barra inputs errados (Status 400).
* ✔ **Not Found**: Retornar Status 404 para títulos inexistentes.
* ✔ **Sucesso**: Validar se o histórico e filtros (from, to, limit) retornam os dados esperados.
* ✔ **Agrupamento**: Validar o comportamento do parâmetro `grouped`.

# 📦 Fixtures (Muito Importante)

Mantenha dados fixos para garantir que os testes sejam rápidos e determinísticos:

* 📍 `/tests/fixtures/tesouro.sample.csv`: Um arquivo CSV pequeno (5-10 linhas).
* 📍 `/tests/fixtures/tesouro.sample.json`: A versão JSON exata que você espera após o processamento da fixture acima.

# 🔌 Mock de Fetch

📍 **/tests/mocks/fetch.mock.ts**

Exemplo de implementação para interceptar o `fetch` global e retornar os dados da sua fixture:

```typescript
export function mockFetch(csv: string) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: async () =>
        new TextEncoder().encode(csv).buffer,
    } as Response)
  )
}
```

# 🏁 Ordem Recomendada de Implementação

Siga este fluxo para construir com confiança:

1.  ✅ **Parser tests** (Base de tudo)
2.  ✅ **Utils tests** (Normalização)
3.  ✅ **buildTituloMap** (Lógica de dados)
4.  ✅ **Service** (Integração e Cache)
5.  ✅ **API routes** (Entrega final)