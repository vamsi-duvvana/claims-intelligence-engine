import { useState } from 'react';
import { products, roleInfo } from './examples';
import { assessWithGemini, demoAssessment, newClaim, seedClaims, stageLabels, transition } from './workflow';
import { AssessmentResult, BusinessView, EvaluatorView, ManagerView, NewClaimForm, ScientistView } from './RoleViews';

export default function ClaimAssessment() {
  // shortcut: in-memory demo users and workflow; add server-side identity/persistence before shared use.
  const [claims, setClaims] = useState(seedClaims);
  const [role, setRole] = useState('business');
  const [selectedId, setSelectedId] = useState('CLM-002');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const claim = claims.find(item => item.id === selectedId) ?? claims[0];
  const user = roleInfo[role];
  const product = products.find(item => item.id === claim.productId);

  function changeView(nextRole) {
    setRole(nextRole);
    setAdding(false);
    setError('');
    setNotice('');
  }

  function act(action, data) {
    try {
      const next = transition(claim, role, action, data);
      setClaims(items => items.map(item => item.id === claim.id ? next : item));
      setError('');
      setNotice(action === 'evidence' ? '' : `Saved in this demo. Next: ${stageLabels[next.stage].toLowerCase()}.`);
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    }
  }

  async function evaluate(source) {
    setError('');
    setNotice('');
    if (source === 'demo') {
      act('assess', { assessment: demoAssessment(claim.scenario) });
      return;
    }
    act('evidence', { evidence: claim.evidence });
    setLoading(true);
    try {
      const result = await assessWithGemini(claim, AbortSignal.timeout(50000));
      act('assess', { assessment: result });
    } catch (failure) {
      setError(failure.name === 'TimeoutError' ? 'The Gemini request timed out. Please try again.'
        : failure instanceof TypeError || failure instanceof SyntaxError ? 'Could not reach the API. Check that the backend is running.' : failure.message);
    } finally {
      setLoading(false);
    }
  }

  function addClaim(values) {
    try {
      const created = newClaim(values, `CLM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
      setClaims(items => [...items, created]);
      setSelectedId(created.id);
      setAdding(false);
      setError('');
      setNotice('Claim raised. Switch to Claim manager to find nearby products and formulas.');
    } catch (failure) { setError(failure.message); }
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="wordmark">CI<span>Claims<br />Intelligence</span></a>
        <p className="nav-caption">DEMO USERS</p>
        <nav aria-label="Demo roles">{Object.entries(roleInfo).map(([id, info], index) => (
          <button key={id} className={`role-button ${role === id ? 'active' : ''}`} aria-pressed={role === id}
            disabled={loading} onClick={() => changeView(id)}>
            <span className="role-number">0{index + 1}</span><span>{info.label}<small>{info.person}</small></span>
          </button>
        ))}</nav>
        <div className="sidebar-note"><span className="live-dot" />Human judgement, at every step.<p>AI recommends.<br />People decide.</p></div>
        <button className="reset-button" disabled={loading} onClick={() => { setClaims(seedClaims()); setSelectedId('CLM-002'); setAdding(false); setError(''); setNotice('The three dummy cases have been restored.'); }}>Reset dummy workspace</button>
      </aside>
      <div className="workspace-body">
        <header className="topbar"><span>Research &amp; Innovation <span className="separator">/</span> Claim workspace</span><div className="identity"><span className="avatar">{user.initials}</span><span>{user.person}<small>{user.label}</small></span></div></header>
        <main>
          <div className="demo-banner"><strong>DEMO WORKSPACE</strong><span>Dummy products, studies and users. Changes last until refresh. Gemini runs only when requested.</span></div>
          <div className="page-heading"><div><p className="eyebrow">THE EVIDENCE BEHIND THE PROMISE</p><h1>{user.title}</h1><p>{user.description}</p></div>{role === 'business' && <button className="primary" onClick={() => { setAdding(true); setError(''); setNotice(''); }}>+ Raise a claim</button>}</div>
          <div className="overview-stats"><div><span>Claims in workspace</span><strong>{claims.length.toString().padStart(2, '0')}</strong></div><div><span>Awaiting human review</span><strong>{claims.filter(item => item.stage === 'evaluator').length.toString().padStart(2, '0')}</strong></div><div><span>Ready for Business</span><strong>{claims.filter(item => item.stage === 'business').length.toString().padStart(2, '0')}</strong></div></div>
          <div className="work-grid">
            <section className="claim-list" aria-label="Claims"><div className="list-heading"><h2>Claim portfolio</h2><span>{claims.length} claims</span></div>{claims.map(item => (
              <button key={item.id} className={`claim-card ${claim.id === item.id && !adding ? 'selected' : ''}`}
                disabled={loading} aria-pressed={claim.id === item.id && !adding} onClick={() => { setSelectedId(item.id); setAdding(false); setError(''); setNotice(''); }}>
                <span className="card-id">{item.id}<span>{item.assessment ? `${Math.round(item.assessment.confidence * 100)}%` : 'Pending'}</span></span>
                <strong>{item.title}</strong><span className="card-claim">{item.text}</span>
                <span className={`stage-pill ${item.stage}`}>{stageLabels[item.stage]}</span>
                {item.assessment && <small>{item.assessment.source === 'demo' ? 'Scripted confidence' : 'Gemini confidence'} · {item.review ? 'Human reviewed' : 'Human review pending'}</small>}
              </button>
            ))}<p className="portfolio-note">Scores describe assessment certainty, not product efficacy. No score bypasses review.</p></section>
            <div className="detail-column">
              {error && <p className="error" role="alert">{error}</p>}
              <p className="notice" role="status">{notice}</p>
              {adding ? <NewClaimForm onSubmit={addClaim} onCancel={() => setAdding(false)} /> : <>
                <section className="panel claim-detail"><div className="section-heading"><span className="eyebrow">{claim.id} · CLAIM BRIEF</span><span className={`stage-pill ${claim.stage}`}>{stageLabels[claim.stage]}</span></div><h2>{claim.text}</h2><p>{claim.brief}</p><div className="formula-strip"><span>Matched product<strong>{product?.name ?? 'Not matched yet'}</strong></span><span>Formula reference<strong>{claim.formulaVersion || 'Awaiting match'}</strong></span></div></section>
                <ol className="handoff" aria-label="Workflow progress">{[['manager', 'Match'], ['scientist', 'Formulate'], ['evaluator', 'Evaluate'], ['business', 'Decide']].map(([step, label], i) => <li key={step} aria-current={claim.stage === step ? 'step' : undefined} className={claim.stage === step ? 'current' : ''}><span>0{i + 1}</span>{label}</li>)}</ol>
                <div key={`${claim.id}-${role}-${claim.stage}`}>
                  {role === 'business' && <BusinessView claim={claim} onAction={act} />}
                  {role === 'manager' && <ManagerView claim={claim} onAction={act} />}
                  {role === 'scientist' && <ScientistView claim={claim} onAction={act} />}
                  {role === 'evaluator' && <EvaluatorView claim={claim} onAction={act} onEvaluate={evaluate} loading={loading} />}
                </div>
                {role !== 'evaluator' && role !== 'business' && claim.assessment && <section className="panel"><AssessmentResult result={claim.assessment} /></section>}
                <section className="panel activity"><h3>Handoff history</h3><ol>{claim.history.map((event, index) => <li key={index}><span className="history-dot" /><div><strong>{event.role}</strong><p>{event.text}</p></div></li>)}</ol></section>
              </>}
            </div>
          </div>
        </main>
        <footer><span>Claims Intelligence Engine</span><span>Independent technical demo · No clinical or launch approval</span></footer>
      </div>
    </div>
  );
}
