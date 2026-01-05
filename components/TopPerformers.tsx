
import React, { useEffect, useState } from 'react';
import { WORLD_STOCKS } from '../constants';
import { angelOne } from '../services/angelOneService';

interface Performer {
  symbol: string;
  token: string;
  price: number;
  change: number;
}

const TopPerformers: React.FC<{ isDarkMode: boolean; onChartClick: (s: string) => void }> = ({ isDarkMode, onChartClick }) => {
  // Initialize with static data for instant rendering
  const [stocks, setStocks] = useState<Performer[]>(
    WORLD_STOCKS.map(s => ({
      symbol: s.symbol,
      token: s.token,
      price: s.base,
      change: 0
    }))
  );
  const [hasLoadedLive, setHasLoadedLive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const jwt = localStorage.getItem('ao_jwt');
      const apiKey = localStorage.getItem('ao_api_key');
      
      // If not connected, we just keep the static list
      if (!jwt || !apiKey) return;

      const results: Performer[] = [];

      // Use Promise.all to fetch in parallel
      await Promise.all(WORLD_STOCKS.map(async (s) => {
        try {
          // 1. Try fetching with Default Token
          let data = await angelOne.getMarketData(s.token, s.symbol, jwt, apiKey);
          
          // 2. If data is dead (price 0) or unchanged from base (suspicious), try resolving
          if (!data || data.price === 0 || (data.price === s.base && data.change === 0)) {
             console.log(`Resolving live token for ${s.symbol}...`);
             const newToken = await angelOne.resolveToken(s.symbol);
             
             if (newToken) {
                 // Retry with new token
                 data = await angelOne.getMarketData(newToken, s.symbol, jwt, apiKey);
             }
          }

          if (data && data.price > 0) {
             results.push({
               symbol: s.symbol,
               token: data.token, // Use the working token
               price: data.price,
               change: data.change 
             });
          } else {
             // Fallback to static if live fails completely
             results.push({
               symbol: s.symbol,
               token: s.token,
               price: s.base,
               change: 0
             });
          }
        } catch (e) {
             results.push({
               symbol: s.symbol,
               token: s.token,
               price: s.base,
               change: 0
             });
        }
      }));

      if (isMounted) {
        // Sort by magnitude of move (Gainers or Losers)
        const sorted = results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
        setStocks(sorted);
        setHasLoadedLive(true);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s Poll for Top Movers
    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-3 mb-6">
      <div className="flex justify-between items-center px-2">
         <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Top Movers</h3>
         <div className="flex items-center gap-2">
            {!hasLoadedLive && <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></div>}
            <span className={`text-[9px] font-mono ${hasLoadedLive ? 'text-emerald-500' : 'text-orange-500'} animate-pulse`}>
                {hasLoadedLive ? 'LIVE FEED' : 'CONNECTING...'}
            </span>
         </div>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-2">
        {stocks.map((s, idx) => (
          <div 
            key={s.symbol}
            onClick={() => onChartClick(s.symbol)}
            className={`min-w-[140px] p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all active:scale-95 ${
              isDarkMode ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start">
               <span className="text-[8px] font-bold text-slate-500">#{idx + 1}</span>
               <span className="text-[8px] font-mono text-slate-500 hidden sm:inline">TKN: {s.token}</span>
            </div>
            
            <div className="mt-1">
               <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.symbol.split('-')[0]}</h4>
               <div className="flex items-center gap-1.5 mt-0.5">
                 <span className={`text-[11px] font-bold ${s.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {s.price.toFixed(2)}
                 </span>
                 <span className={`text-[8px] font-bold ${s.change >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                   {s.change > 0 ? '+' : ''}{s.change.toFixed(2)}%
                 </span>
               </div>
            </div>

            {/* Micro Chart / Sparkline Visual */}
            <div className="w-full h-1 mt-2 rounded-full bg-slate-500/10 overflow-hidden">
               <div 
                 className={`h-full ${s.change >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                 style={{ width: `${Math.max(10, Math.min(Math.abs(s.change) * 20, 100))}%` }}
               ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;
