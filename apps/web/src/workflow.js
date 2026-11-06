import { products, scenarios } from './examples';

export const stageLabels = { manager: 'Product matching', scientist: 'Formula review', evaluator: 'Evaluator review', business: 'Business decision', closed: 'Decision recorded' };

export function demoAssessment(scenario) {
  const { confidence, verdict, reasoning, missingEvidence } = scenarios[scenario];
  return { confidence, verdict, justified: verdict === 'SUPPORTED', reasoning, missingEvidence: [...missingEvidence], source: 'demo' };
}

export function seedClaims() {
  return ['high', 'medium', 'low'].map((scenario, index) => ({
    id: `CLM-00${index + 1}`,
    title: ['Renewal serum · four-week claim', 'Renewal light · pilot study', 'Renewal night · early evidence'][index],
    text: 'Reduces wrinkle depth by 20% on average in 4 weeks',
    brief: 'Support a measurable wrinkle-care benefit for adults aged 40–65, with twice-daily use.',
    scenario, stage: 'evaluator', productId: products[index].id, formulaVersion: products[index].formulas[0],
    managerNotes: ['Closest existing product and formula identified.', 'Related cream identified; finished-formula pilot available.', 'Related night cream identified; direct evidence still limited.'][index],
    scientistNotes: ['Keep the existing formula and evaluate the completed study.', 'Keep the pilot formula for evaluation; consider a new version if the results are inconclusive.', 'No new formula proposed yet. Establish the evidence gap before reformulating.'][index],
    formulaAction: 'keep', evidence: scenarios[scenario].evidence,
    assessment: demoAssessment(scenario), review: null, decision: null,
    history: [
      { role: 'Business', text: 'Raised the claim and target benefit.' },
      { role: 'Claim manager', text: `Matched ${products[index].name}.` },
      { role: 'Scientist', text: 'Reviewed the formula; sent to Evaluator.' },
    ],
  }));
}

export function newClaim({ title, text, brief }, id) {
  if (!title.trim() || !text.trim() || !brief.trim()) throw new Error('Add a title, claim and business brief.');
  if (title.length > 120 || text.length > 2000 || brief.length > 2000) throw new Error('The claim exceeds the field limits.');
  return {
    id, title: title.trim(), text: text.trim(), brief: brief.trim(), stage: 'manager', scenario: 'medium',
    productId: '', formulaVersion: '', managerNotes: '', scientistNotes: '', formulaAction: 'keep',
    evidence: '', assessment: null, review: null, decision: null,
    history: [{ role: 'Business', text: 'Raised the claim and target benefit.' }],
  };
}

function notes(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error('Add a review note of up to 2,000 characters.');
  return value.trim();
}

export function transition(claim, role, action, data = {}) {
  let change;
  let message;
  if (action === 'match' && role === 'manager' && claim.stage === 'manager') {
    const product = products.find(item => item.id === data.productId);
    if (!product?.formulas.includes(data.formulaVersion)) throw new Error('Choose a product and one of its existing formulas.');
    change = { productId: product.id, formulaVersion: data.formulaVersion, managerNotes: notes(data.notes), stage: 'scientist' };
    message = `Matched ${product.name}; sent to Scientist.`;
  } else if (action === 'formulate' && role === 'scientist' && claim.stage === 'scientist') {
    if (!['keep', 'propose'].includes(data.formulaAction)) throw new Error('Choose an existing or proposed formula.');
    const formulaVersion = data.formulaAction === 'propose' ? data.formulaVersion?.trim() : claim.formulaVersion;
    if (!formulaVersion || formulaVersion.length > 120) throw new Error('Enter a valid formula version.');
    if (data.formulaAction === 'propose' && formulaVersion === claim.formulaVersion) throw new Error('Use a new version reference for the proposed formula.');
    change = { formulaAction: data.formulaAction, formulaVersion, scientistNotes: notes(data.notes), stage: 'evaluator', evidence: '', assessment: null, review: null, decision: null };
    message = `${data.formulaAction === 'propose' ? 'Proposed a new formula' : 'Kept the matched formula'}; sent to Evaluator.`;
  } else if (action === 'evidence' && role === 'evaluator' && claim.stage === 'evaluator') {
    if (typeof data.evidence !== 'string' || data.evidence.length > 30000) throw new Error('Study text must be within 30,000 characters.');
    change = { evidence: data.evidence, assessment: null, review: null, decision: null };
    message = null;
  } else if (action === 'assess' && role === 'evaluator' && claim.stage === 'evaluator') {
    if (!claim.evidence.trim() || !claim.formulaVersion) throw new Error('Add study evidence and a formula version first.');
    if (!data.assessment || !Number.isFinite(data.assessment.confidence) || data.assessment.confidence < 0 || data.assessment.confidence > 1) throw new Error('The assessment is invalid.');
    change = { assessment: data.assessment, review: null, decision: null };
    message = data.assessment.source === 'demo' ? 'Loaded a scripted dummy assessment.' : 'Received a Gemini assessment.';
  } else if (action === 'review' && role === 'evaluator' && claim.stage === 'evaluator') {
    if (!claim.assessment) throw new Error('Assess the evidence before signing off.');
    if (!['support', 'more-evidence', 'not-supported'].includes(data.outcome)) throw new Error('Choose your human review outcome.');
    change = { review: { outcome: data.outcome, notes: notes(data.notes), reviewer: 'Sofia Bernard' }, stage: 'business' };
    message = 'Recorded human review; sent the summary to Business.';
  } else if (action === 'decide' && role === 'business' && claim.stage === 'business') {
    if (!claim.review) throw new Error('An evaluator must review the evidence first.');
    if (!['proceed', 'hold', 'stop'].includes(data.outcome)) throw new Error('Choose a business decision.');
    change = { decision: { outcome: data.outcome, notes: notes(data.notes), owner: 'Maya Laurent' }, stage: 'closed' };
    message = `Business decision: ${data.outcome}.`;
  } else {
    throw new Error('This action belongs to another role or workflow stage.');
  }
  return { ...claim, ...change, history: message ? [...claim.history, { role: { business: 'Business', manager: 'Claim manager', scientist: 'Scientist', evaluator: 'Evaluator' }[role], text: message }] : claim.history };
}

export async function assessWithGemini(claim, signal) {
  const response = await fetch('/api/claims/assess', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ claim: claim.text, formulaVersion: claim.formulaVersion, evidence: claim.evidence }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Gemini could not complete this assessment.');
  if (!['SUPPORTED', 'NOT_SUPPORTED', 'INSUFFICIENT_EVIDENCE'].includes(data.verdict)
    || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1
    || typeof data.reasoning !== 'string' || !Array.isArray(data.missingEvidence)
    || data.missingEvidence.some(item => typeof item !== 'string') || typeof data.assessmentId !== 'string') {
    throw new Error('The API returned an invalid assessment.');
  }
  return { ...data, justified: data.verdict === 'SUPPORTED', source: 'gemini' };
}
