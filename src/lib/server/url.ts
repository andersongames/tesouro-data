import { headers } from "next/headers"

/**
 * Returns the absolute base URL of the current request
 *
 * IMPORTANT:
 * - Server-only function (uses next/headers)
 * - Should not be used in client components
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers()

  const host = headersList.get("host") ?? "localhost:3000"

  const protocol =
    process.env.NODE_ENV === "development"
      ? "http"
      : "https"

  return `${protocol}://${host}`
}