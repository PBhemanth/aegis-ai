import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApprovalModal } from '../components/ApprovalModal';
import { StepDefinition } from '../types';

describe('ApprovalModal Component', () => {
  const dummyStep: StepDefinition = {
    id: 'step_danger_1',
    plan_id: 'plan_1',
    step_order: 1,
    title: 'Purge Unnecessary Files',
    tool_name: 'google_drive_delete_file',
    risk_tier: 'TIER_3_DESTRUCTIVE',
    status: 'AWAITING_APPROVAL',
  };

  const dummyChallenge = {
    approval_nonce: 'nonce_secret_hmac_1234567890abcdef',
    action_fingerprint: 'fingerprint_hash_abcdef1234567890',
    expires_at: Math.floor(Date.now() / 1000) + 600,
    risk_evaluation: {
      risk_tier: 'TIER_3_DESTRUCTIVE',
      requires_approval: true,
      requires_typed_phrase: 'DELETE',
      rationale: 'Permanent deletion of files cannot be undone.',
    },
  };

  it('renders modal with action details, risk tier, and cryptographic fingerprint', () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();
    const handleClose = vi.fn();

    render(
      <ApprovalModal
        step={dummyStep}
        challenge={dummyChallenge}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleClose}
        isSubmitting={false}
      />
    );

    expect(screen.getByText('Human Authorization Required')).toBeInTheDocument();
    expect(screen.getByText('Purge Unnecessary Files')).toBeInTheDocument();
    expect(screen.getByText('google_drive_delete_file')).toBeInTheDocument();
    expect(screen.getByText('TIER_3_DESTRUCTIVE')).toBeInTheDocument();
  });

  it('enforces typed confirmation phrase for Tier 3 destructive operations', () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();
    const handleClose = vi.fn();

    render(
      <ApprovalModal
        step={dummyStep}
        challenge={dummyChallenge}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleClose}
        isSubmitting={false}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /Authorize & Execute Step/i });
    expect(approveBtn).toBeDisabled();

    // Type incorrect phrase
    const input = screen.getByPlaceholderText(/Type "DELETE" to authorize/i);
    fireEvent.change(input, { target: { value: 'WRONG' } });
    expect(approveBtn).toBeDisabled();

    // Type correct phrase
    fireEvent.change(input, { target: { value: 'DELETE' } });
    expect(approveBtn).not.toBeDisabled();

    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledWith('DELETE');
  });

  it('calls onReject when Reject Action is clicked', () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();
    const handleClose = vi.fn();

    render(
      <ApprovalModal
        step={dummyStep}
        challenge={dummyChallenge}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleClose}
        isSubmitting={false}
      />
    );

    const rejectBtn = screen.getByRole('button', { name: /Reject Action/i });
    fireEvent.click(rejectBtn);

    expect(handleReject).toHaveBeenCalled();
  });
});
