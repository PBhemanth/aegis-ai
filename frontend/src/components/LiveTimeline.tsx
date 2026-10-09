import React from 'react';
import {
  Radio,
  Clock,
  Compass,
  FileCode2,
  ShieldAlert,
  Cpu,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Lock,
  Terminal,
} from 'lucide-react';
import { AgentEvent } from '../types';

interface LiveTimelineProps {
  events: AgentEvent[];
  isConnected: boolean;
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ events, isConnected }) => {
  const mapEventToVisual = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('GOAL_RECEIVED') || t.includes('UNDERSTAND')) {
      return {
        label: 'GOAL_RECEIVED',
        badgeColor: 'text-cyan-300 bg-cyan-950/80 border-cyan-500/80',
        dotColor: 'bg-cyan-400',
        icon: Compass,
      };
    }
    if (t.includes('PLAN_CREATED') || t.includes('PLAN_SYNTHESIZED') || t.includes('PLANNING')) {
      return {
        label: 'PLAN_CREATED',
        badgeColor: 'text-blue-300 bg-blue-950/80 border-blue-500/80',
        dotColor: 'bg-blue-400',
        icon: FileCode2,
      };
    }
    if (t.includes('RISK_EVALUATED') || t.includes('RISK_CHECK')) {
      return {
        label: 'RISK_EVALUATED',
        badgeColor: 'text-amber-300 bg-amber-950/80 border-amber-500/80',
        dotColor: 'bg-amber-400',
        icon: ShieldAlert,
      };
    }
    if (t.includes('APPROVAL_REQUIRED') || t.includes('APPROVAL_REQUESTED')) {
      return {
        label: 'APPROVAL_REQUIRED',
        badgeColor: 'text-amber-200 bg-amber-950 border-amber-400 font-bold animate-pulse',
        dotColor: 'bg-amber-400 animate-ping',
        icon: Lock,
      };
    }
    if (t.includes('APPROVED')) {
      return {
        label: 'APPROVED',
        badgeColor: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/80',
        dotColor: 'bg-emerald-400',
        icon: CheckCircle2,
      };
    }
    if (t.includes('REJECTED')) {
      return {
        label: 'REJECTED',
        badgeColor: 'text-rose-300 bg-rose-950/80 border-rose-500/80',
        dotColor: 'bg-rose-400',
        icon: AlertTriangle,
      };
    }
    if (t.includes('EXECUTING') || t.includes('TOOL_EXECUTION')) {
      return {
        label: 'EXECUTING',
        badgeColor: 'text-cyan-300 bg-cyan-950/80 border-cyan-400',
        dotColor: 'bg-cyan-400 animate-pulse',
        icon: Cpu,
      };
    }
    if (t.includes('VERIFYING') || t.includes('VERIFICATION_STARTED')) {
      return {
        label: 'VERIFYING',
        badgeColor: 'text-purple-300 bg-purple-950/80 border-purple-500/80',
        dotColor: 'bg-purple-400 animate-pulse',
        icon: Search,
      };
    }
    if (t.includes('VERIFIED') || t.includes('VERIFICATION_PASSED')) {
      return {
        label: 'VERIFIED',
        badgeColor: 'text-emerald-300 bg-emerald-950/90 border-emerald-400 font-bold',
        dotColor: 'bg-emerald-400',
        icon: CheckCircle2,
      };
    }
    if (t.includes('COMPLETED') || t.includes('PLAN_COMPLETED')) {
      return {
        label: 'COMPLETED',
        badgeColor: 'text-emerald-300 bg-emerald-950 border-emerald-400 font-black',
        dotColor: 'bg-emerald-400',
        icon: Award,
      };
    }
    if (t.includes('FAILED') || t.includes('PLAN_FAILED')) {
      return {
        label: 'FAILED',
        badgeColor: 'text-rose-300 bg-rose-950 border-rose-500 font-bold',
        dotColor: 'bg-rose-500',
        icon: AlertTriangle,
      };
    }
    return {
      label: type,
      badgeColor: 'text-slate-300 bg-slate-900 border-slate-700',
      dotColor: 'bg-slate-500',
      icon: Terminal,
    };
  };

  return (
    <section className="sci-fi-panel mb-6 flex flex-col justify-between" aria-labelledby="timeline-heading">
      <div className="corner-bracket corner-tl" aria-hidden="true" />
      <div className="corner-bracket corner-tr" aria-hidden="true" />
      <div className="corner-bracket corner-bl" aria-hidden="true" />
      <div className="corner-bracket corner-br" aria-hidden="true" />

      <div>
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <h3 id="timeline-heading" className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
              // TELEMETRY CONSOLE FEED
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all ${
                isConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
              <span>{isConnected ? 'LIVE SSE FEED' : 'STANDBY'}</span>
            </span>
          </div>
        </div>

        {/* Content Stream */}
        {events.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 font-mono leading-relaxed">
            [STANDBY] Awaiting mission dispatch. Real-time events stream through live SSE broadcaster channel.
          </div>
        ) : (
          <div className="relative space-y-2 max-h-80 overflow-y-auto pr-1 font-mono">
            {events.map((evt, idx) => {
              const visual = mapEventToVisual(evt.event_type);
              const EventIcon = visual.icon;
              const timeStr = new Date(evt.timestamp).toLocaleTimeString();

              return (
                <div
                  key={evt.id || idx}
                  className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col gap-1 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${visual.dotColor}`} />
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider border flex items-center gap-1 ${visual.badgeColor}`}
                      >
                        <EventIcon className="h-2.5 w-2.5" />
                        {visual.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="text-slate-400 font-semibold">@{evt.actor}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-200 pl-3 leading-snug">
                    {evt.message || evt.event_type}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>CHANNEL: /api/events/stream</span>
        <span>RECORDS: {events.length}</span>
      </div>
    </section>
  );
};
