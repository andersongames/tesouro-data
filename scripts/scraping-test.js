(() => {
  const getVal = (id) => document.getElementById(id)?.textContent?.trim() || "Not Found";

  const scrapingData = {
    titulo: getVal("titulo"),
    vencimento: getVal("vencimento"),
    combo: getVal("combo"),
    dataBase: getVal("data-base"),
    taxaCompra: getVal("taxa-compra"),
    taxaVenda: getVal("taxa-venda"),
    puCompra: getVal("pu-compra"),
    puVenda: getVal("pu-venda"),
    puBase: getVal("pu-base"),
    ultimaAtualizacao: getVal("ultima-atualizacao")
  };

  console.log("📊 Data extracted via scraping:", scrapingData);
  return scrapingData;
})();