import { describe, it, expect, beforeEach, vi } from "vitest"
import { findTesouroTitulo, getTesouroData } from "@/lib/services/tesouro.service"
import { createDatasetMock } from "../mocks/dataset.mock"

/**
 * Initialize and apply the dataset mock based on the CSV fixture using spies.
 */
const setupMockFileSystem = createDatasetMock()

describe("tesouro.service (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.restoreAllMocks()
  })

  // TESTS TO ADD:

  /**
   * Teste de Carregamento dos Datasets Particionados:
   * Garantir que getTesouroData() e findTesouroTitulo()
   * consigam ler corretamente os arquivos particionados
   * por ano (tesouro-YYYY.json) e combinar o resultado com sucesso.
   */

  /**
   * Teste de Leitura do metadata.json:
   * Validar se as propriedades lastUpdatedAt e latestDataBase e dataSource
   * são carregadas e retornadas corretamente a partir do arquivo
   * de metadados gerado pela automação.
   */

  /**
   * Teste de Degradação Graciosa (Fallback):
   * Simular a ausência de um arquivo de ano específico ou do metadata.json
   * para garantir que o serviço lide com o cenário de forma limpa (retornando
   * null ou valores seguros de fallback sem quebrar a aplicação).
   */

  // TESTES SUGERIDOS

  /**
   * should load title history successfully from partitioned year dataset files
   * should return null immediately when a maturity year file or title key does not exist (no legacy fallback)
   * should load metadata successfully or return safe fallbacks if metadata.json is missing
   * should load and merge all local static maps when getTesouroData() is called
  /*

  /**
   * -------------------------------
   * DATASET & METADATA LOADING TESTS
   * -------------------------------
   */
  it("should load and merge all local static maps when getTesouroData() is called", async () => {
    setupMockFileSystem(true)

    const cache = await getTesouroData()

    expect(cache).toBeDefined()
    expect(cache.data.length).toBeGreaterThan(0)
    expect(cache.map instanceof Map).toBe(true)
    expect(cache.map.size).toBeGreaterThan(0)
    
    // Validate metadata integration
    expect(typeof cache.lastUpdatedAt).toBe("string")
    expect(cache.latestDataBase).toBe("2026-03-31")
    expect(cache.dataSource).toBe("local")
  })

  it("should handle graceful degradation when dataset files or metadata are missing", async () => {
    setupMockFileSystem(false)

    const cache = await getTesouroData()

    expect(cache.data).toEqual([])
    expect(cache.map.size).toBe(0)

    const result = await findTesouroTitulo("Tesouro Selic", "2028-03-01")
    expect(result).toBeNull()
  })

  /**
   * -------------------------------
   * findTesouroTitulo TESTS
   * -------------------------------
   */

  it("should load title history successfully from partitioned year dataset files", async () => {
    setupMockFileSystem(true)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01"
    )

    expect(result).not.toBeNull()
    expect(result!.items.length).toBeGreaterThan(0)
    expect(result!.latestDataBase).toBe("2026-03-31")
  })

  it("should return null immediately when a maturity year file or title key does not exist", async () => {
    setupMockFileSystem(true)

    // Query non-existent maturity year partition
    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2099-01-01"
    )

    expect(result).toBeNull()
  })

  it("should apply from filter", async () => {
    setupMockFileSystem(true)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        from: "2026-03-31",
      }
    )

    expect(result).not.toBeNull()

    const allValid = result!.items.every(
      (item) => item.dataBase >= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply to filter", async () => {
    setupMockFileSystem(true)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        to: "2026-03-31",
      }
    )

    expect(result).not.toBeNull()

    const allValid = result!.items.every(
      (item) => item.dataBase <= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply limit correctly", async () => {
    setupMockFileSystem(true)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        limit: 1,
      }
    )

    expect(result).not.toBeNull()
    expect(result!.items.length).toBe(1)
  })

  it("should return null when not found", async () => {
    setupMockFileSystem(true)

    const result = await findTesouroTitulo(
      "Titulo Inexistente",
      "2028-03-01"
    )

    expect(result).toBeNull()
  })
})