import React from 'react';
import { Globe, Github, BarChart3, Settings } from 'lucide-react';
import { NavTabId } from './TopNav';

interface QuickAccessTilesProps {
  onSelectTab: (tab: NavTabId) => void;
  onOpenGooglePanel: () => void;
  onOpenSettings?: () => void;
}

export const QuickAccessTiles: React.FC<QuickAccessTilesProps> = ({
  onSelectTab,
  onOpenGooglePanel,
  onOpenSettings,
}) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 sm:gap-3.5 my-5">
      {/* 1. Google Drive */}
      <button
        type="button"
        onClick={onOpenGooglePanel}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-emerald-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm"
        title="Google Drive Integration"
        aria-label="Google Drive"
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:scale-110"
          viewBox="0 0 87.3 78"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
            fill="#0066da"
          />
          <path
            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
            fill="#00ac47"
          />
          <path
            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"
            fill="#ea4335"
          />
          <path
            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
            fill="#00832d"
          />
          <path
            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            fill="#2684fc"
          />
          <path
            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            fill="#ffba00"
          />
        </svg>
      </button>

      {/* 2. Google Calendar */}
      <button
        type="button"
        onClick={() => onSelectTab('calendar')}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-blue-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm"
        title="Google Calendar Integration"
        aria-label="Google Calendar"
      >
        <div className="w-6 h-6 rounded bg-white p-0.5 flex flex-col items-center justify-between shadow-sm transition-transform group-hover:scale-110">
          <div className="w-full bg-[#1a73e8] rounded-t-[2px] py-[2px] text-center">
            <div className="w-1.5 h-0.5 bg-white/80 mx-auto rounded-full" />
          </div>
          <span className="text-[11px] font-black font-sans text-[#1a73e8] leading-none mb-0.5">
            31
          </span>
        </div>
      </button>

      {/* 3. Google Docs / Documents */}
      <button
        type="button"
        onClick={() => onSelectTab('research')}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-sky-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm"
        title="Documents & Reports"
        aria-label="Google Docs"
      >
        <div className="w-5 h-6 rounded-[3px] bg-[#4285f4] p-1 flex flex-col justify-around shadow-sm transition-transform group-hover:scale-110">
          <div className="w-full h-0.5 bg-white rounded" />
          <div className="w-3/4 h-0.5 bg-white rounded" />
          <div className="w-full h-0.5 bg-white rounded" />
          <div className="w-1/2 h-0.5 bg-white rounded" />
        </div>
      </button>

      {/* 4. Web Research / Globe */}
      <button
        type="button"
        onClick={() => onSelectTab('research')}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm text-cyan-400"
        title="Web Research & arXiv"
        aria-label="Web Research"
      >
        <Globe className="w-6 h-6 transition-transform group-hover:scale-110" />
      </button>

      {/* 5. GitHub */}
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-slate-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm text-slate-300 hover:text-white"
        title="GitHub Repository"
        aria-label="GitHub Repository"
      >
        <Github className="w-6 h-6 transition-transform group-hover:scale-110" />
      </a>

      {/* 6. Analytics */}
      <button
        type="button"
        onClick={() => onSelectTab('analytics')}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-purple-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm text-purple-400"
        title="Ledger Analytics & Audit"
        aria-label="Analytics"
      >
        <BarChart3 className="w-6 h-6 transition-transform group-hover:scale-110" />
      </button>

      {/* 7. Settings */}
      <button
        type="button"
        onClick={() => {
          if (onOpenSettings) onOpenSettings();
          else onOpenGooglePanel();
        }}
        className="bg-[#0a1122]/90 hover:bg-[#0f1b36] border border-slate-800/80 hover:border-indigo-500/50 p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-sm text-indigo-400"
        title="Settings & Integrations"
        aria-label="Settings"
      >
        <Settings className="w-6 h-6 transition-transform group-hover:scale-110" />
      </button>
    </div>
  );
};
