export const products = [
  { id: 'renewal', name: 'Renewal face serum', category: 'Wrinkle care', formulas: ['PARIS-RI-001-v3', 'PARIS-RI-001-v2'], match: 'Closest match: finished formula with a four-week wrinkle-depth study.' },
  { id: 'renewal-light', name: 'Renewal light cream', category: 'Wrinkle care', formulas: ['PARIS-RI-002-v1'], match: 'Related product: similar actives, but a different texture and finished formula.' },
  { id: 'renewal-night', name: 'Renewal night cream', category: 'Wrinkle care', formulas: ['PARIS-RI-003-v2'], match: 'Related product: night-use formulation; needs its own claim-relevant evidence.' },
];

export const claimDraftExample = {
  title: 'Renewal light cream · new launch claim',
  text: 'Reduces wrinkle depth by 20% on average in 4 weeks',
  brief: 'Explore a measurable wrinkle-care claim for adults aged 40–65 using the cream twice daily. Review the existing product and pilot evidence before deciding whether to invest in a confirmatory study.',
};

export const handoffExamples = {
  manager: { productId: 'renewal-light', formulaVersion: 'PARIS-RI-002-v1', notes: 'Renewal light cream is the closest existing texture and benefit match. Start with formula PARIS-RI-002-v1 and ask the scientist to review its pilot data.' },
  scientist: { notes: 'Keep the matched formula for this evaluation. Assess its finished-formula study before deciding whether to reformulate or commission further tests.' },
  evaluator: {
    high: { outcome: 'support', notes: 'The synthetic study supports the average four-week benefit for the studied adults and twice-daily use. Keep those conditions explicit in the wording and verify the full report before publication.' },
    medium: { outcome: 'more-evidence', notes: 'The pilot interval includes improvements below 20%, and comparator results are missing. Request a confirmatory study and hold the quantified wording for now.' },
    low: { outcome: 'more-evidence', notes: 'Consumer impressions do not substantiate a quantified wrinkle-depth claim. Request a verified finished-formula study with four-week measurements before reconsidering it.' },
  },
  business: {
    high: { outcome: 'proceed', notes: 'Proceed to the next internal review stage under the evaluator’s stated conditions. This is not permission to publish the claim or launch the product.' },
    medium: { outcome: 'hold', notes: 'Hold the 20% claim and further launch investment until the evaluator has the confirmatory study. Revisit the wording once the uncertainty is resolved.' },
    low: { outcome: 'hold', notes: 'Hold this claim until direct finished-formula evidence is available. Ask the scientific team to define the required study before further investment.' },
  },
};

export const scenarios = {
  high: {
    label: 'Strong evidence', confidence: 0.92, verdict: 'SUPPORTED',
    reasoning: 'The synthetic finished-formula study reports a 24% average reduction in wrinkle depth at four weeks (95% CI 21–27%). It supports the proposed 20% average reduction for the studied population and twice-daily use. Confirm those conditions in the final wording.',
    missingEvidence: [],
    evidence: 'SYNTHETIC STUDY — not real clinical evidence. Finished formula PARIS-RI-001-v3. Randomized, double-blind, vehicle-controlled study of 120 adults aged 40–65 with visible facial wrinkles; twice-daily use for 28 days. Prespecified endpoint: percentage change in wrinkle depth from baseline by validated 3D profilometry. At day 28: formula arm 24% mean reduction (95% CI 21–27%); vehicle arm 5% (95% CI 2–8%). All participants completed the study. The 20% claim refers to change from baseline, not change versus vehicle. Scope is limited to the studied population and use conditions.',
  },
  medium: {
    label: 'Borderline evidence', confidence: 0.64, verdict: 'INSUFFICIENT_EVIDENCE',
    reasoning: 'The synthetic pilot suggests a 21% average improvement, but its wide interval includes effects below 20%. The sample is small and the summary omits comparator results. An evaluator needs to decide whether to request a confirmatory study or revise the claim.',
    missingEvidence: ['A confirmatory study with adequate precision', 'Comparator results and full analysis methods'],
    evidence: 'SYNTHETIC PILOT — not real clinical evidence. Finished formula PARIS-RI-002-v1, twice daily for four weeks. Pilot study in 38 adults aged 40–65 with visible facial wrinkles. Mean wrinkle-depth reduction was 21%, with a 95% confidence interval of 12–30%. A comparator was mentioned but its results and full analysis plan were not supplied. These pilot results require evaluator judgement and do not establish a 20% promise by themselves.',
  },
  low: {
    label: 'Limited evidence', confidence: 0.28, verdict: 'INSUFFICIENT_EVIDENCE',
    reasoning: 'Only a small consumer-perception summary is available. It does not establish the formula identity, four-week wrinkle-depth endpoint or a quantified reduction. The scripted low score illustrates uncertainty; request direct finished-formula evidence before considering this claim.',
    missingEvidence: ['Verified finished-formula study', 'Four-week wrinkle-depth measurements', 'Methods, population and uncertainty'],
    evidence: 'SYNTHETIC SUPPLIER SUMMARY — not real clinical evidence. Fifteen volunteers said their skin felt smoother after using a cream. The report does not identify a formula version, treatment duration, comparator or objective wrinkle-depth measurement. No quantified wrinkle reduction or uncertainty is reported.',
  },
};

export const roleInfo = {
  business: { label: 'Business', person: 'Maya Laurent', initials: 'ML', title: 'Claims & decisions', description: 'Raise a claim, follow the evidence and make the final business decision.' },
  manager: { label: 'Claim manager', person: 'Alex Martin', initials: 'AM', title: 'Find the closest fit', description: 'Connect the proposed benefit to nearby products and existing formulas.' },
  scientist: { label: 'Scientist', person: 'Dr. Léa Moreau', initials: 'LM', title: 'Strengthen the formula', description: 'Review the match and decide whether a new formula needs to be proposed.' },
  evaluator: { label: 'Evaluator', person: 'Sofia Bernard', initials: 'SB', title: 'Evidence meets judgement', description: 'Assess the study, review the recommendation and send your conclusion to Business.' },
};
