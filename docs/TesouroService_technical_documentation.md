# 📚 TesouroService Technical Documentation

This document details the architectural design and execution flow of the updated `tesouro.service.ts`, which manages local static dataset retrieval, yearly partitioning, metadata management, and performance optimizations for the Tesouro Direto data architecture.

---

## ⚡ 1. Core Architectural Features

-   **📂 Static Local Dataset Architecture**: Relies on pre-generated static JSON files stored locally, completely eliminating runtime remote HTTP downloads, distributed caching overhead, and external latency during user requests.
-   **📅 Yearly Partitioning (`tesouro-YYYY.json`)**: Datasets are partitioned by maturity year, allowing the service to target and load only the specific year file required for a query instead of handling a massive monolithic payload.
-   **🏷️ Metadata Management (`metadata.json`)**: Tracks essential dataset parameters such as the last update timestamp (`lastUpdatedAt`), the latest database reference date (`latestDataBase`), and the origin data source (`dataSource`).
-   **🛡️ Graceful Degradation & Fallback**: Safely handles missing dataset files, unparsable contents, or absent metadata by returning safe fallback structures or `null` without crashing the application.
-   **🎯 Direct Key Resolution & Filtering**: Combines normalized title keys (`normalizeTituloKey`) with targeted file system lookups and flexible history filtering (`from`, `to`, `limit`).

---

## ⚙️ 2. Execution & Caching Flow

### A. Metadata Loading (`loadLocalMetadata`)
-   **📁 File Verification**: Inspects the local datasets directory for `metadata.json`.
-   **🛡️ Safe Fallbacks**: If the metadata file is missing or fails to parse, it logs a warning and returns safe runtime fallback values (`lastUpdatedAt` set to current ISO timestamp, `latestDataBase` as `null`, and `dataSource` as `"unknown"`).

### B. Yearly Partition Mapping (`loadLocalYearStaticMap`)
-   **🎯 Target Year Extraction**: Extracts the 4-digit maturity year from the requested title's maturity ISO date (`vencimentoISO.slice(0, 4)`).
-   **📄 Targeted File Read**: Locates and reads `tesouro-[year].json` directly from the local datasets path.
-   **🗺️ Map Reconstruction**: Parses the stored JSON entries array back into a performant JavaScript `Map<string, TesouroTitulo[]>` for O(1) key lookups.

### C. Full Dataset Assembly (`getTesouroData`)
1.  **📂 Directory Scan**: Reads all partitioned static JSON files starting with `tesouro-` from the datasets directory via `loadAllLocalStaticMaps()`.
2.  **🧩 Map Merging**: Combines individual year entries into a unified master map and flattens records into the primary data array.
3.  **📦 Payload Return**: Assembles and returns a complete `TesouroCache` structure containing the merged data, master map, and up-to-date metadata attributes.

### D. Targeted Record Lookup & History Filtering (`findTesouroTitulo`)
-   **🔑 Key Normalization**: Computes the target lookup key using `normalizeTituloKey(tipo, vencimentoISO)`.
-   **📅 Partition Isolation**: Loads strictly the corresponding year map via `loadLocalYearStaticMap(maturityYear)`, avoiding full dataset parsing overhead.
-   **🔍 Existence & Data Validation**: Returns `null` immediately if the year file or target key does not exist.
-   **⚙️ Historical Filtering**: Applies optional date range constraints (`from`, `to`) and size restrictions (`limit`) to the retrieved history list through `filterTituloHistory()`, returning a structured `TesouroTituloHistorico` payload sorted by database date descending.