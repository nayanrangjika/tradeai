
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
  if (!stock) return 0;

  const jwt = localStorage.getItem('ao_jwt');
  const apiKey = localStorage.getItem('ao_api_key');
  
  if (jwt && apiKey) {
    try {
      return await angelOne.getLTP(stock.token, symbol, jwt, apiKey);
    } catch (e) {
      console.warn(`LTP Fetch Failed for ${symbol}`);
    }
  }

  return stock.base || 0;
};

export const fetchMarketMood = async (): Promise<MarketMood> => {
  // Fix: getMarketMood in geminiService.ts takes 0 arguments. Removed local status and realNiftyData.
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
  const savedFeedback = localStorage.getItem('furon_feedback_db');
  const stockFeedbackMap = savedFeedback ? JSON.parse(savedFeedback) : {};

  onProgress("Initializing Production Bridge...");
  const targetStocks = NIFTY_50_STOCKS.slice(0, 6);
  
  for (const stock of targetStocks) {
    onProgress(`Downloading history for ${stock.symbol}...`);
    const data = await fetchLiveStockData(stock.symbol, stock.token);
    
    if (!data) {
      onProgress(`Sync Error: ${stock.symbol}`);
      continue;
    }

    onProgress(`Neural Analysis: ${stock.symbol}...`);
    
    try {
      // Fix: analyzeStock in geminiService.ts takes 2 arguments. Removed unused feedbackHistory.
      const intradaySignal = await analyzeStock(data, SignalTimeframe.INTRADAY);
      if (intradaySignal) activeSignals.push(intradaySignal);

      // Fix: analyzeStock in geminiService.ts takes 2 arguments. Removed unused feedbackHistory.
      const swingSignal = await analyzeStock(data, SignalTimeframe.SWING);
      if (swingSignal) activeSignals.push(swingSignal);
    } catch (e) {
      console.error(`AI Logic Error for ${stock.symbol}`, e);
    }
  }
  
  onProgress("Market Scan Complete");
  return activeSignals;
};
