import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { findTesouroTitulo } from "@/lib/services/tesouro.service"

import { mockFetch } from "../mocks/fetch.mock"
import { TESOURO_CSV_URL } from "@/lib/constants"


/**
 * Load CSV fixture
 */
const csvPath = resolve("src/tests/fixtures/tesouro.sample.csv")
const sampleCSV = readFileSync(csvPath, "utf-8")

describe("tesouro.service (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
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
   * Validar se as propriedades lastUpdatedAt e latestDataBase
   * são carregadas e retornadas corretamente a partir do arquivo
   * de metadados gerado pela automação.
   */

  /**
   * Teste de Degradação Graciosa (Fallback):
   * Simular a ausência de um arquivo de ano específico ou do metadata.json
   * para garantir que o serviço lide com o cenário de forma limpa (retornando
   * null ou valores seguros de fallback sem quebrar a aplicação).
   */

  /**
   * should load title history successfully from partitioned year dataset files
   * should return null immediately when a maturity year file or title key does not exist (no legacy fallback)
   * should load metadata successfully or return safe fallbacks if metadata.json is missing
   * should load and merge all local static maps when getTesouroData() is called
  /*

  /**
   * -------------------------------
   * findTesouroTitulo TESTS
   * -------------------------------
   */

  it("should return full history for a title", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01"
    )

    expect(result).not.toBeNull()
    expect(result!.items.length).toBeGreaterThan(0)
  })

  it("should apply from filter", async () => {
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Titulo Inexistente",
      "2099-01-01"
    )

    expect(result).toBeNull()
  })
})