
import React, { useState, useEffect } from 'react';
import { BrokerCredentials } from '../types';
import { angelOne } from '../services/angelOneService';
import { getMarketStatus, WORLD_STOCKS, API_KEYS } from '../constants';
import StockChartModal from './StockChartModal';
import DebugTerminal from './DebugTerminal';

interface SettingsViewProps {
  isDarkMode: boolean;
  onClearData: () => void;
}

const ANGEL_ONE_PRESETS = [
  { name: 'Tradingfur', key: API_KEYS.TRADING, type: 'Trading' },
  { name: 'History', key: API_KEYS.HISTORICAL, type: 'Historical' },
  { name: 'Market', key: API_KEYS.MARKET, type: 'Market' },
];

const SettingsView: React.FC<SettingsViewProps> = ({ isDarkMode, onClearData }) => {
  const [swiggyPrice, setSwiggyPrice] = useState<{current: number, prev: number} | null>(null);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [hasCustomAiKey, setHasCustomAiKey] = useState(false);
  const market = getMarketStatus();
  
  const [brokerCreds, setBrokerCreds] = useState<BrokerCredentials>({
    appName: localStorage.getItem('ao_app_name') || 'Tradingfur',
    clientCode: localStorage.getItem('ao_client_code') || 'S433867',
    apiKey: localStorage.getItem('ao_api_key') || API_KEYS.TRADING,
    apiSecret: '',
    totp: localStorage.getItem('ao_password') || '', 
  });
  
  const isConnected = !!localStorage.getItem('ao_jwt');
  const swiggyStock = WORLD_STOCKS.find(s => s.symbol === 'SWIGGY-EQ');

  useEffect(() => {
    // Check AI Key status
    const checkAiKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasCustomAiKey(hasKey);
      }
    };
    checkAiKey();

    if (!isConnected || !swiggyStock) return;

    const fetchSwiggyPrice = async () => {
      const jwt = localStorage.getItem('ao_jwt');
      if (jwt) {
        try {
          const price = await angelOne.getLTP(swiggyStock.token, swiggyStock.symbol, jwt, API_KEYS.MARKET);
          if (price > 0) {
            setSwiggyPrice(prev => ({
              current: price,
              prev: prev?.current || price
            }));
          }
        } catch (e) {
          console.error("LTP fetch error:", e);
        }
      }
    };

    fetchSwiggyPrice();
    const interval = setInterval(fetchSwiggyPrice, market.isOpen ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [isConnected, swiggyStock, market.isOpen]);

  const handleUpdateAiKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per platform guidelines to avoid race conditions
      setHasCustomAiKey(true);
    }
  };

  const savePin = () => {
    localStorage.setItem('ao_password', brokerCreds.totp);
    alert("PIN Updated.");
  };

  const disconnectBroker = () => {
    localStorage.removeItem('ao_jwt');
    window.location.reload();
  };

  const priceColor = !swiggyPrice ? 'text-slate-500' : 
    swiggyPrice.current > swiggyPrice.prev ? 'text-emerald-500' : 
    swiggyPrice.current < swiggyPrice.prev ? 'text-rose-500' : 
    isDarkMode ? 'text-white' : 'text-slate-900';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>System Settings</h2>
        <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
          {isConnected ? 'Market Feed Live' : 'Feed Offline'}
        </div>
      </div>

      {/* AI Brain Key Configuration Section */}
      <div className={`p-6 rounded-[2.5rem] border overflow-hidden relative ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">AI Intelligence Engine</p>
            <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Gemini Neural Link</h3>
          </div>
          <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${hasCustomAiKey ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {hasCustomAiKey ? 'Custom Billing active' : 'Default Quota active'}
          </div>
        </div>
        
        <p className={`text-[10px] leading-relaxed mb-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          If AI analysis is failing or quota is exhausted, link your own Google Cloud API Key for unlimited production signals.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpdateAiKey}
            className="w-full py-3.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            {hasCustomAiKey ? 'Change API Key' : 'Configure Custom API Key'}
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`text-center py-2 text-[9px] font-bold uppercase tracking-tighter transition-opacity hover:opacity-70 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
          >
            Manage Billing & API Documentation ↗
          </a>
        </div>
      </div>

      {isConnected && (
        <div className={`p-6 rounded-[2.5rem] border overflow-hidden relative ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest mb-1">Production Asset</p>
              <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>SWIGGY-EQ</h3>
            </div>
            <button 
              onClick={() => setIsChartOpen(true)}
              className="px-3 py-1.5 bg-orange-600 text-white text-[9px] font-black uppercase rounded-xl border border-orange-500 shadow-lg shadow-orange-500/20"
            >
              Live Chart
            </button>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
            <span className={`text-4xl font-black tracking-tighter ${priceColor} transition-colors duration-300`}>
              ₹{swiggyPrice ? swiggyPrice.current.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---'}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${market.isOpen ? 'text-emerald-500' : 'text-slate-500'}`}>
              {market.isOpen ? 'LIVE' : 'CLOSED'}
            </span>
          </div>
        </div>
      )}

      {isConnected && <DebugTerminal isDarkMode={isDarkMode} />}

      <div className={`p-6 rounded-[2.5rem] border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Active Production Keys</label>
            <div className="grid grid-cols-1 gap-2">
              {ANGEL_ONE_PRESETS.map(p => (
                <div key={p.name} className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                   <div>
                     <p className="text-[8px] font-black text-slate-500 uppercase">{p.type} KEY</p>
                     <p className={`text-[10px] font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{p.key.substring(0,4)}****</p>
                   </div>
                   <span className="text-[7px] font-black uppercase text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded">Active</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">PIN / Password (Saved Locally)</label>
            <div className="flex gap-2">
              <input 
                type="password"
                value={brokerCreds.totp}
                onChange={e => setBrokerCreds({...brokerCreds, totp: e.target.value})}
                className={`flex-1 p-3 rounded-xl text-xs border font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200'}`}
              />
              <button onClick={savePin} className="px-4 py-3 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl">Save</button>
            </div>
          </div>

          <button 
            onClick={disconnectBroker}
            className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20"
          >
            Terminate Session
          </button>
        </div>
      </div>

      <button onClick={onClearData} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20">
        Purge Signal DB
      </button>

      <StockChartModal 
        symbol="SWIGGY-EQ" 
        isOpen={isChartOpen} 
        onClose={() => setIsChartOpen(false)} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
};

export default SettingsView;
