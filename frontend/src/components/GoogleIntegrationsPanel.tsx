import React from 'react';
import {
  KeyRound,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
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
    <section className="panel-card mb-6" aria-labelledby="google-panel-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h3 id="google-panel-heading" className="text-sm font-semibold text-white">
            Google Workspace Services Integration
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Real OAuth 2.0 PKCE Bridge</span>
        </div>

        <div>
          {isAuth ? (
            <button
              onClick={onLogout}
              disabled={isLoading}
              className="btn-secondary text-xs px-2.5 py-1 text-rose-400 hover:text-rose-300"
              aria-label="Disconnect Google Account"
            >
              Disconnect Account
            </button>
          ) : isConfigured ? (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5"
              aria-label="Connect Google Account"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Connect Google Account</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 italic bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Credentials required in .env
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Google OAuth Status */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">OAuth 2.0 PKCE Session</span>
              {isAuth ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-slate-400 text-[11px] mt-1">
              {isAuth
                ? `Authorized for user: ${status?.user_id || 'operator'}`
                : isConfigured
                ? 'Ready for consent flow authorization'
                : 'Google connection not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env)'}
            </p>
          </div>
          {status?.scopes_granted && status.scopes_granted.length > 0 && (
            <div className="mt-2 text-[10px] text-cyan-400 font-mono truncate">
              Scopes: {status.scopes_granted.join(', ')}
            </div>
          )}
        </div>

        {/* Google Drive v3 Tool Status */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-cyan-400" /> Google Drive v3
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  isAuth
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isAuth ? 'LIVE ACTIVE' : 'AWAITING AUTH'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-1">
              Supports folder creation, document upload with MD5 checksum verification, and permission-gated file deletion.
            </p>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Tools: <code>google_drive_folder_manage</code>, <code>google_drive_upload_file</code>
          </div>
        </div>

        {/* Google Calendar v3 Tool Status */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-400" /> Google Calendar v3
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  isAuth
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isAuth ? 'LIVE ACTIVE' : 'AWAITING AUTH'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-1">
              Inspects free/busy slots and creates revision events with attendee permission-gating.
            </p>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Tools: <code>google_calendar_check_slots</code>, <code>google_calendar_create_event</code>
          </div>
        </div>
      </div>

      <div className="mt-3 p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
        <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Zero Mocking Policy:</strong> CampusPilot interfaces directly with real Google OAuth 2.0 endpoints. If Google credentials are not set in the server environment, integrations honestly declare their unconfigured state rather than fabricating fake success responses.
        </span>
      </div>
    </section>
  );
};
