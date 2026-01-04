
import React, { useState } from 'react';
import { runTokenCheck } from '../fetch_tokens';
import { verifyData } from '../verify_data';

const DebugTerminal: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs(["[SYSTEM] INITIATING PRODUCTION BRIDGE DIAGNOSTICS...", "---------------------------------"]);

    const jwt = localStorage.getItem('ao_jwt') || '';
    if (!jwt) {
      addLog("[ERROR] No Active Session Detected.");
      addLog("[ERROR] Login via AuthGate first.");
      setIsRunning(false);
      return;
    }

    addLog("[REAL] Mode: PRODUCTION BRIDGE ACTIVE");

    // Task 1
    addLog("[TASK 1] RESOLVING SCRIP TOKENS...");
    const tokens = await runTokenCheck();
    if (tokens.sbinToken) {
      addLog(`[TASK 1] SUCCESS: SBIN-EQ TOKEN = ${tokens.sbinToken}`);
    } else {
      addLog(`[TASK 1] WARNING: Using local registry fallback.`);
    }

    // Task 2
    addLog("---------------------------------");
    addLog("[TASK 2] FETCHING LIVE OHLC BARS...");
    const sbinToken = tokens.sbinToken || '3045';
    
    try {
      const candles = await verifyData(sbinToken, 'SBIN-EQ');
      if (candles && candles.length > 0) {
        addLog(`[TASK 2] PRODUCTION DATA VERIFIED:`);
        candles.forEach((c, i) => {
          const time = new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          addLog(`  Bar ${i+1}: [${time}] Close: ₹${c.close.toFixed(2)}`);
        });
        addLog("[TASK 2] STATUS: Real-time Sync confirmed.");
      } else {
        addLog("[TASK 2] FAILED: No data payload received.");
        addLog("Action: Ensure CORS extension is active and Session is valid.");
      }
    } catch (e: any) {
      addLog(`[TASK 2] ERROR: ${e.message}`);
    }

    addLog("---------------------------------");
    addLog("[SYSTEM] DIAGNOSTICS COMPLETE.");
    setIsRunning(false);
  };

  return (
    <div className={`mt-6 p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Bridge Diagnostic Terminal</h3>
        <button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isRunning ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95'
          }`}
        >
          {isRunning ? 'Running...' : 'Verify Bridge'}
        </button>
      </div>

      <div className={`p-4 rounded-2xl border font-mono text-[10px] h-64 overflow-y-auto no-scrollbar ${isDarkMode ? 'bg-black/40 border-slate-800 text-emerald-500' : 'bg-slate-100 border-slate-200 text-blue-600'}`}>
        {logs.length === 0 ? (
          <p className="opacity-40 italic text-slate-500">Terminal Idle. Run diagnostics to verify production OHLC integrity.</p>
        ) : (
          logs.map((log, i) => <div key={i} className="mb-1 leading-relaxed">{log}</div>)
        )}
      </div>
    </div>
  );
};

export default DebugTerminal;
