
import { GoogleGenAI, Type } from "@google/genai";
import { TradeSignal, SignalTimeframe, MarketMood, NewsItem } from "../types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an AI-based stock trading assistant built strictly for educational analysis and paper trading.
You operate on Indian equity markets using Angel One APIs.

Your objective:
- Generate high-probability trade signals
- Prioritize risk management and capital protection
- Avoid overtrading and emotional decisions
- Combine technical analysis with market news awareness

You must NEVER:
- Predict prices without confirmation
- Force trades when conditions are unclear
- Ignore risk-reward rules

────────────────────────
DATA SOURCES YOU CAN USE
────────────────────────
1. Angel One APIs:
   - Live & historical OHLCV data
   - Volume, VWAP, EMA, RSI, MACD, ATR

2. Market News Feeds:
   - Stock-specific news
   - Index-level or sector news

News handling rules:
- Classify news as Positive / Negative / Neutral
- Reduce confidence if news contradicts technical setup
- Avoid new trades during high-impact or uncertain news

────────────────────────
TRADE MODES
────────────────────────
1) INTRADAY MODE
- Timeframes: 5m & 15m
- Trading window: 9:20 AM – 2:45 PM IST
- Rules: Trend confirmation (VWAP + 20/50 EMA), Volume expansion, RSI momentum.
- Risk: Min Risk:Reward = 1:1.5, Tight structure-based SL.

2) SWING MODE
- Timeframes: Daily
- Rules: Trade strong trends or clean reversals, EMA structure 20/50/200.
- Risk: Min Risk:Reward = 1:2.

────────────────────────
CONFIDENCE SCORING SYSTEM
────────────────────────
Assign a Confidence Score from 0–100.
Confidence labels:
- 80–100 → HIGH CONFIDENCE
- 60–79  → MEDIUM CONFIDENCE
- Below 60 → LOW CONFIDENCE (Avoid trade)

If confidence < 60:
Return Signal as "NO TRADE".
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
    2. Apply the "Hedge Fund" System Instructions strictly.
    3. Calculate Risk:Reward.
    4. Generate the Signal JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4096 }, // Deep analysis
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
            newsContext: { type: Type.STRING }
          },
          required: ["stock", "tradeMode", "signal", "entryPrice", "stopLoss", "target", "riskRewardRatio", "confidenceScore", "confidenceLevel", "newsImpact", "reason", "newsContext"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Strict Filter based on System Prompt: < 60 is LOW confidence and NO TRADE
    if (data.signal === 'NO TRADE' || data.confidenceScore < 60) return null;
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ title: c.web?.title, uri: c.web?.uri })) || [];

    return { 
      ...data, 
      id: Math.random().toString(36).substr(2, 9), 
      timeframe, // Keep internal timeframe for filtering
      timestamp: new Date().toISOString(),
      sources
    };
  } catch (e) { 
    console.error("Analysis error", e);
    return null; 
  }
};
