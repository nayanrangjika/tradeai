
import { angelOne } from './services/angelOneService';
import { API_KEYS } from './constants';

export async function verifyData(token, symbol) {
  const jwt = localStorage.getItem('ao_jwt');
  const activeKey = localStorage.getItem('ao_api_key') || API_KEYS.TRADING;

  if (!jwt) {
    console.error("[Task 2] Error: No active session. Please connect via AuthGate first.");
    return null;
  }

  console.log(`[Task 2] Verifying ${symbol} (Token: ${token}) using Active Session Key: ${activeKey.substring(0,4)}...`);
  
  const now = new Date();
  const threeDaysAgo = new Date(Date.now() - 86400000 * 3);

  const format = (d) => {
    const dp = d.toISOString().split('T')[0];
    const tp = d.toTimeString().split(' ')[0].substring(0, 5);
    return `${dp} ${tp}`;
  };

  const fromDateStr = format(threeDaysAgo);
  const toDateStr = format(now);

  try {
    // We pass the key used for the session to ensure authorization header validity
    const data = await angelOne.getHistoricalData(String(token), "FIFTEEN_MINUTE", activeKey, jwt, fromDateStr, toDateStr);
    
    if (data && data.length > 0) {
      const last3 = data.slice(-3);
      console.log(`[Task 2] Successfully retrieved ${data.length} bars.`);
      return last3;
    } else {
      console.warn("[Task 2] Historical data array is empty or null. Try again during market hours or check 'Allow CORS' status.");
      return null;
    }
  } catch (error) {
    console.error("[Task 2] Verification failed:", error.message);
    return null;
  }
}
