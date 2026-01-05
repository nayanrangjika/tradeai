
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
  const [aiStatus, setAiStatus] = useState<'IDLE' | 'TESTING' | 'HEALTHY' | 'EXHAUSTED' | 'ERROR'>('IDLE');
  const [proxyUrl, setProxyUrl] = useState(localStorage.getItem('ao_proxy_url_override') || '');
  const market = getMarketStatus();
  
  const [brokerCreds, setBrokerCreds] = useState<BrokerCredentials>({
    appName: localStorage.getItem('ao_app_name') || 'Tradingfur',
    clientCode: localStorage.getItem('ao_client_code') || 'S433867',
    apiKey: localStorage.getItem('ao_api_key') || API_KEYS.TRADING,
    apiSecret: '',
    totp: localStorage.getItem('ao_password') || '2727', // Use PIN from user default
  });
  
  const isConnected = !!localStorage.getItem('ao_jwt');
  const swiggyStock = WORLD_STOCKS.find(s => s.symbol === 'SWIGGY-EQ');

  useEffect(() => {
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

  const testAiIntegrity = async () => {
    setAiStatus('TESTING');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasCustomAiKey(true);
      setAiStatus('IDLE');
    }
  };

  const savePin = () => {
    localStorage.setItem('ao_password', brokerCreds.totp);
    alert("PIN Updated.");
  };

  const saveProxyUrl = () => {
    if (proxyUrl.trim()) {
      localStorage.setItem('ao_proxy_url_override', proxyUrl.trim());
    } else {
      localStorage.removeItem('ao_proxy_url_override');
    }
    alert("Proxy Settings Updated. System will re-sync.");
    window.location.reload();
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
          {isConnected ? 'Bridge Active' : 'Bridge Offline'}
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
        
        <p className={`text-[10px] leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Configure your personal Gemini API key to bypass default usage limits.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={testAiIntegrity}
              disabled={aiStatus === 'TESTING'}
              className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {aiStatus === 'TESTING' ? 'Testing...' : 'Test Sync'}
            </button>
            <button 
              onClick={handleUpdateAiKey}
              className="py-3.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Update Key
            </button>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-[2.5rem] border overflow-hidden relative ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Bridge Connectivity</p>
        <h3 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Cloud Bridge Settings</h3>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Bridge Service URL</label>
            <input 
              type="text"
              value={proxyUrl}
              onChange={e => setProxyUrl(e.target.value)}
              placeholder="https://furonlabs-automated-stock-trading-advisor-380159937883.us-west1.run.app"
              className={`w-full p-3 rounded-xl text-[10px] border font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'}`}
            />
          </div>
          <button 
            onClick={saveProxyUrl}
            className="w-full py-3.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all border border-slate-700"
          >
            Update Production Sync
          </button>
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
              Chart
            </button>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
            <span className={`text-4xl font-black tracking-tighter ${priceColor} transition-colors duration-300`}>
              ₹{swiggyPrice ? swiggyPrice.current.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---'}
            </span>
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
