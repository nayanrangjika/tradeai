
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
  const [stocks, setStocks] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const jwt = localStorage.getItem('ao_jwt');
      const apiKey = localStorage.getItem('ao_api_key');
      if (!jwt || !apiKey) return;

      const results: Performer[] = [];

      // Use Promise.all to fetch in parallel
      await Promise.all(WORLD_STOCKS.map(async (s) => {
        try {
          // Attempt to get Market Data (which uses LTP endpoint, more robust than History)
          let data = await angelOne.getMarketData(s.token, s.symbol, jwt, apiKey);
          
          // If default token failed (price 0), try resolving token dynamically
          if (!data || data.price === 0) {
             const newToken = await angelOne.resolveToken(s.symbol);
             if (newToken && newToken !== s.token) {
                 data = await angelOne.getMarketData(newToken, s.symbol, jwt, apiKey);
             }
          }

          if (data && data.price > 0) {
             results.push({
               symbol: s.symbol,
               token: data.token,
               price: data.price,
               change: data.change // Calculated from LTP response (LTP - Close / Close)
             });
          }
        } catch (e) {
          // Ignore failures for individual stocks
        }
      }));

      if (isMounted) {
        // Sort by performance (highest absolute change %) - show top movers
        const sorted = results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
        setStocks(sorted);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, []);

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 py-4">
       {[1,2,3].map(i => (
         <div key={i} className={`min-w-[140px] h-[80px] rounded-2xl animate-pulse ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
       ))}
    </div>
  );

  if (stocks.length === 0) return (
      <div className="px-4 py-4 opacity-50 text-xs text-center font-mono">
        <p>Market Data Offline</p>
        <p className="text-[8px]">Check Connection / Market Hours</p>
      </div>
  );

  return (
    <div className="space-y-3 mb-6">
      <div className="flex justify-between items-center px-2">
         <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Top Movers</h3>
         <span className="text-[9px] font-mono text-emerald-500 animate-pulse">LIVE FEED</span>
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
               <span className="text-[8px] font-mono text-slate-500">TKN: {s.token}</span>
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
                 style={{ width: `${Math.min(Math.abs(s.change) * 20, 100)}%` }}
               ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;
