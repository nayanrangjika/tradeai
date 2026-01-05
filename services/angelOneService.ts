
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
   * Login via Proxy
   * Note: The server expects 'totpKey' (the secret) to generate the code server-side.
   */
  login: async (creds: { apiKey: string, clientCode: string, password: string, totp: string }): Promise<Partial<BrokerCredentials>> => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientCode: creds.clientCode,
          password: creds.password,
          totpKey: creds.totp, // Sending SECRET, server generates OTP
          apiKey: creds.apiKey
        })
      });

      const json = await response.json();

      if (json.status === false) {
        throw new Error(json.message || "Login Failed");
      }
      
      if (json.jwtToken) {
        return { jwtToken: json.jwtToken, lastLogin: new Date().toISOString() };
      } else {
        throw new Error("Invalid Session Data");
      }
    } catch (e: any) {
      console.error("Login Proxy Error:", e);
      throw new Error(e.message || "Bridge Connection Failed");
    }
  },

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
