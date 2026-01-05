
import { BrokerCredentials } from "../types";

// Helper to determine the API URL.
// 1. Checks LocalStorage for a user-override (set in Settings).
// 2. Fallbacks to relative path "/api/bridge" which relies on Vite Proxy or Server routing.
const getProxyUrl = () => {
  const override = localStorage.getItem('ao_proxy_url_override');
  if (override && override.startsWith('http')) {
    // Ensure we don't double slash if user input is sloppy
    return override.replace(/\/+$/, ''); 
  }
  return "/api/bridge";
};

const getHealthUrl = () => {
  const override = localStorage.getItem('ao_proxy_url_override');
  if (override && override.startsWith('http')) {
    // If override is "http://localhost:8080/api/bridge", we want "http://localhost:8080/api/health"
    // Heuristic: remove last segment if it is "bridge"
    if (override.endsWith('/bridge')) {
       return override.replace('/bridge', '/health');
    }
    return override + '/health';
  }
  return "/api/health";
};

export const angelOne = {
  checkHealth: async (): Promise<boolean> => {
    // 1. Try Configured URL (default /api/health)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(getHealthUrl(), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return true;
    } catch (e) { 
      // Proceed to fallback
    }

    // 2. Fallback: Try Direct Localhost (Fix for broken Vite Proxy or missing Override)
    // We only try this if the current config failed.
    const fallbackUrl = "http://localhost:8080/api/health";
    // Avoid double-checking if we just checked this exact URL
    if (getHealthUrl() !== fallbackUrl) {
      try {
          console.log("Attempting fallback connection to localhost:8080...");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(fallbackUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (res.ok) {
              console.log("Direct connection successful. Updating configuration.");
              // Auto-fix the configuration for the user
              localStorage.setItem('ao_proxy_url_override', 'http://localhost:8080/api/bridge');
              return true;
          }
      } catch (e) { /* Fallback failed too */ }
    }

    return false;
  },

  login: async (creds: { apiKey: string, clientCode: string, password: string, totp: string }): Promise<Partial<BrokerCredentials>> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

    try {
      const response = await fetch(getProxyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PrivateKey': creds.apiKey },
        body: JSON.stringify({
          action: 'login',
          data: { clientcode: creds.clientCode, password: creds.password, totp: creds.totp }
        }),
        signal: controller.signal
      });

      const text = await response.text();

      if (!response.ok) {
        let errorMsg = `Server Error: ${response.status}`;
        try {
          const errData = JSON.parse(text);
          if (errData.message) errorMsg = errData.message;
        } catch {}
        // Append partial response text if not JSON for debugging
        if (!errorMsg.includes(text) && text.length < 100) {
           errorMsg += ` (${text})`; 
        }
        throw new Error(errorMsg);
      }

      if (!text) {
        throw new Error("Empty response from Bridge Server. Check server console.");
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON received: "${text.substring(0, 30)}..."`);
      }
      
      // SmartAPI specific success check
      if (json.status === true && json.data) {
        return { jwtToken: json.data.jwtToken, lastLogin: new Date().toISOString() };
      } else {
        // SmartAPI returns 200 OK but status: false for logic errors (invalid pass, etc)
        throw new Error(json.message || "Invalid Credentials or API Key");
      }
    } catch (e: any) {
      console.error("Login Failed:", e);
      if (e.name === 'AbortError') {
        throw new Error("Connection Timeout. Is 'npm run server' running?");
      }
      // Check if it's a network error (server not running)
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('Connection refused')) {
        throw new Error("Bridge Offline. Ensure 'npm run server' is active.");
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  getLTP: async (token: string, symbol: string, jwt: string, apiKey: string): Promise<number> => {
    try {
      const response = await fetch(getProxyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PrivateKey': apiKey, 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ action: 'ltp', data: { exchange: "NSE", tradingsymbol: symbol, symboltoken: token } })
      });
      const json = await response.json();
      return json.data?.ltp ? parseFloat(json.data.ltp) : 0;
    } catch { return 0; }
  },

  getHistoricalData: async (token: string, interval: string, apiKey: string, jwt: string, customFrom?: string, customTo?: string) => {
    const format = (d: Date) => d.toISOString().split('T')[0] + " " + d.toTimeString().split(' ')[0].substring(0, 5);
    const fromdate = customFrom || format(new Date(Date.now() - 86400000 * 3));
    const todate = customTo || format(new Date());

    try {
      const response = await fetch(getProxyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PrivateKey': apiKey, 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({
          action: 'history',
          data: { exchange: "NSE", symboltoken: token, interval, fromdate, todate }
        })
      });
      const json = await response.json();
      return json.data?.map((i: any[]) => ({ time: Math.floor(new Date(i[0]).getTime() / 1000), open: i[1], high: i[2], low: i[3], close: i[4] })) || [];
    } catch (e) {
      console.error("History Fetch Error:", e);
      return [];
    }
  }
};
