# Revised build plan and demo handoff

## Implemented scope

Four role-specific frontend views, three dummy confidence cases, explicit evaluator review, a final Business decision and a Gemini-backed assessment path. The server still persists only live Claim/Assessment records; the multi-role workflow is a frontend demonstration.

## Demo script

1. Start the frontend with `npm run dev -w @claims/web`. No key or database is needed.
2. In Business, compare the 92%, 64% and 28% cases. Notice that no final decision is available before human review.
3. Select the 64% pilot and switch to Evaluator. Read the limitations. Choose a conclusion, explain it and sign off.
4. Switch to Business. Inspect the human conclusion beside the scripted recommendation; decide to hold, stop or proceed.
5. Raise a new claim. As Claim manager choose a related product and formula. As Scientist propose a different version. As Evaluator attach fresh study text, load a clearly labelled dummy assessment and review it.
6. For a real provider demonstration, configure `GEMINI_API_KEY` and `GEMINI_MODEL`, start PostgreSQL and the backend, then use **Evaluate with Gemini**. Never present scripted scores as Gemini output.

## Validation

Build both applications. Run API and frontend tests, then integration tests against PostgreSQL. Check role order, invalid product/formula combinations, required reviewer notes, version-change invalidation, stale-result clearing, Gemini errors and atomic database rollback. In the browser, verify that the evaluator's signed conclusion reaches the Business summary and enables the final decision.

## Next implementation steps

The next complete increment is persistent multi-user workflow state: add real identities/roles and server-side authorization, link claims to versioned products/formulas, store study and human-decision history, and invalidate decisions when inputs change. Add idempotency before automatic retries. Add source-linked report review and expert evaluations before real scientific use. The dummy role switcher is not a substitute for any of these.
