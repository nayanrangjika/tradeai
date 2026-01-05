
import React, { useState, useEffect } from 'react';
import { SignalTimeframe, TradeSignal, MarketMood, PortfolioItem, NewsItem, ConfidenceLevel } from './types';
import { getMarketMood, analyzeStock, fetchMarketNews } from './services/geminiService';
import { runMarketScanner } from './services/stockService';
import { db } from './services/dbService';
import AuthGate from './components/AuthGate';
import TradeCard from './components/TradeCard';
import PortfolioView from './components/PortfolioView';
import SettingsView from './components/SettingsView';
import StockChartModal from './components/StockChartModal';
import NewsFeed from './components/NewsFeed';
import TopPerformers from './components/TopPerformers';

export default function App() {
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('ao_jwt'));
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'news' | 'portfolio' | 'settings'>('home');
  
  // Data State
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [mood, setMood] = useState<MarketMood | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("Ready");
  const [activeChartSymbol, setActiveChartSymbol] = useState<string | null>(null);

  // Filters
  const [filterTimeframe, setFilterTimeframe] = useState<'ALL' | 'INTRADAY' | 'SWING'>('ALL');
  const [filterConfidence, setFilterConfidence] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');

  // Hard Refresh Session Clearing Logic
  useEffect(() => {
    const handleBeforeUnload = () => {
        // Clear the JWT session token when the window is about to unload (Refresh/Close)
        // This forces a login on next load, fulfilling the "Clear session after every hard refresh" requirement.
        localStorage.removeItem('ao_jwt');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (isConnected) {
      setPortfolio(db.getPortfolio());
      startFullScan();
    }
  }, [isConnected]);

  const startFullScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress("Analyzing Market Mood...");
    
    try {
      // 1. Fetch Context
      const [moodRes, newsRes] = await Promise.all([
        getMarketMood(),
        fetchMarketNews()
      ]);
      setMood(moodRes);
      setNews(newsRes);

      // 2. Run Technical + AI Scanner
      setScanProgress("Scanning Nifty 50...");
      const newSignals = await runMarketScanner((msg) => setScanProgress(msg));
      setSignals(prev => [...newSignals, ...prev].slice(0, 10)); // Keep latest 10
      
    } catch (e) {
      console.error("Scan error", e);
    } finally { 
      setIsScanning(false); 
      setScanProgress("Idle");
    }
  };

  const filteredSignals = signals.filter(s => {
    if (filterTimeframe !== 'ALL' && s.timeframe !== filterTimeframe) return false;
    if (filterConfidence !== 'ALL' && s.confidenceLevel.toUpperCase() !== filterConfidence) return false;
    return true;
  });

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
    if(window.confirm("Purge local data cache?")) {
      db.clearAll();
      setPortfolio([]);
      setSignals([]);
      alert("System purged.");
    }
  };

  if (!isConnected) return <AuthGate isDarkMode={isDarkMode} onAuthenticated={() => setIsConnected(true)} />;

  return (
    <div className={`min-h-screen pb-28 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 border-b border-white/5 backdrop-blur-md px-6 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tighter">FURON<span className="text-blue-500">LABS</span></h1>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Quant Terminal v2.1</p>
          </div>
          <button onClick={startFullScan} disabled={isScanning} className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center ${isScanning ? 'animate-spin text-blue-500' : 'text-slate-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* VIEW: HOME (SIGNALS) */}
        {activeTab === 'home' && (
          <>
            {/* Market Mood Ticker */}
            {mood && (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${mood.sentiment === 'Bullish' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${mood.sentiment === 'Bullish' ? 'text-emerald-500' : 'text-rose-500'}`}>{mood.sentiment} MARKET</h3>
                  <p className="text-[11px] leading-tight text-slate-400 font-medium mt-1">{mood.summary}</p>
                </div>
              </div>
            )}
            
            {/* Top Performers Reel */}
            <TopPerformers isDarkMode={isDarkMode} onChartClick={setActiveChartSymbol} />

            {/* Filter Bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['ALL', 'INTRADAY', 'SWING'].map(tf => (
                <button 
                  key={tf}
                  onClick={() => setFilterTimeframe(tf as any)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                    filterTimeframe === tf 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className="w-px bg-slate-800 mx-1"></div>
              {['ALL', 'HIGH', 'MEDIUM'].map(conf => (
                <button 
                  key={conf}
                  onClick={() => setFilterConfidence(conf as any)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                    filterConfidence === conf 
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {conf}
                </button>
              ))}
            </div>

            {/* Status Bar */}
            {isScanning && (
              <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center animate-pulse">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{scanProgress}</p>
              </div>
            )}

            {/* Signals Feed */}
            <div className="space-y-4">
              {filteredSignals.length === 0 && !isScanning ? (
                <div className="py-20 text-center opacity-40">
                  <div className="inline-block p-4 rounded-full bg-slate-900 mb-3">
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase">No Signals Match Filter</p>
                </div>
              ) : (
                filteredSignals.map(s => (
                  <TradeCard 
                    key={s.id} 
                    signal={s} 
                    isDarkMode={isDarkMode} 
                    onShowChart={(sym) => setActiveChartSymbol(sym)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* VIEW: NEWS */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white px-2">Market Intelligence</h2>
            <NewsFeed news={news} isDarkMode={isDarkMode} />
          </div>
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

      {/* DOCK */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex justify-between items-center z-50 shadow-2xl shadow-black/50">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <span className="text-[8px] font-black uppercase">Signals</span>
        </button>

        <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center gap-1 ${activeTab === 'news' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <span className="text-[8px] font-black uppercase">News</span>
        </button>

        <button onClick={() => setActiveTab('portfolio')} className={`flex flex-col items-center gap-1 ${activeTab === 'portfolio' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <span className="text-[8px] font-black uppercase">Holdings</span>
        </button>

        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-[8px] font-black uppercase">System</span>
        </button>
      </nav>

      <StockChartModal 
        symbol={activeChartSymbol || ''} 
        isOpen={!!activeChartSymbol} 
        onClose={() => setActiveChartSymbol(null)} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
}
