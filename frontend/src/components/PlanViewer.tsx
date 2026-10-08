import React from 'react';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Search,
  ShieldAlert,
  Terminal,
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
      <section className="panel-card mb-6 text-center py-12" aria-labelledby="empty-plan-heading">
        <GitCommit className="h-10 w-10 text-slate-600 mx-auto mb-3" aria-hidden="true" />
        <h3 id="empty-plan-heading" className="text-base font-semibold text-slate-400">
          No Active Plan DAG
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Submit an arbitrary natural language goal above. Aegis will synthesize a typed, dependency-ordered Plan DAG with deterministic safety tiers.
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
          <span className="badge bg-slate-800 text-slate-400 border border-slate-700">
            PROPOSED
          </span>
        );
    }
  };

  const stepsVerified = plan.steps.filter((s) => s.status === 'VERIFIED').length;
  const progressPercent = Math.round((stepsVerified / plan.steps.length) * 100);

  return (
    <section className="panel-card mb-6" aria-labelledby="plan-dag-heading">
      {/* Plan Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2 id="plan-dag-heading" className="text-base font-semibold text-white">
              Plan DAG: {plan.goal_summary || plan.raw_goal}
            </h2>
            <span className="text-xs font-mono text-slate-500">[{plan.id}]</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential topological execution order • Deterministic state machine enforcement
          </p>
        </div>

        {/* Progress Summary */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">
              Verified Steps: {stepsVerified} / {plan.steps.length} ({progressPercent}%)
            </span>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
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

      {/* Step Cards List */}
      <ol className="space-y-3" aria-label="Steps DAG list">
        {plan.steps.map((step, idx) => {
          const isCurrentExecuting = executingStepId === step.id;
          const requiresApproval =
            step.status === 'AWAITING_APPROVAL' ||
            step.risk_tier === 'TIER_2_MUTATING' ||
            step.risk_tier === 'TIER_3_DESTRUCTIVE';

          return (
            <li
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrentExecuting
                  ? 'bg-blue-950/20 border-blue-500/80 shadow-md shadow-blue-500/10'
                  : step.status === 'VERIFIED'
                  ? 'bg-slate-900/60 border-slate-800/80'
                  : step.status === 'AWAITING_APPROVAL'
                  ? 'bg-amber-950/20 border-amber-600/70'
                  : 'bg-slate-950/70 border-slate-800/70'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                {/* Step Metadata */}
                <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                  <span className="h-6 w-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {step.step_order || idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-100">{step.title}</h4>
                      {getRiskBadge(step.risk_tier)}
                      {getStatusBadge(step.status)}
                      {requiresApproval && step.status !== 'VERIFIED' && (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/60">
                          <ShieldAlert className="h-3 w-3" /> Gate Protected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        tool: {step.tool_name}
                      </span>
                      {step.dependencies && step.dependencies.length > 0 && (
                        <span>
                          depends on: <span className="text-slate-300 font-mono">{step.dependencies.join(', ')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Proof */}
                <div className="flex items-center gap-2">
                  {step.status === 'AWAITING_APPROVAL' && (
                    <button
                      onClick={() => onRequestApproval(step)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-amber-500/20 animate-pulse"
                      aria-label={`Review and approve action for ${step.title}`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Review & Approve</span>
                    </button>
                  )}

                  {step.status === 'VERIFIED' && (
                    <button
                      onClick={() => onInspectProof(step.id)}
                      className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 text-xs rounded-lg flex items-center gap-1 font-medium transition-colors"
                      aria-label={`Inspect cryptographic verification proof for ${step.title}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Inspect Proof</span>
                    </button>
                  )}

                  {step.status !== 'VERIFIED' && step.status !== 'AWAITING_APPROVAL' && (
                    <button
                      disabled={isCurrentExecuting}
                      onClick={() => onExecuteStep(step.id)}
                      className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1"
                      aria-label={`Execute single step ${step.title}`}
                    >
                      <Play className="h-3 w-3" />
                      <span>Run Step</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Execution Details Preview */}
              {step.execution_result_json && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Terminal className="h-3 w-3 text-cyan-400" />
                    <span className="font-semibold text-slate-300">Execution Receipt Output:</span>
                  </div>
                  <pre className="bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-300 overflow-x-auto max-h-24 border border-slate-800/60">
                    {step.execution_result_json}
                  </pre>
                </div>
              )}

              {/* Error Message if Failed */}
              {step.error_message && (
                <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{step.error_message}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
