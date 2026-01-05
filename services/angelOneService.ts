
import { BrokerCredentials } from "../types";

// PROXY CONFIGURATION - routes to server.ts
const API_BASE = "/api"; 

export const angelOne = {
  checkHealth: async (): Promise<boolean> => {
    try {
      // Use dedicated health endpoint for lighter check
      const response = await fetch(`${API_BASE}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Resolve Scrip Token dynamically from Server Master
   */
  resolveToken: async (symbol: string, exchange: string = 'NSE'): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, exchange })
      });
      const json = await response.json();
      return json.token || null;
    } catch (e) {
      console.warn(`Token resolution failed for ${symbol}`, e);
      return null;
    }
  },

  /**
   * Login via Proxy
   */
  login: async (creds: { apiKey: string, clientCode: string, password: string, totp: string }): Promise<Partial<BrokerCredentials>> => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientCode: creds.clientCode,
          password: creds.password,
          otp: creds.totp, // Sending the 6-digit code calculated by client
          apiKey: creds.apiKey
        })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || json.error || `Server Error (${response.status})`);
      }

      // Check status field if it exists (SmartAPI returns it)
      if (json.status === false) {
        throw new Error(json.message || "Login Failed");
      }
      
      // SmartAPI response structure: { status: true, message: "...", data: { jwtToken: "..." } }
      // We check multiple locations for robustness
      const jwtToken = json.data?.jwtToken || json.jwtToken;
      const refreshToken = json.data?.refreshToken || json.refreshToken;
      const feedToken = json.data?.feedToken || json.feedToken;

      if (jwtToken) {
        return { 
          jwtToken, 
          refreshToken, 
          feedToken, 
          lastLogin: new Date().toISOString() 
        };
      } else {
        console.error("Missing JWT in response:", json);
        throw new Error("Invalid Session Data: JWT Token missing from response");
      }
    } catch (e: any) {
      console.error("Login Proxy Error:", e);
      throw new Error(e.message || "Bridge Connection Failed");
    }
  },

  /**
   * Get basic LTP (Number only)
   */
  getLTP: async (token: string, symbol: string, jwt: string, apiKey: string): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE}/ltp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          symbol, 
          jwt, 
          apiKey 
        })
      });
      const json = await response.json();
      return json.data?.ltp ? parseFloat(json.data.ltp) : 0;
    } catch (e) {
      console.error(`LTP Proxy Failed for ${symbol}:`, e);
      return 0;
    }
  },

  /**
   * Get Full Market Data (Price, Change, etc)
   */
  getMarketData: async (token: string, symbol: string, jwt: string, apiKey: string) => {
    try {
      const response = await fetch(`${API_BASE}/ltp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          symbol, 
          jwt, 
          apiKey 
        })
      });
      const json = await response.json();
      
      if (json.data) {
        const ltp = parseFloat(json.data.ltp || 0);
        const close = parseFloat(json.data.close || 0); // Previous Close
        const change = close > 0 ? ((ltp - close) / close) * 100 : 0;
        
        return {
          price: ltp,
          change: change,
          open: parseFloat(json.data.open || 0),
          high: parseFloat(json.data.high || 0),
          low: parseFloat(json.data.low || 0),
          token: token
        };
      }
      return null;
    } catch (e) {
      console.error(`Market Data Proxy Failed for ${symbol}:`, e);
      return null;
    }
  },

  getHistoricalData: async (token: string, interval: string, apiKey: string, jwt: string, customFrom?: string, customTo?: string) => {
    const format = (d: Date) => d.toISOString().split('T')[0] + " " + d.toTimeString().split(' ')[0].substring(0, 5);
    const fromdate = customFrom || format(new Date(Date.now() - 86400000 * 5)); // 5 days back
    const todate = customTo || format(new Date());

    try {
      const response = await fetch(`${API_BASE}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, 
          interval, 
          fromdate, 
          todate,
          jwt, 
          apiKey
        })
      });
      const json = await response.json();
      
      if (json.status && json.data) {
        return json.data.map((i: any[]) => ({ 
          time: Math.floor(new Date(i[0]).getTime() / 1000), 
          open: i[1], 
          high: i[2], 
          low: i[3], 
          close: i[4] 
        }));
      }
      return [];
    } catch (e) {
      console.error("History Proxy Failed:", e);
      return [];
    }
  }
};
