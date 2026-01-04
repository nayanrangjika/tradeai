
import React, { useState, useEffect, useRef } from 'react';
import { PortfolioItem } from '../types';
import { fetchLivePrice } from '../services/stockService';

interface PortfolioViewProps {
  items: PortfolioItem[];
  isDarkMode: boolean;
  onAddItem: (item: Omit<PortfolioItem, 'id' | 'dateAdded'>) => void;
  onRemoveItem: (id: string) => void;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ items, isDarkMode, onAddItem, onRemoveItem }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  
  const [livePrices, setLivePrices] = useState<Record<string, { current: number; prev: number }>>({});
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    const updatePrices = async () => {
      if (items.length === 0) return;
      
      const priceUpdates: Record<string, { current: number; prev: number }> = { ...livePrices };
      
      await Promise.all(items.map(async (item) => {
        try {
          const newPrice = await fetchLivePrice(item.symbol);
          const prevPrice = priceUpdates[item.symbol]?.current || item.avgPrice;
          priceUpdates[item.symbol] = {
            current: newPrice,
            prev: prevPrice
          };
        } catch (err) {
          console.error(`Failed to fetch price for ${item.symbol}`, err);
        }
      }));
      
      setLivePrices(priceUpdates);
    };

    updatePrices();
    pollingRef.current = window.setInterval(updatePrices, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [items.length]);

  // Fix: Defined the missing handleAdd function to process new portfolio entries.
  const handleAdd = () => {
    if (!symbol || !price || !qty) return;
    onAddItem({
      symbol: symbol.toUpperCase(),
      avgPrice: parseFloat(price),
      quantity: parseInt(qty, 10),
    });
    setSymbol('');
    setPrice('');
    setQty('');
    setShowAdd(false);
  };

  const calculatePL = (item: PortfolioItem) => {
    const currentPrice = livePrices[item.symbol]?.current || item.avgPrice;
    const diff = currentPrice - item.avgPrice;
    const pcent = (diff / item.avgPrice) * 100;
    const totalDiff = diff * item.quantity;
    return {
      diff: totalDiff.toFixed(2),
      percent: pcent.toFixed(2),
      isProfit: diff >= 0,
      currentPrice
    };
  };

  const totalValue = items.reduce((acc, item) => {
    const current = livePrices[item.symbol]?.current || item.avgPrice;
    return acc + current * item.quantity;
  }, 0);

  const totalCost = items.reduce((acc, item) => acc + item.avgPrice * item.quantity, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-3xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Assets Value</p>
            <h3 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Returns</p>
             <div className="flex flex-col items-end">
               <p className={`text-lg font-black ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalPL >= 0 ? '+' : ''}₹{Math.abs(totalPL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
               </p>
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalPL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {totalPL >= 0 ? '▲' : '▼'} {Math.abs(totalPLPercent).toFixed(2)}%
               </span>
             </div>
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-4 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
           <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Invested</p>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>₹{totalCost.toLocaleString('en-IN')}</p>
           </div>
           <div className="text-right">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Status</p>
              <p className="text-xs font-black text-blue-500 uppercase tracking-tighter">Live API Sync Active</p>
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Live Holdings <span className="text-xs text-slate-500 ml-1 font-medium">({items.length})</span>
        </h2>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          {showAdd ? 'Close' : '+ Add Asset'}
        </button>
      </div>

      {showAdd && (
        <div className={`p-5 rounded-2xl border animate-modal ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Stock Symbol</label>
              <input 
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder="RELIANCE, HDFCBANK, etc."
                className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Avg. Price</label>
              <input 
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Quantity</label>
              <input 
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="1"
                className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>
          <button 
            onClick={handleAdd}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
          >
            Confirm Portfolio Entry
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className={`p-12 rounded-3xl border-2 border-dashed flex flex-col items-center text-center ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'}`}>
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
             <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          </div>
          <p className="text-sm font-bold text-slate-500 mb-2">Portfolio is Empty</p>
          <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed uppercase font-medium">Add your current holdings to track performance with live bridge data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const pl = calculatePL(item);
            const priceData = livePrices[item.symbol];
            const isPriceUp = priceData ? priceData.current > priceData.prev : false;
            const isPriceDown = priceData ? priceData.current < priceData.prev : false;

            return (
              <div key={item.id} className={`group p-4 rounded-2xl border flex justify-between items-center transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.symbol}</h4>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-black uppercase">QTY {item.quantity}</span>
                    <div className="flex items-center gap-1">
                       <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">API Live</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                       <span className="text-[8px] text-slate-500 uppercase font-black">Buy Avg</span>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>₹{item.avgPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[8px] text-slate-500 uppercase font-black">LTP</span>
                       <span className={`text-[10px] font-black transition-colors duration-300 ${isPriceUp ? 'text-emerald-500' : isPriceDown ? 'text-rose-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                         ₹{pl.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-xs font-black ${pl.isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {pl.isProfit ? '▲' : '▼'} {Math.abs(parseFloat(pl.percent))}%
                    </p>
                    <p className={`text-[9px] font-bold ${pl.isProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                      {pl.isProfit ? '+' : ''}₹{parseFloat(pl.diff).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors opacity-40 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <p className="text-[8px] text-center text-slate-500 font-bold uppercase tracking-widest opacity-50">Synchronized with Angel One Production Gateway</p>
    </div>
  );
};

export default PortfolioView;
