import { vi } from "vitest"

/**
 * Mocks global fetch to return a CSV string
 */
export function mockFetch(csv: string) {
  global.fetch = vi.fn(async () => {
    return {
      ok: true,
      arrayBuffer: async () =>
        new TextEncoder().encode(csv).buffer,
    } as Response
  })
}

/**
 * Mocks fetch failure
 */
export function mockFetchError() {
  global.fetch = vi.fn(async () => {
    return {
      ok: false,
      status: 500,
    } as Response
  })
}