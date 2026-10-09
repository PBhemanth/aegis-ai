import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Search,
  ShieldAlert,
  Terminal,
  ArrowDown,
  Fingerprint,
  Workflow,
} from 'lucide-react';
import { PlanData, RiskTier, StepDefinition, StepStatus } from '../types';

interface PlanViewerProps {
  plan: PlanData | null;
  onExecuteStep: (stepId: string) => void;
  onRequestApproval: (step: StepDefinition) => void;
  onInspectProof: (stepId: string) => void;
  executingStepId: string | null;
}

export const PlanViewer: React.FC<PlanViewerProps> = ({
  plan,
  onExecuteStep,
  onRequestApproval,
  onInspectProof,
  executingStepId,
}) => {
  if (!plan || !plan.steps || plan.steps.length === 0) {
    return (
      <section className="sci-fi-panel mb-6 text-center py-14" aria-labelledby="empty-plan-heading">
        <div className="corner-bracket corner-tl" aria-hidden="true" />
        <div className="corner-bracket corner-tr" aria-hidden="true" />
        <div className="corner-bracket corner-bl" aria-hidden="true" />
        <div className="corner-bracket corner-br" aria-hidden="true" />

        <div className="h-16 w-16 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Workflow className="h-8 w-8 text-cyan-500/70" aria-hidden="true" />
        </div>
        <h3 id="empty-plan-heading" className="text-base font-bold text-slate-300 font-mono">
          // NO ACTIVE PLAN DAG GRAPH
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          Dispatch a mission goal above. Aegis will synthesize a directed acyclic graph (DAG) with deterministic risk gates and topological ordering.
        </p>
      </section>
    );
  }

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
      case 'RECOVERING':
        return (
          <span className="badge badge-state-awaiting">
            <Clock className="h-3 w-3 animate-spin" /> RECOVERING
          </span>
        );
      default:
        return (
          <span className="badge bg-slate-900 text-slate-400 border border-slate-700">
            PROPOSED
          </span>
        );
    }
  };

  const stepsVerified = plan.steps.filter((s) => s.status === 'VERIFIED').length;
  const progressPercent = Math.round((stepsVerified / plan.steps.length) * 100);

  return (
    <section className="sci-fi-panel mb-6" aria-labelledby="plan-dag-heading">
      <div className="corner-bracket corner-tl" aria-hidden="true" />
      <div className="corner-bracket corner-tr" aria-hidden="true" />
      <div className="corner-bracket corner-bl" aria-hidden="true" />
      <div className="corner-bracket corner-br" aria-hidden="true" />

      {/* Plan Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Workflow className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
              // PLAN DAG EXECUTION GRAPH
            </span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              [{plan.id}]
            </span>
          </div>
          <h2 id="plan-dag-heading" className="text-base sm:text-lg font-black text-white tracking-tight">
            Plan DAG: {plan.goal_summary || plan.raw_goal}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Topological DAG ordering • Bounded state machine • Deterministic risk gate enforcement
          </p>
        </div>

        {/* Progress HUD Summary */}
        <div className="flex items-center gap-3 bg-slate-950/90 p-3 rounded-xl border border-slate-800 shadow-inner">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-bold text-slate-300">
                Verified Steps: {stepsVerified} / {plan.steps.length}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ({progressPercent}%)
              </span>
            </div>
            <div className="w-44 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Plan execution progress"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step Cards List / Node Graph Stream */}
      <ol className="space-y-3.5 relative" aria-label="Steps DAG list">
        {plan.steps.map((step, idx) => {
          const isCurrentExecuting = executingStepId === step.id;
          const requiresApproval =
            step.status === 'AWAITING_APPROVAL' ||
            step.risk_tier === 'TIER_2_MUTATING' ||
            step.risk_tier === 'TIER_3_DESTRUCTIVE';

          return (
            <li
              key={step.id}
              className={`p-4 rounded-xl border transition-all duration-200 relative ${
                isCurrentExecuting
                  ? 'bg-blue-950/30 border-blue-500 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/50'
                  : step.status === 'VERIFIED'
                  ? 'bg-slate-950/70 border-emerald-900/60 shadow-sm'
                  : step.status === 'AWAITING_APPROVAL'
                  ? 'bg-amber-950/30 border-amber-500 shadow-xl shadow-amber-500/20 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/80 border-slate-800/90'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Node Step Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                  {/* Glowing Node Index Circle */}
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 border font-mono shadow-inner ${
                      step.status === 'VERIFIED'
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-500/20'
                        : step.status === 'AWAITING_APPROVAL'
                        ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse shadow-amber-500/20'
                        : isCurrentExecuting
                        ? 'bg-blue-950/90 border-blue-400 text-blue-300 animate-pulse shadow-blue-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    0{step.step_order || idx + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="text-sm font-bold text-slate-100 tracking-tight">{step.title}</h4>
                      {getRiskBadge(step.risk_tier)}
                      {getStatusBadge(step.status)}
                      {requiresApproval && step.status !== 'VERIFIED' && (
                        <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/70 shadow-sm">
                          <ShieldAlert className="h-3 w-3" /> Gate Protected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                      <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                        tool: {step.tool_name}
                      </span>
                      {step.dependencies && step.dependencies.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                          <ArrowDown className="h-3 w-3 text-cyan-400" />
                          depends on:{' '}
                          <span className="text-slate-300 font-bold">
                            {step.dependencies.join(', ')}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical Actions & Proof Buttons */}
                <div className="flex items-center gap-2">
                  {step.status === 'AWAITING_APPROVAL' && (
                    <button
                      onClick={() => onRequestApproval(step)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/30 animate-pulse uppercase tracking-wider"
                      aria-label={`Review and approve action for ${step.title}`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Review & Approve</span>
                    </button>
                  )}

                  {step.status === 'VERIFIED' && (
                    <button
                      onClick={() => onInspectProof(step.id)}
                      className="px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/70 text-xs rounded-xl flex items-center gap-1.5 font-bold transition-all shadow-md shadow-emerald-500/10"
                      aria-label={`Inspect cryptographic verification proof for ${step.title}`}
                    >
                      <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Inspect Proof</span>
                    </button>
                  )}

                  {step.status !== 'VERIFIED' && step.status !== 'AWAITING_APPROVAL' && (
                    <button
                      disabled={isCurrentExecuting}
                      onClick={() => onExecuteStep(step.id)}
                      className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 rounded-xl font-bold font-mono"
                      aria-label={`Execute single step ${step.title}`}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Run Step</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Execution Details Receipt */}
              {step.execution_result_json && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1.5 font-mono text-[11px]">
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-bold text-slate-300">// EXECUTION RECEIPT OUTPUT:</span>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-28 border border-slate-800 shadow-inner">
                    {step.execution_result_json}
                  </pre>
                </div>
              )}

              {/* Error Message if Failed */}
              {step.error_message && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-600/70 text-xs text-rose-200 flex items-start gap-2.5 shadow-md">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-mono">{step.error_message}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
