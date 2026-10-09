import React from 'react';
import { Bot } from 'lucide-react';

interface AgentRadarProps {
  agentState: string;
}

export const AgentRadar: React.FC<AgentRadarProps> = ({ agentState }) => {
  const normalizedState = (agentState || 'IDLE').toUpperCase();

  const getStatusColor = () => {
    if (normalizedState.includes('EXEC') || normalizedState.includes('TOOL')) {
      return {
        accent: '#00f2fe',
        glow: 'rgba(0, 242, 254, 0.7)',
        text: 'text-cyan-400',
        badge: 'EXECUTING',
      };
    }
    if (normalizedState.includes('VERIFY')) {
      return {
        accent: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.7)',
        text: 'text-purple-400',
        badge: 'VERIFYING',
      };
    }
    if (normalizedState.includes('COMPLET') || normalizedState.includes('VERIFIED')) {
      return {
        accent: '#10b981',
        glow: 'rgba(16, 185, 129, 0.7)',
        text: 'text-emerald-400',
        badge: 'COMPLETED',
      };
    }
    if (normalizedState.includes('APPROVAL') || normalizedState.includes('AWAITING')) {
      return {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.7)',
        text: 'text-amber-400',
        badge: 'APPROVAL REQUIRED',
      };
    }
    if (normalizedState.includes('FAIL')) {
      return {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.7)',
        text: 'text-rose-400',
        badge: 'FAILED',
      };
    }
    if (normalizedState.includes('PLAN') || normalizedState.includes('UNDERSTAND')) {
      return {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.7)',
        text: 'text-sky-400',
        badge: 'PLANNING',
      };
    }
    return {
      accent: '#00f2fe',
      glow: 'rgba(0, 242, 254, 0.4)',
      text: 'text-cyan-400',
      badge: 'IDLE',
    };
  };

  const status = getStatusColor();

  return (
    <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors duration-300 shadow-[0_4px_30px_-5px_rgba(0,242,254,0.10)] flex flex-col justify-between h-full min-h-[380px] max-h-[520px] overflow-hidden">
      {/* Header: Robot Icon + LIVE Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Autonomous Agent
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Aegis Kernel // Core v2.5
            </span>
          </div>
        </div>

        {/* Green LIVE Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 text-xs font-mono font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Center Radar Orbit Visualization */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 max-w-full flex items-center justify-center">
          <svg
            viewBox="0 0 320 320"
            className="w-full h-full"
            aria-label={`Agent Radar: ${agentState}`}
          >
            <defs>
              <linearGradient id="orbitGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#8a2be2" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="orbitGradPurple" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8a2be2" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.7" />
              </linearGradient>

              <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outermost Faint Ring */}
            <circle
              cx="160"
              cy="160"
              r="138"
              fill="none"
              stroke="#0ea5e9"
              strokeOpacity="0.15"
              strokeWidth="1"
              strokeDasharray="4 8"
            />

            {/* Orbit Ring 1 (Outer with traveling node) */}
            <g className="core-orbit-1">
              <circle
                cx="160"
                cy="160"
                r="120"
                fill="none"
                stroke="url(#orbitGradCyan)"
                strokeWidth="1.8"
                strokeDasharray="50 30 20 30"
              />
              {/* Satellite Node 1 */}
              <circle cx="280" cy="160" r="5" fill="#00f2fe" filter="url(#cyanGlow)" />
              <circle cx="40" cy="160" r="3.5" fill="#8a2be2" filter="url(#cyanGlow)" />
            </g>

            {/* Orbit Ring 2 (Middle with traveling node) */}
            <g className="core-orbit-2">
              <circle
                cx="160"
                cy="160"
                r="92"
                fill="none"
                stroke="url(#orbitGradPurple)"
                strokeWidth="2"
                strokeDasharray="70 40 30 40"
              />
              {/* Satellite Node 2 */}
              <circle cx="160" cy="68" r="5.5" fill="#00f2fe" filter="url(#cyanGlow)" />
              <circle cx="160" cy="252" r="4" fill="#38bdf8" filter="url(#cyanGlow)" />
            </g>

            {/* Orbit Ring 3 (Inner dashed ring) */}
            <g className="core-orbit-3">
              <circle
                cx="160"
                cy="160"
                r="68"
                fill="none"
                stroke="#00f2fe"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                strokeDasharray="12 16"
              />
              <circle cx="112" cy="112" r="4" fill="#a855f7" filter="url(#cyanGlow)" />
            </g>

            {/* Central Glowing Plate */}
            <circle
              cx="160"
              cy="160"
              r="48"
              fill="#060c18"
              stroke="url(#orbitGradCyan)"
              strokeWidth="2.5"
              filter="url(#cyanGlow)"
            />

            {/* Stylized Robot Mascot in Center */}
            <g transform="translate(132, 132)">
              {/* Robot Head Body */}
              <rect
                x="6"
                y="10"
                width="44"
                height="36"
                rx="12"
                fill="#0c172e"
                stroke="#00f2fe"
                strokeWidth="2.5"
                filter="url(#cyanGlow)"
              />
              {/* Antenna */}
              <line x1="28" y1="2" x2="28" y2="10" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="28" cy="2" r="2.5" fill="#00f2fe" />
              {/* Cute glowing cyan robot eyes */}
              <rect x="15" y="22" width="9" height="7" rx="3.5" fill="#00f2fe" />
              <rect x="32" y="22" width="9" height="7" rx="3.5" fill="#00f2fe" />
              {/* Subtle smile/line */}
              <path d="M 23 36 Q 28 40 33 36" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>

        {/* State readout banner */}
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-xs shadow-inner">
            <span
              className="h-2 w-2 rounded-full animate-ping"
              style={{ backgroundColor: status.accent }}
            />
            <span className={`font-mono text-xs font-bold tracking-wider ${status.text}`}>
              {status.badge}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
