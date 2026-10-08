import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, Key } from 'lucide-react';
import { StepDefinition } from '../types';

interface ApprovalModalProps {
  step: StepDefinition | null;
  challenge: {
    approval_nonce: string;
    action_fingerprint: string;
    expires_at: number;
    risk_evaluation: {
      risk_tier: string;
      requires_approval: boolean;
      requires_typed_phrase?: string | null;
      rationale: string;
    };
  } | null;
  onApprove: (typedConfirmation?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  step,
  challenge,
  onApprove,
  onReject,
  onClose,
  isSubmitting,
}) => {
  if (!step || !challenge) return null;

  const [typedPhrase, setTypedPhrase] = useState('');
  const [rejectReason, setRejectReason] = useState('Operator denied authorization');

  const requiredPhrase = challenge.risk_evaluation.requires_typed_phrase || null;
  const isTier3 = challenge.risk_evaluation.risk_tier === 'TIER_3_DESTRUCTIVE';
  const phraseMatches = !requiredPhrase || typedPhrase.trim().toUpperCase() === requiredPhrase.toUpperCase();

  const handleApprove = () => {
    if (!phraseMatches || isSubmitting) return;
    onApprove(requiredPhrase ? typedPhrase.trim().toUpperCase() : undefined);
  };

  const handleReject = () => {
    if (isSubmitting) return;
    onReject(rejectReason);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 border border-amber-500/40">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="badge badge-state-awaiting text-[10px]">
                PERMISSION GATE • ACTION HALTED
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded"
                aria-label="Close approval modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 id="approval-modal-title" className="text-lg font-bold text-white mt-1">
              Human Authorization Required
            </h3>
            <p className="text-xs text-amber-300 font-medium">
              Consequential or Destructive Operation Detected
            </p>
          </div>
        </div>

        {/* Action Details */}
        <div className="space-y-3 mb-5">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Target Step:</span>
              <span className="text-slate-100 font-semibold">{step.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Registered Tool:</span>
              <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {step.tool_name}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Deterministic Risk Tier:</span>
              <span className={isTier3 ? 'badge badge-tier-3' : 'badge badge-tier-2'}>
                {challenge.risk_evaluation.risk_tier}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block mb-1">Safety Rationale:</span>
              <p className="text-amber-200/90 text-xs italic">
                {challenge.risk_evaluation.rationale}
              </p>
            </div>
          </div>

          {/* Cryptographic Challenge Info */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Key className="h-3 w-3" />
              <span className="font-semibold">Cryptographic Fingerprint Binding:</span>
            </div>
            <div className="truncate">
              nonce: <span className="text-slate-300">{challenge.approval_nonce.slice(0, 32)}...</span>
            </div>
            <div className="truncate">
              fingerprint: <span className="text-slate-300">{challenge.action_fingerprint.slice(0, 32)}...</span>
            </div>
          </div>

          {/* Tier 3 Confirmation Phrase Input */}
          {requiredPhrase && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/50 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-300 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>Tier 3 Strict Destruction Guard</span>
              </div>
              <p className="text-xs text-rose-200">
                To confirm permanent modification/deletion, please type{' '}
                <strong className="underline text-white font-mono bg-rose-950 px-1.5 py-0.5 rounded border border-rose-700">
                  {requiredPhrase}
                </strong>{' '}
                below:
              </p>
              <input
                type="text"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder={`Type "${requiredPhrase}" to authorize`}
                className="w-full bg-slate-950 border border-rose-500/60 rounded-lg p-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-400"
                aria-required="true"
              />
            </div>
          )}

          {/* Optional Rejection Reason */}
          <div className="pt-1">
            <label htmlFor="rejection-reason-input" className="text-[11px] text-slate-400 block mb-1">
              Rejection rationale (if denying):
            </label>
            <input
              id="rejection-reason-input"
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="btn-secondary text-rose-400 hover:text-rose-300 flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject Action</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={!phraseMatches || isSubmitting}
            className="btn-primary bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 text-xs px-4 py-2"
          >
            {isSubmitting ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>Authorize & Execute Step</span>
          </button>
        </div>
      </div>
    </div>
  );
};
