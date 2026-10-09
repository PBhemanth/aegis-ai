import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  GraduationCap,
  Search,
  FileText,
  Calendar,
  Upload,
  Eye,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ExecutionMode } from '../types';

interface GoalInputProps {
  onPlanAndExecute: (goal: string, mode: ExecutionMode) => void;
  isLoading: boolean;
}

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

  const setPresetGoal = (presetText: string) => {
    setGoal(presetText);
  };

  return (
    <section className="w-full" aria-label="Agent Goal Command Section">
      {/* Outer Card Container */}
      <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.6)]">
        <form onSubmit={handleSubmit}>
          {/* Neon Bordered Command Input Box */}
          <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-r from-cyan-400/80 via-blue-500/80 to-blue-600/80 shadow-[0_0_18px_rgba(56,189,248,0.18)] transition-all focus-within:shadow-[0_0_28px_rgba(0,242,254,0.35)]">
            <div className="bg-[#070c18] rounded-2xl p-3 flex items-center gap-3">
              {/* Glowing Sparkle Icon */}
              <div className="shrink-0 flex items-center justify-center pl-1 text-cyan-400">
                <Sparkles className="w-5 h-5 filter drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
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

              {/* Send / Execute Button */}
              <button
                type="submit"
                disabled={isLoading || !goal.trim()}
                className="shrink-0 h-11 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Plan & Execute Goal"
                title="Plan & Execute Goal (Ctrl+Enter)"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span className="hidden sm:inline">{isLoading ? 'Working' : 'Execute'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Action Chips directly below prompt */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* 1. Study Plan */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Create an intensive 7-day study plan for upcoming machine learning exams with daily milestones, practice tasks, and review sessions.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group"
          >
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Study Plan</span>
          </button>

          {/* 2. Research */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Research</span>
          </button>

          {/* 3. Summarize */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Conduct research on autonomous AI agent execution architectures, synthesize a structured technical report, and save the report to Google Drive in a dedicated project folder.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Summarize</span>
          </button>

          {/* 4. Create Plan */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Inspect my Google Calendar availability for next week, detect open slots, and propose 2-hour focused revision sessions.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Create Plan</span>
          </button>

          {/* 5. Upload File */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Upload verified technical research report to Google Drive in the CampusPilot folder.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1629] border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-medium transition-all group"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Upload File</span>
          </button>

          {/* 6. GNN Fraud Research Preset (explicitly tests & featured) */}
          <button
            type="button"
            onClick={() =>
              setPresetGoal(
                'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1833] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-medium transition-all group shadow-sm shadow-cyan-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>GNN Fraud Research & Cited Report</span>
          </button>
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
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'plan_only'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Plan Only</span>
            </button>

            {/* Assisted */}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'assisted'}
              onClick={() => setMode('assisted')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'assisted'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Assisted</span>
            </button>

            {/* Autonomous */}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'autonomous'}
              aria-label="Autonomous"
              onClick={() => setMode('autonomous')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'autonomous'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Autonomous</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
