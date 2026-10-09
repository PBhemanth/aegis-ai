import React, { useState } from 'react';
import {
  ClipboardList,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  AlertTriangle,
  Play,
  Fingerprint,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PlanData, RiskTier, StepDefinition, StepStatus } from '../types';
import { StepResultDetails } from './StepResultDetails';

interface TasksPanelProps {
  plan: PlanData | null;
  onExecuteStep: (stepId: string) => void;
  onRequestApproval: (step: StepDefinition) => void;
  onInspectProof: (stepId: string) => void;
  executingStepId: string | null;
  onOpenFullPlanner?: () => void;
  onLaunchPreset?: (preset: 'gnn' | 'study' | 'gate') => void;
}

export const TasksPanel: React.FC<TasksPanelProps> = ({
  plan,
  onExecuteStep,
  onRequestApproval,
  onInspectProof,
  executingStepId,
  onOpenFullPlanner,
  onLaunchPreset,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'verified'>('all');
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const toggleStepExpand = (stepId: string) => {
    setExpandedStepIds((prev) => ({
      ...prev,
      [stepId]: prev[stepId] === undefined ? false : !prev[stepId],
    }));
  };

  const getRiskBadge = (tier: RiskTier) => {
    switch (tier) {
      case 'TIER_0_READ':
        return <span className="badge badge-tier-0">TIER 0 • READ ONLY</span>;
      case 'TIER_1_REVERSIBLE':
        return <span className="badge badge-tier-1">TIER 1 • REVERSIBLE</span>;
      case 'TIER_2_MUTATING':
        return <span className="badge badge-tier-2">TIER 2 • MUTATING</span>;
      case 'TIER_3_DESTRUCTIVE':
        return <span className="badge badge-tier-3">TIER 3 • DESTRUCTIVE</span>;
      default:
        return <span className="badge badge-tier-1">{tier}</span>;
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="badge badge-state-verified">
            <CheckCircle2 className="h-3 w-3" /> VERIFIED
          </span>
        );
      case 'EXECUTING':
        return (
          <span className="badge badge-state-executing">
            <Clock className="h-3 w-3 animate-spin" /> EXECUTING
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="badge badge-state-verifying">
            <Search className="h-3 w-3 animate-pulse" /> VERIFYING
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="badge badge-state-awaiting">
            <ShieldAlert className="h-3 w-3" /> APPROVAL REQUIRED
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-state-failed">
            <AlertTriangle className="h-3 w-3" /> FAILED
          </span>
        );
      default:
        return (
          <span className="badge bg-slate-900 text-slate-400 border border-slate-800">
            PENDING
          </span>
        );
    }
  };

  const hasSteps = Boolean(plan && plan.steps && plan.steps.length > 0);
  const steps = plan?.steps || [];
  const filteredSteps = steps.filter((step) => {
    if (filterMode === 'verified') return step.status === 'VERIFIED';
    if (filterMode === 'pending') return step.status !== 'VERIFIED';
    return true;
  });

  return (
    <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full min-h-[380px]">
      {/* Header: Clipboard Icon + View Filter Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Tasks & Mission DAG
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {hasSteps
                ? `${steps.filter((s) => s.status === 'VERIFIED').length} of ${steps.length} steps completed`
                : 'No active plan loaded'}
            </span>
          </div>
        </div>

        {/* View Mode / Filter Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setFilterMode((prev) =>
                prev === 'all' ? 'pending' : prev === 'pending' ? 'verified' : 'all'
              )
            }
            className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            title={`Current Filter: ${filterMode.toUpperCase()} (Click to toggle)`}
            aria-label="Filter tasks"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {!hasSteps ? (
          /* Empty State Illustration matching Reference Image */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Glowing Neon Rounded Check Card Illustration */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-3">
              {/* Radiating Accent Lines */}
              <div className="absolute -left-3 top-8 w-3 h-0.5 bg-cyan-400/60 rounded-full" />
              <div className="absolute -left-2 bottom-8 w-3 h-0.5 bg-cyan-400/40 rounded-full rotate-12" />
              <div className="absolute -right-3 top-8 w-3 h-0.5 bg-cyan-400/60 rounded-full" />
              <div className="absolute -right-2 bottom-8 w-3 h-0.5 bg-cyan-400/40 rounded-full -rotate-12" />

              {/* Glowing Card Box */}
              <div className="w-16 h-20 rounded-2xl bg-[#0b1428] border-2 border-cyan-400/70 shadow-[0_0_25px_rgba(0,242,254,0.35)] flex items-center justify-center relative">
                {/* Checkmark inside */}
                <svg
                  className="w-7 h-7 text-cyan-300 filter drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => onLaunchPreset?.('gnn')}
                className="px-3 py-1.5 rounded-xl bg-[#0c1833] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-semibold shadow-sm transition-all"
              >
                ✦ GNN Research
              </button>
              <button
                type="button"
                onClick={() => onLaunchPreset?.('study')}
                className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 text-xs font-semibold shadow-sm transition-all"
              >
                📅 ML Study Plan
              </button>
              <button
                type="button"
                onClick={() => onLaunchPreset?.('gate')}
                className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-semibold shadow-sm transition-all"
              >
                🔒 Safety Gate
              </button>
            </div>
          </div>
        ) : (
          /* Real Task Steps List */
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredSteps.map((step, idx) => {
              const isCurrentExecuting = executingStepId === step.id;
              const hasOutput = Boolean(
                step.execution_result ||
                  step.execution_result_json ||
                  step.error_message ||
                  step.status === 'VERIFIED' ||
                  step.status === 'FAILED'
              );
              const isExpanded =
                expandedStepIds[step.id] ?? (step.status === 'VERIFIED' || step.status === 'FAILED');

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isCurrentExecuting
                      ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                      : step.status === 'VERIFIED'
                      ? 'bg-slate-950/60 border-emerald-900/50'
                      : step.status === 'AWAITING_APPROVAL'
                      ? 'bg-amber-950/40 border-amber-500/70 shadow-md shadow-amber-500/20 animate-pulse'
                      : 'bg-slate-950/70 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold shrink-0">
                        {step.step_order || idx + 1}
                      </span>
                      <h4 className="font-semibold text-slate-200 line-clamp-1">
                        {step.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(step.status)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {getRiskBadge(step.risk_tier)}
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                        {step.tool_name}
                      </span>
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {hasOutput && (
                        <button
                          type="button"
                          onClick={() => toggleStepExpand(step.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 text-[10px] rounded-lg flex items-center gap-1 font-mono transition-colors"
                          aria-label="Toggle step output"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span>{isExpanded ? 'Hide' : 'Output'}</span>
                        </button>
                      )}

                      {step.status === 'AWAITING_APPROVAL' && (
                        <button
                          type="button"
                          onClick={() => onRequestApproval(step)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg flex items-center gap-1 shadow-sm"
                          aria-label={`Review and approve action for ${step.title}`}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                      )}

                      {step.status === 'VERIFIED' && (
                        <button
                          type="button"
                          onClick={() => onInspectProof(step.id)}
                          className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 text-[10px] rounded-lg flex items-center gap-1 font-semibold"
                          aria-label={`Inspect cryptographic verification proof for ${step.title}`}
                        >
                          <Fingerprint className="h-3 w-3 text-emerald-400" />
                          <span>Proof</span>
                        </button>
                      )}

                      {step.status !== 'VERIFIED' && step.status !== 'AWAITING_APPROVAL' && (
                        <button
                          type="button"
                          disabled={isCurrentExecuting}
                          onClick={() => onExecuteStep(step.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] rounded-lg flex items-center gap-1 font-semibold"
                          aria-label={`Execute single step ${step.title}`}
                        >
                          <Play className="h-2.5 w-2.5 fill-current" />
                          <span>Run</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Step Execution Output Details */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-800">
                      <StepResultDetails step={step} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer link to full planner if available */}
      {hasSteps && onOpenFullPlanner && (
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono">
            DAG ID: {plan?.id}
          </span>
          <button
            type="button"
            onClick={onOpenFullPlanner}
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            <span>Open Interactive DAG</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
