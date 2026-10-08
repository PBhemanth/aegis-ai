import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalInput } from '../components/GoalInput';

describe('GoalInput Component', () => {
  it('renders goal textarea, submit button, and execution modes', () => {
    const handlePlanAndExecute = vi.fn();
    render(<GoalInput onPlanAndExecute={handlePlanAndExecute} isLoading={false} />);

    expect(screen.getByPlaceholderText(/Describe an arbitrary natural-language goal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plan & Execute Goal/i })).toBeInTheDocument();
    expect(screen.getByText('Plan Only')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Autonomous/i })).toBeInTheDocument();
  });

  it('populates goal when a demo workflow pill is clicked', () => {
    const handlePlanAndExecute = vi.fn();
    render(<GoalInput onPlanAndExecute={handlePlanAndExecute} isLoading={false} />);

    const demoButton = screen.getByText('GNN Fraud Research & Cited Report');
    fireEvent.click(demoButton);

    const textarea = screen.getByPlaceholderText(/Describe an arbitrary natural-language goal/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Research three recent academic papers on graph neural network');
  });

  it('submits goal and chosen mode when clicked', () => {
    const handlePlanAndExecute = vi.fn();
    render(<GoalInput onPlanAndExecute={handlePlanAndExecute} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(/Describe an arbitrary natural-language goal/i);
    fireEvent.change(textarea, { target: { value: 'Conduct fraud analysis report' } });

    // Switch mode to Plan Only
    fireEvent.click(screen.getByText('Plan Only'));

    const submitBtn = screen.getByRole('button', { name: /Plan & Execute Goal/i });
    fireEvent.click(submitBtn);

    expect(handlePlanAndExecute).toHaveBeenCalledWith('Conduct fraud analysis report', 'plan_only');
  });
});
