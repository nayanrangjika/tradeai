
import React from 'react';

interface NiftyMeterProps {
  score: number; // 0 to 100
}

const NiftyMeter: React.FC<NiftyMeterProps> = ({ score }) => {
  const getColor = (s: number) => {
    if (s < 30) return 'text-red-500';
    if (s < 45) return 'text-orange-400';
    if (s < 60) return 'text-yellow-400';
    if (s < 80) return 'text-emerald-400';
    return 'text-emerald-500';
  };

  const getLabel = (s: number) => {
    if (s < 20) return 'Extreme Fear';
    if (s < 40) return 'Fear';
    if (s < 60) return 'Neutral';
    if (s < 80) return 'Greed';
    return 'Extreme Greed';
  };

  return (
    <div className="glass-effect rounded-2xl p-6 mb-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-slate-400 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Nifty Sentiment</h3>
          <p className={`text-2xl font-bold ${getColor(score)}`}>{getLabel(score)}</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{score}</span>
        </div>
      </div>
      
      <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${score}%`,
            background: `linear-gradient(to right, #ef4444, #eab308, #10b981)`
          }}
        />
        <div 
          className="absolute top-0 w-1 h-full bg-white shadow-lg"
          style={{ left: `${score}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
        <span>Fear</span>
        <span>Greed</span>
      </div>
    </div>
  );
};

export default NiftyMeter;
