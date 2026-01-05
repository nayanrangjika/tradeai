
import { StockData, TradeSignal, SignalTimeframe, MarketMood } from "../types";
import { TARGET_SYMBOLS, NIFTY_50_STOCKS } from "../constants";
import { analyzeStock, getMarketMood } from "./geminiService";
import { angelOne } from "./angelOneService";

/**
 * Calculates Technical Indicators from OHLC data
 */
const calculateIndicators = (candles: any[]) => {
  // We need at least 14 candles for RSI. 
  if (!candles || candles.length < 14) {
    return { rsi: 50, ema50: 0, ema200: 0, vwap: 0, trend: 'Consolidating' as const };
  }

  const closes = candles.map(c => c.close);
  
  // 1. RSI(14)
  let gains = 0, losses = 0;
  // Initialize first average
  for (let i = 1; i <= 14; i++) {
     const diff = closes[i] - closes[i - 1];
     if (diff >= 0) gains += diff;
     else losses -= diff;
  }
  let avgGain = gains / 14;
  let avgLoss = losses / 14;
  
  // Smooth subsequent
  let rsi = 50;
  for (let i = 15; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      
      avgGain = ((avgGain * 13) + gain) / 14;
      avgLoss = ((avgLoss * 13) + loss) / 14;
  }
  
  if (avgLoss === 0) rsi = 100;
  else {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
  }

  // 2. EMAs
  const calculateEMA = (period: number) => {
    if (closes.length < period) return closes[closes.length - 1];
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] * k) + (ema * (1 - k));
    }
    return ema;
  };

  // 3. VWAP (Approximate using available volume data)
  let totalTypicalPriceVol = 0;
  let totalVol = 0;
  // Use last 50 candles or max available
  const vwapSubset = candles.slice(Math.max(0, candles.length - 50));
  vwapSubset.forEach(c => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = (c.volume || 1000);
    totalTypicalPriceVol += typicalPrice * vol;
    totalVol += vol;
  });
  const vwap = totalTypicalPriceVol / (totalVol || 1);

  // 4. Trend
  const last5 = closes.slice(-5);
  const isUp = last5.every((v, i) => i === 0 || v >= last5[i-1]);
  const isDown = last5.every((v, i) => i === 0 || v <= last5[i-1]);

  return {
    rsi: parseFloat(rsi.toFixed(2)),
    ema50: parseFloat(calculateEMA(50).toFixed(2)),
    ema200: parseFloat(calculateEMA(200).toFixed(2)),
    vwap: parseFloat(vwap.toFixed(2)),
    trend: (isUp ? 'Higher Highs' : isDown ? 'Lower Lows' : 'Consolidating') as any
  };
};

export const fetchLivePrice = async (symbol: string): Promise<number> => {
  const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol);
  let token = stock ? stock.token : '0'; 

  const jwt = localStorage.getItem('ao_jwt');
  const apiKey = localStorage.getItem('ao_api_key');
  
  if (jwt && apiKey) {
    try {
        if(token === '0') {
             const resolved = await angelOne.resolveToken(symbol);
             if(resolved) token = resolved;
             else return 0;
        }

      const price = await angelOne.getLTP(token, symbol, jwt, apiKey);
      if (price === 0) {
        // Fallback to candle close if LTP is 0
        const candles = await angelOne.getHistoricalData(token, "ONE_DAY", apiKey, jwt);
        if (candles && candles.length > 0) {
          return candles[candles.length - 1].close;
        }
      }
      return price;
    } catch (e) {
      console.warn(`LTP Fetch Failed for ${symbol}`);
    }
  }
  return 0;
};

export const fetchMarketMood = async (): Promise<MarketMood> => {
  return await getMarketMood();
};

const fetchLiveStockData = async (symbol: string, token: string, interval: string): Promise<StockData | null> => {
  const jwt = localStorage.getItem('ao_jwt');
  const apiKey = localStorage.getItem('ao_api_key') || 'A3uaTHcN';
  
  if (!jwt || !token || token === '0') return null;

  // CALCULATE DATE RANGE
  // Crucial Fix: Swing (ONE_DAY) needs ~200 days for EMA200. Intraday needs ~10-20 days.
  const now = new Date();
  const daysToSubtract = interval === "ONE_DAY" ? 300 : 20; 
  const past = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
  
  const format = (d: Date) => d.toISOString().split('T')[0] + " " + d.toTimeString().split(' ')[0].substring(0, 5);
  const fromStr = format(past);
  const toStr = format(now);

  try {
    const candles = await angelOne.getHistoricalData(token, interval, apiKey, jwt, fromStr, toStr);
    
    if (!candles || candles.length === 0) {
        console.warn(`No candles found for ${symbol} (${interval})`);
        return null;
    }

    const lastCandle = candles[candles.length - 1];
    const tech = calculateIndicators(candles);

    return {
      symbol,
      token,
      price: lastCandle.close,
      rsi: tech.rsi,
      ema50: tech.ema50,
      ema200: tech.ema200,
      vwap: tech.vwap,
      volumeStatus: 'NORMAL',
      trendStatus: tech.trend,
      ohlc: { 
        o: lastCandle.open, 
        h: lastCandle.high, 
        l: lastCandle.low, 
        c: lastCandle.close 
      }
    };
  } catch (e) {
    console.error(`Live data fetch failed for ${symbol}`, e);
    return null;
  }
};

/**
 * CORE LOGIC: Process a batch of stocks for signals
 * Modified to support explicit timeframe targeting with correct data intervals
 */
const processBatch = async (batch: {symbol: string, token: string}[], forcedTimeframe?: SignalTimeframe): Promise<TradeSignal[]> => {
    const activeSignals: TradeSignal[] = [];
    
    // Determine Timeframe & Interval
    // Intraday = 15 Minute Data
    // Swing = Daily Data
    const tf = forcedTimeframe || SignalTimeframe.INTRADAY;
    const interval = tf === SignalTimeframe.SWING ? "ONE_DAY" : "FIFTEEN_MINUTE";

    // Fetch Data
    const dataPromises = batch.map(async (stock) => {
        try {
          return await fetchLiveStockData(stock.symbol, stock.token, interval);
        } catch (e) {
          return null;
        }
    });

    const allData = await Promise.all(dataPromises);
    const validData = allData.filter(d => d !== null) as StockData[];

    // Analyze
    const analysisPromises = validData.map(async (data) => {
        try {
            const signals: TradeSignal[] = [];
            const signal = await analyzeStock(data, tf);
            if (signal) signals.push(signal);
            return signals;
        } catch (e) {
            return [];
        }
    });

    const results = await Promise.all(analysisPromises);
    results.forEach(res => activeSignals.push(...res));
    return activeSignals;
}

const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * HELPER: Sort by confidence
 */
const sortByConfidence = (signals: TradeSignal[]): TradeSignal[] => {
    return signals.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * GENERIC SCANNER ORCHESTRATOR
 * Fetches 15 stocks. Splits them. Returns 3 Intraday + 2 Swing.
 */
const runSplitScanner = async (
    candidateSymbols: string[], 
    resolveTokensFunc: (s: string[]) => Promise<{symbol: string, token: string}[]>, 
    onProgress: (msg: string) => void,
    scanType: 'Target' | 'Random'
): Promise<TradeSignal[]> => {
    
    onProgress(`Fetching assets for ${scanType} scan...`);
    
    // 1. Get tokens for candidates
    // We need about 15 stocks to guarantee 5 good signals split 3:2
    const batchSize = 15;
    const selectedSymbols = shuffleArray(candidateSymbols).slice(0, batchSize);
    
    const validBatch = await resolveTokensFunc(selectedSymbols);
    
    if (validBatch.length < 5) {
        onProgress("Not enough valid tokens found. Retrying...");
        return [];
    }

    // 2. Split Batch: First ~60% for Intraday, Rest for Swing
    const splitIndex = Math.ceil(validBatch.length * 0.6); // e.g. 9 stocks for Intraday
    const intradayBatch = validBatch.slice(0, splitIndex);
    const swingBatch = validBatch.slice(splitIndex);

    onProgress(`Analyzing: ${intradayBatch.length} Intraday vs ${swingBatch.length} Swing...`);

    // 3. Run Analysis in Parallel
    const [intradayResults, swingResults] = await Promise.all([
        processBatch(intradayBatch, SignalTimeframe.INTRADAY),
        processBatch(swingBatch, SignalTimeframe.SWING)
    ]);

    // 4. Sort & Select strict counts
    // Target: 3 Intraday, 2 Swing
    const topIntraday = sortByConfidence(intradayResults).slice(0, 3);
    const topSwing = sortByConfidence(swingResults).slice(0, 2);

    onProgress(`Found ${topIntraday.length} Intraday & ${topSwing.length} Swing signals.`);

    return [...topIntraday, ...topSwing];
};


/**
 * SCANNER 1: Specific "Target List" (Blue Chips)
 * Returns 3 Intraday + 2 Swing
 */
export const runTargetScanner = async (onProgress: (msg: string) => void): Promise<TradeSignal[]> => {
    return runSplitScanner(
        [...TARGET_SYMBOLS],
        async (syms) => {
             const batch = await Promise.all(syms.map(async (sym) => {
                const token = await angelOne.resolveToken(sym);
                if(token) return { symbol: sym, token };
                return null;
            }));
            return batch.filter(b => b !== null) as {symbol: string, token: string}[];
        },
        onProgress,
        'Target'
    );
}

/**
 * SCANNER 2: Random Market (Discovery)
 * Returns 3 Intraday + 2 Swing
 */
export const runRandomScanner = async (onProgress: (msg: string) => void): Promise<TradeSignal[]> => {
    // For random, we fetch from API first
    let randomSymbols: string[] = [];
    try {
        const res = await fetch('/api/stocks/random?limit=20'); // Fetch extra
        if (res.ok) {
            const data = await res.json();
            // Tokens are already resolved by the server for random stocks
            const preResolved = data.map((d: any) => ({ symbol: d.symbol, token: d.token }));
            
             onProgress(`Analyzing Random Market Batch...`);
             const splitIndex = Math.ceil(preResolved.length * 0.6);
             const intradayBatch = preResolved.slice(0, splitIndex);
             const swingBatch = preResolved.slice(splitIndex);

             const [iRes, sRes] = await Promise.all([
                processBatch(intradayBatch, SignalTimeframe.INTRADAY),
                processBatch(swingBatch, SignalTimeframe.SWING)
             ]);

             const topIntraday = sortByConfidence(iRes).slice(0, 3);
             const topSwing = sortByConfidence(sRes).slice(0, 2);
             
             return [...topIntraday, ...topSwing];
        }
    } catch (e) {
        console.warn("Random scan fetch failed");
    }
    return [];
}

// Kept for backward compatibility
export const runMarketScanner = async (onProgress: (msg: string) => void): Promise<TradeSignal[]> => {
    return runTargetScanner(onProgress);
};
