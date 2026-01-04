
import { TradeSignal, PortfolioItem, MarketMood } from "../types";

const KEYS = {
  SIGNALS: 'furon_signals_db',
  PORTFOLIO: 'furon_portfolio_db',
  MOOD: 'furon_market_mood_db',
  FEEDBACK: 'furon_feedback_db',
  LAST_UPDATE: 'furon_last_update_db'
};

export const db = {
  // Signals
  getSignals: (): TradeSignal[] => {
    const data = localStorage.getItem(KEYS.SIGNALS);
    return data ? JSON.parse(data) : [];
  },
  saveSignals: (signals: TradeSignal[]) => {
    localStorage.setItem(KEYS.SIGNALS, JSON.stringify(signals));
  },

  // Portfolio
  getPortfolio: (): PortfolioItem[] => {
    const data = localStorage.getItem(KEYS.PORTFOLIO);
    return data ? JSON.parse(data) : [];
  },
  savePortfolio: (items: PortfolioItem[]) => {
    localStorage.setItem(KEYS.PORTFOLIO, JSON.stringify(items));
  },

  // Market Mood
  getMarketMood: (): MarketMood | null => {
    const data = localStorage.getItem(KEYS.MOOD);
    return data ? JSON.parse(data) : null;
  },
  saveMarketMood: (mood: MarketMood) => {
    localStorage.setItem(KEYS.MOOD, JSON.stringify(mood));
  },

  // Feedback History
  getFeedback: (): Record<string, string> => {
    const data = localStorage.getItem(KEYS.FEEDBACK);
    return data ? JSON.parse(data) : {};
  },
  saveFeedback: (feedback: Record<string, string>) => {
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(feedback));
  },

  // Utility
  getLastUpdate: (): string | null => localStorage.getItem(KEYS.LAST_UPDATE),
  setLastUpdate: (date: string) => localStorage.setItem(KEYS.LAST_UPDATE, date),
  
  clearAll: () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }
};
