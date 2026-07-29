const API_BASE_URL = "http://127.0.0.1:8000/api";

export async function fetchAssets() {
  const response = await fetch(`${API_BASE_URL}/assets`);
  if (!response.ok) throw new Error("Failed to fetch assets list");
  return response.json();
}

export async function fetchTickerDetails(ticker) {
  const response = await fetch(`${API_BASE_URL}/ticker/${ticker}`);
  if (!response.ok) throw new Error(`Failed to fetch details for ${ticker}`);
  return response.json();
}

export async function fetchHistoricalData(ticker, period = "1y", interval = "1d") {
  const response = await fetch(`${API_BASE_URL}/historical/${ticker}?period=${period}&interval=${interval}`);
  if (!response.ok) throw new Error(`Failed to fetch history for ${ticker}`);
  return response.json();
}

export async function fetchSentiment(ticker) {
  const response = await fetch(`${API_BASE_URL}/sentiment/${ticker}`);
  if (!response.ok) throw new Error(`Failed to fetch sentiment for ${ticker}`);
  return response.json();
}

export async function predictPrices(payload) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to generate prediction");
  }
  return response.json();
}

export async function runPortfolioOptimization(payload) {
  const response = await fetch(`${API_BASE_URL}/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to optimize portfolio");
  }
  return response.json();
}
