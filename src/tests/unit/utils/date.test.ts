import { describe, it, expect } from "vitest"
import { formatDateBR } from "@/lib/utils/date"

describe("formatDateBR", () => {
  it("should convert ISO date to BR format", () => {
    const result = formatDateBR("2026-03-30")

    expect(result).toBe("30/03/2026")
  })

  it("should correctly handle single digit day and month", () => {
    const result = formatDateBR("2026-01-05")

    expect(result).toBe("05/01/2026")
  })

  it("should not modify already well-formed ISO strings structure", () => {
    const iso = "2032-08-15"

    const result = formatDateBR(iso)

    /**
     * Ensure correct mapping:
     * YYYY-MM-DD -> DD/MM/YYYY
     */
    expect(result).toBe("15/08/2032")
  })

  it("should return a malformed result if input is invalid (current behavior)", () => {
    const result = formatDateBR("invalid-date")

    /**
     * Current implementation does not validate input,
     * so it will produce an incorrect but predictable output.
     *
     * This test documents current behavior explicitly.
     */
    expect(result).toBe("undefined/date/invalid")
  })

  it("should handle empty string", () => {
    const result = formatDateBR("")

    /**
     * Splitting empty string results in [""] → [year="", undefined, undefined]
     */
    expect(result).toBe("undefined/undefined/")
  })
})