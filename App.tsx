
import React, { useState, useEffect } from 'react';
import { TradeSignal, SignalTimeframe, PortfolioItem, MarketMood } from './types';
import { runMarketScanner, fetchMarketMood } from './services/stockService';
import { db } from './services/dbService';
import AuthGate from './components/AuthGate';
import TradeCard from './components/TradeCard';
import PortfolioView from './components/PortfolioView';
import SettingsView from './components/SettingsView';

type AppTab = 'SIGNALS' | 'PORTFOLIO' | 'SETTINGS';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'PRO' | 'STANDARD';

const App: React.FC = () => {
  const [isBrokerConnected, setIsBrokerConnected] = useState(!!localStorage.getItem('ao_jwt'));
  const [allSignals, setAllSignals] = useState<TradeSignal[]>(() => db.getSignals());
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => db.getPortfolio());
  const [marketMood, setMarketMood] = useState<MarketMood | null>(() => db.getMarketMood());
  const [stockFeedback, setStockFeedback] = useState<Record<string, string>>(() => db.getFeedback());

  const [activeTab, setActiveTab] = useState<SignalTimeframe>(SignalTimeframe.INTRADAY);
  const [confFilter, setConfFilter] = useState<ConfidenceFilter>('ALL');
  const [navTab, setNavTab] = useState<AppTab>('SIGNALS');
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => db.saveSignals(allSignals), [allSignals]);
  useEffect(() => db.savePortfolio(portfolio), [portfolio]);
  useEffect(() => db.saveFeedback(stockFeedback), [stockFeedback]);
  useEffect(() => { if (marketMood) db.saveMarketMood(marketMood); }, [marketMood]);

  const startScan = async () => {
    if (!isBrokerConnected) return;
    setIsScanning(true);
    setNavTab('SIGNALS');
    try {
      setLoadingMsg("Gauging Global Sentiment...");
      const mood = await fetchMarketMood();
      setMarketMood(mood);
      
      const newSignals = await runMarketScanner((msg) => setLoadingMsg(msg));
      
      setAllSignals(prev => {
        const prevMap = new Map<string, TradeSignal>(prev.map(s => [`${s.stock}-${s.timeframe}`, s]));
        return newSignals.map(s => {
          const key = `${s.stock}-${s.timeframe}`;
          const existing = prevMap.get(key);
          if (existing) {
            return { ...s, feedback: existing.feedback, isTaken: existing.isTaken };
          }
          return s;
        });
      });
      
      db.setLastUpdate(new Date().toISOString());
    } catch (error: any) {
      console.error("Scanning failed", error);
      alert(error.message?.includes("quota") ? "API Quota Exceeded. Please update your key in Settings." : "Market Scanner encountered an error.");
    } finally {
      setIsScanning(false);
      setLoadingMsg("");
    }
  };

  const handleTakeSignal = (id: string) => {
    setAllSignals(prev => prev.map(s => 
      s.id === id ? { ...s, isTaken: !s.isTaken } : s
    ));
  };

  const handleFeedback = (id: string, type: 'positive' | 'negative') => {
    setAllSignals(prev => {
      return prev.map(s => {
        if (s.id === id) {
          const newFeedbackStr = `User ${type === 'positive' ? 'LIKED' : 'DISLIKED'} your ${s.signal} signal for ${s.stock} on ${s.timestamp}. Setup: ${s.entry_range}. Your AI Reasoning was: "${s.reasoning}". Use this to refine future targets.`;
          setStockFeedback(current => ({ ...current, [s.stock]: newFeedbackStr }));
          return { ...s, feedback: type };
        }
        return s;
      });
    });
  };

  const handleAddPortfolio = async (item: Omit<PortfolioItem, 'id' | 'dateAdded'>) => {
    const newItem: PortfolioItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      dateAdded: new Date().toISOString()
    };
    setPortfolio(prev => [...prev, newItem]);
  };

  const handleRemovePortfolio = (id: string) => {
    setPortfolio(prev => prev.filter(p => p.id !== id));
  };

  const handleClearData = () => {
    if (confirm("Are you sure? This will purge all trade signals and your portfolio.")) {
      db.clearAll();
      window.location.reload();
    }
  };

  useEffect(() => {
    if (isBrokerConnected && allSignals.length === 0) startScan();
  }, [isBrokerConnected]);

  useEffect(() => {
    const themeClass = isDarkMode ? 'dark' : 'light';
    const bgColor = isDarkMode ? '#020617' : '#f8fafc';
    document.body.className = themeClass;
    document.body.style.backgroundColor = bgColor;
  }, [isDarkMode]);

  const filteredSignals = allSignals.filter(s => {
    const matchesTimeframe = s.timeframe === activeTab;
    let matchesConfidence = true;
    if (confFilter === 'HIGH') matchesConfidence = s.confidenceScore >= 80;
    else if (confFilter === 'PRO') matchesConfidence = s.confidenceScore >= 70;
    else if (confFilter === 'STANDARD') matchesConfidence = s.confidenceScore >= 60;
    return matchesTimeframe && matchesConfidence;
  });

  if (!isBrokerConnected) {
    return <AuthGate isDarkMode={isDarkMode} onAuthenticated={() => setIsBrokerConnected(true)} />;
  }

  return (
    <div className={`min-h-screen pb-28 max-w-md mx-auto relative shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 shadow-blue-500/5 border-x border-white/5' : 'bg-slate-50 border-x border-slate-200'}`}>
      <header className={`sticky top-0 z-50 glass-effect border-b px-6 py-5 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Furon<span className="text-blue-500">Labs</span>
            </h1>
            <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">A1 Session Active</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                {isDarkMode ? '🌞' : '🌙'}
             </button>
          </div>
        </div>
      </header>

      <main className="p-6 animate-modal">
        {navTab === 'SIGNALS' && (
          <>
            {marketMood && (
              <div className={`mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex justify-between items-center mb-2">
                   <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${marketMood.sentiment === 'Bullish' ? 'bg-emerald-500/20 text-emerald-500' : marketMood.sentiment === 'Bearish' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                      {marketMood.sentiment} Bias
                   </span>
                </div>
                <p className={`text-xs font-semibold leading-relaxed mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {marketMood.summary}
                </p>
                {marketMood.sources && marketMood.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-blue-500/10 space-y-2">
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {marketMood.sources.map((src, i) => (
                        <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors ${isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'} truncate max-w-[140px]`}>
                          {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={`flex p-1 rounded-xl mb-6 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200/50'}`}>
              <button onClick={() => setActiveTab(SignalTimeframe.INTRADAY)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === SignalTimeframe.INTRADAY ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                Intraday
              </button>
              <button onClick={() => setActiveTab(SignalTimeframe.SWING)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === SignalTimeframe.SWING ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                Swing
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">AI Confidence Filtering</p>
              <div className="grid grid-cols-4 gap-2">
                {(['ALL', 'HIGH', 'PRO', 'STANDARD'] as ConfidenceFilter[]).map((f) => (
                  <button key={f} onClick={() => setConfFilter(f)} className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${confFilter === f ? 'bg-blue-500 text-white border-blue-400 shadow-lg' : `${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}`}>
                    {f === 'ALL' ? 'Show All' : f === 'HIGH' ? '90% Risk' : f === 'PRO' ? '80% Opt' : '70% Med'}
                  </button>
                ))}
              </div>
            </div>

            {isScanning ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse text-blue-500">{loadingMsg}</p>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-tighter">Connecting Angel One History Data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSignals.map(sig => (
                  <TradeCard key={sig.id} signal={sig} isDarkMode={isDarkMode} onTakeSignal={handleTakeSignal} onFeedback={handleFeedback} />
                ))}
                {filteredSignals.length === 0 && (
                  <div className="text-center py-20 bg-slate-500/5 rounded-3xl border border-dashed border-slate-500/10">
                     <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest">No Signals Match Criteria</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {navTab === 'PORTFOLIO' && (
          <PortfolioView items={portfolio} isDarkMode={isDarkMode} onAddItem={handleAddPortfolio} onRemoveItem={handleRemovePortfolio} />
        )}

        {navTab === 'SETTINGS' && (
          <SettingsView isDarkMode={isDarkMode} onClearData={handleClearData} />
        )}
      </main>

      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-effect border-t px-6 py-4 flex justify-between items-center z-50 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <button onClick={() => setNavTab('SIGNALS')} className={`flex flex-col items-center gap-1 flex-1 ${navTab === 'SIGNALS' ? 'text-blue-500' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Signals</span>
        </button>

        <button onClick={() => setNavTab('PORTFOLIO')} className={`flex flex-col items-center gap-1 flex-1 ${navTab === 'PORTFOLIO' ? 'text-blue-500' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Portfolio</span>
        </button>

        <div className="flex-1 flex justify-center">
          <button onClick={startScan} disabled={isScanning} className="p-4 bg-blue-600 rounded-full -mt-12 border-4 border-slate-950 shadow-xl shadow-blue-500/40 transform active:scale-95 transition-all z-10">
             <svg className={`w-6 h-6 text-white ${isScanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </button>
        </div>

        <button onClick={() => setNavTab('SETTINGS')} className={`flex flex-col items-center gap-1 flex-1 ${navTab === 'SETTINGS' ? 'text-blue-500' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
