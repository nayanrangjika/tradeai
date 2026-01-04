
import { BrokerCredentials } from "../types";
import { WORLD_STOCKS, API_KEYS } from "../constants";

const BASE_URL = "https://apiconnect.angelbroking.com";

/**
 * Safe JSON parser to prevent "Unexpected end of JSON input" errors.
 */
const safeJsonParse = (text: string) => {
  if (!text || text.trim() === "" || text.startsWith("<!DOCTYPE")) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

/**
 * Standard headers required by Angel One SmartAPI.
 * Prioritizes the API key tied to the active session.
 */
const getStandardHeaders = (apiKeyOverride?: string, jwt?: string) => {
  // CRITICAL: X-PrivateKey MUST match the API Key used to create the JWT session.
  const activeKey = apiKeyOverride || localStorage.getItem('ao_api_key') || API_KEYS.TRADING;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': activeKey,
    'X-ClientLocalIP': '192.168.1.1',
    'X-ClientPublicIP': '106.193.147.210',
    'X-MACAddress': '02:00:00:00:00:00'
  };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  return headers;
};

export const angelOne = {
  /**
   * Performs a handshake with Angel One SmartAPI.
   */
  login: async (creds: { apiKey: string, clientCode: string, password: string, totp: string }): Promise<Partial<BrokerCredentials>> => {
    try {
      const response = await fetch(`${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers: getStandardHeaders(creds.apiKey),
        body: JSON.stringify({
          clientcode: creds.clientCode.trim().toUpperCase(),
          password: creds.password.trim(),
          totp: creds.totp.trim()
        })
      });

      const text = await response.text();
      const json = safeJsonParse(text);

      if (json && json.status === true && json.data) {
        return {
          jwtToken: json.data.jwtToken,
          refreshToken: json.data.refreshToken,
          feedToken: json.data.feedToken,
          lastLogin: new Date().toISOString()
        };
      } else {
        if (text.startsWith("<!")) {
          throw new Error("CORS_BLOCKED");
        }
        const errorCode = json?.errorcode ? ` [${json.errorcode}]` : "";
        const apiMessage = (json?.message || `Handshake Error ${response.status}`) + errorCode;
        throw new Error(apiMessage);
      }
    } catch (e: any) {
      if (e.message === "CORS_BLOCKED") {
        throw new Error("CORS Blocked: Enable 'Allow CORS' extension to bridge with Angel One.");
      }
      throw e;
    }
  },

  /**
   * Fetches the Last Traded Price (LTP).
   */
  getLTP: async (token: string, symbol: string, jwt: string, apiKey?: string): Promise<number> => {
    try {
      const response = await fetch(`${BASE_URL}/rest/market/data/v1/ltp`, {
        method: 'POST',
        headers: getStandardHeaders(apiKey, jwt),
        body: JSON.stringify({ exchange: "NSE", tradingsymbol: symbol, symboltoken: token })
      });

      const text = await response.text();
      const json = safeJsonParse(text);
      if (json?.status && json?.data?.ltp) {
        return parseFloat(json.data.ltp);
      }
      return 0;
    } catch (e) {
      console.error("LTP Fetch Error:", e);
      return 0;
    }
  },

  /**
   * Fetches historical candle data.
   */
  getHistoricalData: async (token: string, interval: string, apiKey: string, jwt: string, customFrom?: string, customTo?: string) => {
    try {
      const formatAngelDate = (d: Date) => {
        const datePart = d.toISOString().split('T')[0];
        const timePart = d.toTimeString().split(' ')[0].substring(0, 5);
        return `${datePart} ${timePart}`;
      };

      const fromdate = customFrom || formatAngelDate(new Date(Date.now() - 86400000 * 3)); 
      const todate = customTo || formatAngelDate(new Date());

      // Use the provided API Key or fallback to session key
      const response = await fetch(`${BASE_URL}/rest/ms/api/v1/data/chart/fetchData`, {
        method: 'POST',
        headers: getStandardHeaders(apiKey, jwt),
        body: JSON.stringify({
          exchange: "NSE",
          symboltoken: token,
          interval: interval || "FIFTEEN_MINUTE",
          fromdate,
          todate
        })
      });

      const text = await response.text();
      const json = safeJsonParse(text);

      if (json && json.status && json.data && json.data.length > 0) {
        return json.data.map((item: any[]) => ({
          time: Math.floor(new Date(item[0]).getTime() / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        }));
      }
      
      if (json && json.status && (!json.data || json.data.length === 0)) {
        console.warn(`[AngelOne] Historical payload empty for ${token}. Likely off-market hours or invalid range.`);
      }
      
      return null;
    } catch (e) {
      console.error("Historical Data Exception:", e);
      return null;
    }
  }
};
