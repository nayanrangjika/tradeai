
import React, { useState, useEffect } from 'react';
import { BrokerCredentials } from '../types';
import { angelOne } from '../services/angelOneService';
import { getMarketStatus, WORLD_STOCKS, API_KEYS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import StockChartModal from './StockChartModal';
import DebugTerminal from './DebugTerminal';

interface SettingsViewProps {
  isDarkMode: boolean;
  onClearData: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ isDarkMode, onClearData }) => {
  const [swiggyPrice, setSwiggyPrice] = useState<{current: number, prev: number} | null>(null);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [hasCustomAiKey, setHasCustomAiKey] = useState(false);
  const [manualAiKey, setManualAiKey] = useState('');
  const [aiStatus, setAiStatus] = useState<'IDLE' | 'TESTING' | 'HEALTHY' | 'EXHAUSTED' | 'ERROR'>('IDLE');
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const market = getMarketStatus();
  
  const [brokerCreds, setBrokerCreds] = useState<BrokerCredentials>({
    appName: localStorage.getItem('ao_app_name') || 'Tradingfur',
    clientCode: localStorage.getItem('ao_client_code') || 'S433867',
    apiKey: localStorage.getItem('ao_api_key') || API_KEYS.TRADING,
    apiSecret: '',
    totp: localStorage.getItem('ao_password') || '2727', 
  });
  
  const isConnected = !!localStorage.getItem('ao_jwt');
  const swiggyStock = WORLD_STOCKS.find(s => s.symbol === 'SWIGGY-EQ');

  useEffect(() => {
    // Check if key exists in storage
    const storedKey = localStorage.getItem('custom_gemini_key');
    if (storedKey) {
      setHasCustomAiKey(true);
      setManualAiKey(storedKey);
    }

    // Also check the dynamic selection method
    const checkAiKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if(hasKey) setHasCustomAiKey(true);
      }
    };
    checkAiKey();

    // Resolve token once on mount if connected
    const resolveSwiggyToken = async () => {
      if (!isConnected || !swiggyStock) return;
      
      const token = await angelOne.resolveToken(swiggyStock.symbol);
      if (token) {
        setResolvedToken(token);
      } else {
        setResolvedToken(swiggyStock.token);
      }
    };
    resolveSwiggyToken();
  }, [isConnected, swiggyStock]);

  useEffect(() => {
    if (!isConnected || !swiggyStock || !resolvedToken) return;

    const fetchSwiggyPrice = async () => {
      const jwt = localStorage.getItem('ao_jwt');
      const apiKey = localStorage.getItem('ao_api_key') || API_KEYS.MARKET;
      
      if (jwt) {
        try {
          const price = await angelOne.getLTP(resolvedToken, swiggyStock.symbol, jwt, apiKey);
          if (price > 0) {
            setSwiggyPrice(prev => ({
              current: price,
              prev: prev?.current || price
            }));
          } else if (!swiggyPrice) {
            // Fallback for market close
             const candles = await angelOne.getHistoricalData(resolvedToken, "ONE_DAY", apiKey, jwt);
             if (candles && candles.length > 0) {
                const close = candles[candles.length - 1].close;
                setSwiggyPrice({ current: close, prev: close });
             }
          }
        } catch (e) {
          console.error("LTP fetch error:", e);
        }
      }
    };

    fetchSwiggyPrice();
    const interval = setInterval(fetchSwiggyPrice, market.isOpen ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [isConnected, swiggyStock, market.isOpen, resolvedToken]);

  const testAiIntegrity = async () => {
    setAiStatus('TESTING');
    try {
      const aiKey = localStorage.getItem('custom_gemini_key') || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey: aiKey });
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 2, thinkingConfig: { thinkingBudget: 0 } }
      });
      setAiStatus('HEALTHY');
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.toLowerCase().includes('quota')) {
        setAiStatus('EXHAUSTED');
      } else {
        setAiStatus('ERROR');
      }
    }
  };

  const handleUpdateAiKey = async () => {
    // Support Google AI Studio automated selection
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasCustomAiKey(true);
      setAiStatus('IDLE');
    }
  };

  const saveManualKey = () => {
    if (manualAiKey.trim().length > 10) {
      localStorage.setItem('custom_gemini_key', manualAiKey.trim());
      setHasCustomAiKey(true);
      setAiStatus('IDLE');
      alert("Custom Gemini Key Saved.");
    } else {
      alert("Invalid API Key");
    }
  };

  const clearManualKey = () => {
    localStorage.removeItem('custom_gemini_key');
    setManualAiKey('');
    setHasCustomAiKey(false);
    setAiStatus('IDLE');
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
          {isConnected ? 'Proxy Active' : 'Proxy Offline'}
        </div>
      </div>

      <div className={`p-6 rounded-[2.5rem] border overflow-hidden relative ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-blue-500/5' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Neural Core Management</p>
            <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>AI Intelligence Key</h3>
          </div>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
            aiStatus === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-500' : 
            aiStatus === 'EXHAUSTED' ? 'bg-rose-500/10 text-rose-500' : 
            'bg-blue-500/10 text-blue-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              aiStatus === 'HEALTHY' ? 'bg-emerald-500' : 
              aiStatus === 'EXHAUSTED' ? 'bg-rose-500 animate-pulse' : 
              'bg-blue-500'
            }`}></span>
            {aiStatus === 'IDLE' ? (hasCustomAiKey ? 'Custom Key' : 'Default Quota') : aiStatus}
          </div>
        </div>
        
        <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Enter your Gemini API key to remove rate limits. Keys are stored locally on your device.
        </p>

        <div className="space-y-3">
          <div className="relative">
             <input 
               type="password"
               value={manualAiKey}
               onChange={(e) => setManualAiKey(e.target.value)}
               placeholder="Paste Gemini API Key here..."
               className={`w-full p-3 rounded-xl text-xs font-mono border outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
             />
             {hasCustomAiKey && (
               <button onClick={clearManualKey} className="absolute right-3 top-3 text-[9px] font-bold text-rose-500 uppercase hover:underline">Clear</button>
             )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={saveManualKey}
              className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}
            >
              Save Manual Key
            </button>
            <button 
              onClick={testAiIntegrity}
              disabled={aiStatus === 'TESTING'}
              className="py-3.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {aiStatus === 'TESTING' ? 'Testing...' : 'Verify Key'}
            </button>
          </div>
          
          <div className="text-center pt-2">
             <button onClick={handleUpdateAiKey} className="text-[9px] font-bold text-slate-500 uppercase underline">
               Or Select via Google Auth
             </button>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className={`p-6 rounded-[2.5rem] border overflow-hidden relative ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest mb-1">Production Asset</p>
              <h3 className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>SWIGGY-EQ</h3>
              <p className="text-[9px] text-slate-500 font-mono mt-1">Token: {resolvedToken || '---'}</p>
            </div>
            <button 
              onClick={() => setIsChartOpen(true)}
              className="px-3 py-1.5 bg-orange-600 text-white text-[9px] font-black uppercase rounded-xl border border-orange-500 shadow-lg shadow-orange-500/20"
            >
              Chart
            </button>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
            <span className={`text-4xl font-black tracking-tighter ${priceColor} transition-colors duration-300`}>
              {swiggyPrice ? `₹${swiggyPrice.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '---'}
            </span>
            {swiggyPrice && (
              <span className={`text-xs font-bold ${
                 swiggyPrice.current > swiggyPrice.prev ? 'text-emerald-500' : 
                 swiggyPrice.current < swiggyPrice.prev ? 'text-rose-500' : 'text-slate-500'
              }`}>
                {swiggyPrice.current > swiggyPrice.prev ? '▲' : swiggyPrice.current < swiggyPrice.prev ? '▼' : '•'}
              </span>
            )}
          </div>
        </div>
      )}

      {isConnected && <DebugTerminal isDarkMode={isDarkMode} />}

      <div className={`p-6 rounded-[2.5rem] border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">PIN / Password</label>
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
            Disconnect Session
          </button>
        </div>
      </div>

      <button onClick={onClearData} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20">
        Purge Local Data
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
