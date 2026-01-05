
import React, { useState, useEffect } from 'react';
import { SignalTimeframe, TradeSignal, MarketMood, PortfolioItem } from './types';
import { getMarketMood, analyzeStock } from './services/geminiService';
import { db } from './services/dbService';
import AuthGate from './components/AuthGate';
import TradeCard from './components/TradeCard';
import PortfolioView from './components/PortfolioView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('ao_jwt'));
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'portfolio' | 'settings'>('home');
  
  // Data State
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [mood, setMood] = useState<MarketMood | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setPortfolio(db.getPortfolio());
      performScan();
    }
  }, [isConnected]);

  const performScan = async () => {
    setIsScanning(true);
    try {
      const moodRes = await getMarketMood();
      setMood(moodRes);
      
      const res = await analyzeStock({ symbol: 'RELIANCE', price: 2980, rsi: 55 }, SignalTimeframe.INTRADAY);
      if (res) setSignals([res]);
    } finally { setIsScanning(false); }
  };

  const handleAddToPortfolio = (item: Omit<PortfolioItem, 'id' | 'dateAdded'>) => {
    const newItem: PortfolioItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      dateAdded: new Date().toISOString()
    };
    const updated = [...portfolio, newItem];
    setPortfolio(updated);
    db.savePortfolio(updated);
  };

  const handleRemoveFromPortfolio = (id: string) => {
    const updated = portfolio.filter(i => i.id !== id);
    setPortfolio(updated);
    db.savePortfolio(updated);
  };

  const handleClearData = () => {
    if(window.confirm("Are you sure? This will verify your connection settings but clear local cache.")) {
      db.clearAll();
      setPortfolio([]);
      setSignals([]);
      alert("Local data purged.");
    }
  };

  if (!isConnected) return <AuthGate isDarkMode={isDarkMode} onAuthenticated={() => setIsConnected(true)} />;

  return (
    <div className={`min-h-screen pb-28 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="sticky top-0 z-50 glass-effect border-b px-6 py-6 border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter">Furon<span className="text-blue-500">Labs</span></h1>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* VIEW: SIGNALS (HOME) */}
        {activeTab === 'home' && (
          <>
            {mood && (
              <div className="p-5 rounded-[2rem] bg-blue-600/5 border border-blue-600/10 animate-fade">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${mood.sentiment === 'Bullish' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>{mood.sentiment} Outlook</span>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Neural Insight</span>
                </div>
                <p className="text-xs font-semibold leading-relaxed text-slate-400">{mood.summary}</p>
              </div>
            )}

            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Alpha Signals</h3>
              <span className="text-[10px] font-black text-blue-500 uppercase">{signals.length} ACTIVE</span>
            </div>

            {isScanning ? (
              <div className="py-20 text-center animate-pulse">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Gauging Liquidity...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {signals.map(s => <TradeCard key={s.id} signal={s} isDarkMode={isDarkMode} />)}
              </div>
            )}
          </>
        )}

        {/* VIEW: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <PortfolioView 
            items={portfolio} 
            isDarkMode={isDarkMode} 
            onAddItem={handleAddToPortfolio} 
            onRemoveItem={handleRemoveFromPortfolio} 
          />
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView 
            isDarkMode={isDarkMode} 
            onClearData={handleClearData} 
          />
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-effect rounded-[2.5rem] border px-6 py-4 flex justify-between items-center z-50 shadow-2xl backdrop-blur-xl bg-black/40">
        <button 
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'portfolio' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          <span className="text-[8px] font-black uppercase tracking-wider">Holdings</span>
        </button>

        <button 
          onClick={() => setActiveTab('home')}
          className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center -mt-10 border-4 border-slate-950 glow-blue text-white shadow-2xl relative"
        >
          {isScanning && <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></span>}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-wider">System</span>
        </button>
      </nav>
    </div>
  );
}
