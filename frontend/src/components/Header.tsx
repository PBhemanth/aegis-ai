import React from 'react';
import { ShieldCheck, Activity, KeyRound, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { GoogleAuthStatus } from '../types';

interface HeaderProps {
  agentState: string;
  googleStatus: GoogleAuthStatus | null;
  backendOnline: boolean;
  onRefreshGoogle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  agentState,
  googleStatus,
  backendOnline,
  onRefreshGoogle,
}) => {
  const getStateBadgeClass = (state: string) => {
    switch (state.toUpperCase()) {
      case 'EXECUTING':
        return 'badge-state-executing';
      case 'VERIFYING':
        return 'badge-state-verifying';
      case 'VERIFIED':
      case 'COMPLETED':
        return 'badge-state-verified';
      case 'AWAITING_APPROVAL':
      case 'APPROVAL REQUIRED':
        return 'badge-state-awaiting';
      case 'FAILED':
        return 'badge-state-failed';
      default:
        return 'badge-tier-1';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 mb-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">CampusPilot</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                AEGIS RUNTIME
              </span>
            </div>
            <p className="text-xs text-slate-400">Plan. Act. Verify. Trust. — Autonomous AI Agent Execution</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Agent State Badge */}
          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg" aria-live="polite">
            <span className="text-xs text-slate-400 font-medium">AGENT STATUS:</span>
            <span className={`badge ${getStateBadgeClass(agentState)}`}>
              <Activity className="h-3 w-3" aria-hidden="true" />
              {agentState}
            </span>
          </div>

          {/* Backend Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-500'}`}
              aria-hidden="true"
            />
            <span className={backendOnline ? 'text-slate-300' : 'text-rose-400'}>
              {backendOnline ? 'API Connected' : 'Offline'}
            </span>
          </div>

          {/* Google Services Integration Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {googleStatus?.authenticated ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Google OAuth Active
              </span>
            ) : googleStatus?.configured ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> OAuth Needs Login
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Google connection not configured</span>
            )}
            <button
              onClick={onRefreshGoogle}
              title="Refresh Google Auth status"
              className="p-1 hover:text-cyan-400 text-slate-500 rounded"
              aria-label="Refresh integration status"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
