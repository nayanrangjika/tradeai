
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { SmartAPI } from 'smartapi-javascript';
// Fix: Handle both default and named imports for totp-generator depending on version
import * as TOTPGen from 'totp-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable Permissive CORS for MVP to ensure "Bridge Connected" status works across all local setups
app.use(cors({ origin: true })); 

app.use(express.json() as any);

const ANGEL_BASE_URL = "https://apiconnect.angelbroking.com";

// --- CACHE FOR TOKENS ---
let SCRIP_MASTER_CACHE: any[] = [];
const SCRIP_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

// --- HELPER: FETCH SCRIP MASTER ---
async function loadScripMaster() {
    if (SCRIP_MASTER_CACHE.length > 0) return;
    console.log("📥 Downloading Angel One Scrip Master...");
    try {
        const { data } = await axios.get(SCRIP_URL);
        SCRIP_MASTER_CACHE = data;
        console.log(`✅ Loaded ${SCRIP_MASTER_CACHE.length} scrips.`);
    } catch (e: any) {
        console.error("❌ Failed to load Scrip Master:", e.message);
    }
}

// --- ROUTE 0: HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({ status: true, message: "Bridge Online" });
});

// --- ROUTE 1: LOGIN ---
app.post('/api/login', async (req, res) => {
    const { clientCode, password, totpKey, otp, apiKey } = req.body;
    try {
        const smart_api = new SmartAPI({ api_key: apiKey });
        
        let finalOtp = otp;
        
        // Only generate OTP if not provided and we have a secret key
        if (!finalOtp && totpKey) {
             try {
                // Handle different import structures for totp-generator
                const generator = (TOTPGen as any).TOTP?.generate || (TOTPGen as any).default?.generate || (TOTPGen as any).generate;
                if (generator) {
                    const result = generator(totpKey);
                    finalOtp = typeof result === 'object' ? result.otp : result;
                } else {
                    console.error("TOTP Generator function not found in import");
                }
             } catch (err) {
                 console.error("TOTP Generation failed:", err);
             }
        }

        if (!finalOtp) {
             return res.status(400).json({ status: false, message: "OTP is required (Manual or Secret)" });
        }

        console.log(`🔐 Attempting login for ${clientCode} with OTP length ${finalOtp.length}...`);
        
        // SmartAPI generateSession returns a promise
        const data = await smart_api.generateSession(clientCode, password, finalOtp);
        
        // Check both data.status and data.data presence
        if (data.status) {
            console.log("✅ Login Successful");
            // Return FULL data object so client can inspect structure
            res.json(data);
        } else {
            console.log("❌ Angel One Login Failed:", data.message);
            res.status(400).json(data);
        }
    } catch (e: any) {
        console.error("❌ Server Login Exception:", e.message, e);
        res.status(500).json({ message: e.message, error: e.toString() });
    }
});

// --- ROUTE 2: TOKEN LOOKUP ---
app.post('/api/token', async (req, res) => {
    const { symbol, exchange = 'NSE' } = req.body;
    await loadScripMaster(); // Ensure cache is loaded

    const scrip = SCRIP_MASTER_CACHE.find((item: any) => 
        item.symbol === symbol && item.exch_seg === exchange
    );

    if (scrip) {
        console.log(`🔍 Found Token: ${symbol} -> ${scrip.token}`);
        res.json({ token: scrip.token, symbol: scrip.symbol, name: scrip.name });
    } else {
        res.status(404).json({ message: "Stock not found in master list" });
    }
});

// --- ROUTE 3: LIVE PRICE (LTP) ---
app.post('/api/ltp', async (req, res) => {
    const { token, symbol, jwt, apiKey } = req.body;
    
    const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': 'MAC_ADDRESS',
        'X-PrivateKey': apiKey
    };

    try {
        const response = await axios.post(`${ANGEL_BASE_URL}/rest/market/data/v1/ltp`, {
            exchange: "NSE",
            tradingsymbol: symbol,
            symboltoken: token
        }, { headers });

        res.json(response.data);
    } catch (e: any) {
        console.error("LTP Error:", e.response?.data || e.message);
        res.status(500).json(e.response?.data || { message: e.message });
    }
});

// --- ROUTE 4: HISTORICAL DATA ---
app.post('/api/history', async (req, res) => {
    const { token, interval, fromdate, todate, jwt, apiKey } = req.body;

    const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': 'MAC_ADDRESS',
        'X-PrivateKey': apiKey
    };

    try {
        // Crucial Fix: symboltoken must be String. Axios might pass number if not cast.
        const payload = {
            exchange: "NSE",
            symboltoken: String(token), 
            interval: interval,
            fromdate,
            todate
        };
        
        console.log(`Fetching History: ${token} [${interval}]`);

        const response = await axios.post(`${ANGEL_BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData`, 
            payload, 
            { headers }
        );

        res.json(response.data);
    } catch (e: any) {
        console.error("History Error:", e.response?.data?.message || e.message);
        // Pass through the upstream error message for better debugging on frontend
        res.status(500).json(e.response?.data || { message: e.message });
    }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist')) as any);
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✅ Production Server running on port ${PORT}`);
    // Pre-load scrip master on start to reduce latency
    loadScripMaster();
});
