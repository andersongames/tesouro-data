# 🧠 Visão Geral da Estratégia

Você vai ter 3 níveis de testes:

🟢 **1. Unit tests**  
* parser
* utils
* partes isoladas do service

🟡 **2. Integration tests**
* `tesouro.service.ts` (com mock de fetch)

🔵 **3. API tests**
* `/api/titulo`
* `/api/titulos`

# 📁 Estrutura de Pastas

Sugestão simples e escalável:

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

👉 Stack padrão com Next.js:

* **Vitest** (mais rápido que Jest)
* **Testing Library (opcional, mais pra frontend)**
* **MSW ou mock manual de fetch**

# 🧩 Fase 1 — Unit Tests

### 📍 Parser (parseTesouroCSV)

**O que testar:**

✅ parsing correto  
✅ conversão de tipos (string → number)  
✅ datas ISO  
✅ linhas inválidas

**Exemplo de cenários:**

```text
it("should parse CSV into structured objects")

it("should convert numeric fields correctly")

it("should normalize dates to ISO format")

it("should not ignore invalid rows")
```

### 📍 Utils (normalizeTituloKey)

**O que testar:**

✅ slug consistente  
✅ case insensitive   
✅ espaços / acentos

```text
it("should normalize title and vencimento into consistent key")

it("should ignore casing differences")

it("should not remove accents and special chars")
```

### 📍 Service (partes isoladas)
Você pode testar funções puras como:

`buildTituloMap`

✅ agrupar corretamente
✅ ordenar por dataBase DESC

```text
it("should group titles by tipo + vencimento")

it("should sort items by dataBase descending")
```

# 🧪 Fase 2 — Integration (Service)

📍 `tesouro.service.test.ts`

Aqui você testa:

👉 getTesouroData  
👉 findTesouroTitulo

🔥 IMPORTANTE: mock do fetch

Você NÃO quer bater no endpoint real.

## O que testar:

### Cache

```text
it("should fetch data on first call (cache miss)")

it("should reuse cache on subsequent calls (cache hit)")
```

### In-flight

```text
it("should reuse in-flight promise for concurrent requests")
```

### findTesouroTitulo

```text
it("should return full history for a title")

it("should apply from/to filters")

it("should apply limit correctly")

it("should return null when not found")
```


# 🧪 Fase 3 — API Tests

### 📍 `/tests/api/titulo.test.ts`  
### 📍 `/tests/api/titulos.test.ts`

### 🔧 Abordagem

👉 chamar diretamente o handler:

```text
await GET(new Request("http://localhost/api/titulo?..."))
```

### 📍 `/api/titulo`

**Testar:**

✅ validação (Zod)   
✅ 400 (params inválidos)  
✅ 404 (não encontrado)  
✅ sucesso

```text
it("should return 400 for invalid params")

it("should return 404 when title not found")

it("should return title history successfully")

it("should apply filters (from, to, limit)")
```

### 📍 ` /api/titulos`

**Testar:**

✅ maturity
✅ grouped
✅ default behavior

```text
it("should return all titles by default")

it("should filter future titles")

it("should filter expired titles")

it("should return grouped response")

it("should remove redundant fields in grouped mode")
```

# 📦 Fixtures (Muito Importante)

Crie arquivos fixos:  
📍 `/tests/fixtures/tesouro.sample.csv`  
👉 pequeno (5–10 linhas)  

📍 `/tests/fixtures/tesouro.sample.json`  
👉 versão já parseada

# 🧠 Por que isso é importante

✅ testes determinísticos  
✅ não depende do Tesouro  
✅ rápido

# 🔌 Mock de Fetch

📍 `/tests/mocks/fetch.mock.ts`

Exemplo simples:

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

1. ✅ parser tests
2. ✅ utils tests
3. ✅ buildTituloMap
4. ✅ service (com mock fetch)
5. ✅ API routes