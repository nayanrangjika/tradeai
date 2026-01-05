
import React, { useState } from 'react';
import { TradeSignal } from '../types';

interface TradeCardProps {
  signal: TradeSignal;
  isDarkMode: boolean;
  onShowChart: (symbol: string) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ signal, isDarkMode, onShowChart }) => {
  const [expanded, setExpanded] = useState(false);
  const isBuy = signal.signal === 'BUY';
  const isSell = signal.signal === 'SELL';

  // Aesthetic colors
  let accentColor = 'slate';
  if (isBuy) accentColor = 'emerald';
  if (isSell) accentColor = 'rose';

  const getAccentClass = (type: 'text' | 'bg' | 'border') => {
    if (type === 'text') return isBuy ? 'text-emerald-500' : 'text-rose-500';
    if (type === 'bg') return isBuy ? 'bg-emerald-500' : 'bg-rose-500';
    if (type === 'border') return isBuy ? 'border-emerald-500' : 'border-rose-500';
    return '';
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
      
      {/* Header Strip */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${getAccentClass('bg')} opacity-80`}></div>
      
      <div className="p-5 pl-7">
        
        {/* Top Row: Symbol & Action */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{signal.stock}</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{signal.tradeMode}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onShowChart(signal.stock); }}
              className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-black'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            </button>
            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border flex flex-col items-center justify-center min-w-[60px] ${isBuy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              <span>{signal.signal}</span>
            </div>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`p-2 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Entry</p>
            <p className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{signal.entryPrice}</p>
          </div>
          <div className={`p-2 rounded-xl border text-center relative overflow-hidden ${isBuy ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
            <p className={`text-[8px] font-bold uppercase mb-0.5 ${getAccentClass('text')}`}>Target</p>
            <p className={`text-xs font-black ${getAccentClass('text')}`}>{signal.target}</p>
          </div>
          <div className={`p-2 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
             <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Stop Loss</p>
             <p className="text-xs font-black text-slate-400">{signal.stopLoss}</p>
          </div>
        </div>

        {/* Quant Stats Bar */}
        <div className="flex items-center justify-between gap-2 mb-4 bg-slate-500/5 p-2 rounded-lg border border-slate-500/10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500">R:R</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>{signal.riskRewardRatio}</span>
          </div>
          
          <div className="h-3 w-px bg-slate-500/20"></div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500">SCORE</span>
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-bold ${signal.confidenceLevel === 'High' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {signal.confidenceScore}
              </span>
              <span className="text-[8px] font-medium text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="h-3 w-px bg-slate-500/20"></div>

          <div className="flex items-center gap-2">
             <span className="text-[9px] font-black text-slate-500">NEWS</span>
             <span className={`text-[9px] font-bold ${
               signal.newsImpact === 'Positive' ? 'text-emerald-500' : 
               signal.newsImpact === 'Negative' ? 'text-rose-500' : 
               'text-slate-400'
             }`}>
               {signal.newsImpact}
             </span>
          </div>
        </div>

        {/* Expandable Analysis */}
        <button onClick={() => setExpanded(!expanded)} className="w-full py-2 flex items-center justify-center gap-1 group">
          <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-500 transition-colors tracking-widest">
            {expanded ? 'Hide Analysis' : 'View Quant Logic'}
          </span>
          <svg className={`w-3 h-3 text-slate-500 group-hover:text-blue-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </button>

        {expanded && (
          <div className="mt-2 pt-4 border-t border-dashed border-slate-500/20 animate-fade">
             
             {/* Reasoning */}
             <div className="mb-4">
               <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                 {signal.reason}
               </p>
             </div>

             {/* News Context */}
             {signal.newsContext && (
               <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mb-3">
                 <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    <p className="text-[9px] font-black text-indigo-500 uppercase">Market Driver</p>
                 </div>
                 <p className={`text-[10px] leading-tight ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>{signal.newsContext}</p>
               </div>
             )}

             {/* Sources */}
             {signal.sources && signal.sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                 {signal.sources.slice(0, 3).map((src, idx) => (
                    <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 truncate max-w-[120px] border border-slate-700 hover:border-slate-500 transition-colors">
                      {src.title}
                    </a>
                 ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TradeCard;
