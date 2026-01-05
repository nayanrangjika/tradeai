
import React from 'react';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
  isDarkMode: boolean;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, isDarkMode }) => {
  return (
    <div className="space-y-4 animate-fade px-2">
      {news.length === 0 ? (
        <div className="py-12 text-center opacity-50">
          <p className="text-[10px] font-mono text-blue-500 animate-pulse">Scanning Global Wires...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {news.map(item => (
            <div key={item.id} className="relative pl-4 group">
              {/* Timeline Line */}
              <div className="absolute left-0 top-2 bottom-0 w-px bg-slate-800 group-last:bottom-auto group-last:h-full"></div>
              <div className={`absolute left-[-2px] top-2.5 w-1.5 h-1.5 rounded-full ${
                item.sentiment === 'Positive' ? 'bg-emerald-500' : 
                item.sentiment === 'Negative' ? 'bg-rose-500' : 
                'bg-blue-500'
              }`}></div>

              <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{item.source} • {item.time}</span>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                    item.sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-500' : 
                    item.sentiment === 'Negative' ? 'bg-rose-500/10 text-rose-500' : 
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {item.sentiment}
                  </span>
                </div>
                <h4 className={`text-sm font-bold leading-snug mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {item.title}
                </h4>
                <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
