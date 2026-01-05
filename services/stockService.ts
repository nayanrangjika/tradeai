
import { StockData, TradeSignal, SignalTimeframe, MarketMood } from "../types";
import { NIFTY_50_STOCKS, getMarketStatus } from "../constants";
import { analyzeStock, getMarketMood } from "./geminiService";
import { angelOne } from "./angelOneService";

/**
 * Calculates Technical Indicators from OHLC data
 */
const calculateIndicators = (candles: any[]) => {
  if (!candles || candles.length < 14) {
    return { rsi: 50, ema50: 0, ema200: 0, vwap: 0, trend: 'Consolidating' as const };
  }

  const closes = candles.map(c => c.close);
  const lastPrice = closes[closes.length - 1];

  // 1. RSI(14)
  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1);
  const rsi = 100 - (100 / (1 + rs));

  // 2. EMAs
  const calculateEMA = (period: number) => {
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] * k) + (ema * (1 - k));
    }
    return ema;
  };

  // 3. VWAP
  let totalTypicalPriceVol = 0;
  let totalVol = 0;
  candles.slice(-50).forEach(c => {
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
  // Default fallback if stock not in constant list, though usually it is.
  const token = stock ? stock.token : '0'; 

  const jwt = localStorage.getItem('ao_jwt');
  const apiKey = localStorage.getItem('ao_api_key');
  
  if (jwt && apiKey && token !== '0') {
    try {
      // Try fetching live LTP first
      const price = await angelOne.getLTP(token, symbol, jwt, apiKey);
      
      // If price is 0 (Market Closed / Data Issue), try fetching latest historical candle close
      if (price === 0) {
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

const fetchLiveStockData = async (symbol: string, token: string): Promise<StockData | null> => {
  const jwt = localStorage.getItem('ao_jwt');
  const apiKey = localStorage.getItem('ao_api_key') || 'A3uaTHcN';
  
  if (!jwt) return null;

  try {
    const candles = await angelOne.getHistoricalData(token, "FIFTEEN_MINUTE", apiKey, jwt);
    if (!candles || candles.length === 0) return null;

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

export const runMarketScanner = async (onProgress: (msg: string) => void): Promise<TradeSignal[]> => {
  const activeSignals: TradeSignal[] = [];

  onProgress("Initializing Parallel Bridge...");
  
  // Scan specific liquid stocks
  const targetStocks = NIFTY_50_STOCKS.slice(0, 6);
  
  // 1. Fetch all stock data in parallel
  onProgress("Fetching Market Data...");
  const dataPromises = targetStocks.map(async (stock) => {
    try {
      const data = await fetchLiveStockData(stock.symbol, stock.token);
      return data;
    } catch (e) {
      return null;
    }
  });

  const allData = await Promise.all(dataPromises);
  const validData = allData.filter(d => d !== null) as StockData[];

  // 2. Run AI Analysis
  // We can also parallelize this, but let's batch it to avoid rate limiting if using free tier
  onProgress(`Neural Analysis on ${validData.length} Stocks...`);
  
  const analysisPromises = validData.map(async (data) => {
    try {
        const signals: TradeSignal[] = [];
        const intradaySignal = await analyzeStock(data, SignalTimeframe.INTRADAY);
        if (intradaySignal) signals.push(intradaySignal);
        
        // Optional: Run swing scan only if Intraday isn't found to save tokens, or run both.
        // For speed, let's run both.
        const swingSignal = await analyzeStock(data, SignalTimeframe.SWING);
        if (swingSignal) signals.push(swingSignal);
        
        return signals;
    } catch (e) {
        return [];
    }
  });

  const results = await Promise.all(analysisPromises);
  results.forEach(res => activeSignals.push(...res));
  
  onProgress("Market Scan Complete");
  return activeSignals;
};
