/**
 * CampusPilot API Service
 * Centralized client for communicating with the Aegis FastAPI backend.
 */
import {
  AgentEvent,
  AuditVerificationResult,
  AuditEventItem,
  CapabilityGapReport,
  GoogleAuthStatus,
  PlanData,
  PlanExecutionSummary,
  StepDefinition,
  VerificationProof,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Planning & Capability ---
  async analyzeCapabilityGap(goal: string): Promise<CapabilityGapReport> {
    const res = await fetch(`${API_BASE}/plan/analyze-gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });
    return handleResponse<CapabilityGapReport>(res);
  },

  async generatePlan(goal: string, userId: string = 'operator_1'): Promise<{
    plan_id?: string;
    status: string;
    goal: string;
    goal_summary?: string;
    capability_gap?: CapabilityGapReport;
    planner_result: {
      status: string;
      plan_dag?: { steps: StepDefinition[] };
      goal_summary?: string;
      capability_gap?: CapabilityGapReport;
    };
  }> {
    const res = await fetch(`${API_BASE}/plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, user_id: userId }),
    });
    return handleResponse(res);
  },

  async getPlan(planId: string): Promise<PlanData> {
    const res = await fetch(`${API_BASE}/plan/${planId}`);
    return handleResponse<PlanData>(res);
  },

  // --- Execution & Verification ---
  async executePlan(
    planId: string,
    options?: {
      approval_nonce?: string;
      action_fingerprint?: string;
      typed_confirmation?: string;
      user_id?: string;
    }
  ): Promise<PlanExecutionSummary> {
    const userId = options?.user_id || 'operator_1';
    const res = await fetch(`${API_BASE}/execute/plan/${planId}?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_nonce: options?.approval_nonce,
        action_fingerprint: options?.action_fingerprint,
        typed_confirmation: options?.typed_confirmation,
      }),
    });
    return handleResponse<PlanExecutionSummary>(res);
  },

  async executeStep(
    stepId: string,
    options?: {
      approval_nonce?: string;
      action_fingerprint?: string;
      typed_confirmation?: string;
      user_id?: string;
    }
  ): Promise<{
    step_id: string;
    plan_id: string;
    tool_name: string;
    status: string;
    receipt: unknown;
    proof: VerificationProof;
  }> {
    const userId = options?.user_id || 'operator_1';
    const res = await fetch(`${API_BASE}/execute/step/${stepId}?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_nonce: options?.approval_nonce,
        action_fingerprint: options?.action_fingerprint,
        typed_confirmation: options?.typed_confirmation,
      }),
    });
    return handleResponse(res);
  },

  async getVerificationProof(stepId: string): Promise<VerificationProof> {
    const res = await fetch(`${API_BASE}/execute/proof/${stepId}`);
    return handleResponse<VerificationProof>(res);
  },

  // --- Approvals & Safety ---
  async createApprovalChallenge(
    planId: string,
    stepId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<{
    plan_id: string;
    step_id: string;
    tool_name: string;
    approval_nonce: string;
    action_fingerprint: string;
    expires_at: number;
    risk_evaluation: {
      risk_tier: string;
      requires_approval: boolean;
      requires_typed_phrase?: string | null;
      rationale: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/approvals/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        step_id: stepId,
        tool_name: toolName,
        parameters,
      }),
    });
    return handleResponse(res);
  },

  async submitApproval(payload: {
    plan_id: string;
    step_id: string;
    approval_nonce: string;
    action_fingerprint: string;
    typed_confirmation?: string;
  }): Promise<{ approved: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/approvals/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async rejectApproval(payload: {
    plan_id: string;
    step_id: string;
    reason?: string;
  }): Promise<{ approved: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/approvals/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // --- Audit Ledger & Cryptographic Integrity ---
  async getAuditEvents(planId: string): Promise<AuditEventItem[]> {
    const res = await fetch(`${API_BASE}/audit/plan/${planId}`);
    return handleResponse<AuditEventItem[]>(res);
  },

  async verifyAuditIntegrity(planId: string): Promise<AuditVerificationResult> {
    const res = await fetch(`${API_BASE}/audit/verify/${planId}`);
    return handleResponse<AuditVerificationResult>(res);
  },

  // --- Google OAuth Integration ---
  async getGoogleAuthStatus(userId: string = 'operator_1'): Promise<GoogleAuthStatus> {
    try {
      const res = await fetch(`${API_BASE}/auth/google/status?user_id=${userId}`);
      if (!res.ok) {
        return { authenticated: false, configured: false };
      }
      return await res.json();
    } catch {
      return { authenticated: false, configured: false };
    }
  },

  async getGoogleLoginUrl(): Promise<{ authorization_url: string }> {
    const res = await fetch(`${API_BASE}/auth/google/login`);
    return handleResponse(res);
  },

  async logoutGoogle(userId: string = 'operator_1'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/auth/google/logout?user_id=${userId}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // --- Real-Time SSE Stream ---
  subscribeSSE(
    planId: string | null,
    onEvent: (event: AgentEvent) => void,
    onError?: (err: Event) => void
  ): () => void {
    const url = planId
      ? `${API_BASE}/events/stream/${planId}`
      : `${API_BASE}/events/stream`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentEvent;
        onEvent(data);
      } catch (err) {
        console.warn('Failed parsing SSE payload', err);
      }
    };

    // Custom listener for all lifecycle event names
    const eventTypes = [
      'GOAL_RECEIVED',
      'PLAN_CREATED',
      'RISK_EVALUATED',
      'APPROVAL_REQUIRED',
      'APPROVED',
      'REJECTED',
      'EXECUTING',
      'VERIFYING',
      'VERIFIED',
      'RECOVERING',
      'FAILED',
      'COMPLETED',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as AgentEvent;
          onEvent(data);
        } catch (err) {
          console.warn(`Failed parsing SSE event ${type}`, err);
        }
      });
    });

    if (onError) {
      eventSource.onerror = onError;
    }

    return () => {
      eventSource.close();
    };
  },
};
