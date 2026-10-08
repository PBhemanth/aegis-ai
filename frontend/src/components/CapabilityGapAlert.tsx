import React from 'react';
import { AlertOctagon, Info, ArrowRight } from 'lucide-react';
import { CapabilityGapReport } from '../types';

interface CapabilityGapAlertProps {
  report: CapabilityGapReport;
  rawGoal: string;
  onDismiss?: () => void;
}

export const CapabilityGapAlert: React.FC<CapabilityGapAlertProps> = ({
  report,
  rawGoal,
  onDismiss,
}) => {
  return (
    <div
      role="alert"
      className="panel-card mb-6 border-amber-600/40 bg-amber-950/20 text-slate-200"
      aria-labelledby="cap-gap-heading"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-0.5">
          <AlertOctagon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 id="cap-gap-heading" className="text-base font-semibold text-amber-300">
              Capability Gap Detected — Transparent Limitation Reporting
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-slate-400 hover:text-slate-200"
                aria-label="Dismiss capability notice"
              >
                Dismiss
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 mt-1">
            Aegis refuses to fabricate or simulate execution for capabilities beyond its verified boundary.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-400 block mb-1">User Requested Action:</span>
              <p className="text-slate-300 italic">"{rawGoal}"</p>
            </div>

            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs">
              <span className="font-semibold text-rose-400 block mb-1">Unavailable Capabilities:</span>
              <ul className="list-disc list-inside text-rose-300 space-y-0.5">
                {report.unsupported_capabilities.map((cap, i) => (
                  <li key={i}>{cap}</li>
                ))}
              </ul>
            </div>
          </div>

          {report.explanation && (
            <div className="mt-3 p-2.5 rounded bg-amber-900/20 border border-amber-800/40 text-xs text-amber-200/90 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-semibold">Safety Boundary Rationale: </span>
                {report.explanation}
              </div>
            </div>
          )}

          {report.alternative_proposals && report.alternative_proposals.length > 0 && (
            <div className="mt-3 text-xs">
              <span className="font-semibold text-cyan-400">Supported Alternatives:</span>
              <ul className="mt-1 space-y-1">
                {report.alternative_proposals.map((alt, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-slate-300">
                    <ArrowRight className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
