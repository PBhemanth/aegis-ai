import React, { useState } from 'react';
import { Sparkles, Sliders, Play } from 'lucide-react';
import { ExecutionMode } from '../types';

interface GoalInputProps {
  onPlanAndExecute: (goal: string, mode: ExecutionMode) => void;
  isLoading: boolean;
}

const DEMO_GOALS = [
  {
    title: 'GNN Fraud Research & Cited Report',
    goal: 'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.',
  },
  {
    title: 'Study Plan Generation',
    goal: 'Create an intensive 7-day study plan for upcoming machine learning exams with daily milestones, practice tasks, and review sessions.',
  },
  {
    title: 'Research & Drive Document Export',
    goal: 'Conduct research on autonomous AI agent execution architectures, synthesize a structured technical report, and save the report to Google Drive in a dedicated project folder.',
  },
  {
    title: 'Inspect Calendar & Schedule Study Sessions',
    goal: 'Inspect my Google Calendar availability for next week, detect open slots, and propose 2-hour focused revision sessions.',
  },
];

export const GoalInput: React.FC<GoalInputProps> = ({ onPlanAndExecute, isLoading }) => {
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

  return (
    <section className="panel-card mb-6" aria-labelledby="goal-section-heading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          <h2 id="goal-section-heading" className="text-base font-semibold text-white">
            Autonomous Agent Goal Dispatcher
          </h2>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800" role="radiogroup" aria-label="Execution Mode">
          <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
            <Sliders className="h-3 w-3" aria-hidden="true" /> Mode:
          </span>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'plan_only'}
            onClick={() => setMode('plan_only')}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'plan_only'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Plan Only
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'assisted'}
            onClick={() => setMode('assisted')}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'assisted'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assisted (Prompt All)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'autonomous'}
            onClick={() => setMode('autonomous')}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'autonomous'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Autonomous (Safe Auto)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="agent-goal-input" className="sr-only">
            Describe your high-level goal in natural language
          </label>
          <textarea
            id="agent-goal-input"
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe an arbitrary natural-language goal (e.g., 'Research 3 papers on GNN fraud detection and compile a cited report')..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors resize-y min-h-[80px]"
            required
            aria-required="true"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]">Ctrl + Enter</kbd> to dispatch. Aegis dynamically decomposes tasks, evaluates risks, and verifies outcomes.
          </p>

          <button
            type="submit"
            disabled={isLoading || !goal.trim()}
            className="btn-primary flex items-center gap-2 text-sm"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
                <span>Decomposing & Executing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Plan & Execute Goal</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Selectable Demo Workflows */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-xs font-medium text-slate-400 block mb-2">
          Demonstration Scenarios (Pre-configured multi-step workflows):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {DEMO_GOALS.map((demo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setGoal(demo.goal)}
              className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-700/60 text-xs text-slate-300 transition-all group flex flex-col justify-between"
            >
              <div className="font-semibold text-cyan-400 group-hover:text-cyan-300 mb-1">
                {demo.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-2">
                {demo.goal}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
