import React, { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Hash,
  Eye,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
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
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <section className="sci-fi-panel mb-6 flex flex-col justify-between" aria-labelledby="audit-panel-heading">
      <div className="corner-bracket corner-tl" aria-hidden="true" />
      <div className="corner-bracket corner-tr" aria-hidden="true" />
      <div className="corner-bracket corner-bl" aria-hidden="true" />
      <div className="corner-bracket corner-br" aria-hidden="true" />

      <div>
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                // CRYPTOGRAPHIC IMMUTABLE AUDIT LEDGER
              </span>
            </div>
            <h3 id="audit-panel-heading" className="text-sm font-black text-white font-mono">
              SHA-256 Tamper-Evident Hash-Chained Console
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshEvents}
              className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg font-mono"
              title="Refresh Ledger Events"
              aria-label="Refresh audit ledger events"
            >
              <RefreshCw className="h-3 w-3 text-slate-400" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => onVerifyIntegrity()}
              disabled={!planId || events.length === 0 || isVerifying}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 font-mono font-bold shadow-lg shadow-emerald-500/20"
              aria-label="Cryptographically verify audit chain integrity"
            >
              {isVerifying ? (
                <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-slate-950" />
              )}
              <span>Verify Integrity</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
              aria-label={isExpanded ? 'Collapse audit ledger' : 'Expand audit ledger'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Cryptographic Chain Flow Ribbon */}
        {events.length > 0 && (
          <div className="mb-3.5 p-2 rounded-lg bg-slate-950/90 border border-slate-800/90 flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-bold border border-slate-800 shrink-0">
              GENESIS
            </span>
            <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
            {events.slice(0, 3).map((e, idx) => (
              <React.Fragment key={e.id}>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0 truncate max-w-[100px]" title={e.proof_hash}>
                  {e.proof_hash ? e.proof_hash.slice(0, 8) : `BLOCK_${idx}`}
                </span>
                <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
              </React.Fragment>
            ))}
            {events.length > 3 && (
              <>
                <span className="text-slate-500 shrink-0">+{events.length - 3} blocks</span>
                <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
              </>
            )}
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold shrink-0 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> SEALED
            </span>
          </div>
        )}

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border mb-3 flex items-start gap-3 text-xs shadow-md font-mono ${
              verificationResult.is_valid
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-emerald-950/30'
                : 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-rose-950/30'
            }`}
          >
            {verificationResult.is_valid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-sans">
              <div className="font-bold flex flex-wrap items-center gap-2">
                <span className="text-xs">
                  {verificationResult.is_valid
                    ? 'Cryptographic Chain Integrity Verified Valid'
                    : 'Hash Chain Discrepancy / Tampering Detected!'}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  {verificationResult.total_events} blocks chained
                </span>
              </div>
              <p className="mt-1 text-slate-300 leading-relaxed text-xs">{verificationResult.details}</p>
              {verificationResult.broken_event_id && (
                <div className="mt-1 font-mono text-rose-300 text-[11px]">
                  Discrepancy at block: {verificationResult.broken_event_id}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Events Table */}
        {isExpanded && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-mono leading-relaxed">
                [LEDGER EMPTY] No audit blocks committed. Each state transition & verification generates a SHA-256 hash-chained block.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-slate-950 z-10">
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-2.5">Block ID</th>
                      <th className="py-2 px-2.5">Event Type</th>
                      <th className="py-2 px-2.5">Actor</th>
                      <th className="py-2 px-2.5">Prev Hash (H<sub>i-1</sub>)</th>
                      <th className="py-2 px-2.5">Proof Hash (H<sub>i</sub>)</th>
                      <th className="py-2 px-2.5 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-2.5 text-slate-300 font-bold">{evt.id}</td>
                        <td className="py-2 px-2.5 font-sans">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-cyan-300 border border-slate-800 font-mono">
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 font-sans">{evt.actor}</td>
                        <td
                          className="py-2 px-2.5 text-slate-500 max-w-[110px] truncate"
                          title={evt.prev_proof_hash || 'GENESIS'}
                        >
                          {evt.prev_proof_hash ? `${evt.prev_proof_hash.slice(0, 10)}...` : 'GENESIS'}
                        </td>
                        <td
                          className="py-2 px-2.5 text-emerald-400 font-bold max-w-[120px] truncate"
                          title={evt.proof_hash}
                        >
                          {evt.proof_hash ? `${evt.proof_hash.slice(0, 12)}...` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-sans">
                          <button
                            onClick={() => setSelectedPayload(evt.payload)}
                            className="text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-slate-800 text-[10px] font-mono transition-colors font-semibold border border-cyan-800/40"
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
          </>
        )}
      </div>

      {/* Sensitive Redaction Notice */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2 font-sans">
        <Lock className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Secret Scrubbing:</strong> All OAuth tokens and authorization headers are redacted before canonical SHA-256 payload hashing.
        </span>
      </div>

      {/* Payload Modal */}
      {selectedPayload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 id="payload-modal-title" className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                <Hash className="h-4 w-4 text-cyan-400" />
                <span>CANONICAL SCRUBBED PAYLOAD BLOCK</span>
              </h4>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
                aria-label="Close payload preview"
              >
                Close
              </button>
            </div>
            <pre className="bg-slate-950 p-3.5 rounded-xl text-xs font-mono text-cyan-300/90 overflow-x-auto max-h-72 border border-slate-800 shadow-inner">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
