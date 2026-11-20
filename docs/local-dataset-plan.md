# 🗺️ Plano Detalhado de Implementação: Dataset Local Estático por Ano & GitHub Actions

Este documento valida o plano estruturado e adiciona os ajustes necessários (como a sugestão de subdiretório para os arquivos e as permissões de escrita da Action) para garantir uma transição suave e segura.

---

## 📌 Definições Prévias Validadas

1. **Divisão por Ano de Vencimento:** Aprovado. Reduz o consumo de RAM no runtime da Vercel e otimiza o peso dos arquivos no Git.
2. **Subdiretório Dedicado:** Sugestão de nome para a pasta: **`src/lib/data/datasets/`** (mantém a raiz limpa e separa os JSONs gerados do CSV original ou de outros arquivos utilitários).
3. **Permissões do GitHub Action:** Para permitir que a Action faça o `git push` de volta ao repositório, será necessário configurar o bloco `permissions: contents: write` e ajustar a identidade do git no arquivo YAML.

---

## 📋 Plano de Implementação em Fases

### Fase 1: Estruturação dos Dados e Ajuste no Service

* **1.1. Criação do Subdiretório:**
  * Criar a pasta `src/lib/data/datasets/` para armazenar os arquivos particionados por ano.
* **1.2. Refatoração do Script de Geração (`generate-tesouro-map.ts`):**
  * Atualizar o script para agrupar os títulos com base no ano de vencimento (extraído da data de vencimento ISO).
  * Salvar um arquivo JSON individual por ano (ex: `tesouro-2025.json`, `tesouro-2026.json`, etc.) dentro de `src/lib/data/datasets/`.
* **1.3. Atualização do `tesouro.service.ts` (Mantendo a Feature Flag):**
  * Adaptar a função de carregamento local para ler dinamicamente o arquivo correspondente ao ano do título consultado quando `USE_LOCAL_STATIC_MAP = true`.
  * Manter o fluxo original intacto atrás da flag para fins de comparação ou contingência.
  * Ajustar o retorno de `findTesouroTitulo` para expor o `latestDataBase`.

### Fase 2: Configuração e Teste da GitHub Action

* **2.1. Criação do Workflow YAML:**
  * Criar o arquivo `.github/workflows/update-tesouro-data.yml`.
  * Configurar o cron schedule diário (ex: `0 23 * * 1-5` para rodar às 23h em dias úteis).
  * Configurar o step de permissão de escrita (`contents: write`).
* **2.2. Passos da Action:**
  * Checkout do repositório.
  * Setup do Node.js e instalação de dependências.
  * Execução do script de conversão (`npm run generate:tesouro-map`).
  * Verificação inteligente de alterações (`git status` / `git diff`).
  * Commit e Push automatizados condicionados à existência de mudanças, utilizando um usuário bot padrão do GitHub Actions.
* **2.3. Validação Manual:**
  * Disparar a Action manualmente pela aba "Actions" do GitHub para testar o ciclo completo de ponta a ponta e verificar o commit gerado.

### Fase 3: Testes Automatizados e CI/CD

* **3.1. Adaptação dos Testes:**
  * Atualizar os testes unitários/integração existentes para cobrir o novo formato particionado e a leitura do diretório `datasets/`.
* **3.2. Pipeline de Testes no Push:**
  * Garantir que o workflow padrão de CI (GitHub Actions) execute os testes automatizados (`npm test`) em todo Pull Request ou push na branch principal, bloqueando quebras indesejadas.

### Fase 4: Limpeza (Cleanup) e Produção

* **4.1. Remoção do Fluxo Antigo:**
  * Desativar/remover definitivamente o código legado de download dinâmico em tempo de requisição, cache de chunks, verificação de HEAD remota e lógicas associadas.
  * Tornar o fluxo local estático o comportamento padrão definitivo do backend (removendo a dependência da flag de controle).
* **4.2. Deploy Final:**
  * Consolidar o merge na branch `main`.
  * Validar o deploy automático na Vercel e testar as rotas da API em produção.

### 🚀 Melhoria Futura Opcional
* **Git LFS (Large File Storage):** Caso os arquivos JSON acumulados comecem a pesar excessivamente no repositório ao longo dos meses, migrar o versionamento dos arquivos da pasta `datasets/` para o Git LFS do GitHub.