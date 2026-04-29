import { describe, it, expect } from "vitest"
import {
  formatDateBR,
  parseDateBRToISO,
  normalizeToISODate,
  isValidDateParts,
} from "@/lib/utils/date"

/**
 * =========================
 * formatDateBR
 * =========================
 */
describe("formatDateBR", () => {
  it("should convert ISO date to BR format", () => {
    const result = formatDateBR("2026-03-30")
    expect(result).toBe("30/03/2026")
  })

  it("should correctly handle single digit day and month", () => {
    const result = formatDateBR("2026-01-05")
    expect(result).toBe("05/01/2026")
  })

  it("should not modify valid ISO structure", () => {
    const result = formatDateBR("2032-08-15")
    expect(result).toBe("15/08/2032")
  })

  it("should return original input if format is invalid", () => {
    const result = formatDateBR("invalid-date")
    expect(result).toBe("invalid-date")
  })

  it("should return original input if empty string", () => {
    const result = formatDateBR("")
    expect(result).toBe("")
  })

  it("should return original input if date is invalid (e.g., Feb 30)", () => {
    const result = formatDateBR("2029-02-30")
    expect(result).toBe("2029-02-30")
  })
})

/**
 * =========================
 * parseDateBRToISO
 * =========================
 */
describe("parseDateBRToISO", () => {
  it("should convert BR date (DD-MM-YYYY) to ISO", () => {
    const result = parseDateBRToISO("30-03-2026")
    expect(result).toBe("2026-03-30")
  })

  it("should return null for invalid format", () => {
    const result = parseDateBRToISO("30/03/2026")
    expect(result).toBeNull()
  })

  it("should return null for invalid date", () => {
    const result = parseDateBRToISO("30-02-2026")
    expect(result).toBeNull()
  })

  it("should return null for empty string", () => {
    const result = parseDateBRToISO("")
    expect(result).toBeNull()
  })
})

/**
 * =========================
 * normalizeToISODate
 * =========================
 */
describe("normalizeToISODate", () => {
  it("should return ISO date unchanged", () => {
    const result = normalizeToISODate("2026-03-30")
    expect(result).toBe("2026-03-30")
  })

  it("should convert BR date to ISO", () => {
    const result = normalizeToISODate("30-03-2026")
    expect(result).toBe("2026-03-30")
  })

  it("should return null for invalid input", () => {
    const result = normalizeToISODate("invalid")
    expect(result).toBeNull()
  })
})

/**
 * =========================
 * isValidDateParts
 * =========================
 */
describe("isValidDateParts", () => {
  it("should return true for valid date", () => {
    expect(isValidDateParts(2026, 3, 30)).toBe(true)
  })

  it("should return false for invalid day", () => {
    expect(isValidDateParts(2026, 3, 32)).toBe(false)
  })

  it("should return false for invalid month", () => {
    expect(isValidDateParts(2026, 13, 10)).toBe(false)
  })

  it("should return false for non-existent date (Feb 30)", () => {
    expect(isValidDateParts(2026, 2, 30)).toBe(false)
  })

  it("should handle leap year correctly", () => {
    expect(isValidDateParts(2024, 2, 29)).toBe(true)
    expect(isValidDateParts(2023, 2, 29)).toBe(false)
  })
})