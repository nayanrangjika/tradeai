
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
  // Default to true (Dark Mode), but check local storage if you want persistence later
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
        localStorage.removeItem('ao_jwt');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [isDarkMode]);

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
      setScanProgress("Parallel Scanning Nifty 50...");
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
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md px-6 py-4 ${isDarkMode ? 'bg-[#050505]/80 border-white/5' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>FURON<span className="text-blue-500">LABS</span></h1>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Quant Terminal v2.1</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-yellow-400' : 'bg-slate-100 border-slate-300 text-slate-600'}`}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            <button onClick={startFullScan} disabled={isScanning} className={`w-8 h-8 rounded-full border flex items-center justify-center ${isDarkMode ? 'border-white/10' : 'border-slate-300'} ${isScanning ? 'animate-spin text-blue-500' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* VIEW: HOME (SIGNALS) */}
        {activeTab === 'home' && (
          <>
            {/* Market Mood Ticker */}
            {mood && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`mt-1 w-2 h-2 rounded-full ${mood.sentiment === 'Bullish' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${mood.sentiment === 'Bullish' ? 'text-emerald-500' : 'text-rose-500'}`}>{mood.sentiment} MARKET</h3>
                  <p className={`text-[11px] leading-tight font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{mood.summary}</p>
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
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500')
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className={`w-px mx-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
              {['ALL', 'HIGH', 'MEDIUM'].map(conf => (
                <button 
                  key={conf}
                  onClick={() => setFilterConfidence(conf as any)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                    filterConfidence === conf 
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' 
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500')
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
                  <div className={`inline-block p-4 rounded-full mb-3 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
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
            <h2 className={`text-xl font-black px-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Market Intelligence</h2>
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
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm backdrop-blur-xl border rounded-3xl px-6 py-4 flex justify-between items-center z-50 shadow-2xl ${isDarkMode ? 'bg-[#0a0a0a]/90 border-white/10 shadow-black/50' : 'bg-white/90 border-slate-200 shadow-slate-300/50'}`}>
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
