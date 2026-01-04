
import React, { useState, useEffect } from 'react';
import { TradeSignal, SignalType, SignalTimeframe } from '../types';
import StockChartModal from './StockChartModal';
import { fetchLivePrice } from '../services/stockService';

interface TradeCardProps {
  signal: TradeSignal;
  isDarkMode: boolean;
  onTakeSignal: (id: string) => void;
  onFeedback: (id: string, type: 'positive' | 'negative') => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ signal, isDarkMode, onTakeSignal, onFeedback }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  
  const isBuy = signal.signal === SignalType.BUY;
  const isSwing = signal.timeframe === SignalTimeframe.SWING;

  useEffect(() => {
    let interval: number | undefined;
    if (isTracking || signal.isTaken) {
      const updatePrice = async () => {
        try {
          const price = await fetchLivePrice(signal.stock);
          setLivePrice(current => {
            setPrevPrice(current);
            return price;
          });
        } catch (err) { console.error(err); }
      };
      updatePrice();
      interval = window.setInterval(updatePrice, 5000);
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isTracking, signal.isTaken, signal.stock]);

  const getPriceColorClass = () => {
    if (!livePrice || !prevPrice || livePrice === prevPrice) return isDarkMode ? 'text-white' : 'text-slate-900';
    return livePrice > prevPrice ? 'text-emerald-500' : 'text-red-500';
  };

  const getRiskColor = (risk: number) => {
    if (risk < 15) return 'text-emerald-500';
    if (risk < 30) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <>
      <div className={`glass-effect rounded-3xl overflow-hidden mb-6 border transition-all duration-500 relative ${
        signal.isTaken 
          ? 'ring-4 ring-blue-500/20 scale-[1.01] border-blue-500/50 shadow-2xl shadow-blue-500/10' 
          : isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        {signal.isTaken && (
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500 animate-pulse"></div>
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{signal.stock}</h2>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${isSwing ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>
                  {signal.timeframe}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" title={`AI Confidence: ${signal.confidenceScore}%`}>
                  <div className="relative w-7 h-7 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500/10" />
                      <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${(signal.confidenceScore / 100) * 69} 69`} className="text-blue-500" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[7px] font-black text-blue-500">{signal.confidenceScore}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Conf.</span>
                </div>

                <div className="h-4 w-[1px] bg-slate-500/20"></div>

                <div className="flex items-center gap-1.5" title={`AI Risk Factor: ${signal.riskPercentage}%`}>
                  <div className={`flex items-center justify-center font-mono text-xs font-black ${getRiskColor(signal.riskPercentage)}`}>
                    <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z"/>
                    </svg>
                    {signal.riskPercentage}%
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Risk</span>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-[11px] font-black tracking-widest ${
              isBuy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
               <span className={`w-2 h-2 rounded-full ${isBuy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'} animate-pulse`}></span>
               {signal.signal}
            </div>
          </div>

          <div className="flex justify-between items-end mb-5">
             <div className="flex flex-col gap-0.5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Entry Zone</p>
                <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{signal.entry_range}</p>
             </div>

             <button 
                onClick={() => setShowDeepDive(!showDeepDive)}
                className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest">Logic</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showDeepDive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-emerald-500/5 p-3 rounded-2xl text-center border border-emerald-500/10">
              <p className="text-[8px] text-emerald-500 font-black uppercase mb-1">Target 1</p>
              <p className="text-[11px] font-black text-emerald-500 truncate">{signal.target}</p>
            </div>
            <div className="bg-emerald-500/5 p-3 rounded-2xl text-center border border-emerald-500/10">
              <p className="text-[8px] text-emerald-500 font-black uppercase mb-1">{isSwing ? 'Target 2' : 'Final Exit'}</p>
              <p className="text-[11px] font-black text-emerald-500 truncate">{signal.target2 || '-'}</p>
            </div>
            <div className="bg-red-500/5 p-3 rounded-2xl text-center border border-red-500/10">
              <p className="text-[8px] text-red-500 font-black uppercase mb-1">Stop Loss</p>
              <p className="text-[11px] font-black text-red-500 truncate">{signal.stop_loss}</p>
            </div>
          </div>

          {showDeepDive && (
            <div className={`mb-5 p-4 rounded-2xl border font-mono animate-modal ${isDarkMode ? 'bg-slate-950 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                 <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Neural Intelligence Report</h4>
              </div>
              <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {signal.predictionSummary}
              </p>
              <div className={`pt-3 border-t border-dashed ${isDarkMode ? 'border-slate-800' : 'border-blue-200'}`}>
                 <p className={`text-[10px] italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                   "{signal.reasoning}"
                 </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-5">
            <button 
              onClick={() => onTakeSignal(signal.id)} 
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-md ${
                signal.isTaken 
                  ? 'bg-blue-600 text-white shadow-blue-500/20' 
                  : `${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-blue-500/30'}`
              }`}
            >
              {signal.isTaken ? 'Order Executed' : 'Direct Order'}
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => onFeedback(signal.id, 'positive')} 
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all transform active:scale-90 ${
                  signal.feedback === 'positive' 
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' 
                    : 'border-transparent bg-slate-800/50 opacity-40 grayscale'
                }`}
              >
                <span className="text-xl">🚀</span>
              </button>
              <button 
                onClick={() => onFeedback(signal.id, 'negative')} 
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all transform active:scale-90 ${
                  signal.feedback === 'negative' 
                    ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10' 
                    : 'border-transparent bg-slate-800/50 opacity-40 grayscale'
                }`}
              >
                <span className="text-xl">📉</span>
              </button>
            </div>
          </div>

          <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
             <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${livePrice ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span className={`text-[11px] font-black tracking-tighter ${livePrice ? getPriceColorClass() : 'text-slate-500'}`}>
                  {livePrice ? `₹${livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'SYNCING QUOTE...'}
                </span>
             </div>
             <div className="flex gap-4">
               <button onClick={() => setIsModalOpen(true)} className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Charts</button>
               <button onClick={() => setIsTracking(!isTracking)} className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isTracking || signal.isTaken ? 'text-emerald-500' : 'text-slate-400'}`}>
                 {isTracking || signal.isTaken ? 'Streaming' : 'Monitor'}
               </button>
             </div>
          </div>
        </div>
      </div>

      <StockChartModal symbol={signal.stock} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isDarkMode={isDarkMode} />
    </>
  );
};

export default TradeCard;
