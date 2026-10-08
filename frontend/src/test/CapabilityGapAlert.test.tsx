import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapabilityGapAlert } from '../components/CapabilityGapAlert';
import { CapabilityGapReport } from '../types';

describe('CapabilityGapAlert Component', () => {
  const dummyReport: CapabilityGapReport = {
    is_supported: false,
    unsupported_capabilities: ['Automated financial trading', 'Executing raw shell commands'],
    missing_tools: ['binance_trader', 'system_bash'],
    explanation: 'CampusPilot enforces safety boundaries and does not permit monetary trading.',
    alternative_proposals: ['Perform academic market research on arXiv', 'Generate a simulated analysis report'],
  };

  it('renders transparent capability gap details and safety boundary rationale', () => {
    render(<CapabilityGapAlert report={dummyReport} rawGoal="Trade crypto for me" />);

    expect(screen.getByText(/Capability Gap Detected/i)).toBeInTheDocument();
    expect(screen.getByText('"Trade crypto for me"')).toBeInTheDocument();
    expect(screen.getByText('Automated financial trading')).toBeInTheDocument();
    expect(screen.getByText(/CampusPilot enforces safety boundaries/i)).toBeInTheDocument();
    expect(screen.getByText(/Perform academic market research on arXiv/i)).toBeInTheDocument();
  });
});
