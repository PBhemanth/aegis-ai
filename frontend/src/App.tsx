import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { GoalInput } from './components/GoalInput';
import { CapabilityGapAlert } from './components/CapabilityGapAlert';
import { PlanViewer } from './components/PlanViewer';
import { ApprovalModal } from './components/ApprovalModal';
import { VerificationInspector } from './components/VerificationInspector';
import { LiveTimeline } from './components/LiveTimeline';
import { AuditLedgerPanel } from './components/AuditLedgerPanel';
import { GoogleIntegrationsPanel } from './components/GoogleIntegrationsPanel';
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
import { AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
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

        // Refresh plan state if step status changed
        if (plan?.id && event.plan_id === plan.id) {
          api.getPlan(plan.id).then(setPlan).catch(console.warn);
          api.getAuditEvents(plan.id).then(setAuditEvents).catch(console.warn);
        }
      },
      () => {
        setSseConnected(false);
      }
    );

    return cleanup;
  }, [plan?.id]);

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

  // Plan and Execute Pipeline
  const handlePlanAndExecute = async (goal: string, mode: ExecutionMode) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCapabilityGap(null);
    setRawGoal(goal);
    setAgentState('UNDERSTANDING');

    try {
      // 1. Pre-flight Capability Boundary Check
      const gapReport = await api.analyzeCapabilityGap(goal);
      if (!gapReport.is_supported) {
        setCapabilityGap(gapReport);
        setAgentState('CAPABILITY_GAP');
        setIsLoading(false);
        return;
      }

      setAgentState('PLANNING');

      // 2. Synthesize Plan DAG via Dynamic Planner
      const genResponse = await api.generatePlan(goal);

      if (genResponse.status === 'CAPABILITY_GAP' && genResponse.capability_gap) {
        setCapabilityGap(genResponse.capability_gap);
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

      if (mode === 'plan_only') {
        setAgentState('COMPLETED');
        setIsLoading(false);
        return;
      }

      // 3. Execute Plan (Assisted or Autonomous)
      setAgentState('EXECUTING');
      const executionSummary = await api.executePlan(newPlan.id);

      // Refresh plan after run
      const updatedPlan = await api.getPlan(newPlan.id);
      setPlan(updatedPlan);
      await refreshAuditEvents();

      if (executionSummary.status === 'HALTED') {
        setAgentState('APPROVAL_REQUIRED');
        // Find halted step to prompt user
        const haltedStep = updatedPlan.steps.find((s) => s.id === executionSummary.current_step_id) ||
          updatedPlan.steps.find((s) => s.status === 'AWAITING_APPROVAL');

        if (haltedStep) {
          handleRequestApproval(haltedStep);
        }
      } else if (executionSummary.status === 'COMPLETED') {
        setAgentState('COMPLETED');
      } else {
        setAgentState(executionSummary.status || 'FAILED');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution failed');
      setAgentState('FAILED');
    } finally {
      setIsLoading(false);
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
      // Check if step requires approval
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

      // Close modal
      const stepToRun = pendingApprovalStep;
      const challengeToUse = approvalChallenge;
      setPendingApprovalStep(null);
      setApprovalChallenge(null);

      // Re-run execution with approval credentials
      setAgentState('EXECUTING');
      await api.executeStep(stepToRun.id, {
        approval_nonce: challengeToUse.approval_nonce,
        action_fingerprint: challengeToUse.action_fingerprint,
        typed_confirmation: typedConfirmation,
      });

      // Continue whole plan execution
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

  // Verify Audit Chain Integrity
  const handleVerifyIntegrity = async () => {
    if (!plan?.id) return;
    setIsVerifyingAudit(true);
    try {
      const result = await api.verifyAuditIntegrity(plan.id);
      setAuditVerificationResult(result);
      return result;
    } catch (err: any) {
      setErrorMessage(err.message || 'Audit integrity check failed');
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  // Google OAuth handlers
  const handleGoogleConnect = async () => {
    try {
      const { authorization_url } = await api.getGoogleLoginUrl();
      if (authorization_url) {
        window.open(authorization_url, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google OAuth consent flow initiation failed');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await api.logoutGoogle();
      await refreshGoogleStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        agentState={agentState}
        googleStatus={googleStatus}
        backendOnline={backendOnline}
        onRefreshGoogle={refreshGoogleStatus}
      />

      {/* Main Cockpit */}
      <main className="dashboard-container flex-1">
        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/80 text-rose-200 text-xs flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-rose-100 mb-0.5">Execution Interrupted</strong>
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

        {/* Goal Input & Demo Dispatcher */}
        <GoalInput onPlanAndExecute={handlePlanAndExecute} isLoading={isLoading} />

        {/* Transparent Capability Gap Notification */}
        {capabilityGap && (
          <CapabilityGapAlert
            report={capabilityGap}
            rawGoal={rawGoal}
            onDismiss={() => setCapabilityGap(null)}
          />
        )}

        {/* Plan DAG Viewer */}
        <PlanViewer
          plan={plan}
          onExecuteStep={handleExecuteSingleStep}
          onRequestApproval={handleRequestApproval}
          onInspectProof={handleInspectProof}
          executingStepId={executingStepId}
        />

        {/* Dual Panel: Telemetry Stream & Audit Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveTimeline events={liveEvents} isConnected={sseConnected} />
          <AuditLedgerPanel
            events={auditEvents}
            planId={plan?.id || null}
            onVerifyIntegrity={handleVerifyIntegrity}
            verificationResult={auditVerificationResult}
            isVerifying={isVerifyingAudit}
            onRefreshEvents={refreshAuditEvents}
          />
        </div>

        {/* Google Workspace Integration Panel */}
        <GoogleIntegrationsPanel
          status={googleStatus}
          onConnect={handleGoogleConnect}
          onLogout={handleGoogleLogout}
          isLoading={isLoading}
        />
      </main>

      {/* Human Approval Modal */}
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

      {/* Independent Verification Proof Inspector */}
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
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>CampusPilot Autonomous Agent Runtime • PromptWars × Error Zero 2026</span>
          <span className="font-mono">Plan. Act. Verify. Trust.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
