# 📚 TesouroService Technical Documentation

This document details the architectural design and execution flow of the updated `tesouro.service.ts`, which manages data retrieval, distributed caching, and performance optimizations for the Tesouro Direto dataset.

---

## ⚡ 1. Core Architectural Features

*   **🌐 Distributed Caching with Next.js (`unstable_cache`)**: Leverages Next.js data cache layers to globally throttle and share cache states across distributed serverless instances.
*   **🧠 Local-First RAM Cache & Fallback**: Implements short in-memory Time-To-Live (TTL) states in local RAM to bypass distributed cache overhead during frequent sequential calls. It also serves as a resilient fallback mechanism in non-Next.js or testing environments.
*   **📡 Lightweight `HEAD` Request & TTL**: Periodically checks for remote dataset updates using a lightweight HTTP `HEAD` request, wrapped in a 5-minute global TTL to prevent excessive external network calls.
*   **🚀 Local-First Priority Strategy**: Checks local instance RAM before querying distributed cache layers, optimizing execution times to microsecond ranges.
*   **⚡ Lazy Reading Optimization**: Intercepts queries where `limit === 1` (fetching only the most recent record) to parse solely the primary data chunk, avoiding full dataset assembly and parsing overhead.

---

## ⚙️ 2. Execution & Caching Flow

### A. Remote Change Validation (`validateAndPurgeCacheIfNeeded`)
*   **🔍 HEAD Check**: Invokes `getCachedLastModified()` to retrieve the remote resource's `last-modified` or `etag` headers.
*   **⏳ Global Throttling**: The header check is guarded by `HEAD_CACHE_TTL_SECONDS` (5 minutes) within `unstable_cache`.
*   **⚡ Local RAM Optimization**: If checked recently within `LOCAL_RAM_HEAD_TTL_MS` (30 seconds), the cached header is returned instantly from local memory.
*   **🗑️ Purge Trigger**: If the fetched remote header differs from the locally tracked state, the service invokes `revalidateTag("tesouro-cache")` and resets local RAM chunks (`localFallbackState.chunks = null`) to force a fresh pull.

### B. Chunk Management & Local Storage (`getLocalChunks`)
*   The raw CSV dataset is split into manageable string segments (chunks) via `chunkCSV`.
*   **🤝 In-Flight Coalescing**: Uses `inFlightPromise` to prevent duplicate concurrent CSV downloads when multiple requests hit a cold cache simultaneously.

### C. Full Dataset Assembly (`getTesouroData`)
1.  **🔢 Total Chunks Resolution**: Calls `getCachedTotalChunks()`, which triggers remote validation and queries the distributed cache for chunk lengths.
2.  **🔀 Parallel Fetching**: Gathers all chunk contents concurrently using `getCachedChunkByIndex(i)`.
3.  **🧩 Reassembly & Mapping**: Rebuilds the full CSV text in memory, parses and maps records via `parseAndMapChunks()`, computes the latest database date, and returns a structured `TesouroCache` payload.

### D. Targeted Record Lookup & Lazy Reading (`findTesouroTitulo`)
*   **🎯 Lazy Eligibility Check**: Validates if the query satisfies optimization criteria (`options.limit === 1` with no active date range filters).
*   **⚡ Lazy Execution Path**: If eligible, the service fetches only `chunk0Content`, parses it independently, and resolves the target key instantly without processing the remaining chunks.
*   **🔄 Full Fallback Path**: If full history or filters are requested, it delegates to `getTesouroData()`, filters the resulting record list using `filterTituloHistory()`, and returns the historical dataset structure.