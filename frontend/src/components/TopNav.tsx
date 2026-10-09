import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  Activity,
  ShieldCheck,
  Calendar,
  Search,
  BarChart3,
  Play,
  Sun,
  User,
} from 'lucide-react';
import { GoogleAuthStatus } from '../types';

export type NavTabId =
  | 'dashboard'
  | 'tasks'
  | 'planner'
  | 'runs'
  | 'approvals'
  | 'calendar'
  | 'research'
  | 'analytics';

interface TopNavProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onQuickRun: () => void;
  isLoading: boolean;
  backendOnline: boolean;
  googleStatus: GoogleAuthStatus | null;
  agentState: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onQuickRun,
  isLoading,
  backendOnline,
  googleStatus,
  agentState,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-blue-400',
    },
    {
      id: 'tasks' as NavTabId,
      label: 'Tasks',
      icon: ClipboardList,
      iconColor: 'text-amber-400',
    },
    {
      id: 'planner' as NavTabId,
      label: 'Planner',
      icon: CalendarClock,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'runs' as NavTabId,
      label: 'Agent Runs',
      icon: Activity,
      iconColor: 'text-pink-400',
    },
    {
      id: 'approvals' as NavTabId,
      label: 'Approvals',
      icon: ShieldCheck,
      iconColor: 'text-blue-400',
    },
    {
      id: 'calendar' as NavTabId,
      label: 'Calendar',
      icon: Calendar,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'research' as NavTabId,
      label: 'Research',
      icon: Search,
      iconColor: 'text-sky-400',
    },
    {
      id: 'analytics' as NavTabId,
      label: 'Analytics',
      icon: BarChart3,
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#060a14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-7 py-3">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <div
          className="flex items-center gap-3 cursor-pointer shrink-0"
          onClick={() => onSelectTab('dashboard')}
          title="CampusPilot Dashboard"
        >
          {/* Glowing Delta / Compass Mark */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 3L28 27H4L16 3Z"
                stroke="url(#brandGrad)"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              <path
                d="M16 11L22 23H10L16 11Z"
                fill="url(#brandGradInner)"
                fillOpacity="0.8"
              />
              <defs>
                <linearGradient id="brandGrad" x1="4" y1="3" x2="28" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00f2fe" />
                  <stop offset="0.5" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="brandGradInner" x1="10" y1="11" x2="22" y2="23" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00f2fe" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg lg:text-xl font-bold tracking-tight text-white font-sans">
              CampusPilot
            </span>
          </div>
        </div>

        {/* Center: Navigation Pills */}
        <nav
          className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar"
          aria-label="Main Navigation"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isActive ? 'text-white' : tab.iconColor
                  }`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Status Pill, Run Button, Theme Toggle, User Avatar */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live System Status Pill */}
          <div
            className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300"
            title={`Backend: ${backendOnline ? 'Online' : 'Offline'} | Google: ${
              googleStatus?.authenticated ? 'OAuth Active' : 'Unauthenticated'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-300 uppercase">{agentState}</span>
          </div>

          {/* Prominent Green Run Button */}
          <button
            type="button"
            onClick={onQuickRun}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] active:scale-95 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all"
            title="Execute goal"
          >
            <Play className="h-3 w-3 fill-current text-slate-950" />
            <span>Run</span>
          </button>

          {/* Theme Toggle Icon Button */}
          <button
            type="button"
            className="h-8 w-8 rounded-full bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            title="Theme: Dark Mode Active"
            aria-label="Toggle theme"
          >
            <Sun className="h-3.5 w-3.5 text-slate-300" />
          </button>

          {/* User Profile Avatar */}
          <button
            type="button"
            className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-400/50 flex items-center justify-center text-white shadow-md shadow-purple-500/20"
            title="Agent Profile / Student"
            aria-label="User profile"
          >
            <User className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Sub-Navigation */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar border-t border-slate-800/60 mt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
