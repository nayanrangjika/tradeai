
import React, { useState } from 'react';
import { angelOne } from '../services/angelOneService';
import { API_KEYS } from '../constants';

interface AuthGateProps {
  isDarkMode: boolean;
  onAuthenticated: () => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ isDarkMode, onAuthenticated }) => {
  const [clientCode, setClientCode] = useState(localStorage.getItem('ao_client_code') || 'S433867');
  const [password, setPassword] = useState(localStorage.getItem('ao_password') || '');
  const [totp, setTotp] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'error' | 'success'}[]>([
    { msg: 'BRIDGE TERMINAL READY...', type: 'info' }
  ]);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => 
    setLogs(prev => [...prev.slice(-4), { msg: `> ${msg}`, type }]);

  const handleConnect = async () => {
    if (!clientCode || !password || totp.length < 6) {
      setError("Enter Client ID, PIN, and 6-digit TOTP.");
      return;
    }
    setError('');
    setIsConnecting(true);
    addLog(`INIT HANDSHAKE FOR ID: ${clientCode}`);

    try {
      const primaryKey = API_KEYS.TRADING;
      addLog(`USING KEY [Tradingfur]: ${primaryKey.substring(0, 4)}****`);
      addLog("CONNECTING TO SMARTAPI GATEWAY...");
      
      const creds = {
        apiKey: primaryKey,
        clientCode: clientCode.trim(),
        password: password.trim(),
        totp: totp.trim()
      };

      const session = await angelOne.login(creds);
      
      if (session.jwtToken) {
        localStorage.setItem('ao_jwt', session.jwtToken);
        localStorage.setItem('ao_client_code', clientCode);
        localStorage.setItem('ao_password', password);
        localStorage.setItem('ao_api_key', primaryKey); // Crucial for session consistency
        
        addLog("BRIDGE ESTABLISHED. SESSION LIVE.", 'success');
        setTimeout(onAuthenticated, 800);
      } else {
        throw new Error("Handshake returned empty payload.");
      }
    } catch (e: any) {
      console.error("Auth Exception:", e);
      const isAgError = e.message.includes("[AG");
      setError(e.message);
      addLog(`FAILURE: ${e.message.toUpperCase()}`, 'error');
      
      if (isAgError) {
        if (e.message.includes("AG0001")) addLog("CHECK CLIENT ID OR PIN/PWD", 'info');
        if (e.message.includes("AG0002")) addLog("CHECK TOTP SYNC", 'info');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`min-h-screen max-w-md mx-auto flex flex-col items-center justify-center p-8 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="w-full space-y-6 animate-modal">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tighter">Furon<span className="text-blue-500">Labs</span></h1>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Neural Bridge Sync</p>
        </div>

        <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Client ID</label>
                <input 
                  value={clientCode}
                  onChange={e => setClientCode(e.target.value.toUpperCase())}
                  placeholder="S433..."
                  className={`w-full p-3 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">PIN / Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="****"
                  className={`w-full p-3 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">TOTP (Google Authenticator)</label>
              <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totp}
                onChange={e => setTotp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="000 000"
                className={`w-full p-4 rounded-2xl text-xl font-black tracking-[0.5em] text-center border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'}`}
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                <p className="text-[9px] text-rose-500 font-bold leading-tight">{error}</p>
                {error.includes("CORS") && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[8px] text-rose-400 font-black uppercase tracking-tighter">Action Required:</p>
                    <a href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafcehpndohpbgredajmabcfnnand" target="_blank" className="text-[8px] text-blue-500 underline font-bold uppercase text-center block">Install 'Allow CORS' Extension</a>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isConnecting ? 'Opening Bridge...' : 'Sync Production Terminal'}
            </button>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border font-mono text-[9px] min-h-[100px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
           {logs.map((log, i) => (
             <div key={i} className={
               log.type === 'error' ? 'text-rose-500 font-bold' : 
               log.type === 'success' ? 'text-emerald-500 font-bold' : 
               'text-blue-500/70'
             }>
               {log.msg}
             </div>
           ))}
           {isConnecting && <div className="animate-pulse text-blue-500">_</div>}
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
