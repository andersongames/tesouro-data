# 📊 Tesouro Data

Tesouro Data is a lightweight web application that allows users to search, visualize, and integrate data from Brazilian government bonds (Tesouro Direto) in a simple and efficient way.

The project focuses on:

- ⚡ **High performance** (pre-generated static partitioned datasets)
- 🔎 **Simple search experience**
- 🔗 **Easy integration** via URL, scraping, or API
- 🧱 **Clean architecture** and maintainable code

## ✨ Features

- 🔍 Search by bond type and maturity date
- 📄 Dedicated result page optimized for scraping
- 📈 Historical data support
- 🔗 Direct access via URL
- ⚡ Partitioned local JSON datasets (`tesouro-YYYY.json`) for O(1) lookup and instant responses
- 🧪 Fully testable service layer & automated CI pipeline

## 🗂️ Data Source

All data comes from the official Brazilian Treasury transparency portal:

* 📥 **Dataset page:** [https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1](https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1)
* 📄 **CSV file (used by the dataset generation scripts):** [https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv](https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv)

### Notes
- Data is updated daily via automated generation scripts
- Dates follow ISO format: `YYYY-MM-DD`
- Datasets are partitioned by maturity year and indexed for fast access

## 🌐 Usage

### 🔎 Search
Go to `/search`, select:
1. Bond type
2. Maturity date
3. Click Search → result opens in a new tab.

### 🔗 Direct URL Access
You can access any title directly:
`/titulo/{tipo}/{vencimento}`

The `vencimento` parameter supports two formats:

- ISO: `YYYY-MM-DD`
- BR: `DD-MM-YYYY`

**Examples:**

`/titulo/Tesouro%20Prefixado/2029-01-01`  
`/titulo/Tesouro%20Prefixado/01-01-2029`

> Other formats (e.g., `DD/MM/YYYY`) are not supported.

## 🤖 API Usage

### 📌 GET /api/titulo
Returns historical data for a specific title.

#### Request
`/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01`

#### Date formats
The `vencimento` parameter supports:

- ISO format: `YYYY-MM-DD`
- Brazilian format with hyphen: `DD-MM-YYYY`

#### Examples

`/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01`

`/api/titulo?tipo=Tesouro%20Prefixado&vencimento=01-01-2029`

> The same formats are also supported for `from` and `to` filters.

#### Response
```json
{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "dataBase": "2026-04-10",
      "taxaCompra": 10.45,
      "taxaVenda": 10.30,
      "puCompra": 745.32,
      "puVenda": 742.10,
      "puBase": 743.50
    }
  ],
  "total": 120,
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live"
}
```

#### JavaScript Example
```javascript
const res = await fetch("/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01")
const data = await res.json()
```

#### Python Example
```javascript
import requests
res = requests.get(
    "http://localhost:3000/api/titulo",
    params={
        "tipo": "Tesouro Prefixado",
        "vencimento": "2029-01-01"
    }
)
print(res.json())
```

### 📌 GET /api/titulos

Returns all titles with optional filters.

#### Request
`/api/titulos?maturity=all&grouped=true`

####  Response (grouped=false)
```json
{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "dataBase": "2026-04-10",
      "taxaCompra": 10.45,
      "taxaVenda": 10.30,
      "puCompra": 745.32,
      "puVenda": 742.10,
      "puBase": 743.50
    }
  ],
  "total": 350,
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live",
  "grouped": false
}
```

#### Response (grouped=true)
```json
{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "items": [
        {
          "dataBase": "2026-04-10",
          "taxaCompra": 10.45,
          "taxaVenda": 10.30,
          "puCompra": 745.32,
          "puVenda": 742.10,
          "puBase": 743.50
        }
      ]
    }
  ],
  "total": 25,
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live",
  "grouped": true
}
```
## 🕷️ Scraping

The result page is optimized for scraping using stable IDs.

### Available selectors
* `#titulo`
* `#vencimento`
* `#data-base`
* `#taxa-compra`
* `#taxa-venda`
* `#pu-compra`
* `#pu-venda`
* `#pu-base`
* `#ultima-atualizacao`

### JavaScript Example
```javascript
const res = await fetch("http://localhost:3000/titulo/Tesouro%20Prefixado/2029-01-01")
const html = await res.text()
const doc = new DOMParser().parseFromString(html, "text/html")
const titulo = doc.querySelector("#titulo")?.textContent
const taxa = doc.querySelector("#taxa-compra")?.textContent
console.log({ titulo, taxa })
```

### Google Sheets Example

```bash
=IMPORTXML(
    "http://localhost:3000/titulo/Tesouro%20Prefixado/2029-01-01",
    "//*[@id='taxa-compra']"
)
```

## 🧱 Tech Stack

* ⚛️ **Next.js** (App Router)
* 🟦 **TypeScript**
* 🎨 **Tailwind CSS**
* 🗂️ **Static Partitioned JSON Datasets**
* 🧪 **Vitest** (Testing)

## ⚙️ Running Locally

1. **Clone the repository:**
    ```bash
    git clone https://github.com/andersongames/tesouro-data.git
    ```
    ```bash
    cd tesouro-data
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Run the development server:**
    ```bash
    npm run dev
    ```

4. **App will be available at:**
    ```bash
    http://localhost:3000
    ```

## 🧪 Running Tests

**Run all tests:**
```bash
npm test
```

## 🧠 Architecture Highlights

* 🧩 Separation of concerns (services, parsers, automation scripts, UI)
* ⚡ Static local dataset architecture partitioned by maturity year (tesouro-YYYY.json)
* 🔁 Smart HEAD version check during dataset generation to avoid redundant downloads
* 📦 Indexed Map serialization for instant O(1) lookups without runtime CSV parsing

## 📌 Notes

* Datasets and metadata.json are generated and updated automatically via scripts
* Zero external network latency during API or page requests
* Designed for both human usage and machine consumption

## 📄 License

This project is licensed under the **MIT License**.  
You are free to use, modify, and distribute it with attribution.