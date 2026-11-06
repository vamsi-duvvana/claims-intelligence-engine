import { describe, expect, it } from 'vitest';
import { assessWithGemini, newClaim, seedClaims, transition } from './workflow';

describe('Workflow gates', () => {
  it.each(seedClaims())('requires human review for $id regardless of score', claim => {
    expect(() => transition(claim, 'business', 'decide', { outcome: 'proceed', notes: 'Go ahead.' })).toThrow();
    expect(() => transition(claim, 'evaluator', 'review', { outcome: 'support', notes: '  ' })).toThrow();
    const reviewed = transition(claim, 'evaluator', 'review', { outcome: 'more-evidence', notes: 'Obtain the full report.' });
    expect(reviewed.stage).toBe('business');
    const closed = transition(reviewed, 'business', 'decide', { outcome: 'hold', notes: 'Wait for the full report.' });
    expect(closed.stage).toBe('closed');
    expect(closed.decision.outcome).toBe('hold');
  });

  it('does not let another role bypass the current handoff', () => {
    const claim = newClaim({ title: 'Serum', text: 'Wrinkle care', brief: 'Test benefit' }, 'new');
    expect(() => transition(claim, 'scientist', 'match', { productId: 'renewal', formulaVersion: 'PARIS-RI-001-v3', notes: 'Match.' })).toThrow();
    expect(() => transition(claim, 'manager', 'match', { productId: 'renewal', formulaVersion: 'UNKNOWN', notes: 'Match.' })).toThrow();
  });

  it('requires a different version for a new formula and clears prior evidence and approvals', () => {
    const claim = { ...seedClaims()[0], stage: 'scientist' };
    expect(() => transition(claim, 'scientist', 'formulate', { formulaAction: 'propose', formulaVersion: claim.formulaVersion, notes: 'Change.' })).toThrow();
    const next = transition(claim, 'scientist', 'formulate', { formulaAction: 'propose', formulaVersion: 'NEW-v1', notes: 'Run new testing.' });
    expect(next).toMatchObject({ stage: 'evaluator', formulaVersion: 'NEW-v1', evidence: '', assessment: null, review: null, decision: null });
    expect(() => transition(next, 'evaluator', 'review', { outcome: 'support', notes: 'Approve.' })).toThrow();
  });

  it('clears assessment and review when the evidence changes', () => {
    const next = transition(seedClaims()[1], 'evaluator', 'evidence', { evidence: 'Revised study.' });
    expect(next.assessment).toBeNull();
    expect(next.review).toBeNull();
    expect(() => transition(next, 'evaluator', 'assess', { assessment: { confidence: 1.5 } })).toThrow();
  });

  it('rejects a malformed live result instead of enabling sign-off', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ confidence: 2 }) });
    try { await expect(assessWithGemini(seedClaims()[0])).rejects.toThrow('invalid assessment'); }
    finally { globalThis.fetch = original; }
  });
});
