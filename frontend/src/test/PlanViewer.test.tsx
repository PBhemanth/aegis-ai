import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanViewer } from '../components/PlanViewer';
import { PlanData } from '../types';

describe('PlanViewer Component', () => {
  const dummyPlan: PlanData = {
    id: 'plan_test_100',
    user_id: 'user_1',
    raw_goal: 'Research papers and create doc',
    goal_summary: 'Research and Synthesize',
    status: 'RUNNING',
    created_at: new Date().toISOString(),
    steps: [
      {
        id: 'step_1',
        plan_id: 'plan_test_100',
        step_order: 1,
        title: 'Search arXiv for Fraud Papers',
        tool_name: 'web_search_arxiv',
        risk_tier: 'TIER_0_READ',
        status: 'VERIFIED',
      },
      {
        id: 'step_2',
        plan_id: 'plan_test_100',
        step_order: 2,
        title: 'Delete Outdated File',
        tool_name: 'google_drive_delete_file',
        risk_tier: 'TIER_3_DESTRUCTIVE',
        status: 'AWAITING_APPROVAL',
      },
    ],
  };

  it('renders plan summary, steps, risk tiers, and status badges', () => {
    const handleExecute = vi.fn();
    const handleApproval = vi.fn();
    const handleProof = vi.fn();

    render(
      <PlanViewer
        plan={dummyPlan}
        onExecuteStep={handleExecute}
        onRequestApproval={handleApproval}
        onInspectProof={handleProof}
        executingStepId={null}
      />
    );

    expect(screen.getByText(/Research and Synthesize/i)).toBeInTheDocument();
    expect(screen.getByText('Search arXiv for Fraud Papers')).toBeInTheDocument();
    expect(screen.getByText('Delete Outdated File')).toBeInTheDocument();
    expect(screen.getByText(/TIER 0 • READ ONLY/i)).toBeInTheDocument();
    expect(screen.getByText(/TIER 3 • DESTRUCTIVE/i)).toBeInTheDocument();
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('APPROVAL REQUIRED')).toBeInTheDocument();
  });

  it('triggers onRequestApproval when Review & Approve is clicked on approval-gated step', () => {
    const handleExecute = vi.fn();
    const handleApproval = vi.fn();
    const handleProof = vi.fn();

    render(
      <PlanViewer
        plan={dummyPlan}
        onExecuteStep={handleExecute}
        onRequestApproval={handleApproval}
        onInspectProof={handleProof}
        executingStepId={null}
      />
    );

    const reviewBtn = screen.getByRole('button', { name: /Review and approve action/i });
    fireEvent.click(reviewBtn);

    expect(handleApproval).toHaveBeenCalledWith(dummyPlan.steps[1]);
  });

  it('triggers onInspectProof when Inspect Proof is clicked on verified step', () => {
    const handleExecute = vi.fn();
    const handleApproval = vi.fn();
    const handleProof = vi.fn();

    render(
      <PlanViewer
        plan={dummyPlan}
        onExecuteStep={handleExecute}
        onRequestApproval={handleApproval}
        onInspectProof={handleProof}
        executingStepId={null}
      />
    );

    const proofBtn = screen.getByRole('button', { name: /Inspect cryptographic verification proof/i });
    fireEvent.click(proofBtn);

    expect(handleProof).toHaveBeenCalledWith('step_1');
  });
});
