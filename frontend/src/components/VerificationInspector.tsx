import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck, X, Clock, Layers } from 'lucide-react';
import { VerificationProof } from '../types';

interface VerificationInspectorProps {
  proof: VerificationProof | null;
  stepTitle?: string;
  onClose: () => void;
}

export const VerificationInspector: React.FC<VerificationInspectorProps> = ({
  proof,
  stepTitle,
  onClose,
}) => {
  if (!proof) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl shadow-emerald-500/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 id="proof-modal-title" className="text-base font-bold text-white">
                Independent Verification Proof
              </h3>
              <p className="text-xs text-slate-400">
                {stepTitle ? `Step: ${stepTitle}` : `Step ID: ${proof.step_id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label="Close verification inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1">
          {/* Verifier Badge & Latency */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Verifier Engine:</span>
              <span className="font-mono text-cyan-400 font-semibold">{proof.verifier_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{proof.latency_ms} ms</span>
              </div>
              <span
                className={`badge ${
                  proof.status === 'PASSED' ? 'badge-state-verified' : 'badge-state-failed'
                }`}
              >
                {proof.status === 'PASSED' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> VERIFIED PASSED
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" /> DISCREPANCY DETECTED
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Assertions Checklist */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Independent Assertions Checklist:</span>
            </h4>
            <ul className="space-y-2">
              {proof.assertions.map((assertion, idx) => (
                <li
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    assertion.passed
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                  }`}
                >
                  {assertion.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-mono font-medium text-slate-100">{assertion.assertion}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
                      <span>
                        expected: <span className="font-mono text-slate-300">{JSON.stringify(assertion.expected)}</span>
                      </span>
                      <span>
                        actual: <span className="font-mono text-slate-300">{JSON.stringify(assertion.actual)}</span>
                      </span>
                    </div>
                    {assertion.details && (
                      <div className="text-[11px] text-rose-300 mt-1 italic">{assertion.details}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* External State Delta */}
          {proof.external_state_delta && Object.keys(proof.external_state_delta).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Verified External State Delta:
              </h4>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(proof.external_state_delta, null, 2)}
              </pre>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-800/30 text-[11px] text-blue-300">
            <strong>Architecture Invariant:</strong> Execution receipts never declare terminal success alone. A step only achieves terminal <code>VERIFIED</code> status once the Verifier Engine confirms external state delta.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-right">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-1.5">
            Dismiss Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
