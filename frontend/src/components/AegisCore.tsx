import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AegisCoreProps {
  agentState: string;
}

export const AegisCore: React.FC<AegisCoreProps> = ({ agentState }) => {
  const normalizedState = agentState.toUpperCase();

  const getStateVisuals = () => {
    if (normalizedState.includes('EXEC') || normalizedState.includes('TOOL')) {
      return {
        coreColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.7)',
        statusClass: 'text-cyan-300',
        ring1Stroke: '#00f2fe',
        ring2Stroke: '#8a2be2',
        subtext: 'SANDBOXED EXECUTION IN PROGRESS',
      };
    }
    if (normalizedState.includes('VERIFY')) {
      return {
        coreColor: '#c084fc',
        glowColor: 'rgba(168, 85, 247, 0.7)',
        statusClass: 'text-purple-300',
        ring1Stroke: '#a855f7',
        ring2Stroke: '#00f2fe',
        subtext: 'CRYPTOGRAPHIC ASSERTIONS EVALUATING',
      };
    }
    if (normalizedState.includes('COMPLET') || normalizedState.includes('VERIFIED')) {
      return {
        coreColor: '#34d399',
        glowColor: 'rgba(16, 185, 129, 0.7)',
        statusClass: 'text-emerald-300',
        ring1Stroke: '#10b981',
        ring2Stroke: '#34d399',
        subtext: 'MISSION VERIFIED & LEDGER SEALED',
      };
    }
    if (normalizedState.includes('APPROVAL') || normalizedState.includes('AWAITING') || normalizedState.includes('RISK')) {
      return {
        coreColor: '#fbbf24',
        glowColor: 'rgba(245, 158, 11, 0.7)',
        statusClass: 'text-amber-300',
        ring1Stroke: '#f59e0b',
        ring2Stroke: '#fb7185',
        subtext: 'HUMAN PERMISSION GATE INTERCEPT',
      };
    }
    if (normalizedState.includes('FAIL')) {
      return {
        coreColor: '#fb7185',
        glowColor: 'rgba(244, 63, 94, 0.7)',
        statusClass: 'text-rose-300',
        ring1Stroke: '#f43f5e',
        ring2Stroke: '#fb7185',
        subtext: 'EXECUTION EXCEPTION DETECTED',
      };
    }
    if (normalizedState.includes('PLAN') || normalizedState.includes('UNDERSTAND')) {
      return {
        coreColor: '#00f2fe',
        glowColor: 'rgba(0, 242, 254, 0.7)',
        statusClass: 'text-cyan-300',
        ring1Stroke: '#00f2fe',
        ring2Stroke: '#38bdf8',
        subtext: 'SYNTHESIZING DEPENDENCY DAG',
      };
    }
    // IDLE
    return {
      coreColor: '#38bdf8',
      glowColor: 'rgba(0, 242, 254, 0.4)',
      statusClass: 'text-slate-300',
      ring1Stroke: '#00f2fe',
      ring2Stroke: '#8a2be2',
      subtext: 'READY FOR MISSION DISPATCH',
    };
  };

  const visuals = getStateVisuals();

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* SVG Orbital Core Reactor */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full"
          aria-label={`Aegis Core Status: ${agentState}`}
          role="img"
        >
          <defs>
            {/* Core Radial Glow */}
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={visuals.coreColor} stopOpacity="0.9" />
              <stop offset="45%" stopColor={visuals.coreColor} stopOpacity="0.4" />
              <stop offset="80%" stopColor="#8a2be2" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Linear Laser Gradients */}
            <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#8a2be2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.9" />
            </linearGradient>

            <filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outermost Static Reticle */}
          <circle
            cx="160"
            cy="160"
            r="150"
            fill="none"
            stroke="rgba(56, 189, 248, 0.12)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />

          {/* Orbital Ring 1: Clockwise Segmented Arc */}
          <g className="core-orbit-1">
            <circle
              cx="160"
              cy="160"
              r="132"
              fill="none"
              stroke={visuals.ring1Stroke}
              strokeWidth="1.5"
              strokeDasharray="40 25 15 25"
              strokeOpacity="0.6"
            />
            {/* Orbiting Satellite Node 1 */}
            <circle cx="160" cy="28" r="4.5" fill="#00f2fe" filter="url(#neonBloom)" />
            <circle cx="160" cy="292" r="3.5" fill="#8a2be2" filter="url(#neonBloom)" />
          </g>

          {/* Orbital Ring 2: Counter-Clockwise Segmented Arc */}
          <g className="core-orbit-2">
            <circle
              cx="160"
              cy="160"
              r="104"
              fill="none"
              stroke={visuals.ring2Stroke}
              strokeWidth="2"
              strokeDasharray="60 30 20 30"
              strokeOpacity="0.5"
            />
            {/* Orbiting Satellite Node 2 */}
            <circle cx="264" cy="160" r="4" fill="#38bdf8" filter="url(#neonBloom)" />
            <circle cx="56" cy="160" r="3" fill="#00f2fe" filter="url(#neonBloom)" />
          </g>

          {/* Orbital Ring 3: Fast Inner Track */}
          <g className="core-orbit-3">
            <circle
              cx="160"
              cy="160"
              r="78"
              fill="none"
              stroke="rgba(0, 242, 254, 0.4)"
              strokeWidth="1"
              strokeDasharray="8 12"
            />
            <circle cx="160" cy="82" r="3" fill="#ffffff" filter="url(#neonBloom)" />
          </g>

          {/* Core Ambient Aura */}
          <circle
            cx="160"
            cy="160"
            r="60"
            fill="url(#coreGlow)"
            className="core-glow-pulsing"
          />

          {/* Central Reactor Plate */}
          <circle
            cx="160"
            cy="160"
            r="48"
            fill="#060c18"
            stroke={visuals.coreColor}
            strokeWidth="2"
            filter="url(#neonBloom)"
          />

          {/* Central Shield/Core Icon */}
          <g transform="translate(146, 146)">
            <ShieldCheck
              className="h-7 w-7 text-white"
              style={{ color: visuals.coreColor }}
            />
          </g>
        </svg>

        {/* Floating Telemetry Readout in Center Bottom */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[9px] font-mono tracking-widest text-cyan-400 font-extrabold uppercase opacity-80 mt-14">
            AEGIS CORE
          </span>
          <span className={`text-xs font-black tracking-wider uppercase font-mono ${visuals.statusClass}`}>
            {agentState}
          </span>
        </div>
      </div>

      {/* Sub-Core Status Banner */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-xs shadow-inner">
          <span className="h-2 w-2 rounded-full animate-ping" style={{ backgroundColor: visuals.coreColor }} />
          <span className="font-mono text-[11px] text-slate-300 font-semibold tracking-wide">
            {visuals.subtext}
          </span>
        </div>
      </div>
    </div>
  );
};
