
export const API_KEYS = {
  TRADING: 'ry43LM9q',
  TRADING_SECRET: '2f2b4de6-f55c-4a91-9144-5ef1e5201c9e',
  HISTORICAL: 'lRKVS3cF',
  HISTORICAL_SECRET: '86d42837-c2dd-4bb0-86f6-e7d07b003ccc',
  MARKET: 'kFQBWzUb',
  MARKET_SECRET: 'c1c3127a-86ea-42a1-aa9c-cbb4db177ffa'
};

// Default high-cap list for "Top Performers" UI. 
export const WORLD_STOCKS = [
  { symbol: 'RELIANCE-EQ', token: '2885', base: 2350.00, region: 'IN' },
  { symbol: 'TCS-EQ', token: '11536', base: 3400.00, region: 'IN' },
  { symbol: 'HDFCBANK-EQ', token: '1333', base: 1600.00, region: 'IN' },
  { symbol: 'INFY-EQ', token: '1594', base: 1400.00, region: 'IN' },
  { symbol: 'ITC-EQ', token: '1660', base: 400.00, region: 'IN' },
  { symbol: 'SBIN-EQ', token: '3045', base: 570.00, region: 'IN' },
  { symbol: 'BHARTIARTL-EQ', token: '10604', base: 850.00, region: 'IN' },
  { symbol: 'TATAMOTORS-EQ', token: '3456', base: 600.00, region: 'IN' },
  { symbol: 'SWIGGY-EQ', token: '13781', base: 450.00, region: 'IN' },
  { symbol: 'ZOMATO-EQ', token: '5097', base: 150.00, region: 'IN' }
];

export const NIFTY_50_STOCKS = WORLD_STOCKS;

// The Specific "Target List" provided by User (Blue Chips & Sector Leaders)
export const TARGET_SYMBOLS = [
    // --- NIFTY 50 (CORE) ---
    "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "TCS", "LT", "AXISBANK",
    "SBIN", "BHARTIARTL", "KOTAKBANK", "BAJFINANCE", "HINDUNILVR", "M&M", "MARUTI",
    "TITAN", "SUNPHARMA", "ASIANPAINT", "HCLTECH", "TATASTEEL", "NTPC", "POWERGRID",
    "ULTRACEMCO", "TATAMOTORS", "INDUSINDBK", "BAJAJFINSV", "NESTLEIND", "ONGC",
    "ADANIENT", "JSWSTEEL", "GRASIM", "TECHM", "HINDALCO", "ADANIPORTS", "WIPRO",
    "CIPLA", "TATACONSUM", "COALINDIA", "SBILIFE", "BRITANNIA", "DRREDDY",
    "EICHERMOT", "DIVISLAB", "APOLLOHOSP", "BAJAJ-AUTO", "HEROMOTOCO", "UPL", "LTIM",
    
    // --- BANKING & FINANCE ---
    "AUBANK", "BANDHANBNK", "BANKBARODA", "BANKINDIA", "CANBK", "CUB", "FEDERALBNK",
    "IDFCFIRSTB", "PNB", "RBLBANK", "IDBI", "INDIANB", "MAHABANK", "UNIONBANK", "YESBANK",
    "ABCAPITAL", "ANGELONE", "BAJAJHLDNG", "CANFINHOME", "CHOLAFIN", "CREDITACC",
    "HDFCAMC", "HDFCLIFE", "ICICIGI", "ICICIPRULI", "L&TFH", "LICHSGFIN", "LICI",
    "M&MFIN", "MANAPPURAM", "MFSL", "MUTHOOTFIN", "NAM-INDIA", "PAYTM", "PFC",
    "PIIND", "POONAWALLA", "RECLTD", "SBICARD", "SHRIRAMFIN", "SUNDARMFIN",
    
    // --- AUTO & ANCILLARIES ---
    "AMARAJABAT", "APOLLOTYRE", "ASHOKLEY", "BALKRISIND", "BHARATFORG", "BOSCHLTD",
    "EXIDEIND", "MRF", "MOTHERSON", "SONACOMS", "TVSMOTOR", "TIINDIA", "UNO_MINDA",
    "ESCORTS", "CUMMINSIND", "ENDURANCE", "SCHAEFFLER", "SONABLW",
    
    // --- IT & TECHNOLOGY ---
    "COFORGE", "CYIENT", "DIXON", "HAPPSTMNDS", "INTELLECT", "KPITTECH", "L&T_TECH",
    "MASTEK", "MPHASIS", "NAUKRI", "OFSS", "PERSISTENT", "POLICYBZR", "ROUTE",
    "SONATSOFTW", "SYNGENE", "TATAELXSI", "TEJASNET", "ZENSARTECH", "ZOMATO",
    
    // --- PHARMA & HEALTHCARE ---
    "ABBOTINDIA", "ALKEM", "AUROPHARMA", "BIOCON", "GLENMARK", "GRANULES", "GSK",
    "IPCALAB", "JBCHEPHARM", "LALPATHLAB", "LAURUSLAB", "LUPIN", "MANKIND", "MAXHEALTH",
    "METROPOLIS", "NATCOPHARM", "PFIZER", "SYNGENE", "TORNTPHARM", "ZYDUSLIFE",
    "FORTIS", "ASTERDM", "NH",
    
    // --- ENERGY, OIL & GAS ---
    "ADANIGREEN", "ADANIPOWER", "ATGL", "BPCL", "CASTROLIND", "GAIL", "GUJGASLTD",
    "HINDPETRO", "IGL", "IOC", "MGL", "MRPL", "OIL", "PETRONET", "RELIANCE",
    "SJVN", "TATAPOWER", "TORNTPOWER", "NHPC", "IEX",
    
    // --- CONSUMER GOODS (FMCG) ---
    "BALRAMCHIN", "BATAINDIA", "BERGERPAINT", "COLPAL", "DABUR", "EMAMILTD",
    "GODREJCP", "HATSUN", "HINDUNILVR", "ITC", "JYOTHYLAB", "KRBL", "MARICO",
    "NESTLEIND", "PAGEIND", "PATANJALI", "PGHH", "RADICO", "RELAXO", "TATA_CONSUM",
    "TTKPRESTIGE", "UBL", "UNITEDSPR", "VBL", "VARROC", "WHIRLPOOL",
    
    // --- METALS & MINING ---
    "APLAPOLLO", "HINDCOPPER", "HINDZINC", "JINDALSTEL", "JSL", "NATIONALUM",
    "NMDC", "RATNAMANI", "SAIL", "TATASTEEL", "VEDL", "WELCORP",
    
    // --- CEMENT & CONSTRUCTION ---
    "ACC", "AMBUJACEM", "BIRLACORPN", "DALBHARAT", "GRASIM", "JKCEMENT",
    "RAMCOCEM", "SHREECEM", "STARCEMENT", "ULTRACEMCO",
    "DLF", "GODREJPROP", "LODHA", "OBEROIRLTY", "PHOENIXLTD", "PRESTIGE",
    "BRIGADE", "NBCC", "NCC", "SOBHA",
    
    // --- CHEMICALS & FERTILIZERS ---
    "AARTIIND", "ATUL", "CHAMBLFERT", "COROMANDEL", "DEEPAKNTR", "FLUOROCHEM",
    "GNFC", "LINDEINDIA", "NAVINFLUOR", "PIDILITIND", "SRF", "SUMICHEM",
    "TATACHEM", "UPL",
    
    // --- CAPITAL GOODS & INFRA ---
    "ABB", "AIAENG", "ASTRAL", "BEL", "BHEL", "CGPOWER", "CONCOR", "ELGIEQUIP",
    "GMRINFRA", "HAL", "HAVELLS", "HONAUT", "IRCTC", "KEI", "KEC", "L&T",
    "POLYCAB", "RAILTEL", "RITES", "RVNL", "SIEMENS", "SUZLON", "THERMAX",
    "TIMKEN", "VOLTAS", "KAJARIACER", "ASTRAL",
    
    // --- MEDIA & ENTERTAINMENT ---
    "PVRINOX", "SUNTV", "ZEEL", "TV18BRDCST", "NETWORK18",
    
    // --- MISC / OTHERS ---
    "ADANITRANS", "AEGISCHEM", "AFFLE", "BLUEDART", "BSOFT",
    "CENTURYTEX", "CROMPTON", "DELTACORP", "EIDPARRY", "FACT", "FSL",
    "GODREJIND", "GRAPHITE", "HEG", "HFCL", "INDHOTEL", "INDIGOPNTS",
    "INDIGO", "IRFC", "J&KBANK", "JAMNAAUTO", "JUBLFOOD", "KPRMILL",
    "MAZDOCK", "MCX", "RENUKA", "TRIDENT", "VGUARD", "VIPIND"
].map(s => s.endsWith('-EQ') ? s : `${s}-EQ`);

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
