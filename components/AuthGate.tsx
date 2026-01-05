
import React, { useState, useEffect } from 'react';
import { angelOne } from '../services/angelOneService';
import { API_KEYS } from '../constants';
import { generateTotp } from '../utils/totpGenerator';

export default function AuthGate({ isDarkMode, onAuthenticated }: { isDarkMode: boolean, onAuthenticated: () => void }) {
  const [creds, setCreds] = useState({ 
    client: localStorage.getItem('ao_client_code') || 'S433867', 
    pin: localStorage.getItem('ao_password') || '2727', 
    totpInput: '', // Can be code (6 digits) or secret (>10 chars)
    apiKey: localStorage.getItem('ao_api_key') || API_KEYS.TRADING 
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState(['TERMINAL READY.']);
  const [storedSecret, setStoredSecret] = useState(localStorage.getItem('ao_totp_secret') || '');
  const [liveCode, setLiveCode] = useState('');
  const [errorField, setErrorField] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');

  const addLog = (m: string) => setLogs(p => [...p.slice(-4), `> ${m}`]);

  // Check backend health
  useEffect(() => {
    const check = async () => {
      const isUp = await angelOne.checkHealth();
      setBridgeStatus(isUp ? 'ONLINE' : 'OFFLINE');
      if (isUp) {
          // Only log connection once to avoid spam
          setLogs(prev => prev.includes("> BRIDGE CONNECTED.") ? prev : [...prev.slice(-4), "> BRIDGE CONNECTED."]);
      }
    };
    check();
    const interval = setInterval(check, 3000); // Faster polling for better UX
    return () => clearInterval(interval);
  }, []);

  // Live TOTP Preview
  useEffect(() => {
    if (!storedSecret) return;
    const updateCode = () => {
      try {
        const code = generateTotp(storedSecret);
        setLiveCode(code);
      } catch (e) {
        setLiveCode('ERROR');
      }
    };
    updateCode();
    const timer = setInterval(updateCode, 1000);
    return () => clearInterval(timer);
  }, [storedSecret]);

  const validate = () => {
    if (!creds.client) return 'client';
    if (!creds.pin) return 'pin';
    if (!creds.apiKey) return 'apiKey';
    return null;
  };

  const handleSync = async () => {
    if (bridgeStatus === 'OFFLINE') {
      const isUp = await angelOne.checkHealth();
      if (!isUp) {
          alert("Cannot Sync: Bridge Server is Offline.\n\nPlease run 'npm run server' in a separate terminal to fix CORS issues.");
          return;
      }
      setBridgeStatus('ONLINE');
    }

    const error = validate();
    if (error) {
      setErrorField(error);
      addLog(`ERR: MISSING ${error.toUpperCase()}`);
      if (error === 'apiKey') setShowSettings(true);
      return;
    }
    setErrorField(null);

    let finalTotp = creds.totpInput;
    let secretToSave = '';

    setIsSyncing(true);

    try {
      // 1. Determine TOTP Source
      if (creds.totpInput.length > 10) {
        // User pasted a secret
        addLog("DETECTED SECRET KEY.");
        secretToSave = creds.totpInput;
        finalTotp = generateTotp(secretToSave);
      } else if (creds.totpInput.length === 6) {
        // User entered a manual code
        finalTotp = creds.totpInput;
      } else if (storedSecret) {
        // Use stored secret
        addLog("USING SAVED SECRET...");
        finalTotp = generateTotp(storedSecret);
      } else {
        setErrorField('totp');
        throw new Error("TOTP MISSING");
      }

      addLog(`HANDSHAKE: ${creds.client}`);
      
      const session = await angelOne.login({ 
        apiKey: creds.apiKey, 
        clientCode: creds.client, 
        password: creds.pin, 
        totp: finalTotp 
      });

      if (session.jwtToken) {
        if (secretToSave) {
          localStorage.setItem('ao_totp_secret', secretToSave);
          setStoredSecret(secretToSave);
        }
        
        localStorage.setItem('ao_jwt', session.jwtToken);
        localStorage.setItem('ao_client_code', creds.client);
        localStorage.setItem('ao_api_key', creds.apiKey);
        localStorage.setItem('ao_password', creds.pin); // Save successful PIN
        
        addLog("ACCESS GRANTED.");
        addLog("SYNCING DATA FEED...");
        setTimeout(onAuthenticated, 500);
      }
    } catch (e: any) {
      const msg = e.message || "CONNECTION REFUSED";
      addLog(`ERR: ${msg.toUpperCase().substring(0, 35)}`);
      console.error(e);
      
      // Auto-open settings if key seems invalid
      if (msg.toLowerCase().includes('key') || msg.toLowerCase().includes('client')) {
        setShowSettings(true);
        setErrorField('apiKey');
      } else if (msg.toLowerCase().includes('totp') || msg.toLowerCase().includes('pin')) {
         setErrorField('pin');
      }

      // Check for timeout / offline specifically
      if (msg.includes('server') || msg.includes('Offline') || msg.includes('Timeout') || msg.includes('Failed to fetch')) {
         alert(`Connection Failed: ${msg}\n\nMake sure you are running 'npm run server' in a separate terminal!`);
      } else {
         alert(`Login Failed: ${msg}\n\nPlease check your Client ID, Password, and API Key.`);
      }
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleDemoLogin = () => {
    if (window.confirm("Enter Demo Mode? This will use mock data and bypass real trading APIs.")) {
      localStorage.setItem('ao_jwt', 'demo_token_123');
      localStorage.setItem('ao_client_code', 'DEMO_USER');
      onAuthenticated();
    }
  };

  const clearSecret = () => {
    localStorage.removeItem('ao_totp_secret');
    setStoredSecret('');
    setLiveCode('');
    setCreds({ ...creds, totpInput: '' });
    addLog("SECRET CLEARED.");
  };

  const manualHealthCheck = async () => {
      setBridgeStatus('CHECKING');
      const isUp = await angelOne.checkHealth();
      setBridgeStatus(isUp ? 'ONLINE' : 'OFFLINE');
      if(isUp) addLog("BRIDGE CONNECTED.");
      else addLog("ERR: BRIDGE UNREACHABLE.");
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="w-full max-w-sm space-y-6 animate-fade">
        <div className="text-center relative">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center glow-blue mb-6 shadow-2xl shadow-blue-500/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.17M5.55 17.776c.561-1.175 1.14-2.3 1.733-3.373m8.44-8.403C14.77 5.38 13.43 5 12 5c-3.866 0-7 3.134-7 7 0 2.067.895 3.93 2.325 5.27h.002"/></svg>
          </div>
          <h1 className="text-3xl font-black tracking-tighter">Furon<span className="text-blue-500">Labs</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Neural Quant Terminal</p>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-0 right-0 p-2 text-slate-400 hover:text-blue-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
        </div>

        <div className={`p-8 rounded-[2.5rem] border backdrop-blur-xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-2xl'}`}>
          {/* Status Indicator */}
          <div className="flex justify-center mb-6">
            <button 
              onClick={manualHealthCheck}
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border cursor-pointer hover:opacity-80 transition-opacity ${
                bridgeStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                bridgeStatus === 'OFFLINE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 
                'bg-slate-500/10 border-slate-500/20 text-slate-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bridgeStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : bridgeStatus === 'OFFLINE' ? 'bg-rose-500' : 'bg-slate-500'}`}></span>
              {bridgeStatus === 'ONLINE' ? 'BRIDGE CONNECTED' : bridgeStatus === 'OFFLINE' ? 'Bridge Offline (Tap to Retry)' : 'Checking...'}
            </button>
          </div>

          <div className="space-y-4">
            {showSettings && (
              <div className="mb-6 space-y-1 animate-fade">
                <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${errorField === 'apiKey' ? 'text-rose-500' : 'text-blue-500'}`}>
                  SmartAPI Key {errorField === 'apiKey' && '(CHECK THIS)'}
                </label>
                <input 
                  value={creds.apiKey} 
                  onChange={e => setCreds({...creds, apiKey: e.target.value})} 
                  placeholder="Paste your Angel One API Key" 
                  className={`w-full p-3 rounded-xl text-[10px] font-mono border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
                  } ${errorField === 'apiKey' ? 'border-rose-500 ring-1 ring-rose-500' : ''}`} 
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${errorField === 'client' ? 'text-rose-500' : 'text-slate-500'}`}>Client ID</label>
                <input 
                  value={creds.client} 
                  onChange={e => setCreds({...creds, client: e.target.value.toUpperCase()})} 
                  placeholder="S4..." 
                  className={`w-full p-4 rounded-2xl text-xs font-bold border outline-none focus:border-blue-500 transition-all ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  } ${errorField === 'client' ? 'border-rose-500' : ''}`} 
                />
              </div>
              <div className="space-y-1">
                <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${errorField === 'pin' ? 'text-rose-500' : 'text-slate-500'}`}>PIN</label>
                <input 
                  type="password" 
                  value={creds.pin} 
                  onChange={e => setCreds({...creds, pin: e.target.value})} 
                  placeholder="****" 
                  className={`w-full p-4 rounded-2xl text-xs font-bold border outline-none focus:border-blue-500 transition-all ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  } ${errorField === 'pin' ? 'border-rose-500' : ''}`} 
                />
              </div>
            </div>
            
            <div className="space-y-1 relative">
              <div className="flex justify-between px-1">
                <label className={`text-[8px] font-black uppercase tracking-widest ${errorField === 'totp' ? 'text-rose-500' : 'text-slate-500'}`}>TOTP CODE / SECRET</label>
                {storedSecret && <button onClick={clearSecret} className="text-[8px] font-black uppercase text-rose-500 hover:underline">Clear Secret</button>}
              </div>
              <input 
                value={creds.totpInput} 
                onChange={e => setCreds({...creds, totpInput: e.target.value.replace(/\s/g, '')})} 
                placeholder={storedSecret ? `Auto: ${liveCode || '...'}` : "Paste Secret OR 6-digit Code"} 
                className={`w-full p-5 rounded-2xl text-xs font-black text-center tracking-widest border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
                } ${storedSecret ? 'text-emerald-500' : ''} ${errorField === 'totp' ? 'border-rose-500' : ''}`} 
              />
              {storedSecret && (
                <div className="absolute top-[34px] left-0 w-full text-center pointer-events-none">
                  <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    SECRET SAVED • LIVE: {liveCode}
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={handleSync} 
              disabled={isSyncing || bridgeStatus === 'OFFLINE'} 
              className={`w-full py-5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-blue active:scale-95 transition-all relative overflow-hidden ${
                isSyncing ? 'opacity-90 bg-blue-600' : 
                bridgeStatus === 'OFFLINE' ? 'bg-slate-700 cursor-not-allowed' : 
                'bg-blue-600'
              }`}
            >
              {isSyncing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                  CONNECTING...
                </span>
              ) : bridgeStatus === 'OFFLINE' ? 'BRIDGE OFFLINE' : 'Sync Session'}
            </button>

            <button 
              onClick={handleDemoLogin}
              className="w-full py-3 text-slate-500 hover:text-slate-400 text-[9px] font-bold uppercase tracking-widest transition-colors"
            >
              Start in Demo Mode
            </button>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border font-mono text-[10px] min-h-[120px] flex flex-col justify-end ${isDarkMode ? 'bg-black/60 border-slate-800 text-emerald-500' : 'bg-slate-100 border-slate-200 text-blue-600'}`}>
          {logs.map((l, i) => (
            <div key={i} className={`mb-1 ${l.includes('ERR') ? 'text-rose-500 font-bold' : ''}`}>
              {l}
            </div>
          ))}
          {isSyncing && <div className="animate-pulse">_</div>}
        </div>
      </div>
    </div>
  );
}
