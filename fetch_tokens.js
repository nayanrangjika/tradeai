
import axios from 'axios';

const SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

// Local Scrip Cache for common instruments to bypass CORS in browsers
const SCRIP_CACHE = {
  'SBIN-EQ': { token: '3045', exchange: 'NSE' },
  'NIFTY': { token: '99926000', exchange: 'NSE' },
  'RELIANCE-EQ': { token: '2885', exchange: 'NSE' },
  'SWIGGY-EQ': { token: '13781', exchange: 'NSE' }
};

export async function getToken(symbol, exchange) {
  // Check cache first (Browser Friendly)
  if (SCRIP_CACHE[symbol] && SCRIP_CACHE[symbol].exchange === exchange) {
    console.log(`[Task 1] Cache Hit: ${symbol} -> ${SCRIP_CACHE[symbol].token}`);
    return SCRIP_CACHE[symbol].token;
  }

  console.log(`[Task 1] Attempting Scrip Master download (CORS Restricted)...`);
  try {
    const response = await axios.get(SCRIP_MASTER_URL, { timeout: 5000 });
    const data = response.data;
    const result = data.find(item => item.symbol === symbol && item.exch_seg === exchange);
    
    if (result) {
      return result.token;
    }
    return null;
  } catch (error) {
    console.warn("[Task 1] Scrip Master unreachable (CORS). Using Local Registry.");
    return null; 
  }
}

// Internal check for debug
export async function runTokenCheck() {
  const sbinToken = await getToken('SBIN-EQ', 'NSE');
  const niftyToken = await getToken('NIFTY', 'NSE');
  return { sbinToken, niftyToken };
}
