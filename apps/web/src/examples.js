const base = {
  claim: 'Reduces wrinkle depth by 20% on average in 4 weeks',
  formulaVersion: 'PARIS-RI-001-v3',
};

export const examples = [
  {
    name: 'Matching evidence',
    ...base,
    evidence: `SYNTHETIC REPORT — for demonstration only.
Product: finished formula PARIS-RI-001-v3, applied twice daily for 28 days.
Design: randomized, double-blind, vehicle-controlled study; 120 adults aged 40–65 with visible facial wrinkles; 60 participants per arm. The predefined primary endpoint was mean percentage change in wrinkle depth from baseline at day 28 using validated 3D profilometry, assessed by blinded evaluators. All participants completed the study; analyses followed the predefined protocol.
Results: mean wrinkle-depth reduction at day 28 was 24% in the formula arm (95% CI 21%–27%) and 5% in the vehicle arm (95% CI 2%–8%). The between-group difference was 19 percentage points (95% CI 15–23). The proposed 20% claim refers to mean reduction from baseline, not improvement versus vehicle.
Scope: adults with visible facial wrinkles, twice-daily use. Results do not establish benefit for other formulas, use patterns or populations. The evaluator must confirm that the final wording communicates these conditions.`,
  },
  {
    name: 'Timing mismatch',
    ...base,
    evidence: `SYNTHETIC REPORT — for demonstration only.
Finished formula PARIS-RI-001-v3 was studied in 100 adults aged 40–65 with facial wrinkles, using twice-daily application for eight weeks. A blinded assessor measured wrinkle depth using 3D profilometry. At week 4, mean reduction from baseline was 8% (95% CI 5%–11%). At week 8 it was 24% (95% CI 21%–27%). The study does not report a 20% effect at week 4.`,
  },
  {
    name: 'Missing details',
    ...base,
    evidence: `SYNTHETIC REPORT — for demonstration only.
An ingredient supplier reports that 85% of respondents felt their skin looked better after using a cream. The summary does not identify the finished formula, sample size, measurement method, study duration or numerical wrinkle-depth results.`,
  },
];
