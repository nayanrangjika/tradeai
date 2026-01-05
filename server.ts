
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
let EQUITY_CACHE_NSE: any[] = []; // Optimization: Pre-filtered list
let scripLoadingPromise: Promise<void> | null = null;
const SCRIP_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

// --- HELPER: FETCH SCRIP MASTER (SINGLETON) ---
async function loadScripMaster() {
    // If already loaded, return
    if (SCRIP_MASTER_CACHE.length > 0) return;
    
    // If loading is in progress, wait for it
    if (scripLoadingPromise) {
        return scripLoadingPromise;
    }

    console.log("📥 Downloading Angel One Scrip Master...");
    scripLoadingPromise = (async () => {
        try {
            const { data } = await axios.get(SCRIP_URL, { timeout: 30000 }); // 30s timeout for large file
            if (Array.isArray(data) && data.length > 0) {
                SCRIP_MASTER_CACHE = data;
                
                // Pre-filter for NSE Equities ending in -EQ for faster random sampling
                EQUITY_CACHE_NSE = data.filter((item: any) => 
                    item.exch_seg === 'NSE' && 
                    item.symbol.endsWith('-EQ') && 
                    !item.symbol.includes('TEST')
                );

                console.log(`✅ Loaded ${SCRIP_MASTER_CACHE.length} total scrips.`);
                console.log(`✅ Cached ${EQUITY_CACHE_NSE.length} NSE Equities.`);
            } else {
                console.warn("⚠️ Scrip Master downloaded but empty/invalid format.");
            }
        } catch (e: any) {
            console.error("❌ Failed to load Scrip Master:", e.message);
        } finally {
            scripLoadingPromise = null;
        }
    })();

    return scripLoadingPromise;
}

// --- ROUTE 0: HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({ status: true, message: "Bridge Online", scripsLoaded: SCRIP_MASTER_CACHE.length });
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
    
    // Ensure cache is loaded before searching
    await loadScripMaster();

    if (SCRIP_MASTER_CACHE.length === 0) {
        return res.status(503).json({ message: "Scrip Master not ready yet" });
    }

    const cleanSymbol = symbol.toUpperCase();

    // 1. Exact Match
    let scrip = SCRIP_MASTER_CACHE.find((item: any) => 
        item.symbol === cleanSymbol && item.exch_seg === exchange
    );

    // 2. Fuzzy Match (Try removing or adding '-EQ')
    if (!scrip) {
        const altSymbol = cleanSymbol.endsWith('-EQ') ? cleanSymbol.replace('-EQ', '') : cleanSymbol + '-EQ';
        scrip = SCRIP_MASTER_CACHE.find((item: any) => 
            item.symbol === altSymbol && item.exch_seg === exchange
        );
    }

    if (scrip) {
        console.log(`🔍 Found Token: ${cleanSymbol} -> ${scrip.token}`);
        res.json({ token: scrip.token, symbol: scrip.symbol, name: scrip.name });
    } else {
        console.warn(`❌ Token Not Found: ${cleanSymbol} [${exchange}]`);
        // Return 404 but with JSON so frontend handles it gracefully
        res.status(404).json({ message: "Stock not found in master list", symbol });
    }
});

// --- ROUTE 2.5: RANDOM STOCKS FOR SCANNER ---
app.get('/api/stocks/random', async (req, res) => {
    await loadScripMaster();
    
    if (EQUITY_CACHE_NSE.length === 0) {
        return res.status(503).json({ message: "Master list loading..." });
    }

    const limit = parseInt(req.query.limit as string) || 12;
    const randomStocks = [];
    const usedIndices = new Set();
    const max = EQUITY_CACHE_NSE.length;

    // Pick 'limit' random stocks
    while(randomStocks.length < limit && usedIndices.size < max) {
        const idx = Math.floor(Math.random() * max);
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            randomStocks.push({
                symbol: EQUITY_CACHE_NSE[idx].symbol,
                token: EQUITY_CACHE_NSE[idx].token
            });
        }
    }

    res.json(randomStocks);
});

// --- ROUTE 3: LIVE PRICE (LTP) ---
app.post('/api/ltp', async (req, res) => {
    const { token, symbol, jwt, apiKey } = req.body;
    
    if (!token || token === "0" || token === "undefined") {
        return res.status(400).json({ message: "Invalid Token" });
    }

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
            symboltoken: String(token)
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

    // VALIDATION: Prevent 500s by checking token before sending
    if (!token || token === "0" || token === "undefined" || token === "null") {
        console.warn("⚠️ Rejected History Request: Invalid Token");
        return res.status(400).json({ message: "Invalid Token provided for history" });
    }

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
    // Trigger download immediately on start
    loadScripMaster();
});
