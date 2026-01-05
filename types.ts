
export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  NEUTRAL = 'NEUTRAL'
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum SignalTimeframe {
  INTRADAY = 'INTRADAY',
  SWING = 'SWING'
}

export interface GroundingSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  url?: string;
}

export interface TradeSignal {
  id: string;
  stock: string;
  tradeMode: 'Intraday' | 'Swing';
  signal: 'BUY' | 'SELL' | 'NO TRADE';
  entryPrice: string;
  stopLoss: string;
  target: string;
  riskRewardRatio: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  newsImpact: 'Positive' | 'Negative' | 'Neutral';
  reason: string; // Combined technical + news + risk explanation
  timestamp: string;
  timeline?: string; // Expected duration (e.g. "2 Hours", "3-5 Days")
  sources?: GroundingSource[];
  newsContext?: string;
  timeframe?: SignalTimeframe;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  avgPrice: number;
  quantity: number;
  dateAdded: string;
  currentPrice?: number;
}

export interface BrokerCredentials {
  appName: string;
  clientCode: string;
  apiKey: string;
  apiSecret: string;
  totp: string; 
  jwtToken?: string;
  refreshToken?: string;
  feedToken?: string;
  lastLogin?: string;
}

export interface StockData {
  symbol: string;
  token: string;
  price: number;
  rsi: number;
  ema50: number;
  ema200: number;
  vwap: number;
  volumeStatus: 'HIGH' | 'NORMAL' | 'LOW';
  trendStatus: 'Higher Highs' | 'Lower Lows' | 'Consolidating';
  ohlc: {
    o: number;
    h: number;
    l: number;
    c: number;
  };
}

export interface MarketMood {
  summary: string;
  sentiment: 'Bullish' | 'Bearish' | 'Choppy';
  sources?: GroundingSource[];
}
