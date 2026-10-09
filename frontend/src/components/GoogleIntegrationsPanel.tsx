import React from 'react';
import {
  KeyRound,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  FileCheck2,
  Clock3,
} from 'lucide-react';
import { GoogleAuthStatus } from '../types';

interface GoogleIntegrationsPanelProps {
  status: GoogleAuthStatus | null;
  onConnect: () => void;
  onLogout: () => void;
  isLoading: boolean;
}

export const GoogleIntegrationsPanel: React.FC<GoogleIntegrationsPanelProps> = ({
  status,
  onConnect,
  onLogout,
  isLoading,
}) => {
  const isAuth = !!status?.authenticated;
  const isConfigured = !!status?.configured;

  return (
    <section className="sci-fi-panel mb-6" aria-labelledby="google-panel-heading">
      <div className="corner-bracket corner-tl" aria-hidden="true" />
      <div className="corner-bracket corner-tr" aria-hidden="true" />
      <div className="corner-bracket corner-bl" aria-hidden="true" />
      <div className="corner-bracket corner-br" aria-hidden="true" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
              // WORKSPACE SECURITY BRIDGE
            </span>
          </div>
          <h3 id="google-panel-heading" className="text-sm font-black text-white font-mono">
            Google Workspace OAuth 2.0 PKCE Bridge
          </h3>
        </div>

        <div>
          {isAuth ? (
            <button
              onClick={onLogout}
              disabled={isLoading}
              className="btn-secondary text-xs px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 border-rose-800/60 font-mono"
              aria-label="Disconnect Google Account"
            >
              Disconnect Session
            </button>
          ) : isConfigured ? (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="btn-primary text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-mono font-bold shadow-lg shadow-cyan-500/20"
              aria-label="Connect Google Account"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Connect Google Account</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 italic bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
              Credentials unconfigured in .env
            </span>
          )}
        </div>
      </div>

      {/* Compact Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* OAuth Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
                OAuth 2.0 PKCE
              </span>
              {isAuth ? (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="h-2.5 w-2.5" /> ACTIVE
                </span>
              ) : isConfigured ? (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1 font-mono">
                  <AlertTriangle className="h-2.5 w-2.5" /> AWAITING LOGIN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                  NOT CONFIGURED
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {isAuth
                ? `Authorized for user: ${status?.user_id || 'operator'}`
                : isConfigured
                ? 'Ready for browser authorization code grant.'
                : 'Google connection not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env).'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono truncate">
            {status?.scopes_granted && status.scopes_granted.length > 0 ? (
              <span className="text-cyan-400">Scopes: {status.scopes_granted.join(', ')}</span>
            ) : (
              <span>Scopes: Drive (create/search), Calendar (events)</span>
            )}
          </div>
        </div>

        {/* Drive Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                Google Drive v3
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                  isAuth
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isAuth ? 'LIVE ACTIVE' : 'AWAITING AUTH'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Folder creation, markdown document upload with MD5 verification, and permission-gated file deletion.
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <FileCheck2 className="h-3 w-3 text-emerald-400" />
            <span>Tools: google_drive_folder_manage, upload_file</span>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Google Calendar v3
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                  isAuth
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isAuth ? 'LIVE ACTIVE' : 'AWAITING AUTH'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Inspects free/busy slots across target days and creates calendar events with attendee permission-gating.
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <Clock3 className="h-3 w-3 text-blue-400" />
            <span>Tools: check_slots, create_event</span>
          </div>
        </div>
      </div>

      {/* Zero-Mocking Disclaimer */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2 shadow-inner">
        <Shield className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">Zero Mocking Policy:</strong> CampusPilot interfaces with real Google OAuth 2.0 endpoints. When credentials are not configured, services declare their unconfigured status with complete transparency.
        </span>
      </div>
    </section>
  );
};
