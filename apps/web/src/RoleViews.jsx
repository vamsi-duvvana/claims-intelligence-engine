import { useState } from 'react';
import { products } from './examples';
import { stageLabels } from './workflow';

const outcomeLabels = { support: 'Supported with stated conditions', 'more-evidence': 'More evidence or revised wording needed', 'not-supported': 'Not supported by the studies', proceed: 'Proceed to the next business stage', hold: 'Hold for further work', stop: 'Do not proceed' };

function Waiting({ claim }) {
  return <div className="waiting"><span aria-hidden="true">↗</span><p>This handoff is currently at <strong>{stageLabels[claim.stage]}</strong>. Switch to that role to continue. Earlier handoffs are read-only in this demo.</p></div>;
}

export function AssessmentResult({ result }) {
  return <div className="assessment-result">
    <div className="section-heading"><p className="eyebrow">{result.source === 'demo' ? 'SCRIPTED DUMMY RESULT' : 'GEMINI ASSESSMENT'}</p><span className={`confidence ${result.confidence >= .8 ? 'high' : result.confidence >= .5 ? 'medium' : 'low'}`}>{Math.round(result.confidence * 100)}%<small>confidence</small></span></div>
    <h3>Justified: {result.justified ? 'Yes' : 'No'}</h3>
    {result.verdict === 'INSUFFICIENT_EVIDENCE' && <p className="tagline">Evidence is insufficient to substantiate the claim.</p>}
    <p className="reasoning">{result.reasoning}</p>
    {result.missingEvidence.length > 0 && <div className="evidence-gaps"><h4>What still needs attention</h4><ul>{result.missingEvidence.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <p className="help">{result.source === 'demo' ? 'This score and reasoning are dummy data, not a model response.' : 'Model-reported certainty, not a clinical probability or calibrated score.'} A person must review the recommendation.</p>
    {result.assessmentId && <p className="help">Saved assessment: {result.assessmentId}</p>}
  </div>;
}

export function NewClaimForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ title: '', text: '', brief: '' });
  return <section className="panel"><p className="eyebrow">BUSINESS · NEW CLAIM</p><h2>What should the product promise?</h2><form onSubmit={event => { event.preventDefault(); onSubmit(form); }}>
    <label htmlFor="new-title">Project title</label><input id="new-title" maxLength={120} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Renewal serum launch" />
    <label htmlFor="new-claim">Proposed claim</label><textarea id="new-claim" maxLength={2000} required value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="The exact wording to substantiate" />
    <label htmlFor="new-brief">Business brief</label><textarea id="new-brief" maxLength={2000} required value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} placeholder="Target benefit, audience and use conditions" />
    <div className="button-row"><button className="primary">Send to Claim manager</button><button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
  </form></section>;
}

export function ManagerView({ claim, onAction }) {
  const [productId, setProductId] = useState(claim.productId || products[0].id);
  const product = products.find(item => item.id === productId);
  const [formulaVersion, setFormulaVersion] = useState(claim.formulaVersion || product.formulas[0]);
  const [notes, setNotes] = useState(claim.managerNotes);
  const active = claim.stage === 'manager';
  return <section className="panel"><p className="eyebrow">CLAIM MANAGER · PRODUCT &amp; FORMULA MATCH</p><h2>Find a relevant starting point</h2><p className="muted">These nearby products are a dummy shortlist for this wrinkle-care portfolio. Confirm relevance before the scientist reviews them.</p>
    {!active && <Waiting claim={claim} />}
    <form onSubmit={e => { e.preventDefault(); onAction('match', { productId, formulaVersion, notes }); }}><fieldset disabled={!active}>
      <legend className="visually-hidden">Product matching</legend><div className="product-options">{products.map(item => <label key={item.id} className={`product-option ${item.id === productId ? 'chosen' : ''}`}><input type="radio" name="product" value={item.id} checked={item.id === productId} onChange={() => { setProductId(item.id); setFormulaVersion(item.formulas[0]); }} /><span><strong>{item.name}</strong><small>{item.match}</small></span></label>)}</div>
      <label htmlFor="matched-formula">Existing formula</label><select id="matched-formula" value={formulaVersion} onChange={e => setFormulaVersion(e.target.value)}>{product.formulas.map(formula => <option key={formula}>{formula}</option>)}</select>
      <label htmlFor="manager-notes">Why is this match relevant?</label><textarea id="manager-notes" maxLength={2000} required value={notes} onChange={e => setNotes(e.target.value)} />
      <button className="primary">Send to Scientist</button>
    </fieldset></form>
  </section>;
}

export function ScientistView({ claim, onAction }) {
  const [formulaAction, setFormulaAction] = useState(claim.formulaAction);
  const [formulaVersion, setFormulaVersion] = useState(claim.formulaAction === 'propose' ? claim.formulaVersion : '');
  const [notes, setNotes] = useState(claim.scientistNotes);
  const active = claim.stage === 'scientist';
  return <section className="panel"><p className="eyebrow">SCIENTIST · FORMULA REVIEW</p><h2>Does the claim need a stronger formula?</h2><div className="context-note"><strong>Claim manager’s rationale</strong><p>{claim.managerNotes || 'Awaiting the product match.'}</p></div>
    {!active && <Waiting claim={claim} />}
    <form onSubmit={e => { e.preventDefault(); onAction('formulate', { formulaAction, formulaVersion, notes }); }}><fieldset disabled={!active}><legend className="visually-hidden">Formula recommendation</legend>
      <label htmlFor="formula-action">Formula recommendation</label><select id="formula-action" value={formulaAction} onChange={e => setFormulaAction(e.target.value)}><option value="keep">Keep the existing formula</option><option value="propose">Propose a new formula version</option></select>
      {formulaAction === 'propose' && <><label htmlFor="proposed-formula">Proposed formula version</label><input id="proposed-formula" maxLength={120} required value={formulaVersion} onChange={e => setFormulaVersion(e.target.value)} placeholder="e.g. PARIS-RI-002-v2" /><p className="help">A proposal needs fresh study evidence. Existing results are not transferred to the new version.</p></>}
      <label htmlFor="scientist-notes">Scientific rationale and next tests</label><textarea id="scientist-notes" maxLength={2000} required value={notes} onChange={e => setNotes(e.target.value)} />
      <button className="primary">Send to Evaluator</button>
    </fieldset></form>
  </section>;
}

export function EvaluatorView({ claim, onAction, onEvaluate, loading }) {
  const [outcome, setOutcome] = useState('more-evidence');
  const [notes, setNotes] = useState('');
  const active = claim.stage === 'evaluator';
  return <div className="evaluation-stack"><section className="panel"><p className="eyebrow">EVALUATOR · STUDY REVIEW</p><h2>Read the study. Test the claim.</h2><div className="context-note"><strong>Scientist’s recommendation</strong><p>{claim.scientistNotes || 'Awaiting formula review.'}</p></div>
    {!active && <Waiting claim={claim} />}
    <fieldset disabled={!active || loading}><legend className="visually-hidden">Study assessment</legend><label htmlFor="study">Study evidence</label><textarea id="study" className="study-input" maxLength={30000} value={claim.evidence} onChange={e => onAction('evidence', { evidence: e.target.value })} placeholder="Paste the study methods, results and limitations for this formula." />
      <p className="help">Dummy results are scripted for the selected case; they are not calculated from edits to the study or claim. Use Gemini to assess your submitted text.</p>
      <div className="button-row"><button className="secondary" disabled={!claim.evidence.trim()} onClick={() => onEvaluate('demo')}>Load dummy assessment</button><button className="primary" disabled={!claim.evidence.trim()} onClick={() => onEvaluate('gemini')}>{loading ? 'Evaluating with Gemini…' : 'Evaluate with Gemini'}</button></div>
    </fieldset><p className="help" role="status">{loading ? 'Gemini is reviewing the submitted evidence. This can take up to 45 seconds.' : 'Gemini uses the server-side key. The dummy workflow needs no API or database.'}</p>
  </section>
  {claim.assessment && <section className="panel"><AssessmentResult result={claim.assessment} /></section>}
  <section className="panel human-review"><div className="section-heading"><p className="eyebrow">HUMAN IN THE LOOP</p><span className="human-badge">Your judgement is required</span></div><h2>What is your conclusion?</h2><p className="muted">Agree with the recommendation or challenge it. Explain the evidence and conditions so Business has a useful summary.</p>
    <form onSubmit={e => { e.preventDefault(); onAction('review', { outcome, notes }); }}><fieldset disabled={!active || !claim.assessment || loading}><legend className="visually-hidden">Human evaluator review</legend>
      <label htmlFor="review-outcome">Evaluator conclusion</label><select id="review-outcome" value={outcome} onChange={e => setOutcome(e.target.value)}><option value="more-evidence">Request more evidence or revised wording</option><option value="support">Support the claim with stated conditions</option><option value="not-supported">The studies do not support the claim</option></select>
      <label htmlFor="review-notes">Your reasoning and conditions</label><textarea id="review-notes" maxLength={2000} required value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain your conclusion, including any disagreement with the AI." />
      <button className="primary">Sign off &amp; send to Business</button>
    </fieldset></form>{!claim.assessment && <p className="help">An assessment is required before human sign-off.</p>}
    {claim.review && <div className="context-note"><strong>{claim.review.reviewer} · {outcomeLabels[claim.review.outcome]}</strong><p>{claim.review.notes}</p></div>}
  </section></div>;
}

export function BusinessView({ claim, onAction }) {
  const [outcome, setOutcome] = useState('hold');
  const [notes, setNotes] = useState('');
  return <div className="evaluation-stack"><section className="panel"><p className="eyebrow">BUSINESS · DECISION SUMMARY</p><h2>The full picture, before you decide.</h2><dl className="summary-list"><div><dt>Product match</dt><dd>{claim.managerNotes || 'The Claim manager will identify nearby products and formulas.'}</dd></div><div><dt>Formula recommendation</dt><dd>{claim.scientistNotes || 'The Scientist will review whether a new formula is needed.'}</dd></div></dl>
    {claim.assessment ? <AssessmentResult result={claim.assessment} /> : <p className="muted">The evaluator’s assessment will appear here after the study review.</p>}
    <div className={`review-summary ${claim.review ? 'reviewed' : ''}`}><p className="eyebrow">HUMAN REVIEW {claim.review ? 'RECORDED' : 'PENDING'}</p>{claim.review ? <><h3>{outcomeLabels[claim.review.outcome]}</h3><p>{claim.review.notes}</p><small>Reviewed by {claim.review.reviewer}</small></> : <p>No business decision is enabled until the evaluator records a conclusion and notes. Even a high-confidence recommendation needs human review.</p>}</div>
  </section><section className="panel"><p className="eyebrow">FINAL BUSINESS DECISION</p><h2>Is the next step worth taking?</h2>
    {claim.decision ? <div className="decision-record"><h3>{outcomeLabels[claim.decision.outcome]}</h3><p>{claim.decision.notes}</p><small>Recorded by {claim.decision.owner} · Demo decision only</small></div> : <form onSubmit={e => { e.preventDefault(); onAction('decide', { outcome, notes }); }}><fieldset disabled={claim.stage !== 'business' || !claim.review}><legend className="visually-hidden">Business decision</legend>
      <label htmlFor="business-outcome">Business decision</label><select id="business-outcome" value={outcome} onChange={e => setOutcome(e.target.value)}><option value="hold">Hold for further work</option><option value="proceed">Proceed to the next stage</option><option value="stop">Do not proceed</option></select>
      <label htmlFor="business-notes">Decision rationale</label><textarea id="business-notes" maxLength={2000} required value={notes} onChange={e => setNotes(e.target.value)} placeholder="Balance the evaluator’s findings with the business case." />
      <button className="primary">Record business decision</button>
    </fieldset></form>}<p className="help">Proceeding means a next business step, not permission to publish a claim or launch a product.</p>
  </section></div>;
}
