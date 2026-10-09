import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopNav, NavTabId } from './components/TopNav';
import { GoalInput } from './components/GoalInput';
import { StatusCards } from './components/StatusCards';
import { TasksPanel } from './components/TasksPanel';
import { AgentRadar } from './components/AgentRadar';
import { AgentChat } from './components/AgentChat';
import { ExecutionPipeline } from './components/ExecutionPipeline';
import { PlanViewer } from './components/PlanViewer';
import { LiveTimeline } from './components/LiveTimeline';
import { AuditLedgerPanel } from './components/AuditLedgerPanel';
import { GoogleIntegrationsPanel } from './components/GoogleIntegrationsPanel';
import { CapabilityGapAlert } from './components/CapabilityGapAlert';
import { ApprovalModal } from './components/ApprovalModal';
import { VerificationInspector } from './components/VerificationInspector';
import { api } from './services/api';
import {
  AgentEvent,
  AuditEventItem,
  AuditVerificationResult,
  CapabilityGapReport,
  ExecutionMode,
  GoogleAuthStatus,
  PlanData,
  StepDefinition,
  VerificationProof,
} from './types';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, MessageSquare, ClipboardList, Play, Lock } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [leftPanelMode, setLeftPanelMode] = useState<'chat' | 'dag'>('chat');

  // Core State
  const [agentState, setAgentState] = useState<string>('IDLE');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [capabilityGap, setCapabilityGap] = useState<CapabilityGapReport | null>(null);
  const [rawGoal, setRawGoal] = useState<string>('');
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<StepDefinition | null>(null);
  const [approvalChallenge, setApprovalChallenge] = useState<any | null>(null);
  const [inspectingProof, setInspectingProof] = useState<VerificationProof | null>(null);
  const [inspectingStepTitle, setInspectingStepTitle] = useState<string>('');

  // Audit & Telemetry State
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [auditVerificationResult, setAuditVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [liveEvents, setLiveEvents] = useState<AgentEvent[]>([]);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Integrations & System State
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifyingAudit, setIsVerifyingAudit] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Google Auth Status on mount
  const refreshGoogleStatus = useCallback(async () => {
    try {
      const status = await api.getGoogleAuthStatus();
      setGoogleStatus(status);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshGoogleStatus();
  }, [refreshGoogleStatus]);

  // Debounced refresh for plan and audit events
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback((planId: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      api.getPlan(planId).then(setPlan).catch(console.warn);
      api.getAuditEvents(planId).then(setAuditEvents).catch(console.warn);
    }, 200);
  }, []);

  // Connect SSE Live Stream
  useEffect(() => {
    const cleanup = api.subscribeSSE(
      plan?.id || null,
      (event: AgentEvent) => {
        setSseConnected(true);
        setLiveEvents((prev) => [event, ...prev.slice(0, 49)]);

        // Update overall agent state based on incoming event
        if (event.event_type) {
          setAgentState(event.event_type);
        }

        // Debounce plan and audit refresh on incoming events
        if (plan?.id && event.plan_id === plan.id) {
          debouncedRefresh(plan.id);
        }
      },
      () => {
        setSseConnected(false);
      }
    );

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      cleanup();
    };
  }, [plan?.id, debouncedRefresh]);

  // Helper to refresh audit events
  const refreshAuditEvents = async () => {
    if (!plan?.id) return;
    try {
      const evts = await api.getAuditEvents(plan.id);
      setAuditEvents(evts);
    } catch (err) {
      console.warn('Failed to load audit events', err);
    }
  };

  // Dispatch Goal & Execute Plan
  const handlePlanAndExecute = async (goal: string, mode: ExecutionMode) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCapabilityGap(null);
    setRawGoal(goal);
    setAgentState('UNDERSTANDING');

    try {
      // 1. Pre-flight Capability Boundary Check
      const gapReport = await api.analyzeCapabilityGap(goal);
      if (gapReport.has_gap || gapReport.is_supported === false) {
        setCapabilityGap(gapReport);
        setErrorMessage(gapReport.explanation);
        setAgentState('CAPABILITY_GAP');
        setIsLoading(false);
        return;
      }

      setAgentState('PLANNING');

      // 2. Synthesize Plan DAG via Dynamic Planner
      const genResponse = await api.generatePlan(goal);

      if (genResponse.status === 'CAPABILITY_GAP' && genResponse.capability_gap) {
        setCapabilityGap(genResponse.capability_gap);
        setErrorMessage(genResponse.capability_gap.explanation);
        setAgentState('CAPABILITY_GAP');
        setIsLoading(false);
        return;
      }

      if (!genResponse.plan_id) {
        throw new Error('Planner failed to generate plan ID');
      }

      // Fetch the created plan with steps
      const newPlan = await api.getPlan(genResponse.plan_id);
      setPlan(newPlan);
      await refreshAuditEvents();

      // If user selected 'plan_only', halt here in review mode (read-only)
      if (mode === 'plan_only') {
        setAgentState('PLANNING');
        setIsLoading(false);
        return;
      }

      // Assisted mode: Execute only the first executable step, then pause for user review
      if (mode === 'assisted') {
        setAgentState('EXECUTING');
        const firstExecutableStep = newPlan.steps.find((s) => s.status === 'PROPOSED');
        if (firstExecutableStep) {
          try {
            const result = await api.executeStep(firstExecutableStep.id);
            const updatedPlan = await api.getPlan(newPlan.id);
            setPlan(updatedPlan);
            await refreshAuditEvents();
            if (result.proof) {
              setInspectingProof(result.proof);
              setInspectingStepTitle(firstExecutableStep.title);
            }
            setAgentState(result.status || 'VERIFIED');
          } catch (err: any) {
            if (err.message && err.message.includes('human approval')) {
              handleRequestApproval(firstExecutableStep);
            } else {
              setErrorMessage(err.message || 'Step execution failed');
              setAgentState('FAILED');
            }
          }
        }
        setIsLoading(false);
        return;
      }

      // 3. Execute Plan (Autonomous: runs all non-gated steps end-to-end)
      setAgentState('EXECUTING');
      const executionSummary = await api.executePlan(newPlan.id);

      // Refresh plan after run
      const updatedPlan = await api.getPlan(newPlan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();

      if (executionSummary.status === 'HALTED') {
        setAgentState('APPROVAL_REQUIRED');
        const haltedStep =
          updatedPlan.steps.find((s) => s.id === executionSummary.current_step_id) ||
          updatedPlan.steps.find((s) => s.status === 'AWAITING_APPROVAL');

        if (haltedStep) {
          handleRequestApproval(haltedStep);
        }
      } else if (executionSummary.status === 'COMPLETED') {
        setAgentState('COMPLETED');
      } else {
        setAgentState(executionSummary.status || 'FAILED');
        if (executionSummary.halt_reason) {
          setErrorMessage(executionSummary.halt_reason);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution failed');
      setAgentState('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute existing reviewed plan directly
  const handleExecuteCurrentPlan = async () => {
    if (!plan) return;
    setIsLoading(true);
    setErrorMessage(null);
    setAgentState('EXECUTING');

    try {
      const executionSummary = await api.executePlan(plan.id);
      const updatedPlan = await api.getPlan(plan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();

      if (executionSummary.status === 'HALTED') {
        setAgentState('APPROVAL_REQUIRED');
        const haltedStep =
          updatedPlan.steps.find((s) => s.id === executionSummary.current_step_id) ||
          updatedPlan.steps.find((s) => s.status === 'AWAITING_APPROVAL');

        if (haltedStep) {
          handleRequestApproval(haltedStep);
        }
      } else if (executionSummary.status === 'COMPLETED') {
        setAgentState('COMPLETED');
      } else {
        setAgentState(executionSummary.status || 'FAILED');
        if (executionSummary.halt_reason) {
          setErrorMessage(executionSummary.halt_reason);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution failed');
      setAgentState('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Run trigger from header
  const handleQuickRun = () => {
    if (plan && (plan.status === 'PLANNING' || plan.steps.some((s) => s.status === 'PROPOSED'))) {
      handleExecuteCurrentPlan();
      return;
    }
    if (rawGoal.trim()) {
      handlePlanAndExecute(rawGoal.trim(), 'autonomous');
    } else {
      const defaultGoal =
        'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.';
      handlePlanAndExecute(defaultGoal, 'autonomous');
    }
  };

  // Launch predefined preset mission
  const handleLaunchPreset = (preset: 'gnn' | 'study' | 'gate') => {
    if (preset === 'gnn') {
      handlePlanAndExecute(
        'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.',
        'autonomous'
      );
    } else if (preset === 'study') {
      handlePlanAndExecute(
        'Create an intensive 7-day study plan for upcoming machine learning exams with daily milestones, practice tasks, and review sessions.',
        'autonomous'
      );
    } else if (preset === 'gate') {
      handlePlanAndExecute('Delete the outdated draft from Google Drive', 'autonomous');
    }
  };

  // Single Step Execution
  const handleExecuteSingleStep = async (stepId: string) => {
    if (!plan) return;
    setExecutingStepId(stepId);
    setErrorMessage(null);
    setAgentState('EXECUTING');

    try {
      const step = plan.steps.find((s) => s.id === stepId);
      if (!step) return;

      const result = await api.executeStep(stepId);
      const updatedPlan = await api.getPlan(plan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();

      if (result.proof) {
        setInspectingProof(result.proof);
        setInspectingStepTitle(step.title);
      }
      setAgentState(result.status || 'VERIFIED');
    } catch (err: any) {
      if (err.message && err.message.includes('human approval')) {
        const step = plan.steps.find((s) => s.id === stepId);
        if (step) {
          handleRequestApproval(step);
        }
      } else {
        setErrorMessage(err.message || 'Step execution failed');
        setAgentState('FAILED');
      }
    } finally {
      setExecutingStepId(null);
    }
  };

  // Request Approval Challenge
  const handleRequestApproval = async (step: StepDefinition) => {
    if (!plan) return;
    try {
      let params = {};
      if (step.parameters_json) {
        try {
          params = JSON.parse(step.parameters_json);
        } catch {
          params = {};
        }
      }

      const challenge = await api.createApprovalChallenge(plan.id, step.id, step.tool_name, params);
      setApprovalChallenge(challenge);
      setPendingApprovalStep(step);
      setAgentState('APPROVAL_REQUIRED');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to prepare approval challenge');
    }
  };

  // Submit Approval
  const handleApproveAction = async (typedConfirmation?: string) => {
    if (!pendingApprovalStep || !approvalChallenge || !plan) return;
    setIsLoading(true);

    try {
      await api.submitApproval({
        plan_id: plan.id,
        step_id: pendingApprovalStep.id,
        approval_nonce: approvalChallenge.approval_nonce,
        action_fingerprint: approvalChallenge.action_fingerprint,
        typed_confirmation: typedConfirmation,
      });

      const stepToRun = pendingApprovalStep;
      const challengeToUse = approvalChallenge;
      setPendingApprovalStep(null);
      setApprovalChallenge(null);

      setAgentState('EXECUTING');
      await api.executeStep(stepToRun.id, {
        approval_nonce: challengeToUse.approval_nonce,
        action_fingerprint: challengeToUse.action_fingerprint,
        typed_confirmation: typedConfirmation,
      });

      const summary = await api.executePlan(plan.id);
      const updatedPlan = await api.getPlan(plan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();

      setAgentState(summary.status === 'COMPLETED' ? 'COMPLETED' : summary.status);
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval authorization failed');
      setAgentState('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  // Reject Action
  const handleRejectAction = async (reason: string) => {
    if (!pendingApprovalStep || !plan) return;
    try {
      await api.rejectApproval({
        plan_id: plan.id,
        step_id: pendingApprovalStep.id,
        reason: reason,
      });
      setPendingApprovalStep(null);
      setApprovalChallenge(null);
      setAgentState('REJECTED');
      const updatedPlan = await api.getPlan(plan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record rejection');
    }
  };

  // Inspect Proof
  const handleInspectProof = async (stepId: string) => {
    try {
      const proof = await api.getVerificationProof(stepId);
      const step = plan?.steps.find((s) => s.id === stepId);
      setInspectingProof(proof);
      setInspectingStepTitle(step?.title || stepId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Proof not found for this step');
    }
  };

  // Trigger Cryptographic Audit Integrity Check
  const handleVerifyIntegrity = async () => {
    if (!plan?.id) return;
    setIsVerifyingAudit(true);
    try {
      const result = await api.verifyAuditIntegrity(plan.id);
      setAuditVerificationResult(result);
      return result;
    } catch (err: any) {
      setErrorMessage(`Audit verification error: ${err.message}`);
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  // Google OAuth Handlers
  const handleGoogleConnect = () => {
    window.location.href = '/api/google/auth/login';
  };

  const handleGoogleLogout = async () => {
    setIsLoading(true);
    try {
      await api.logoutGoogle();
      await refreshGoogleStatus();
    } catch (err: any) {
      setErrorMessage(`Logout failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans">
      {/* Top Navigation Bar matching reference image */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickRun={handleQuickRun}
        isLoading={isLoading}
        backendOnline={backendOnline}
        googleStatus={googleStatus}
        agentState={agentState}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-start justify-between gap-3 shadow-xl shadow-rose-950/40"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-rose-100 mb-0.5 font-mono">
                  // EXECUTION EXCEPTION INTERCEPTED
                </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-100 p-1 rounded"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Capability Gap Alert */}
        {capabilityGap && (
          <div className="mb-4">
            <CapabilityGapAlert
              report={capabilityGap}
              rawGoal={rawGoal}
              onDismiss={() => setCapabilityGap(null)}
            />
          </div>
        )}

        {/* DASHBOARD TAB: Visual Layout Matching Reference Image */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3 sm:space-y-4">
            {/* 1. Hero Command Prompt Box */}
            <GoalInput
              onPlanAndExecute={handlePlanAndExecute}
              isLoading={isLoading}
              googleStatus={googleStatus}
            />

            {/* High-Risk Human Approval Gate Banner */}
            {pendingApprovalStep && approvalChallenge && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-500 text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-amber-950/40"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono tracking-wider text-amber-300 uppercase">
                        Human Authorization Required
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 border border-amber-600/70 font-bold">
                        {approvalChallenge.risk_evaluation?.risk_tier || 'TIER 3 DESTRUCTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">
                      Step <strong>{pendingApprovalStep.title}</strong> halted at safety gate. Operator authorization required.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectAction('Denied by operator')}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 text-rose-300 hover:text-rose-100 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestApproval(pendingApprovalStep)}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/25 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Review & Authorize</span>
                  </button>
                </div>
              </div>
            )}

            {/* Plan Review & Direct Execution Banner */}
            {plan && (plan.status === 'PLANNING' || plan.steps.some((s) => s.status === 'PROPOSED')) && !pendingApprovalStep && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c1833]/90 border border-cyan-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-cyan-950/40">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 sm:mt-0">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-300 font-mono tracking-wider">
                        MISSION PLAN IN REVIEW
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {plan.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {plan.steps.length} steps synthesized. Review the plan below, then execute when ready.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {leftPanelMode !== 'dag' && (
                    <button
                      type="button"
                      onClick={() => setLeftPanelMode('dag')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-all"
                    >
                      View Steps DAG
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExecuteCurrentPlan}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-slate-950" />
                    <span>Execute Plan</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Status Metric Cards (4 compact cards) */}
            <StatusCards plan={plan} />

            {/* 3. Two-Column Dashboard (Tasks on Left, Agent Radar on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* Left Column: Interactive Chat OR Tasks / Active Missions (~58%) */}
              <div className="lg:col-span-7 flex flex-col min-w-0">
                {/* Interactive Mode Toggle Bar */}
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <div className="inline-flex items-center gap-1 bg-[#0a1122]/90 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLeftPanelMode('chat')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        leftPanelMode === 'chat'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Interactive Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeftPanelMode('dag')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        leftPanelMode === 'dag'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Mission DAG</span>
                    </button>
                  </div>
                </div>

                {leftPanelMode === 'chat' ? (
                  <AgentChat
                    onSendMessage={(g) => handlePlanAndExecute(g, 'plan_only')}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    currentPlan={plan}
                    agentState={agentState}
                    onRequestApproval={handleRequestApproval}
                    onInspectProof={handleInspectProof}
                    onExecuteSingleStep={handleExecuteSingleStep}
                  />
                ) : (
                  <TasksPanel
                    plan={plan}
                    onExecuteStep={handleExecuteSingleStep}
                    onRequestApproval={handleRequestApproval}
                    onInspectProof={handleInspectProof}
                    executingStepId={executingStepId}
                    onOpenFullPlanner={() => setActiveTab('planner')}
                    onLaunchPreset={handleLaunchPreset}
                  />
                )}
              </div>

              {/* Right Column: Agent Runtime Telemetry (~42%) */}
              <div className="lg:col-span-5 flex flex-col min-w-0">
                <AgentRadar
                  agentState={agentState}
                  plan={plan}
                  googleStatus={googleStatus}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* 4. Technical details: execution pipeline (collapsed by default) */}
            {agentState !== 'IDLE' && (
              <details className="group rounded-xl border border-slate-800/80 bg-[#0a1122]/70">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-cyan-300 [&::-webkit-details-marker]:hidden">
                  <span>Execution pipeline</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded border border-cyan-800/60 bg-cyan-950/70 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                      {agentState}
                    </span>
                    <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="px-3 pb-3">
                  <ExecutionPipeline agentState={agentState} />
                </div>
              </details>
            )}
          </div>
        )}

        {/* TASKS TAB: Focused Tasks and Steps */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Active Mission Tasks</span>
                {plan && (
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    {plan.id}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <TasksPanel
              plan={plan}
              onExecuteStep={handleExecuteSingleStep}
              onRequestApproval={handleRequestApproval}
              onInspectProof={handleInspectProof}
              executingStepId={executingStepId}
              onOpenFullPlanner={() => setActiveTab('planner')}
            />
          </div>
        )}

        {/* PLANNER TAB: Full Plan DAG Graph */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Interactive Plan DAG Graph</h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <PlanViewer
              plan={plan}
              onExecuteStep={handleExecuteSingleStep}
              onRequestApproval={handleRequestApproval}
              onInspectProof={handleInspectProof}
              executingStepId={executingStepId}
            />
          </div>
        )}

        {/* AGENT RUNS TAB: Live SSE Telemetry Feed */}
        {activeTab === 'runs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Agent Execution Telemetry Stream</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    sseConnected
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                      : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                  }`}
                >
                  {sseConnected ? 'LIVE SSE CONNECTED' : 'DISCONNECTED'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <LiveTimeline events={liveEvents} isConnected={sseConnected} />
          </div>
        )}

        {/* APPROVALS TAB: Human Permission Gate Challenges */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Human Permission Gates</h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            {pendingApprovalStep && approvalChallenge ? (
              <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/50">
                <div className="flex items-center gap-3 text-amber-300 font-bold mb-3">
                  <ShieldAlert className="w-6 h-6" />
                  <span className="text-lg">Pending Authorization Required</span>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  Step <strong>{pendingApprovalStep.title}</strong> requires explicit human authorization.
                </p>
                <button
                  type="button"
                  onClick={() => handleRequestApproval(pendingApprovalStep)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider"
                >
                  Open Approval Challenge Modal
                </button>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[#0a1122]/90 border border-slate-800 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-200">No Pending Approvals</h3>
                <p className="text-xs text-slate-400 mt-1">
                  High-risk mutating and destructive actions will trigger permission challenges here automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR & DRIVE TAB: Google Workspace Integrations */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Google Workspace Services</h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <GoogleIntegrationsPanel
              status={googleStatus}
              onConnect={handleGoogleConnect}
              onLogout={handleGoogleLogout}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* RESEARCH TAB: Academic Research Preset & Status */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Academic Research & arXiv Synthesis</h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[#0a1122]/90 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-cyan-300">
                arXiv Academic Paper Synthesis Engine
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                CampusPilot integrates automated web search and arXiv academic query capabilities to gather research papers, synthesize comparative analyses, and produce structured reports with verifiable citations.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  handlePlanAndExecute(
                    'Research three recent academic papers on graph neural network (GNN) cryptocurrency fraud detection, synthesize a comparative analysis, and generate a verified markdown report with formal citations.',
                    'autonomous'
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
              >
                Launch GNN Fraud Detection Research
              </button>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB: Cryptographic Audit Ledger */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                Cryptographic Audit Ledger & Chain Integrity
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-slate-400 hover:text-cyan-400"
              >
                Back to Dashboard
              </button>
            </div>

            <AuditLedgerPanel
              events={auditEvents}
              planId={plan?.id || null}
              onVerifyIntegrity={handleVerifyIntegrity}
              verificationResult={auditVerificationResult}
              isVerifying={isVerifyingAudit}
              onRefreshEvents={refreshAuditEvents}
            />
          </div>
        )}
      </main>

      {/* Modal: Human Permission Gate */}
      {pendingApprovalStep && approvalChallenge && (
        <ApprovalModal
          step={pendingApprovalStep}
          challenge={approvalChallenge}
          onApprove={handleApproveAction}
          onReject={handleRejectAction}
          onClose={() => {
            setPendingApprovalStep(null);
            setApprovalChallenge(null);
          }}
          isSubmitting={isLoading}
        />
      )}

      {/* Modal: Independent Verification Proof Inspector */}
      {inspectingProof && (
        <VerificationInspector
          proof={inspectingProof}
          stepTitle={inspectingStepTitle}
          onClose={() => {
            setInspectingProof(null);
            setInspectingStepTitle('');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060a14] py-3 px-6 text-center text-xs text-slate-500 mt-auto font-mono">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>CAMPUSPILOT // AUTONOMOUS AGENT RUNTIME</span>
          <span className="text-cyan-500/80">PLAN. ACT. VERIFY. TRUST.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
