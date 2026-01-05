
import { GoogleGenAI, Type } from "@google/genai";
import { TradeSignal, SignalTimeframe, MarketMood, NewsItem } from "../types";

// -----------------------------------------------------------------
// HARDCODE YOUR KEY HERE TO OVERRIDE ALL OTHER SETTINGS
// -----------------------------------------------------------------
const HARDCODED_KEY = ""; 
// -----------------------------------------------------------------

const getAiClient = () => {
  const customKey = localStorage.getItem('custom_gemini_key');
  // Priority: Hardcoded > Custom (LocalStorage) > Env Variable
  return new GoogleGenAI({ apiKey: HARDCODED_KEY || customKey || process.env.API_KEY });
};

const SYSTEM_INSTRUCTION = `
You are a Senior Quantitative Analyst & Sniper Trader acting as an AI assistant for the Indian Equity Markets (NSE).

YOUR GOAL:
- Identify HIGH PROBABILITY trades (Accuracy Target: 65% - 100%).
- Be extremely selective. Quality > Quantity.
- Analyze both Technical Structure and Market Sentiment.

TRADING RULES (STRICT):
1. TREND IS KING: Do not trade against the trend unless there is a clear reversal pattern with volume confirmation.
2. BREAKOUTS: Only valid if accompanied by Volume > 1.5x Avg Volume.
3. RISK MANAGEMENT: Minimum Risk:Reward = 1:2. Never suggest a trade with poor R:R.
4. NEWS FILTER: If a stock has negative breaking news, invalidate any BUY signal regardless of technicals.

MODES:
- INTRADAY (5m/15m): Fast momentum, VWAP support/resistance, RSI divergence. Expected duration: Minutes to Hours.
- SWING (Daily): Trend continuation, Moving Average Crossovers (20/50 EMA), Chart Patterns. Expected duration: Days to Weeks.

CONFIDENCE SCORING:
- 90-100: Perfect Setup (Trend + Vol + Indicators + News all align). "Sniper Entry".
- 80-89: High Probability (Strong tech, neutral news).
- 65-79: Moderate/Good Probability (Good tech, acceptable risk).
- < 65: Low Probability / NO TRADE.

OUTPUT INSTRUCTION:
- If the setup is weak or unclear, return signal "NO TRADE".
- Provide an estimated TIMELINE for the trade (e.g., "2-4 Hours" for Intraday, "3-5 Days" for Swing).
- Be decisive.
`;

export const getMarketMood = async (): Promise<MarketMood> => {
  const ai = getAiClient();
  const prompt = "Analyze Gift Nifty and Indian market sentiment today. Use Google Search. Return JSON: { sentiment: 'Bullish'|'Bearish'|'Choppy', summary: 'String' }";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: { sentiment: { type: Type.STRING }, summary: { type: Type.STRING } },
          required: ["sentiment", "summary"]
        }
      }
    });
    const res = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ title: c.web?.title, uri: c.web?.uri })) || [];
    return { ...res, sources };
  } catch {
    return { sentiment: 'Choppy', summary: 'Market data unavailable.' };
  }
};

export const fetchMarketNews = async (): Promise<NewsItem[]> => {
  const ai = getAiClient();
  const prompt = `Find the top 6 most critical breaking financial news headlines for Indian Stock Market (NSE/BSE) right now. 
  Focus on Nifty 50 companies, earnings results, or RBI policy.
  Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              source: { type: Type.STRING },
              time: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] }
            },
            required: ["title", "summary", "source", "time", "sentiment"]
          }
        }
      }
    });
    
    const items = JSON.parse(response.text || "[]");
    return items.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      time: item.time || 'Today'
    }));
  } catch (e) {
    return [];
  }
};

export const analyzeStock = async (stockData: any, timeframe: SignalTimeframe): Promise<TradeSignal | null> => {
  const ai = getAiClient();
  
  const prompt = `
    Analyze ${stockData.symbol}.
    
    Technical Data:
    - Price: ${stockData.price}
    - RSI: ${stockData.rsi}
    - Trend: ${stockData.trendStatus}
    - VWAP: ${stockData.vwap}
    - OHLC: Open ${stockData.ohlc.o}, High ${stockData.ohlc.h}, Low ${stockData.ohlc.l}, Close ${stockData.ohlc.c}
    
    Context:
    - Mode: ${timeframe === 'INTRADAY' ? 'Intraday Mode (5m/15m)' : 'Swing Mode (Daily)'}
    
    ACTION:
    1. Search for latest news on ${stockData.symbol}.
    2. Apply "Sniper Trader" logic.
    3. Calculate Risk:Reward.
    4. Estimate the TIMELINE (duration).
    5. Generate the Signal JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stock: { type: Type.STRING },
            tradeMode: { type: Type.STRING, enum: ["Intraday", "Swing"] },
            signal: { type: Type.STRING, enum: ["BUY", "SELL", "NO TRADE"] },
            entryPrice: { type: Type.STRING },
            stopLoss: { type: Type.STRING },
            target: { type: Type.STRING },
            riskRewardRatio: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            confidenceLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            newsImpact: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] },
            reason: { type: Type.STRING },
            newsContext: { type: Type.STRING },
            timeline: { type: Type.STRING, description: "Expected trade duration e.g. '2 Hours' or '4 Days'" }
          },
          required: ["stock", "tradeMode", "signal", "entryPrice", "stopLoss", "target", "riskRewardRatio", "confidenceScore", "confidenceLevel", "newsImpact", "reason", "newsContext", "timeline"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Strict Filter: Only return signals with confidence >= 65
    if (data.signal === 'NO TRADE' || data.confidenceScore < 65) return null;
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ title: c.web?.title, uri: c.web?.uri })) || [];

    return { 
      ...data, 
      id: Math.random().toString(36).substr(2, 9), 
      timeframe, 
      timestamp: new Date().toISOString(),
      sources
    };
  } catch (e) { 
    console.error("Analysis error", e);
    return null; 
  }
};
