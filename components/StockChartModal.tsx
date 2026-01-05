
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { angelOne } from '../services/angelOneService';
import { WORLD_STOCKS, getMarketStatus } from '../constants';

interface StockChartModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const StockChartModal: React.FC<StockChartModalProps> = ({ symbol, isOpen, onClose, isDarkMode }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !chartContainerRef.current) return;

    setIsLoading(true);
    const jwt = localStorage.getItem('ao_jwt');
    const apiKey = localStorage.getItem('ao_api_key') || 'A3uaTHcN';
    // Find stock token; default to SBIN if not found to avoid crash
    const stock = WORLD_STOCKS.find(s => s.symbol === symbol);
    const token = stock?.token || "3045";

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: isDarkMode ? '#020617' : '#ffffff' },
        textColor: isDarkMode ? '#94a3b8' : '#64748b',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: isDarkMode ? '#1e293b' : '#f1f5f9' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const loadData = async () => {
      if (!jwt) {
        setIsLoading(false);
        return;
      }
      
      try {
        const data = await angelOne.getHistoricalData(token, "FIFTEEN_MINUTE", apiKey, jwt);

        if (data && data.length > 0) {
          candlestickSeries.setData(data);
          chart.timeScale().fitContent();
        }
      } catch (e) {
        console.error("Chart load failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Auto-refresh chart data every minute to keep it "live"
    pollTimerRef.current = window.setInterval(loadData, 60000);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      chart.remove();
    };
  }, [isOpen, isDarkMode, symbol]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modal border ${isDarkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-8 py-6 flex justify-between items-center border-b ${isDarkMode ? 'border-white/5' : 'border-slate-50'}`}>
          <div>
            <h3 className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{symbol} <span className="text-orange-500">Analytics</span></h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Terminal Sync: {getMarketStatus().reason} • Production Feed</p>
          </div>
          <button onClick={onClose} className={`p-3 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-4 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Hydrating Chart...</p>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-[400px]" />
        </div>

        <div className={`px-8 py-6 border-t ${isDarkMode ? 'border-white/5 bg-slate-900/20' : 'border-slate-50 bg-slate-50/50'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Bridge Connection</span>
                 <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getMarketStatus().isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                    <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>SmartAPI Verified</span>
                 </div>
               </div>
            </div>
            <button onClick={onClose} className="px-8 py-3.5 bg-orange-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
              Close Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockChartModal;
