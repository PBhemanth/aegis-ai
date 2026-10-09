import React from 'react';
import {
  ShieldCheck,
  Terminal,
  Network,
  Activity,
  FileKey,
  Cloud,
} from 'lucide-react';

interface NavRailProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  backendOnline: boolean;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeSection,
  onSelectSection,
  backendOnline,
}) => {
  const navItems = [
    { id: 'dispatcher', label: 'Mission Dispatcher', icon: Terminal },
    { id: 'plan', label: 'Plan DAG Graph', icon: Network },
    { id: 'telemetry', label: 'Live Telemetry HUD', icon: Activity },
    { id: 'audit', label: 'Cryptographic Ledger', icon: FileKey },
    { id: 'google', label: 'Google Services', icon: Cloud },
  ];

  return (
    <aside
      className="command-nav-rail hidden md:flex"
      aria-label="Command Center Navigation Rail"
    >
      {/* Top Aegis Emblem */}
      <div className="mb-6 p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25">
        <ShieldCheck className="h-6 w-6 fill-current" />
      </div>

      {/* Nav Icons */}
      <nav className="flex flex-col gap-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              title={item.label}
              className={`p-3 rounded-xl transition-all relative group ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              {/* Tooltip on hover */}
              <span className="absolute left-16 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Runtime Status Indicator */}
      <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-slate-800/80">
        <div
          className={`h-3 w-3 rounded-full ${
            backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
          }`}
          title={backendOnline ? 'Runtime Kernel Active' : 'Runtime Offline'}
        />
        <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">
          v2.5
        </span>
      </div>
    </aside>
  );
};
