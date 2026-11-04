import { useState } from 'react';
import { examples } from './examples';

const emptyForm = { claim: '', formulaVersion: '', evidence: '' };
const verdictLabels = {
  SUPPORTED: 'Supported by the submitted evidence',
  NOT_SUPPORTED: 'The evidence does not support this wording',
  INSUFFICIENT_EVIDENCE: 'More evidence is needed',
};

export default function ClaimAssessment() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(nextForm) {
    setForm(nextForm);
    setResult(null);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const response = await fetch('/api/claims/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.message === 'string' ? data.message : 'Unable to assess this submission.');
      }
      setResult(data);
    } catch (failure) {
      setError(failure instanceof TypeError || failure instanceof SyntaxError
        ? 'Could not reach the assessment service. Check that the API is running and try again.'
        : failure.message || 'Unable to complete the assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Claims Intelligence home">CI<span>Claims Intelligence</span></a>
        <span className="workspace-label">R&amp;I · Evidence workspace</span>
      </header>
      <main>
        <div className="page-intro">
          <p className="eyebrow">FROM CLAIM TO EVIDENCE</p>
          <h1>A closer look at<br />the science behind the claim.</h1>
          <p className="intro-copy">Compare a proposed product claim with its study evidence.<br className="desktop-break" /> Get a clear recommendation to support your review.</p>
        </div>
        <ol className="steps" aria-label="Assessment process">
          <li><span>01</span> Define the claim</li>
          <li><span>02</span> Add study evidence</li>
          <li><span>03</span> Review the assessment</li>
        </ol>
        <div className="review-grid">
          <section className="panel submission-panel" aria-labelledby="submission-title">
            <div className="panel-heading"><h2 id="submission-title">Your submission</h2><span className="small-label">01 / INPUT</span></div>
            <form onSubmit={submit}>
              <fieldset disabled={loading}>
                <legend className="visually-hidden">Claim and study details</legend>
                <div className="examples">
                  <p>Start with a synthetic example</p>
                  <div className="example-buttons">{examples.map(example => (
                    <button key={example.name} type="button" className="chip" onClick={() => update({
                      claim: example.claim, formulaVersion: example.formulaVersion, evidence: example.evidence,
                    })}>{example.name}</button>
                  ))}</div>
                </div>
                <label htmlFor="formula">Formula version</label>
                <input id="formula" value={form.formulaVersion} required maxLength={120}
                  placeholder="e.g. PARIS-RI-001-v3" autoComplete="off"
                  onChange={e => update({ ...form, formulaVersion: e.target.value })} />
                <label htmlFor="claim">Proposed claim</label>
                <textarea id="claim" className="claim-input" value={form.claim} required maxLength={2000}
                  placeholder="e.g. Reduces wrinkles by 20% in 4 weeks"
                  onChange={e => update({ ...form, claim: e.target.value })} />
                <div className="field-heading"><label htmlFor="evidence">Study evidence</label><span>Text only</span></div>
                <textarea id="evidence" className="evidence-input" value={form.evidence} required maxLength={30000}
                  aria-describedby="evidence-help" placeholder="Paste the study methods, results and limitations…"
                  onChange={e => update({ ...form, evidence: e.target.value })} />
                <p className="field-help" id="evidence-help">Include the formula, population, endpoint, duration and results. Use synthetic or approved de-identified evidence.</p>
                <button className="submit-button" type="submit" disabled={loading || Object.values(form).some(value => !value.trim())}>
                  {loading ? 'Reviewing evidence…' : 'Assess claim'}<span aria-hidden="true">↗</span>
                </button>
              </fieldset>
            </form>
            {error && <p className="error" role="alert">{error}</p>}
          </section>
          <section className="panel result-panel" aria-labelledby="result-title" aria-busy={loading}>
            <div className="panel-heading"><h2 id="result-title">Assessment</h2><span className="small-label">02 / REVIEW</span></div>
            <div role="status" aria-live="polite">
              {loading ? <div className="empty-state"><div className="review-symbol loading" aria-hidden="true">✳</div><h3>Reading the evidence</h3><p>Comparing the claim with the study’s methods, findings and limitations. This can take up to 45 seconds.</p></div>
                : result ? <div className="assessment-result">
                  <p className={`verdict-tag ${result.justified ? 'supported' : ''}`}>{verdictLabels[result.verdict]}</p>
                  <h3 className="verdict">Justified: {result.justified ? 'Yes' : 'No'}</h3>
                  <div className="confidence-row"><span>Model confidence</span><strong>{Math.round(result.confidence * 100)}%</strong></div>
                  <p className="field-help">Certainty in this assessment, not a clinical probability.</p>
                  <div className="reasoning"><h4>Reasoning</h4><p>{result.reasoning}</p></div>
                  {result.missingEvidence.length > 0 && <div className="gaps"><h4>What’s missing</h4><ul>{result.missingEvidence.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
                  <p className="saved-note">Saved assessment <span>{result.assessmentId}</span></p>
                </div>
                  : <div className="empty-state"><div className="review-symbol" aria-hidden="true">✳</div><h3>Every claim needs a clear foundation.</h3><p>Add a claim and its study evidence to see the assessment, confidence and reasoning here.</p><div className="checks"><span>Formula relevance</span><span>Measured benefit</span><span>Timing &amp; study quality</span></div></div>}
            </div>
            <aside className="review-note"><span aria-hidden="true">i</span><p><strong>A second pair of eyes.</strong> This assessment supports the evaluator’s judgement. Final approval stays with the authorized reviewer.</p></aside>
          </section>
        </div>
      </main>
      <footer><span>Claims Intelligence Engine</span><span>Technical exercise · Synthetic examples · Human review required</span></footer>
    </div>
  );
}
