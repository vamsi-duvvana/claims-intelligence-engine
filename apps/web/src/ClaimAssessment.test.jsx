import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClaimAssessment from './ClaimAssessment';

describe('Claim assessment form', () => {
  it('submits evidence, renders an insufficient result and clears it when input changes', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      assessmentId: 'saved-123', verdict: 'INSUFFICIENT_EVIDENCE', justified: false,
      confidence: 0.92, reasoning: 'Week-four results are missing.', missingEvidence: ['Week-four results'],
    }) });
    vi.stubGlobal('fetch', fetch);
    render(<ClaimAssessment />);
    expect(screen.getByRole('button', { name: /assess claim/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Missing details' }));
    await user.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByText('Justified: No')).toBeInTheDocument();
    expect(screen.getByText('More evidence is needed')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Week-four results are missing.')).toBeInTheDocument();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/claims/assess');
    expect(JSON.parse(options.body).formulaVersion).toBe('PARIS-RI-001-v3');
    await user.type(screen.getByLabelText('Proposed claim'), ' revised');
    expect(screen.queryByText('Justified: No')).not.toBeInTheDocument();
  });

  it('shows API errors and leaves the form usable', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Could not save the assessment.' }) }));
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: 'Timing mismatch' }));
    await user.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the assessment.');
    expect(screen.getByRole('button', { name: /assess claim/i })).toBeEnabled();
    expect(screen.queryByText('Justified: No')).not.toBeInTheDocument();
  });

  it('disables editing and repeat submission while the request is pending', async () => {
    const user = userEvent.setup();
    let finish;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })));
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: 'Matching evidence' }));
    await user.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(screen.getByLabelText('Proposed claim')).toBeDisabled();
    expect(screen.getByRole('button', { name: /reviewing evidence/i })).toBeDisabled();
    finish({ ok: false, json: async () => ({ message: 'Try again.' }) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again.');
  });
});
