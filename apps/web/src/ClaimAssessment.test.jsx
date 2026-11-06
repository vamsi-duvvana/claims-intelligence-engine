import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClaimAssessment from './ClaimAssessment';
import { claimDraftExample, handoffExamples } from './examples';

describe('Four-role workflow', () => {
  it('completes a newly raised claim using editable dummy data at every handoff', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: '+ Raise a claim' }));
    await user.click(screen.getByRole('button', { name: 'Fill dummy claim' }));
    expect(screen.getByLabelText('Proposed claim')).toHaveValue(claimDraftExample.text);
    expect(screen.getByLabelText('Business brief')).toHaveValue(claimDraftExample.brief);
    await user.type(screen.getByLabelText('Project title'), ' · demo');
    await user.click(screen.getByRole('button', { name: 'Send to Claim manager' }));
    await user.click(screen.getByRole('button', { name: /Alex Martin/ }));
    await user.click(screen.getByRole('button', { name: 'Fill dummy match' }));
    expect(screen.getByLabelText('Existing formula')).toHaveValue('PARIS-RI-002-v1');
    await user.click(screen.getByRole('button', { name: 'Send to Scientist' }));
    await user.click(screen.getByRole('button', { name: /Léa Moreau/ }));
    await user.click(screen.getByRole('button', { name: 'Fill dummy recommendation' }));
    await user.click(screen.getByRole('button', { name: 'Send to Evaluator' }));
    await user.click(screen.getByRole('button', { name: /Sofia Bernard/ }));
    expect(screen.getByRole('button', { name: 'Sign off & send to Business' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Fill dummy study' }));
    expect(screen.getByLabelText('Study evidence').value).toContain('PARIS-RI-002-v1');
    await user.click(screen.getByRole('button', { name: 'Load dummy assessment' }));
    await user.click(screen.getByRole('button', { name: 'Fill dummy review' }));
    expect(screen.getByLabelText('Your reasoning and conditions')).toHaveValue(handoffExamples.evaluator.medium.notes);
    await user.click(screen.getByRole('button', { name: 'Sign off & send to Business' }));
    await user.click(screen.getByRole('button', { name: /Maya Laurent/ }));
    expect(screen.getByText(handoffExamples.evaluator.medium.notes)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fill dummy decision' }));
    await user.click(screen.getByRole('button', { name: 'Record business decision' }));
    expect(screen.getByText('Hold for further work')).toBeInTheDocument();
    expect(screen.getByText(handoffExamples.business.medium.notes)).toBeInTheDocument();
    expect(screen.getAllByText(/Decision recorded/).length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows all confidence cases and blocks a business decision before human review', () => {
    render(<ClaimAssessment />);
    for (const score of ['92%', '64%', '28%']) expect(screen.getAllByText(score).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Record business decision' })).toBeDisabled();
    expect(screen.getByText('HUMAN REVIEW PENDING')).toBeInTheDocument();
  });

  it('demonstrates evaluator judgement on the medium-confidence case, then a business decision', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: /Sofia Bernard/ }));
    expect(screen.getByText('HUMAN IN THE LOOP')).toBeInTheDocument();
    expect(screen.getByText('Justified: No')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Evaluator conclusion'), 'support');
    await user.type(screen.getByLabelText('Your reasoning and conditions'), 'Support only revised pilot wording; do not use the quantified 20% claim.');
    await user.click(screen.getByRole('button', { name: 'Sign off & send to Business' }));
    await user.click(screen.getByRole('button', { name: /Maya Laurent/ }));
    expect(screen.getByText('HUMAN REVIEW RECORDED')).toBeInTheDocument();
    expect(screen.getByText('Support only revised pilot wording; do not use the quantified 20% claim.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Business decision'), 'hold');
    await user.type(screen.getByLabelText('Decision rationale'), 'Wait for the confirmatory study before investment.');
    await user.click(screen.getByRole('button', { name: 'Record business decision' }));
    expect(screen.getByText('Hold for further work')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('takes a new claim through matching, a proposed formula and evaluator review', async () => {
    const user = userEvent.setup();
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: '+ Raise a claim' }));
    await user.type(screen.getByLabelText('Project title'), 'New serum');
    await user.type(screen.getByLabelText('Proposed claim'), 'Reduces visible wrinkles in four weeks');
    await user.type(screen.getByLabelText('Business brief'), 'Adults aged 40–65, twice daily.');
    await user.click(screen.getByRole('button', { name: 'Send to Claim manager' }));
    await user.click(screen.getByRole('button', { name: /Alex Martin/ }));
    await user.type(screen.getByLabelText('Why is this match relevant?'), 'Existing wrinkle-care serum with related active ingredients.');
    await user.click(screen.getByRole('button', { name: 'Send to Scientist' }));
    await user.click(screen.getByRole('button', { name: /Léa Moreau/ }));
    await user.selectOptions(screen.getByLabelText('Formula recommendation'), 'propose');
    await user.type(screen.getByLabelText('Proposed formula version'), 'PARIS-RI-001-v4');
    await user.type(screen.getByLabelText('Scientific rationale and next tests'), 'Propose a revised concentration and a new finished-formula study.');
    await user.click(screen.getByRole('button', { name: 'Send to Evaluator' }));
    await user.click(screen.getByRole('button', { name: /Sofia Bernard/ }));
    expect(screen.getByLabelText('Study evidence')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Sign off & send to Business' })).toBeDisabled();
    await user.type(screen.getByLabelText('Study evidence'), 'Synthetic new-formula pilot results for PARIS-RI-001-v4.');
    await user.click(screen.getByRole('button', { name: 'Load dummy assessment' }));
    expect(screen.getByText('SCRIPTED DUMMY RESULT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign off & send to Business' })).toBeEnabled();
  });

  it('clears the old result and disables role changes during a live request', async () => {
    const user = userEvent.setup();
    let finish;
    const fetch = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetch);
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: /Sofia Bernard/ }));
    await user.click(screen.getByRole('button', { name: 'Evaluate with Gemini' }));
    expect(screen.getByRole('button', { name: /Maya Laurent/ })).toBeDisabled();
    expect(screen.getByLabelText('Study evidence')).toBeDisabled();
    expect(screen.queryByText('SCRIPTED DUMMY RESULT')).not.toBeInTheDocument();
    finish({ ok: false, json: async () => ({ message: 'Gemini is not configured.' }) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Gemini is not configured.');
    expect(screen.getByRole('button', { name: 'Sign off & send to Business' })).toBeDisabled();
    expect(JSON.parse(fetch.mock.calls[0][1].body).formulaVersion).toBe('PARIS-RI-002-v1');
  });

  it('renders a live result as Gemini, and editing the evidence invalidates it', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      assessmentId: 'saved-live-123', verdict: 'SUPPORTED', confidence: .83,
      reasoning: 'A controlled test response.', missingEvidence: [],
    }) }));
    render(<ClaimAssessment />);
    await user.click(screen.getByRole('button', { name: /Sofia Bernard/ }));
    await user.click(screen.getByRole('button', { name: 'Evaluate with Gemini' }));
    expect(await screen.findByText('GEMINI ASSESSMENT')).toBeInTheDocument();
    expect(screen.getByText('Justified: Yes')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Study evidence'), ' Updated.');
    expect(screen.queryByText('GEMINI ASSESSMENT')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign off & send to Business' })).toBeDisabled();
  });
});
