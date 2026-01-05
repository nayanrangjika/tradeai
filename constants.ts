
export const API_KEYS = {
  TRADING: 'ry43LM9q',
  TRADING_SECRET: '2f2b4de6-f55c-4a91-9144-5ef1e5201c9e',
  HISTORICAL: 'lRKVS3cF',
  HISTORICAL_SECRET: '86d42837-c2dd-4bb0-86f6-e7d07b003ccc',
  MARKET: 'kFQBWzUb',
  MARKET_SECRET: 'c1c3127a-86ea-42a1-aa9c-cbb4db177ffa'
};

export const WORLD_STOCKS = [
  // Indian Giants (NSE) - Top Liquid Stocks
  { symbol: 'RELIANCE-EQ', token: '2885', base: 2980, region: 'IN' },
  { symbol: 'TCS-EQ', token: '11536', base: 4120, region: 'IN' },
  { symbol: 'HDFCBANK-EQ', token: '1333', base: 1740, region: 'IN' },
  { symbol: 'SBIN-EQ', token: '3045', base: 780, region: 'IN' },
  { symbol: 'INFY-EQ', token: '1594', base: 1850, region: 'IN' },
  { symbol: 'ICICIBANK-EQ', token: '4963', base: 1250, region: 'IN' },
  { symbol: 'TATAMOTORS-EQ', token: '3456', base: 980, region: 'IN' },
  { symbol: 'ITC-EQ', token: '1660', base: 430, region: 'IN' },
  { symbol: 'SWIGGY-EQ', token: '13781', base: 508.45, region: 'IN' }, 
  { symbol: 'BHARTIARTL-EQ', token: '10604', base: 1400, region: 'IN' }
];

export const NIFTY_50_STOCKS = WORLD_STOCKS;

export const APP_THEME = {
  primary: '#3b82f6', 
  buy: '#10b981',    
  sell: '#ef4444',   
  dark: '#020617'    
};

/**
 * Checks if the Indian Market (NSE) is currently open based on IST.
 */
export const getMarketStatus = () => {
  const now = new Date();
  // IST is UTC + 5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));
  
  const day = istTime.getDay(); // 0 is Sunday, 6 is Saturday
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekend = day === 0 || day === 6;
  // NSE Market: 9:15 AM (555 mins) to 3:30 PM (930 mins)
  const isMarketHours = timeInMinutes >= 555 && timeInMinutes <= 930;

  if (isWeekend) return { isOpen: false, reason: "WEEKEND" };
  if (!isMarketHours) return { isOpen: false, reason: "OFF-HOURS" };
  
  return { isOpen: true, reason: "LIVE" };
};
