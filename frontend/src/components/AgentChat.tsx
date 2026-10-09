import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Fingerprint,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { PlanData, StepDefinition } from '../types';
import { StepResultDetails } from './StepResultDetails';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  planId?: string;
  stepsSummary?: {
    total: number;
    completed: number;
    status: string;
  };
  actionType?: 'plan_generated' | 'execution_completed' | 'approval_required' | 'error';
  stepForApproval?: StepDefinition;
}

interface AgentChatProps {
  onSendMessage: (goal: string) => void;
  isLoading: boolean;
  currentPlan: PlanData | null;
  agentState: string;
  onRequestApproval: (step: StepDefinition) => void;
  onInspectProof: (stepId: string) => void;
  onExecuteSingleStep: (stepId: string) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  onSendMessage,
  isLoading,
  currentPlan,
  agentState,
  onRequestApproval,
  onInspectProof,
  onExecuteSingleStep,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'agent',
      text: "Hello! I am CampusPilot, your autonomous agent runtime. What mission should I execute today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: prev[stepId] === undefined ? false : !prev[stepId],
    }));
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only the message feed itself. scrollIntoView() would also scroll the
  // whole page to the chat panel on mount and hide the goal input above it.
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Reactive agent responses when plan changes
  useEffect(() => {
    if (!currentPlan) return;

    const completed = currentPlan.steps.filter((s) => s.status === 'VERIFIED').length;
    const total = currentPlan.steps.length;
    const isFinished = completed === total && total > 0;
    const failedStep = currentPlan.steps.find((s) => s.status === 'FAILED');
    const isFailed = currentPlan.status === 'FAILED' || Boolean(failedStep);
    const needsApproval = currentPlan.steps.find((s) => s.status === 'AWAITING_APPROVAL');

    if (isFailed) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text.includes('Mission execution intercepted')) return prev;
        const errDetail = failedStep?.error_message || 'Step execution encountered an error.';
        return [
          ...prev,
          {
            id: `error_${Date.now()}`,
            sender: 'agent',
            text: `Mission execution intercepted: ${failedStep ? `Step '${failedStep.title}' failed.` : 'Execution halted.'} Error: ${errDetail}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planId: currentPlan.id,
            actionType: 'error',
            stepsSummary: { total, completed, status: 'FAILED' },
          },
        ];
      });
    } else if (isFinished) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text.includes('Mission verified')) return prev;
        return [
          ...prev,
          {
            id: `done_${Date.now()}`,
            sender: 'agent',
            text: `Mission verified! All ${total} steps executed safely with cryptographic assertions sealed. Research summaries and synthesized report are presented below:`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planId: currentPlan.id,
            actionType: 'execution_completed',
            stepsSummary: { total, completed, status: 'COMPLETED' },
          },
        ];
      });
    } else if (needsApproval) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text.includes('Human authorization required')) return prev;
        return [
          ...prev,
          {
            id: `approval_${Date.now()}`,
            sender: 'agent',
            text: `Human authorization required: Step '${needsApproval.title}' is protected by deterministic risk gates.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planId: currentPlan.id,
            actionType: 'approval_required',
            stepForApproval: needsApproval,
            stepsSummary: { total, completed, status: 'AWAITING_APPROVAL' },
          },
        ];
      });
    }
  }, [currentPlan]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Trigger execution
    onSendMessage(text);

    // Initial agent acknowledgement
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ack_${Date.now()}`,
          sender: 'agent',
          text: `Analyzing goal, checking capability boundaries, and synthesizing execution DAG...`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'agent',
        text: "Chat cleared. What mission should I execute next?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    {
      label: '✦ Research GNN Papers',
      goal: 'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.',
    },
    {
      label: '📚 ML Study Plan',
      goal: 'Create an intensive 7-day study plan for upcoming machine learning exams with daily milestones, practice tasks, and review sessions.',
    },
    {
      label: '📁 Drive Export',
      goal: 'Conduct research on autonomous AI agent execution architectures, synthesize a structured technical report, and save the report to Google Drive in a dedicated project folder.',
    },
    {
      label: '🕒 Check Calendar Slots',
      goal: 'Inspect my Google Calendar availability for next week, detect open slots, and propose 2-hour focused revision sessions.',
    },
    {
      label: '🔒 Test Safety Gate',
      goal: 'Delete the outdated draft from Google Drive',
    },
  ];

  return (
    <div className="bg-[#0a1122]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.6)] flex flex-col h-[440px] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/70 bg-[#070c18]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>CampusPilot Agent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Status: {agentState}
            </span>
          </div>
        </div>

        {/* Clear chat button */}
        <button
          type="button"
          onClick={clearChat}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          title="Reset conversation"
          aria-label="Clear chat"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[82%] rounded-2xl p-3 shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-[#0f172a] border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <p className="leading-relaxed font-sans text-xs">{msg.text}</p>

                {/* Structured Step Progress inside Agent Bubble */}
                {currentPlan && currentPlan.steps && !isUser && msg.planId === currentPlan.id && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block mb-1">
                      Execution Plan // {currentPlan.id}
                    </span>

                    {currentPlan.steps.map((step) => {
                      const hasOutput = Boolean(
                        step.execution_result ||
                          step.execution_result_json ||
                          step.error_message ||
                          step.status === 'VERIFIED' ||
                          step.status === 'FAILED'
                      );
                      const isExpanded =
                        expandedSteps[step.id] ?? (step.status === 'VERIFIED' || step.status === 'FAILED');

                      return (
                        <div
                          key={step.id}
                          className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              {step.status === 'VERIFIED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : step.status === 'FAILED' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : step.status === 'AWAITING_APPROVAL' ? (
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              )}
                              <span className="truncate text-slate-200 font-semibold">{step.title}</span>
                            </div>

                            {/* Interactive Step Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              {hasOutput && (
                                <button
                                  type="button"
                                  onClick={() => toggleStepExpand(step.id)}
                                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] text-cyan-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 font-mono transition-colors"
                                  title={isExpanded ? 'Collapse output' : 'Expand output'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  <span>{isExpanded ? 'Hide' : 'Results'}</span>
                                </button>
                              )}

                              {step.status === 'VERIFIED' && (
                                <button
                                  type="button"
                                  onClick={() => onInspectProof(step.id)}
                                  className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] flex items-center gap-1 hover:bg-emerald-900 transition-colors"
                                >
                                  <Fingerprint className="w-2.5 h-2.5" />
                                  <span>Proof</span>
                                </button>
                              )}

                              {step.status === 'AWAITING_APPROVAL' && (
                                <button
                                  type="button"
                                  onClick={() => onRequestApproval(step)}
                                  className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 hover:bg-amber-400 shadow-sm"
                                >
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>Authorize</span>
                                </button>
                              )}

                              {step.status !== 'VERIFIED' && step.status !== 'AWAITING_APPROVAL' && (
                                <button
                                  type="button"
                                  onClick={() => onExecuteSingleStep(step.id)}
                                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
                                >
                                  <Play className="w-2.5 h-2.5" />
                                  <span>Run</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Step Results / Output */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-800/80">
                              <StepResultDetails step={step} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Human Authorization Prompt Button */}
                {msg.actionType === 'approval_required' && msg.stepForApproval && (
                  <div className="mt-2.5 pt-2 border-t border-amber-900/40">
                    <button
                      type="button"
                      onClick={() => onRequestApproval(msg.stepForApproval!)}
                      className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Open Approval Challenge</span>
                    </button>
                  </div>
                )}

                <span className="text-[9px] text-slate-400/80 mt-1 block text-right font-mono">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Typing Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl rounded-tl-none p-3 text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-mono text-cyan-400 ml-1">Executing Mission...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompt Buttons above Input */}
      <div className="px-3 py-1.5 bg-[#070c18]/80 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(qp.goal)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-2.5 bg-[#070c18] border-t border-slate-800/80 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a goal or message (e.g. 'Research papers on GNN fraud')..."
            className="w-full bg-[#0c1427] border border-slate-800/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-sans"
            disabled={isLoading}
          />
        </div>

        <button
          type="button"
          disabled={isLoading || !inputText.trim()}
          onClick={() => handleSend()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
};
