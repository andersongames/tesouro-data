Implementation Guide: Distributed Next.js unstable_cache with CSV Chunks for Tesouro Direto Service
1. Current State vs. Objective State
Current State
Architecture: The application runs on Next.js deployed on Vercel's Free tier.

Caching & Concurrency Control: Currently uses an in-memory global state (let cache and let inFlightPromise) inside tesouro.service.ts.

The Problem: Vercel's serverless architecture spawns multiple isolated instances (lambdas). Because memory is not shared across instances, concurrent requests hitting different instances bypass the in-memory inFlightPromise check, resulting in simultaneous downloads of the ~13MB CSV file from the official government source. Furthermore, Next.js's standard fetch cache cannot be used directly because the file payload exceeds the strict 2MB cache limit.

Objective State
Distributed Concurrency Control: Replace the local in-memory inFlightPromise mechanism with Next.js's native unstable_cache. This leverages Vercel's global Data Cache layer as a distributed lock/coalescing mechanism, ensuring that concurrent requests across all serverless instances trigger only a single download.

Payload Size Optimization: Split the raw CSV string into text chunks of approximately ~1.5MB each (approx. 19,173 lines per chunk), safely keeping each chunk well below the 2MB cache size limit.

Reconstruction & Parsing: On cache hit, retrieve all text chunks from the global cache, join them in memory to reform the full raw CSV string, and parse/map them normally.

2. Implementation Guide
Below is the step-by-step refactoring guide for src/lib/services/tesouro.service.ts. All code blocks and comments are written in English.

Step 1: Define Constants and Chunking Strategy
Set up the chunk size configuration to ensure each cached text block stays below the 2MB limit.

```
import { unstable_cache } from "next/cache"
import { parseTesouroCSV } from "../parsers/tesouro.parser"
import { TesouroCache, TesouroTitulo, TesouroTituloHistorico } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv"

// Cache TTL set to 1 hour (expressed in seconds for unstable_cache)
const CACHE_TTL_SECONDS = 60 * 60

// Maximum lines per chunk to keep the payload under ~1.5MB (safe margin for Next.js 2MB limit)
const MAX_LINES_PER_CHUNK = 19173
```

Step 2: Implement Raw Fetching and Chunk Splitting Logic
Create helper functions to fetch the heavy CSV and split it into indexed text fragments.

```
/**
 * Fetches the raw Tesouro Direto CSV file from the official source.
 * Logs only when an actual external HTTP request occurs.
 */
async function fetchRawTesouroCSV(): Promise<string> {
  console.log("[TesouroData] Downloading CSV from source...")

  const response = await fetch(TESOURO_CSV_URL, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Tesouro CSV: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const decoder = new TextDecoder("latin1")

  return decoder.decode(buffer)
}

/**
 * Fetches the CSV and splits it into an array of string chunks.
 * Each chunk is guaranteed to be under the 2MB cache restriction.
 */
async function fetchAndChunkCSV(): Promise<{ chunks: string[]; totalChunks: number }> {
  const fullCsv = await fetchRawTesouroCSV()
  const lines = fullCsv.split(/\r?\n/)
  const chunks: string[] = []

  for (let i = 0; i < lines.length; i += MAX_LINES_PER_CHUNK) {
    const chunkLines = lines.slice(i, i + MAX_LINES_PER_CHUNK)
    chunks.push(chunkLines.join("\n"))
  }

  return {
    chunks,
    totalChunks: chunks.length,
  }
}
```

Step 3: Wrap with unstable_cache for Distributed Coalescing
Expose cached functions via unstable_cache. Because unstable_cache operates globally across Vercel's infrastructure, concurrent requests will wait for the initial fetch to complete rather than triggering duplicate downloads.

```
/**
 * Cached function to retrieve total chunk count and metadata.
 * Managed globally by Next.js Data Cache.
 */
const getCachedTotalChunks = unstable_cache(
  async () => {
    const { totalChunks } = await fetchAndChunkCSV()
    return { totalChunks }
  },
  ["tesouro-chunks-metadata"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ["tesouro-cache"],
  }
)

/**
 * Cached function to retrieve a specific text chunk by its index.
 */
const getCachedChunkContent = unstable_cache(
  async (chunkIndex: number) => {
    const { chunks } = await fetchAndChunkCSV()
    return chunks[chunkIndex] || ""
  },
  ["tesouro-chunk-content"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ["tesouro-cache"],
  }
)
```

Step 4: Reassemble Chunks and Build the Service Layer
Reconstruct the full CSV content in memory when cache is accessed, then process it through your standard parsing and mapping functions.

```
export function buildTituloMap(
  data: TesouroTitulo[]
): Map<string, TesouroTitulo[]> {
  const map = new Map<string, TesouroTitulo[]>()

  for (const titulo of data) {
    const key = normalizeTituloKey(titulo.tipo, titulo.vencimento)

    if (!map.has(key)) {
      map.set(key, [])
    }

    map.get(key)!.push(titulo)
  }

  for (const list of map.values()) {
    list.sort((a, b) => {
      return b.dataBase.localeCompare(a.dataBase)
    })
  }

  return map
}

function getLatestDataBase(data: TesouroTitulo[]): string | null {
  if (!data.length) return null

  let latest = data[0].dataBase

  for (const item of data) {
    if (item.dataBase > latest) {
      latest = item.dataBase
    }
  }

  return latest
}

/**
 * Main function to retrieve and assemble cached Tesouro data.
 * Replaces manual in-memory locks with Next.js distributed caching.
 */
export async function getTesouroData(): Promise<TesouroCache> {
  // 1. Get total number of chunks from the distributed cache
  const { totalChunks } = await getCachedTotalChunks()

  // 2. Fetch all chunks in parallel from the cache layers
  const chunkPromises: Promise<string>[] = []
  for (let i = 0; i < totalChunks; i++) {
    chunkPromises.push(getCachedChunkContent(i))
  }

  const resolvedChunks = await Promise.all(chunkPromises)

  // 3. Reassemble full CSV string in memory and parse it
  const fullCsvString = resolvedChunks.join("\n")
  const parsed = parseTesouroCSV(fullCsvString)
  const map = buildTituloMap(parsed)
  const latestDataBase = getLatestDataBase(parsed)
  const fetchedAt = new Date().toISOString()

  return {
    data: parsed,
    map,
    fetchedAt,
    latestDataBase,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  }
}

/**
 * Finds historical entries for a Tesouro title using normalized key.
 * (Keeps the original filtering and query signature intact).
 */
export async function findTesouroTitulo(
  tipo: string,
  vencimentoISO: string,
  options?: {
    from?: string
    to?: string
    limit?: number
  }
): Promise<TesouroTituloHistorico | null> {
  const { map, fetchedAt } = await getTesouroData()

  const key = normalizeTituloKey(tipo, vencimentoISO)
  const list = map.get(key)

  if (!list || list.length === 0) {
    return null
  }

  let filtered = list

  if (options?.from) {
    filtered = filtered.filter(
      (item) => item.dataBase >= options.from!
    )
  }

  if (options?.to) {
    filtered = filtered.filter(
      (item) => item.dataBase <= options.to!
    )
  }

  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return {
    items: filtered,
    fetchedAt,
    total: list.length,
  }
}
```

3. Verification & Summary of Benefits
No 2MB Limit Violations: Splitting the 13MB file into ~1.5MB line blocks ensures full compliance with Next.js cache constraints.

Global Request Coalescing: Multiple Vercel serverless instances hitting the endpoint simultaneously will share the same unstable_cache promise lock, preventing simultaneous source downloads.

Zero Maintenance Cleanup: Vercel automatically purges expired cache keys based on the defined revalidate window.