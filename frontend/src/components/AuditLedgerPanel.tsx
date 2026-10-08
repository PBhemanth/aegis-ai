import React, { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Hash,
  Eye,
} from 'lucide-react';
import { AuditEventItem, AuditVerificationResult } from '../types';

interface AuditLedgerPanelProps {
  events: AuditEventItem[];
  planId: string | null;
  onVerifyIntegrity: () => Promise<AuditVerificationResult | void>;
  verificationResult: AuditVerificationResult | null;
  isVerifying: boolean;
  onRefreshEvents: () => void;
}

export const AuditLedgerPanel: React.FC<AuditLedgerPanelProps> = ({
  events,
  planId,
  onVerifyIntegrity,
  verificationResult,
  isVerifying,
  onRefreshEvents,
}) => {
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null);

  return (
    <section className="panel-card mb-6" aria-labelledby="audit-panel-heading">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h3 id="audit-panel-heading" className="text-sm font-semibold text-white">
            Tamper-Evident Cryptographic Audit Ledger
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            SHA-256 Block-Chained Immutable Log
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshEvents}
            className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1"
            title="Refresh Ledger Events"
            aria-label="Refresh audit ledger events"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onVerifyIntegrity()}
            disabled={!planId || events.length === 0 || isVerifying}
            className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600"
            aria-label="Cryptographically verify audit chain integrity"
          >
            {isVerifying ? (
              <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>Verify Integrity</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          role="status"
          className={`p-3 rounded-xl border mb-3 flex items-start gap-2.5 text-xs ${
            verificationResult.is_valid
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
          }`}
        >
          {verificationResult.is_valid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold flex items-center gap-2">
              <span>
                {verificationResult.is_valid
                  ? 'Cryptographic Chain Integrity Verified Valid'
                  : 'Hash Chain Discrepancy / Tampering Detected!'}
              </span>
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                {verificationResult.total_events} blocks chained
              </span>
            </div>
            <p className="mt-0.5 text-slate-300">{verificationResult.details}</p>
            {verificationResult.broken_event_id && (
              <div className="mt-1 font-mono text-rose-300">
                Discrepancy at block: {verificationResult.broken_event_id}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No audit blocks recorded for current plan yet. Each plan step, risk evaluation, and verification creates an immutable SHA-256 chained entry.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2 px-2.5">Event ID</th>
                <th className="py-2 px-2.5">Type</th>
                <th className="py-2 px-2.5">Actor</th>
                <th className="py-2 px-2.5">Previous Hash</th>
                <th className="py-2 px-2.5">Proof Hash (SHA-256)</th>
                <th className="py-2 px-2.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-2.5 text-slate-300">{evt.id}</td>
                  <td className="py-2 px-2.5 font-sans">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                      {evt.event_type}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-slate-400 font-sans">{evt.actor}</td>
                  <td className="py-2 px-2.5 text-slate-500 max-w-[120px] truncate" title={evt.prev_proof_hash || 'GENESIS'}>
                    {evt.prev_proof_hash ? `${evt.prev_proof_hash.slice(0, 10)}...` : 'GENESIS'}
                  </td>
                  <td className="py-2 px-2.5 text-emerald-400 max-w-[130px] truncate" title={evt.proof_hash}>
                    {evt.proof_hash ? `${evt.proof_hash.slice(0, 12)}...` : '-'}
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    <button
                      onClick={() => setSelectedPayload(evt.payload)}
                      className="text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px]"
                      aria-label={`View payload for event ${evt.id}`}
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payload Modal */}
      {selectedPayload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h4 id="payload-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-cyan-400" />
                <span>Canonical Scrubbed Payload Block</span>
              </h4>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-xs text-slate-400 hover:text-white"
                aria-label="Close payload preview"
              >
                Close
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-72 border border-slate-800">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <p className="text-[11px] text-slate-500 mt-2 italic">
              Notice: All sensitive access tokens, refresh tokens, and credentials are authenticated and redacted before inclusion in cryptographic block material.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
