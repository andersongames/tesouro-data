# 🚀 Roadmap de Implementação: Tesouro Direto API & SSR

## 🧩 Fase 1 — Setup do Projeto
* **1. Inicialização:**
    * Criar projeto **Next.js (App Router)**.
    * Configurar **TypeScript**, **ESLint** e **Prettier**.
    * **Estrutura de pastas sugerida:**
        ```text
        /src
          /app
            /api
          /lib
            /services
            /parsers
            /types
            /utils
        ```

---

## 🌐 Fase 2 — Integração com o CSV (Core Backend)
* **2. Serviço de download do CSV:**
    * Criar função `fetchTesouroCSV`.
    * Implementar `fetch` com **revalidate** (Next.js Cache).
    * **Atenção:** Tratar encoding (**latin1**) e erros de conexão (timeout, 500).
* **3. Parser do CSV:**
    * Criar `parseTesouroCSV`.
    * **Conversões críticas:** * Números com vírgula ➔ **float**.
        * Datas ➔ **ISO**.
    * Ignorar linhas inválidas ou vazias.
* **4. Modelagem de Dados:**
    * Definir o tipo `TesouroTitulo`:
    ```typescript
    type TesouroTitulo = {
      tipo: string;
      vencimento: string;
      dataBase: string;
      taxaCompra: number;
      taxaVenda: number;
      puCompra: number;
      puVenda: number;
      puBase: number;
    }
    ```

---

## ⚡ Fase 3 — Camada de Processamento
* **5. Normalização e Indexação:**
    * Criar função `normalizeTituloKey`.
    * Utilizar um **Map<string, TesouroTitulo>** para buscas rápidas.
    * **Chave sugerida:** `${tipoSlug}|${vencimentoISO}`.
* **6. Cache de Dados:**
    * Implementar cache em memória com **TTL (ex: 1h)**.
    * Garantir que múltiplos requests não disparem downloads simultâneos.

---

## 🔌 Fase 4 — API
* **7. Endpoint de busca:** `GET /api/titulo` (parâmetros: `tipo` e `vencimento`).
* **8. Endpoint de listagem:** `GET /api/titulos` (retorna o JSON completo).
* **9. Tratamento de Erros:**
    * **400:** Parâmetros inválidos.
    * **404:** Título não encontrado.
    * **500:** Erro interno no servidor/fetch.

---

## 🧪 Fase 5 — Testes
* Validar o **Parser** com CSVs reais.
* Testar a **Normalização de chaves** e lógica de busca.
* Mockar o fetch para testar os **Endpoints**.

---

## 🖼️ Fase 6 — Frontend Básico
* **10. Página de busca:** Formulário simples com `select` (tipo) e `date` (vencimento).
* **11. Página Dinâmica (ESSENCIAL):** Rota `/titulo/[tipo]/[vencimento]`.
    * Usar **SSR (Server-Side Rendering)**.
* **12. Estrutura "Scrapável":**
    * Adicionar **IDs fixos** no HTML para integração com Google Sheets (`IMPORTXML`):
    * Ex: `<div id="taxa-compra">...</div>`.

---

## ⚙️ Fase 7 — Otimizações
* **13. Performance:** Ajustar o `revalidate` do Next.js para evitar processamento pesado.
* **14. Robustez:** Criar um **Fallback** caso o CSV oficial do Tesouro esteja offline.

---

## 🚀 Fase 8 — Deploy
* Deploy na **Vercel**.
* Testar tempo de resposta da API publicamente.
* Validar a captura de dados via **IMPORTXML**.

---

## 🔥 Fase 9 — Extras (Futuro)
* Autocomplete no campo de busca.
* Gráficos com **histórico de taxas**.
* Exportação de dados customizada em JSON/CSV.

---

## 🧠 Ordem Recomendada de Execução
1.  **Fetch CSV** ➔ 2. **Parser** ➔ 3. **Normalização/Map** ➔ 4. **Cache** ➔ 5. **API** ➔ 6. **Página SSR** ➔ 7. **Front Básico**.