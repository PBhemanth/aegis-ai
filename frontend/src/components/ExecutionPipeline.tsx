import React from 'react';
import {
  Compass,
  FileCode2,
  ShieldAlert,
  Cpu,
  CheckCheck,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ExecutionPipelineProps {
  agentState: string;
}

interface PipelineStage {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: PipelineStage[] = [
  {
    id: 'UNDERSTAND',
    name: 'UNDERSTAND',
    code: '01',
    description: 'Goal intent & capability boundary check',
    icon: Compass,
  },
  {
    id: 'PLAN',
    name: 'PLAN',
    code: '02',
    description: 'Dependency DAG synthesis & ordering',
    icon: FileCode2,
  },
  {
    id: 'RISK',
    name: 'RISK',
    code: '03',
    description: 'Deterministic risk tier classification',
    icon: ShieldAlert,
  },
  {
    id: 'EXECUTE',
    name: 'EXECUTE',
    code: '04',
    description: 'Sandboxed tool invocation & receipts',
    icon: Cpu,
  },
  {
    id: 'VERIFY',
    name: 'VERIFY',
    code: '05',
    description: 'Independent assertion proof check',
    icon: CheckCheck,
  },
  {
    id: 'COMPLETE',
    name: 'COMPLETE',
    code: '06',
    description: 'Chained audit ledger sealed',
    icon: Award,
  },
];

export const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({ agentState }) => {
  const getStageIndex = (state: string): number => {
    const s = state.toUpperCase();
    if (s.includes('UNDERSTAND') || s.includes('GOAL_RECEIVED')) return 0;
    if (s.includes('PLAN')) return 1;
    if (s.includes('RISK') || s.includes('APPROVAL') || s.includes('AWAITING')) return 2;
    if (s.includes('EXEC') || s.includes('TOOL') || s.includes('RECOVER')) return 3;
    if (s.includes('VERIFY')) return 4;
    if (s.includes('COMPLET')) return 5;
    return -1; // IDLE
  };

  const activeIndex = getStageIndex(agentState);

  return (
    <section
      aria-label="Agent Execution Safety Pipeline"
      className="sci-fi-panel mb-6"
    >
      <div className="corner-bracket corner-tl" aria-hidden="true" />
      <div className="corner-bracket corner-tr" aria-hidden="true" />
      <div className="corner-bracket corner-bl" aria-hidden="true" />
      <div className="corner-bracket corner-br" aria-hidden="true" />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
            // CINEMATIC EXECUTION PIPELINE
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">ACTIVE STAGE:</span>
          <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800/60 shadow-sm shadow-cyan-500/20">
            {agentState}
          </span>
        </div>
      </div>

      {/* Horizontal Pipeline Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 relative">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = activeIndex === index;
          const isCompleted = activeIndex > index || activeIndex === 5;

          let cardStyle = 'bg-slate-950/60 border-slate-800/80 text-slate-400';
          let iconColor = 'text-slate-500';

          if (isActive) {
            cardStyle =
              'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/50';
            iconColor = 'text-cyan-300 animate-pulse';
          } else if (isCompleted) {
            cardStyle = 'bg-emerald-950/30 border-emerald-600/60 text-emerald-300 shadow-sm shadow-emerald-500/10';
            iconColor = 'text-emerald-400';
          }

          return (
            <div
              key={stage.id}
              className={`flex flex-col justify-between p-3 rounded-xl border transition-all duration-300 relative ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-extrabold text-slate-500">
                  {stage.code}
                </span>
                <div className={`p-1 rounded-lg ${isActive ? 'bg-cyan-500/20' : 'bg-slate-900'}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>

              <div>
                <div className="text-xs font-black tracking-wider mb-1 flex items-center justify-between font-mono">
                  <span>{stage.name}</span>
                  {index < STAGES.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-600 hidden lg:inline" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {stage.description}
                </div>
              </div>

              {isActive && (
                <div className="mt-2.5 h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full animate-pulse shadow-sm shadow-cyan-500/50" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
