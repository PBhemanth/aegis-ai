import React from 'react';
import { Check, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import { PlanData } from '../types';

interface StatusCardsProps {
  plan: PlanData | null;
}

export const StatusCards: React.FC<StatusCardsProps> = ({ plan }) => {
  const steps = plan?.steps || [];

  const completedCount = steps.filter((s) => s.status === 'VERIFIED').length;
  const inProgressCount = steps.filter(
    (s) => s.status === 'EXECUTING' || s.status === 'VERIFYING'
  ).length;
  const pendingCount = steps.filter(
    (s) =>
      s.status === 'PENDING' ||
      s.status === 'AWAITING_APPROVAL' ||
      s.status === 'PROPOSED'
  ).length;
  const failedCount = steps.filter((s) => s.status === 'FAILED').length;

  const totalSteps = steps.length || 1;

  const cards = [
    {
      id: 'completed',
      label: 'Completed',
      count: completedCount,
      icon: Check,
      iconBg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400',
      barColor: 'bg-emerald-500',
      barWidth: steps.length ? `${(completedCount / totalSteps) * 100}%` : '0%',
      cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      count: inProgressCount,
      icon: RefreshCw,
      iconBg: 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400',
      barColor: 'bg-cyan-500',
      barWidth: steps.length ? `${(inProgressCount / totalSteps) * 100}%` : '0%',
      cardBorder: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconAnimate: inProgressCount > 0 ? 'animate-spin' : '',
    },
    {
      id: 'pending',
      label: 'Pending',
      count: pendingCount,
      icon: FileText,
      iconBg: 'bg-amber-950/40 border-amber-500/50 text-amber-400',
      barColor: 'bg-amber-500',
      barWidth: steps.length ? `${(pendingCount / totalSteps) * 100}%` : '0%',
      cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
    },
    {
      id: 'failed',
      label: 'Failed',
      count: failedCount,
      icon: AlertTriangle,
      iconBg: 'bg-rose-950/40 border-rose-500/50 text-rose-400',
      barColor: 'bg-rose-500',
      barWidth: steps.length ? `${(failedCount / totalSteps) * 100}%` : '0%',
      cardBorder: 'border-rose-500/20 hover:border-rose-500/40',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
      role="group"
      aria-label="Mission status"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className={`bg-[#0a1122]/90 rounded-xl px-3.5 py-3 border transition-colors duration-300 ${card.cardBorder} flex flex-col gap-2.5`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}
              >
                <Icon className={`w-4 h-4 ${card.iconAnimate || ''}`} strokeWidth={2.25} />
              </div>

              <div className="min-w-0 leading-tight">
                <div className="text-xl font-bold text-white tabular-nums">{card.count}</div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 truncate">
                  {card.label}
                </div>
              </div>
            </div>

            <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden" aria-hidden="true">
              <div
                className={`h-full ${card.barColor} transition-all duration-500 rounded-full`}
                style={{ width: card.barWidth }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
