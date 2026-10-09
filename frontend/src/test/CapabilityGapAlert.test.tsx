import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapabilityGapAlert } from '../components/CapabilityGapAlert';
import { CapabilityGapReport } from '../types';

describe('CapabilityGapAlert Component', () => {
  const backendReport: CapabilityGapReport = {
    has_gap: true,
    missing_capabilities: ['finance.trading'],
    unsupported_features: ['Financial exchange trading or fund transfers'],
    explanation: 'CampusPilot enforces safety boundaries and does not permit monetary trading.',
    proposed_alternative: 'Perform academic market research on arXiv and generate a report.',
    can_partially_execute: false,
  };

  it('renders transparent capability gap details with backend schema format', () => {
    render(<CapabilityGapAlert report={backendReport} rawGoal="Trade crypto for me" />);

    expect(screen.getByText(/Capability Gap Detected/i)).toBeInTheDocument();
    expect(screen.getByText('"Trade crypto for me"')).toBeInTheDocument();
    expect(screen.getByText('Financial exchange trading or fund transfers')).toBeInTheDocument();
    expect(screen.getByText(/CampusPilot enforces safety boundaries/i)).toBeInTheDocument();
    expect(screen.getByText(/Perform academic market research on arXiv and generate a report./i)).toBeInTheDocument();
  });

  it('handles empty or missing arrays gracefully without throwing errors', () => {
    const sparseReport = {
      has_gap: true,
      explanation: 'Capability gap explanation',
    } as unknown as CapabilityGapReport;

    render(<CapabilityGapAlert report={sparseReport} rawGoal="Test action" />);
    expect(screen.getByText(/Capability Gap Detected/i)).toBeInTheDocument();
    expect(screen.getByText('Capability gap explanation')).toBeInTheDocument();
  });
});
