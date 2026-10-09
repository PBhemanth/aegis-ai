import React from 'react';
import {
  ShieldCheck,
  Activity,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
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
    <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 py-2.5 mb-4 shadow-xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center shrink-0">
            <div className="h-full w-full rounded-[10px] bg-slate-950/80 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                CampusPilot
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 flex items-center gap-1">
                <Cpu className="h-2.5 w-2.5" /> AEGIS RUNTIME
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-cyan-400 font-semibold">Plan. Act. Verify. Trust.</span> • Autonomous AI Agent Execution
            </p>
          </div>
        </div>

        {/* Live Status Command Indicators */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          {/* Animated Agent Status Indicator */}
          <div
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner text-xs"
            aria-live="polite"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              AGENT STATUS:
            </span>
            <span className={`badge ${getStateBadgeClass(agentState)}`}>
              <Activity className="h-3 w-3" aria-hidden="true" />
              {agentState}
            </span>
          </div>

          {/* Backend Health Status */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
            title={backendOnline ? 'Backend API Kernel Connected' : 'Backend API Kernel Offline'}
          >
            {backendOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">API Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-400 font-medium">Offline</span>
              </>
            )}
          </div>

          {/* Google Services Integration Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
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
              <span className="text-slate-400 font-medium">Google not configured</span>
            )}
            <button
              onClick={onRefreshGoogle}
              title="Refresh Google Auth status"
              className="p-1 hover:text-cyan-300 text-slate-500 rounded hover:bg-slate-800 transition-colors"
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
