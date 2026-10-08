import React from 'react';
import { Radio, Activity, Clock } from 'lucide-react';
import { AgentEvent } from '../types';

interface LiveTimelineProps {
  events: AgentEvent[];
  isConnected: boolean;
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ events, isConnected }) => {
  const mapEventToLabel = (type: string) => {
    switch (type.toUpperCase()) {
      case 'GOAL_RECEIVED':
        return { label: 'UNDERSTANDING', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800' };
      case 'PLAN_CREATED':
      case 'PLAN_SYNTHESIZED':
        return { label: 'PLANNING', color: 'text-blue-400 bg-blue-950/40 border-blue-800' };
      case 'RISK_EVALUATED':
        return { label: 'RISK CHECK', color: 'text-amber-300 bg-amber-950/40 border-amber-800' };
      case 'APPROVAL_REQUIRED':
      case 'APPROVAL_REQUESTED':
        return { label: 'APPROVAL REQUIRED', color: 'text-amber-400 bg-amber-950/40 border-amber-700 font-bold animate-pulse' };
      case 'APPROVED':
        return { label: 'APPROVED', color: 'text-emerald-300 bg-emerald-950/40 border-emerald-800' };
      case 'REJECTED':
        return { label: 'REJECTED', color: 'text-rose-400 bg-rose-950/40 border-rose-800' };
      case 'EXECUTING':
      case 'TOOL_EXECUTION_STARTED':
        return { label: 'EXECUTING', color: 'text-blue-300 bg-blue-950/40 border-blue-700' };
      case 'VERIFYING':
      case 'VERIFICATION_STARTED':
        return { label: 'VERIFYING', color: 'text-purple-300 bg-purple-950/40 border-purple-800' };
      case 'VERIFIED':
      case 'VERIFICATION_PASSED':
        return { label: 'VERIFIED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-700' };
      case 'RECOVERING':
      case 'RECOVERY_ATTEMPTED':
        return { label: 'RECOVERING', color: 'text-amber-400 bg-amber-950/40 border-amber-700' };
      case 'COMPLETED':
      case 'PLAN_COMPLETED':
        return { label: 'COMPLETED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-600 font-bold' };
      case 'FAILED':
      case 'PLAN_FAILED':
        return { label: 'FAILED', color: 'text-rose-400 bg-rose-950/40 border-rose-700 font-bold' };
      default:
        return { label: type, color: 'text-slate-300 bg-slate-900 border-slate-700' };
    }
  };

  return (
    <section className="panel-card mb-6" aria-labelledby="timeline-heading">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h3 id="timeline-heading" className="text-sm font-semibold text-white">
            Live Execution Telemetry & Lifecycle Stream
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
            <span>{isConnected ? 'SSE Live Stream Active' : 'Connecting Stream...'}</span>
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          Awaiting execution dispatch. Real lifecycle events (PLANNING, RISK CHECK, EXECUTING, VERIFYING) will stream here in real time.
        </div>
      ) : (
        <div className="relative pl-4 space-y-3 max-h-72 overflow-y-auto pr-1">
          {/* Vertical connecting line */}
          <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-800" aria-hidden="true" />

          {events.map((evt, idx) => {
            const { label, color } = mapEventToLabel(evt.event_type);
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();

            return (
              <div key={evt.id || idx} className="relative flex items-start gap-3 group text-xs">
                {/* Bullet */}
                <div className="h-3 w-3 rounded-full bg-slate-900 border-2 border-cyan-500 shrink-0 mt-1 relative z-10 group-hover:border-cyan-400" />

                <div className="flex-1 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${color}`}>
                      {label}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {evt.message || evt.event_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="font-mono">{evt.actor}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {timeStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
