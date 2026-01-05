
import React, { useState } from 'react';
import { TradeSignal } from '../types';

interface TradeCardProps {
  signal: TradeSignal;
  isDarkMode: boolean;
  onShowChart: (symbol: string) => void;
}

const ConfidenceGauge: React.FC<{ score: number; isDarkMode: boolean }> = ({ score, isDarkMode }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  // Color logic for 65-100 range
  let colorClass = 'text-yellow-500'; // 65-74
  if (score >= 75) colorClass = 'text-lime-500'; // 75-84
  if (score >= 85) colorClass = 'text-emerald-500'; // 85-100

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="transform -rotate-90 w-12 h-12">
        {/* Background Circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="transparent"
          className={`${isDarkMode ? 'text-slate-800' : 'text-slate-200'}`}
        />
        {/* Progress Circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{score}</span>
        <span className="text-[6px] font-bold text-slate-500 uppercase">%</span>
      </div>
    </div>
  );
};

const TradeCard: React.FC<TradeCardProps> = ({ signal, isDarkMode, onShowChart }) => {
  const [expanded, setExpanded] = useState(false);
  const isBuy = signal.signal === 'BUY';
  const isSell = signal.signal === 'SELL';

  const accentColor = isBuy ? 'emerald' : 'rose';
  
  const getAccentClass = (type: 'text' | 'bg' | 'border') => {
    const color = isBuy ? 'emerald' : 'rose';
    if (type === 'text') return `text-${color}-500`;
    if (type === 'bg') return `bg-${color}-500`;
    if (type === 'border') return `border-${color}-500`;
    return '';
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border transition-all duration-300 ${isDarkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
      
      {/* Side Color Strip */}
      <div className={`absolute top-0 left-0 w-1 h-full ${getAccentClass('bg')}`}></div>
      
      <div className="p-5 pl-6">
        
        {/* TOP ROW: Symbol, Signal Badge, Confidence */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{signal.stock.charAt(0)}</span>
             </div>
             <div>
                <h2 className={`text-lg font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{signal.stock}</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{signal.tradeMode}</span>
                   {signal.timeline && (
                     <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                       {signal.timeline}
                     </span>
                   )}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end mr-1">
                <span className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI Confidence</span>
                <ConfidenceGauge score={signal.confidenceScore} isDarkMode={isDarkMode} />
             </div>
             
             <div className={`px-4 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center min-w-[70px] ${
               isBuy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
             }`}>
                <span className="text-[11px] font-black uppercase tracking-wider">{signal.signal}</span>
             </div>
          </div>
        </div>

        {/* MIDDLE ROW: Price Grid */}
        <div className={`grid grid-cols-3 gap-px bg-slate-200/50 dark:bg-slate-800/50 rounded-xl overflow-hidden border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} mb-4`}>
           <div className={`p-3 text-center ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
              <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Entry Zone</p>
              <p className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{signal.entryPrice}</p>
           </div>
           
           <div className={`p-3 text-center relative ${isBuy ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
              <p className={`text-[8px] font-bold uppercase mb-1 ${getAccentClass('text')}`}>Target</p>
              <p className={`text-xs font-black ${getAccentClass('text')}`}>{signal.target}</p>
           </div>
           
           <div className={`p-3 text-center ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
              <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Stop Loss</p>
              <p className="text-xs font-black text-slate-400">{signal.stopLoss}</p>
           </div>
        </div>

        {/* BOTTOM ROW: Actions & Metrics */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded text-[9px] font-bold border ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                 R:R {signal.riskRewardRatio}
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border ${
                signal.newsImpact === 'Positive' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' :
                signal.newsImpact === 'Negative' ? 'border-rose-500/30 text-rose-500 bg-rose-500/5' :
                'border-slate-700 text-slate-500'
              }`}>
                 <span>NEWS: {signal.newsImpact}</span>
              </div>
           </div>

           <div className="flex gap-2">
              <button 
                 onClick={(e) => { e.stopPropagation(); onShowChart(signal.stock); }}
                 className={`p-2 rounded-lg transition-colors border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-black'}`}
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </button>
              <button 
                 onClick={() => setExpanded(!expanded)}
                 className={`p-2 rounded-lg transition-colors border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'}`}
              >
                 <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
           </div>
        </div>

        {/* EXPANDED CONTENT */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-500/20 animate-fade">
             <div className="mb-4">
               <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">AI Reasoning Engine</h4>
               <p className={`text-[11px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                 {signal.reason}
               </p>
             </div>

             {signal.newsContext && (
               <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mb-3">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase">Fundamental Driver</span>
                 </div>
                 <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>{signal.newsContext}</p>
               </div>
             )}
             
             {signal.sources && signal.sources.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-3">
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
