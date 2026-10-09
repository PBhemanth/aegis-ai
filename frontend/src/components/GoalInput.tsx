import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  GraduationCap,
  Calendar,
  FileText,
  Eye,
  ShieldCheck,
  Zap,
  Lock,
} from 'lucide-react';
import { ExecutionMode, GoogleAuthStatus } from '../types';

interface GoalInputProps {
  onPlanAndExecute: (goal: string, mode: ExecutionMode) => void;
  isLoading: boolean;
  googleStatus?: GoogleAuthStatus | null;
}

export const GoalInput: React.FC<GoalInputProps> = ({
  onPlanAndExecute,
  isLoading,
  googleStatus,
}) => {
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('autonomous');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) return;
    onPlanAndExecute(goal.trim(), mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const setPresetGoal = (presetText: string) => {
    setGoal(presetText);
  };

  const isGoogleConnected = Boolean(googleStatus?.authenticated);

  const getSubmitButtonLabel = () => {
    if (isLoading) return 'Working...';
    if (mode === 'plan_only') return 'Generate Plan';
    if (mode === 'assisted') return 'Start Assisted';
    return 'Run Mission';
  };

  return (
    <section className="w-full" aria-label="Agent Goal Command Section">
      {/* Outer Card Container */}
      <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-800/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.6)]">
        <form onSubmit={handleSubmit}>
          {/* Neon Bordered Command Input Box */}
          <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-r from-cyan-400/80 via-blue-500/80 to-blue-600/80 shadow-[0_0_18px_rgba(56,189,248,0.18)] transition-all focus-within:shadow-[0_0_24px_rgba(0,242,254,0.30)]">
            <div className="bg-[#070c18] rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Sparkle Icon */}
                <div className="shrink-0 flex items-center justify-center pl-1 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>

                {/* Textarea */}
                <label htmlFor="agent-goal-input" className="sr-only">
                  Describe an arbitrary natural-language goal
                </label>
                <textarea
                  id="agent-goal-input"
                  rows={2}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe an arbitrary natural-language goal (e.g., 'Research 3 papers on GNN fraud detection and compile a cited report')..."
                  className="flex-1 bg-transparent border-0 text-sm text-white placeholder-slate-400 focus:outline-none resize-none font-sans leading-relaxed py-1 min-w-0"
                  required
                  aria-required="true"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !goal.trim()}
                className="shrink-0 h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Plan & Execute Goal"
                title={`${getSubmitButtonLabel()} (Ctrl+Enter)`}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === 'plan_only' ? (
                  <Eye className="w-4 h-4 text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span>{getSubmitButtonLabel()}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Action Chips directly below prompt */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Ready-to-Run Demo Workflows
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Featured GNN Fraud Research Preset (Primary, tested, offline-verified) */}
            <button
              type="button"
              onClick={() =>
                setPresetGoal(
                  'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.'
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1833] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-semibold transition-all group shadow-sm shadow-cyan-500/10 cursor-pointer"
              title="Loads verified arXiv academic query and structured synthesis goal"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>GNN Fraud Research & Cited Report</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800">
                Live arXiv
              </span>
            </button>

            {/* 2. Machine Learning Study Plan */}
            <button
              type="button"
              onClick={() =>
                setPresetGoal(
                  'Create an intensive 7-day study plan for upcoming machine learning exams with daily milestones, practice tasks, and review sessions.'
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group cursor-pointer"
              title="Loads 7-day structured milestone study planner"
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>ML Study Plan</span>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded border border-slate-800">
                Offline
              </span>
            </button>

            {/* 3. Safety Gate Demo Preset */}
            <button
              type="button"
              onClick={() =>
                setPresetGoal('Delete the outdated draft from Google Drive')
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-600/50 hover:border-amber-400 text-amber-300 hover:text-amber-100 text-xs font-medium transition-all group cursor-pointer"
              title="Demonstrates Tier 3 destructive safety gate & approval challenge"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Safety Gate Demo (Tier 3)</span>
            </button>

            {/* Google-dependent presets: Clearly labeled or badged if OAuth is not active */}
            {isGoogleConnected ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPresetGoal(
                      'Inspect my Google Calendar availability for next week, detect open slots, and propose 2-hour focused revision sessions.'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Calendar Review</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPresetGoal(
                      'Conduct research on autonomous AI agent execution architectures, synthesize a structured technical report, and save the report to Google Drive in a dedicated project folder.'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Drive Synthesis</span>
                </button>
              </>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-500 font-mono"
                title="Google Drive and Calendar workflows require connecting an account in the Calendar tab"
              >
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Drive & Calendar</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-900/50">
                  OAuth Required
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Mode Selector Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Mode:
          </span>

          <div
            className="inline-flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80"
            role="radiogroup"
            aria-label="Execution Mode"
          >
            {/* Plan Only */}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'plan_only'}
              onClick={() => setMode('plan_only')}
              title="Plan Only: Synthesizes execution DAG for operator review without executing steps"
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'plan_only'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Plan Only</span>
              <span className="text-[10px] opacity-75 font-mono">(Review)</span>
            </button>

            {/* Assisted */}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'assisted'}
              onClick={() => setMode('assisted')}
              title="Assisted: Runs step-by-step with operator pause after each action"
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'assisted'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Assisted</span>
              <span className="text-[10px] opacity-75 font-mono">(Step-by-Step)</span>
            </button>

            {/* Autonomous */}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'autonomous'}
              aria-label="Autonomous"
              onClick={() => setMode('autonomous')}
              title="Autonomous: Runs non-gated steps end-to-end; halts at permission gates"
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'autonomous'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Autonomous</span>
              <span className="text-[10px] opacity-75 font-mono">(Continuous)</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
