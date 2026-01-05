import React, { useState } from 'react';
import { TradeSignal, SignalType } from '../types';

interface TradeCardProps {
  signal: TradeSignal;
  isDarkMode: boolean;
}

const TradeCard: React.FC<TradeCardProps> = ({ signal, isDarkMode }) => {
  const [expanded, setExpanded] = useState(false);
  const isBuy = signal.signal === SignalType.BUY;

  return (
    <div className={`glass-effect rounded-[2rem] border transition-all duration-300 overflow-hidden mb-4 ${isDarkMode ? 'border-white/5 hover:border-blue-500/30' : 'border-slate-100 hover:shadow-xl'}`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter">{signal.stock}</h2>
            <div className="flex gap-2 mt-1">
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500">{signal.timeframe}</span>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">{signal.confidenceScore}% ACCURACY</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-2xl font-black text-xs tracking-widest ${isBuy ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            {signal.signal}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`p-3 rounded-2xl text-center ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
            <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Entry</p>
            <p className="text-xs font-black">{signal.entry_range}</p>
          </div>
          <div className="p-3 rounded-2xl text-center bg-success/5">
            <p className="text-[8px] font-black uppercase text-success mb-1">Target</p>
            <p className="text-xs font-black text-success">{signal.target}</p>
          </div>
          <div className="p-3 rounded-2xl text-center bg-danger/5">
            <p className="text-[8px] font-black uppercase text-danger mb-1">S.Loss</p>
            <p className="text-xs font-black text-danger">{signal.stop_loss}</p>
          </div>
        </div>

        <button onClick={() => setExpanded(!expanded)} className="w-full flex justify-between items-center px-2">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Neural Logic Scan</span>
          <svg className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-500/20 animate-fade">
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">"{signal.reasoning}"</p>
            <div className="mt-4 p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10">
              <p className="text-[9px] font-black text-blue-500 uppercase mb-2">Quant Insight</p>
              <p className="text-[10px] leading-tight text-slate-500">{signal.predictionSummary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeCard;