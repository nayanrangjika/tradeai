
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors() as any);
app.use(express.json() as any);

const ANGEL_BASE_URL = "https://apiconnect.angelbroking.com";

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/bridge', async (req, res) => {
  const { action, data } = req.body;
  
  console.log(`[Bridge] Request: ${action}`);

  if (!action) return res.status(400).json({ status: false, message: "Missing action" });

  let apiPath = "";
  switch (action) {
    case "login": apiPath = "/rest/auth/angelbroking/user/v1/loginByPassword"; break;
    case "ltp": apiPath = "/rest/market/data/v1/ltp"; break;
    case "history": apiPath = "/rest/ms/api/v1/data/chart/fetchData"; break;
    default: return res.status(400).json({ status: false, message: "Invalid action" });
  }

  const angelHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-PrivateKey": req.headers["x-privatekey"] || "",
    "X-ClientLocalIP": "127.0.0.1",
    "X-ClientPublicIP": "127.0.0.1",
    "X-MACAddress": "02:00:00:00:00:00"
  };

  if (req.headers["authorization"]) {
    // @ts-ignore
    angelHeaders["Authorization"] = req.headers["authorization"];
  }

  try {
    const response = await axios({
      method: "POST",
      url: `${ANGEL_BASE_URL}${apiPath}`,
      data: data || {}, // Ensure data object is passed correctly
      headers: angelHeaders,
      timeout: 15000
    });
    console.log(`[Bridge] Success: ${action} - ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`[Bridge] Error: ${action} - ${error.message}`);
    
    // Extract precise error from Angel One if available
    const status = error.response?.status || 500;
    const errBody = error.response?.data || { message: error.message };
    
    // Log detailed upstream error for debugging
    if(error.response?.data) {
        console.error(`[Bridge] Upstream Error Data:`, JSON.stringify(error.response.data));
    }

    res.status(status).json(errBody);
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')) as any);

// Handle React Router - Fallback to index.html for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Bind to 0.0.0.0 to allow access from all interfaces (important for containers/cloud)
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Furon Proxy running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
});
