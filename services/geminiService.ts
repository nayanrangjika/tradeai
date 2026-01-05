import { GoogleGenAI, Type } from "@google/genai";
import { TradeSignal, SignalTimeframe, MarketMood } from "../types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    return { sentiment: 'Choppy', summary: 'Connectivity check in progress.' };
  }
};

export const analyzeStock = async (stockData: any, timeframe: SignalTimeframe): Promise<TradeSignal | null> => {
  const ai = getAiClient();
  const prompt = `Stock: ${stockData.symbol}, Price: ${stockData.price}, RSI: ${stockData.rsi}, Timeframe: ${timeframe}. Strategy: Quant Pro. Search for news. JSON output trade card.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stock: { type: Type.STRING },
            signal: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            entry_range: { type: Type.STRING },
            target: { type: Type.STRING },
            stop_loss: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            predictionSummary: { type: Type.STRING }
          },
          required: ["stock", "signal", "confidenceScore", "entry_range", "target", "stop_loss", "reasoning"]
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    if (data.confidenceScore < 65) return null;
    return { ...data, id: Math.random().toString(36).substr(2, 9), timeframe, timestamp: new Date().toISOString() };
  } catch { return null; }
};