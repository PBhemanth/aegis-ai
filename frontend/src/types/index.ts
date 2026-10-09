/**
 * CampusPilot Typed Interfaces
 * Synchronized with Aegis Backend Schemas
 */

export type RiskTier =
  | 'TIER_0_READ'
  | 'TIER_1_REVERSIBLE'
  | 'TIER_2_MUTATING'
  | 'TIER_3_DESTRUCTIVE';

export type StepStatus =
  | 'PENDING'
  | 'PROPOSED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'FAILED'
  | 'REJECTED'
  | 'RECOVERING';

export type PlanStatus =
  | 'PLANNING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'HALTED';

export type ExecutionMode = 'plan_only' | 'assisted' | 'autonomous';

export interface ArxivPaper {
  arxiv_id: string;
  title: string;
  authors: string[];
  published?: string;
  summary: string;
  pdf_url?: string;
  primary_category?: string;
  source_url?: string;
}

export interface ArxivExecutionResult {
  query?: string;
  total_found?: number;
  papers?: ArxivPaper[];
}

export interface DocumentSynthesizerResult {
  file_name?: string;
  title?: string;
  content?: string;
  format?: string;
  size_bytes?: number;
  section_count?: number;
  sha256_checksum?: string;
  local_sandbox_path?: string | null;
}

export interface StepDefinition {
  id: string;
  plan_id: string;
  step_order: number;
  title: string;
  tool_name: string;
  parameters_json?: string;
  parameters?: Record<string, unknown>;
  risk_tier: RiskTier;
  dependencies?: string[];
  status: StepStatus;
  approval_nonce?: string | null;
  action_fingerprint?: string | null;
  execution_result_json?: string | null;
  execution_result?: Record<string, any> | null;
  error_message?: string | null;
}

export interface PlanData {
  id: string;
  user_id: string;
  raw_goal: string;
  goal_summary: string;
  status: PlanStatus;
  created_at: string;
  completed_at?: string | null;
  steps: StepDefinition[];
}

export interface CapabilityGapReport {
  has_gap: boolean;
  missing_capabilities: string[];
  unsupported_features: string[];
  explanation: string;
  proposed_alternative?: string | null;
  can_partially_execute?: boolean;
  // Optional backwards compatibility aliases
  is_supported?: boolean;
  unsupported_capabilities?: string[];
  missing_tools?: string[];
  alternative_proposals?: string[];
}

export interface ExecutionReceipt {
  step_id: string;
  plan_id: string;
  tool_name: string;
  status: string;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  result_data: Record<string, unknown>;
  error_message?: string | null;
  action_fingerprint?: string;
}

export interface AssertionResult {
  assertion: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  details?: string | null;
}

export interface VerificationProof {
  id?: string;
  step_id: string;
  verifier_name: string;
  status: 'PASSED' | 'FAILED';
  assertions: AssertionResult[];
  external_state_delta?: Record<string, unknown>;
  latency_ms: number;
  verified_at?: string;
}

export interface AuditEventItem {
  id: string;
  plan_id: string;
  step_id?: string | null;
  event_type: string;
  severity: string;
  actor: string;
  payload: Record<string, unknown>;
  prev_proof_hash?: string | null;
  proof_hash: string;
  timestamp: string;
}

export interface AuditVerificationResult {
  plan_id: string;
  is_valid: boolean;
  total_events: number;
  broken_event_id?: string | null;
  details: string;
  verified_at: string;
}

export interface AgentEvent {
  id: string;
  timestamp: string;
  event_type: string;
  plan_id?: string | null;
  step_id?: string | null;
  actor: string;
  severity: string;
  message?: string | null;
  data: Record<string, unknown>;
  proof_hash?: string | null;
  prev_proof_hash?: string | null;
}

export interface GoogleAuthStatus {
  authenticated: boolean;
  user_id?: string;
  scopes_granted?: string[];
  configured?: boolean;
}

export interface PlanExecutionSummary {
  plan_id: string;
  status: string;
  steps_total: number;
  steps_verified: number;
  current_step_id?: string | null;
  halt_reason?: string | null;
  receipts: ExecutionReceipt[];
}
