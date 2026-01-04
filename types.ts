
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

export interface TradeSignal {
  id: string;
  stock: string;
  signal: SignalType;
  timeframe: SignalTimeframe;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  riskPercentage: number;
  entry_range: string;
  target: string;
  target2?: string;
  stop_loss: string;
  reasoning: string;
  predictionSummary: string;
  timestamp: string;
  isTaken?: boolean;
  feedback?: 'positive' | 'negative';
  sources?: GroundingSource[];
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
  totp: string; // 6-digit code or Secret Seed
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
