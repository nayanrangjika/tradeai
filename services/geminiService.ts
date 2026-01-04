
import { GoogleGenAI, Type } from "@google/genai";
import { StockData, TradeSignal, SignalType, SignalTimeframe, MarketMood } from "../types";

/**
 * Creates a fresh AI instance to ensure we use the most up-to-date API key 
 * provided via the platform's key selection dialog.
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getMarketMood = async (niftyData: any): Promise<MarketMood> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Analyze the pre-open data for Nifty 50 and Bank Nifty.
    News Scan: Search for 'Global Market Cues today', 'FII DII Data yesterday', and 'Gift Nifty Status'.
    Data: Advancing: ${niftyData.advancing}, Declining: ${niftyData.declining}, Gift Nifty Change: ${niftyData.change}.
    Output: Return a JSON object in this strict format:
    {
      "sentiment": "Bullish/Bearish/Choppy",
      "summary": "A single sentence summary with a reference to the key news driver."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["sentiment", "summary"]
        },
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Market Source',
      uri: chunk.web?.uri,
      snippet: chunk.web?.snippet || "Found in recent market news."
    })).filter((c: any) => c.uri) || [];

    return { ...result, sources } as MarketMood;
  } catch (error) {
    console.error("Market Mood AI failed:", error);
    return { sentiment: 'Choppy', summary: 'Technical sync in progress.' };
  }
};

export const analyzeStock = async (
  stockData: StockData, 
  timeframe: SignalTimeframe,
  feedbackHistory?: string
): Promise<TradeSignal | null> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";
  const vwapPos = stockData.price > stockData.vwap ? "above" : "below";
  
  const feedbackBlock = feedbackHistory 
    ? `\nUSER FEEDBACK HISTORY FOR ${stockData.symbol}:\n${feedbackHistory}\nIMPORTANT: Learn from this feedback.`
    : "";

  let strategyPrompt = "";

  if (timeframe === SignalTimeframe.INTRADAY) {
    strategyPrompt = `
      Strategy: "Intraday Momentum Pro"
      Analyze 15-minute OHLC for ${stockData.symbol}.
      Technical Context: RSI: ${stockData.rsi}, VWAP: ${vwapPos}, Volume: ${stockData.volumeStatus}.
      
      Step 1: Google Search 'Breaking news ${stockData.symbol} India last 2 hours'.
      Step 2: Check trend status: ${stockData.trendStatus}.
      
      Rules: Signal 'BUY' or 'SELL' only if confidence > 80%.
      ${feedbackBlock}
    `;
  } else {
    strategyPrompt = `
      Strategy: "Swing Master Pro"
      Analyze ${stockData.symbol} for 3-7 day swing.
      Technicals: Near ${stockData.price > stockData.ema200 ? '200 EMA support' : '200 EMA resistance'}.
      
      Step 1: Search '${stockData.symbol} block deals / quarterly results'.
      
      Output: JSON Trade Card with detailed risk assessment.
      ${feedbackBlock}
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: strategyPrompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 8000 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stock: { type: Type.STRING },
            signal: { type: Type.STRING },
            confidence: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            riskPercentage: { type: Type.INTEGER, description: "Calculated AI risk based on volatility and data gaps." },
            entry_range: { type: Type.STRING },
            target: { type: Type.STRING },
            target2: { type: Type.STRING },
            stop_loss: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            predictionSummary: { type: Type.STRING, description: "Extended prediction logic for deep dive view." }
          },
          required: ["stock", "signal", "confidence", "confidenceScore", "riskPercentage", "entry_range", "target", "stop_loss", "reasoning", "predictionSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Market Source',
      uri: chunk.web?.uri,
      snippet: chunk.web?.snippet || "Found in recent market news."
    })).filter((c: any) => c.uri) || [];

    if (result.signal === 'NEUTRAL' || result.confidenceScore < 60) return null;

    return {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      timeframe,
      timestamp: new Date().toISOString(),
      sources
    } as TradeSignal;
  } catch (error) {
    console.error(`Gemini Pro analysis failed:`, error);
    throw error;
  }
};
