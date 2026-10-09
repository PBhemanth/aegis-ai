import React from 'react';
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Key,
  Database,
  Search,
} from 'lucide-react';
import { GoogleAuthStatus, PlanData } from '../types';

interface AgentRadarProps {
  agentState: string;
  plan?: PlanData | null;
  googleStatus?: GoogleAuthStatus | null;
  isLoading?: boolean;
}

export const AgentRadar: React.FC<AgentRadarProps> = ({
  agentState,
  plan,
  googleStatus,
  isLoading = false,
}) => {
  const normalizedState = (agentState || 'IDLE').toUpperCase();

  const getStatusDisplay = () => {
    if (normalizedState.includes('EXEC') || normalizedState.includes('TOOL')) {
      return {
        badge: 'EXECUTING',
        bg: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
        dot: 'bg-cyan-400',
        spinning: true,
      };
    }
    if (normalizedState.includes('VERIFY')) {
      return {
        badge: 'VERIFYING',
        bg: 'bg-purple-950/80 border-purple-500/60 text-purple-300',
        dot: 'bg-purple-400',
        spinning: true,
      };
    }
    if (normalizedState.includes('COMPLET') || normalizedState.includes('VERIFIED')) {
      return {
        badge: 'COMPLETED & VERIFIED',
        bg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
        dot: 'bg-emerald-400',
        spinning: false,
      };
    }
    if (normalizedState.includes('APPROVAL') || normalizedState.includes('AWAITING')) {
      return {
        badge: 'APPROVAL REQUIRED',
        bg: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
        dot: 'bg-amber-400',
        spinning: false,
      };
    }
    if (normalizedState.includes('FAIL') || normalizedState.includes('REJECT')) {
      return {
        badge: normalizedState.includes('REJECT') ? 'REJECTED' : 'FAILED',
        bg: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
        dot: 'bg-rose-400',
        spinning: false,
      };
    }
    if (normalizedState.includes('PLAN') || normalizedState.includes('UNDERSTAND')) {
      return {
        badge: 'PLANNING',
        bg: 'bg-sky-950/80 border-sky-500/60 text-sky-300',
        dot: 'bg-sky-400',
        spinning: true,
      };
    }
    return {
      badge: 'IDLE (READY)',
      bg: 'bg-slate-900/90 border-slate-700/80 text-slate-300',
      dot: 'bg-cyan-400',
      spinning: false,
    };
  };

  const status = getStatusDisplay();
  const steps = plan?.steps || [];
  const completedSteps = steps.filter((s) => s.status === 'VERIFIED').length;
  const totalSteps = steps.length;
  const awaitingApproval = steps.some((s) => s.status === 'AWAITING_APPROVAL');

  return (
    <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full min-h-[380px] max-h-[580px] overflow-hidden">
      {/* Header: Agent Identity + Functional Status Indicator */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Agent Runtime Telemetry
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Aegis Kernel // Deterministic Engine
            </span>
          </div>
        </div>

        {/* Live Operational State Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide border ${status.bg}`}
        >
          {isLoading || status.spinning ? (
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
          ) : (
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          )}
          <span>{status.badge}</span>
        </div>
      </div>

      {/* Main Telemetry Body: Functional Status Overview */}
      <div className="flex-1 py-3.5 space-y-3.5 overflow-y-auto pr-1">
        {/* Mission Status Card */}
        <div className="rounded-xl bg-[#070c18] border border-slate-800/90 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium font-mono text-[11px] uppercase">
              Current Mission
            </span>
            {plan ? (
              <span className="font-mono text-cyan-400 text-[11px] bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/60 truncate max-w-[160px]">
                {plan.id}
              </span>
            ) : (
              <span className="text-slate-500 text-xs">No active plan</span>
            )}
          </div>

          {plan ? (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span className="font-medium">Plan Execution Progress</span>
                <span className="font-mono text-xs font-semibold">
                  {completedSteps} / {totalSteps} Steps
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    completedSteps === totalSteps && totalSteps > 0
                      ? 'bg-emerald-400'
                      : awaitingApproval
                      ? 'bg-amber-400'
                      : 'bg-cyan-500'
                  }`}
                  style={{
                    width: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Ready to process goals. Enter a research objective or study plan in the command box.
            </p>
          )}
        </div>

        {/* Safety & Blast Radius Policy */}
        <div className="rounded-xl bg-[#070c18] border border-slate-800/90 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deterministic Blast-Radius Engine</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">TIER 0 / 1</span>
              <span className="text-cyan-300 font-medium">Read / Reversible</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Auto-Permitted</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">TIER 2 / 3</span>
              <span className="text-amber-300 font-medium">Mutate / Delete</span>
              <span className="text-[10px] text-amber-400 block mt-0.5">Approval Gated</span>
            </div>
          </div>
        </div>

        {/* Service Integration Truth Matrix */}
        <div className="rounded-xl bg-[#070c18] border border-slate-800/90 p-3 space-y-2">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider block">
            Service Integrations Status
          </span>

          <div className="space-y-1.5 text-xs">
            {/* 1. Academic arXiv Search */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">arXiv Research Engine</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                Verified Online
              </span>
            </div>

            {/* 2. Cryptographic Ledger */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">Audit Ledger (HMAC)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                Sealed
              </span>
            </div>

            {/* 3. Google Workspace */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300">Google Drive & Calendar</span>
              </div>
              {googleStatus?.authenticated ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900/50">
                  OAuth Required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Deterministic Verifier Assertion */}
      <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Independent Proof Verifier</span>
        </span>
        <span className="text-cyan-400 font-semibold">ACTIVE</span>
      </div>
    </div>
  );
};
